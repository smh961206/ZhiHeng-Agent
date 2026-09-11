import {randomUUID} from 'node:crypto';

// Append migrations only. Every up() must be idempotent: MongoDB DDL is not transactional.
export const migrations=[{
 version:1,name:'initial_indexes',
 async up(db){
  await db.collection('jobs').createIndex({createdAt:-1});
  await db.collection('report_cache').createIndex({expiresAt:1},{expireAfterSeconds:0});
 }
},{version:2,name:'model_call_indexes',async up(db){
 await db.collection('model_calls').createIndex({jobId:1,startedAt:1});
}}];

export async function migrateSchema(db,steps=migrations){
 if(steps.some((step,i)=>step.version!==i+1))throw new Error('迁移版本必须从 1 连续递增');
 const records=db.collection('schema_migrations'),locks=db.collection('schema_locks');
 const owner=randomUUID();
 try{await locks.insertOne({_id:'upgrade',owner,startedAt:new Date()});}
 catch(e){if(e.code===11000)throw new Error('数据库迁移已锁定；确认没有迁移进程后按部署文档解除锁');throw e;}
 try{
  const applied=await records.find({}).sort({_id:1}).toArray();
  for(let i=0;i<applied.length;i++){
   if(applied[i]._id!==i+1||!steps[i]||steps[i].name!==applied[i].name)throw new Error('数据库结构版本超出或不匹配当前代码；禁止降级启动');
  }
  for(const step of steps.slice(applied.length)){
   await step.up(db);
   await records.insertOne({_id:step.version,name:step.name,appliedAt:new Date()});
  }
  return steps.length;
 }finally{await locks.deleteOne({_id:'upgrade',owner});}
}
