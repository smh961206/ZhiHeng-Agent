import test from 'node:test';
import assert from 'node:assert/strict';
import {createLegacyModelCatalog,createModelProfile} from '../server/model-catalog.mjs';
import {modelRouting,publicModelRouting} from '../server/model-routing.mjs';
import {visionStatus,readVisionImages} from '../server/vision-model.mjs';
import {createPathResolver} from '../server/research-path.mjs';
import {createSecurityIntentExtractor} from '../server/security-intent.mjs';

const byId=(catalog,id)=>catalog.profiles.find(p=>p.id===id);
const sample=()=>structuredClone(createLegacyModelCatalog({}).profiles[0]);

test('Legacy catalog maps defaults, empty-string fallback and explicit model overrides',()=>{
 for(const env of [{},{LLM_MODEL:'',LLM_ROUTER_MODEL:'',LLM_VISION_MODEL:''},{LLM_MODEL:'custom-analysis',LLM_ROUTER_MODEL:'custom-router',LLM_VISION_MODEL:'custom-image'},{LLM_MODEL:'custom-analysis'}]){
  const catalog=createLegacyModelCatalog(env),routing=modelRouting(env);
  assert.equal(byId(catalog,'legacy-analysis').model,routing.analysisModel);
  assert.equal(byId(catalog,'legacy-router').model,env.LLM_ROUTER_MODEL||routing.analysisModel);
  assert.equal(byId(catalog,'legacy-vision').model,routing.visionModel);
  assert.deepEqual(catalog.profiles.map(p=>p.purposes),[['research','review','followup'],['router'],['vision']]);
 }
 assert.equal(byId(createLegacyModelCatalog({}),'legacy-analysis').model,'deepseek-v4-pro');
 assert.equal(byId(createLegacyModelCatalog({}),'legacy-vision').model,'deepseek-v4-flash-vision-exp');
});

test('Legacy connection references preserve independent base/key fallback without serializing connections',()=>{
 for(const env of [
  {LLM_API_KEY:'analysis-secret',LLM_BASE_URL:'https://analysis.invalid'},
  {LLM_API_KEY:'analysis-secret',LLM_BASE_URL:'https://analysis.invalid',LLM_VISION_API_KEY:'vision-secret',LLM_VISION_BASE_URL:'https://vision.invalid'},
  {LLM_API_KEY:'analysis-secret',LLM_BASE_URL:'https://analysis.invalid',LLM_VISION_API_KEY:'',LLM_VISION_BASE_URL:''},
  {LLM_VISION_API_KEY:'vision-only',LLM_VISION_BASE_URL:'https://vision.invalid'},
 ]){
  const catalog=createLegacyModelCatalog(env),routing=modelRouting(env);
  for(const profile of catalog.profiles){
   assert.equal(profile.connectionRef,{'legacy-analysis':'legacy-analysis','legacy-router':'legacy-analysis','legacy-vision':'legacy-vision'}[profile.id]);
   const vision=profile.connectionRef==='legacy-vision';
   assert.equal(vision?routing.visionKey:routing.analysisKey,vision?(env.LLM_VISION_API_KEY||env.LLM_API_KEY):env.LLM_API_KEY);
   assert.equal(vision?routing.visionBase:routing.analysisBase,(vision&&env.LLM_VISION_BASE_URL)||env.LLM_BASE_URL||'https://api.deepseek.com');
  }
  assert.equal(byId(catalog,'legacy-router').connectionRef,'legacy-analysis');
 }
});

test('Catalog excludes credentials, credential-bearing URLs and unrelated environment fields',()=>{
 const env={LLM_API_KEY:'analysis-secret',LLM_VISION_API_KEY:'vision-secret',LLM_BASE_URL:'https://user:password@host.invalid/secret-path?token=secret-token',LLM_VISION_BASE_URL:'https://vision.invalid/private',MONGODB_URI:'database-secret',UNRELATED_SECRET:'other-secret'};
 const json=JSON.stringify(createLegacyModelCatalog(env));
 for(const secret of Object.values(env))assert.ok(!json.includes(secret));
 for(const part of ['password','secret-token','secret-path','API_KEY','BASE_URL','MONGODB'])assert.ok(!json.includes(part));
 assert.deepEqual(createLegacyModelCatalog(env),createLegacyModelCatalog({}));
});

test('Legacy capabilities describe transport usage and retain unknown provider support explicitly',()=>{
 const {profiles}=createLegacyModelCatalog({LLM_MODEL:'vision-pro-ultra',LLM_ROUTER_MODEL:'pro',LLM_VISION_MODEL:'some-vision-model'});
 assert.equal(profiles[0].capabilities.imageInput,false);
 assert.equal(profiles[0].capabilities.toolCalling,true);
 assert.equal(profiles[0].capabilities.streaming,true);
 assert.equal(profiles[1].capabilities.toolCalling,false);
 assert.equal(profiles[1].capabilities.streaming,false);
 assert.equal(profiles[2].capabilities.imageInput,false);
 for(const profile of profiles){
  assert.equal(profile.provider,null);
  assert.equal(profile.tier,'legacy');
  assert.equal(profile.capabilities.jsonSchema,null);
  assert.equal(profile.capabilities.jsonObject,null);
  assert.equal(profile.capabilities.reasoningControl,null);
  assert.equal(profile.contextWindow,null);
  assert.equal(profile.maxOutputTokens,null);
 }
});

test('Vision capability and credential readiness preserve every legacy mode combination',()=>{
 for(const model of [undefined,'','deepseek-v4-flash-vision-exp','some-vision-model','deepseek-v4-flash'])
 for(const mode of [undefined,'','auto','off','images','IMAGES'])
 for(const key of [undefined,'','synthetic-key']){
  const env={LLM_VISION_MODEL:model,LLM_VISION_INPUT:mode,LLM_API_KEY:key};
  const expected=mode!=='off'&&((model||'deepseek-v4-flash-vision-exp')==='deepseek-v4-flash-vision-exp'||mode==='images');
  assert.equal(byId(createLegacyModelCatalog(env),'legacy-vision').capabilities.imageInput,expected);
  assert.equal(visionStatus(env).enabled,!!key&&expected);
 }
 assert.equal(visionStatus({LLM_VISION_API_KEY:'vision-only'}).enabled,true);
});

test('Unknown pricing is null and known zero prices remain distinguishable from missing rates',()=>{
 for(const p of createLegacyModelCatalog({LLM_INPUT_PRICE:'0',LLM_OUTPUT_PRICE:'99'}).profiles)assert.equal(p.pricing,null);
 const input=sample();input.pricing={currency:'USD',unit:'per-million-tokens',input:0,output:2,cacheRead:null};
 const profile=createModelProfile(input);
 assert.deepEqual(profile.pricing,input.pricing);
 input.pricing.output=100;
 assert.equal(profile.pricing.output,2);
});

test('ModelProfile rejects missing, extra, secret and malformed capability metadata without echoing values',()=>{
 for(const mutate of [p=>delete p.capabilities.imageInput,p=>p.capabilities.imageInput='yes',p=>p.capabilities.apiKey='hidden-secret',p=>p.apiKey='hidden-secret',p=>delete p.pricing,p=>p.schemaVersion=2,p=>p.purposes=['judge'],p=>p.purposes=['review','review'],p=>p.model='',p=>p.connectionRef='https://private.invalid',p=>p.contextWindow=Infinity,p=>p.maxOutputTokens=0,p=>p.contextWindow=1.5]){
  const input=sample();mutate(input);
  assert.throws(()=>createModelProfile(input),{name:'TypeError',message:'Invalid ModelProfile metadata'});
 }
});

test('ModelProfile rejects invalid prices and permits explicit unknown capabilities',()=>{
 for(const change of [{input:-1},{output:Infinity},{cacheRead:NaN},{input:'1'},{currency:'usd'},{currency:new String('USD')},{unit:'tokens'},{secret:'never-log'}]){
  const input=sample();input.pricing={currency:'USD',unit:'per-million-tokens',input:null,output:null,cacheRead:null,...change};
  assert.throws(()=>createModelProfile(input),/Invalid ModelProfile metadata/);
 }
 const input=sample();input.capabilities.toolCalling=null;
 assert.equal(createModelProfile(input).capabilities.toolCalling,null);
});

test('ModelProfile rejects sparse purpose lists and executable array overrides',()=>{
 for(const list of [Array(1),['research',,],Object.assign(['research'],{[Symbol.iterator]:function*(){yield 'vision';}})]){
  const input=sample();input.purposes=list;
  assert.throws(()=>createModelProfile(input),{name:'TypeError',message:'Invalid ModelProfile metadata'});
 }
});

test('ModelProfile rejects hidden required fields instead of losing them during serialization',()=>{
 for(const [section,key] of [[null,'model'],['capabilities','imageInput'],['pricing','currency']]){
  const input=sample();input.pricing={currency:'USD',unit:'per-million-tokens',input:1,output:null,cacheRead:null};
  const owner=section?input[section]:input;
  Object.defineProperty(owner,key,{enumerable:false});
  assert.throws(()=>createModelProfile(input),{name:'TypeError',message:'Invalid ModelProfile metadata'});
 }
});

test('ModelProfile rejects accessors without executing them or echoing their errors',()=>{
 for(const [section,key] of [[null,'model'],['capabilities','imageInput'],['pricing','currency'],['purposes','0']]){
  const input=sample();input.pricing={currency:'USD',unit:'per-million-tokens',input:1,output:null,cacheRead:null};
  let reads=0;const owner=section?input[section]:input;
  Object.defineProperty(owner,key,{enumerable:true,get(){reads++;throw new Error('synthetic-secret');}});
  assert.throws(()=>createModelProfile(input),{name:'TypeError',message:'Invalid ModelProfile metadata'});
  assert.equal(reads,0);
 }
});

test('Catalog snapshots are deeply immutable, serializable and isolated from later env changes',()=>{
 const env={LLM_MODEL:'before'},catalog=createLegacyModelCatalog(env);
 env.LLM_MODEL='after';
 assert.equal(catalog.profiles[0].model,'before');
 assert.equal(createLegacyModelCatalog(env).profiles[0].model,'after');
 assert.throws(()=>catalog.profiles.push(sample()),TypeError);
 assert.throws(()=>catalog.profiles[0].capabilities.imageInput=true,TypeError);
 assert.throws(()=>catalog.profiles[0].purposes.push('vision'),TypeError);
 const copy=JSON.parse(JSON.stringify(catalog));
 assert.deepEqual(copy,catalog);
 for(const p of catalog.profiles)assert.deepEqual(createModelProfile(p),p);
 for(const p of copy.profiles)assert.deepEqual(createModelProfile(p),p);
});

test('Creating a catalog neither mutates environment nor changes public routing output',()=>{
 const env=Object.freeze({LLM_MODEL:'a',LLM_ROUTER_MODEL:'b',LLM_VISION_MODEL:'v',LLM_API_KEY:'synthetic'});
 const before={routing:modelRouting(env),public:publicModelRouting(env),vision:visionStatus(env)};
 createLegacyModelCatalog(env);
 assert.deepEqual({routing:modelRouting(env),public:publicModelRouting(env),vision:visionStatus(env)},before);
 assert.deepEqual(before.public,{analysisModel:'a',visionModel:'v',workflow:'Vision 负责看，Pro 负责分析与审计'});
});

test('Catalog Vision profile agrees with a working legacy request and does not change wire options',async()=>{
 const env={LLM_VISION_API_KEY:'synthetic',LLM_VISION_BASE_URL:'https://vision.invalid',LLM_VISION_MODEL:'custom-image',LLM_VISION_INPUT:'images'};
 const profile=byId(createLegacyModelCatalog(env),'legacy-vision');let calls=0;
 const result=await readVisionImages([{page:1,dataUrl:'data:image/png;base64,AA=='}],{env,prompt:'read',fetcher:async(url,options)=>{
  calls++;assert.equal(url.origin,'https://vision.invalid');
  assert.equal(options.headers.Authorization,'Bearer synthetic');
  const body=JSON.parse(options.body);
  assert.equal(body.model,profile.model);assert.equal(profile.capabilities.imageInput,true);
  assert.equal(body.stream,false);assert.equal(body.max_tokens,6000);assert.equal(body.thinking,undefined);
  return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:'visible text'}}]}));
 }});
 assert.equal(result,'visible text');assert.equal(calls,1);
});

test('Catalog router profile agrees with both legacy request owners and preserves override semantics',async()=>{
 for(const routerModel of ['', 'custom-router', 'deepseek-fixture']){
  const env={LLM_MODEL:'analysis-fixture',LLM_ROUTER_MODEL:routerModel,LLM_API_KEY:'analysis-only',LLM_BASE_URL:'https://analysis.invalid',LLM_VISION_API_KEY:'vision-only',LLM_VISION_BASE_URL:'https://vision.invalid'};
  const profile=byId(createLegacyModelCatalog(env),'legacy-router');
  assert.equal(profile.model,routerModel||'analysis-fixture');
  assert.equal(profile.connectionRef,'legacy-analysis');
  for(const owner of ['path','security-intent']){
   const seen=[],question='分析贵州茅台现金流';
   const fetchImpl=async(url,options)=>{
    seen.push({url,options});
    const content=owner==='path'?{mode:'B',reason:'单家公司研究'}:{targets:[{mention:'贵州茅台',market:null,marketEvidence:''}]};
    return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(content)}}]}));
   };
   const result=owner==='path'?await createPathResolver({env,fetchImpl}).recommend(question):await createSecurityIntentExtractor({env,fetchImpl})(question);
   assert.equal(result.source,'semantic');assert.equal(seen.length,1);
   const {url,options}=seen[0],body=JSON.parse(options.body);
   assert.equal(url.origin,'https://analysis.invalid');
   assert.equal(options.headers.Authorization,'Bearer analysis-only');
   assert.equal(body.model,profile.model);assert.equal(body.stream,false);
   assert.equal(body.max_tokens,owner==='path'?400:1200);assert.equal(body.tools,undefined);
   assert.deepEqual(body.thinking,routerModel==='deepseek-fixture'?{type:'disabled'}:undefined);
  }
 }
});
