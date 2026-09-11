// Read-only comparison of previously executed periodic benchmark runs; no model calls.
import fs from 'node:fs';
import {readBenchmarkRun,persistBenchmark} from '../benchmark/runner.mjs';
import {evaluateModelDrift} from '../server/model-drift.mjs';
try{
 const args=process.argv.slice(2),required=['--baseline','--current','--suite','--registry','--out'],options=new Map();
 for(let i=0;i<args.length;i+=2){
  const flag=args[i],input=args[i+1];
  if(!required.includes(flag)||options.has(flag)||typeof input!=='string'||!input.trim()||input.startsWith('--'))throw Error('Invalid argument');
  options.set(flag,input);
 }
 if(options.size!==required.length)throw Error('Missing flag');
 const value=flag=>options.get(flag);
 const registry=JSON.parse(fs.readFileSync(value('--registry'))),policy=registry.policies.find(p=>p.id===registry.activePolicyId);if(!policy)throw Error('Active policy required');
 const read=directory=>readBenchmarkRun(directory,{suiteDirectory:value('--suite'),codeHash:JSON.parse(fs.readFileSync(directory+'/run.json')).plan.codeHash});
 const report=evaluateModelDrift({policy,baseline:read(value('--baseline')),current:read(value('--current')),suiteDirectory:value('--suite')});await persistBenchmark(value('--out'),report);console.log(JSON.stringify({status:report.status,reasons:report.reasons,automaticReplacement:false}));
}catch{console.error('Drift comparison rejected: check arguments, matching complete runs, coverage, policy and output path.');process.exitCode=1;}
