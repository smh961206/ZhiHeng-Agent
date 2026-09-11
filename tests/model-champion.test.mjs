import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {taskChampion,validateChampionPolicy,createChampionPolicy,championCodeFiles} from '../server/model-champion.mjs';
import {saveChampionRegistry} from '../benchmark/champions.mjs';
import {objectHash} from '../benchmark/fixtures.mjs';
import {championTestEnv,championTestPolicy} from './fixtures/champion.mjs';
test('V5.0.10 immutable registry selects only measured tasks and preserves default/old versions',async t=>{
 const env=championTestEnv(),policy=championTestPolicy(env),root=fs.mkdtempSync(path.join(os.tmpdir(),'zh-champion-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const file=path.join(root,'registry.json'),r={version:1,activePolicyId:policy.id,policies:[policy]};await saveChampionRegistry(file,r,env);
 assert.equal(taskChampion(r,'financial_analysis',env).id,policy.id);assert.equal(taskChampion(r,'review',env),null);assert.equal(taskChampion({...r,activePolicyId:null},'financial_analysis',env),null);
 await assert.rejects(saveChampionRegistry(file,{version:1,activePolicyId:null,policies:[]},env),/overwritten/);
});
test('V5.0.10 an old approval cannot be transplanted onto a new model, effort or rollout percentage',()=>{
 const env=championTestEnv(),old=championTestPolicy(env);
 for(const change of [{reasoningEffort:'max'},{stage:'production',percent:100},{id:'new-policy'}])assert.throws(()=>createChampionPolicy({...old,...change},env),/intent binding|execution settings/);
 assert.throws(()=>createChampionPolicy(old,{...env,LLM_MAIN_CHALLENGER_MODEL:'untested-model'}),/execution identity/);
 assert.throws(()=>createChampionPolicy(old,{...env,LLM_MAIN_CHALLENGER_BASE_URL:'https://untested.invalid'}),/execution identity/);
});
test('V5.0.10 simulation, cheap failures, changed environment and absent human review fail closed',()=>{
 const env=championTestEnv(),original=championTestPolicy(env);
 for(const mutate of [p=>p.evidence.samples[0].evidenceKind='simulation',p=>p.review.pipelineReviewPassed=false,p=>p.review.approvedBy='',p=>p.taskClasses.push('review'),p=>p.percent=100]){const p=structuredClone(original);mutate(p);const {hash,...body}=p;p.hash=objectHash(body);assert.throws(()=>validateChampionPolicy(p,env),/Benchmark/);}
 assert.throws(()=>validateChampionPolicy(original,{...env,LLM_MAIN_CHALLENGER_BASE_URL:'https://changed.invalid'}),/changed/);
 assert.doesNotThrow(()=>validateChampionPolicy(original,{...env,LLM_MAIN_CHALLENGER_API_KEY:'rotated'}));
});
test('V5.0 approval binds effective review/time limits and all research/grading/knowledge owners',()=>{
 const env=championTestEnv(),policy=championTestPolicy(env);
 for(const changed of [{LLM_REVIEW_FORMAT:'text'},{LLM_TIMEOUT_MS:'60000'},{LLM_MAX_DURATION_MS:'60000'}]){
  assert.throws(()=>validateChampionPolicy(policy,{...env,...changed}),/execution settings changed/);
  assert.throws(()=>createChampionPolicy(policy,{...env,...changed}),/execution settings changed/);
 }
 const owners=championCodeFiles();
 for(const file of ['server/agent.mjs','server/review-format.mjs','server/research-output.mjs','server/model-request.mjs','shared/research-framework.mjs','benchmark/graders.mjs','knowledge/ENTRY.md'])assert.ok(owners.includes(file),file);
});
