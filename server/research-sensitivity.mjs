import {dcf,dividend} from './calculations.mjs';
const number={type:'number'},string={type:'string'};
export const dcfSensitivityProperties={baseToolCallId:string,growthRates:{type:'array',minItems:1,maxItems:5,items:number},discountRates:{type:'array',minItems:1,maxItems:5,items:number}};
export const dividendScenarioProperties={models:{type:'array',minItems:1,maxItems:5,items:{type:'object',properties:{label:string,toolCallId:string},required:['label','toolCallId'],additionalProperties:false}},payout:number,yields:{type:'array',minItems:1,maxItems:7,items:number},policyThrough:string,continuationAssumption:string};
function receipt(id,name,records,basis){
 const matches=records.filter(r=>r.toolCallId===id),r=matches[0];
 if(matches.length!==1||r.toolName!==name||!r.result||r.result.error)throw new Error('须引用本次唯一且成功返回的 '+name+' 调用');
 if(!r.result.basis||r.result.basis.currency!==basis?.currency||r.result.basis.shareBasis!==basis?.shareBasis)throw new Error('敏感性与基准计算的币种、股本口径必须一致');
 if(!r.result.basis.sourceIds?.every(id=>basis.sourceIds?.includes(id)))throw new Error('敏感性须保留基准计算的全部来源');
 return r;
}
function rates(values,max,label){
 if(!Array.isArray(values)||!values.length||values.length>max||values.some(v=>typeof v!=='number'||!Number.isFinite(v))||new Set(values).size!==values.length)throw new Error(label+'须为不重复的有限数值，最多'+max+'项');
}
export function dcfSensitivity(args,{records=[]}={}){
 const base=receipt(args.baseToolCallId,'calculate_dcf',records,args.basis);
 rates(args.growthRates,5,'增长率');rates(args.discountRates,5,'折现率');
 // Re-evaluate the saved baseline; do not accept model-written baseline values.
 dcf(base.arguments);
 const cells=args.growthRates.flatMap(growth=>args.discountRates.map(discount=>{
  try{return {growth,discount,status:'calculated-needs-review',...dcf({...base.arguments,growth,discount})};}
  catch(error){return {growth,discount,status:'unusable',perShare:null,error:error.message};}
 }));
 return {status:cells.some(c=>c.error)?'incomplete':'calculated-needs-review',baseToolCallId:base.toolCallId,baseInputs:base.arguments,growthRates:args.growthRates,discountRates:args.discountRates,cells,
  invalidCells:cells.filter(c=>c.error).length,notice:'沿用实际DCF的现金基数、股数、终值与权益调整，只改变两轴假设；无效组合留空。敏感性不是独立模型或价格目标，终值占比仍须判读。'};
}
export function dividendScenarios(args,{records=[]}={}){
 if(!Array.isArray(args.models)||!args.models.length||args.models.length>5||new Set(args.models.map(m=>m.toolCallId)).size!==args.models.length)throw new Error('每个分红情景须引用不同的实际盈利调用，最多5项');
 if(!Number.isFinite(args.payout)||args.payout<0||args.payout>1)throw new Error('情景支付率须介于0和1之间');
 rates(args.yields,7,'目标股息率');
 if(args.yields.some(y=>y<=0)||typeof args.policyThrough!=='string'||!args.policyThrough.trim()||typeof args.continuationAssumption!=='string'||!args.continuationAssumption.trim())throw new Error('须说明分红规划有效期（未知也须声明）及期后沿用假设');
 const scenarios=args.models.map(model=>{
  if(typeof model.label!=='string'||!model.label.trim()||model.label.length>100)throw new Error('情景名称无效');
  const r=receipt(model.toolCallId,'calculate_normalized_earnings',records,args.basis);
  if(!Array.isArray(r.result.eps)||r.result.eps.length!==2||r.result.eps.some(v=>!Number.isFinite(v)||v<0))throw new Error('盈利调用缺少可用的每股利润区间');
  const dps=r.result.eps.map(eps=>eps*args.payout);
  return {label:model.label,toolCallId:r.toolCallId,eps:r.result.eps,dps,anchors:dps.map(value=>dividend({dps:value,yields:args.yields}).anchors)};
 });
 return {status:'calculated-needs-review',payout:args.payout,policyThrough:args.policyThrough,continuationAssumption:args.continuationAssumption,scenarios,notice:'假设派息率应用于实际正常化盈利结果；区分规划有效期与期后假设。收益率锚不是内在价值，不是已实施分红或未来承诺。'};
}
