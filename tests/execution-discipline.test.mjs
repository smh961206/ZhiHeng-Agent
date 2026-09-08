import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createResearchPlan,frameworkVersion,resolveMode,researchActions} from '../shared/research-framework.mjs';
import {knowledgeManifest,getAuditRules,chapterRules,planTaskRules,planRuleContext,searchRules} from '../server/knowledge.mjs';
import {reviewContract,validateReview} from '../server/research-output.mjs';
import {reviewJsonSchema} from '../server/review-format.mjs';
import {reviewFixture} from './fixtures/research-review.mjs';
import {prohibitions} from '../src/config/research-reference.js';
import {runAgent} from '../server/agent.mjs';

const input={mode:'E',question:'复盘卖出后上涨，是否重新买入？',sources:[{id:'S1',title:'合成资料',text:'测试证据，不是真实研究。'}]};
const plan=createResearchPlan(input);
const validate=value=>validateReview(value,{input,plan,sources:input.sources});

test('V4.2 documents, handbook prohibitions and execution chapter retrieval stay aligned',()=>{
 assert.equal(frameworkVersion,'4.7');
 assert.ok(knowledgeManifest.every(item=>item.version.replace(/-core$/,'')===frameworkVersion));
 assert.ok(knowledgeManifest.every(item=>item.updatedAt==='2026-09-08'));
 const full=chapterRules(17)+'\n'+chapterRules(18);
 const chapter=full.split('# 17. 禁止事项')[1].split('# 18.')[0];
 const rows=[...chapter.matchAll(/^(\d+)\. (.+)$/gm)].map(match=>({number:Number(match[1]),text:match[2].trim()}));
 assert.deepEqual(prohibitions,rows);
 assert.match(getAuditRules(),/V4.2 Execution Audit/);
 assert.match(planTaskRules(plan),/12.3 V4.2 分批减仓与退出分流/);
 assert.match(planRuleContext(plan),/交易复盘记录/);
 assert.match(searchRules('V4.2 执行纪律').sections.map(item=>item.content).join('\n'),/Portfolio Reduce/);
});

test('execution tasks extend the existing mode; ordinary and Quick tasks preserve scope',()=>{
 for(const question of ['减仓后如何复评','清空持仓','重新买入','交易复盘：我卖飞了'])assert.equal(resolveMode({question}),'E');
 for(const question of ['研究公司价值','对比两家公司','分析组合集中风险','分析大股东减持公告对公司价值的影响'])assert.equal(createResearchPlan({question}).execution,undefined);
 for(const mode of ['A','B','C','D','E','F']){
  const current=createResearchPlan({...input,mode,depth:'Standard'});
  assert.equal(current.mode,mode);
  assert.equal(Boolean(current.execution),mode!=='A');
  if(mode==='A')assert.deepEqual(current.output.actions,['淘汰','观察池','深度研究']);
 }
 assert.equal(createResearchPlan({...input,mode:'B',depth:'Quick'}).execution,undefined);
 assert.deepEqual(plan.output.actions,researchActions);
 assert.ok(plan.output.sections.some(item=>item.id==='execution'));
 assert.ok(plan.output.sections.some(item=>item.id==='transactionReview'));
 assert.match(plan.constraints.join('\n'),/不编造具体权重或交易数量/);
 assert.equal(plan.researchApproach.steps.at(-1).id,'execution');
 assert.equal(plan.execution.checks.length,10);
 const contextPlan=createResearchPlan({mode:'B',question:'研究公司风险',portfolio:'计划因超配减仓，请核对分批条件。'});
 assert.ok(contextPlan.execution);assert.equal(contextPlan.mode,'B');
});

test('agent uses V4.2 execution requirements through draft, audit and final delivery',async()=>{
 const original=global.fetch,requests=[];
 try{
  global.fetch=async(_url,options)=>{
   const body=JSON.parse(options.body);requests.push(body);
   return Response.json({choices:[{message:{role:'assistant',content:requests.length===1?'合成执行研究草稿[S1]':JSON.stringify(reviewFixture(input))}}]});
  };
  const job={mode:'E',input:structuredClone(input)};
  const result=await runAgent(job,()=>{},new AbortController().signal);
  assert.match(requests[0].messages[0].content,/V4.2/);
  assert.ok(requests[1].response_format.json_schema.schema.required.includes('executionAudit'));
  assert.match(result.audit,/交易复盘的四层归因/);
  assert.match(result.report,/组合动作与执行条件/);
 }finally{global.fetch=original;}
});

test('execution audit is required by both model contract and transport schema',()=>{
 const contract=reviewContract(plan),schema=reviewJsonSchema(plan);
 assert.equal(contract.schema.executionAudit.length,10);
 assert.ok(schema.required.includes('executionAudit'));
 assert.deepEqual(schema.properties.executionAudit.items.properties.id.enum,plan.execution.checks.map(item=>item.id));
 assert.equal(reviewJsonSchema(createResearchPlan({question:'研究公司价值'})).properties.executionAudit,undefined);
});

test('execution checks reach audit output with reasons; missing or failed checks block publication',()=>{
 const result=validate(reviewFixture(input));
 assert.match(result.audit,/执行纪律复核/);
 assert.match(result.audit,/近端事件与资料缺口/);
 assert.match(result.report,/交易复盘与重新买入核验/);
 assert.equal(result.executionAudit.length,10);
 assert.doesNotMatch(result.auditNarrative,/执行纪律复核/);
 const cited=reviewFixture(input);cited.executionAudit[0].reason='资料待核实【S1】';
 assert.deepEqual(validate(cited).executionAudit[0].sourceIds,['S1']);
 for(const mutate of [value=>delete value.executionAudit,value=>value.executionAudit.pop(),value=>value.executionAudit[1]=value.executionAudit[0],value=>value.executionAudit[0].status='failed',value=>value.executionAudit[0].status='not_applicable',value=>value.executionAudit[1].reason='']){
  const value=reviewFixture(input);mutate(value);assert.throws(()=>validate(value),/执行/);
 }
 const value=reviewFixture(input);value.executionAudit[0].reason='伪造来源[S99]';assert.throws(()=>validate(value),/不存在/);
 const notApplicable=reviewFixture(input);notApplicable.executionAudit[5]={id:'near-term-events',status:'not_applicable',reason:'本次仅复盘历史交易，不涉及当日或立即减仓。'};
 assert.match(validate(notApplicable).audit,/不适用：本次仅复盘历史交易/);
});
