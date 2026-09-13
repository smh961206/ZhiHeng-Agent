import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runAgent} from '../server/agent.mjs';
import {createFlagshipJobState} from '../server/model-rollout.mjs';
import {testFlagshipEnv,testAcceptance} from './fixtures/flagship-acceptance.mjs';
import {reviewFixture} from './fixtures/research-review.mjs';
test('V5.2.9 actual Agent escalates repeated structural review failure once and preserves original research',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'zh-review-')),oldEnv={...process.env},oldFetch=global.fetch;
 try{
  Object.assign(process.env,testFlagshipEnv());process.env.FLAGSHIP_REVIEW_ACCEPTANCE_FILE=path.join(dir,'review.json');
  fs.writeFileSync(process.env.FLAGSHIP_REVIEW_ACCEPTANCE_FILE,JSON.stringify(testAcceptance(process.env,'critical-review')));
  const input={mode:'B',question:'Synthetic independent review',depth:'Deep',sources:[{id:'S1',title:'Synthetic',text:'Synthetic independent review evidence.',publishedAt:'2026-09-01T00:00:00Z'}]};
  const job={id:'agent-test',mode:'B',createdAt:'2026-09-08T00:00:00Z',input};job.flagshipState=createFlagshipJobState(job);const saved=[];let normal=0,critical=0;
  global.fetch=async(url,options)=>{
   const body=JSON.parse(options.body);let content;
   if(String(url).includes('review.invalid')){critical++;assert.deepEqual(body.messages.map(m=>m.role),['system','user']);assert.ok(!body.messages.some(m=>m.reasoning_content));assert.equal(JSON.parse(body.messages[1].content).cutoff,job.createdAt);const r=reviewFixture(input);r.decision.missingData=[];for(const g of r.decision.gates)if(['data','quality'].includes(g.id))g.status='passed';content=JSON.stringify(r);}
   else{normal++;if(normal===1)content='Synthetic independent review draft [S1]';else{const r=reviewFixture(input);r.decision.missingData=[];for(const g of r.decision.gates)if(['data','quality'].includes(g.id))g.status='passed';r.decision.action='invalid';content=JSON.stringify(r);}}
   return Response.json({choices:[{message:{role:'assistant',content,reasoning_content:'PRIVATE'},finish_reason:'stop'}]});
  };
  const result=await runAgent(job,()=>{},new AbortController().signal,{onModelCheckpoint:async()=>saved.push(JSON.parse(JSON.stringify(job)))});
  assert.ok(result.report);assert.equal(normal,3);assert.equal(critical,1);assert.equal(job.flagshipState.sessions.review.status,'completed');assert.equal(job.createdAt,'2026-09-08T00:00:00Z');assert.ok(result.validation.initialEvidenceWindow);assert.ok(!JSON.stringify(job.flagshipState).includes('PRIVATE'));assert.ok(saved.some(j=>j.flagshipState.sessions.review?.status==='reserved'));
  const interrupted=structuredClone(job);interrupted.flagshipState.sessions.review.status='reserved';await assert.rejects(runAgent(interrupted,()=>{},new AbortController().signal),{code:'flagship_state_incompatible'});assert.equal(critical,1);
 }finally{global.fetch=oldFetch;for(const key of Object.keys(process.env))if(!(key in oldEnv))delete process.env[key];Object.assign(process.env,oldEnv);fs.rmSync(dir,{recursive:true,force:true});}
});
