// Versioned evaluation metadata. These observations are never canonical research Facts.
export const caseVersion=1;
export const categories=Object.freeze(['quick_screen','earnings_update','deep_research','company_comparison','vision_table','complex_valuation','missing_conflict','execution_review','shareholder_return']);
export const forbiddenBehaviors=Object.freeze(['invented_fact','wrong_basis','future_evidence','missing_as_zero','dropped_counter_evidence','unapproved_tool','validation_bypass','hidden_reasoning','forecast_as_fact']);
export const basisFields=Object.freeze(['period','currency','unit','shareBasis','accountingScope','valuationBasis']);
export function requireBenchmark(ok,message){if(!ok)throw new TypeError('Benchmark: '+message);}
export const identifier=value=>typeof value==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,119}$/.test(value);
export const timestamp=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===(value.includes('.')?value:value.replace('Z','.000Z'));
export function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
export function jsonData(input){
 const visit=(value)=>{
  if(value===null||typeof value==='string'||typeof value==='boolean')return value;
  if(typeof value==='number'){requireBenchmark(Number.isFinite(value),'non-finite number');return value;}
  requireBenchmark(value&&typeof value==='object','JSON data required');
  requireBenchmark(Object.getPrototypeOf(value)===(Array.isArray(value)?Array.prototype:Object.prototype),'plain JSON data required');
  const keys=Reflect.ownKeys(value).filter(k=>!(Array.isArray(value)&&k==='length'));
  if(Array.isArray(value))requireBenchmark(keys.length===value.length&&keys.every((k,i)=>k===String(i)),'dense array required');
  const out=Array.isArray(value)?[]:{};
  for(const key of keys){const d=Object.getOwnPropertyDescriptor(value,key);requireBenchmark(typeof key==='string'&&d.enumerable&&Object.hasOwn(d,'value')&&!['__proto__','constructor','prototype'].includes(key),'data properties required');out[key]=visit(d.value);}
  return out;
 };
 return visit(input);
}
const list=(value,check)=>Array.isArray(value)&&value.every(check);
const uniqueIds=values=>new Set(values.map(v=>v.id.toLowerCase())).size===values.length;
export function validateCase(input){
 const c=jsonData(input);
 requireBenchmark(c.version===caseVersion&&identifier(c.id)&&identifier(c.fixture)&&identifier(c.fixtureVersion),'case identity/version');
 requireBenchmark(categories.includes(c.category)&&['critical','standard'].includes(c.qualityCriticality),'category/criticality');
 requireBenchmark(timestamp(c.cutoff),'explicit cutoff');
 if(Object.hasOwn(c,'taskSignals')){
  const s=c.taskSignals;requireBenchmark(s&&typeof s==='object'&&!Array.isArray(s)&&Object.keys(s).length>0&&Object.keys(s).every(k=>['purpose','mode','documentPages','toolWorkflow'].includes(k)),'known task signals');
  requireBenchmark((s.purpose===undefined||['research','followup','review','vision'].includes(s.purpose))&&(s.mode===undefined||['A','B','C','D','E','F'].includes(s.mode))&&(s.documentPages===undefined||Number.isSafeInteger(s.documentPages)&&s.documentPages>0)&&(s.toolWorkflow===undefined||typeof s.toolWorkflow==='boolean'),'typed task signals');
 }
 requireBenchmark(list(c.requiredCapabilities,v=>['textInput','imageInput','streaming','toolCalling','jsonObject','jsonSchema','reasoningControl'].includes(v))&&new Set(c.requiredCapabilities).size===c.requiredCapabilities.length,'capabilities');
 requireBenchmark(list(c.forbiddenBehaviors,v=>forbiddenBehaviors.includes(v))&&new Set(c.forbiddenBehaviors).size===c.forbiddenBehaviors.length,'forbidden behaviors');
 requireBenchmark(list(c.expectedFacts,f=>identifier(f.id)&&Object.hasOwn(f,'value')&&(f.value===null||typeof f.value==='string'||typeof f.value==='number')&&basisFields.every(k=>Object.hasOwn(f,k)&&(f[k]===null||typeof f[k]==='string'))&&identifier(f.sourceId)&&identifier(f.blockId)&&['observation','forecast','assumption'].includes(f.kind))&&uniqueIds(c.expectedFacts),'facts require explicit basis, kind and provenance');
 requireBenchmark(list(c.expectedCitations,v=>identifier(v.sourceId)&&identifier(v.blockId)&&typeof v.quote==='string'&&v.quote.length>0),'citations');
 requireBenchmark(list(c.expectedToolBehavior,v=>identifier(v.name)&&['required','forbidden'].includes(v.behavior)),'tool behavior');
 requireBenchmark(list(c.requiredValidations,identifier)&&new Set(c.requiredValidations).size===c.requiredValidations.length,'validation requirements');
 requireBenchmark(c.expectedFacts.length+c.expectedCitations.length+c.expectedToolBehavior.length+c.requiredValidations.length>0||c.category==='vision_table','empty evaluation');
 return freeze(c);
}
export function validateCases(input){
 const cases=jsonData(input).map(validateCase);
 requireBenchmark(cases.length>0&&uniqueIds(cases),'unique nonempty cases (case insensitive)');
 return freeze(cases);
}
