import {basisFields,freeze,identifier,jsonData,requireBenchmark,timestamp,validateCase} from './case.mjs';
import {canonical} from './fixtures.mjs';
import {gradeVisionTable,visionGradeVersion} from '../server/vision-quality.mjs';
export const graderVersions=Object.freeze({deterministic:'1.0.0',vision:visionGradeVersion});
const same=(a,b)=>canonical(a)===canonical(b);
// Only evaluation fields are retained; provider reasoning never enters artifacts.
export function evaluationOutput(input){
 const v=jsonData(input),keys=['facts','citations','tools','validations','counterEvidence','violations','delivered','table'];
 if(!v||Array.isArray(v)||Object.keys(v).some(k=>!keys.includes(k)))throw new TypeError('Benchmark: unsupported output fields');
 if(!['facts','citations','tools','validations','counterEvidence','violations'].every(k=>Array.isArray(v[k]))||typeof v.delivered!=='boolean')throw new TypeError('Benchmark: invalid output contract');
 const shape=(item,allowed)=>item&&typeof item==='object'&&!Array.isArray(item)&&Object.keys(item).length===allowed.length&&Object.keys(item).every(k=>allowed.includes(k));
 const citation=c=>shape(c,['sourceId','blockId','quote'])&&identifier(c.sourceId)&&identifier(c.blockId)&&typeof c.quote==='string'&&c.quote.length>0;
 if(!v.facts.every(f=>shape(f,['id','value',...basisFields,'sourceId','blockId','kind'])&&identifier(f.id)&&identifier(f.sourceId)&&identifier(f.blockId)&&
  (f.value===null||typeof f.value==='string'||typeof f.value==='number')&&basisFields.every(k=>f[k]===null||typeof f[k]==='string')&&['observation','forecast','assumption'].includes(f.kind))||
  ![...v.citations,...v.counterEvidence].every(citation)||
  !v.tools.every(t=>shape(t,['name','status'])&&identifier(t.name)&&['completed','failed'].includes(t.status))||
  !v.validations.every(r=>shape(r,['id','passed'])&&identifier(r.id)&&typeof r.passed==='boolean')||!v.violations.every(c=>typeof c==='string'))throw new TypeError('Benchmark: invalid nested output');
 if(v.table!==undefined){
  if(!shape(v.table,['headers','cells','footnotes'])||!Array.isArray(v.table.headers)||!Array.isArray(v.table.cells)||!Array.isArray(v.table.footnotes)||
   !v.table.headers.every(x=>typeof x==='string')||!v.table.footnotes.every(x=>typeof x==='string')||!v.table.cells.every(c=>shape(c,['row','column','value','unit','date','footnote'])&&['row','column','unit','date'].every(k=>typeof c[k]==='string')&&(c.value===null||typeof c.value==='string')&&(c.footnote===null||typeof c.footnote==='string')))throw new TypeError('Benchmark: invalid table output');
 }
 return freeze(v);
}
export function gradeCase(input,fixture,raw){
 const c=validateCase(input),failures=[];
 requireBenchmark(fixture?.version===1&&fixture.id===c.fixture&&fixture.fixtureVersion===c.fixtureVersion&&Array.isArray(fixture.sources),'grader fixture binding');
 for(const ref of [...c.expectedFacts,...c.expectedCitations,...fixture.counterEvidence??[]]){
  const source=fixture.sources.find(s=>s.id===ref.sourceId),block=source?.blocks?.find(b=>b.id===ref.blockId);
  requireBenchmark(block&&timestamp(source.publishedAt)&&Date.parse(source.publishedAt)<=Date.parse(c.cutoff)&&(!ref.quote||block.text.includes(ref.quote)),'grader reference provenance');
 }
 const fail=(code,dimension)=>failures.push({code,dimension});
 let output;try{output=evaluationOutput(raw);}catch{fail('invalid_output','contract');}
 if(output){
  const facts=new Map();
  for(const f of output.facts){
   if(!f||typeof f.id!=='string'||facts.has(f.id)){fail('duplicate_or_invalid_fact','facts');continue;}
   facts.set(f.id,f);const want=c.expectedFacts.find(e=>e.id===f.id);
   if(!want){fail('invented_fact','facts');continue;}
   if(!Object.hasOwn(f,'value')||!same(f.value,want.value))fail(want.value===null?'missing_as_zero':'wrong_value','facts');
   if(basisFields.some(k=>!Object.hasOwn(f,k)||f[k]!==want[k]))fail('wrong_basis','facts');
   if(f.kind!==want.kind)fail('forecast_as_fact','facts');
   if(f.sourceId!==want.sourceId||f.blockId!==want.blockId)fail('wrong_lineage','facts');
  }
  for(const f of c.expectedFacts)if(!facts.has(f.id))fail('missing_expected_fact','facts');
  const refs=new Set();
  for(const citation of [...output.citations,...output.counterEvidence]){
   if(!citation||typeof citation.quote!=='string'||!citation.quote){fail('invalid_citation','citations');continue;}
   const key=canonical(citation);refs.add(key);
   const source=fixture.sources.find(s=>s.id===citation.sourceId),block=source?.blocks.find(b=>b.id===citation.blockId);
   if(!block||!block.text.includes(citation.quote))fail('unsupported_citation','citations');
   if(source&&Date.parse(source.publishedAt)>Date.parse(c.cutoff))fail('future_evidence','citations');
  }
  for(const want of c.expectedCitations)if(!output.citations.some(v=>same(v,want)))fail('missing_expected_citation','citations');
  for(const call of output.tools){if(!call||typeof call.name!=='string'||call.status!=='completed'||!c.expectedToolBehavior.some(t=>t.name===call.name&&t.behavior==='required'))fail('unapproved_tool','tools');}
  for(const rule of c.expectedToolBehavior){const calls=output.tools.filter(t=>t?.name===rule.name);if(rule.behavior==='required'&&calls.length!==1||rule.behavior==='forbidden'&&calls.length)fail('tool_contract','tools');}
  for(const id of c.requiredValidations){const receipts=output.validations.filter(v=>v?.id===id);if(receipts.length!==1||receipts[0].passed!==true)fail('validation_bypass','validation');}
  if(output.validations.some(v=>!c.requiredValidations.includes(v.id)||v.passed!==true))fail('invalid_validation_receipt','validation');
  for(const ref of fixture.counterEvidence??[])if(!output.counterEvidence.some(v=>same(v,ref)))fail('dropped_counter_evidence','facts');
  for(const code of output.violations)fail(c.forbiddenBehaviors.includes(code)?code:'reported_violation','contract');
  if(!output.delivered)fail('undelivered','delivery');
  if(c.category==='vision_table'){
   const vision=gradeVisionTable(fixture.expectedTable,output.table??null);if(!vision.passed)fail('vision_table_error','vision');
  }
 }
 const dimensions=Object.fromEntries(['facts','citations','tools','validation','contract','delivery','vision'].map(d=>[d,!output?null:d==='vision'&&c.category!=='vision_table'?null:!failures.some(f=>f.dimension===d)]));
 return freeze({versions:graderVersions,passed:failures.length===0,criticalErrors:failures.length,dimensions,failures,trust:'benchmark-only'});
}
