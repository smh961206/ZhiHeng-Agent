import test from 'node:test';
import assert from 'node:assert/strict';
import {valuationFamily,valuationIssues} from '../shared/valuation-policy.mjs';
import {createResearchPlan,frameworkVersion} from '../shared/research-framework.mjs';
import {validateReview,reviewContract} from '../server/research-output.mjs';
import {knowledgeManifest} from '../server/knowledge.mjs';
import {researchResume,resumeScope,resumeSummary} from '../server/research-resume.mjs';
import {retryNotice} from '../shared/research-recovery.mjs';
import {prepareResearchRetry} from '../server/research-retry.mjs';
import {reviewFixture} from './fixtures/research-review.mjs';

test('valuation aliases, scenarios and auxiliary yield anchors cannot manufacture independent models',()=>{
 for(const method of ['PE（TTM）','P/E','PB估值','PE / ROE','正常化ROE×权益×PE','正常化盈利估值','EV/EBITDA'])assert.equal(valuationFamily(method),'multiples',method);
 for(const methods of [['DCF (FCFF)','FCFE现金流折现'],['DCF悲观情景','DCF乐观情景'],['PE（TTM）','PB估值'],['DCF','股息收益率锚']])assert.ok(valuationIssues({status:'supported',methods},{mode:'B',depth:'Deep'}).length,methods.join(','));
 assert.equal(valuationIssues({status:'supported',methods:['FCFF','PE（TTM）']},{mode:'B',depth:'Deep'}).length,0);
 assert.ok(valuationIssues({status:'supported',methods:['股息收益率锚']},{mode:'F'}).length);
 assert.equal(valuationIssues({status:'limited',methods:['股息收益率锚']},{mode:'F'}).length,0);
 for(const method of ['P₂ 修正式','市赚率第二公式','行业龙头锚','价格锚','N修正系数'])assert.ok(valuationIssues({status:'limited',methods:[method]}).length,method);
});

test('every path shares the execution policy and final review rejects invalid model combinations',()=>{
 for(const mode of ['A','B','C','D','E','F']){
  const plan=createResearchPlan({mode,question:'合成研究'});
  assert.ok(plan.valuationPolicy.guidance);assert.ok(reviewContract(plan).constraints.includes(plan.valuationPolicy.constraints[1]));
 }
 const input={mode:'B',depth:'Deep',question:'合成验证'},plan=createResearchPlan(input),sources=[{id:'S1',text:'合成证据'}];
 const review=reviewFixture(input);
 review.decision.valuation={status:'supported',methods:['DCF (FCFF)','DCF (FCFE)'],explanation:'合成测试'};
 assert.throws(()=>validateReview(review,{input,plan,sources}),/独立方法/);
 review.decision.valuation.methods=['DCF','PE（TTM）'];
 assert.equal(validateReview(review,{input,plan,sources}).validation.checks.find(item=>item.id==='valuation').passed,true);
});

test('same-version rule edits invalidate private checkpoints without changing historical completed reports',()=>{
 const job={status:'failed',mode:'B',input:{question:'合成研究'},plan:{version:frameworkVersion,knowledge:structuredClone(knowledgeManifest)}};
 job.checkpoint={version:1,scope:resumeScope(job),phase:'research',toolRecords:[],evidence:[]};
 assert.ok(researchResume(job));
 job.plan.knowledge.reverse();assert.ok(researchResume(job),'manifest order is immaterial');
 job.plan.knowledge[0].sha256='updated-content';
 assert.equal(researchResume(job),null);assert.equal(resumeSummary(job).reason,'rules_changed');
 assert.match(retryNotice({...job,resume:resumeSummary(job)}),/规则内容已更新/);
 job.status='completed';const before=structuredClone(job);assert.deepEqual(resumeSummary(job),{available:false});assert.deepEqual(job,before);
});

test('retry rebuilds a changed-rule task from its input instead of carrying old evidence or conversations forward',async()=>{
 const input={mode:'B',question:'苹果公司长期投资价值',depth:'Standard',securities:[{market:'US',symbol:'AAPL'}],sources:[{id:'S1',text:'旧规则资料'}]};
 const job={id:'fixture',createdAt:'2026-09-08',status:'failed',mode:'B',input,plan:createResearchPlan(input)};
 job.plan.knowledge=knowledgeManifest.map(item=>({...item,sha256:'old'}));
 job.checkpoint={version:1,scope:resumeScope(job),phase:'research',toolRecords:[],evidence:[],messages:[{role:'system',content:'旧提示词'}]};
 const before=structuredClone(job),next=await prepareResearchRetry(job,async()=>null);
 assert.deepEqual(job,before);assert.equal(next.status,'queued');assert.equal(next.checkpoint,undefined);
 assert.deepEqual(next.input.sources,[]);assert.deepEqual(next.plan.knowledge,knowledgeManifest);
 assert.equal(next.events[0].restartReason,'rules_changed');assert.match(next.events[0].message,/规则内容已更新/);
 assert.equal(next.plan.valuationPolicy.guidance,createResearchPlan(input).valuationPolicy.guidance);
});
