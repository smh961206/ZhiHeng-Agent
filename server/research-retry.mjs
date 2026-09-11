import {createResearchPlan} from '../shared/research-framework.mjs';
import {bindKnowledge} from './knowledge.mjs';
import {validateInput,route} from './router.mjs';
import {attachResearchBaseline} from './research-baseline.mjs';
import {researchResume,resumeSummary} from './research-resume.mjs';
import {modelStateError} from './model-state.mjs';

const failure=(status,message)=>Object.assign(new Error(message),{status});
export async function prepareResearchRetry(job,loadJob,now=new Date().toISOString()){
 if(!job)throw failure(404,'研究记录不存在');
 if(!['failed','cancelled'].includes(job.status))throw failure(409,'只有失败或已取消的研究可以重试');
 if(job.delivery?.recoverable)throw failure(409,'已有待保存结果，请先重试保存，无须重新研究');
 const original=job.input??{};
 const checkpoint=researchResume(job);
 if(checkpoint){
  const next=structuredClone(job),retryCount=(job.retryCount??0)+1;
  for(const key of ['error','finishedAt','result','researchOutcome','delivery','liveReport'])delete next[key];
  Object.assign(next,{status:'queued',retryCount,lastRetriedAt:now,checkpoint,resume:{available:true,phase:checkpoint.phase,origin:checkpoint.origin||'checkpoint'}});
  next.events??=[];next.events.push({time:now,type:'progress',message:`第${retryCount}次重试，从已保存的${checkpoint.phase==='review'?'复核':'研究'}进度继续；保留已有资料与计算结果。`});
  return next;
 }
 // A new pinned job with unusable progress cannot silently become a fresh run.
 if(Object.hasOwn(job,'modelState'))throw modelStateError();
 // Rebuild execution data from saved inputs, without feeding old evidence back into a new run.
 let input=validateInput({...original,mode:job.mode||original.mode,sources:[]});
 const mode=route(input);
 if(mode==='C'&&original.baseline?.jobId===input.baselineJobId){
  input.baseline=structuredClone(original.baseline);
 }else input=await attachResearchBaseline(input,mode,loadJob);
 const plan=createResearchPlan(input,mode);bindKnowledge(plan);
 input.depth=plan.depth;input.historyYears=plan.historyYears;
 const retryCount=(job.retryCount??0)+1;
 const recovery=resumeSummary(job);
 const restartReason=recovery.reason==='framework_changed'?`研究规则从 V${recovery.fromVersion} 更新为 V${recovery.toVersion}`:recovery.reason==='rules_changed'?'研究规则内容已更新':'未找到可用续跑进度';
 return {id:job.id,createdAt:job.createdAt,...(job.submission?{submission:structuredClone(job.submission)}:{}),input,mode,plan,status:'queued',retryCount,lastRetriedAt:now,
  events:[{time:now,type:'progress',message:`第${retryCount}次重试，因${restartReason}，本轮重新采集、分析与复核。`,restartReason:recovery.reason||'no_checkpoint'}]};
}

export function createResearchRetrier({storage,jobs,controllers,pendingStarts,mutations,execute,configured,maxConcurrent=3}){
 return async(id,expectedRetryCount)=>{
  if(!Number.isSafeInteger(expectedRetryCount)||expectedRetryCount<0)throw failure(400,'重试版本无效，请刷新详情页');
  if(mutations.has(id)||controllers.has(id))throw failure(409,'研究正在运行或处理中，请稍后再试');
  if(controllers.size+pendingStarts.size>=maxConcurrent)throw failure(429,`已有${maxConcurrent}个任务运行或准备中，请稍后再试`);
  mutations.add(id);pendingStarts.add(id);
  try{
   const previous=jobs.get(id)??await storage.getJob(id);
   if(!previous)throw failure(404,'研究记录不存在');
   if((previous.retryCount??0)!==expectedRetryCount)throw failure(409,'研究已经重试过，请刷新详情页查看最新进度');
   if(!configured())throw failure(400,'请先在.env配置LLM_API_KEY和LLM_MODEL');
   const next=await prepareResearchRetry(previous,id=>storage.getJob(id));
   try{await storage.restartJob(next,expectedRetryCount);}
   catch(error){if(error.status===409)throw error;throw failure(503,'重试未能保存，请检查数据库连接后再试');}
   jobs.set(id,next);void execute(next);
   return next;
  }finally{pendingStarts.delete(id);mutations.delete(id);}
 };
}
