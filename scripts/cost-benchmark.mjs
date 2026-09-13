// Frozen offline arithmetic/quality gate, never a live model quality evaluation.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {compareEffectiveTaskCosts} from '../benchmark/statistics.mjs';
export function runCostBenchmark(){
 const bytes=fs.readFileSync(new URL('../tests/fixtures/cost-budget-v51.json',import.meta.url)),fixture=JSON.parse(bytes),hash=b=>createHash('sha256').update(b).digest('hex');
 const rows=fixture.cases.map(c=>{
  const task=(arm,cost,delivered,criticalErrors,currency,transportAttempts)=>({jobId:c.id+'-'+arm,delivered,validationPassed:delivered&&criticalErrors===0,criticalErrors,toolRounds:2,modelCalls:['research','review'].map((purpose,i)=>({id:c.id+'-'+arm+'-'+i,jobId:c.id+'-'+arm,purpose,status:'succeeded',errorCategory:null,transportAttempts,billing:cost===null?null:{currency,estimatedCost:cost/2}}))});
  const comparison=compareEffectiveTaskCosts({baseline:[task('baseline',c.baselineCost,true,0,'USD',1)],candidate:[task('candidate',c.candidateCost,c.candidateDelivered,c.candidateCriticalErrors,c.candidateCurrency,c.candidateAttempts)]});
  return {id:c.id,passed:comparison.engineeringCostGate===c.expectedCostGate,comparison};
 });
 return {version:1,kind:'cost-budget-offline-verification',fixtureVersion:fixture.version,fixtureHash:hash(bytes),evidenceKind:fixture.evidenceKind,formulaVersion:'effective-task-cost-1',
  code: ['server/model-telemetry.mjs','server/model-pricing.mjs','server/research-budget.mjs','benchmark/statistics.mjs'].map(file=>({file,sha256:hash(fs.readFileSync(new URL('../'+file,import.meta.url)))})),
  passed:rows.every(r=>r.passed),rows,qualityAccepted:false,productionSavingsAccepted:false,modelRequests:0};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 try{const args=process.argv.slice(2);if(args.length!==2||args[0]!=='--out'||!args[1])throw Error('Use --out with a new output file');
  const result=runCostBenchmark();fs.writeFileSync(args[1],JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({passed:result.passed,cases:result.rows.length,modelRequests:0}));if(!result.passed)process.exitCode=1;
 }catch(error){console.error(error.message);process.exitCode=1;}
}
