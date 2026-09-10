// Read-only development check. No provider calls, environment loading or manifest writes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url));
export const scanRoots=Object.freeze(['server','scripts','src','shared']);
export const scanExtensions=Object.freeze(['.mjs','.js','.jsx']);
export const readSource=p=>fs.readFileSync(path.join(root,p),'utf8');
export const loadInventory=()=>JSON.parse(readSource('docs/releases/V4.8/model-call-inventory.json'));
const hash=text=>createHash('sha256').update(text.replaceAll('\r\n','\n'),'utf8').digest('hex');
function walk(dir){return fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+'/'+e.name):[dir+'/'+e.name]);}
export function discoverEndpoints(read=readSource,files=scanRoots.flatMap(walk)){
 const matches=[];
 // Lexical candidates, including comments/strings. They require review, not automatic LLM classification.
 // Exclude only this checker: its search expressions are not model requests.
 const pattern=/\/chat\/completions|\/responses\b|\/messages\b|\b(?:streamGenerateContent|generateContent)\b/g;
 for(const file of files.filter(p=>scanExtensions.includes(path.extname(p)))){
  if(file==='scripts/check-model-call-inventory.mjs')continue;
  for(const match of read(file).matchAll(pattern))matches.push({file,endpoint:match[0]});
 }
 return matches;
}
const unique=(items,label)=>assert.equal(new Set(items).size,items.length,'duplicate '+label);
const sourcePath=p=>{
 assert.match(p,/^(?:server|scripts|src|shared|tests)\/[\w./-]+$/,'invalid repository source path');
 // Check segments directly: ^ inside a lookahead after the root does not mean
 // the start of that suffix and previously missed a leading ../ segment.
 assert.ok(p.split('/').every(part=>part&&part!=='.'&&part!=='..'),'noncanonical repository source path');
};
export function validateInventory(inventory,{read=readSource,endpoints=discoverEndpoints(read)}={}){
 assert.equal(inventory.version,1);assert.equal(inventory.subrelease,'V4.8.0');
 // Scan scope is independent of the reviewed document; it cannot shrink to hide an omission.
 assert.deepEqual(inventory.scanRoots,scanRoots,'scan roots changed');
 assert.deepEqual(inventory.scanExtensions,scanExtensions,'scan extensions changed');
 assert.match(inventory.baselineCommit,/^[a-f0-9]{40}$/);assert.equal(inventory.hashNormalization,'utf8-lf');
 unique(inventory.transports.map(t=>t.id),'transport ID');unique(inventory.transports.map(t=>t.file),'transport owner');
 for(const t of inventory.transports){
  sourcePath(t.file);assert.ok(['production','diagnostic'].includes(t.scope));
  assert.ok(t.scope==='diagnostic'?t.file.startsWith('scripts/'):t.file.startsWith('server/'));
  const source=read(t.file);
  assert.ok(t.owner?.trim()&&source.includes(t.owner),'missing transport owner '+t.id);
  assert.match(t.transport,/^[A-Za-z_][A-Za-z_0-9]*$/,'invalid request function');
  assert.equal([...source.matchAll(new RegExp('\\bawait\\s+'+t.transport+'\\s*\\(','g'))].length,1,'request function must resolve once: '+t.id);
  assert.ok(['stream:true','stream:false','stream omitted'].includes(t.stream),'invalid stream declaration');
  // Check the current literal property, including absence. Dynamic values and
  // multiple declarations require manual inventory review rather than guessing.
  const streamValues=[...source.matchAll(/\bstream\b["']?\s*:\s*([^,}\s]+)/g)].map(match=>match[1]);
  assert.deepEqual(streamValues,t.stream==='stream omitted'?[]:[t.stream.slice('stream:'.length)],'stream declaration differs from source: '+t.id);
  assert.ok(Number.isInteger(t.endpointOccurrences)&&t.endpointOccurrences>0);
  assert.match(t.baselineSha256,/^[a-f0-9]{64}$/);assert.ok(t.purposes.length);unique(t.purposes,'transport purpose');
 }
 const order=(a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b));
 const expected=inventory.transports.flatMap(t=>Array.from({length:t.endpointOccurrences},()=>({file:t.file,endpoint:t.endpoint})));
 assert.deepEqual([...endpoints].sort(order),expected.sort(order),'endpoint inventory differs from source candidates');
 assert.equal(inventory.transports.filter(t=>t.scope==='production').length,4);
 assert.equal(inventory.transports.filter(t=>t.scope==='diagnostic').length,1);
 unique(inventory.callers.map(c=>c.id),'caller ID');unique(inventory.callers.map(c=>c.file+'\0'+c.anchor),'caller anchor');
 assert.deepEqual([...new Set(inventory.callers.map(c=>c.purpose))].sort(),['followup','research','review','router','vision']);
 for(const c of inventory.callers){
  sourcePath(c.file);assert.ok(c.anchor?.trim(),'empty caller anchor');
  const t=inventory.transports.find(t=>t.id===c.transport);
  assert.ok(t?.scope==='production'&&t.purposes.includes(c.purpose),'caller purpose incompatible with transport: '+c.id);
  assert.equal(read(c.file).split(c.anchor).length-1,1,'caller anchor must resolve once: '+c.id);
  assert.ok(c.tests.length,'missing test evidence '+c.id);
  for(const evidence of c.tests){
   sourcePath(evidence.file);assert.ok(evidence.file.startsWith('tests/'));assert.ok(evidence.title?.trim());
   const text=read(evidence.file);
   assert.ok(["'",'"','`'].some(q=>text.includes('test('+q+evidence.title+q)), 'missing named test: '+c.id+' -> '+evidence.title);
  }
 }
 for(const t of inventory.transports.filter(t=>t.scope==='production'))assert.deepEqual([...new Set(inventory.callers.filter(c=>c.transport===t.id).map(c=>c.purpose))].sort(),[...t.purposes].sort(),'unmapped transport purpose '+t.id);
 for(const [file,pattern] of [['server/agent.mjs',/\bawait requestCompletion\(/g],['server/visual-reading.mjs',/\bawait read\(/g],['server/agent-page-reader.mjs',/\bawait readVision\(/g]])assert.equal([...read(file).matchAll(pattern)].length,inventory.callers.filter(c=>c.file===file).length,'caller count drift '+file);
 for(const p of inventory.diagnostics){sourcePath(p);assert.ok(p.startsWith('scripts/'));read(p);}
 return {productionTransports:4,productionCallers:inventory.callers.length,directDiagnostics:1};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 try{
  assert.ok(process.argv.slice(2).every(arg=>arg==='--baseline'),'only --baseline is supported');
  const inventory=loadInventory(),result=validateInventory(inventory);
  if(process.argv.includes('--baseline')){
   // Optional historical provenance check; requires the pinned commit locally, never fetches it.
   for(const t of inventory.transports){
    const original=execFileSync('git',['show',inventory.baselineCommit+':'+t.file],{cwd:root,encoding:'utf8'});
    assert.equal(hash(original),t.baselineSha256,'historical source hash mismatch '+t.file);
   }
   result.baselineHashes='verified (UTF-8/LF)';
  }
  console.log(JSON.stringify(result));
 }catch(error){console.error(error.message);process.exitCode=1;}
}
