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
// V4.8.4 migrates all historical transports, including the live diagnostic.
// The V4.8.0 JSON remains historical; no baseline hashes are rewritten.
export const gatewayAdapters=Object.freeze([Object.freeze({file:'server/model-adapter.mjs',endpoint:'/chat/completions'})]);
const migrated=[
 {id:'analysis',file:'server/agent.mjs',owner:'completion',transport:'fetchModel',stream:'stream:true',scope:'production'},
 {id:'path',file:'server/research-path.mjs',owner:'createPathResolver',transport:'fetchImpl',stream:'stream:false',scope:'production',purpose:'router'},
 {id:'security-intent',file:'server/security-intent.mjs',owner:'createSecurityIntentExtractor',transport:'fetchImpl',stream:'stream:false',scope:'production',purpose:'router'},
 {id:'vision',file:'server/vision-model.mjs',owner:'readVisionImages',transport:'fetcher',stream:'stream:false',scope:'production',purpose:'vision'},
 {id:'diagnostic',file:'scripts/dual-model-diagnostics.mjs',owner:"phase='pro'",transport:'fetch',stream:'stream omitted',scope:'diagnostic',purpose:'research'},
];
export const readSource=p=>fs.readFileSync(path.join(root,p),'utf8');
export const loadInventory=()=>JSON.parse(readSource('docs/releases/V4.8/model-call-inventory.json'));
export const loadVisionInventory=()=>JSON.parse(readSource('docs/releases/V4.9/vision-call-inventory.json'));
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
export function validateGatewayBoundary({read=readSource}={}){
 for(const file of ['server/vision-model.mjs','server/document-reader.mjs','server/material-vision.mjs','server/visual-reading.mjs','server/agent-page-reader.mjs','server/pdf-extractor.mjs','server/pdf-processing.mjs']){
  assert.doesNotMatch(read(file),/\b(?:model|visionModel)\s*[!=]==|\bthinking\s*[:=]|(?:deepseek|glm|qwen)-/i,'Gateway Vision business capability must use Catalog/adapter: '+file);
 }
 const adapter=read('server/model-adapter.mjs'),gateway=read('server/model-gateway.mjs');
 assert.equal([...adapter.matchAll(/\bawait abortable\(pending,/g)].length,1,'Gateway response await boundary changed');
 assert.equal([...adapter.matchAll(/\bfetchModel\(/g)].length,1,'Gateway must reuse one request owner');
 for(const owner of ['model-request','model-deadline','model-stream'])assert.ok(adapter.includes(`from './${owner}.mjs'`),'Gateway missing existing guard '+owner);
 assert.ok(adapter.includes('await readCompletion(')&&adapter.includes('strict:true'),'Gateway must reuse strict completion parsing');
 assert.ok(gateway.includes("from './model-adapter.mjs'"),'Gateway adapter boundary missing');
 const agent=read('server/agent.mjs');
 assert.equal(agent.split("from './model-gateway.mjs'").length-1,1,'migrated Agent must import Gateway once');
 assert.equal([...agent.matchAll(/await gateway\.complete\(/g)].length,1,'migrated Agent must dispatch through Gateway once');
 assert.doesNotMatch(agent,/\b(?:fetch|fetchModel|readCompletion|modelRouting)\s*\(|from\s*['"][^'"]*model-(?:adapter|request|stream)\.mjs['"]|process\.env\.LLM_(?:MODEL|BASE_URL|API_KEY)/,'migrated Agent cannot own provider transport');
 for(const purpose of ['review','followup'])assert.equal(agent.split("purpose:'"+purpose+"'").length-1,1,'migrated purpose must be explicit: '+purpose);
 assert.ok(agent.includes("purpose='research'"),'research must retain its fixed legacy purpose');
 for(const entry of migrated.filter(e=>e.id!=='analysis')){
  const source=read(entry.file);
  assert.equal([...source.matchAll(/from ['"][^'"]*model-gateway\.mjs['"]/g)].length,1,'migrated owner must import Gateway once: '+entry.file);
  assert.equal([...source.matchAll(/await gateway\.complete\(/g)].length,1,'migrated owner must dispatch through Gateway once: '+entry.file);
  assert.equal(source.split("purpose:'"+entry.purpose+"'").length-1,1,'migrated purpose changed: '+entry.file);
  assert.doesNotMatch(source,/\b(?:fetch|fetchImpl|fetcher|fetchModel|readCompletion)\s*\(|\bthinking\s*:|deepseek-/i,'migrated owner cannot infer provider behavior: '+entry.file);
 }
 for(const file of [...walk('server'),...walk('scripts')].filter(p=>p.endsWith('.mjs')&&!['server/model-gateway.mjs','server/model-adapter.mjs','scripts/check-model-call-inventory.mjs'].includes(p))){
  assert.doesNotMatch(read(file),/(?:from\s*|import\s*\()\s*['"][^'"]*model-adapter\.mjs['"]/,'business code must not bypass Gateway: '+file);
  if(!migrated.some(entry=>entry.file===file))assert.doesNotMatch(read(file),/(?:from\s*|import\s*\()\s*['"][^'"]*model-gateway\.mjs['"]/,'V4.8.4 must not introduce unmapped Gateway callers: '+file);
 }
 return {gatewayAdapters:gatewayAdapters.length,migratedBusinessOwners:4,migratedDiagnostics:1};
}
export function validateInventory(inventory,{read=readSource,endpoints=discoverEndpoints(read)}={}){
 assert.equal(inventory.version,1);assert.equal(inventory.subrelease,'V4.8.0');
 // Scan scope is independent of the reviewed document; it cannot shrink to hide an omission.
 assert.deepEqual(inventory.scanRoots,scanRoots,'scan roots changed');
 assert.deepEqual(inventory.scanExtensions,scanExtensions,'scan extensions changed');
 assert.match(inventory.baselineCommit,/^[a-f0-9]{40}$/);assert.equal(inventory.hashNormalization,'utf8-lf');
 unique(inventory.transports.map(t=>t.id),'transport ID');unique(inventory.transports.map(t=>t.file),'transport owner');
 assert.deepEqual(inventory.transports.map(t=>t.id),migrated.map(t=>t.id),'historical transport set changed');
 for(const t of inventory.transports){
  sourcePath(t.file);assert.ok(['production','diagnostic'].includes(t.scope));
  assert.ok(t.scope==='diagnostic'?t.file.startsWith('scripts/'):t.file.startsWith('server/'));
  const source=read(t.file);
  assert.ok(t.owner?.trim()&&source.includes(t.owner),'missing transport owner '+t.id);
  assert.match(t.transport,/^[A-Za-z_][A-Za-z_0-9]*$/,'invalid request function');
  const previous=migrated.find(entry=>entry.id===t.id);
  {
   assert.equal(t.transport,previous.transport,'historical request function must resolve once before migration');
   assert.equal(t.file,previous.file,'historical migrated transport owner changed');
   assert.equal(t.owner,previous.owner,'historical migrated transport function changed');
   assert.equal(t.scope,previous.scope,'historical migrated transport scope changed');
   assert.equal(t.stream,previous.stream,'historical stream declaration differs');
   assert.equal(t.endpoint,gatewayAdapters[0].endpoint,'historical migrated transport endpoint changed');
   assert.equal(t.endpointOccurrences,1,'historical migrated endpoint count changed');
  }
  const transport='gateway\\.complete';
  assert.equal([...source.matchAll(new RegExp('\\bawait\\s+'+transport+'\\s*\\(','g'))].length,1,'request function must resolve once: '+t.id);
  assert.ok(['stream:true','stream:false','stream omitted'].includes(t.stream),'invalid stream declaration');
  // Check the current literal property, including absence. Dynamic values and
  // multiple declarations require manual inventory review rather than guessing.
  const streamValues=[...source.matchAll(/\bstream\b["']?\s*:\s*([^,}\s]+)/g)].map(match=>match[1]);
  assert.deepEqual(streamValues,[t.id==='analysis'?'true':'false'],'stream declaration differs from source: '+t.id);
  assert.ok(Number.isInteger(t.endpointOccurrences)&&t.endpointOccurrences>0);
  assert.match(t.baselineSha256,/^[a-f0-9]{64}$/);assert.ok(t.purposes.length);unique(t.purposes,'transport purpose');
 }
 const order=(a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b));
 const expected=[...gatewayAdapters];
 assert.deepEqual([...endpoints].sort(order),expected.sort(order),'endpoint inventory differs from source candidates');
 assert.equal(inventory.transports.filter(t=>t.scope==='production').length,4);
 assert.equal(inventory.transports.filter(t=>t.scope==='diagnostic').length,1);
 unique(inventory.callers.map(c=>c.id),'caller ID');unique(inventory.callers.map(c=>c.file+'\0'+c.anchor),'caller anchor');
 assert.deepEqual([...new Set(inventory.callers.map(c=>c.purpose))].sort(),['followup','research','review','router','vision']);
 for(const c of inventory.callers){
  sourcePath(c.file);assert.ok(c.anchor?.trim(),'empty caller anchor');
  const t=inventory.transports.find(t=>t.id===c.transport);
  assert.ok(t?.scope==='production'&&t.purposes.includes(c.purpose),'caller purpose incompatible with transport: '+c.id);
  let anchor=c.anchor;
  if(['path-classification','security-mention-extraction'].includes(c.id)){
   assert.equal(anchor,'const response=await fetchImpl','historical caller anchor changed');
   anchor='const response=await gateway.complete';
  }
  assert.equal(read(c.file).split(anchor).length-1,1,'caller anchor must resolve once: '+c.id);
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
 validateGatewayBoundary({read});
 return {productionTransports:1,productionCallers:inventory.callers.length,directDiagnostics:0};
}
// V4.9.0 extends the existing inventory checker; it is not a second transport
// scanner. Hashes and lexical anchors are drift alarms, not semantic proofs.
export function validateVisionInventory(inventory,{read=readSource,files=scanRoots.flatMap(walk)}={}){
 assert.equal(inventory.version,1);assert.equal(inventory.subrelease,'V4.9.0');
 assert.deepEqual(inventory.scanRoots,scanRoots);assert.deepEqual(inventory.scanExtensions,scanExtensions);
 assert.match(inventory.baselineCommit,/^[a-f0-9]{40}$/);assert.equal(inventory.hashNormalization,'utf8-lf');
 const historical=loadInventory().callers.filter(c=>c.purpose==='vision');
 assert.deepEqual(inventory.callers,historical,'Vision semantic callers differ from reviewed baseline');
 const consumers=files.filter(file=>scanExtensions.includes(path.extname(file))&&file!=='scripts/check-model-call-inventory.mjs')
  .filter(file=>/(?:from\s*|import\s*\()\s*['"][^'"]*vision-model\.mjs['"]/.test(read(file))).sort();
 assert.deepEqual(consumers,[...(inventory.currentWrapperConsumers??inventory.wrapperConsumers)].sort(),'unmapped Vision wrapper consumer');
 unique(inventory.owners.map(owner=>owner.file),'Vision owner');
 for(const owner of inventory.owners){
  if(owner.file!=='.env.example')sourcePath(owner.file);
  assert.match(owner.sha256,/^[a-f0-9]{64}$/);
  if(owner.currentSha256!==undefined)assert.match(owner.currentSha256,/^[a-f0-9]{64}$/);
  assert.equal(hash(read(owner.file)),owner.currentSha256??owner.sha256,'Vision reviewed source changed: '+owner.file);
 }
 for(const group of ['limits','modelBranches','evidenceGuards']){
  assert.ok(inventory[group].length,'empty Vision '+group);unique(inventory[group].map(entry=>entry.id),group);
  for(const entry of inventory[group]){
   sourcePath(entry.file);assert.ok(entry.description?.trim()&&entry.anchor?.trim(),'missing Vision annotation');
   assert.ok(inventory.owners.some(owner=>owner.file===entry.file),'unreviewed Vision owner');
   assert.ok(read(entry.file).includes(entry.anchor),'Vision '+group+' anchor missing: '+entry.id);
  }
 }
 validateInventory(loadInventory(),{read,endpoints:discoverEndpoints(read,files)});
 return {visionCallers:inventory.callers.length,visionWrapperConsumers:consumers.length,reviewedOwners:inventory.owners.length};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 try{
  assert.ok(process.argv.slice(2).every(arg=>['--baseline','--vision'].includes(arg)),'only --baseline and --vision are supported');
  const inventory=loadInventory(),result={...validateInventory(inventory),...validateGatewayBoundary()};
  if(process.argv.includes('--vision'))Object.assign(result,validateVisionInventory(loadVisionInventory()));
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
