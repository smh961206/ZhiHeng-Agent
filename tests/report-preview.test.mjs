import test from 'node:test';
import assert from 'node:assert/strict';
import {reportPreview} from '../shared/report-preview.mjs';
import {createResearchPlan,modes} from '../shared/research-framework.mjs';

test('plain Markdown keeps headings, tables, citations and inline formulas',()=>{
 const markdown='# 现金流研究\n\n引用[S1]；公式`PE / ROE`。\n\n| 指标 | 数值 |\n| --- | --- |\n| 现金流 | 100 |\n';
 assert.equal(reportPreview(markdown),markdown);
 assert.equal(reportPreview('[S1] 资料不足'), '[S1] 资料不足');
});

test('a report wrapped in Markdown fences remains readable at every streaming boundary',()=>{
 const body='# 现金流草稿\n\n利润与现金流需要交叉验证。[S1]\n';
 for(const fence of ['```markdown','```md','~~~markdown']){
  const wrapped=fence+'\n'+body+'\n'+fence.slice(0,3);
  for(let end=1;end<=wrapped.length;end++){
   const preview=reportPreview(wrapped.slice(0,end));
   assert.ok((body+'\n').startsWith(preview),'Only report text may appear, including while a fence is incomplete');
  }
  assert.equal(reportPreview(wrapped),body+'\n');
 }
});

test('structured draft JSON is withheld until complete and only report sections are shown',()=>{
 for(const mode of Object.keys(modes)){
  const plan=createResearchPlan({mode,depth:'Standard'},mode);
  const sections=plan.output.sections.map(section=>({id:section.id,text:'合成段落："现金流"。\n\n证据[S1]，路径C:\\研究。'})).reverse();
  const raw=JSON.stringify({sections,audit:'PRIVATE AUDIT',decision:{gates:['PRIVATE GATE']}});
  for(let end=1;end<raw.length;end++)assert.equal(reportPreview(raw.slice(0,end),plan),'');
  const expected=plan.output.sections.map(section=>'## '+section.title+'\n\n'+sections.find(item=>item.id===section.id).text).join('\n\n');
  assert.equal(reportPreview(raw,plan),expected);
  assert.equal(reportPreview('```json\n'+raw+'\n```',plan),expected);
  assert.doesNotMatch(reportPreview(raw,plan),/PRIVATE|"sections"|"decision"|\\n/);
 }
});

test('legacy report envelopes decode their text, while broken or unrelated objects stay hidden',()=>{
 const markdown='# 可读草稿\n\n中文与转义引号"。';
 assert.equal(reportPreview(JSON.stringify({report:markdown,audit:'private'})),markdown);
 assert.equal(reportPreview(JSON.stringify(markdown)),markdown);
 for(const raw of ['{','{"sections": [','{"sections": invalid}',JSON.stringify({tool_calls:[{arguments:{pe:12}}]}),'```json\n{"sections":','```python\nprint("test")\n```','```markdown','[ {"id":"tool"} ]'])assert.equal(reportPreview(raw),'');
 assert.equal(reportPreview(JSON.stringify({sections:[null,{text:42},{id:'unknown',text:'UNKNOWN SECTION'}]}),createResearchPlan({mode:'B'})),'');
});
