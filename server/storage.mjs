import {MongoClient,GridFSBucket} from 'mongodb';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {migrateSchema} from './schema-migrations.mjs';

export async function createStorage({uri=process.env.MONGODB_URI||'mongodb://127.0.0.1:27017',database=process.env.MONGODB_DATABASE||'zhiheng_agent'}={}){
 const client=new MongoClient(uri,{serverSelectionTimeoutMS:5000,connectTimeoutMS:5000,writeConcern:{w:1,j:true}});
 try{
  await client.connect();const db=client.db(database);await db.command({ping:1});
  const jobs=db.collection('jobs'),cache=db.collection('report_cache');
  const bucket=new GridFSBucket(db,{bucketName:'job_payloads'});
  await migrateSchema(db);
  return {
   async saveJob(job){
    // Serialize before awaiting: running jobs can continue emitting events.
    const bytes=Buffer.from(JSON.stringify(job));
    const {input,result,events,...summary}=job;
    const upload=bucket.openUploadStream(job.id+'.json');
    await pipeline(Readable.from([bytes]),upload);
    try{await jobs.replaceOne({_id:job.id},{_id:job.id,...summary,question:input.question,sourceCount:input.sources.length,payloadId:upload.id},{upsert:true});}
    catch(error){await bucket.delete(upload.id).catch(()=>{});throw error;}
    // Retain old payload versions so concurrent readers can finish safely.
   },
   async getJob(id){
    const entry=await jobs.findOne({_id:id});if(!entry)return null;
    const chunks=[];for await(const chunk of bucket.openDownloadStream(entry.payloadId))chunks.push(chunk);
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
   },
   async hasJob(id){return !!await jobs.findOne({_id:id},{projection:{_id:1}});},
   async listJobs(){return jobs.find({},{projection:{_id:0,payloadId:0}}).sort({createdAt:-1}).toArray();},
   async recoverInterrupted(){
    for await(const entry of jobs.find({status:{$in:['queued','running']}})){
     const job=await this.getJob(entry._id);job.status='failed';job.error='服务重启中断任务，请重新运行';job.finishedAt=new Date().toISOString();await this.saveJob(job);
    }
   },
   async getCachedReport(key){const entry=await cache.findOne({_id:key,expiresAt:{$gt:new Date()}});return entry?.source??null;},
   async saveCachedReport(key,source){
    const expiresAt=new Date(Date.parse(source.fetchedAt)+7*86400000);
    if(!Number.isFinite(expiresAt.getTime()))throw new Error('财报缓存时间无效');
    await cache.replaceOne({_id:key},{_id:key,source,expiresAt},{upsert:true});
   },
   async ping(){await db.command({ping:1});},
   async close(){await client.close();}
  };
 }catch(error){await client.close();throw error;}
}
let pending;
export function getStorage(){return pending??=(createStorage().catch(error=>{pending=undefined;throw error;}));}
export async function closeStorage(){const current=pending;pending=undefined;if(current)await (await current).close();}
