export function webEvidenceProgress(job){
 const web=job?.webResearch,followup=job?.evidenceFollowup||job?.result?.evidenceFollowup;
 const checks=followup?.checks||[],unresolved=checks.filter(check=>check.status!=='evidence-located');
 const linked=new Set(unresolved.map(check=>check.webGapId).filter(Boolean));
 const gaps=(web?.gaps||[]).filter(gap=>gap.status!=='evidence-located'&&!linked.has(gap.id));
 return {web,followup,checks,unresolved,gaps,remaining:unresolved.length+gaps.length,searches:web?.searchCount||0,sources:new Set(web?.sourceIds||[]).size,
  reusedSearches:web?.reusedSearches||0,duplicateCandidates:web?.duplicateCandidates||0};
}
