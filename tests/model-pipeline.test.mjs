import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {validateModelConfig,modelConfig} from '../server/model-config.mjs';
import {createPipelineModelCatalog,pipelineStageProfiles} from '../server/model-catalog.mjs';
import {createPipelineJobModelState,withJobModelState,assertJobModelState} from '../server/model-state.mjs';
import {createConfiguredJobModelState,createFlagshipJobState,flagshipRolloutStatus} from '../server/model-rollout.mjs';
import {createModelGateway} from '../server/model-gateway.mjs';
import {runAgent} from '../server/agent.mjs';
import {reviewFixture} from './fixtures/research-review.mjs';

const definition=()=>({schemaVersion:2,models:{fast:{model:'fast-model',baseUrl:'https://fast.invalid',apiKeyEnv:'FAST_KEY'},strong:{model:'strong-model',baseUrl:'https://strong.invalid',apiKeyEnv:'STRONG_KEY'}},pipeline:{input:'fast',vision:'fast',researcher:['strong','fast'],writer:'strong',evidenceVerifier:'fast',auditor:'strong',criticalReviewer:['strong'],judge:[]}});
function fixture(run){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'model-pipeline-')),file=path.join(dir,'models.json');fs.writeFileSync(file,JSON.stringify(definition()));try{const result=run({file,env:{MODEL_CONFIG_FILE:file,FAST_KEY:'fast-secret',STRONG_KEY:'strong-secret'}});if(result&&typeof result.finally==='function')return result.finally(()=>fs.rmSync(dir,{recursive:true,force:true}));fs.rmSync(dir,{recursive:true,force:true});return result;}catch(error){fs.rmSync(dir,{recursive:true,force:true});throw error;}}

test('v2 defines each model once and derives stage capabilities without secrets',()=>fixture(({env})=>{
 const config=modelConfig(env),catalog=createPipelineModelCatalog(env);
 assert.equal(config.schemaVersion,2);
 assert.deepEqual(pipelineStageProfiles('input',env),['configured-fast']);
 assert.deepEqual(pipelineStageProfiles('researcher',env),['configured-strong','configured-fast']);
 assert.equal(catalog.profiles.find(p=>p.id==='configured-fast').capabilities.imageInput,true);
 assert.equal(catalog.profiles.find(p=>p.id==='configured-strong').capabilities.toolCalling,true);
 assert.doesNotMatch(JSON.stringify(catalog),/fast-secret|strong-secret/);
}));

test('new jobs pin every stage while historical state versions remain separate',()=>fixture(({env})=>{
 const state=createConfiguredJobModelState(env,{},{}),job={mode:'B',modelState:state};
 assert.equal(state.version,4);
 assert.equal(state.contextVersion,1);
 assert.equal(state.stages.input.active,'configured-fast');
 assert.equal(state.stages.researcher.active,'configured-strong');
 assert.doesNotThrow(()=>assertJobModelState(job,env));
 const historical=structuredClone(job);delete historical.modelState.contextVersion;assert.doesNotThrow(()=>assertJobModelState(historical,env));
 assert.throws(()=>assertJobModelState(job,{...env,STRONG_KEY:'rotated',MODEL_CONFIG_FILE:env.MODEL_CONFIG_FILE.replace('models.json','missing.json')}));
}));

test('Input and researcher dispatch through the same Gateway using their configured stage pins',async()=>fixture(async({env})=>{
 const calls=[];
 const gateway=createModelGateway({env,fetchImpl:async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{role:'assistant',content:'ok'}}]}),{headers:{'content-type':'application/json'}});}});
 await gateway.complete({purpose:'input',messages:[{role:'user',content:'classify'}],stream:false});
 const job={mode:'B',modelState:createPipelineJobModelState(env)};
 await withJobModelState(job,()=>gateway.complete({purpose:'researcher',messages:[{role:'user',content:'research'}],stream:false}),env);
 assert.match(String(calls[0].url),/fast\.invalid/);assert.equal(calls[0].body.model,'fast-model');
 assert.match(String(calls[1].url),/strong\.invalid/);assert.equal(calls[1].body.model,'strong-model');
}));

test('new stage names retain legacy purpose identities for historical configuration',async()=>{
 const records=[];
 const env={LLM_API_KEY:'legacy-secret',LLM_BASE_URL:'https://legacy.invalid',LLM_MODEL:'legacy-model',MODEL_TELEMETRY_ENABLED:'true'};
 const gateway=createModelGateway({env,onModelCall:record=>records.push(record),fetchImpl:async()=>new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{role:'assistant',content:'ok'}}]}),{headers:{'content-type':'application/json'}})});
 await gateway.complete({purpose:'input',messages:[{role:'user',content:'classify'}],stream:false});
 await gateway.complete({purpose:'researcher',messages:[{role:'user',content:'research'}],stream:false});
 assert.deepEqual(records.filter(record=>record.status==='succeeded').map(record=>record.purpose),['router','research']);
});

test('modelState v4 rebuilds public context for a dedicated Writer before Auditor',async()=>fixture(async({env})=>{
 const originalEnv=process.env,originalFetch=globalThis.fetch,calls=[];let firstToolNames=[],writerIntegrity;
 const input={question:'研究测试企业',depth:'Standard',portfolio:'',sources:[{id:'S1',title:'研究测试企业资料',text:'研究测试企业的合成证据，仅用于验证 Writer 环节。[S1]',url:'',date:''}]};
 const job={mode:'B',input,modelState:createPipelineJobModelState(env)};
 process.env={...originalEnv,...env,MODEL_TELEMETRY_ENABLED:'false'};
 globalThis.fetch=async(_url,options)=>{
  const body=JSON.parse(options.body);calls.push(body);
  if(calls.length===1){firstToolNames=(body.tools??[]).map(item=>item.function.name);return Response.json({choices:[{message:{role:'assistant',content:'研究初稿[S1]'}}]});}
  if(calls.length===2){assert.match(body.messages[0].content,/报告撰写员/);const packet=JSON.parse(body.messages[1].content);writerIntegrity=packet.contextIntegrity;assert.doesNotMatch(JSON.stringify(body.messages),/reasoning_content/);return Response.json({choices:[{message:{role:'assistant',content:'Writer 整理稿[S1]'}}]});}
  return Response.json({choices:[{message:{role:'assistant',content:JSON.stringify(reviewFixture(input))}}]});
 };
 try{
  const result=await runAgent(job,()=>{},new AbortController().signal,{onModelCheckpoint:async()=>{}});
  assert.equal(calls.length,3);assert.equal(calls[0].model,'strong-model');assert.equal(calls[1].model,'strong-model');assert.equal(calls[2].model,'strong-model');
  assert.ok(!firstToolNames.includes('calculate_dcf_sensitivity'));assert.ok(!firstToolNames.includes('calculate_dividend_scenarios'));assert.ok(!firstToolNames.includes('review_valuation_models'));
  assert.equal(writerIntegrity.status,'complete');
  assert.equal(job.checkpoint.writerCompleted,true);assert.match(result.report,/经审计/);
 }finally{process.env=originalEnv;globalThis.fetch=originalFetch;}
}));

test('configured critical review needs no trial or acceptance file but retains explicit job authorization',()=>fixture(({env})=>{
 const status=flagshipRolloutStatus('critical-review',env);
 assert.equal(status.accepted,true);assert.deepEqual(status.reasons,[]);
 const state=createFlagshipJobState({createdAt:'2026-09-12T00:00:00.000Z'},env);
 assert.equal(state.version,1);assert.equal(state.authorizations['critical-review'].profileId,'configured-strong');
 assert.equal(state.authorizations.judge,undefined);
}));

test('v2 rejects undeclared stages, unused models, duplicate pools and secret-bearing URLs',()=>{
 for(const mutate of [
  c=>{c.pipeline.router=c.pipeline.input;},
  c=>{c.models.unused={model:'x',baseUrl:'https://x.invalid',apiKeyEnv:'X_KEY'};},
  c=>{c.pipeline.researcher=['strong','strong'];},
  c=>{c.models.fast.baseUrl='https://user:secret@fast.invalid';},
 ]){const config=definition();mutate(config);assert.throws(()=>validateModelConfig(config));}
});

test('v2 rejects duplicate legacy model definitions while allowing referenced key values',()=>fixture(({env})=>{
 assert.doesNotThrow(()=>modelConfig(env));
 assert.throws(()=>modelConfig({...env,LLM_MODEL:'duplicate'}),error=>error.category==='configuration'&&error.configurationField==='LLM_MODEL');
}));
