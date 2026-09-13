// Synthetic attestations for gate tests only. Never production quality evidence.
import fs from 'node:fs';
import {objectHash} from '../../benchmark/fixtures.mjs';
import {buildJudgeInput} from '../../server/model-judge.mjs';
import {flagshipRolloutFingerprint} from '../../server/model-rollout.mjs';
import {reviewFixture} from './research-review.mjs';
const caps=JSON.stringify({textInput:true,imageInput:false,streaming:false,toolCalling:false,jsonObject:true,jsonSchema:true,reasoningControl:false});
export const testFlagshipEnv=()=>({FEATURE_JUDGE:'true',FEATURE_FLAGSHIP_REVIEW:'true',LLM_FLAGSHIP_REVIEW_MODEL:'test-review',LLM_FLAGSHIP_REVIEW_BASE_URL:'https://review.invalid/v1',LLM_FLAGSHIP_REVIEW_API_KEY:'test-only',LLM_FLAGSHIP_REVIEW_CAPABILITIES:caps,LLM_FLAGSHIP_JUDGE_MODEL:'test-judge',LLM_FLAGSHIP_JUDGE_BASE_URL:'https://judge.invalid/v1',LLM_FLAGSHIP_JUDGE_API_KEY:'test-only',LLM_FLAGSHIP_JUDGE_CAPABILITIES:caps});
export const judgeFixture=()=>JSON.parse(fs.readFileSync(new URL('./judge-v52.json',import.meta.url))).cases[0];
export const judgeAnswer=p=>({version:1,inputHash:p.inputHash,outcome:'accept_l1',selectedId:p.l1.id,reasonCode:'evidence_consistency',citations:p.evidence.map(e=>({sourceId:e.id,blockId:e.blockId,quote:e.text})),reviewedToolCallIds:p.tools.map(t=>t.toolCallId)});
export function testAcceptance(env,purpose='judge'){
 const cases=Array.from({length:20},(_,n)=>{
  const fixture=judgeFixture();fixture.id='fixture-'+n;fixture.input.l1.statement+=' test '+n;
  if(purpose==='critical-review')fixture.input={mode:'B',question:'Synthetic review '+n,depth:'Deep',sources:[{id:'S1',title:'Synthetic',text:'Synthetic evidence.'}]};
  const candidate=purpose==='judge'?judgeAnswer(buildJudgeInput(fixture.input)):reviewFixture(fixture.input);
  const baseline=purpose==='judge'?{...candidate,outcome:'insufficient_to_decide',selectedId:null,reasonCode:'insufficient_evidence'}:{...candidate,decision:{...candidate.decision,action:'invalid'}};
  const sample=(arm,output)=>{const calls=[{id:purpose+'-'+n+'-'+arm,jobId:'test-'+n,purpose,profile:arm==='candidate'?(purpose==='judge'?'flagship-judge':'flagship-review'):'legacy-analysis',status:'succeeded',transportAttempts:1,finishedAt:'2026-09-02T00:00:00Z',billing:{currency:'USD',estimatedCost:arm==='candidate'?.2:.1}}];const s={output,calls,criticalErrors:0,correct:arm==='candidate'};return {...s,reviewHash:objectHash({fixture,...s})};};
  return {id:'case-'+n,fixture,baseline:sample('baseline',baseline),candidate:sample('candidate',candidate)};
 });
 const evidence={version:1,kind:'flagship-live-acceptance',purpose,evidenceKind:'live-model',fingerprint:flagshipRolloutFingerprint(env),cases,extraCostLimit:{currency:'USD',amount:10},routineObservation:{jobs:100,flagshipJobs:3}};
 return {...evidence,review:{approvedBy:'SYNTHETIC TEST ONLY',approvedAt:'2026-09-03T00:00:00Z',evidenceHash:objectHash(evidence),dryRunAccepted:true,rollbackVerified:true,costJustified:true}};
}
