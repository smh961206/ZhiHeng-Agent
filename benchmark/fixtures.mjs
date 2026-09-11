import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {freeze,identifier,jsonData,requireBenchmark,timestamp,validateCases} from './case.mjs';
import {gradeVisionTable} from '../server/vision-quality.mjs';
export const sha256=value=>createHash('sha256').update(value).digest('hex');
export const canonical=value=>JSON.stringify(sort(jsonData(value)));
function sort(v){return Array.isArray(v)?v.map(sort):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,sort(v[k])])):v;}
export const objectHash=value=>sha256(canonical(value));
export function loadFrozenSuite(directory){
 const root=fs.realpathSync(directory);
 const read=(relative,expected)=>{
  requireBenchmark(typeof relative==='string'&&/^[a-zA-Z0-9_./-]+$/.test(relative)&&!path.isAbsolute(relative)&&!relative.split('/').some(v=>!v||v==='..'||v==='.'),'fixture relative path');
  const file=fs.realpathSync(path.join(root,relative)),rel=path.relative(root,file);
  requireBenchmark(rel&&!rel.startsWith('..')&&!path.isAbsolute(rel),'fixture escapes root');
  requireBenchmark(fs.statSync(file).size<=16*1024*1024,'fixture size limit');
  const bytes=fs.readFileSync(file);
  if(expected!==undefined)requireBenchmark(/^[a-f0-9]{64}$/.test(expected)&&sha256(bytes)===expected,'fixture hash mismatch');
  return bytes;
 };
 const manifest=jsonData(JSON.parse(read('manifest.json')));
 requireBenchmark(manifest.version===1&&identifier(manifest.id)&&identifier(manifest.benchmarkVersion)&&timestamp(manifest.frozenAt),'manifest identity');
 requireBenchmark(Array.isArray(manifest.files)&&manifest.files.length>0,'manifest files');
 requireBenchmark(new Set(manifest.files.map(f=>f.path.toLowerCase())).size===manifest.files.length,'duplicate paths');
 const files=new Map(manifest.files.map(f=>{requireBenchmark(['cases','fixture','asset'].includes(f.kind)&&typeof f.sha256==='string','file descriptor');return [f.path,{...f,bytes:read(f.path,f.sha256)}];}));
 const caseFiles=[...files.values()].filter(f=>f.kind==='cases');requireBenchmark(caseFiles.length===1,'one cases file required');
 const cases=validateCases(JSON.parse(caseFiles[0].bytes));
 const fixtures={};
 for(const entry of [...files.values()].filter(f=>f.kind==='fixture')){
  const f=jsonData(JSON.parse(entry.bytes));requireBenchmark(f.version===1&&identifier(f.id)&&identifier(f.fixtureVersion)&&!Object.hasOwn(fixtures,f.id),'fixture identity');
  requireBenchmark(Array.isArray(f.sources)&&Array.isArray(f.market)&&Array.isArray(f.assets),'fixture sources/market/assets');
  requireBenchmark(new Set(f.sources.map(s=>s.id)).size===f.sources.length,'unique source IDs');
  for(const s of f.sources){requireBenchmark(identifier(s.id)&&timestamp(s.publishedAt)&&Array.isArray(s.blocks)&&s.blocks.length>0,'dated source required');requireBenchmark(new Set(s.blocks.map(b=>b.id)).size===s.blocks.length&&s.blocks.every(b=>identifier(b.id)&&typeof b.text==='string'),'source blocks');}
  for(const m of f.market)requireBenchmark(timestamp(m.observedAt)&&timestamp(m.publishedAt)&&Object.hasOwn(m,'value'),'dated market observation');
  for(const a of f.assets)requireBenchmark(files.get(a.path)?.kind==='asset'&&files.get(a.path).sha256===a.sha256,'asset must be hash bound');
  fixtures[f.id]=f;
 }
 for(const c of cases){
  const f=fixtures[c.fixture];requireBenchmark(f&&f.fixtureVersion===c.fixtureVersion,'case fixture version');
  if(c.category==='vision_table')requireBenchmark(gradeVisionTable(f.expectedTable,f.expectedTable).passed,'invalid vision reference');
  requireBenchmark([...f.sources,...f.market].every(s=>Date.parse(s.publishedAt)<=Date.parse(c.cutoff))&&f.market.every(s=>Date.parse(s.observedAt)<=Date.parse(c.cutoff)),'future information');
  for(const ref of [...c.expectedFacts,...c.expectedCitations]){const block=f.sources.find(s=>s.id===ref.sourceId)?.blocks.find(b=>b.id===ref.blockId);requireBenchmark(block&&(!ref.quote||block.text.includes(ref.quote)),'expected source/block/quote');}
 }
 return freeze({version:1,id:manifest.id,benchmarkVersion:manifest.benchmarkVersion,frozenAt:manifest.frozenAt,hash:objectHash(manifest),manifest,cases,fixtures});
}
