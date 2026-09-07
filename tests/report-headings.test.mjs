import test from 'node:test';
import assert from 'node:assert/strict';
import {deduplicateReportHeadings,reportSectionBody} from '../shared/report-headings.mjs';
import {createResearchPlan} from '../shared/research-framework.mjs';
import {validateReview} from '../server/research-output.mjs';
import {reviewFixture} from './fixtures/research-review.mjs';
import {reportPreview} from '../shared/report-preview.mjs';
import {exportResearchMarkdown} from '../shared/research-export.mjs';

test('consecutive duplicate headings collapse across whitespace and dividers, retaining the canonical level',()=>{
 const raw='## 行业与竞争\r\n\r\n---\r\n\r\n### **行业与竞争** ###\r\n\r\n竞争证据[S1]\r\n';
 const result=deduplicateReportHeadings(raw);
 assert.equal((result.match(/行业与竞争/g)||[]).length,1);
 assert.match(result,/^## 行业与竞争/);assert.match(result,/竞争证据\[S1\]/);
 assert.equal(deduplicateReportHeadings(result),result);
 assert.equal(reportSectionBody('行业与竞争','## 行业与竞争\n\n竞争证据[S1]'),'竞争证据[S1]');
});
test('Setext copies are removed without deleting the following content',()=>{
 const raw='## 后续验证\n\n后续验证\n----\n\n| 指标 | 期间 |\n|---|---|\n| 利润 | 半年 |';
 const result=deduplicateReportHeadings(raw);
 assert.equal((result.match(/后续验证/g)||[]).length,1);assert.match(result,/\| 利润 \| 半年 \|/);
});
test('repeated titles with intervening body, different subheadings, quotes and code remain unchanged',()=>{
 for(const raw of [
  '## 财务质量\n\n第一家公司\n\n## 财务质量\n\n第二家公司',
  '## 财务质量\n\n### 利润质量\n\n资料不足',
  '## 财务质量\n\n> ## 财务质量\n\n引用原文',
  '```md\n## 财务质量\n\n## 财务质量\n```\n',
  '~~~markdown\n## 财务质量\n## 财务质量\n~~~\n',
  '    ## 财务质量\n    ## 财务质量\n',
  '## 财务质量[S1]\n\n## 财务质量[S2]\n',
 ])assert.equal(deduplicateReportHeadings(raw),raw);
});
test('review strips model chapter wrappers, keeps subsections and rejects title-only sections',()=>{
 const input={mode:'B',depth:'Deep',question:'合成研究'},plan=createResearchPlan(input),sources=[{id:'S1',title:'合成资料',text:'合成证据'}];
 const value=reviewFixture(input),title=plan.output.sections[0].title;
 value.sections[0].text=`## ${title}\n\n### 待验证问题\n\n合成证据[S1]`;
 const result=validateReview(value,{input,plan,sources});
 assert.equal((result.report.match(new RegExp(title,'g'))||[]).length,1);
 assert.match(result.sections[0].text,/^### 待验证问题/);
 value.sections[0].text=`## ${title}`;
 assert.throws(()=>validateReview(value,{input,plan,sources}),/缺少正文/);
});
test('structured previews and both export modes clean legacy headings without changing the saved report or tool records',()=>{
 const title='后续验证与判断升级条件',raw=`## ${title}\n\n## ${title}\n\n合成条件[S1]`;
 const plan={output:{sections:[{id:'monitoring',title}]}};
 const preview=reportPreview(JSON.stringify({sections:[{id:'monitoring',text:raw}]}),plan);
 assert.equal((preview.match(new RegExp(title,'g'))||[]).length,1);
 const job={mode:'B',input:{question:'测试研究'},result:{report:raw},events:[{type:'tool_result',message:'真实工具返回',result:{text:'## 原文\n\n## 原文'}}]};
 for(const includeResearchProcess of [true,false]){
  const output=exportResearchMarkdown(job,{includeResearchProcess});
  assert.equal((output.match(new RegExp(title,'g'))||[]).length,1);
  assert.match(output,/合成条件\[S1\]/);
 }
 assert.equal(job.result.report,raw);assert.equal(job.events[0].result.text,'## 原文\n\n## 原文');
});
