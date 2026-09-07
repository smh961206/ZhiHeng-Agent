import test from 'node:test';
import assert from 'node:assert/strict';
import {createPathResolver,parsePathDecision} from '../server/research-path.mjs';
import {validateInput} from '../server/router.mjs';
const env={LLM_API_KEY:'test-only',LLM_MODEL:'fixture-model',LLM_BASE_URL:'https://model.invalid'};
const response=(mode='B',reason='明确排除公司比较，重点研究现金流。')=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({mode,reason})}}]}));

test('semantic decisions handle rule disagreement and are reused for execution',async()=>{
 let calls=0;const resolver=createPathResolver({env,fetchImpl:async(url,options)=>{
  calls++;const body=JSON.parse(options.body);assert.match(body.messages[0].content,/否定/);assert.equal(body.tools,undefined);assert.equal(body.max_tokens,400);return response();
 }});
 const question='不做公司比较，只分析贵州茅台现金流';
 const decision=await resolver.recommend(question);assert.equal(decision.mode,'B');assert.equal(decision.source,'semantic');
 assert.deepEqual(await resolver.recommend(question),decision);assert.equal(calls,1);
 const selected=await resolver.resolve({question,mode:'auto',pathDecisionId:decision.decisionId});assert.equal(selected.mode,'B');
 assert.doesNotThrow(()=>validateInput({question,mode:selected.mode,securities:[{market:'CN',symbol:'600519'}]}));
 await assert.rejects(resolver.resolve({question:'其他问题',mode:'auto',pathDecisionId:decision.decisionId}),{status:409});
 assert.equal((await resolver.resolve({question,mode:'F',pathDecisionId:decision.decisionId})).mode,'F');assert.equal(calls,1);
});
test('invalid outputs, provider failures and unconfigured service fall back without leaking errors',async()=>{
 for(const fetchImpl of [async()=>new Response('secret provider detail',{status:500}),async()=>response('INVALID'),async()=>response('D',''),async()=>{throw new Error('secret');}]){
  const value=await createPathResolver({env,fetchImpl}).recommend('快速筛选贵州茅台');assert.equal(value.mode,'A');assert.equal(value.source,'rules');assert.ok(!value.reason.includes('secret'));
 }
 assert.equal((await createPathResolver({env:{}}).recommend('比较两家公司')).mode,'D');
 assert.throws(()=>parsePathDecision('{"mode":"B","reason":"'+ 'x'.repeat(181)+'"}'));
});
test('timeout falls back; cancellation propagates and does not cache a cancelled decision',async()=>{
 const fetchImpl=(_url,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));
 const keepAlive=setTimeout(()=>{},1000);
 try{
  const resolver=createPathResolver({env,fetchImpl,timeoutMs:15});assert.equal((await resolver.recommend('最新财报')).source,'rules');
  const control=new AbortController(),pending=resolver.recommend('持仓组合',{signal:control.signal});control.abort();await assert.rejects(pending,{name:'AbortError'});
 }finally{clearTimeout(keepAlive);}
});
test('expired or evicted previews require renewed confirmation, rules fallback stays explicit',async()=>{
 let time=0;const resolver=createPathResolver({env,now:()=>time,maxEntries:1,fetchImpl:async()=>response()});
 const first=await resolver.recommend('第一个问题');await resolver.recommend('第二个问题');await assert.rejects(resolver.resolve({question:'第一个问题',pathDecisionId:first.decisionId}),{status:409});
 const latest=await resolver.recommend('最新问题');time=600001;await assert.rejects(resolver.resolve({question:'最新问题',pathDecisionId:latest.decisionId}),{status:409});
 assert.equal((await resolver.resolve({question:'快速筛选',pathRuleFallback:true})).source,'rules');
 await assert.rejects(resolver.recommend(' '.repeat(3)),{status:400});await assert.rejects(resolver.recommend('x'.repeat(10001)),{status:400});
});
test('concurrency is capped and releases after completion',async()=>{
 let release,calls=0;const resolver=createPathResolver({env,maxConcurrent:1,fetchImpl:async()=>{calls++;await new Promise(resolve=>{release=resolve;});return response();}});
 const first=resolver.recommend('第一项');const next=await resolver.recommend('快速筛选');assert.equal(next.source,'rules');assert.equal(calls,1);release();assert.equal((await first).source,'semantic');
});
