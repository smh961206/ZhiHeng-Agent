import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {parseEnv} from 'node:util';

const root=fileURLToPath(new URL('../',import.meta.url));
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const exists=p=>fs.existsSync(path.join(root,p));
const manifest=()=>JSON.parse(read('MANIFEST.json'));

test('Public deployment templates agree on model routing and never ship credentials or enabled promotion',()=>{
 const local=parseEnv(read('.env.example')),production=parseEnv(read('.env.production.example'));
 const keys=['LLM_MODEL','LLM_VISION_MODEL','LLM_VISION_INPUT','LLM_MAIN_MODEL','LLM_PRO_MODEL','MODEL_ROUTING_MODE','FEATURE_VISION_ROUTING','VISION_ACCEPTANCE_FILE','LLM_TIMEOUT_MS','LLM_MAX_DURATION_MS',
  'LLM_VISION_CHALLENGER_MODEL','LLM_VISION_CHALLENGER_PROVIDER','LLM_VISION_CHALLENGER_BASE_URL','LLM_VISION_CHALLENGER_INPUT','LLM_VISION_CHALLENGER_THINKING'];
 for(const key of keys){assert.ok(Object.hasOwn(local,key),key);assert.equal(production[key],local[key],key);}
 for(const env of [local,production]){
  assert.equal(env.MODEL_ROUTING_MODE,'legacy');assert.equal(env.FEATURE_VISION_ROUTING,'false');
  for(const key of Object.keys(env).filter(key=>key.endsWith('_API_KEY')))assert.equal(env[key],'',key+' must be an empty placeholder');
 }
});

test('Harness active release and H0 sequence navigate to real specifications',()=>{
 const current=read('docs/releases/CURRENT').trim();
 assert.match(current,/^(?:H0|V\d+\.\d+)$/);
 assert.ok(exists(`docs/releases/${current}/DETAILED_INDEX.md`));
 for(const p of ['AGENTS.md','CODEX_EXECUTION_PROTOCOL.md','EXECUTE_H0_FIRST.md'])assert.match(read(p),/CURRENT/);
 const index=read('docs/releases/H0/DETAILED_INDEX.md');
 assert.deepEqual([...index.matchAll(/\[H0\.(\d) /g)].map(m=>m[1]),['0','1','2','3']);
 for(const [,target] of index.matchAll(/\]\(([^)]+)\)/g))assert.ok(exists(path.join('docs/releases/H0',target)),target);
});

test('Harness packaged markdown relative links resolve without requiring future runtime files',()=>{
 for(const {path:source} of manifest().files.filter(f=>f.path.endsWith('.md'))){
  for(const [,raw] of read(source).matchAll(/\]\(([^)]+)\)/g)){
   const link=raw.replace(/^<|>$/g,'').split('#')[0];
   if(!link||/^(?:[a-z]+:|\/)/i.test(link)||link.includes('<')||link.includes(' '))continue;
   const target=path.resolve(root,path.dirname(source),decodeURIComponent(link));
   assert.ok(fs.existsSync(target),`${source} -> ${raw}`);
  }
 }
});

test('Current implementation map names real owners and inventory has unique baseline files',()=>{
 const map=read('docs/architecture/current-implementation-map.md');
 for(const [,target] of map.matchAll(/`((?:server|shared|src|tests|scripts|knowledge|benchmark)\/[^`]+)`/g))assert.ok(exists(target),target);
 const inventory=JSON.parse(read('docs/releases/H0/repository-inventory.json'));
 assert.match(inventory.baselineCommit,/^[a-f0-9]{40}$/);
 assert.equal(new Set(inventory.files.map(f=>f.path)).size,inventory.files.length);
 for(const file of inventory.files){assert.ok(exists(file.path),file.path);assert.match(file.sha256,/^[a-f0-9]{64}$/);}
 // Hashes record the H0 baseline; later authorized releases may evolve runtime.
});

test('Domain contracts separate implementation status from future requirements',()=>{
 for(const name of fs.readdirSync(path.join(root,'docs/contracts')).filter(n=>n.endsWith('.contract.md'))){
  const text=read('docs/contracts/'+name);
  assert.match(text,/Implementation Status: (CURRENT|PARTIAL|FUTURE|DEPRECATED)(?=[; .\n])/);
  assert.doesNotMatch(text,/Implementation Status: (?:CURRENT|PARTIAL|FUTURE)\//);
  assert.match(text,/H0 implementation evidence/);
 }
 const table=read('docs/architecture/01-domain-model.md');
 assert.doesNotMatch(table,/CURRENT\/PARTIAL|FUTURE\/PARTIAL|PARTIAL\/FUTURE/);
 for(const {path:p} of manifest().files.filter(f=>/^docs\/releases\/V.*\.md$/.test(f.path)))assert.doesNotMatch(read(p),/FUTURE until CURRENT is changed|FUTURE` unless this release/,'activation must not claim implementation: '+p);
});

test('H0 retains normalized subrelease sections and explicit zero-runtime boundary',()=>{
 for(const name of fs.readdirSync(path.join(root,'docs/releases/H0/subreleases'))){
  const text=read('docs/releases/H0/subreleases/'+name);
  assert.deepEqual([...text.matchAll(/^## (\d+)\./gm)].map(m=>Number(m[1])),Array.from({length:26},(_,i)=>i+1));
  assert.match(text,/No persistent schema change/);
  assert.match(text,/No external API change/);
  assert.match(text,/runtime behavior delta must be zero/);
 }
});

test('Harness manifest uniquely tracks exact packaged bytes and hashes',()=>{
 const m=manifest();
 assert.equal(m.files.length,m.fileCount);
 assert.equal(new Set(m.files.map(f=>f.path)).size,m.fileCount);
 for(const entry of m.files){
  assert.notEqual(entry.path,'MANIFEST.json','manifest must not hash itself');
  const bytes=fs.readFileSync(path.join(root,entry.path));
  assert.equal(bytes.length,entry.bytes,`${entry.path}: byte length`);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256,`${entry.path}: hash`);
 }
});

test('Deployment fixture includes all local runtime COPY directories',()=>{
 const script=read('tests/deploy.integration.sh');
 const copied=script.match(/cp -r "\$source_dir"\/\{([^}]+)\}/)?.[1].split(',');
 assert.ok(copied,'fixture directory list');
 for(const [,directory] of read('Dockerfile').matchAll(/^COPY --chown=node:node (\w+) \.\/\w+$/gm))assert.ok(copied.includes(directory),`deployment fixture must copy ${directory}`);
});
