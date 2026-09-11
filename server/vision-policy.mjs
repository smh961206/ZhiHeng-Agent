// V4.9 Vision admission only. Separate from text policy to avoid Catalog/state cycles.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createVisionModelCatalog,createLegacyModelCatalog} from './model-catalog.mjs';
import {modelConnectionIdentity,resolveModelConnection} from './model-connection.mjs';
import {gradeVisionTable,visionMetrics} from './vision-quality.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const owners=['vision-model','vision-policy','model-catalog','model-adapter','model-gateway','model-connection','model-state','model-gateway-result','model-stream','model-deadline','vision-quality','visual-reading','visual-render-worker'];
const codeFiles=[...owners.map(name=>new URL('./'+name+'.mjs',import.meta.url)),new URL('../scripts/vision-benchmark.mjs',import.meta.url)];
const stamp=file=>{const s=fs.statSync(file,{bigint:true});if(!s.isFile())throw new Error('Expected file');return [s.dev,s.ino,s.size,s.mtimeNs,s.ctimeNs].join(':');};
let codeCache,admissionCache;
function codeHashes(){
 const identity=codeFiles.map(stamp).join('|');
 if(codeCache?.identity===identity)return codeCache.hashes;
 const hashes=codeFiles.map(file=>hash(fs.readFileSync(file,'utf8').replaceAll('\r\n','\n')));
 if(codeFiles.map(stamp).join('|')!==identity)throw new Error('Code changed while validating');
 codeCache={identity,hashes};return hashes;
}
// Frozen V4.9.4 corpus, packaged into each comparison so production needs no tests directory.
export const acceptedVisionCorpusHash='a2cec6d66c121dc6967e21ec7d98646aa952f316076779caa59fcad94a07dfae';
export function visionComparisonBinding(env,corpusHash=acceptedVisionCorpusHash){
 const catalog=createVisionModelCatalog(env);
 const profiles=['legacy-vision','vision-challenger'].map(id=>{
  const profile=catalog.profiles.find(p=>p.id===id);if(!profile||profile.capabilities.imageInput!==true)throw new Error('Both image profiles must be configured');
  return {profile,connectionIdentity:modelConnectionIdentity(profile,env)};
 });
 const code=codeHashes();
 return hash(JSON.stringify({corpusHash,profiles,code}));
}
export function validateVisionPromotion(comparison,approval,env=process.env){
 const reasons=[];
 try{
  if(comparison?.version!==1||comparison.kind!=='vision-comparison'||comparison.measurement!=='live')reasons.push('live_measurements_required');
  if(comparison?.completed===false||comparison?.progress&&comparison.progress.status!=='completed')reasons.push('complete_run_required');
  if(comparison?.corpusHash!==acceptedVisionCorpusHash||hash(JSON.stringify(comparison?.corpus,null,2)+'\n')!==acceptedVisionCorpusHash)reasons.push('frozen_corpus_required');
  if(comparison?.binding!==visionComparisonBinding(env))reasons.push('configuration_or_code_changed');
  if(approval?.reportHash!==hash(JSON.stringify(comparison))||approval?.visualReviewPassed!==true||approval?.rollbackVerified!==true||
   typeof approval?.approvedBy!=='string'||!approval.approvedBy.trim()||!Number.isFinite(Date.parse(approval.approvedAt))||!Number.isFinite(Date.parse(comparison.createdAt))||Date.parse(approval.approvedAt)<Date.parse(comparison.createdAt))reasons.push('operator_review_required');
  const expected=comparison?.corpus?.cases,results=comparison?.results;
  if(!Array.isArray(expected)||expected.length<40||!Array.isArray(results)||results.length!==expected.length||new Set(results.map(row=>row.id)).size!==results.length)reasons.push('complete_distinct_cases_required');
  else for(const item of expected){
   const row=results.find(row=>row.id===item.id);
   if(!row||row.originalSha256!==item.sha256){reasons.push('original_identity_mismatch');break;}
   for(const [arm,id] of [['baseline','legacy-vision'],['candidate','vision-challenger']]){
    const result=row[arm]?.response,profile=createVisionModelCatalog(env).profiles.find(p=>p.id===id);
    if(row[arm]?.error||!result||result.profile!==id||result.model!==profile.model||result.provider!==profile.provider||result.extraction?.trust!=='unverified'||result.extraction?.needsReview!==true){reasons.push('actual_extraction_identity_required');break;}
   }
   if(reasons.includes('actual_extraction_identity_required'))break;
   const baseline=gradeVisionTable(item.expected,row.baseline.response.text),candidate=gradeVisionTable(item.expected,row.candidate.response.text);
   if(!candidate.passed||visionMetrics.some(name=>candidate.metrics[name].score<baseline.metrics[name].score)){reasons.push('critical_quality_regression');break;}
   if(JSON.stringify(row.baseline.response.extraction.images)!==JSON.stringify(row.candidate.response.extraction.images)||
    !row.baseline.response.extraction.images?.length||row.baseline.response.extraction.images.some(image=>image.page!==item.page||!/^[a-f0-9]{64}$/.test(image.sha256))){reasons.push('same_images_required');break;}
  }
 }catch{reasons.push('invalid_comparison');}
 return {accepted:reasons.length===0,reasons:[...new Set(reasons)]};
}
export function visionRoutingStatus(env=process.env){
 if(env.FEATURE_VISION_ROUTING!=='true'){admissionCache=undefined;return {active:'legacy',reasons:[]};}
 try{
  const file=env.VISION_ACCEPTANCE_FILE;
  if(!file||fs.statSync(file).size>4*1024*1024)throw new Error();
  for(const profile of createVisionModelCatalog(env).profiles.filter(p=>p.purposes.includes('vision')))if(!resolveModelConnection(profile,env).key)return {active:'legacy',reasons:['credentials_required']};
  const identity=JSON.stringify([fs.realpathSync(file),stamp(file),visionComparisonBinding(env)]);
  if(admissionCache?.identity===identity)return structuredClone(admissionCache.status);
  const bundle=JSON.parse(fs.readFileSync(file,'utf8')),result=validateVisionPromotion(bundle.comparison,bundle.approval,env);
  if(JSON.stringify([fs.realpathSync(file),stamp(file),visionComparisonBinding(env)])!==identity)throw new Error();
  const status={active:result.accepted?'candidate':'legacy',reasons:result.reasons};
  admissionCache={identity,status};return structuredClone(status);
 }catch{admissionCache=undefined;return {active:'legacy',reasons:['acceptance_missing_or_invalid']};}
}
export function configuredVisionProfile(env=process.env,requested){
 const id=requested??(visionRoutingStatus(env).active==='candidate'?'vision-challenger':'legacy-vision');
 if(!['legacy-vision','vision-challenger'].includes(id)||id==='vision-challenger'&&visionRoutingStatus(env).active!=='candidate')throw new Error('Vision promotion no longer accepted');
 if(id==='legacy-vision')return createLegacyModelCatalog(env).profiles.find(p=>p.id===id);
 return createVisionModelCatalog(env).profiles.find(p=>p.id===id);
}
