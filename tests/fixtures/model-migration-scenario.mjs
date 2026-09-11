import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {reviewFixture} from './research-review.mjs';

// Same frozen synthetic inputs are exercised against the saved V4.8.2 owner
// and the migrated owner. Hashes cover full payloads, not selected text fields.
export async function migrationScenario(runAgent,mode){
 const originalFetch=globalThis.fetch,OriginalDate=globalThis.Date;
 const envKeys=['LLM_API_KEY','LLM_BASE_URL','LLM_MODEL','LLM_REVIEW_FORMAT','LLM_VISION_INPUT'];
 const previous=Object.fromEntries(envKeys.map(k=>[k,process.env[k]]));
 Object.assign(process.env,{LLM_API_KEY:'golden-synthetic-key',LLM_BASE_URL:'https://model.invalid',LLM_MODEL:'deepseek-fixture',LLM_REVIEW_FORMAT:'auto',LLM_VISION_INPUT:'off'});
 globalThis.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:['2026-09-10T00:00:00.000Z']));}static now(){return OriginalDate.parse('2026-09-10T00:00:00.000Z');}};
 const job={id:'gateway-golden-'+mode,mode,input:{mode,question:'合成资料测试，不构成投资研究',depth:'Standard',sources:[{id:'S1',title:'合成证据',text:'合成资料只验证模型迁移，缺少完整财务资料，所有缺口须保留。'}]}};
 const requests=[],events=[],checkpoints=[];
 globalThis.fetch=async(url,options)=>{
  assert.equal(String(url),'https://model.invalid/chat/completions');
  assert.equal(options.headers.Authorization,'Bearer golden-synthetic-key');
  requests.push(JSON.parse(options.body));
  if(requests.length===1)return Response.json({choices:[{message:{role:'assistant',content:null,reasoning_content:'golden-private-reasoning',tool_calls:[{id:'golden-call',type:'function',function:{name:'read_rules',arguments:'{"query":"现金流"}'}}]},finish_reason:'tool_calls'}]});
  if(requests.length===2)return Response.json({choices:[{message:{role:'assistant',content:'合成草稿：证据不足，保留缺口。[S1]'},finish_reason:'stop'}]});
  assert.equal(requests.length,3);
  return Response.json({choices:[{message:{role:'assistant',content:JSON.stringify(reviewFixture(job.input))},finish_reason:'stop'}]});
 };
 try{
  const result=await runAgent(job,(type,message,details)=>events.push({type,message,...details}),new AbortController().signal,{onCheckpoint:async()=>{checkpoints.push(structuredClone(job.checkpoint));}});
  assert.equal(requests[1].messages.find(m=>m.tool_calls)?.reasoning_content,'golden-private-reasoning');
  assert.doesNotMatch(JSON.stringify(events)+JSON.stringify(result),/golden-private-reasoning/);
  assert.equal(events.filter(e=>e.type==='tool_result'&&e.toolCallId==='golden-call').length,1);
  // Object key order is not protocol meaning; array order and every value are.
  const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
  const hash=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
  return {mode,requests:requests.length,wireSha256:hash(requests),resultSha256:hash(result),eventsSha256:hash(events),checkpointsSha256:hash(checkpoints)};
 }finally{
  globalThis.fetch=originalFetch;globalThis.Date=OriginalDate;
  for(const key of envKeys)if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];
 }
}
