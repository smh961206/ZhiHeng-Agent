// Signed OCF contributions only: removing a cash outflow adds it back.
// This bridge checks arithmetic, not economic classification or distributability.
const n={type:['number','null']},s={type:'string'},ids={type:'array',minItems:1,items:s};
const observation={type:'object',properties:{start:s,end:s,ocf:n,sourceIds:ids,adjustments:{type:'array',minItems:1,maxItems:12,items:{type:'object',properties:{key:s,label:s,contribution:n,sourceIds:ids},required:['key','label','contribution','sourceIds'],additionalProperties:false}}},required:['start','end','ocf','sourceIds','adjustments'],additionalProperties:false};
export const cashflowBridgeProperties={amountUnit:s,scope:s,current:observation,previous:observation};
export const cashflowBridgeRules='调用calculate_screen_metrics时须核对并填写cashFlowScope；未查明填unknown。合并范围包含财务子公司时，不能把合并OCF或Quick FCF直接解释为主营现金创造或可分配现金。遇到OCF与利润或销售收现明显背离，应先检索现金流表与附注，必要时调用calculate_cashflow_bridge，逐项记录资金流对OCF的带符号贡献（流入为正、流出为负；流出科目的负数转为正贡献），保持同期口径。桥接仅解释所列项目，不能称为完整剥离金融业务或正常化FCF。缺少原数时保留缺口，不复用参考案例金额。';
const validDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString().slice(0,10)===x;
const fail=text=>{throw new Error(text);};
export function cashflowBridge({current,previous,amountUnit,scope,basis},{sources=[]}={}){
 if(typeof amountUnit!=='string'||!amountUnit.trim()||typeof scope!=='string'||!scope.trim())fail('须说明统一金额单位与合并/调整范围');
 const allowed=new Set(basis?.sourceIds??[]);
 const sourceCheck=values=>{if(!Array.isArray(values)||!values.length||values.some(id=>!allowed.has(id)||!sources.some(s=>s.id===id&&!['quote','filing-index','data-check','search-result','search-summary'].includes(s.type))))fail('桥接各项须关联本次实际财务来源及basis');};
 const number=x=>{if(x!==null&&(typeof x!=='number'||!Number.isFinite(x)))fail('金额须为有限数字或显式null，不能补零');};
 for(const row of [current,previous]){
  if(!row||!validDate(row.start)||!validDate(row.end)||row.start>row.end||(Date.parse(row.end)-Date.parse(row.start))/86400000>379)fail('现金流期间无效或超过一个会计年度');
  sourceCheck(row.sourceIds);number(row.ocf);
  if(!Array.isArray(row.adjustments)||!row.adjustments.length||row.adjustments.length>12)fail('须提供1至12项待解释资金流');
  const keys=new Set();
  for(const a of row.adjustments){if(!a||typeof a.key!=='string'||!a.key.trim()||typeof a.label!=='string'||!a.label.trim()||keys.has(a.key))fail('调整项标识或说明无效、重复');keys.add(a.key);number(a.contribution);sourceCheck(a.sourceIds);}
 }
 // Restrict to matching annual / YTD / single-quarter year-over-year windows.
 if(current.start.slice(4)!==previous.start.slice(4)||current.end.slice(4)!==previous.end.slice(4)||Number(current.start.slice(0,4))-Number(previous.start.slice(0,4))!==1||Number(current.end.slice(0,4))-Number(previous.end.slice(0,4))!==1)fail('仅比较相同起止月日的相邻年度同期流量，不混用全年与半年');
 const old=new Map(previous.adjustments.map(a=>[a.key,a]));
 if(old.size!==current.adjustments.length||current.adjustments.some(a=>!old.has(a.key)))fail('两期必须采用同一组调整项目；缺值请显式提供null');
 const subtract=(a,b)=>a===null||b===null?null:a-b;
 const adjust=row=>row.ocf===null||row.adjustments.some(a=>a.contribution===null)?null:row.ocf-row.adjustments.reduce((sum,a)=>sum+a.contribution,0);
 const items=current.adjustments.map(a=>({key:a.key,label:a.label,current:a.contribution,previous:old.get(a.key).contribution,change:subtract(a.contribution,old.get(a.key).contribution),sourceIds:[...new Set([...a.sourceIds,...old.get(a.key).sourceIds])]}));
 const ocfChange=subtract(current.ocf,previous.ocf),explainedChange=items.some(a=>a.change===null)?null:items.reduce((sum,a)=>sum+a.change,0),adjustedCurrent=adjust(current),adjustedPrevious=adjust(previous);
 const result={amountUnit,currency:basis?.currency,scope,current,previous,items,ocfChange,explainedChange,unexplainedChange:subtract(ocfChange,explainedChange),explainedShare:ocfChange===null||ocfChange===0||explainedChange===null?null:explainedChange/ocfChange,
  adjustedCurrent,adjustedPrevious,adjustedChange:subtract(adjustedCurrent,adjustedPrevious),adjustedGrowth:adjustedCurrent!==null&&adjustedPrevious>0?(adjustedCurrent-adjustedPrevious)/adjustedPrevious:null,
  formula:'诊断余额 = 合并OCF − 所列项目对OCF的带符号贡献之和；解释占比 = 所列贡献同比变化之和 ÷ OCF同比变化。',
  status:adjustedCurrent===null||adjustedPrevious===null?'incomplete':'calculated-needs-review',
  limitations:['仅解释列出的项目，不是主营现金流、正常化FCF或股东可分配现金。','符号、经济含义、合并范围和原始金额仍需核实；工具不能证明因果关系。','解释占比可能为负或超过100%，不裁剪；OCF变化为0时不计算占比。','诊断余额同比仅在上期余额为正时计算；缺值不补零。']};
 const check=v=>{if(typeof v==='number'&&!Number.isFinite(v))fail('计算结果超出有限数值范围');if(v&&typeof v==='object')Object.values(v).forEach(check);};check(result);return result;
}
