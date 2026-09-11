import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {championTestPolicy} from './fixtures/champion.mjs';
import {temporaryBenchmark} from './fixtures/benchmark.mjs';
import {evaluateModelDrift} from '../server/model-drift.mjs';
import {objectHash,sha256,loadFrozenSuite} from '../benchmark/fixtures.mjs';
import {gradeCase,graderVersions} from '../benchmark/graders.mjs';
import {runnerVersion} from '../benchmark/runner.mjs';
import {semanticPolicy} from '../benchmark/semantic.mjs';

// Synthetic artifact tests only: no live requests or production approvals.
const rehashPolicy=p=>{p.review.evidenceHash=objectHash(p.evidence);const {hash,...body}=p;p.hash=objectHash(body);};
const seal=d=>{
 d.run.binding=objectHash(d.run.plan);
 d.results.forEach(r=>{r.binding=d.run.binding;r.runId=d.run.id;});
 d.run.units.forEach(u=>{const r=d.results.find(r=>r.unitId===u.id);if(r)u.resultHash=objectHash(r);});
};
function setup(t,n=50,kind='live-model'){
 const f=temporaryBenchmark(t),policy=structuredClone(championTestPolicy()),files=[],cases=[];
 const write=(name,data,kind)=>{const bytes=JSON.stringify(data);fs.writeFileSync(path.join(f.suiteDirectory,name),bytes);files.push({path:name,kind,sha256:sha256(bytes)});};
 for(let i=0;i<n;i++){
  const c={...f.case,id:'C'+i,fixture:'F'+i,category:'earnings_update',expectedToolBehavior:[{name:'read_rules',behavior:'required'}]};cases.push(c);
  const fixture=structuredClone(f.fixture);fixture.id=c.fixture;fixture.sources[0].blocks[0].text+=' independent fixture '+i;write('fixture-'+i+'.json',fixture,'fixture');
 }
 write('cases.json',cases,'cases');
 fs.writeFileSync(path.join(f.suiteDirectory,'manifest.json'),JSON.stringify({version:1,id:'drift-tests',benchmarkVersion:'v1',frozenAt:'2025-01-02T00:00:00Z',files}));
 const suite=loadFrozenSuite(f.suiteDirectory),profile=policy.configuration.find(e=>e.profile.id===policy.evidence.candidateId).profile;
 const output={...f.output,tools:[{name:'read_rules',status:'completed'}]};
 const dataset=(id,startedAt)=>{
  const plan={suiteHash:suite.hash,benchmarkVersion:suite.benchmarkVersion,caseIds:cases.map(c=>c.id),profiles:[profile],repeats:2,executorVersion:'test-v1',executionIdentity:objectHash('test-execution'),evidenceKind:kind,codeHash:objectHash('test-code'),runnerVersion,graders:graderVersions,semanticPolicyHash:objectHash(semanticPolicy)};
  const results=cases.flatMap(c=>[0,1].map(repeat=>({version:1,runId:id,binding:objectHash(plan),unitId:objectHash([c.id,profile.id,repeat]),caseId:c.id,category:c.category,caseHash:objectHash(c),fixtureHash:objectHash(suite.fixtures[c.fixture]),cutoff:c.cutoff,profile,repeat,evidenceKind:kind,output:structuredClone(output),calls:[],failure:null,grade:gradeCase(c,suite.fixtures[c.fixture],output)})));
  const run={version:1,runnerVersion,id,startedAt,plan,binding:objectHash(plan),profiles:[profile],evidenceKind:kind,units:results.map(r=>({id:r.unitId,caseId:r.caseId,profileId:r.profile.id,repeat:r.repeat,status:'completed',resultHash:objectHash(r)}))};
  return structuredClone({run,results});
 };
 const baseline=dataset('baseline-test','2026-09-01T00:00:00Z'),current=dataset('current-test','2026-09-03T00:00:00Z');
 Object.assign(policy.evidence,{benchmarkVersion:suite.benchmarkVersion,suiteHash:suite.hash,runBindings:[baseline.run.binding],runArtifacts:[{runId:baseline.run.id,binding:baseline.run.binding,resultsHash:objectHash(baseline.results)}]});rehashPolicy(policy);
 return {...f,suite,policy,baseline,current,observedAt:'2026-09-04T00:00:00Z'};
}
const measure=f=>evaluateModelDrift(f);
function changeOutput(f,change){
 const r=f.current.results[0];change(r);
 const c=f.suite.cases.find(c=>c.id===r.caseId);r.grade=gradeCase(c,f.suite.fixtures[c.fixture],r.output??{});seal(f.current);
}

test('V5.0.13 matched frozen repeated measurements detect stability without policy replacement',t=>{
 const f=setup(t),saved=structuredClone({policy:f.policy,baseline:f.baseline,current:f.current});
 const report=measure(f);assert.equal(report.status,'stable');assert.equal(report.automaticReplacement,false);assert.ok(Object.isFrozen(report));
 assert.deepEqual({policy:f.policy,baseline:f.baseline,current:f.current},saved);
});
test('V5.0.13 critical/format/tool drift invalidates even a small live sample, never a simulation',t=>{
 for(const kind of ['live-model','recorded-live','simulation']){
  const f=setup(t,2,kind);changeOutput(f,r=>{r.output.facts[0].value=0;r.output.tools=[];r.output.violations=['wrong_basis'];});
  const r=measure(f);assert.equal(r.status,kind==='simulation'?'simulation-only':'invalidate');assert.ok(r.failures.critical>0);assert.equal(r.failures.format,1);assert.equal(r.failures.tools,1);
 }
 const f=setup(t,2);changeOutput(f,r=>{r.output=null;r.failure='invalid_output';});assert.equal(measure(f).failures.format,1);
});
test('V5.0.13 small samples stay inconclusive and every approved task class needs current coverage',t=>{
 const f=setup(t,2);assert.equal(measure(f).status,'inconclusive');
 f.policy.taskClasses.push('agent_tooling');rehashPolicy(f.policy);assert.throws(()=>measure(f),/all approved task classes/);
});
test('V5.0.13 rejects unapproved baseline, wrong suite/version and missing frozen suite',t=>{
 const f=setup(t,2);
 for(const mutate of [p=>p.evidence.runBindings=[objectHash('unrelated')],p=>p.evidence.suiteHash=objectHash('wrong'),p=>p.evidence.benchmarkVersion='wrong']){
  const policy=structuredClone(f.policy);mutate(policy);rehashPolicy(policy);assert.throws(()=>measure({...f,policy}),/approved drift baseline/);
 }
 assert.throws(()=>measure({...f,suiteDirectory:undefined}),/frozen suite/);
 const policy=structuredClone(f.policy);policy.evidence.runBindings.push(objectHash('unreviewed'));const {hash,...body}=policy;policy.hash=objectHash(body);
 assert.throws(()=>measure({...f,policy}),/approval evidence binding/);
});
test('V5.0.13 same-plan reruns or rehashed baseline outputs cannot replace the approved results',t=>{
 const f=setup(t,2),baseline=structuredClone(f.baseline);
 baseline.run.id='another-run';seal(baseline);assert.throws(()=>measure({...f,baseline}),/baseline results changed/);
 const changed=structuredClone(f.baseline);changed.results[0].calls=[];changed.results[0].output.delivered=false;
 const c=f.suite.cases.find(c=>c.id===changed.results[0].caseId);changed.results[0].grade=gradeCase(c,f.suite.fixtures[c.fixture],changed.results[0].output);seal(changed);
 assert.throws(()=>measure({...f,baseline:changed}),/baseline results changed/);
 const current=structuredClone(f.current);current.run.units[0].status='reserved';assert.throws(()=>measure({...f,current}),/complete acknowledged/);
});
test('V5.0.13 rejects invalid dates, future observations and a post-approval baseline',t=>{
 const f=setup(t,2);
 for(const mutate of [g=>g.observedAt='2026-02-30T00:00:00Z',g=>g.policy.review.approvedAt='bad',g=>g.policy.evidence.completedAt='bad',g=>g.baseline.run.startedAt='bad',g=>g.current.run.startedAt='bad',g=>g.current.run.startedAt='2026-09-05T00:00:00Z',g=>g.current.run.startedAt='2026-09-01T00:00:00Z',g=>g.baseline.run.startedAt='2026-09-03T00:00:00Z',g=>g.policy.evidence.completedAt='2026-09-03T00:00:00Z']){
  const g={...f,policy:structuredClone(f.policy),baseline:structuredClone(f.baseline),current:structuredClone(f.current)};mutate(g);rehashPolicy(g.policy);assert.throws(()=>measure(g));
 }
});
test('V5.0.13 rejects outer simulation relabel and per-row source laundering',t=>{
 const f=setup(t,2,'simulation');changeOutput(f,r=>{r.output.facts[0].value=0;});
 f.current.run.evidenceKind='live-model';assert.throws(()=>measure(f),/run provenance/);
 f.current.run.plan.evidenceKind='live-model';seal(f.current);assert.throws(()=>measure(f),/result provenance/);
});
test('V5.0.13 validates result identity, hashes, profile/fixture provenance and recalculates grades',t=>{
 const f=setup(t,2);
 for(const mutate of [
  d=>d.results[0].runId='wrong',d=>d.results[0].binding=objectHash('wrong'),d=>d.results[0].unitId=objectHash('wrong'),
  d=>d.results[0].caseId='wrong',d=>d.results[0].repeat=9,d=>d.results[0].profile.model='wrong',
  d=>d.results[0].caseHash=objectHash('wrong'),d=>d.results[0].fixtureHash=objectHash('wrong'),d=>d.results[0].cutoff='2024-01-01T00:00:00Z',
  d=>d.results[0].category='execution_review',d=>d.results[0].evidenceKind='simulation',d=>d.results[0].taskSignals={mode:'E'},
  d=>d.results[0].grade.passed=false,d=>d.results[0].output.facts[0].value=0,d=>d.results[0].failure='invalid_output',
  d=>d.results[1]=structuredClone(d.results[0]),d=>d.results.pop(),d=>d.run.units.pop(),d=>d.run.units[0].status='reserved'
 ]){
  const current=structuredClone(f.current);mutate(current);
  // Updating outer result hashes cannot bypass inner validation.
  current.run.units.forEach(u=>{const r=current.results.find(r=>r.unitId===u.id);if(r)u.resultHash=objectHash(r);});
  assert.throws(()=>measure({...f,current}));
 }
 const current=structuredClone(f.current);current.run.units[0].resultHash=objectHash('wrong');assert.throws(()=>measure({...f,current}),/result changed/);
});
test('V5.0.13 execution code/configuration drift invalidates verified live measurements',t=>{
 const f=setup(t,2);
 for(const field of ['codeHash','executionIdentity','executorVersion','semanticPolicyHash']){
  const current=structuredClone(f.current);current.run.plan[field]=objectHash('changed');seal(current);
  const report=measure({...f,current});assert.equal(report.status,'invalidate');assert.ok(report.reasons.includes(field==='codeHash'?'execution_code_changed':'execution_configuration_changed'));
 }
 const current=structuredClone(f.current),changed={...current.run.profiles[0],model:'changed-model'};
 current.run.profiles=[changed];current.run.plan.profiles=[changed];current.results.forEach(r=>{r.profile=changed;});seal(current);
 assert.ok(measure({...f,current}).reasons.includes('execution_configuration_changed'));
 const changedGraders=structuredClone(f.current);changedGraders.run.plan.graders.deterministic='changed';seal(changedGraders);assert.throws(()=>measure({...f,current:changedGraders}),/run provenance/);
});
test('V5.0.13 current case scope cannot drop approved baseline cases',t=>{
 const f=setup(t,2);f.current.run.plan.caseIds.pop();f.current.results=f.current.results.filter(r=>r.caseId==='C0');f.current.run.units=f.current.run.units.filter(u=>u.caseId==='C0');seal(f.current);
 assert.throws(()=>measure(f),/matched frozen coverage/);
});
test('V5.0.13 CLI shares strict validation and never writes an invalid comparison',t=>{
 const f=setup(t,2),baselineDir=path.join(f.root,'baseline'),currentDir=path.join(f.root,'current'),registryFile=path.join(f.root,'registry.json'),out=path.join(f.root,'report.json');
 const persist=(dir,d)=>{fs.mkdirSync(path.join(dir,'results'),{recursive:true});fs.writeFileSync(path.join(dir,'run.json'),JSON.stringify(d.run));d.results.forEach(r=>fs.writeFileSync(path.join(dir,'results',r.unitId+'.json'),JSON.stringify(r)));};
 persist(baselineDir,f.baseline);persist(currentDir,f.current);fs.writeFileSync(registryFile,JSON.stringify({activePolicyId:f.policy.id,policies:[f.policy]}));
 const run=(extra=[])=>spawnSync(process.execPath,['scripts/model-drift.mjs','--baseline',baselineDir,'--current',currentDir,'--suite',f.suiteDirectory,'--registry',registryFile,'--out',out,...extra],{encoding:'utf8',windowsHide:true,timeout:15000});
 const valid=run();assert.equal(valid.status,0,valid.stderr);assert.equal(JSON.parse(fs.readFileSync(out)).status,'inconclusive');
 const previous=fs.readFileSync(out,'utf8'),otherOut=path.join(f.root,'unexpected.json');
 for(const extra of [['--out',otherOut],['--currnet',currentDir],['--out'],['unexpected'],['--registry','']]){
  const rejected=run(extra);assert.equal(rejected.status,1,JSON.stringify(extra));
  assert.equal(fs.readFileSync(out,'utf8'),previous);assert.equal(fs.existsSync(otherOut),false);
 }
 f.current.results[0].grade.passed=false;seal(f.current);persist(currentDir,f.current);
 const invalid=run();assert.equal(invalid.status,1);assert.equal(fs.readFileSync(out,'utf8'),previous);
});
