import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {runChallenger,loadBenchmarkBudget,benchmarkSimulationEnv} from '../benchmark/executor.mjs';
test('V5.0.7 frozen text challenger actually crosses Gateway while simulation cannot reach the network',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zh-challenger-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const old=globalThis.fetch;globalThis.fetch=()=>assert.fail('Unexpected network');t.after(()=>{globalThis.fetch=old;});
 const result=await runChallenger({suiteDirectory:'benchmark/fixtures/bootstrap-v1',directory:root,repeats:2,env:{LLM_API_KEY:'real-key'}});
 assert.equal(result.results.length,32);assert.equal(result.results.filter(r=>r.grade.passed).length,32);assert.equal(result.summary.qualityAccepted,false);
 assert.ok(result.results.every(r=>r.calls.length===1&&r.calls[0].status==='succeeded'&&r.calls[0].billing===null));
 assert.ok(!JSON.stringify(result).includes('PRIVATE-SIMULATION'));assert.ok(!JSON.stringify(result).includes('real-key'));
 const resumed=await runChallenger({suiteDirectory:'benchmark/fixtures/bootstrap-v1',directory:root,repeats:2,resume:true});assert.deepEqual(resumed.results,result.results);
 await assert.rejects(runChallenger({suiteDirectory:'benchmark/fixtures/bootstrap-v1',directory:root,live:true}),/paid authorization/);
});
test('V5.0.7 resume cannot regain spending allowance from a missing or corrupt budget ledger',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zh-budget-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const file=path.join(root,'budget.json');
 const options={identity:'test',limits:{maxRequests:2,reservePerRequestMinor:1,budgetMinor:2}};
 assert.throws(()=>loadBenchmarkBudget(file,{...options,resume:true}),/ledger missing/);
 const first=loadBenchmarkBudget(file,{...options,resume:false});first.ledger=[{id:1,unit:'C1/main/0',status:'reserved',reservedMinor:1}];fs.writeFileSync(file,JSON.stringify(first));assert.equal(loadBenchmarkBudget(file,{...options,resume:true}).ledger.length,1);
 first.ledger[0].id=0;fs.writeFileSync(file,JSON.stringify(first));assert.throws(()=>loadBenchmarkBudget(file,{...options,resume:true}),/corrupt/);
});
test('V5.0.7 operator timeout bounds a stalled live-path mock and preserves its reservation',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zh-timeout-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async(url,{signal})=>{calls++;return new Promise((resolve,reject)=>{if(signal.aborted)reject(signal.reason);else signal.addEventListener('abort',()=>reject(signal.reason),{once:true});});};t.after(()=>{globalThis.fetch=original;});
 const start=Date.now();await assert.rejects(runChallenger({suiteDirectory:'benchmark/fixtures/bootstrap-v1',directory:root,repeats:1,live:true,allowPaid:true,env:benchmarkSimulationEnv,limits:{currency:'USD',maxRequests:1,budgetMinor:1,reservePerRequestMinor:1,timeoutMs:25}}));
 assert.ok(Date.now()-start<2000);assert.equal(calls,1);assert.equal(JSON.parse(fs.readFileSync(path.join(root,'budget.json'))).ledger.length,1);
});

test('V5.0 completed live-path resume still validates its ledger without dispatching again',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zh-completed-budget-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;return Response.json({choices:[{message:{role:'assistant',content:JSON.stringify({facts:[],citations:[],counterEvidence:[]})},finish_reason:'stop'}]});};
 t.after(()=>{globalThis.fetch=original;});
 const options={suiteDirectory:'benchmark/fixtures/bootstrap-v1',directory:root,repeats:1,live:true,allowPaid:true,env:benchmarkSimulationEnv,
  limits:{currency:'USD',maxRequests:16,budgetMinor:16,reservePerRequestMinor:1,timeoutMs:1000}};
 const first=await runChallenger(options);assert.equal(first.summary.complete,true);assert.equal(calls,16);
 const file=path.join(root,'budget.json'),bytes=fs.readFileSync(file);
 const resumed=await runChallenger({...options,resume:true});assert.deepEqual(resumed.results,first.results);assert.equal(calls,16);
 fs.unlinkSync(file);
 await assert.rejects(runChallenger({...options,resume:true}),/ledger missing/);
 const corrupt=JSON.parse(bytes);corrupt.ledger[0].reservedMinor=0;fs.writeFileSync(file,JSON.stringify(corrupt));
 await assert.rejects(runChallenger({...options,resume:true}),/ledger corrupt/);
 assert.equal(calls,16,'invalid ledgers must never cause replacement requests');
 fs.writeFileSync(file,bytes);assert.deepEqual((await runChallenger({...options,resume:true})).results,first.results);assert.equal(calls,16);
});
