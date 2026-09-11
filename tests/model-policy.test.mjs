import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {setImmediate as nextTick} from 'node:timers/promises';
import {evaluateModelPolicy,modelRoutingMode} from '../server/model-policy.mjs';
import {createModelGateway} from '../server/model-gateway.mjs';
import {runAgent} from '../server/agent.mjs';
import {migrationScenario} from './fixtures/model-migration-scenario.mjs';

const env={LLM_API_KEY:'secret-key',LLM_BASE_URL:'https://model.invalid',LLM_MODEL:'opaque-model'};
const request={purpose:'research',messages:[{role:'user',content:'private-question'}],stream:false};
const reply=()=>Response.json({choices:[{message:{role:'assistant',content:'answer',reasoning_content:'private-reasoning'},finish_reason:'stop'}]});

test('policy V1 uses exact raw complexity thresholds without rescaling',()=>{
 const cases=[
  [{companyCount:1},0,'MAIN','low'],[{materials:{documentCount:4}},3,'MAIN','low'],
  [{companyCount:2},4,'MAIN','high'],[{companyCount:2,materials:{documentCount:4}},7,'MAIN','high'],
  [{mode:'B'},8,'PRO','high'],[{mode:'B',runtime:{reasoningFailureCount:2}},10,'PRO','high'],
  [{mode:'B',materials:{documentCount:4}},11,'PRO','max'],[{mode:'D',historyYears:8},24,'PRO','max'],
 ];
 for(const [signals,score,slot,reasoningEffort] of cases){
  const before=structuredClone(signals),result=evaluateModelPolicy(signals);
  assert.equal(result.complexity.score,score);assert.deepEqual(result.candidate,{slot,reasoningEffort});assert.deepEqual(signals,before);
  assert.deepEqual(evaluateModelPolicy(JSON.parse(JSON.stringify(signals))),result);
 }
});

test('Mode A is always Main/low and missing/provider/format failures cannot upgrade a candidate',()=>{
 const high={companyCount:4,historyYears:8,evidence:{conflictCount:3}};
 assert.deepEqual(evaluateModelPolicy({mode:'A',...high}).candidate,{slot:'MAIN',reasoningEffort:'low'});
 const gaps={evidence:{missingCount:100},runtime:{providerFailureCount:100,dataGapCount:100},review:{formatFailureCount:100,dataGapCount:100}};
 for(const input of [{},{mode:'A'},{mode:'B'},{companyCount:2}]){
  const before=evaluateModelPolicy(input),after=evaluateModelPolicy({...input,...gaps});
  assert.deepEqual(after.candidate,before.candidate);assert.equal(after.complexity.score,before.complexity.score);
 }
 assert.equal(evaluateModelPolicy().candidate,null);assert.equal(evaluateModelPolicy(gaps).complexity.level,'unknown');
 assert.throws(()=>evaluateModelPolicy({question:'private-question'}),{code:'invalid_complexity_input'});
});

test('only explicit dry-run enables observation; policy/unknown configuration cannot enable execution',()=>{
 assert.equal(modelRoutingMode({MODEL_ROUTING_MODE:'dry-run'}),'dry-run');
 for(const mode of [undefined,'','legacy','policy','DRY-RUN','invalid'])assert.equal(modelRoutingMode({MODEL_ROUTING_MODE:mode}),'legacy');
});

test('policy does not invoke inherited failure getters or invent a candidate from them',()=>{
 const key='reasoningFailureCount',saved=Object.getOwnPropertyDescriptor(Object.prototype,key);
 let calls=0,result;
 try{
  Object.defineProperty(Object.prototype,key,{configurable:true,get(){calls++;return 2;}});
  result=evaluateModelPolicy({});
 }finally{if(saved)Object.defineProperty(Object.prototype,key,saved);else delete Object.prototype[key];}
 assert.equal(calls,0);assert.equal(result.candidate,null);assert.equal(result.complexity.level,'unknown');
 assert.equal(result.complexity.signals.runtime.reasoningFailureCount,null);
 assert.equal(result.complexity.signals.review.reasoningFailureCount,null);
});

test('dry-run logs candidate separately from actual profile and leaves wire, response and private continuation unchanged',async()=>{
 const bodies=[],decisions=[];
 const run=async mode=>{
  const gateway=createModelGateway({env:{...env,MODEL_ROUTING_MODE:mode},now:()=>0,onRoutingDecision:d=>decisions.push(d),fetchImpl:async(url,options)=>{
   assert.equal(String(url),'https://model.invalid/chat/completions');assert.equal(options.headers.Authorization,'Bearer secret-key');bodies.push(options.body);return reply();
  }});
  const result=await gateway.complete({...request,routingContext:{complexitySignals:{mode:'D',historyYears:8}}});
  return {result,continuation:gateway.getContinuationMessage(result)};
 };
 const legacy=await run('legacy'),dry=await run('dry-run');
 assert.deepEqual(dry,legacy);assert.equal(bodies[0],bodies[1]);assert.equal(decisions.length,1);
 assert.equal(decisions[0].executionProfile,'legacy-analysis');assert.equal(decisions[0].executionReasoningEffort,null);
 assert.deepEqual(decisions[0].candidate,{slot:'PRO',reasoningEffort:'max'});
 assert.doesNotMatch(JSON.stringify(decisions),/secret-key|private-question|private-reasoning|model.invalid|opaque-model/);
 assert.equal(JSON.parse(bodies[1]).reasoning_effort,undefined);
 assert.equal(dry.result.routingDecision,undefined);assert.equal(dry.continuation.reasoning_content,'private-reasoning');
});

test('observation failures, invalid signals and sink mutation cannot fail, replay or change execution',async()=>{
 for(const sink of [()=>{throw Error('private-sink');},async()=>{throw Error('private-async');},d=>{d.executionProfile='PRO';d.candidate.slot='MAIN';},()=>new Promise(()=>{})]){
  let calls=0;
  const gateway=createModelGateway({env:{...env,MODEL_ROUTING_MODE:'dry-run'},onRoutingDecision:sink,fetchImpl:async()=>{calls++;return reply();}});
  assert.equal((await gateway.complete({...request,routingContext:{complexitySignals:{mode:'D'}}})).profile,'legacy-analysis');assert.equal(calls,1);
 }
 const decisions=[];
 const gateway=createModelGateway({env:{...env,MODEL_ROUTING_MODE:'dry-run'},onRoutingDecision:d=>decisions.push(d),fetchImpl:async()=>reply()});
 await gateway.complete({...request,routingContext:{complexitySignals:{question:'secret'}}});
 assert.deepEqual(decisions[0].reasons,['invalid_complexity_input']);assert.equal(decisions[0].candidate,null);
 assert.doesNotMatch(JSON.stringify(decisions),/secret/);await nextTick();
});

test('explicit execution profile and reasoning remain authoritative; router/Vision are not tier scored',async()=>{
 const decisions=[],bodies=[];
 const gateway=createModelGateway({env:{...env,LLM_MODEL:'deepseek-fixture',MODEL_ROUTING_MODE:'dry-run'},onRoutingDecision:d=>decisions.push(d),fetchImpl:async(_url,o)=>{bodies.push(JSON.parse(o.body));return reply();}});
 const result=await gateway.complete({...request,reasoningEffort:'off',routingContext:{profileId:'legacy-analysis',complexitySignals:{mode:'D'}}});
 assert.equal(result.profile,'legacy-analysis');assert.deepEqual(bodies[0].thinking,{type:'disabled'});
 assert.equal(decisions[0].executionReasoningEffort,'off');assert.equal(decisions[0].candidate.reasoningEffort,'max');
 for(const purpose of ['router','vision']){
  const messages=purpose==='vision'?[{role:'user',content:[{type:'image_url',image_url:{url:'data:image/png;base64,AA=='}}]}]:request.messages;
  await gateway.complete({...request,purpose,messages});
  assert.equal(decisions.at(-1).candidate,null);assert.deepEqual(decisions.at(-1).reasons,['purpose_not_scored']);
  assert.equal(decisions.at(-1).executionProfile,'legacy-'+purpose);
 }
});

test('decisions describe planned attempts; invalid requests and pre-aborted calls are not observed',async()=>{
 const decisions=[];let calls=0;
 const gateway=createModelGateway({env:{...env,MODEL_ROUTING_MODE:'dry-run'},onRoutingDecision:d=>decisions.push(d),fetchImpl:async()=>{calls++;return reply();}});
 await assert.rejects(gateway.complete({...request,reasoningEffort:'max'}),{category:'unsupported_capability'});
 // Adapter capability validation happens after the observation: this record is
 // a planned attempt, not evidence of dispatch or success.
 assert.equal(decisions.length,1);assert.equal(calls,0);
 decisions.length=0;
 await assert.rejects(gateway.complete({...request,stream:null}));
 await assert.rejects(gateway.complete({...request,signal:AbortSignal.abort()}));
 assert.equal(decisions.length,0);assert.equal(calls,0);
});

test('provider HTTP failures remain one failed legacy call, never a second candidate attempt',async()=>{
 for(const status of [429,503]){
  let calls=0;const decisions=[];
  const gateway=createModelGateway({env:{...env,MODEL_ROUTING_MODE:'dry-run'},onRoutingDecision:d=>decisions.push(d),fetchImpl:async()=>{calls++;return Response.json({error:{message:'private-failure'}},{status});}});
  await assert.rejects(gateway.complete({...request,routingContext:{complexitySignals:{companyCount:1,runtime:{providerFailureCount:50}}}}),{category:status===429?'rate_limit':'provider_unavailable'});
  assert.equal(calls,1);assert.equal(decisions.length,1);assert.deepEqual(decisions[0].candidate,{slot:'MAIN',reasoningEffort:'low'});
 }
});

test('dry-run observation cannot mix a selected profile with reloaded connection configuration',async()=>{
 const localEnv={...env,MODEL_ROUTING_MODE:'dry-run'},requests=[],timerDurations=[];
 const gateway=createModelGateway({env:localEnv,onRoutingDecision:()=>{
  Object.assign(localEnv,{LLM_MODEL:'reloaded-model',LLM_BASE_URL:'https://reloaded.invalid',LLM_API_KEY:'reloaded-key',LLM_MAX_DURATION_MS:'30000'});
 },setTimer:(callback,ms)=>{timerDurations.push(ms);return setTimeout(callback,ms);},fetchImpl:async(url,options)=>{requests.push({origin:url.origin,key:options.headers.Authorization,model:JSON.parse(options.body).model});return reply();}});
 await gateway.complete(request);
 assert.ok(timerDurations.includes(1800000));assert.ok(!timerDurations.includes(30000),'the first request retains its original total deadline');
 await gateway.complete(request);
 assert.ok(timerDurations.includes(30000),'the next request sees the reloaded deadline');
 assert.deepEqual(requests,[
  {origin:'https://model.invalid',key:'Bearer secret-key',model:'opaque-model'},
  {origin:'https://reloaded.invalid',key:'Bearer reloaded-key',model:'reloaded-model'},
 ]);
});

const golden=JSON.parse(fs.readFileSync(new URL('./fixtures/model-migration-baseline.json',import.meta.url)));
for(const expected of golden.cases)test('dry-run preserves pinned wire/delivery/events/checkpoints for '+expected.mode,async()=>{
 const oldMode=process.env.MODEL_ROUTING_MODE,oldInfo=console.info,decisions=[];
 process.env.MODEL_ROUTING_MODE='dry-run';console.info=text=>decisions.push(JSON.parse(text));
 try{
  assert.deepEqual(await migrationScenario(runAgent,expected.mode),expected);
  assert.equal(decisions.length,3);
  for(const decision of decisions){
   assert.equal(decision.executionProfile,'legacy-analysis');assert.equal(decision.complexity.signals.mode,expected.mode);
   assert.ok(Number.isSafeInteger(decision.complexity.signals.historyYears));
   assert.equal(decision.complexity.signals.companyCount,null);assert.equal(decision.complexity.signals.runtime.reasoningFailureCount,null);
   if(expected.mode==='A')assert.deepEqual(decision.candidate,{slot:'MAIN',reasoningEffort:'low'});
  }
 }finally{console.info=oldInfo;if(oldMode===undefined)delete process.env.MODEL_ROUTING_MODE;else process.env.MODEL_ROUTING_MODE=oldMode;}
});

test('shadow policy dependency boundary cannot feed candidate decisions into transport or business selection',()=>{
 const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const walk=dir=>fs.readdirSync(new URL('../'+dir,import.meta.url),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):[dir+'/'+e.name]);
 for(const path of ['server','scripts','src','shared'].flatMap(walk).filter(p=>/\.(mjs|js|jsx)$/.test(p))){
  if(!['server/model-gateway.mjs','server/model-policy.mjs','server/model-rollout.mjs','scripts/model-comparison-worker.mjs'].includes(path))assert.doesNotMatch(read(path),/model-policy\.mjs|evaluateModelPolicy\s*\(|observeModelPolicy\s*\(/,path);
 }
 const gateway=read('server/model-gateway.mjs');
 assert.match(gateway,/observeModelPolicy\(\{purpose:request\.purpose,profile,reasoningEffort:request\.reasoningEffort,signals\},onRoutingDecision\);/);
 assert.doesNotMatch(gateway,/\.candidate|\bslot\b/);
 assert.doesNotMatch(read('server/model-policy.mjs'),/\b(?:fetch|process|Date|setTimeout)\b|model-adapter|createModelGateway/);
 assert.match(read('server/model-rollout.mjs'),/if\(modelRolloutStatus\(env\)\.active==='policy'\)/,'execution recommendations require the accepted rollout gate');
 assert.doesNotMatch(read('server/model-rollout.mjs'),/from\s*['"][^'"]*model-adapter|createModelGateway|\bfetch\s*\(/,'rollout cannot dispatch or own provider transport');
});
