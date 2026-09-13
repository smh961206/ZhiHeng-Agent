import test from 'node:test';
import assert from 'node:assert/strict';
import {rankModelCosts} from '../server/model-champion.mjs';
import {championTestEnv,championTestPolicy} from './fixtures/champion.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {validateChampionPolicy} from '../server/model-champion.mjs';
test('cost ranking reuses quality approval before health/cost and never dispatches',()=>{
 const env=championTestEnv(),policy=championTestPolicy(env),profile=policy.configuration[1].profile;
 const candidate={profile,policy,tasks:[{jobId:'a',profileId:profile.id,taskClass:'financial_analysis',delivered:true,validationPassed:true,criticalErrors:0,toolRounds:1,modelCalls:[{id:'a',jobId:'a',profile:profile.id,purpose:'research',status:'succeeded',errorCategory:null,transportAttempts:1,billing:{currency:'USD',estimatedCost:2}}]}]};
 const options={candidates:[candidate],request:{purpose:'research',stream:true,reasoningEffort:policy.reasoningEffort??undefined,messages:[{role:'system',content:'rules'},{role:'user',content:'question'}]},taskClass:'financial_analysis',env,health:{cooling:()=>false}};
 const ranked=rankModelCosts(options);assert.equal(ranked.rankings.length,1);assert.equal(ranked.rankings[0].candidates[0].effectiveTaskCost,2);assert.equal(ranked.changesProduction,false);
 assert.equal(rankModelCosts({...options,candidates:[{...candidate,policy:null}]}).rankings.length,0);
 assert.equal(rankModelCosts({...options,health:{cooling:()=>true}}).rankings.length,0);
 assert.equal(rankModelCosts({...options,candidates:[{...candidate,profile:{...profile,capabilities:{textInput:false}}}]}).rejected[0].reasons[0],'capability_required');
 assert.equal(rankModelCosts({...options,candidates:[{...candidate,tasks:[]}]}).rankings.length,0);
 assert.equal(rankModelCosts({...options,candidates:[{...candidate,tasks:candidate.tasks.map(t=>({...t,profileId:'other'}))}]}).rankings.length,0);
 assert.equal(rankModelCosts({...options,env:{...env,FEATURE_COST_ROUTER:'true'}}).mode,'disabled');
});
test('budget settings are bound to the existing quality approval and cannot change silently',t=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'zh-cost-policy-'));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 const file=path.join(directory,'budget.json'),limits={version:1,maxModelCost:null,maxToolRounds:32,maxWebRequests:14,maxVisionPages:6,maxDurationMs:1800000};fs.writeFileSync(file,JSON.stringify(limits));
 const env={...championTestEnv(),RESEARCH_BUDGET_FILE:file},policy=championTestPolicy(env);
 assert.doesNotThrow(()=>validateChampionPolicy(policy,env));
 assert.throws(()=>validateChampionPolicy(policy,{...env,FEATURE_RESEARCH_BUDGET:'true'}),/settings changed/);
 fs.writeFileSync(file,JSON.stringify({...limits,maxToolRounds:2}));assert.throws(()=>validateChampionPolicy(policy,env),/settings changed/);
});
