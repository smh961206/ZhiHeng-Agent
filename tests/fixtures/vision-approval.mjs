// Synthetic gate fixture ONLY: never export this as real model quality acceptance.
import {loadVisionCorpus,visionHash} from '../../scripts/vision-benchmark.mjs';
import {visionComparisonBinding} from '../../server/vision-policy.mjs';
import {createVisionModelCatalog} from '../../server/model-catalog.mjs';
export function visionApprovalFixture(env){
 const {manifest,hash}=loadVisionCorpus(),catalog=createVisionModelCatalog(env);
 const comparison={version:1,kind:'vision-comparison',measurement:'live',corpus:manifest,corpusHash:hash,binding:visionComparisonBinding(env),createdAt:'2026-09-01T00:00:00Z',
  results:manifest.cases.map(item=>({id:item.id,originalSha256:item.sha256,...Object.fromEntries([['baseline','legacy-vision'],['candidate','vision-challenger']].map(([arm,id])=>{
   const profile=catalog.profiles.find(p=>p.id===id);
   return [arm,{response:{profile:id,model:profile.model,provider:profile.provider,text:JSON.stringify(item.expected),
    extraction:{trust:'unverified',needsReview:true,images:[{page:1,region:'synthetic gate fixture',sha256:item.sha256}]}}}];
  }))}))};
 return {comparison,approval:{reportHash:visionHash(JSON.stringify(comparison)),visualReviewPassed:true,rollbackVerified:true,approvedBy:'synthetic unit test only',approvedAt:'2026-09-02T00:00:00Z'}};
}
