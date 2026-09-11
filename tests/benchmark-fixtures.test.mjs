import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {loadFrozenSuite,sha256,objectHash} from '../benchmark/fixtures.mjs';
const c={version:1,id:'C1',category:'missing_conflict',fixture:'F1',fixtureVersion:'v1',cutoff:'2025-01-01T00:00:00Z',qualityCriticality:'critical',requiredCapabilities:['textInput'],expectedFacts:[],expectedCitations:[{sourceId:'S1',blockId:'B1',quote:'not reported'}],expectedToolBehavior:[],requiredValidations:['delivery'],forbiddenBehaviors:['missing_as_zero']};
const f={version:1,id:'F1',fixtureVersion:'v1',sources:[{id:'S1',publishedAt:'2024-12-01T00:00:00Z',blocks:[{id:'B1',text:'Revenue: not reported'}]}],market:[],assets:[]};
function suite(t,change=()=>{}){const root=fs.mkdtempSync(path.join(os.tmpdir(),'zh-bench-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const fixture=structuredClone(f);change(fixture);const files=[['cases.json',[c],'cases'],['fixture.json',fixture,'fixture']].map(([name,data,kind])=>{const bytes=JSON.stringify(data);fs.writeFileSync(path.join(root,name),bytes);return {path:name,kind,sha256:sha256(bytes)};});fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify({version:1,id:'test',benchmarkVersion:'v1',frozenAt:'2025-01-02T00:00:00Z',files}));return root;}
test('V5.0.1 deterministic frozen loading preserves null and stable content identity',t=>{const root=suite(t),a=loadFrozenSuite(root),b=loadFrozenSuite(root);assert.deepEqual(a,b);assert.ok(Object.isFrozen(a.fixtures.F1.sources));assert.equal(objectHash({b:1,a:2}),objectHash({a:2,b:1}));});
test('V5.0.1 rejects changed bytes, future publication, undated input, dangling references and traversal',t=>{
 const root=suite(t);fs.appendFileSync(path.join(root,'fixture.json'),' ');assert.throws(()=>loadFrozenSuite(root),/hash mismatch/);
 for(const change of [f=>f.sources[0].publishedAt='2026-01-01T00:00:00Z',f=>delete f.sources[0].publishedAt,f=>f.sources[0].blocks[0].id='other',f=>f.assets=[{path:'missing.png',sha256:'a'.repeat(64)}]])assert.throws(()=>loadFrozenSuite(suite(t,change)),/Benchmark/);
 const other=suite(t),file=path.join(other,'manifest.json'),m=JSON.parse(fs.readFileSync(file));m.files[0].path='../cases.json';fs.writeFileSync(file,JSON.stringify(m));assert.throws(()=>loadFrozenSuite(other),/relative path/);
});
test('V5.0.1 empty digest cannot bypass immutable fixture checks',t=>{const root=suite(t),file=path.join(root,'manifest.json'),m=JSON.parse(fs.readFileSync(file));m.files[1].sha256='';fs.writeFileSync(file,JSON.stringify(m));assert.throws(()=>loadFrozenSuite(root),/hash mismatch/);});
