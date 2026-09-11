import {freeze,identifier,jsonData,requireBenchmark} from './case.mjs';
import {objectHash} from './fixtures.mjs';
export const statisticalPolicy=freeze({version:'1.0.0',minUniqueCases:50,minRepeats:2,minPassRate:0.95,tolerance:0.10,confidence:0.95});
export function validateStatisticalPolicy(input=statisticalPolicy){
 const p=jsonData(input);
 requireBenchmark(p.version===statisticalPolicy.version&&Object.keys(p).length===Object.keys(statisticalPolicy).length&&
  Number.isSafeInteger(p.minUniqueCases)&&p.minUniqueCases>=50&&Number.isSafeInteger(p.minRepeats)&&p.minRepeats>=2&&p.minRepeats<=20&&
  typeof p.minPassRate==='number'&&p.minPassRate>=0.95&&p.minPassRate<=1&&typeof p.tolerance==='number'&&p.tolerance>=0&&p.tolerance<=0.1&&p.confidence===0.95,'statistical policy must preserve minimum quality');return freeze(p);
}
export function wilson(correct,total){
 requireBenchmark(Number.isSafeInteger(total)&&total>0&&Number.isSafeInteger(correct)&&correct>=0&&correct<=total,'binomial counts');
 const z=1.959963984540054,p=correct/total,d=1+z*z/total,center=(p+z*z/(2*total))/d,half=z*Math.sqrt(p*(1-p)/total+z*z/(4*total*total))/d;
 return {lower:Math.max(0,center-half),upper:Math.min(1,center+half)};
}
// Each independent case is one trial. Repeated runs never inflate the sample count.
export function compareSamples(input,{baselineId,candidateId,policy=statisticalPolicy}={}){
 const samples=jsonData(input),rules=validateStatisticalPolicy(policy);
 requireBenchmark(identifier(baselineId)&&identifier(candidateId)&&baselineId!==candidateId&&Array.isArray(samples)&&samples.length>0,'two profiles and nonempty samples');
 const seen=new Set(),groups=new Map();
 for(const s of samples){
  requireBenchmark(identifier(s.caseId)&&identifier(s.taskClass)&&/^[a-f0-9]{64}$/.test(s.fixtureHash)&&[baselineId,candidateId].includes(s.profileId)&&Number.isSafeInteger(s.repeat)&&s.repeat>=0&&s.repeat<20&&
   typeof s.passed==='boolean'&&Number.isSafeInteger(s.criticalErrors)&&s.criticalErrors>=0&&(!s.passed||s.criticalErrors===0)&&['simulation','live-model','recorded-live'].includes(s.evidenceKind),'sample contract');
  const key=JSON.stringify([s.caseId,s.profileId,s.repeat]);requireBenchmark(!seen.has(key),'duplicate sample');seen.add(key);
  const group=groups.get(s.taskClass)??[];group.push(s);groups.set(s.taskClass,group);
 }
 const tasks=[...groups].sort(([a],[b])=>a.localeCompare(b)).map(([taskClass,rows])=>{
  const reasons=[],caseIds=[...new Set(rows.map(s=>s.caseId))],pairs=[];
  for(const id of caseIds){
   const r=rows.filter(s=>s.caseId===id),hashes=new Set(r.map(s=>s.fixtureHash));requireBenchmark(hashes.size===1,'unpaired fixture content');
   const baseline=r.filter(s=>s.profileId===baselineId),candidate=r.filter(s=>s.profileId===candidateId);
   const repeats=a=>a.map(s=>s.repeat).sort((a,b)=>a-b);
   if(objectHash(repeats(baseline))!==objectHash(repeats(candidate))||baseline.length<rules.minRepeats||repeats(baseline).some((r,i)=>r!==i))reasons.push('paired_repeats_required');
   pairs.push({id,fixtureHash:[...hashes][0],baseline:baseline.length>0&&baseline.every(s=>s.passed),candidate:candidate.length>0&&candidate.every(s=>s.passed)});
  }
  const unique=new Set(pairs.map(p=>p.fixtureHash)).size;if(unique!==pairs.length)reasons.push('independent_fixtures_required');
  if(unique<rules.minUniqueCases)reasons.push('minimum_sample_required');
  const n=pairs.length,b=pairs.filter(p=>p.baseline).length,c=pairs.filter(p=>p.candidate).length;
  const baseline={passed:b,total:n,rate:b/n,interval:wilson(b,n)},candidate={passed:c,total:n,rate:c/n,interval:wilson(c,n)};
  const difference={observed:c/n-b/n,lower:candidate.interval.lower-baseline.interval.upper,upper:candidate.interval.upper-baseline.interval.lower};
  if(candidate.rate<rules.minPassRate)reasons.push('quality_threshold');
  if(rows.some(r=>r.profileId===candidateId&&r.criticalErrors>0))reasons.push('critical_quality_failure');
  if(difference.lower < -rules.tolerance)reasons.push('noninferiority_unproven');
  const live=rows.every(s=>s.evidenceKind==='live-model'||s.evidenceKind==='recorded-live');
  return {taskClass,uniqueCases:unique,repeatedSamples:rows.length,baseline,candidate,difference,statisticallyEligible:reasons.length===0,liveEvidence:live,
   eligible:reasons.length===0&&live,reasons:[...new Set([...reasons,...(!live?['live_evidence_required']:[])])]};
 });
 return freeze({version:1,kind:'benchmark-statistical-comparison',baselineId,candidateId,policy:rules,samplesHash:objectHash(samples),tasks,qualityAccepted:false});
}
export function samplesFromRun({run,results},classify=r=>r.category){
 requireBenchmark(results.length===run.units.length&&run.units.every(u=>u.status==='completed'),'complete run required');
 return results.map(r=>({caseId:r.caseId,taskClass:classify(r),fixtureHash:r.fixtureHash,profileId:r.profile.id,repeat:r.repeat,passed:r.grade.passed,criticalErrors:r.grade.criticalErrors,evidenceKind:r.evidenceKind}));
}
