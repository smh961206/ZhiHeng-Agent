const n={type:['number','null']},s={type:'string'};
const row={type:'object',properties:{start:s,end:s,sourceIds:{type:'array',minItems:1,items:s},revenue:n,profit:n,ocf:n,capex:n,rdTotal:n,rdExpensed:n,rdCapitalized:n},required:['start','end','sourceIds','revenue','profit','ocf','capex','rdTotal','rdExpensed','rdCapitalized'],additionalProperties:false};
export const reinvestmentProperties={current:row,previous:row};
const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
export function reinvestmentDiagnostics({current,previous,basis},{sources=[]}={}){
 const finite=v=>typeof v==='number'&&Number.isFinite(v),keys=['revenue','profit','ocf','capex','rdTotal','rdExpensed','rdCapitalized'];
 for(const r of [current,previous]){
  if(!r||!date(r.start)||!date(r.end)||r.start>r.end||Date.parse(r.end)-Date.parse(r.start)>366*86400000)throw new Error('再投资核算需要有效年度/累计/单季期间');
  if(!Array.isArray(r.sourceIds)||!r.sourceIds.length||r.sourceIds.some(id=>!basis?.sourceIds?.includes(id)||!sources.some(s=>s.id===id&&['official-report','official-xbrl'].includes(s.type))))throw new Error('再投资输入须关联实际官方财报与计算basis');
  for(const k of keys)if(r[k]!==null&&(!finite(r[k])||!['profit','ocf'].includes(k)&&r[k]<0))throw new Error('金额须为人民币或声明币种的元；缺失填null，研发和Capex不得为负');
  if([r.rdTotal,r.rdExpensed,r.rdCapitalized].every(finite)&&Math.abs(r.rdTotal-r.rdExpensed-r.rdCapitalized)>Math.max(0.01,Math.abs(r.rdTotal)*Number.EPSILON*4))throw new Error('研发总投入不等于费用化加资本化支出；先核对口径，不将研发费用自动当投入');
 }
 if(current.start.slice(4)!==previous.start.slice(4)||current.end.slice(4)!==previous.end.slice(4)||Number(current.start.slice(0,4))-Number(previous.start.slice(0,4))!==1||Number(current.end.slice(0,4))-Number(previous.end.slice(0,4))!==1)throw new Error('只能比较相邻年度的同起止月日期间；不能混用半年与全年');
 const ratio=(a,b)=>finite(a)&&b>0?a/b:null,sub=(a,b)=>finite(a)&&finite(b)?a-b:null;
 const summarize=r=>({rdCapitalization:ratio(r.rdCapitalized,r.rdTotal),rdIntensity:ratio(r.rdTotal,r.revenue),quickFCF:sub(r.ocf,r.capex),capexIntensity:ratio(r.capex,r.revenue),netMargin:ratio(r.profit,r.revenue)});
 const a=summarize(current),b=summarize(previous);
 const hypotheticalCapitalized=finite(current.rdTotal)&&b.rdCapitalization!==null?current.rdTotal*b.rdCapitalization:null;
 const result={status:keys.some(k=>current[k]===null||previous[k]===null)?'incomplete':'calculated-needs-review',amountUnit:'元',currency:basis?.currency,current:{...current,metrics:a},previous:{...previous,metrics:b},changes:{rdCapitalizationPercentagePoints:a.rdCapitalization!==null&&b.rdCapitalization!==null?100*(a.rdCapitalization-b.rdCapitalization):null,quickFCF:sub(a.quickFCF,b.quickFCF)},sameRateSensitivity:{hypotheticalCapitalized,extraCapitalized:sub(current.rdCapitalized,hypotheticalCapitalized),formula:'本期资本化研发 − 本期研发总投入 × 上期资本化率'},limitations:['研发同口径敏感性是税前确认节奏比较，不是虚增利润或应扣归母净利润；尚需摊销、税及少数股东调整。','Quick FCF = 合并OCF − 现金购建长期资产，不是FCFE；不要再把已包含的资本化研发重复从现金流扣除。','费用化加资本化应等于同口径研发投入；只匹配数字不能证明期间、行列或经济含义。','ROIC、维护性Capex和可分配现金缺少依据时保留缺口，不用本工具结果自动补齐。']};
 const check=x=>{if(typeof x==='number'&&!Number.isFinite(x))throw new Error('再投资计算结果超出有限数值范围');if(x&&typeof x==='object')Object.values(x).forEach(check);};check(result);return result;
}
