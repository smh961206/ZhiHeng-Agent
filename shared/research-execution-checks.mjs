import {researchToolCalls} from './research-record.mjs';
const groups=[
 ['disclosures','专项官方公告',['read_official_disclosures'],'按主题补读公告；目录命中不代表正文齐全。'],
 ['pages','财报原页',['read_source_pages'],'区分文字读取与视觉转写，保留未覆盖页码。'],
 ['numbers','原始数字',['verify_financial_inputs'],'数字匹配后仍须核对行列、期间和单位。'],
 ['cash','现金流与再投资',['calculate_cashflow_bridge','calculate_reinvestment'],'现金流桥接和研发敏感性不等于可分配现金。'],
 ['ownership','股本与权益口径',['calculate_valuation_snapshot'],'核对报价股类、全部股数与普通股权益。'],
 ['models','估值模型对照',['review_valuation_models'],'引用实际计算，分开主模型、交叉核对和压力测试。'],
];
const limitedStatuses=new Set(['partial','failed','not-found','unavailable','budget-exhausted','incomplete','unreadable','mismatch','unusable']);
export function toolResultHasGap(result){
 if(!result||typeof result!=='object')return false;
 return Boolean(result.error)||limitedStatuses.has(result.status)||result.unresolved>0||result.limited===true||result.truncated===true||
  (Array.isArray(result.failures)&&result.failures.length>0)||
  result.coverage?.status==='partial'||result.coverage?.balanceMissing?.length>0||
  ['checks','pages','read'].some(key=>Array.isArray(result[key])&&result[key].some(toolResultHasGap));
}
export function researchExecutionChecks(job={}){
 const calls=researchToolCalls(job.events,job.status);
 const mode=job.plan?.mode||job.mode;
 const scoped=mode==='A'?groups.map(group=>group[0]==='models'?['trends','五年与季度数值',['calculate_screen_metrics'],'逐项核对年度与最近八个季度；输入完整不等于事实已核实。']:group):[...groups,...(['B','F'].includes(mode)?[
  ['shareholder','分红事件与派息情景',['calculate_shareholder_return','calculate_dividend_scenarios'],'实施事件按修订去重；区分历史付款日、盈利年度与未来规划。'],
  ['sensitivity','增长与折现率网格',['calculate_dcf_sensitivity'],'由实际DCF调用派生；无效组合留空，不将敏感性当作独立模型。'],
 ]:[])];
 return scoped.map(([id,title,names,notice])=>{
  const records=calls.filter(c=>names.includes(c.toolName)),unreturned=records.filter(c=>!c.hasReturn).length,
   gaps=records.filter(c=>c.hasReturn&&toolResultHasGap(c.result)).length;
  const state=!records.length?'not-recorded':gaps?'has-gaps':unreturned?'pending':'returned';
  return {id,title,notice,state,label:{'not-recorded':'未记录调用','has-gaps':'有待回查记录',pending:'返回未齐',returned:'已返回 · 待判读'}[state],attempts:records.length,gaps,unreturned,records};
 });
}
