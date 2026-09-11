import test from 'node:test';
import assert from 'node:assert/strict';
import {createBenchmarkModelCatalog,createLegacyModelCatalog,createPolicyModelCatalog,createVisionModelCatalog,createModelProfile} from '../server/model-catalog.mjs';
import {resolveModelConnection,modelConnectionIdentity} from '../server/model-connection.mjs';
import {createModelGateway} from '../server/model-gateway.mjs';
import {createJobModelState,createPolicyJobModelState,assertJobModelState,withJobModelState} from '../server/model-state.mjs';

// No test in this file may reach a real endpoint, even if configuration is inherited.
const originalFetch=globalThis.fetch;
test.before(()=>{globalThis.fetch=async()=>assert.fail('Unexpected non-mock transport');});
test.after(()=>{globalThis.fetch=originalFetch;});
const declared={textInput:true,imageInput:false,streaming:true,toolCalling:true,jsonObject:true,jsonSchema:false,reasoningControl:false};
const envFor=(thinking='omit',capabilities={})=>({
 LLM_API_KEY:'legacy-test-key',LLM_MAIN_API_KEY:'main-test-key',LLM_PRO_API_KEY:'pro-test-key',
 LLM_MAIN_CHALLENGER_MODEL:'opaque-candidate',LLM_MAIN_CHALLENGER_PROVIDER:'declared-provider',
 LLM_MAIN_CHALLENGER_BASE_URL:'https://challenger.invalid/v1',LLM_MAIN_CHALLENGER_API_KEY:'candidate-test-key',
 LLM_MAIN_CHALLENGER_THINKING:thinking,
 LLM_MAIN_CHALLENGER_CAPABILITIES:JSON.stringify({...declared,reasoningControl:thinking==='enabled',...capabilities}),
});
const candidate=env=>createBenchmarkModelCatalog(env).profiles.find(p=>p.id==='main-challenger');
const request=extra=>({purpose:'research',messages:[{role:'user',content:'Synthetic input'}],routingContext:{profileId:'main-challenger'},...extra});
const answer=()=>Response.json({choices:[{message:{role:'assistant',content:'Synthetic output',reasoning_content:'PRIVATE-MARKER'},finish_reason:'stop'}],usage:{prompt_tokens:3,completion_tokens:2,total_tokens:5}});
const gateway=(env,fetchImpl,catalog=createBenchmarkModelCatalog(env))=>createModelGateway({env,catalog,fetchImpl});

test('V5.0.6 benchmark catalog adds one immutable explicit MAIN challenger without changing old catalogs or states',()=>{
 const env=envFor(),catalog=createBenchmarkModelCatalog(env),p=candidate(env);
 assert.deepEqual(createBenchmarkModelCatalog({}),createPolicyModelCatalog({}));
 assert.deepEqual(catalog.profiles.slice(0,-1),createPolicyModelCatalog({}).profiles);
 for(const factory of [createLegacyModelCatalog,createPolicyModelCatalog,createVisionModelCatalog,createJobModelState,createPolicyJobModelState])assert.deepEqual(factory(env),factory({}));
 for(const factory of [createJobModelState,createPolicyJobModelState]){
  const state=factory({});assertJobModelState({modelState:state,checkpoint:{modelState:structuredClone(state)}},env);
 }
 assert.equal(catalog.schemaVersion,4);
 assert.deepEqual([p.schemaVersion,p.source,p.id,p.connectionRef,p.tier],[4,'challenger-config','main-challenger','main-challenger','MAIN']);
 assert.deepEqual(p.purposes,['research','review','followup']);
 assert.deepEqual(p,createModelProfile(JSON.parse(JSON.stringify(p))));
 assert.ok(Object.isFrozen(catalog.profiles)&&Object.isFrozen(p.capabilities)&&Object.isFrozen(p.adapterOptions));
 assert.equal(p.pricing,null);assert.equal(p.contextWindow,null);assert.equal(p.maxOutputTokens,null);
 assert.doesNotMatch(JSON.stringify(catalog),/candidate-test-key|legacy-test-key|challenger\.invalid|BASE_URL|API_KEY/);
});

test('V5.0.6 requires complete explicit capability configuration and rejects malformed/contradictory profiles',()=>{
 for(const value of [undefined,'','null','{}','{"textInput":"true"}',JSON.stringify({...declared,extra:true}),JSON.stringify({...declared,imageInput:true})]){
  assert.throws(()=>createBenchmarkModelCatalog({...envFor(),LLM_MAIN_CHALLENGER_CAPABILITIES:value}),{message:'Invalid ModelProfile metadata'});
 }
 for(const [thinking,reasoningControl] of [['enabled',null],['enabled',false],['omit',true],['disabled',true]])assert.throws(()=>createBenchmarkModelCatalog(envFor(thinking,{reasoningControl})),/Invalid ModelProfile/);
 for(const thinking of ['','auto','ENABLED'])assert.throws(()=>createBenchmarkModelCatalog(envFor(thinking)),/Invalid ModelProfile/);
 for(const mutate of [p=>p.id='main',p=>p.connectionRef='legacy-analysis',p=>p.source='policy-config',p=>p.tier='PRO',p=>p.purposes=['router'],p=>p.purposes=['vision'],p=>p.adapterOptions.secret='PRIVATE',p=>delete p.adapterOptions.thinking]){
  const p=structuredClone(candidate(envFor()));mutate(p);assert.throws(()=>createModelProfile(p),/Invalid ModelProfile/);
 }
 const p=structuredClone(candidate(envFor()));Object.defineProperty(p.adapterOptions,'thinking',{enumerable:true,get(){assert.fail('getter executed');}});
 assert.throws(()=>createModelProfile(p),/Invalid ModelProfile/);
 assert.equal(candidate({...envFor(),LLM_MAIN_CHALLENGER_THINKING:undefined}).adapterOptions.thinking,'omit');
 assert.equal(candidate({...envFor(),LLM_MAIN_CHALLENGER_PROVIDER:undefined}).provider,null);
});

test('V5.0.6 omit/disabled thinking maps exact mock wire independently of model names',async()=>{
 for(const thinking of ['omit','disabled'])for(const model of ['opaque-candidate','deepseek-flash','glm-5.3-flash']){
  const env={...envFor(thinking),LLM_MAIN_CHALLENGER_MODEL:model};let calls=0;
  const g=gateway(env,async(url,options)=>{
   calls++;assert.equal(String(url),'https://challenger.invalid/v1/chat/completions');
   assert.deepEqual(options.headers,{'Content-Type':'application/json',Authorization:'Bearer candidate-test-key'});
   assert.equal(options.method,'POST');assert.equal(options.redirect,'error');
   assert.deepEqual(JSON.parse(options.body),{model,messages:request().messages,stream:false,max_tokens:37,...(thinking==='disabled'?{thinking:{type:'disabled'}}:{})});
   return answer();
  });
  const response=await g.complete(request({stream:false,maxOutputTokens:37}));assert.equal(calls,1);
  assert.equal(response.model,model);assert.equal(response.profile,'main-challenger');assert.equal(response.provider,'declared-provider');
  assert.equal(response.usage.totalTokens,5);assert.equal(response.billing,null);
  assert.doesNotMatch(JSON.stringify(response),/PRIVATE-MARKER|reasoning_content/);
  assert.equal(g.getContinuationMessage(response).reasoning_content,'PRIVATE-MARKER');
 }
});

test('V5.0.6 enabled thinking maps optional low/high/max effort and tool/JSON requests',async()=>{
 const tools=[{type:'function',function:{name:'read_evidence',parameters:{type:'object'}}}];
 for(const effort of [undefined,'low','high','max']){
  const env=envFor('enabled');let calls=0;
  const g=gateway(env,async(url,options)=>{
   calls++;assert.deepEqual(JSON.parse(options.body),{model:'opaque-candidate',messages:request().messages,stream:false,tools,tool_choice:'auto',response_format:{type:'json_object'},thinking:{type:'enabled'},...(effort===undefined?{}:{reasoning_effort:effort})});return answer();
  });
  await g.complete(request({stream:false,tools,responseFormat:{type:'json_object'},...(effort===undefined?{}:{reasoningEffort:effort})}));assert.equal(calls,1);
 }
});

test('V5.0.6 rejects unsupported/unknown required capabilities and effort before dispatch',async()=>{
 let dispatched=0;const fetchImpl=async()=>{dispatched++;return answer();};
 for(const thinking of ['omit','disabled','enabled'])for(const effort of ['off','medium',...(thinking==='enabled'?[]:['low','high','max'])]){
  await assert.rejects(gateway(envFor(thinking),fetchImpl).complete(request({reasoningEffort:effort})),e=>e.category==='unsupported_capability');
 }
 for(const value of [false,null])for(const [capability,extra] of [
  ['textInput',{}],['streaming',{stream:true}],['toolCalling',{tools:[{type:'function',function:{name:'read'}}]}],
  ['jsonObject',{responseFormat:{type:'json_object'}}],['jsonSchema',{responseFormat:{type:'json_schema',json_schema:{name:'result',schema:{type:'object'}}}}],
 ]){
  const g=gateway(envFor('omit',{[capability]:value}),fetchImpl);
  await assert.rejects(g.complete(request({stream:false,...extra})),e=>e.category==='unsupported_capability');
  await assert.rejects(g.complete(request({stream:false,requiredCapabilities:[capability]})),e=>e.category==='unsupported_capability');
 }
 await assert.rejects(gateway(envFor(),fetchImpl).complete(request({messages:[{role:'user',content:[{type:'image_url',image_url:{url:'data:image/png;base64,eA=='}}]}]})),e=>e.category==='unsupported_capability');
 for(const purpose of ['vision','router'])await assert.rejects(gateway(envFor(),fetchImpl).complete(request({purpose})),e=>e.category==='configuration');
 assert.equal(dispatched,0);
});

test('V5.0.6 declared streaming and JSON schema retain Gateway normalization',async()=>{
 const env=envFor('enabled',{jsonSchema:true});let delta='';
 const g=gateway(env,async(url,options)=>{
  const body=JSON.parse(options.body);assert.equal(body.stream,true);assert.equal(body.response_format.type,'json_schema');
  return new Response('data: '+JSON.stringify({choices:[{index:0,delta:{role:'assistant',reasoning_content:'PRIVATE-SSE',content:'ok'},finish_reason:'stop'}]})+'\n\ndata: [DONE]\n\n',{headers:{'Content-Type':'text/event-stream'}});
 });
 const result=await g.complete(request({reasoningEffort:'low',responseFormat:{type:'json_schema',json_schema:{name:'result',schema:{type:'object'}}},onDelta:text=>{delta+=text;}}));
 assert.equal(delta,'ok');assert.equal(result.message.content,'ok');assert.doesNotMatch(JSON.stringify(result),/PRIVATE-SSE/);
});

test('V5.0.6 challenger connections never fall back; identity ignores key rotation but binds endpoint/model',async()=>{
 const env=envFor(),p=candidate(env);
 assert.deepEqual(resolveModelConnection(p,env),{base:'https://challenger.invalid/v1',key:'candidate-test-key'});
 assert.equal(modelConnectionIdentity(p,env),modelConnectionIdentity(p,{...env,LLM_MAIN_CHALLENGER_API_KEY:'rotated'}));
 assert.notEqual(modelConnectionIdentity(p,env),modelConnectionIdentity(p,{...env,LLM_MAIN_CHALLENGER_BASE_URL:'https://other.invalid/v1'}));
 assert.notEqual(modelConnectionIdentity(p,env),modelConnectionIdentity({...p,model:'other-model'},env));
 let calls=0;
 for(const change of [{LLM_MAIN_CHALLENGER_BASE_URL:undefined},{LLM_MAIN_CHALLENGER_BASE_URL:''},{LLM_MAIN_CHALLENGER_API_KEY:undefined},{LLM_MAIN_CHALLENGER_API_KEY:''},{LLM_MAIN_CHALLENGER_BASE_URL:'https://user:PRIVATE@bad.invalid'},{LLM_MAIN_CHALLENGER_BASE_URL:'https://bad.invalid/?token=PRIVATE'},{LLM_MAIN_CHALLENGER_BASE_URL:'http://remote.invalid'}]){
  const g=gateway({...env,...change},async()=>{calls++;return answer();});
  await assert.rejects(g.complete(request()),e=>e.category==='configuration'&&!JSON.stringify(e).includes('PRIVATE'));
 }
 assert.equal(calls,0);
});

test('V5.0.6 production defaults and historical pins cannot select the challenger',async()=>{
 const env=envFor();let calls=0;
 const fetchImpl=async(url,options)=>{calls++;assert.equal(JSON.parse(options.body).model,'deepseek-flash');assert.equal(options.headers.Authorization,'Bearer legacy-test-key');return answer();};
 const g=createModelGateway({env,fetchImpl});
 await assert.rejects(g.complete(request()),e=>e.category==='configuration');
 await g.complete({purpose:'research',messages:request().messages});assert.equal(calls,1);
 const custom=gateway(env,fetchImpl);
 await assert.rejects(custom.complete({purpose:'research',messages:request().messages}),e=>e.category==='configuration');
 const job={modelState:createJobModelState()};
 await assert.rejects(withJobModelState(job,()=>custom.complete(request())),e=>e.code==='model_state_incompatible');
 assert.equal(calls,1);
});

test('V5.0.6 benchmark catalog retains explicit legacy/MAIN/PRO mock requests',async()=>{
 const env=envFor();
 for(const [id,model,key,effort] of [['legacy-analysis','deepseek-flash','legacy-test-key',undefined],['main','glm-5.3-flash','main-test-key','low'],['pro','deepseek-flash','pro-test-key','max']]){
  let calls=0;const g=gateway(env,async(url,options)=>{
   calls++;assert.equal(options.headers.Authorization,'Bearer '+key);const body=JSON.parse(options.body);assert.equal(body.model,model);
   assert.equal(body.reasoning_effort,effort);assert.deepEqual(body.thinking,effort?{type:'enabled'}:undefined);return answer();
  });
  await g.complete(request({routingContext:{profileId:id},stream:false,...(effort?{reasoningEffort:effort}:{})}));assert.equal(calls,1);
 }
});

test('V5.0.6 refusal, errors and cancellation never replay or expose provider bodies',async()=>{
 for(const status of [401,429,500]){
  let calls=0;const g=gateway(envFor(),async()=>{calls++;return Response.json({error:{message:'PRIVATE-PROVIDER-BODY'}},{status});});
  await assert.rejects(g.complete(request()),e=>!JSON.stringify(e).includes('PRIVATE-PROVIDER-BODY'));assert.equal(calls,1);
 }
 const control=new AbortController();control.abort();let calls=0;
 await assert.rejects(gateway(envFor(),async()=>{calls++;return answer();}).complete(request({signal:control.signal})),e=>e.category==='aborted');
 assert.equal(calls,0);
 let refusalCalls=0;
 await assert.rejects(gateway(envFor(),async()=>{refusalCalls++;return Response.json({choices:[{message:{role:'assistant',content:null,refusal:'PRIVATE-REFUSAL'},finish_reason:'stop'}]});}).complete(request()),e=>e.category==='refusal');
 assert.equal(refusalCalls,1);
});
