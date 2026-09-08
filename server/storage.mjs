import {interruptWorkflow} from './research-workflow.mjs';
import {MongoClient,GridFSBucket} from 'mongodb';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {migrateSchema} from './schema-migrations.mjs';

export async function createStorage({uri=process.env.MONGODB_URI||'mongodb://127.0.0.1:27017',database=process.env.MONGODB_DATABASE||'zhiheng_agent'}={}){
 const client=new MongoClient(uri,{serverSelectionTimeoutMS:5000,connectTimeoutMS:5000,writeConcern:{w:1,j:true}});
 try{
  await client.connect();const db=client.db(database);await db.command({ping:1});
  const jobs=db.collection('jobs'),cache=db.collection('report_cache'),deleted=db.collection('deleted_jobs');
  const bucket=new GridFSBucket(db,{bucketName:'job_payloads'});
  await migrateSchema(db);
  async function writeJob(job,filter={_id:job.id},upsert=true,insertOnly=false){
    // Serialize before awaiting: running jobs can continue emitting events.
    const {liveReport,...stored}=job;
    const bytes=Buffer.from(JSON.stringify(stored));
    const {input,result,events,draft,marketData,checkpoint,knowledgeUsage,...summary}=stored;
    const upload=bucket.openUploadStream(job.id+'.json');
    await pipeline(Readable.from([bytes]),upload);
    try{
     const entry={_id:job.id,...summary,question:input.question,sourceCount:input.sources.length,payloadId:upload.id};
     if(insertOnly){
      if(await deleted.findOne({_id:job.id}))throw Object.assign(new Error('研究已删除，不能恢复本次提交'),{status:409});
      await jobs.insertOne(entry);
     }else{
      const result=await jobs.replaceOne(filter,entry,{upsert});
      if(!upsert&&result.matchedCount!==1)throw Object.assign(new Error('研究状态已变化，请刷新详情页后再试'),{status:409});
     }
    }
    catch(error){
     // Only a definite rejection is safe to clean up. A lost acknowledgement
     // may follow a commit, even if a later writer already replaced the head;
     // concurrent readers can still be reading that older payload.
     if(error.code===11000||error.status===409){try{if(!await jobs.findOne({_id:job.id,payloadId:upload.id}))await bucket.delete(upload.id);}catch{/* Retain an uncertain upload rather than corrupt a committed record. */}}
     throw error;
    }
    // Retain old payload versions so concurrent readers can finish safely.
  }
  return {
   saveJob:writeJob,
   createJob:job=>writeJob(job,undefined,false,true),
   async restartJob(job,expectedRetryCount){
    if(!Number.isSafeInteger(expectedRetryCount)||expectedRetryCount<0||job.retryCount!==expectedRetryCount+1||job.status!=='queued')throw new Error('重试写入参数无效');
    const version=expectedRetryCount===0?{$or:[{retryCount:0},{retryCount:{$exists:false}}]}:{retryCount:expectedRetryCount};
    await writeJob(job,{_id:job.id,status:{$in:['failed','cancelled']},...version},false);
   },
   async getJob(id){
    const entry=await jobs.findOne({_id:id});if(!entry)return null;
    const chunks=[];for await(const chunk of bucket.openDownloadStream(entry.payloadId))chunks.push(chunk);
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
   },
   async isJobDeleted(id){return !!await deleted.findOne({_id:id},{projection:{_id:1}});},
   async deleteJob(id){
    const entry=await jobs.findOne({_id:id},{projection:{status:1}});
    if(['queued','running'].includes(entry?.status))throw Object.assign(new Error('研究正在运行，请先取消并等待结束后再删除'),{status:409});
    // Keep only an ID tombstone: retained legacy JSON must not restore a deleted job.
    await deleted.updateOne({_id:id},{$setOnInsert:{deletedAt:new Date()}},{upsert:true});
    await jobs.deleteOne({_id:id});
    // Clean every saved version, not just the current GridFS payload.
    for await(const file of bucket.find({filename:id+'.json'}))await bucket.delete(file._id);
   },
   async hasJob(id){return !!await jobs.findOne({_id:id},{projection:{_id:1}});},
   async listJobs(){return jobs.find({},{projection:{_id:0,payloadId:0,submission:0}}).sort({createdAt:-1}).toArray();},
   async recoverInterrupted(){
    for await(const entry of jobs.find({status:{$in:['queued','running']}})){
     const job=await this.getJob(entry._id);job.status='failed';interruptWorkflow(job,'failed');job.error='服务重启中断任务，请重新运行';job.finishedAt=new Date().toISOString();await this.saveJob(job);
    }
   },
   async getCachedReport(key){const entry=await cache.findOne({_id:key,expiresAt:{$gt:new Date()}});return entry?.source??null;},
   async saveCachedReport(key,source,{retainMs=7*86400000}={}){
    if(!Number.isFinite(retainMs)||retainMs<=0||retainMs>3650*86400000)throw new Error('数据保留时间无效');
    const expiresAt=new Date(Date.parse(source.fetchedAt)+retainMs);
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
