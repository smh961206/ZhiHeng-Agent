import fs from 'node:fs';
import path from 'node:path';
import {identifier,freeze,requireBenchmark,timestamp} from './case.mjs';
import {objectHash} from './fixtures.mjs';
import {readBenchmarkRun} from './runner.mjs';
export function freezeBaseline({id,directory,suiteDirectory,outputFile,codeHash,policyVersion,acceptedAt}){
 requireBenchmark(identifier(id)&&identifier(policyVersion)&&timestamp(acceptedAt),'baseline identity/policy acceptance');
 const {run,results,summary}=readBenchmarkRun(directory,{suiteDirectory,codeHash});
 requireBenchmark(summary.complete&&run.units.every(u=>u.status==='completed')&&results.length>0,'complete baseline required');
 requireBenchmark(run.profiles.length===1,'one baseline profile');
 const baseline={version:1,kind:'benchmark-baseline',id,policyVersion,acceptedAt,runId:run.id,runBinding:run.binding,
  evidenceKind:run.evidenceKind,qualityAccepted:false,benchmarkVersion:run.plan.benchmarkVersion,suiteHash:run.plan.suiteHash,
  codeHash:run.plan.codeHash,profile:run.profiles[0],graderVersions:run.plan.graders,executorVersion:run.plan.executorVersion,
  environment:{node:process.version,platform:process.platform,arch:process.arch},metrics:summary.profiles[0],resultsHash:objectHash(results)};
 baseline.hash=objectHash(baseline);fs.mkdirSync(path.dirname(outputFile),{recursive:true});fs.writeFileSync(outputFile,JSON.stringify(baseline,null,2)+'\n',{flag:'wx'});return freeze(baseline);
}
export function validateBaseline(input){const {hash,...value}=input;requireBenchmark(value.version===1&&value.kind==='benchmark-baseline'&&hash===objectHash(value),'baseline changed');return freeze({...value,hash});}
