import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverEndpoints,loadInventory,validateInventory,readSource,scanRoots,scanExtensions} from '../scripts/check-model-call-inventory.mjs';
const inventory=loadInventory();
const endpoints=discoverEndpoints();
const check=data=>validateInventory(data,{endpoints});
const changed=mutate=>{const copy=structuredClone(inventory);mutate(copy);return copy;};

test('LLM inventory resolves endpoint candidates, purpose owners and named regression evidence',()=>{
 assert.deepEqual(check(inventory),{productionTransports:4,productionCallers:10,directDiagnostics:1});
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

test('Inventory records portable baseline hash semantics and keeps Gateway unimplemented',()=>{
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
 const read=p=>p==='server/agent.mjs'?readSource(p).replace('await fetchModel(', 'await otherRequest('):readSource(p);
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
 assert.deepEqual(check(inventory),{productionTransports:4,productionCallers:10,directDiagnostics:1});
});
