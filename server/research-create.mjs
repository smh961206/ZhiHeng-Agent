import {createHash,randomUUID} from 'node:crypto';
import {createConfiguredJobModelState} from './model-rollout.mjs';
const failure=(status,message)=>Object.assign(new Error(message),{status});
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
export function submissionIdentity(payload,key){
 if(key!==undefined&&(typeof key!=='string'||!/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(key)))throw failure(400,'提交标识无效，请重新打开研究工作台');
 const digest=value=>createHash('sha256').update(value).digest('hex');
 const hash=key?digest('zhiheng-submission:'+key.toLowerCase()):null;
 return {id:hash?`${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`:randomUUID(),fingerprint:digest(JSON.stringify(canonical(payload)))};
}

export function createResearchCreator({storage,jobs,controllers,pendingStarts,mutations,prepare,execute,maxConcurrent=3}){
 const inFlight=new Map(),uncertain=new Map();
 const readStored=async read=>{try{return await read();}catch{throw failure(503,'暂时无法核对原提交记录，请保留输入，稍后再次提交确认');}};
 const check=(record,fingerprint)=>{if(record.submission?.fingerprint!==fingerprint)throw failure(409,'同一提交标识对应的研究输入已改变，请新建研究后提交');};
 function launch(job){uncertain.delete(job.id);jobs.set(job.id,job);void execute(job);return job;}
 async function create(payload,identity){
  const {id,fingerprint}=identity;
  if(mutations.has(id))throw failure(409,'研究记录正在处理中，请稍后重试');
  mutations.add(id);
  try{
   if(await readStored(()=>storage.isJobDeleted(id)))throw failure(409,'本次提交对应的研究已删除，请新建研究，不会恢复已删除记录');
   const candidate=uncertain.get(id);if(candidate)check(candidate,fingerprint);
   const existing=jobs.get(id)??await readStored(()=>storage.getJob(id));
   if(existing){
    check(existing,fingerprint);
    if(candidate&&existing.status==='queued'&&existing.submission.attemptId===candidate.submission.attemptId){
     if(controllers.size+pendingStarts.size>=maxConcurrent)throw failure(429,'任务已保存，等待运行空位；请稍后再次提交以确认');
     return {job:launch(existing),replayed:true};
    }
    uncertain.delete(id);return {job:existing,replayed:true};
   }
   if(controllers.size+pendingStarts.size>=maxConcurrent)throw failure(429,`已有${maxConcurrent}个任务运行或准备中，请稍后再试`);
   pendingStarts.add(id);
   const job=candidate??await prepare(structuredClone(payload),id);
   if(!candidate)job.modelState=createConfiguredJobModelState(process.env,{mode:job.mode,historyYears:job.plan?.historyYears},job);
   job.submission={fingerprint,attemptId:candidate?.submission.attemptId??randomUUID()};uncertain.set(id,job);
   try{await storage.createJob(job);}
   catch(error){
    // Insertion may have committed even when the acknowledgement was lost.
    // Only this creator's attempt may launch an unconfirmed queued record.
    let committed;try{committed=await storage.getJob(id);}catch{throw failure(503,'暂时无法确认任务是否创建，请保留输入后再次提交确认');}
    if(committed){
     check(committed,fingerprint);
     if(committed.submission.attemptId===job.submission.attemptId)return {job:launch(committed),replayed:true};
     uncertain.delete(id);return {job:committed,replayed:true};
    }
    if(error.status===409){uncertain.delete(id);throw error;}
    throw failure(503,'任务暂未确认创建，请稍后再次提交相同输入');
   }
   return {job:launch(job),replayed:false};
  }finally{pendingStarts.delete(id);mutations.delete(id);}
 }
 return (payload,key)=>{
  if(!payload||typeof payload!=='object'||Array.isArray(payload))throw failure(400,'请求必须为对象');
  const identity=submissionIdentity(payload,key),active=inFlight.get(identity.id);
  if(active){if(active.fingerprint!==identity.fingerprint)throw failure(409,'同一提交标识对应的研究输入已改变');return active.promise.then(({job})=>({job,replayed:true}));}
  const promise=create(payload,identity).finally(()=>inFlight.delete(identity.id));
  inFlight.set(identity.id,{fingerprint:identity.fingerprint,promise});return promise;
 };
}
