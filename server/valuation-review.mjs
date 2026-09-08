export const valuationReviewProperties={models:{type:'array',minItems:2,maxItems:6,items:{type:'object',properties:{toolCallId:{type:'string'},role:{type:'string',enum:['primary','cross-check','stress-test']},limitation:{type:'string'}},required:['toolCallId','role','limitation'],additionalProperties:false}}};
// Compare actual calculation receipts, never prices transcribed by the model.
export function reviewValuationModels({models},{records=[]}={}){
 if(!Array.isArray(models)||models.length<2||models.length>6||models.filter(m=>m?.role==='primary').length!==1||new Set(models.map(m=>m?.toolCallId)).size!==models.length)throw new Error('模型复核须选择2至6个不同的实际计算调用，并指定一个主模型');
 const selected=models.map(m=>{
  if(!['primary','cross-check','stress-test'].includes(m.role)||typeof m.limitation!=='string'||!m.limitation.trim()||m.limitation.length>1500)throw new Error('须说明每个模型的角色和适用限制');
  const candidates=records.filter(r=>r.toolCallId===m.toolCallId),r=candidates[0];
  if(candidates.length!==1||!['calculate_normalized_earnings','calculate_dcf'].includes(r?.toolName)||r.result?.error)throw new Error('模型必须关联本次唯一、成功返回的盈利估值或现金流折现调用');
  const values=r.toolName==='calculate_normalized_earnings'?r.result?.value:[r.result?.perShare];
  if(!Array.isArray(values)||!values.length||values.some(x=>typeof x!=='number'||!Number.isFinite(x)))throw new Error('所选调用缺少有效的每股估值结果');
  const currency=r.result?.basis?.currency,shares=r.arguments?.shares;
  if(!currency||!Number.isFinite(shares)||shares<=0)throw new Error('计算记录缺少币种或股数，不能猜测模型可比口径');
  return {...m,toolName:r.toolName,currency,shares,low:Math.min(...values),high:Math.max(...values),terminalShare:r.result.terminalShare??null,assumptions:r.result.basis.assumptions};
 });
 const main=selected.find(m=>m.role==='primary');
 if(selected.some(m=>m.currency!==main.currency||m.shares!==main.shares))throw new Error('模型的币种或股数不一致；须先按一致单位重新计算，不能自动换汇或取平均');
 return {status:'compared-needs-review',primary:main.toolCallId,models:selected,comparisons:selected.filter(m=>m!==main).map(m=>({toolCallId:m.toolCallId,role:m.role,overlaps:m.high>=main.low&&m.low<=main.high,relation:m.high<main.low?'below-primary':m.low>main.high?'above-primary':'overlapping',gap:m.high<main.low?main.low-m.high:m.low>main.high?m.low-main.high:0})),notice:'模型角色由Agent声明，不代表适用性已验证；压力测试不能冒称独立合理价值。区间冲突须解释现金兑现、再投资、增长和终值假设，不取平均、不只选最高结果。'};
}
