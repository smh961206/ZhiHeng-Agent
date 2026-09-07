import test from 'node:test';
import assert from 'node:assert/strict';
import {createWebResearchSession,validateWebResearchReview} from '../server/web-research.mjs';
import {searchEvidence} from '../server/evidence-search.mjs';
import {webEvidenceProgress} from '../shared/web-evidence-progress.mjs';
import {runAgent} from '../server/agent.mjs';
import {reviewFixture} from './fixtures/research-review.mjs';
const text='合成行业统计：本期样本范围及收入构成须按报告期间单独核对，不能用关键词命中代替事实验证。'.repeat(8);
const url='https://www.stats.gov.cn/synthetic.html';
function fixture(options={}){
 const job={input:{securities:[{market:'CN',symbol:'600519'},{market:'CN',symbol:'002594'}],sources:[]}},queries=[],reads=[];
 const web=createWebResearchSession({job,searchLocal:searchEvidence,archive:null,status:{enabled:true,configured:true},
  searchWeb:async query=>{queries.push(query);return {candidates:[{url}]};},
  readDocument:async(candidate,{security})=>{reads.push(candidate.url);return {type:'web-evidence',documentRead:true,url:candidate.url,security,text,title:'合成原文',authorityVerified:true,publishedAt:'2026-08-01',metadataWarnings:[]};},...options});
 const search=(gap='合成缺口：待核对行业统计口径',security='CN:600519',query='行业统计')=>web.search({retrievalId:web.local({query,security}).retrievalId,gap});
 return {job,web,queries,reads,search};
}
test('same query reuses read originals after budget exhaustion but never inherits another gap resolution',async()=>{
 const h=fixture({limits:{searches:1,documents:1,seconds:180}}),first=await h.search();
 h.web.local({query:'行业统计',sourceId:first.sourceIds[0]});
 h.web.resolve({gapId:first.id,sourceId:first.sourceIds[0],quote:text.slice(0,60),explanation:'合成原文列示需要独立核对的报告范围'});
 const second=await h.search('合成的另一缺口：核对行业统计样本');
 assert.equal(h.queries.length,1);assert.equal(h.reads.length,1);assert.equal(h.web.state.searchCount,1);assert.equal(h.web.state.documentAttempts,1);
 assert.equal(second.reusedFrom,first.id);assert.equal(second.status,'body-read-needs-review');assert.equal(second.resolution,undefined);
 assert.deepEqual(second.sourceIds,first.sourceIds);assert.equal(h.job.input.sources.length,1);assert.equal(h.web.state.reusedSearches,1);
 assert.throws(()=>validateWebResearchReview({decision:{missingData:[],gates:[{id:'data',status:'passed'}]}},h.web.state),/G2/);
});
test('reused discovery retains missing-date and stale-discovery limitations',async()=>{
 const archive={get:async()=>({fetchedAt:'2025-01-01',candidates:[{url}]}),put:async()=>{}};
 const h=fixture({archive,searchWeb:async()=>({status:'failed',candidates:[]}),readDocument:async(candidate,{security})=>({type:'web-evidence',documentRead:true,url:candidate.url,security,text,publishedAt:null,metadataWarnings:['发布日期未知']})});
 const first=await h.search(),next=await h.search('合成的另一缺口：行业统计期间');
 assert.equal(next.discoveryStale,true);assert.deepEqual(next.limitations,first.limitations);assert.match(next.limitations.join(' '),/发布日期未知/);
 h.web.local({query:'行业统计',sourceId:first.sourceIds[0]});
 assert.equal(h.web.resolve({gapId:next.id,sourceId:next.sourceIds[0],quote:text.slice(0,60),explanation:'合成原文仅能定位统计口径，发布日期待核对'}).status,'evidence-with-limitations');
});
test('duplicates do not consume the three-document allowance or hide later distinct candidates',async()=>{
 const links=[url,url+'#page1',url+'#page2','https://www.stats.gov.cn/second.html','https://www.stats.gov.cn/third.html'];
 const h=fixture({searchWeb:async()=>({candidates:links.map(url=>({url}))})});await h.search();
 assert.equal(h.reads.length,3);assert.equal(new Set(h.reads).size,3);assert.equal(h.web.state.documentAttempts,3);
 assert.equal(h.web.state.duplicateCandidates,2);assert.equal(h.web.state.gaps[0].candidateCount,3);
});
test('different securities or queries do not share a lookup, and provider failure remains retryable',async()=>{
 const h=fixture();await h.search();await h.search('合成缺口：另一主体行业统计','CN:002594');await h.search('合成缺口：核对资本开支','CN:600519','资本开支');
 assert.equal(h.queries.length,3);assert.equal(h.web.state.reusedSearches,0);
 let calls=0;const retry=fixture({searchWeb:async()=>++calls===1?{status:'failed',candidates:[]}:{candidates:[{url}]}});
 await retry.search();assert.ok((await retry.search()).sourceIds.length);assert.equal(calls,2);
});
test('progress counts unresolved web gaps without double-counting linked follow-up checks',()=>{
 const job={webResearch:{searchCount:1,sourceIds:['S1','S1'],reusedSearches:1,duplicateCandidates:2,gaps:[{id:'G1',status:'evidence-located'},{id:'G2',status:'body-read-needs-review'},{id:'G3',status:'failed'}]}};
 assert.equal(webEvidenceProgress(job).remaining,2);assert.equal(webEvidenceProgress(job).sources,1);
 job.evidenceFollowup={checks:[{id:'F1',webGapId:'G2',status:'unresolved'},{id:'F2',status:'not-searchable'}]};
 assert.equal(webEvidenceProgress(job).remaining,3);assert.equal(webEvidenceProgress(job).reusedSearches,1);
 job.evidenceFollowup.checks[0].status='evidence-located';assert.equal(webEvidenceProgress(job).remaining,3,'A still-open web gap cannot disappear behind a resolved follow-up');
 assert.equal(webEvidenceProgress({}).remaining,0);
});
test('full research and audit retain an independently unresolved reused gap while making only one external search',async()=>{
 const original=global.fetch,job={mode:'B',input:{mode:'B',question:'合成行业研究',depth:'Standard',sources:[{id:'S1',type:'official-report',official:true,security:'CN:600519',text:'合成现有行业资料，须查证样本与报告期间。'}]}};
 let step=0,searches=0,reads=0;
 const calls=[['search_evidence',{query:'行业统计',security:'CN:600519'}],['search_web',{retrievalId:'R1',gap:'第一项合成缺口：行业统计范围'}],['search_evidence',{query:'行业统计',sourceId:'S2'}],['resolve_web_gap',{gapId:'G1',sourceId:'S2',quote:text.slice(0,60),explanation:'合成连续原文摘录说明第一项统计范围'}],['search_evidence',{query:'行业统计',security:'CN:600519'}],['search_web',{retrievalId:'R3',gap:'第二项合成缺口：行业统计报告期间'}]];
 global.fetch=async(_url,options)=>{
  const request=JSON.parse(options.body),index=step++;let message;
  if(index<calls.length){const [name,args]=calls[index];message={role:'assistant',tool_calls:[{id:'synthetic-'+index,type:'function',function:{name,arguments:JSON.stringify(args)}}]};}
  else if(index===calls.length)message={role:'assistant',content:'合成报告依据[S2]，仍有报告期间待核实。'};
  else{
   const audit=JSON.parse(request.messages[1].content);assert.equal(audit.webResearch.gaps[1].reusedFrom,'G1');assert.equal(audit.webResearch.gaps[1].status,'body-read-needs-review');
   assert.ok(audit.toolEvidence.some(item=>item.toolName==='search_web'&&item.result.reusedFrom==='G1'));
   const review=reviewFixture(job.input,'S2');review.decision.missingData=['[G2] 合成统计报告期间仍待核实'];message={role:'assistant',content:JSON.stringify(review)};
  }
  return Response.json({choices:[{message}]});
 };
 try{
  const result=await runAgent(job,()=>{},new AbortController().signal,{webSession:options=>createWebResearchSession({...options,archive:null,status:{enabled:true,configured:true},searchWeb:async()=>{searches++;return {candidates:[{url}]};},readDocument:async(candidate,{security})=>{reads++;return {type:'web-evidence',documentRead:true,url:candidate.url,security,text,authorityVerified:true,publishedAt:'2026-08-01',metadataWarnings:[]};}})});
  assert.equal(searches,1);assert.equal(reads,1);assert.equal(step,8);assert.match(result.decision.missingData.join(' '),/G2/);assert.equal(job.input.sources.length,2);
 }finally{global.fetch=original;}
});
