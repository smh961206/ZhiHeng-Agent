import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {validateFlagshipRollout,flagshipRolloutStatus,createFlagshipJobState} from '../server/model-rollout.mjs';
import {createModelGateway} from '../server/model-gateway.mjs';
import {withJobModelState} from '../server/model-state.mjs';
import {runFlagshipCall} from '../server/model-flagship.mjs';
import {buildJudgeInput,validateJudgeOutput,judgeOutputSchema} from '../server/model-judge.mjs';
import {testFlagshipEnv,testAcceptance,judgeFixture,judgeAnswer} from './fixtures/flagship-acceptance.mjs';
test('V5.2.9 raw regraded artifacts, correct profile/cost, code binding and human acceptance precede rare rollout',()=>{
 const env=testFlagshipEnv(),report=testAcceptance(env);
 assert.equal(validateFlagshipRollout(report,env).accepted,true);
 for(const change of [{evidenceKind:'simulation'},{fingerprint:'wrong'},{review:null},{cases:report.cases.slice(1)},{routineObservation:{jobs:100,flagshipJobs:10}}])assert.equal(validateFlagshipRollout({...report,...change},env).accepted,false);
 assert.equal(flagshipRolloutStatus('judge',{}).accepted,false);
 assert.equal(flagshipRolloutStatus('judge',env).accepted,false);
 assert.equal(validateFlagshipRollout(testAcceptance(env,'critical-review'),env).accepted,true);
});
test('V5.2.9 actual Gateway dispatch is isolated, single-attempt, pinned and kill-switch aware',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'zh-flagship-')),env=testFlagshipEnv();env.JUDGE_ACCEPTANCE_FILE=path.join(dir,'approval.json');
 try{
  fs.writeFileSync(env.JUDGE_ACCEPTANCE_FILE,JSON.stringify(testAcceptance(env)));
  const job={createdAt:'2026-09-02T00:00:00Z',mode:'B'};job.flagshipState=createFlagshipJobState(job,env);const p=buildJudgeInput(judgeFixture().input);let calls=0;const receipts=[];
  const gateway=createModelGateway({env,onModelCall:c=>receipts.push(c),fetchImpl:async(url,options)=>{calls++;assert.match(String(url),/judge.invalid/);const body=JSON.parse(options.body);assert.deepEqual(body.messages.map(m=>m.role),['system','user']);assert.ok(!body.tools);return Response.json({choices:[{message:{role:'assistant',content:JSON.stringify(judgeAnswer(p)),reasoning_content:'PRIVATE'},finish_reason:'stop'}]});}});
  const opts={job,purpose:'judge',packet:p,eligibility:{eligible:true,reason:'material_l1_l2_conflict'},validate:raw=>validateJudgeOutput(raw,p),persist:async()=>{},system:'test',responseFormat:{type:'json_schema',json_schema:{name:'judge',strict:true,schema:judgeOutputSchema}},env,gateway};
  await withJobModelState(job,()=>runFlagshipCall(opts));await withJobModelState(job,()=>runFlagshipCall(opts));assert.equal(calls,1);assert.ok(!JSON.stringify(job).includes('PRIVATE'));assert.equal(receipts.at(-1).purpose,'judge');assert.equal(receipts.at(-1).flagship.conflictType,'opposing_core_claim');
  await assert.rejects(gateway.complete({purpose:'judge',messages:[{role:'user',content:'bypass'}],routingContext:{profileId:'flagship-judge'}}));
  const original=job.createdAt;job.createdAt='2026-09-03T00:00:00Z';await assert.rejects(withJobModelState(job,()=>runFlagshipCall(opts)),{code:'flagship_state_incompatible'});job.createdAt=original;
  env.FEATURE_JUDGE='false';assert.equal(await withJobModelState(job,()=>runFlagshipCall(opts)),null);assert.equal(calls,1);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
