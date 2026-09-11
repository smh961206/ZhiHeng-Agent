import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {runVisionBenchmark,visionSimulationEnv} from '../scripts/vision-benchmark.mjs';
import {validateVisionPromotion} from '../server/vision-policy.mjs';
const images=[{page:1,dataUrl:'data:image/png;base64,AA=='}];
const temp=()=>{const directory=fs.mkdtempSync(join(tmpdir(),'vision-progress-'));return {directory,file:join(directory,'comparison.json')};};
test('each completed arm survives interruption and matching resume never repeats it',async()=>{
 const {directory,file}=temp();let renders=0;
 try{
  await assert.rejects(runVisionBenchmark({outputFile:file,render:async()=>{if(++renders===2)throw new Error('render interrupted');return images;}}),/render interrupted/);
  const partial=JSON.parse(fs.readFileSync(file));assert.equal(partial.requests,2);assert.equal(partial.completed,false);assert.equal(partial.progress.status,'interrupted');
  assert.equal(partial.results.length,1);assert.equal(partial.usage.baseline.calls,1);assert.equal(partial.progress.ledger.length,2);
  assert.equal(validateVisionPromotion({...partial,measurement:'live'},null,visionSimulationEnv).accepted,false);
  const bytes=fs.readFileSync(file);await assert.rejects(runVisionBenchmark({outputFile:file,render:async()=>assert.fail('no work')}),/already exists/);assert.deepEqual(fs.readFileSync(file),bytes);
  await assert.rejects(runVisionBenchmark({outputFile:file,resume:true,env:{...visionSimulationEnv,LLM_VISION_CHALLENGER_MODEL:'changed'},render:async()=>assert.fail('changed config')}),/changed/);
  renders=0;const report=await runVisionBenchmark({outputFile:file,resume:true,render:async()=>{renders++;return images;}});
  assert.equal(renders,47);assert.equal(report.requests,96);assert.equal(report.completed,true);assert.equal(report.progress.status,'completed');
  assert.deepEqual(report.results[0],partial.results[0]);assert.equal(report.qualityAccepted,false);assert.equal(report.usage.candidate.calls,48);
  const reused=await runVisionBenchmark({outputFile:file,resume:true,render:async()=>assert.fail('completed runs cannot make calls')});assert.deepEqual(reused,report);
  const corrupt=JSON.parse(fs.readFileSync(file));corrupt.requests=0;fs.writeFileSync(file,JSON.stringify(corrupt));
  await assert.rejects(runVisionBenchmark({outputFile:file,resume:true,render:async()=>assert.fail('corrupt progress')}),/invalid/);
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
test('a real process crash leaves a durable reservation and refuses ambiguous replay',async()=>{
 const {directory,file}=temp();
 try{
  const child=spawnSync(process.execPath,['tests/fixtures/vision-benchmark-crash.mjs',file],{encoding:'utf8',timeout:10000});assert.equal(child.status,73,child.stderr);
  const partial=JSON.parse(fs.readFileSync(file));assert.equal(partial.requests,1);assert.equal(partial.progress.ledger[0].status,'reserved');assert.equal(partial.results[0].baseline,undefined);
  assert.equal(partial.usage.baseline.calls,1);assert.equal(partial.usage.baseline.byStatus.started,1);assert.equal(partial.usage.baseline.unknownBillingCalls,1);assert.equal(partial.usage.baseline.usage.totalTokens.knownTotal,null);
  await assert.rejects(runVisionBenchmark({outputFile:file,resume:true,render:async()=>assert.fail('locked')}),{code:'EEXIST'});
  // Parent has observed the owning process exit; remove only its stale lock.
  fs.unlinkSync(file+'.lock');const before=fs.readFileSync(file);
  await assert.rejects(runVisionBenchmark({outputFile:file,resume:true,render:async()=>assert.fail('ambiguous request')}),/unknown outcome/);
  assert.deepEqual(fs.readFileSync(file),before);
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
test('a concurrent runner cannot alter progress or remove the active lock',async()=>{
 const {directory,file}=temp(),gate=Promise.withResolvers();
 try{
  const first=runVisionBenchmark({outputFile:file,render:()=>gate.promise});
  await assert.rejects(runVisionBenchmark({outputFile:file,resume:true,render:async()=>assert.fail('concurrent work')}),{code:'EEXIST'});
  assert.equal(fs.existsSync(file+'.lock'),true);gate.reject(new Error('stop owner'));await assert.rejects(first,/stop owner/);
  assert.equal(fs.existsSync(file+'.lock'),false);assert.equal(JSON.parse(fs.readFileSync(file)).requests,0);
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
test('failed durable reservation prevents dispatch and retains conservative progress',async()=>{
 const {directory,file}=temp(),sync=fs.fsyncSync,json=Response.json;let failed=false,dispatches=0;
 try{
  fs.fsyncSync=function(...args){
   const temporary=fs.readdirSync(directory).find(name=>name.endsWith('.tmp'));
   if(!failed&&temporary&&JSON.parse(fs.readFileSync(join(directory,temporary))).progress.ledger.at(-1)?.status==='reserved'){failed=true;throw new Error('synthetic disk failure');}
   return sync.apply(this,args);
  };
  Response.json=function(...args){dispatches++;return json.apply(this,args);};
  await assert.rejects(runVisionBenchmark({outputFile:file,render:async()=>images}),/disk failure/);
  assert.equal(dispatches,0);assert.equal(failed,true);
  const retained=JSON.parse(fs.readFileSync(file));assert.equal(retained.requests,1);assert.equal(retained.progress.ledger[0].status,'reserved');
 }finally{fs.fsyncSync=sync;Response.json=json;fs.rmSync(directory,{recursive:true,force:true});}
});

test('transient replacement lock retries only the file operation without repeating a model arm',async()=>{
 const {directory,file}=temp(),rename=fs.renameSync,json=Response.json;let blocked=false,dispatches=0;
 try{
  fs.renameSync=function(from,to){
   if(to===file&&!blocked&&JSON.parse(fs.readFileSync(from)).progress.ledger.length===1){blocked=true;throw Object.assign(new Error('file scanner lock'),{code:'EPERM'});}
   return rename.call(this,from,to);
  };
  Response.json=function(...args){dispatches++;return json.apply(this,args);};
  let renders=0;await assert.rejects(runVisionBenchmark({outputFile:file,render:async()=>{if(++renders===2)throw new Error('stop after case');return images;}}),/stop after case/);
  const report=JSON.parse(fs.readFileSync(file));assert.equal(blocked,true);assert.equal(dispatches,2);assert.equal(report.requests,2);assert.equal(report.progress.ledger.every(entry=>entry.status==='completed'),true);
 }finally{fs.renameSync=rename;Response.json=json;fs.rmSync(directory,{recursive:true,force:true});}
});
