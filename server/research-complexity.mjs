// V1 workload heuristic only. No model selection, I/O or job mutation.
const modePoints=Object.freeze({A:0,B:8,C:8,D:16,E:12,F:12});
const shape={mode:null,companyCount:null,markets:null,currencies:null,historyYears:null,
 materials:['documentCount','pageCount','imageCount'],valuation:['methodCount','scenarioCount'],
 evidence:['conflictCount','missingCount'],runtime:['reasoningFailureCount','providerFailureCount','dataGapCount'],
 review:['reasoningFailureCount','formatFailureCount','dataGapCount']};
const invalid=()=>{throw Object.assign(new TypeError('Invalid research complexity input'),{code:'invalid_complexity_input'});};
function record(value,keys){
 // Missing observations must not fall through to Object.prototype values or
 // getters. Keep the internal copy separate from the public result shape.
 const copy=Object.create(null);
 if(value==null)return copy;
 if(Object.getPrototypeOf(value)!==Object.prototype)invalid();
 const descriptors=Object.getOwnPropertyDescriptors(value);
 for(const key of Reflect.ownKeys(descriptors)){
  const descriptor=descriptors[key];
  if(!keys.includes(key)||!descriptor.enumerable||!Object.hasOwn(descriptor,'value'))invalid();
  copy[key]=descriptor.value;
 }
 return copy;
}
const count=value=>{if(value==null)return null;if(!Number.isSafeInteger(value)||value<0)invalid();return value===0?0:value;};
function codes(value,valid){
 if(value==null)return null;
 if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||value.length>32)invalid();
 const descriptors=Object.getOwnPropertyDescriptors(value);
 if(Reflect.ownKeys(descriptors).length!==value.length+1)invalid();
 const result=[];
 for(let i=0;i<value.length;i++){
  const entry=descriptors[i];
  if(!entry?.enumerable||!Object.hasOwn(entry,'value')||typeof entry.value!=='string')invalid();
  const code=entry.value.trim().toUpperCase();if(!valid(code))invalid();result.push(code);
 }
 return [...new Set(result)].sort();
}

/**
 * Score explicitly supplied, structured signals. Missing stays null; counts of
 * missing data, provider failures and format failures never add points.
 * Reasons are stable codes, not generated explanations or hidden reasoning.
 */
export function evaluateResearchComplexity(input={}){
 if(input==null)invalid();
 const source=record(input,Object.keys(shape));
 if(source.mode!=null&&(typeof source.mode!=='string'||!Object.hasOwn(modePoints,source.mode)))invalid();
 const signals={mode:source.mode??null,companyCount:count(source.companyCount),
  markets:codes(source.markets,v=>['CN','HK','US'].includes(v)),currencies:codes(source.currencies,v=>/^[A-Z]{3}$/.test(v)),historyYears:count(source.historyYears)};
 for(const [section,keys] of Object.entries(shape).filter(([,keys])=>Array.isArray(keys))){
  const values=record(source[section],keys);
  signals[section]=Object.fromEntries(keys.map(key=>[key,count(values[key])]));
 }
 const reasons=[],unknownSignals=[];let known=0;
 const add=(code,value,points,scoring=true)=>{
  if(value===null){unknownSignals.push(code);return;}
  if(scoring)known++;
  if(points>0||!scoring&&value>0)reasons.push({code,points});
 };
 const extra=(value,cap,weight)=>value===null?0:Math.min(cap,Math.max(0,value-1))*weight;
 add('mode',signals.mode,signals.mode===null?0:modePoints[signals.mode]);
 add('companyCount',signals.companyCount,extra(signals.companyCount,3,4));
 add('markets',signals.markets,extra(signals.markets?.length??null,2,4));
 add('currencies',signals.currencies,extra(signals.currencies?.length??null,2,5));
 add('historyYears',signals.historyYears,signals.historyYears>=8?8:signals.historyYears>=5?4:0);
 const {materials,valuation,evidence,runtime,review}=signals;
 add('materials.documentCount',materials.documentCount,materials.documentCount>=10?6:materials.documentCount>=4?3:0);
 add('materials.pageCount',materials.pageCount,materials.pageCount>=200?4:materials.pageCount>=50?2:0);
 add('materials.imageCount',materials.imageCount,materials.imageCount>=6?4:materials.imageCount>0?2:0);
 add('valuation.methodCount',valuation.methodCount,extra(valuation.methodCount,2,4));
 add('valuation.scenarioCount',valuation.scenarioCount,extra(valuation.scenarioCount,2,3));
 add('evidence.conflictCount',evidence.conflictCount,Math.min(evidence.conflictCount??0,3)*4);
 add('evidence.missingCount',evidence.missingCount,0,false);
 add('runtime.reasoningFailureCount',runtime.reasoningFailureCount,Math.min(runtime.reasoningFailureCount??0,2));
 add('runtime.providerFailureCount',runtime.providerFailureCount,0,false);
 add('runtime.dataGapCount',runtime.dataGapCount,0,false);
 add('review.reasoningFailureCount',review.reasoningFailureCount,Math.min(review.reasoningFailureCount??0,2)*2);
 add('review.formatFailureCount',review.formatFailureCount,0,false);
 add('review.dataGapCount',review.dataGapCount,0,false);
 const score=reasons.reduce((sum,reason)=>sum+reason.points,0);
 return {version:1,score,level:!known?'unknown':score>=50?'high':score>=25?'moderate':'low',reasons,signals,unknownSignals};
}
