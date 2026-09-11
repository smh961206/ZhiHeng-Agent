// Used only by the retry API integration child process. No provider or model is contacted.
import {registerHooks} from 'node:module';
const agentURL=new URL('../../server/agent.mjs',import.meta.url).href;
registerHooks({load(url,context,nextLoad){
 if(url!==agentURL){
  const result=nextLoad(url,context);
  if(process.env.RETRY_TEST_ACK_HANDSHAKE!=='true')return result;
  if(url===new URL('../../server/storage.mjs',import.meta.url).href)return {...result,source:Buffer.from(result.source).toString('utf8').replace('saveJob:writeJob,',`saveJob:async job=>{
   if(job.status!=='cancelled'||job.retryCount!==1)return writeJob(job);
   const released=new Promise(resolve=>{const release=message=>{if(message==='release-cancel-ack'){process.off('message',release);resolve();}};process.on('message',release);});
   await writeJob(job);process.send?.({type:'cancel-persisted'});await released;
  },`)};
  if(url===new URL('../../server/research-retry.mjs',import.meta.url).href)return {...result,source:Buffer.from(result.source).toString('utf8').replace('const settled=finishing.get(id);',"const settled=finishing.get(id);if(settled&&expectedRetryCount===1)process.send?.({type:'retry-wait-entered'});")};
  return result;
 }
 return {format:'module',shortCircuit:true,source:`
 export async function runAgent(job,emit,signal){
  signal.throwIfAborted();
  emit('report_reset','');emit('report_delta','# 合成重试进度\\n等待测试取消');
  await new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));
 }
 `};
}});
