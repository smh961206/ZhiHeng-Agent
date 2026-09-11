import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {previewModelConfig,verifyModelConfig,writeModelConfig,parseConfigArguments} from '../scripts/model-config.mjs';
import {modelConfig,modelEnvironment,parseModelConfigJSON} from '../server/model-config.mjs';
import {modelRouting} from '../server/model-routing.mjs';
import {modelConfigurationStatus} from '../server/model-rollout.mjs';
import {createLegacyModelCatalog} from '../server/model-catalog.mjs';
import {createJobModelState,createPolicyJobModelState} from '../server/model-state.mjs';
import {resolveModelConnection} from '../server/model-connection.mjs';
import {createModelGateway} from '../server/model-gateway.mjs';
import {championTestEnv,championTestPolicy} from './fixtures/champion.mjs';
import {createConfiguredJobModelState,assertModelRollout} from '../server/model-rollout.mjs';
const env={LLM_MODEL:'baseline',LLM_BASE_URL:'https://baseline.invalid',LLM_API_KEY:'secret-base',LLM_MAIN_API_KEY:'secret-main',MODEL_ROUTING_MODE:'legacy',LLM_VISION_INPUT:'images'};
function fixture(run){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'model-config-'));try{return run(dir);}finally{fs.rmSync(dir,{recursive:true,force:true});}}
function fileAt(dir,value=previewModelConfig(env)){const file=path.join(dir,'models.json');fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value));return file;}
function fileOnly(file,source=env){return {MODEL_CONFIG_FILE:file,LLM_API_KEY:source.LLM_API_KEY,LLM_MAIN_API_KEY:source.LLM_MAIN_API_KEY,MODEL_ROUTING_MODE:source.MODEL_ROUTING_MODE};}

test('Migration preview preserves different roles and all legacy connection and pin semantics',()=>fixture(dir=>{
 const config=previewModelConfig(env),file=fileAt(dir,config);
 assert.equal(config.connections.pro,undefined,'PRO shares baseline connection only when the same secret reference is inherited');
 assert.notEqual(config.roles.defaultResearch,config.roles.policyMain);
 assert.doesNotMatch(JSON.stringify(config),/secret-base|secret-main/);
 assert.deepEqual(verifyModelConfig(file,env),{equivalent:true,profiles:5,connectionValuesEqual:true,legacyAndPolicyPinsEqual:true,paidCalls:0});
 const next=fileOnly(file);
 assert.deepEqual(createJobModelState(next),createJobModelState(env));
 assert.deepEqual(createPolicyJobModelState(next),createPolicyJobModelState(env));
 assert.equal(modelConfigurationStatus(next).configured,true);
}));

test('Independent key references remain separate even when values currently match',()=>{
 const source={...env,LLM_PRO_API_KEY:env.LLM_API_KEY};const c=previewModelConfig(source);
 assert.notEqual(c.profiles[c.roles.defaultResearch].connectionRef,c.profiles[c.roles.policyPro].connectionRef);
});

test('File mode preserves approved v3 selection and keeps rollback closed without rewriting pins',()=>fixture(dir=>{
 const original={...championTestEnv(),MODEL_ROUTING_MODE:'champion',MODEL_CHAMPION_ENABLED:'true',MODEL_AB_ENABLED:'true',MODEL_CHAMPION_REGISTRY_FILE:path.join(dir,'registry.json'),MODEL_CHAMPION_POLICY_VERSION:'test-policy-1'};
 const policy=championTestPolicy(original);fs.writeFileSync(original.MODEL_CHAMPION_REGISTRY_FILE,JSON.stringify({version:1,activePolicyId:policy.id,policies:[policy]}));
 const next={...original,MODEL_CONFIG_FILE:fileAt(dir,previewModelConfig(original))},job={id:'config-pin',mode:'B',createdAt:'2026-09-03T00:00:00Z'};
 const state=createConfiguredJobModelState(original,{},job);assert.equal(state.version,3);
 assert.deepEqual(createConfiguredJobModelState(next,{},job),state);
 assert.doesNotThrow(()=>assertModelRollout({...job,modelState:state},next));
 assert.throws(()=>assertModelRollout({...job,modelState:state},{...next,MODEL_CHAMPION_ENABLED:'false'}));
 assert.deepEqual(createConfiguredJobModelState(next,{},job),state);
}));

test('Explicit bad source is closed, sanitized, and never falls back to legacy',()=>fixture(dir=>{
 const bad={...env,MODEL_CONFIG_FILE:path.join(dir,'missing.json')};
 assert.throws(()=>modelRouting(bad),e=>e.category==='configuration'&&!/secret|missing.json/.test(e.message));
 assert.deepEqual(modelConfigurationStatus(bad),{configured:false,model:null,configurationError:true});
 fileAt(dir);assert.throws(()=>modelConfig(bad));
}));

test('Duplicate escaped keys, unknown fields and incomplete references are rejected',()=>fixture(dir=>{
 assert.throws(()=>parseModelConfigJSON('{"a":1,"\\u0061":2}'));
 assert.throws(()=>parseModelConfigJSON('{"__proto__":{}}'));
 const c=structuredClone(previewModelConfig(env));c.extra=true;
 assert.throws(()=>modelConfig({...env,MODEL_CONFIG_FILE:fileAt(dir,c)}));
}));

test('Conflicting old model definition closes file mode; equal definitions coexist',()=>fixture(dir=>{
 const file=fileAt(dir);assert.equal(modelRouting({...env,MODEL_CONFIG_FILE:file}).analysisModel,'baseline');
 assert.throws(()=>modelRouting({...env,LLM_MODEL:'different',MODEL_CONFIG_FILE:file}));
}));

test('File content stays frozen until restart, while key rotation preserves connection identity',()=>fixture(dir=>{
 const file=fileAt(dir),next=fileOnly(file),before=createJobModelState(next);
 fs.writeFileSync(file,'invalid');assert.deepEqual(createJobModelState({...next,LLM_API_KEY:'rotated'}),before);
 assert.equal(resolveModelConnection(createLegacyModelCatalog(next).profiles[0],{...next,LLM_API_KEY:'rotated'}).key,'rotated');
}));

test('No cross-role secret inheritance occurs in file mode and missing needed key disables readiness',()=>fixture(dir=>{
 const c=structuredClone(previewModelConfig(env));c.connections['legacy-analysis'].apiKeyEnv='INDEPENDENT_API_KEY';
 const file=fileAt(dir,c),next={...fileOnly(file),INDEPENDENT_API_KEY:'separate'};
 const effective=modelEnvironment(next);
 assert.equal(modelRouting(effective).analysisKey,'separate');
 assert.equal(resolveModelConnection(createLegacyModelCatalog(effective).profiles[0],effective).key,'separate');
 assert.equal(modelConfigurationStatus(fileOnly(file)).configured,false);
}));

test('Schema rejects secrets in URLs and undeclared image metadata rather than guessing',()=>fixture(dir=>{
 const c=structuredClone(previewModelConfig(env));c.connections['legacy-analysis'].baseUrl='https://user:secret@provider.invalid';
 assert.throws(()=>modelConfig({...env,MODEL_CONFIG_FILE:fileAt(dir,c)}),e=>!e.message.includes('secret'));
}));

test('Preview writer refuses overwrite and workspace escape; CLI intent rejects ambiguous flags',()=>fixture(dir=>{
 const c=previewModelConfig(env);writeModelConfig('config/models.json',c,dir);
 assert.throws(()=>writeModelConfig('config/models.json',c,dir));
 assert.throws(()=>writeModelConfig('../outside.json',c,dir));
 for(const args of [[],['--preview','--check','x'],['--out','x'],['--preview','--preview'],['--check'],['--unknown']])assert.throws(()=>parseConfigArguments(args));
 assert.deepEqual(parseConfigArguments(['--preview','--out','config/models.json']),{'--preview':true,'--out':'config/models.json'});
}));

test('File-mode Gateway produces identical requests and blocks invalid configuration before transport',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'model-config-wire-'));try{
  const file=fileAt(dir),bodies=[];
  const fetchImpl=async(_url,options)=>{bodies.push(JSON.parse(options.body));return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{role:'assistant',content:'ok'}}]}),{headers:{'content-type':'application/json'}});};
  const request={purpose:'research',messages:[{role:'user',content:'synthetic'}],stream:false};
  for(const e of [env,fileOnly(file)])await createModelGateway({env:e,fetchImpl}).complete(request);
  assert.deepEqual(bodies[0],bodies[1]);
  await assert.rejects(createModelGateway({env:{...env,MODEL_CONFIG_FILE:path.join(dir,'missing')},fetchImpl}).complete(request),e=>e.category==='configuration');
  assert.equal(bodies.length,2);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('File-only preview and check preserve selected custom definitions',()=>fixture(dir=>{
 const config=previewModelConfig(env),file=fileAt(dir,config),source=fileOnly(file);
 assert.deepEqual(previewModelConfig(source),config);
 const copy=path.join(dir,'copy.json');writeModelConfig(copy,previewModelConfig(source),dir);
 assert.equal(verifyModelConfig(copy,source).equivalent,true);
 const other=structuredClone(config);other.profiles[other.roles.defaultResearch].model='different';
 const changed=path.join(dir,'changed.json');fs.writeFileSync(changed,JSON.stringify(other));
 assert.throws(()=>verifyModelConfig(changed,source));
}));
