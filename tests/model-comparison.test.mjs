import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {validatePlan,validateLimits,reserveAttempt,budgetedTransport,runComparison,readJSON,writeJSON,digest,exportAcceptance,comparisonEnv,executionFingerprint,evidenceSummary,frozenMarketData} from '../scripts/model-comparison.mjs';
import {validateModelRollout,modelRolloutStatus,modelRolloutFingerprint} from '../server/model-rollout.mjs';

const plan=readJSON(new URL('./fixtures/model-comparison-offline.json',import.meta.url));
const limits={currency:'CNY',maxRequests:120,budgetMinor:120,reservePerRequestMinor:1,timeoutMs:20000};
const temporary=()=>fs.mkdtempSync(path.join(os.tmpdir(),'zhiheng-comparison-'));
test('comparison validates unique cases, aligned modes, publication cutoff and text provenance',()=>{
 assert.equal(validatePlan(plan),plan);
 for(const mutate of [p=>p.cases.push(p.cases[0]),p=>p.cases[0].id='../escape',p=>p.cases[0].input.mode='F',p=>p.cutoff='2026-02-30',p=>p.cases[0].input.sources[0].publishedAt='2027-01-01',p=>p.cases[0].input.sources[0].publishedAt=null,p=>p.cases[0].input.sources[0].url='',p=>p.cases[0].input.referenceMaterials=[{}],p=>p.cases[0].input.sources[0].visualReading={}]){
  const bad=structuredClone(plan);mutate(bad);assert.throws(()=>validatePlan(bad));
 }
 assert.throws(()=>validatePlan(plan,{live:true}),/Synthetic/);
});
test('numeric case ids cannot alias string ids or overwrite the same arm files',()=>{
 const invalid=structuredClone(plan);invalid.cases[0].id=1;invalid.cases[1].id='1';
 assert.throws(()=>validatePlan(invalid),/case id/);
 const invalidSource=structuredClone(plan);invalidSource.cases[0].input.sources[0].id={toString:()=> 'S1'};
 assert.throws(()=>validatePlan(invalidSource),/Source ids/);
 for(const id of ['OFFLINE-A','offline-A\n']){const collision=structuredClone(plan);collision.cases[1].id=id;assert.throws(()=>validatePlan(collision),/case id/);}
});
test('budget reserves every attempt and refuses unknown, invalid and exhausted limits',()=>{
 for(const value of [0,-1,NaN,Infinity,1.5,null,'100'])assert.throws(()=>validateLimits({...limits,budgetMinor:value}));
 const state={limits:{...limits,maxRequests:2},ledger:[]};
 reserveAttempt(state,'a');reserveAttempt(state,'a');assert.throws(()=>reserveAttempt(state,'b'),/Request limit/);
 assert.equal(state.ledger.length,2);assert.equal(state.ledger[0].status,'reserved');
 assert.throws(()=>reserveAttempt({limits:{...limits,budgetMinor:1},ledger:[state.ledger[0]]},'a'),/budget/);
});
test('live invocation requires explicit paid authorization before creating any output',async()=>{
 const directory=temporary();
 try{await assert.rejects(runComparison({plan:{...plan,material:'curated'},directory,limits,offline:false}),/allow-paid/);assert.deepEqual(fs.readdirSync(directory),[]);}
 finally{fs.rmSync(directory,{recursive:true,force:true});}
});
test('CLI check and help are read-only; typo options cannot start a paid run',()=>{
 for(const args of [['help'],['run','--pay-now']]){
  const result=spawnSync(process.execPath,['scripts/model-comparison.mjs',...args],{encoding:'utf8'});
  assert.equal(result.status,args[0]==='help'?0:1);
 }
 const worker=spawnSync(process.execPath,['scripts/model-comparison-worker.mjs'],{encoding:'utf8'});assert.equal(worker.status,1);
});
test('full Agent/Gateway six-mode offline comparison, private checkpoints, real validators and idempotent resume',{timeout:120000},async()=>{
 const directory=temporary(),before=process.env.MODEL_ROUTING_MODE;
 try{
  const summary=await runComparison({plan,directory,limits});
  assert.equal(summary.cases.length,6);assert.equal(summary.kind,'offline-executor-validation');assert.equal(summary.qualityAcceptance,false);
  assert.equal(summary.budget.actualCost,null);assert.ok(summary.budget.attempts>=36);
  for(const c of summary.cases)for(const arm of ['baseline','candidate']){
   assert.equal(c[arm].status,'completed');assert.equal(c[arm].citationPassed,null);assert.equal(c[arm].criticalFactErrors,null);
   const output=readJSON(path.join(directory,c[arm].artifact));
   assert.equal(output.inputHash,readJSON(path.join(directory,c[arm==='baseline'?'candidate':'baseline'].artifact)).inputHash);
   assert.equal(output.usage.usage.totalTokens.unknownCalls,0);
   assert.doesNotMatch(JSON.stringify(output),/PRIVATE-OFFLINE-REASONING|synthetic-comparison|Bearer/);
   assert.equal(output.modelState.version,arm==='candidate'?2:1);
   assert.equal(output.toolRecords.filter(t=>t.toolCallId==='comparison-read-rules').length,1);
  }
  assert.equal(summary.cases[0].mode,'A');
  assert.equal(readJSON(path.join(directory,summary.cases[0].candidate.artifact)).modelState.active.profileId,'main');
  assert.equal(readJSON(path.join(directory,summary.cases[1].candidate.artifact)).modelState.active.profileId,'pro');
  assert.equal(validateModelRollout(summary).accepted,false);assert.throws(()=>exportAcceptance(directory,{}),/Offline/);
  assert.deepEqual(await runComparison({plan,directory,limits,resume:true}),summary);
  await assert.rejects(runComparison({plan,directory,limits:{...limits,maxRequests:121},resume:true}),/changed/);
  const changed=structuredClone(plan);changed.cases[0].input.sources[0].text+='changed';
  await assert.rejects(runComparison({plan:changed,directory,limits,resume:true}),/changed/);
  assert.equal(process.env.MODEL_ROUTING_MODE,before);assert.equal(modelRolloutStatus({MODEL_ROUTING_MODE:'legacy'}).active,'legacy');
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
test('budget stop preserves attempted spend/checkpoint and never silently retries failed arms',{timeout:30000},async()=>{
 const directory=temporary(),one={...plan,cases:plan.cases.slice(0,1)},tight={...limits,maxRequests:1};
 try{
  await assert.rejects(runComparison({plan:one,directory,limits:tight}),/stopped/);
  let state=readJSON(path.join(directory,'run.json'));assert.equal(state.ledger.length,1);assert.equal(state.units['offline-A--baseline'].reason,'budget_or_ledger_failure');
  const checkpoint=readJSON(path.join(directory,'private/offline-A--baseline.json'));
  assert.equal(checkpoint.job.checkpoint.toolRecords.length,1);
  await assert.rejects(runComparison({plan:one,directory,limits:tight,resume:true}),/explicit/);
  await assert.rejects(runComparison({plan:one,directory,limits:tight,resume:true,retryIncomplete:true}),/stopped/);
  state=readJSON(path.join(directory,'run.json'));assert.equal(state.ledger.length,1);
  assert.equal(readJSON(path.join(directory,'private/offline-A--baseline.json')).job.checkpoint.toolRecords.length,1);
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
test('lock excludes concurrent runs and an existing directory cannot be silently overwritten',async()=>{
 const directory=temporary();
 try{
  fs.writeFileSync(path.join(directory,'.lock'),'owned');await assert.rejects(runComparison({plan,directory,limits}),/EEXIST/);assert.equal(fs.readFileSync(path.join(directory,'.lock'),'utf8'),'owned');
  fs.unlinkSync(path.join(directory,'.lock'));fs.writeFileSync(path.join(directory,'keep'),'data');await assert.rejects(runComparison({plan,directory,limits}),/empty/);
  assert.equal(fs.readFileSync(path.join(directory,'keep'),'utf8'),'data');
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});

test('resume binds run, arm, mode and frozen input before requests while preserving compatible history',{timeout:30000},async()=>{
 const directory=temporary(),one=structuredClone({...plan,cases:plan.cases.slice(0,1)});
 one.cases[0].input.securities=[{market:'CN',symbol:'600519',name:'合成测试标的'}];
 one.cases[0].input.sources[0]={...one.cases[0].input.sources[0],security:'CN:600519',type:'official-report',official:true};
 try{
  await runComparison({plan:one,directory,limits});
  const stateFile=path.join(directory,'run.json'),state=readJSON(stateFile),unit='offline-A--baseline';
  const checkpointFile=path.join(directory,'private',unit+'.json'),saved=readJSON(checkpointFile);
  state.units[unit].status='incomplete';writeJSON(stateFile,state);
  for(const mutate of [job=>job.id='another-run-'+unit,job=>job.id=state.id+'-offline-A--candidate',job=>job.mode='B',job=>job.input.question+='different case',job=>job.input.sources[0].text+='different material']){
   const wrong=structuredClone(saved);mutate(wrong.job);writeJSON(checkpointFile,wrong);
   await assert.rejects(runComparison({plan:one,directory,limits,resume:true,retryIncomplete:true}),/stopped/);
   const stopped=readJSON(stateFile);
   assert.equal(stopped.units[unit].reason,'checkpoint_input_mismatch');
   assert.equal(stopped.ledger.length,state.ledger.length);
  }
  writeJSON(checkpointFile,saved);
  const resumed=await runComparison({plan:one,directory,limits,resume:true,retryIncomplete:true});
  assert.equal(resumed.cases[0].baseline.status,'completed');
  const output=readJSON(path.join(directory,resumed.cases[0].baseline.artifact));
  assert.equal(output.toolRecords.filter(t=>t.toolCallId==='comparison-read-rules').length,1);
  assert.deepEqual(readJSON(checkpointFile).job.marketData,saved.job.marketData);
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});

test('frozen coverage preserves report versus US core-fact semantics and counts distinct filings',()=>{
 const security='US:TEST',base={security,official:true,url:'https://fixture.invalid/report',text:'synthetic source'};
 const input={securities:[{market:'US',symbol:'TEST'},{market:'CN',symbol:'MISSING'}],sources:[
  {...base,type:'quote'}, {...base,type:'filing-index'},
  {...base,type:'official-report',purpose:'shareholder-action',url:base.url+'/action'},
  {...base,type:'official-report'}, {...base,type:'official-report'},
  {...base,type:'official-report',official:false,url:base.url+'/unofficial'},
  {...base,type:'official-xbrl',factsCount:1,financialFacts:[{tag:'SyntheticOnly',value:1}],filingUrl:base.url},
  {...base,type:'official-xbrl',factsCount:0,financialFacts:[],filingUrl:base.url+'/empty'},
  {...base,type:'official-xbrl',factsCount:1,financialFacts:[],filingUrl:base.url+'/missing'},
 ]};
 const before=structuredClone(input),result=frozenMarketData(input,plan.cutoff);
 assert.deepEqual(result.coverage,[{security,read:1,fullTextRead:1,coreFactsRead:1},{security:'CN:MISSING',read:0,fullTextRead:0,coreFactsRead:0}]);
 assert.deepEqual(result.sources,input.sources);assert.notEqual(result.sources,input.sources);assert.deepEqual(input,before);
 const xbrlOnly=frozenMarketData({...input,sources:[input.sources[6]]},plan.cutoff);
 assert.deepEqual(xbrlOnly.coverage[0],{security,read:1,fullTextRead:0,coreFactsRead:1});
});

test('frozen quote and filing directory cannot satisfy the Agent official report gate',{timeout:30000},async()=>{
 const directory=temporary(),one=structuredClone({...plan,cases:plan.cases.slice(0,1)});
 one.cases[0].input.securities=[{market:'CN',symbol:'600519',name:'合成测试标的'}];
 one.cases[0].input.sources[0]={...one.cases[0].input.sources[0],security:'CN:600519',type:'quote',official:false};
 one.cases[0].input.sources.push({...one.cases[0].input.sources[0],id:'S2',type:'filing-index',official:true});
 try{
  await assert.rejects(runComparison({plan:one,directory,limits}),/stopped/);
  const state=readJSON(path.join(directory,'run.json'));
  assert.equal(state.units['offline-A--baseline'].reason,'research_or_validation_failed');
  assert.equal(state.ledger.length,0);
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
test('a run crossing UTC midnight stops before another arm instead of comparing different prompt dates',async()=>{
 const directory=temporary(),OriginalDate=globalThis.Date,now=OriginalDate.now();let reads=0;
 try{
  // First timestamp is the lock; second is the run's pinned execution date.
  globalThis.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:[now+(reads++>=2?86400000:0)]));}};
  await assert.rejects(runComparison({plan,directory,limits}),/execution date changed/);
  const state=readJSON(path.join(directory,'run.json'));assert.equal(state.ledger.length,0);assert.ok(Object.values(state.units).every(u=>u.status==='pending'));
 }finally{globalThis.Date=OriginalDate;fs.rmSync(directory,{recursive:true,force:true});}
});
test('execution pins exclude rotated secrets but detect model configuration changes',()=>{
 const env=comparisonEnv(process.env,true),pin=executionFingerprint(env);
 assert.equal(executionFingerprint({...env,LLM_API_KEY:'rotated'}),pin);
 assert.notEqual(executionFingerprint({...env,LLM_MAIN_BASE_URL:'https://changed.invalid'}),pin);
});
test('transport reserves before dispatch, counts retries, retains uncertain charges, and blocks external destinations',async()=>{
 const state={limits,ledger:[]},control=new AbortController();let persisted=0,calls=0;
 const connections=[{base:'https://model.invalid/v1',model:'test',key:'secret'}];
 const options={method:'POST',redirect:'error',headers:{Authorization:'Bearer secret'},body:JSON.stringify({model:'test'})};
 const transport=budgetedTransport({state,unit:'one',connections,control,persist:()=>persisted++,dispatch:async()=>{
  calls++;assert.ok(persisted>0);assert.equal(state.ledger.length,calls);if(calls===1)throw new Error('synthetic timeout');return Response.json({});
 }});
 await assert.rejects(transport('https://model.invalid/v1/call',options),/timeout/);
 assert.equal(state.ledger[0].status,'uncertain');await transport('https://model.invalid/v1/call',options);assert.equal(state.ledger.length,2);
 await assert.rejects(transport('https://elsewhere.invalid/v1/call',options),/scope/);assert.equal(calls,2);assert.equal(control.signal.aborted,true);
});
test('failed durable reservation or cancellation forbids dispatch, regardless of telemetry',async()=>{
 for(const abort of [false,true]){
  const control=new AbortController();if(abort)control.abort();let calls=0;
  const transport=budgetedTransport({state:{limits,ledger:[]},unit:'one',connections:[{base:'https://model.invalid',model:'test',key:'k'}],control,persist:()=>{throw new Error('disk full');},dispatch:async()=>{calls++;}});
  await assert.rejects(transport('https://model.invalid/call',{method:'POST',redirect:'error',headers:{Authorization:'Bearer k'},body:'{"model":"test"}'}));assert.equal(calls,0);
 }
});
test('ledger failure after response headers aborts and closes the response while retaining the reservation',async()=>{
 const state={limits,ledger:[]},control=new AbortController();let writes=0,cancelled=false;
 const transport=budgetedTransport({state,unit:'one',connections:[{base:'https://model.invalid',model:'test',key:'k'}],control,persist:()=>{if(++writes>1)throw new Error('disk full');},dispatch:async()=>({status:200,body:{cancel:async()=>{cancelled=true;}}})});
 await assert.rejects(transport('https://model.invalid/call',{method:'POST',redirect:'error',headers:{Authorization:'Bearer k'},body:'{"model":"test"}'}),/ledger/);
 assert.equal(cancelled,true);assert.equal(control.signal.aborted,true);assert.equal(state.ledger.length,1);assert.equal(state.ledger[0].status,'uncertain');
});
test('human export binds all outputs and never invents citation/fact/rollback approvals',()=>{
 // SYNTHETIC VALIDATOR ONLY: no live runner or paid transport is invoked, and no
 // acceptance file is written. These local objects test the existing operator gate.
 const directory=temporary(),env=comparisonEnv(process.env,true);
 try{
  fs.mkdirSync(path.join(directory,'results'));
  const cases=Array.from({length:50},(_,i)=>({...plan.cases[i%6],id:'synthetic-'+i}));
  const state={version:1,id:'SYNTHETIC-VALIDATOR-ONLY',offline:false,plan:{...plan,material:'curated',cases},limits,ledger:[],units:{},executionFingerprint:executionFingerprint(env)};
  state.corpusHash=digest(state.plan);
  // The production validator fingerprint is generated from matching, secret-free config.
  state.fingerprint=modelRolloutFingerprint(env);
  for(const c of cases)for(const arm of ['baseline','candidate']){
   const unit=c.id+'--'+arm,output={version:1,kind:'live-research-result',runId:state.id,unit,corpusHash:state.corpusHash,cutoff:state.plan.cutoff,inputHash:digest(c.input),syntheticValidatorOnly:true};writeJSON(path.join(directory,'results',unit+'.json'),output);state.units[unit]={status:'completed',artifactHash:digest(output)};
  }
  writeJSON(path.join(directory,'run.json'),state);
  const summary=evidenceSummary(state,directory);
  const review={runId:state.id,corpusHash:state.corpusHash,cases:summary.cases.map(c=>({id:c.id,baseline:{artifactHash:c.baseline.artifactHash,notes:'synthetic'},candidate:{artifactHash:c.candidate.artifactHash,notes:'synthetic'}}))};
  assert.throws(()=>exportAcceptance(directory,review,env),/Acceptance rejected/);
  Object.assign(review,{dryRunAccepted:true,rollbackVerified:true,approvedBy:'SYNTHETIC-VALIDATOR-ONLY',approvedAt:'2026-09-10T00:00:00Z'});
  for(const c of review.cases)for(const arm of ['baseline','candidate'])Object.assign(c[arm],{citationPassed:true,criticalFactErrors:0});
  assert.equal(validateModelRollout(exportAcceptance(directory,review,env),env).accepted,true);
  const outputPath=path.join(directory,'results/synthetic-0--baseline.json'),savedOutput=readJSON(outputPath),savedUnitHash=state.units['synthetic-0--baseline'].artifactHash;
  for(const field of ['kind','runId','unit','corpusHash','cutoff','inputHash']){
   const mixed={...savedOutput,[field]:'from-a-different-run'};writeJSON(outputPath,mixed);state.units['synthetic-0--baseline'].artifactHash=digest(mixed);
   assert.throws(()=>evidenceSummary(state,directory),/provenance/);
  }
  writeJSON(outputPath,savedOutput);state.units['synthetic-0--baseline'].artifactHash=savedUnitHash;
  const savedPlan=structuredClone(state.plan);state.plan.cases[0].input=structuredClone(state.plan.cases[0].input);state.plan.cases[0].input.question+=' changed after execution';
  writeJSON(path.join(directory,'run.json'),state);
  assert.throws(()=>exportAcceptance(directory,review,env),/corpus/i);
  state.plan=savedPlan;writeJSON(path.join(directory,'run.json'),state);
  review.rollbackVerified=false;assert.throws(()=>exportAcceptance(directory,review,env),/rollback/);review.rollbackVerified=true;
  review.cases[0].candidate.artifactHash='modified';assert.throws(()=>exportAcceptance(directory,review,env),/hash/);
  writeJSON(path.join(directory,'results/synthetic-0--baseline.json'),{modified:true});assert.throws(()=>evidenceSummary(state,directory),/modified/);
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
