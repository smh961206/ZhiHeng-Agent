import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {freeze,identifier,jsonData,requireBenchmark} from './case.mjs';
import {loadFrozenSuite,objectHash,sha256} from './fixtures.mjs';
import {evaluationOutput,gradeCase,graderVersions} from './graders.mjs';
import {semanticPolicy} from './semantic.mjs';
import {createModelProfile} from '../server/model-catalog.mjs';
import {normalizeModelCall,summarizeModelCalls} from '../server/model-telemetry.mjs';
import {writeJSON} from '../scripts/model-comparison.mjs';

export const runnerVersion='1.0.0';
export async function persistBenchmark(file,value,{writer=writeJSON,wait=delay}={}){
 for(let attempt=0;;attempt++)try{return writer(file,value);}catch(error){
  if(!['EPERM','EACCES','EBUSY'].includes(error.code)||attempt>=4)throw error;
  await wait(50*(attempt+1));
 }
}
export function benchmarkCodeHash(){
 const root=fileURLToPath(new URL('../',import.meta.url));
 const dirs=['benchmark','server','shared'];
 const walk=dir=>fs.readdirSync(path.join(root,dir),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):e.name.endsWith('.mjs')?[[dir+'/'+e.name,sha256(fs.readFileSync(path.join(root,dir,e.name)))]]:[]);
 return objectHash(dirs.flatMap(walk));
}
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const unitId=(c,p,r)=>objectHash([c.id,p.id,r]);
const unitsFor=(cases,profiles,repeats)=>cases.flatMap(c=>profiles.flatMap(p=>Array.from({length:repeats},(_,i)=>({id:unitId(c,p,i),caseId:c.id,profileId:p.id,repeat:i,status:'pending'}))));
const unitIdentity=({id,caseId,profileId,repeat})=>({id,caseId,profileId,repeat});
export function summarizeRun(run,results){
 const profiles=run.profiles.map(p=>({profile:p.id,samples:results.filter(r=>r.profile.id===p.id)}));
 return {version:1,runId:run.id,binding:run.binding,evidenceKind:run.evidenceKind,complete:results.length===run.units.length,
  qualityAccepted:false,profiles:profiles.map(({profile,samples})=>({profile,cases:new Set(samples.map(r=>r.caseId)).size,attempts:samples.length,passed:samples.filter(r=>r.grade.passed).length,
   criticalErrors:samples.reduce((n,r)=>n+r.grade.criticalErrors,0),usage:summarizeModelCalls(samples.flatMap(r=>r.calls)),
   dimensions:Object.fromEntries(['facts','citations','tools','validation','contract','delivery','vision'].map(d=>[d,{assessed:samples.filter(r=>r.grade.dimensions[d]!==null).length,passed:samples.filter(r=>r.grade.dimensions[d]===true).length}]))}))};
}
export function readBenchmarkRun(directory,{suiteDirectory,codeHash=benchmarkCodeHash()}={}){
 const run=read(path.join(directory,'run.json')),results=[];
 requireBenchmark(Array.isArray(run.units),'run units');
 for(const unit of run.units){
  requireBenchmark(typeof unit.id==='string'&&/^[a-f0-9]{64}$/.test(unit.id),'unit identity');
  const file=path.join(directory,'results',unit.id+'.json');
  if(fs.existsSync(file))results.push(read(file));
 }
 return validateBenchmarkRun({run,results},{suiteDirectory,codeHash});
}
// Shared artifact verification: callers cannot substitute precomputed grades or
// an unverified in-memory dataset for the frozen suite and persisted identities.
export function validateBenchmarkRun(input,{suiteDirectory,codeHash=benchmarkCodeHash()}={}){
 const {run,results:rows}=jsonData({run:input.run,results:input.results});
 requireBenchmark(run.version===1&&run.runnerVersion===runnerVersion&&Array.isArray(run.units)&&run.binding===objectHash(run.plan),'run binding');
 requireBenchmark(run.plan.codeHash===codeHash,'benchmark code changed');
 requireBenchmark(run.evidenceKind===run.plan.evidenceKind&&run.plan.runnerVersion===runnerVersion&&objectHash(run.plan.graders)===objectHash(graderVersions),'run provenance');
 requireBenchmark(objectHash(run.profiles)===objectHash(run.plan.profiles),'profile snapshot mismatch');
 requireBenchmark(run.profiles.length>0&&new Set(run.profiles.map(p=>p.id)).size===run.profiles.length&&run.profiles.every(p=>objectHash(p)===objectHash(createModelProfile(p))),'profile contract');
 requireBenchmark(suiteDirectory,'frozen suite required for verification');
 const suite=loadFrozenSuite(suiteDirectory);requireBenchmark(suite.hash===run.plan.suiteHash,'suite changed');
 const selected=suite.cases.filter(c=>run.plan.caseIds.includes(c.id));
 requireBenchmark(selected.length===run.plan.caseIds.length&&selected.length>0&&Number.isSafeInteger(run.plan.repeats)&&run.plan.repeats>0&&run.plan.repeats<=20,'run coverage');
 requireBenchmark(objectHash(run.units.map(unitIdentity))===objectHash(unitsFor(selected,run.profiles,run.plan.repeats).map(unitIdentity)),'unit coverage changed');
 requireBenchmark(Array.isArray(rows)&&new Set(rows.map(r=>r.unitId)).size===rows.length&&rows.every(r=>run.units.some(u=>u.id===r.unitId)),'result unit coverage');
 const results=[];
 for(const unit of run.units){
  requireBenchmark(['pending','reserved','completed'].includes(unit.status),'unit state');
  const result=rows.find(r=>r.unitId===unit.id);
  if(unit.status==='pending'){requireBenchmark(!result,'unexpected result');continue;}
  if(!result){requireBenchmark(unit.status!=='completed','completed artifact missing');continue;}
  requireBenchmark(result.runId===run.id&&result.binding===run.binding&&result.unitId===unit.id&&result.caseId===unit.caseId&&result.profile.id===unit.profileId&&result.repeat===unit.repeat,'result binding');
  requireBenchmark(unit.status!=='completed'||objectHash(result)===unit.resultHash,'result changed');
  const c=selected.find(c=>c.id===unit.caseId),fixture=suite.fixtures[c.fixture];
  requireBenchmark(result.caseHash===objectHash(c)&&result.fixtureHash===objectHash(fixture)&&result.cutoff===c.cutoff&&result.category===c.category&&result.evidenceKind===run.evidenceKind&&objectHash(result.profile)===objectHash(run.profiles.find(p=>p.id===unit.profileId)),'result provenance');
  requireBenchmark(Object.hasOwn(result,'taskSignals')===Object.hasOwn(c,'taskSignals')&&(!Object.hasOwn(c,'taskSignals')||objectHash(result.taskSignals)===objectHash(c.taskSignals)),'result task signals differ from frozen case');
  requireBenchmark([null,'invalid_output','unsupported_capability'].includes(result.failure)&&(result.failure===null?result.output!==null:result.output===null),'result failure/output');
  if(result.output!==null)evaluationOutput(result.output);
  requireBenchmark(objectHash(result.grade)===objectHash(gradeCase(c,fixture,result.output??{})),'stored grade changed');
  requireBenchmark(objectHash(result.calls)===objectHash(result.calls.map(normalizeModelCall)),'telemetry projection');
  results.push(result);
 }
 return {run,results,summary:summarizeRun(run,results)};
}

// execute is trusted local code. It must collect actual validator/tool receipts;
// it must not treat a model's JSON claim of success as an execution receipt.
export async function runBenchmark({suiteDirectory,directory,profiles,repeats=1,caseIds,execute,prepare=()=>{},executorVersion,executionIdentity=null,evidenceKind='simulation',resume=false,signal,codeHash=benchmarkCodeHash(),onProgress=()=>{}}){
 requireBenchmark(typeof execute==='function'&&identifier(executorVersion)&&['simulation','live-model','recorded-live'].includes(evidenceKind),'explicit executor metadata');
 requireBenchmark(Number.isSafeInteger(repeats)&&repeats>0&&repeats<=20,'repeat count');
 const suite=loadFrozenSuite(suiteDirectory),snapshots=profiles.map(createModelProfile);
 requireBenchmark(snapshots.length>0&&new Set(snapshots.map(p=>p.id)).size===snapshots.length,'unique profiles');
 const cases=caseIds===undefined?suite.cases:suite.cases.filter(c=>caseIds.includes(c.id));
 requireBenchmark(cases.length>0&&(caseIds===undefined||Array.isArray(caseIds)&&cases.length===caseIds.length),'explicit case scope');
 const plan={suiteHash:suite.hash,benchmarkVersion:suite.benchmarkVersion,caseIds:cases.map(c=>c.id),profiles:snapshots,repeats,executorVersion,executionIdentity,evidenceKind,codeHash,runnerVersion,graders:graderVersions,semanticPolicyHash:objectHash(semanticPolicy)};
 const binding=objectHash(plan);
 fs.mkdirSync(directory,{recursive:true});
 const lock=path.join(directory,'runner.lock'),handle=fs.openSync(lock,'wx');fs.writeSync(handle,JSON.stringify({pid:process.pid}));fs.closeSync(handle);
 try{
  const stateFile=path.join(directory,'run.json');let run;
  const expectedUnits=unitsFor(cases,snapshots,repeats);
  if(fs.existsSync(stateFile)){
   requireBenchmark(resume,'run exists; explicit resume required');run=readBenchmarkRun(directory,{suiteDirectory,codeHash}).run;
   requireBenchmark(run.binding===binding&&objectHash(run.units.map(({id,caseId,profileId,repeat})=>({id,caseId,profileId,repeat})))===objectHash(expectedUnits.map(({status,...u})=>u)),'resume configuration changed');
  }else{requireBenchmark(!resume,'resume state missing');run={version:1,runnerVersion,id:randomUUID(),binding,plan,profiles:snapshots,evidenceKind,startedAt:new Date().toISOString(),units:expectedUnits};await persistBenchmark(stateFile,run);}
  // Validate executor-owned durable prerequisites even when every unit completed.
  // The same writer lock must protect ledger preparation and subsequent dispatch.
  signal?.throwIfAborted();await prepare();
  fs.mkdirSync(path.join(directory,'results'),{recursive:true});
  for(const unit of run.units){
   signal?.throwIfAborted();
   if(unit.status==='completed')continue;
   // Unknown dispatch outcomes never replay. A fully persisted result can be reconciled.
   if(unit.status==='reserved'){
    const result=readBenchmarkRun(directory,{suiteDirectory,codeHash}).results.find(r=>r.unitId===unit.id);
    requireBenchmark(result,'request outcome unknown; inspect before starting a new run');unit.status='completed';unit.resultHash=objectHash(result);await persistBenchmark(stateFile,run);continue;
   }
   const c=suite.cases.find(c=>c.id===unit.caseId),fixture=suite.fixtures[c.fixture],profile=snapshots.find(p=>p.id===unit.profileId);
   unit.status='reserved';await persistBenchmark(stateFile,run);
   let output=null,calls=[],failure=null;
   if(c.requiredCapabilities.some(k=>profile.capabilities[k]!==true))failure='unsupported_capability';
   else{
    const {expectedFacts,expectedCitations,expectedToolBehavior,requiredValidations,forbiddenBehaviors,...task}=c;
    const {expectedTable,referenceOutput,...material}=fixture;
    const response=await execute(Object.freeze({task:freeze(task),fixture:freeze(material),profile,repeat:unit.repeat,signal}));
    // Whitelist telemetry; unknown usage/cost stay null. Public outputs cannot contain reasoning fields.
    calls=(response.calls??[]).map(normalizeModelCall);
    try{output=evaluationOutput(response.output);}catch{failure='invalid_output';}
   }
   const grade=gradeCase(c,fixture,output??{});
   const result={version:1,runId:run.id,binding,unitId:unit.id,caseId:c.id,category:c.category,caseHash:objectHash(c),fixtureHash:objectHash(fixture),cutoff:c.cutoff,
    ...(Object.hasOwn(c,'taskSignals')?{taskSignals:c.taskSignals}:{}),profile,repeat:unit.repeat,evidenceKind,output,calls,failure,grade};
   const file=path.join(directory,'results',unit.id+'.json');requireBenchmark(!fs.existsSync(file),'result already exists');await persistBenchmark(file,result);
   unit.status='completed';unit.resultHash=objectHash(result);await persistBenchmark(stateFile,run);onProgress({completed:run.units.filter(u=>u.status==='completed').length,total:run.units.length});
  }
  const verified=readBenchmarkRun(directory,{suiteDirectory,codeHash});await persistBenchmark(path.join(directory,'summary.json'),verified.summary);return verified;
 }finally{fs.unlinkSync(lock);}
}
