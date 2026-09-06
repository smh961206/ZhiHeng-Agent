// Used only by the retry API integration child process. No provider or model is contacted.
import {registerHooks} from 'node:module';
const agentURL=new URL('../../server/agent.mjs',import.meta.url).href;
registerHooks({load(url,context,nextLoad){
 if(url!==agentURL)return nextLoad(url,context);
 return {format:'module',shortCircuit:true,source:`
 export async function runAgent(job,emit,signal){
  signal.throwIfAborted();
  emit('report_reset','');emit('report_delta','# 合成重试进度\\n等待测试取消');
  await new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));
 }
 `};
}});
