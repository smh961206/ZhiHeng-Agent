import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverEndpoints,loadInventory,validateInventory,validateGatewayBoundary,gatewayAdapters,readSource,scanRoots,scanExtensions} from '../scripts/check-model-call-inventory.mjs';
const inventory=loadInventory();
const endpoints=discoverEndpoints();
const check=data=>validateInventory(data,{endpoints});
const changed=mutate=>{const copy=structuredClone(inventory);mutate(copy);return copy;};

test('LLM inventory resolves endpoint candidates, purpose owners and named regression evidence',()=>{
 assert.deepEqual(check(inventory),{productionTransports:1,productionCallers:10,directDiagnostics:0});
});

test('Inventory cannot shrink scan coverage or hide a new provider endpoint',()=>{
 assert.throws(()=>check(changed(data=>data.scanRoots.pop())),/scan roots changed/);
 assert.throws(()=>check(changed(data=>data.scanExtensions.pop())),/scan extensions changed/);
 for(const endpoint of ['/chat/completions','/responses','/messages','generateContent']){
  const added=discoverEndpoints(()=>`fetch('https://model.invalid/${endpoint.replace(/^\//,'')}')`,['server/new-provider.mjs']);
  assert.equal(added.length,1);
  assert.throws(()=>validateInventory(inventory,{endpoints:[...endpoints,...added]}),/endpoint inventory differs/);
 }
 assert.throws(()=>validateInventory(inventory,{endpoints:endpoints.slice(1)}),/endpoint inventory differs/);
});

test('Duplicate transport IDs, repeated callers and incompatible purposes are rejected',()=>{
 assert.throws(()=>check(changed(data=>data.transports[1].id=data.transports[0].id)),/duplicate transport ID/);
 assert.throws(()=>check(changed(data=>data.callers.push({...data.callers[0],id:'duplicate-anchor'}))),/duplicate caller anchor/);
 assert.throws(()=>check(changed(data=>data.callers[0].transport='vision')),/purpose incompatible/);
 assert.throws(()=>check(changed(data=>data.callers.pop())),/caller count drift/);
});

test('An unrelated existing test file or invented test title cannot stand in for coverage',()=>{
 assert.throws(()=>check(changed(data=>data.callers.find(c=>c.id==='targeted-page-read').tests[0].file='tests/agent.test.mjs')),/missing named test/);
 assert.throws(()=>check(changed(data=>data.callers.find(c=>c.id==='research-budget-exhausted').tests[0].file='tests/research-pipeline.test.mjs')),/missing named test/);
 assert.throws(()=>check(changed(data=>data.callers[0].tests[0].title='nonexistent coverage')),/missing named test/);
 assert.throws(()=>check(changed(data=>data.callers[0].tests=[])),/missing test evidence/);
});

test('Missing and ambiguous source anchors cannot satisfy the purpose map',()=>{
 assert.throws(()=>check(changed(data=>data.callers[0].anchor='')),/empty caller anchor/);
 assert.throws(()=>check(changed(data=>data.callers[0].anchor='requestCompletion')),/anchor must resolve once/);
 const read=p=>readSource(p).replace('const finalMessage=await requestCompletion','const finalMessage=await missingCompletion');
 assert.throws(()=>validateInventory(inventory,{read,endpoints}),/anchor must resolve once/);
});

test('Inventory records portable baseline hash semantics and historical Gateway status',()=>{
 assert.throws(()=>check(changed(data=>delete data.hashNormalization)),/utf8-lf/);
 assert.throws(()=>check(changed(data=>data.transports[0].baselineSha256='invalid')),/match/);
 assert.match(inventory.status,/Gateway FUTURE/);
 assert.match(readSource('docs/releases/V4.8/model-call-inventory.md'),/MODEL_ROUTING_MODE.*FUTURE/);
});

test('Transport function and stream metadata must match the actual request source',()=>{
 assert.throws(()=>check(changed(data=>data.transports[0].transport='nonexistentFetcher')),/request function must resolve once/);
 assert.throws(()=>check(changed(data=>data.transports[0].stream='stream:false')),/stream declaration differs/);
 assert.throws(()=>check(changed(data=>data.transports[0].stream='stream omitted')),/stream declaration differs/);
 assert.throws(()=>check(changed(data=>data.transports.at(-1).stream='stream:false')),/stream declaration differs/);
 for(const replacement of ['stream:false','stream:runtimeOption']){
  const read=p=>p==='server/agent.mjs'?readSource(p).replace('stream:true',replacement):readSource(p);
  assert.throws(()=>validateInventory(inventory,{read,endpoints}),/stream declaration differs/);
 }
 const read=p=>p==='server/agent.mjs'?readSource(p).replace('await gateway.complete(', 'await otherRequest('):readSource(p);
 assert.throws(()=>validateInventory(inventory,{read,endpoints}),/request function must resolve once/);
});

test('Inventory source paths reject traversal and aliases before reading the target',()=>{
 for(const file of ['tests/../tests/agent.test.mjs','tests/./agent.test.mjs','tests//agent.test.mjs','tests/a/../../agent.test.mjs']){
  const data=changed(d=>d.callers[0].tests[0].file=file);
  const read=p=>{assert.notEqual(p,file,'noncanonical target must not be read');return readSource(p);};
  assert.throws(()=>validateInventory(data,{read,endpoints}),/noncanonical repository source path/);
 }
 for(const file of ['../tests/agent.test.mjs','/tests/agent.test.mjs','tests\\agent.test.mjs'])assert.throws(()=>check(changed(d=>d.callers[0].tests[0].file=file)),/invalid repository source path/);
});

test('Imported scan configuration cannot be mutated to narrow validation',()=>{
 assert.throws(()=>scanRoots.pop(),TypeError);
 assert.throws(()=>scanExtensions.splice(0,1),TypeError);
 assert.throws(()=>{scanRoots[0]='tests';},TypeError);
 assert.deepEqual(check(inventory),{productionTransports:1,productionCallers:10,directDiagnostics:0});
});

test('V4.8.4 tracks one Gateway adapter replacing all production and diagnostic endpoints',()=>{
 assert.deepEqual(validateGatewayBoundary(),{gatewayAdapters:1,migratedBusinessOwners:4,migratedDiagnostics:1});
 assert.deepEqual(endpoints.filter(e=>e.file==='server/model-adapter.mjs'),gatewayAdapters);
 assert.equal(endpoints.filter(e=>e.file==='server/agent.mjs').length,0);
 assert.throws(()=>gatewayAdapters.pop(),TypeError);
 assert.throws(()=>{gatewayAdapters[0].file='server/other.mjs';},TypeError);
 assert.throws(()=>validateInventory(inventory,{endpoints:[...endpoints,...gatewayAdapters]}),/endpoint inventory differs/);
 assert.throws(()=>validateInventory(inventory,{endpoints:[...endpoints,{file:'server/agent.mjs',endpoint:'/chat/completions'}]}),/endpoint inventory differs/);
 assert.throws(()=>check(changed(data=>data.transports[0].endpoint='/responses')),/historical migrated transport endpoint/);
 assert.throws(()=>check(changed(data=>data.transports[0].endpointOccurrences=2)),/historical migrated endpoint count/);
});

test('Gateway boundary rejects missing guards, bypasses and duplicate or unmapped callers',()=>{
 for(const [file,replace] of [
  ['server/model-adapter.mjs',s=>s.replace('strict:true','strict:false')],
  ['server/model-adapter.mjs',s=>s.replace("from './model-stream.mjs'","from './parallel-parser.mjs'")],
  ['server/agent.mjs',s=>s+"\nimport {modelGateway} from './model-gateway.mjs';\n"],
  ['server/agent.mjs',s=>s.replace('await gateway.complete(', 'await fetch(')],
  ['server/agent.mjs',s=>s.replace("purpose:'review'","purpose:'research'")],
  ['server/agent.mjs',s=>s+"\nimport {completeLegacyChat} from './model-adapter.mjs';\n"],
  ['server/research-path.mjs',s=>s+"\nimport {modelGateway} from './model-gateway.mjs';\n"],
  ['server/research-path.mjs',s=>s.replace("purpose:'router'","purpose:'research'")],
  ['server/security-intent.mjs',s=>s.replace('await gateway.complete(', 'await fetchImpl(')],
  ['server/vision-model.mjs',s=>s+"\nconst thinking={model:'deepseek-other'};\n"],
  ['scripts/dual-model-diagnostics.mjs',s=>s.replace('await gateway.complete(', 'await fetch(')],
  ['server/evidence-followup.mjs',s=>s+"\nimport {modelGateway} from './model-gateway.mjs';\n"],
 ]){
  assert.throws(()=>validateGatewayBoundary({read:p=>p===file?replace(readSource(p)):readSource(p)}),/Gateway|V4.8.4|migrated/);
 }
});
