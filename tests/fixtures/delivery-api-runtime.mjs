// Isolated integration child: no model or market provider is contacted.
import {registerHooks} from 'node:module';
const agentURL=new URL('../../server/agent.mjs',import.meta.url).href;
const storageURL=new URL('../../server/storage.mjs',import.meta.url).href;
registerHooks({load(url,context,nextLoad){
 if(url===agentURL)return {format:'module',shortCircuit:true,source:`
  export async function runAgent(job,emit,signal){
   signal.throwIfAborted();emit('research','合成研究执行一次');
   return {report:'# 合成已复核报告',audit:'合成审计',decision:{action:'观察',confidence:'低',summary:'仅验证保存流程'}};
  }
 `};
 if(url===storageURL)return {format:'module',shortCircuit:true,source:`
  import {getStorage as actual} from ${JSON.stringify(storageURL+'?delivery-fixture')};
  export async function getStorage(){
   const storage=await actual();let remaining=3;
   return {...storage,async saveJob(job){
    if(job.status==='completed'&&remaining-->0)throw new Error('合成数据库暂不可用');
    return storage.saveJob(job);
   }};
  }
 `};
 return nextLoad(url,context);
}});
