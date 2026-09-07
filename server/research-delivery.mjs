import {setTimeout as delay} from 'node:timers/promises';
import {publicJob} from './job-stream.mjs';

const failure=(status,message)=>Object.assign(new Error(message),{status});
// The reviewed result stays private until the durable write succeeds. Retrying
// that write must never execute the model or re-fetch financial data.
export function createResearchDelivery({save,loadJob,jobs,controllers,mutations,streams,pause=delay,now=()=>new Date().toISOString(),onError=()=>{}}){
 const pending=new Map();
 const reportError=error=>{try{onError(error);}catch{/* Logging must not lose the retained result. */}};
 const notify=(method,...args)=>{try{streams[method](...args);}catch(error){reportError(error);}};
 async function persist(job,entry){
  job.status='running';delete job.error;delete job.result;delete job.researchOutcome;
  job.delivery={status:'saving',recoverable:false,targetStatus:entry.target.status,attempts:entry.attempts};
  job.liveReport={text:'',phase:'saving'};
  notify('publish',job.id,'snapshot',publicJob(job));
  for(let attempt=0;attempt<3;attempt++){
   entry.attempts++;job.delivery.attempts=entry.attempts;
   const terminal={time:now(),type:entry.target.status==='completed'?'complete':'error',message:entry.target.status==='completed'?'研究完成，结果已保存':entry.target.error};
   const snapshot={...entry.target,events:[...job.events,terminal],delivery:{status:'saved',recoverable:false,targetStatus:entry.target.status,attempts:entry.attempts,savedAt:now()}};
   delete snapshot.liveReport;
   try{
    await save(snapshot);
    Object.assign(job,snapshot);delete job.liveReport;
    pending.delete(job.id);jobs.delete(job.id);
    notify('publish',job.id,'trace',terminal);
    return job;
   }catch(error){
    reportError(error);
    if(attempt<2){
     const event={time:now(),type:'warning',message:'结果暂未保存，正在重新连接并重试保存。'};
     job.events.push(event);notify('publish',job.id,'trace',event);
     await pause(attempt===0?500:1500);
    }
   }
  }
  job.status='failed';delete job.liveReport;
  job.finishedAt=entry.target.finishedAt;
  job.delivery={status:'failed',recoverable:true,targetStatus:entry.target.status,attempts:entry.attempts};
  job.error=entry.target.status==='completed'?'研究与复核已完成，但结果尚未保存。可重试保存，无须重新研究。':'执行记录尚未保存，可先重试保存，再处理原研究问题。';
  if(entry.target.error)job.delivery.executionError=entry.target.error;
  const event={time:now(),type:'error',message:job.error};job.events.push(event);notify('publish',job.id,'trace',event);
  return job;
 }
 return {
  async finish(job,outcome){
   const target={...job,...outcome,finishedAt:now()};delete target.liveReport;
   if(outcome.status==='completed')delete target.error;
   else{delete target.result;delete target.researchOutcome;}
   const entry={target,attempts:0};pending.set(job.id,entry);
   return persist(job,entry);
  },
  async retry(id,expectedRetryCount){
   if(!Number.isSafeInteger(expectedRetryCount)||expectedRetryCount<0)throw failure(400,'保存版本无效，请刷新详情页');
   if(mutations.has(id)||controllers.has(id))throw failure(409,'研究正在运行或保存中，请稍候');
   mutations.add(id);
   try{
    const job=jobs.get(id)??await loadJob(id);
    if(!job)throw failure(404,'研究记录不存在');
    if((job.retryCount??0)!==expectedRetryCount)throw failure(409,'研究版本已变化，请刷新详情页');
    // A lost HTTP response can safely be retried after the write committed.
    if(job.delivery?.status==='saved')return job;
    const entry=pending.get(id);
    if(!entry)throw failure(409,'当前服务未保留待保存结果，请刷新详情页查看记录');
    await persist(job,entry);notify('finish',job);
    if(job.delivery.status!=='saved')throw failure(503,'仍未能保存结果，暂存内容还在，可稍后重试保存');
    return job;
   }finally{mutations.delete(id);}
  },
  forget(id){pending.delete(id);},
 };
}
