import test from 'node:test';
import assert from 'node:assert/strict';
import {MongoClient} from 'mongodb';
import {randomUUID,createHash} from 'node:crypto';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createStorage} from '../server/storage.mjs';
import {migrateLegacy} from '../server/migrate.mjs';

test('MongoDB: 大文本、重连读取、任务恢复、缓存过期和幂等迁移',async()=>{
 const database='zhiheng_test_'+randomUUID().replaceAll('-','');
 const uri=process.env.MONGODB_URI||'mongodb://127.0.0.1:27017';
 let storage=await createStorage({uri,database});
 const dir=await mkdtemp(path.join(tmpdir(),'zhiheng-migration-'));
 try{
  const job={id:randomUUID(),status:'running',createdAt:new Date().toISOString(),input:{question:'测试',sources:[{text:'中'.repeat(6_000_000)}]},events:[]};
  await storage.saveJob(job);await storage.close();storage=await createStorage({uri,database});
  assert.deepEqual(await storage.getJob(job.id),job);
  const list=await storage.listJobs();assert.equal(list.length,1);assert.equal(list[0].sourceCount,1);assert.equal(list[0].input,undefined);assert.equal(list[0].payloadId,undefined);
  await storage.recoverInterrupted();assert.equal((await storage.getJob(job.id)).status,'failed');
  assert.equal(await storage.getJob('absent'),null);
  const source={url:'https://static.cninfo.com.cn/test.pdf',text:'缓存正文',fetchedAt:new Date().toISOString()};
  const key=createHash('sha256').update(source.url).digest('hex');
  await storage.saveCachedReport(key,source);assert.deepEqual(await storage.getCachedReport(key),source);
  await storage.saveCachedReport('expired',{...source,fetchedAt:new Date(Date.now()-8*86400000).toISOString()});assert.equal(await storage.getCachedReport('expired'),null);
  const legacy={...job,id:randomUUID(),status:'completed',input:{question:'旧任务',sources:[]}};
  await writeFile(path.join(dir,'job.json'),JSON.stringify(legacy));await mkdir(path.join(dir,'cache'));
  await writeFile(path.join(dir,'cache','report.json'),JSON.stringify({...source,url:source.url+'?legacy'}));
  assert.deepEqual(await migrateLegacy(storage,dir),{jobs:1,cache:1,skipped:0});
  legacy.status='cancelled';await storage.saveJob(legacy);
  assert.deepEqual(await migrateLegacy(storage,dir),{jobs:0,cache:0,skipped:2});
  assert.equal((await storage.getJob(legacy.id)).status,'cancelled');
 }finally{
  await storage.close();const client=new MongoClient(uri);try{await client.connect();await client.db(database).dropDatabase();}finally{await client.close();}
  await rm(dir,{recursive:true,force:true});
 }
});
