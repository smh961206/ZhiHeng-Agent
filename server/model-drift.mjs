import fs from 'node:fs';
import {freeze,identifier,jsonData,requireBenchmark,timestamp} from '../benchmark/case.mjs';
import {objectHash} from '../benchmark/fixtures.mjs';
import {compareSamples,samplesFromRun} from '../benchmark/statistics.mjs';
import {validateBenchmarkRun} from '../benchmark/runner.mjs';
import {benchmarkTaskClass,modelTaskClasses} from './model-task-class.mjs';
export function evaluateModelDrift({policy,baseline,current,suiteDirectory,observedAt=new Date().toISOString()}){
 policy=jsonData(policy);
 const {hash,...body}=policy,e=policy.evidence;
 requireBenchmark(hash===objectHash(body)&&identifier(policy.id)&&timestamp(e?.completedAt)&&timestamp(policy.review?.approvedAt)&&timestamp(observedAt)&&
  Date.parse(e.completedAt)<=Date.parse(policy.review.approvedAt)&&Date.parse(observedAt)>=Date.parse(policy.review.approvedAt),'drift policy/time binding');
 requireBenchmark(policy.review.evidenceHash===objectHash(e),'drift approval evidence binding');
 requireBenchmark(Array.isArray(policy.taskClasses)&&policy.taskClasses.length>0&&new Set(policy.taskClasses).size===policy.taskClasses.length&&policy.taskClasses.every(c=>modelTaskClasses.includes(c)),'drift task classes');
 // Historical code hashes are checked against the approved run binding below;
 // do not require the monitor's current checkout to equal historical run code.
 baseline=jsonData({run:baseline.run,results:baseline.results});current=jsonData({run:current.run,results:current.results});
 for(const dataset of [baseline,current]){
  requireBenchmark(identifier(dataset.run.id)&&timestamp(dataset.run.startedAt)&&['simulation','live-model','recorded-live'].includes(dataset.run.evidenceKind)&&
   typeof dataset.run.plan.codeHash==='string'&&dataset.run.plan.codeHash.length>0,'drift run identity/time');
 }
 baseline=validateBenchmarkRun(baseline,{suiteDirectory,codeHash:baseline.run.plan.codeHash});
 current=validateBenchmarkRun(current,{suiteDirectory,codeHash:current.run.plan.codeHash});
 requireBenchmark([baseline,current].every(d=>d.summary.complete&&d.run.units.every(u=>u.status==='completed')),'complete acknowledged drift runs required');
 requireBenchmark(Array.isArray(e.runBindings)&&e.runBindings.includes(baseline.run.binding)&&baseline.run.plan.suiteHash===e.suiteHash&&baseline.run.plan.benchmarkVersion===e.benchmarkVersion,'approved drift baseline binding');
 requireBenchmark(e.runArtifacts?.some(a=>a.runId===baseline.run.id&&a.binding===baseline.run.binding&&a.resultsHash===objectHash(baseline.results)),'approved baseline results changed');
 requireBenchmark(Date.parse(baseline.run.startedAt)<=Date.parse(e.completedAt),'baseline must precede approval evidence');
 requireBenchmark(baseline.run.plan.suiteHash===current.run.plan.suiteHash&&objectHash(baseline.run.plan.caseIds)===objectHash(current.run.plan.caseIds)&&objectHash(baseline.run.plan.graders)===objectHash(current.run.plan.graders),'drift requires matched frozen coverage/graders');
 requireBenchmark(timestamp(current.run.startedAt)&&Date.parse(current.run.startedAt)>=Date.parse(policy.review.approvedAt)&&Date.parse(current.run.startedAt)<=Date.parse(observedAt),'post-promotion observation time');
 const id=policy.evidence.candidateId;
 const collect=(dataset,profileId)=>samplesFromRun(dataset,benchmarkTaskClass).filter(s=>s.profileId===id&&policy.taskClasses.includes(s.taskClass)).map(s=>({...s,profileId}));
 const samples=[...collect(baseline,'drift-baseline'),...collect(current,'drift-current')];
 requireBenchmark(policy.taskClasses.every(task=>['drift-baseline','drift-current'].every(profile=>samples.some(s=>s.taskClass===task&&s.profileId===profile))),'all approved task classes require coverage');
 const comparison=compareSamples(samples,{baselineId:'drift-baseline',candidateId:'drift-current',policy:policy.evidence.statisticalPolicy});
 const live=[baseline,current].every(d=>['live-model','recorded-live'].includes(d.run.evidenceKind)&&d.results.every(r=>r.evidenceKind===d.run.evidenceKind));
 const currentRows=current.results.filter(r=>r.profile.id===id&&policy.taskClasses.includes(benchmarkTaskClass(r))),reasons=[];
 const failures={critical:currentRows.reduce((n,r)=>n+r.grade.criticalErrors,0),format:currentRows.filter(r=>r.grade.dimensions.contract===false||r.failure==='invalid_output').length,tools:currentRows.filter(r=>r.grade.dimensions.tools===false).length};
 if(failures.critical)reasons.push('critical_quality_drift');if(failures.format)reasons.push('format_drift');if(failures.tools)reasons.push('tool_drift');
 if(comparison.tasks.some(t=>t.reasons.includes('quality_threshold')||t.reasons.includes('noninferiority_unproven')&&t.difference.observed< -comparison.policy.tolerance))reasons.push('quality_regression');
 const sameConfiguration=objectHash(baseline.run.profiles)===objectHash(current.run.profiles)&&
  ['executionIdentity','executorVersion','semanticPolicyHash'].every(k=>objectHash(baseline.run.plan[k])===objectHash(current.run.plan[k]));
 if(!sameConfiguration)reasons.push('execution_configuration_changed');
 if(baseline.run.plan.codeHash!==current.run.plan.codeHash)reasons.push('execution_code_changed');
 const status=!live?'simulation-only':reasons.length?'invalidate':comparison.tasks.every(t=>t.eligible)?'stable':'inconclusive';
 const report={version:1,kind:'model-drift-observation',policyId:policy.id,policyHash:policy.hash,observedAt,baselineBinding:baseline.run.binding,currentBinding:current.run.binding,
  suiteHash:current.run.plan.suiteHash,status,liveEvidence:live,failures,reasons,comparison,automaticReplacement:false};
 return freeze({...report,hash:objectHash(report)});
}
export function championInvalidated(policy,env=process.env){
 const file=env.MODEL_CHAMPION_INVALIDATION_FILE;if(!file)return false;
 requireBenchmark(fs.statSync(file).size<=4*1024*1024,'invalidation size');const report=JSON.parse(fs.readFileSync(file)),{hash,...body}=report;
 requireBenchmark(report.version===1&&report.kind==='model-drift-observation'&&hash===objectHash(body)&&timestamp(report.observedAt)&&identifier(report.policyId),'invalidation record');
 return report.policyId===policy.id&&report.policyHash===policy.hash&&report.liveEvidence===true&&report.status==='invalidate';
}
