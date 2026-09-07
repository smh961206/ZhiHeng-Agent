import test from 'node:test';
import assert from 'node:assert/strict';
import {createSecurityIntentExtractor,parseSecurityIntent} from '../server/security-intent.mjs';
import {resolveSecurities} from '../server/security-resolver.mjs';
const env={LLM_API_KEY:'test-only',LLM_MODEL:'fixture-model',LLM_BASE_URL:'https://model.invalid'};
const reply=targets=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({targets})}}]}));
const catalogs={CN:[{code:'600519',zwjc:'贵州茅台'},{code:'002594',zwjc:'比亚迪'}],HK:[{code:'00700',zwjc:'腾讯控股'},{code:'01211',zwjc:'比亚迪股份'}]};
const resolve=(question,targets)=>resolveSecurities(question,{loadCatalog:async m=>catalogs[m],lookupUS:async()=>[],extractIntent:createSecurityIntentExtractor({env,fetchImpl:async()=>reply(targets)})});

test('semantic selection excludes negation and examples before official lookup',async()=>{
 const r=await resolve('不要腾讯，苹果只是举例，只分析贵州茅台现金流',[{mention:'贵州茅台'}]);
 assert.equal(r.source,'semantic');assert.deepEqual(r.securities.map(s=>s.symbol),['600519']);assert.deepEqual(r.unresolved,[]);
 const empty=await resolve('腾讯只是一个例子，先解释研究方法',[]);assert.deepEqual(empty.securities,[]);
});
test('market evidence and adjacent official codes preserve listing choices',async()=>{
 const ambiguous=await resolve('不研究港股腾讯，只看比亚迪',[{mention:'比亚迪'}]);assert.equal(ambiguous.ambiguities[0].candidates.length,2,'Excluded market must not leak into actual target');
 const hk=await resolve('研究港股中的腾讯和比亚迪',[{mention:'腾讯',market:'HK',marketEvidence:'港股'},{mention:'比亚迪',market:'HK',marketEvidence:'港股'}]);
 assert.deepEqual(hk.securities.map(s=>s.symbol),['00700','01211']);
 const dual=await resolve('比较比亚迪（002594）和比亚迪股份（01211.HK）',[{mention:'比亚迪（002594）'},{mention:'比亚迪股份（01211.HK）'}]);assert.deepEqual(dual.securities.map(s=>s.symbol),['002594','01211']);assert.deepEqual(dual.ambiguities,[]);
});
test('unknown companies stay unresolved and extra targets still block',async()=>{
 const r=await resolve('分析不存在科技和999999',[{mention:'不存在科技'},{mention:'999999'}]);assert.deepEqual(r.securities,[]);assert.deepEqual(r.unresolved,['不存在科技','999999']);
 const four=await resolve('比较600519、002594、00700和01211',[{mention:'600519'},{mention:'002594'},{mention:'00700'},{mention:'01211'}]);assert.equal(four.overflow,true);
});
test('rejects invented names, ungrounded markets and malformed model output',async()=>{
 for(const targets of [[{mention:'腾讯'}],[{mention:'茅台',market:'US',marketEvidence:'美股'}],[{mention:'茅台',market:'XYZ',marketEvidence:'茅台'}]])assert.throws(()=>parseSecurityIntent(JSON.stringify({targets}),'研究茅台'));
 for(const fetchImpl of [async()=>reply([{mention:'腾讯'}]),async()=>new Response('private error',{status:500}),async()=>new Response('{}')]){
  const result=await createSecurityIntentExtractor({env,fetchImpl})('只研究茅台');assert.equal(result.source,'rules');
 }
 const fallback=await resolveSecurities('贵州茅台',{loadCatalog:async m=>catalogs[m],extractIntent:createSecurityIntentExtractor({env:{}})});assert.equal(fallback.securities[0].symbol,'600519');assert.match(fallback.warnings[0],/语义识别暂不可用/);
});
test('cache is bounded, expires, and callers cannot mutate a stored decision',async()=>{
 let calls=0,time=0;const extract=createSecurityIntentExtractor({env,now:()=>time,maxEntries:1,fetchImpl:async()=>{calls++;return reply([{mention:'茅台'}]);}});
 const first=await extract('研究茅台');first.targets[0].mention='腾讯';assert.equal((await extract('研究茅台')).targets[0].mention,'茅台');assert.equal(calls,1);
 time=600001;await extract('研究茅台');assert.equal(calls,2);await extract('分析茅台');await extract('研究茅台');assert.equal(calls,4);
});
test('timeout falls back while edit cancellation propagates and releases capacity',async()=>{
 const fetchImpl=(_url,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));
 const keepAlive=setTimeout(()=>{},1000);
 try{
  const extract=createSecurityIntentExtractor({env,fetchImpl,timeoutMs:15,maxConcurrent:1});assert.equal((await extract('茅台')).source,'rules');
  const controller=new AbortController(),pending=extract('腾讯',{signal:controller.signal});assert.equal((await extract('比亚迪')).source,'rules');controller.abort();await assert.rejects(pending,{name:'AbortError'});
  assert.equal((await extract('腾讯')).source,'rules');
 }finally{clearTimeout(keepAlive);}
});
