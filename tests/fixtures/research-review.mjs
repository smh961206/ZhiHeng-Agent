import './model-env.mjs';
import {createResearchPlan,scoring} from '../../shared/research-framework.mjs';

// Synthetic evidence with deliberate limitations; never presented as company research.
export function reviewFixture(input={},citation='S1'){
 const plan=createResearchPlan(input,input.mode||'B');
 return {
  ...(['A','B','C','D'].includes(plan.mode)?{researchSummary:{checks:['业务质量','现金流','估值边界'].map(topic=>({topic,assessment:'合成资料不足，待核实。',sourceIds:[citation],unresolved:'缺少完整原文。'}))}}:{}),
  ...(plan.mode==='D'&&plan.securities.length>=2?{comparisonDecisions:plan.securities.map(company=>({security:company.market+':'+company.symbol,action:'观察',confidence:'低',summary:'合成资料不足，仅验证交付。',sourceIds:[],unresolved:'缺少完整原文。',falsifiers:['若未来两个季度现金流持续低于利润，重审现金转化。']}))}:{}),
  sections:plan.output.sections.map(section=>({id:section.id,text:`经审计的合成${section.title}。资料不足，保留验证条件。[${citation}]`})),
  audit:'仅模拟测试，未验证真实公司数据。',
  ...(plan.execution?{executionAudit:plan.execution.checks.map(item=>({id:item.id,status:'limited',reason:'合成资料不足，仅验证执行审计结构，不形成交易建议。'}))}:{}),
  decision:{action:plan.output.schema==='Quick'?'观察池':plan.mode==='C'?(plan.output.actions.includes('建立基线')?'建立基线':'维持'):'观察',summary:'合成证据覆盖有限，暂待补充资料。',confidence:'低',dataAsOf:'2026-09-06',
   falsifiers:['若下一年度经营现金流连续两年低于净利润，重审盈利质量。','若分红连续两年超过可分配现金，重审现金回报假设。','若应收账款增速连续两年高于收入增速，重审回款假设。'],
   missingData:['缺少完整附注与业务证据，不能形成可靠估值。'],
   gates:['data','quality','valuation','risk'].map(id=>({id,status:'limited',reason:'合成资料不足，需继续核实。'})),
   valuation:{status:'limited',methods:[],explanation:'合成资料不足，不生成估值数字。'},
   portfolio:{status:'insufficient',summary:'组合信息不完整，不输出具体仓位。'},
   ...(plan.output.schema==='Deep'?{scores:scoring.map(item=>({id:item.id,score:null,reason:'资料不足，不能评分。'}))}:{})},
 };
}
