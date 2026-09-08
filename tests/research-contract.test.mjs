import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createResearchPlan,modes,portfolioFields,portfolioReadiness,frameworkVersion} from '../shared/research-framework.mjs';
import {knowledgeManifest,searchRules,indexRules,planRuleContext} from '../server/knowledge.mjs';
import {validateInput,route} from '../server/router.mjs';
import {validateReview} from '../server/research-output.mjs';
import {attachResearchBaseline} from '../server/research-baseline.mjs';
import {calculationBasis} from '../server/calculations.mjs';
import {runAgent} from '../server/agent.mjs';
import {reviewFixture} from './fixtures/research-review.mjs';

const security={market:'CN',symbol:'600519'};
const base={question:'合成测试研究',mode:'B',depth:'Standard',securities:[security]};
const sources=[{id:'S1',title:'合成证据',text:'合成财务数据，仅测试',type:'financial-report'}];
const validate=(review,input=base)=>validateReview(review,{input,plan:createResearchPlan(input),sources});

test('单一规则库版本与校验摘要可追溯，章节检索保留完整上下文',()=>{
 for(const source of knowledgeManifest){
  assert.equal(source.version.replace(/-core$/,''),frameworkVersion);
  assert.equal(source.sha256,createHash('sha256').update(readFileSync(new URL('../'+source.path,import.meta.url))).digest('hex'));
 }
 const indexed=indexRules('# 1. Main\nintro\n## Child\nbody\n```text\n# fake\n```\n# 2. Next\nend','test');
 assert.equal(indexed.length,3);assert.match(indexed[0].content,/body/);assert.doesNotMatch(indexed[0].content,/# 2/);
 const rules=searchRules('DCF 计算协议',{limit:1});assert.match(rules.sections[0].heading,/DCF 计算协议/);assert.equal(rules.sections[0].source,'knowledge/modules/rules/07-valuation.md');
 for(const [mode,title] of [['A','Quick Output'],['B','Standard Output'],['C','Update Output'],['D','Comparison Output'],['E','PORTFOLIO ENGINE'],['F','Dividend Output']])assert.ok(JSON.parse(planRuleContext(createResearchPlan({...base,mode}))).sections[0].heading.includes(title));
 assert.match(JSON.parse(planRuleContext(createResearchPlan({...base,depth:'Quick'}))).sections[0].heading,/Quick Output/);
});

test('主任务与必要辅助模块分开，初筛固定Quick，股东回报固定八年',()=>{
 assert.equal(route({question:'深度研究长期价值，关注股东回报'}),'B');
 assert.equal(route({question:'快速筛选高分红公司'}),'A');
 assert.equal(route({question:'对比现金流与股东回报'}),'D');
 const deep=createResearchPlan({...base,question:'长期价值与股东回报',depth:'Deep'});
 assert.deepEqual(deep.secondaryModules,['股东回报必要模块']);assert.equal(deep.output.schema,'Deep');
 assert.equal(createResearchPlan({...base,mode:'A',depth:'Deep'}).depth,'Quick');
 assert.deepEqual(createResearchPlan({...base,depth:'Quick'}).output.actions,['淘汰','观察池','深度研究']);
 assert.equal(createResearchPlan({...base,mode:'F',historyYears:3}).historyYears,8);
 for(const mode of Object.keys(modes))assert.ok(validate(reviewFixture({...base,mode}),{...base,mode}).report.includes('风险与证伪条件'));
});

test('旧报告只作为历史对照，当前标的匹配且历史来源不会混入新目录',async()=>{
 const id='00000000-0000-4000-8000-000000000001';
 const prior={id,status:'completed',input:base,result:{report:'旧结论[S1]',decision:{summary:'旧摘要[S1]'}}};
 const normalized=validateInput({...base,mode:'C',baselineJobId:id,previousResearch:'  旧假设  '});
 const current=await attachResearchBaseline(normalized,'C',async()=>prior);
 assert.equal(current.baseline.report,'旧结论[历史:S1]');assert.equal(current.baseline.decision.summary,'旧摘要[历史:S1]');
 assert.equal(current.previousResearch,'旧假设');prior.result.report='已改变';assert.equal(current.baseline.report,'旧结论[历史:S1]');
 await assert.rejects(attachResearchBaseline(normalized,'C',async()=>null),/不存在/);
 await assert.rejects(attachResearchBaseline(normalized,'C',async()=>({...prior,status:'running'})),/尚未完成/);
 await assert.rejects(attachResearchBaseline({...normalized,securities:[{market:'US',symbol:'AAPL'}]},'C',async()=>prior),/未覆盖/);
 assert.throws(()=>validateInput({...base,baselineJobId:'../../private'}),/编号无效/);
});

test('组合六项信息逐项校验，背景描述不自动代表具备仓位依据',()=>{
 const complete=Object.fromEntries(portfolioFields.map(field=>[field.id,'  测试 '+field.label+'  ']));
 const normalized=validateInput({...base,portfolioContext:complete});assert.equal(portfolioReadiness(normalized.portfolioContext).complete,true);
 for(const field of portfolioFields){const partial={...complete};delete partial[field.id];assert.equal(portfolioReadiness(partial).complete,false);}
 assert.equal(createResearchPlan({...base,portfolio:'我希望稳健投资'}).portfolio.complete,false);
 assert.throws(()=>validateInput({...base,portfolioContext:{weights:25}}),/持仓权重/);
 assert.throws(()=>validateInput({...base,previousResearch:'x'.repeat(30001)}),/30000/);
});

test('交付拒绝缺章、伪引用、无证伪、越权动作与虚高置信度',()=>{
 for(const [mutate,reason] of [
  [v=>v.sections.pop(),/章节/],
  [v=>v.sections[0].id=v.sections[1].id,/缺少或重复/],
  [v=>v.decision.action='立即买入',/研究动作/],
  [v=>v.decision.falsifiers=['条件一','条件一','条件一'],/重复/],
  [v=>v.decision.falsifiers.pop(),/证伪/],
  [v=>v.decision.dataAsOf='2026-02-30',/日期/],
  [v=>v.decision.confidence='高',/降低置信度/],
  [v=>v.decision.gates[0].status='failed',/未通过/],
  [v=>v.decision.portfolio.status='reviewed',/组合信息/],
  [v=>v.sections[0].text+='[S99]',/不存在/],
  [v=>{v.sections.forEach(section=>section.text='无引用正文');v.audit+='[S1]';},/正文未关联/],
 ]){const review=reviewFixture(base);mutate(review);assert.throws(()=>validate(review),reason);}
 const quick={...base,mode:'A'},review=reviewFixture(quick);review.decision.action='建仓候选';assert.throws(()=>validate(review,quick),/研究动作/);
 const update={...base,mode:'C'},changed=reviewFixture(update);changed.decision.action='升级';changed.decision.gates.forEach(gate=>gate.status='passed');assert.throws(()=>validate(changed,update),/建立本期基线/);
 assert.equal(validate(reviewFixture(update),update).decision.baselineStatus,'new_baseline');
 const withBaseline={...update,previousResearch:'真实提供的旧假设'};
 assert.equal(validate(reviewFixture(withBaseline),withBaseline).decision.baselineStatus,'compared');
});

test('用户问题中的来源标记不充作报告证据，也不误判为模型捏造引用',()=>{
 const input={...base,question:'解释旧研究[S99]的判断'};
 assert.ok(validate(reviewFixture(input),input).report.startsWith('# 解释旧研究[S99]'));
 const uncited=reviewFixture(base);uncited.sections.forEach(section=>section.text='未关联来源的章节');
 assert.throws(()=>validate(uncited,{...base,question:'研究测试[S1]'}),/正文未关联/);
});

test('深度研究不把同类倍数当独立模型，评分未知不记零且报告与结构化分值一致',()=>{
 const input={...base,depth:'Deep'},review=reviewFixture(input);
 review.decision.valuation={status:'supported',methods:['PE','PB'],explanation:'仅合成测试'};
 assert.throws(()=>validate(review,input),/独立方法/);
 review.decision.valuation.methods.push('FCFF');assert.equal(validate(review,input).decision.valuation.status,'supported');
 review.sections.find(section=>section.id==='scores').text='虚构总分100';
 const result=validate(review,input);assert.match(result.report,/不计算总分/);assert.doesNotMatch(result.report,/虚构总分100/);
 review.decision.scores[0].score=26;assert.throws(()=>validate(review,input),/分值/);
});

test('计算必须关联实际来源和口径',()=>{
 const basis={currency:'CNY',period:'FY2025',shareBasis:'普通股',assumptions:'合成正常化参数',sourceIds:['S1']};
 assert.equal(calculationBasis(basis,sources).period,'FY2025');
 assert.throws(()=>calculationBasis({...basis,period:''},sources),/期间/);
 assert.throws(()=>calculationBasis({...basis,sourceIds:['S99']},sources),/实际资料/);
 assert.throws(()=>calculationBasis(basis,[{id:'S1',type:'filing-index'}]),/目录/);
});

test('一次交付修正成功才发布，失败不会被包装成审计通过',async()=>{
 const previous=global.fetch;let calls=0;const events=[];
 const job={mode:'B',input:{...base,securities:[],sources}};
 global.fetch=async(_url,options)=>{
  calls++;let content;
  if(calls===1)content='模拟草稿[S1]';
  else if(calls===2){const broken=reviewFixture(base);broken.decision.falsifiers=[];content=JSON.stringify(broken);}
  else{assert.match(JSON.parse(options.body).messages.at(-1).content,/证伪/);content=JSON.stringify(reviewFixture(base));}
  return Response.json({choices:[{message:{role:'assistant',content}}]});
 };
 try{const result=await runAgent(job,(...event)=>events.push(event),new AbortController().signal);assert.equal(calls,3);assert.equal(result.framework.knowledge.length,knowledgeManifest.length);assert.equal(job.workflow.stages.at(-1).status,'completed');assert.equal(events.filter(event=>event[0]==='audit_validation').length,1);}
 finally{global.fetch=previous;}
});
