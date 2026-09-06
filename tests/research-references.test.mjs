import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSourceReferences,sourceReferenceIds} from '../server/research-references.mjs';
import {reviewContract,validateReview} from '../server/research-output.mjs';
import {createResearchPlan} from '../shared/research-framework.mjs';
import {runAgent} from '../server/agent.mjs';
import {reviewFixture} from './fixtures/research-review.mjs';

const input={question:'引用交付回归测试',mode:'A',securities:[]};
const plan=createResearchPlan(input);
const sources=[{id:'S1',type:'official-report',text:'合成原文，仅用于测试。',title:'合成财报'},
 {id:'S2',type:'vendor-financials',text:'合成资料。'},
 {id:'S9',type:'filing-index',text:'目录'},
 {id:'S13',type:'data-check',text:'覆盖检查'},
 {id:'S14',type:'search-summary',text:'搜索摘要不能用作证据'}];
const validate=value=>validateReview(value,{input,plan,sources});
const uncited=()=>{const value=reviewFixture(input);value.sections.forEach(section=>section.text='资料不足，保留待验证问题。');return value;};

test('已明确的中文括号、页码和合并引用统一格式，原文数值与期间保持不变',()=>{
 const raw='2025年收入100（S1 p80），比较期90【S2】。原文（S1/S2）、[S1, S2]、［S1］，附注（S1 第40—42页）。';
 const normalized=normalizeSourceReferences(raw);
 assert.equal(normalized,'2025年收入100[S1] p80，比较期90[S2]。原文[S1] [S2]、[S1] [S2]、[S1]，附注[S1] 第40—42页。');
 assert.deepEqual(sourceReferenceIds(normalized),['S1','S2']);
 assert.equal(normalizeSourceReferences(normalized),normalized);
});

test('失败任务中的裸编号来源列能够识别，普通单元格与正文产品编号不被补挂引用',()=>{
 const raw='产品S1，不是证据。\n\n| 年度 | 产品 | 来源 |\n|---|---|---|\n| 2025 | S1 | S2 |\n| 2024 | S2 | S1/S2 |';
 assert.equal(normalizeSourceReferences(raw),'产品S1，不是证据。\n\n| 年度 | 产品 | 来源 |\n|---|---|---|\n| 2025 | S1 | [S2] |\n| 2024 | S2 | [S1] [S2] |');
 assert.deepEqual(sourceReferenceIds(normalizeSourceReferences('产品 S1，2025年数据不足；来源未取得。')),[]);
 assert.equal(normalizeSourceReferences('| 产品 |\n|---|\n| S1 |'),'| 产品 |\n|---|\n| S1 |');
});

test('代码示例、图片标签、链接地址与转义文本不能充当证据',()=>{
 for(const raw of ['`[S1]`','```md\n[S1]\n```','~~~\n[S1]\n~~~','```md\n[S1]',
  '![S1](https://example.org/image.png)','[链接](S1)','https://example.org/[S1]','\\[S1]']){
  assert.equal(normalizeSourceReferences(raw),raw);
  assert.deepEqual(sourceReferenceIds(raw),[],raw);
  const value=uncited();value.sections[0].text=raw;assert.throws(()=>validate(value),/正文未关联/);
 }
 assert.deepEqual(sourceReferenceIds('[S1](https://example.org/report.pdf)'),['S1']);
});

test('规范化仅处理已有引用，不修改输入对象，并记录最终正文实际来源',()=>{
 const value=uncited();value.sections[0].text='已读合成原文（S1 p80）。';
 const original=structuredClone(value);const result=validate(value);
 assert.match(result.report,/已读合成原文\[S1\] p80/);
 assert.equal(result.validation.referenceFormatNormalized,true);
 assert.deepEqual(result.validation.citedSourceIds,['S1']);
 assert.deepEqual(value,original);
 assert.equal(validate(reviewFixture(input)).validation.referenceFormatNormalized,false);
});

test('无效来源、仅摘要引用以及仅目录引用仍然拒绝发布，多个引用缺陷一次返回',()=>{
 const value=uncited();value.researchSummary.checks[0].sourceIds=['S9','S13','S99'];
 assert.throws(()=>validate(value),error=>{
  assert.match(error.message,/无效证据/);assert.match(error.message,/正文未关联/);
  assert.deepEqual(error.validationIssues.map(issue=>issue.code),['invalid_summary_reference','missing_body_reference']);
  assert.equal(error.validationIssues[0].path,'researchSummary.checks[0].sourceIds');
  assert.deepEqual(error.validationIssues[0].sourceIds,['S9','S13','S99']);return true;
 });
 for(const id of ['S9','S13','S14','S99']){
  const bad=uncited();bad.sections[0].text='合成事实（'+id+'）。';
  assert.throws(()=>validate(bad),/有效财务证据/);
 }
 const unknown=reviewFixture(input);unknown.sections[0].text+='【S99】';assert.throws(()=>validate(unknown),/不存在/);
 const summaryOnly=uncited();summaryOnly.audit+=' [S1]';assert.throws(()=>validate(summaryOnly),/正文未关联/);
 const context=reviewFixture(input);context.decision.missingData.push('报告目录覆盖不足[S9]；口径检查受限[S13]。');
 assert.ok(validate(context).validation.citedSourceIds.includes('S9'));
});

test('未知资料编号即使与有效编号合写也不会漏检，缺口与规则编号不会变成来源',()=>{
 const bad=reviewFixture(input);bad.sections[0].text='合成事实[S1，S99]。';assert.throws(()=>validate(bad),/不存在/);
 assert.equal(normalizeSourceReferences('缺口[G1]，FULL 15.1，[历史:S1]，2025年数据不足。'),'缺口[G1]，FULL 15.1，[历史:S1]，2025年数据不足。');
 for(const mutate of [value=>value.audit+='【S99】',value=>value.decision.gates[0].reason+='（S99）',value=>value.researchSummary.checks[0].assessment+='[S99]']){
  const value=reviewFixture(input);mutate(value);assert.throws(()=>validate(value),/不存在/);
 }
});

test('复核协议明确正文引用与来源用途，一轮修正同时修好摘要和正文才交付',async()=>{
 const contract=reviewContract(plan,sources);
 assert.deepEqual(contract.references.evidenceSourceIds,['S1','S2']);
 assert.deepEqual(contract.references.coverageOnlySourceIds,['S9','S13']);
 assert.match(contract.schema.sections[0].text,/\[S1\]/);
 const previous=global.fetch;let calls=0;const events=[],job={mode:'A',input:{...input,sources}};
 global.fetch=async(_url,options)=>{
  const messages=JSON.parse(options.body).messages;let content;
  assert.match(messages[0].content,/引用协议/);
  if(++calls===1)content='合成草稿（S1 p80）。';
  else if(calls===2){
   const payload=JSON.parse(messages[1].content);assert.deepEqual(payload.contract.references.evidenceSourceIds,['S1','S2']);assert.equal(payload.draft,'合成草稿[S1] p80。');
   const bad=uncited();bad.researchSummary.checks[0].sourceIds=['S13'];content=JSON.stringify(bad);
  }else{
   assert.match(messages.at(-1).content,/invalid_summary_reference/);assert.match(messages.at(-1).content,/missing_body_reference/);
   assert.match(messages.at(-1).content,/保留已有效关联/);assert.match(messages.at(-1).content,/无法核实的事实删除或标明数据不足/);
   const fixed=uncited();fixed.sections[0].text='合成原文（S1 p80），数据不足部分仍待核实。';content=JSON.stringify(fixed);
  }
  return Response.json({choices:[{message:{role:'assistant',content}}]});
 };
 try{
  const result=await runAgent(job,(...event)=>events.push(event),new AbortController().signal);
  assert.equal(calls,3);assert.match(result.report,/\[S1\] p80/);assert.equal(job.draft,'合成草稿（S1 p80）。');
  const failures=events.filter(event=>event[0]==='audit_validation');assert.equal(failures.length,1);assert.equal(failures[0][2].issues.length,2);
 }finally{global.fetch=previous;}
});

test('修正后仍没有正文依据时保持失败，程序不会把摘要编号强塞进报告',async()=>{
 const previous=global.fetch;let calls=0;const events=[],job={mode:'A',input:{...input,sources}};
 global.fetch=async()=>Response.json({choices:[{message:{role:'assistant',content:++calls===1?'资料不足的草稿。':JSON.stringify(uncited())}}]});
 try{
  await assert.rejects(runAgent(job,(...event)=>events.push(event),new AbortController().signal),/审计未通过，报告未发布：报告正文未关联资料ID/);
  assert.equal(calls,3);assert.equal(job.result,undefined);assert.equal(events.filter(event=>event[0]==='audit_validation').length,2);
  assert.equal(job.draft,'资料不足的草稿。');
 }finally{global.fetch=previous;}
});
