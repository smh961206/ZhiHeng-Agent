import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {MongoClient} from 'mongodb';
import {createStorage} from '../server/storage.mjs';
test('real process exit preserves private checkpoint in MongoDB and next process resumes to reviewed completion',{timeout:30000},async()=>{
 const uri=process.env.MONGODB_URI||'mongodb://127.0.0.1:27017',database='zhiheng_resume_test_'+randomUUID().replaceAll('-','');
 const storage=await createStorage({uri,database});
 const run=phase=>new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,['tests/fixtures/resume-runtime.mjs'],{cwd:new URL('../',import.meta.url),env:{...process.env,MONGODB_URI:uri,MONGODB_DATABASE:database,RESUME_TEST_PHASE:phase},stdio:['ignore','pipe','pipe']});
  let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);child.on('error',reject);child.on('exit',code=>resolve({code,output}));
 });
 try{
  await storage.saveJob({id:'resume-process',createdAt:new Date().toISOString(),status:'queued',mode:'B',input:{question:'合成进程恢复验证',mode:'B',depth:'Standard',historyYears:5,securities:[{market:'CN',symbol:'600519'}],sources:[]},events:[]});
  const first=await run('first');assert.equal(first.code,73,first.output);
  const saved=await storage.getJob('resume-process');assert.equal(saved.status,'running');assert.equal(saved.checkpoint.toolRecords.length,1);
  assert.equal(saved.knowledgeUsage.snapshotId,saved.plan.knowledgeSnapshot.id);
  assert.ok(saved.knowledgeUsage.records.some(record=>record.reason.startsWith('规则补读')));
  assert.ok((await storage.listJobs()).every(job=>job.knowledgeUsage===undefined),'Detailed rule reads stay in the job payload, not list summaries');
  assert.ok(!JSON.stringify(await storage.listJobs()).includes('private-resume-reasoning'),'Internal model context never enters list summaries');
  const second=await run('second');assert.equal(second.code,0,second.output);
  const final=await storage.getJob('resume-process');assert.equal(final.status,'completed');assert.equal(final.retryCount,1);assert.ok(final.result.report);assert.equal(final.events.filter(e=>e.type==='tool'&&e.toolCallId==='saved-call').length,1);
  assert.deepEqual(final.plan.knowledgeSnapshot,saved.plan.knowledgeSnapshot);
  assert.deepEqual(final.result.framework.usage,final.knowledgeUsage);
  assert.ok(final.knowledgeUsage.records.some(record=>record.reason==='正式输出前审计'));
  assert.ok(saved.knowledgeUsage.records.every(record=>final.knowledgeUsage.records.some(retained=>retained.key===record.key)));
 }finally{await storage.close();const cleanup=new MongoClient(uri);try{await cleanup.connect();await cleanup.db(database).dropDatabase();}finally{await cleanup.close();}}
});
