import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readdirSync,readFileSync} from 'node:fs';
import {extname,join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const ownedRoots=['scripts','src','tests'];

function filesBelow(directory){
 const result=[];
 for(const entry of readdirSync(directory,{withFileTypes:true})){
  const path=join(directory,entry.name);
  if(entry.isDirectory())result.push(...filesBelow(path));
  else result.push(path);
 }
 return result;
}

test('repository-owned JavaScript source stays migrated to TypeScript',()=>{
 const legacy=ownedRoots.flatMap(name=>filesBelow(join(root,name)))
  .filter(path=>['.js','.jsx','.mjs'].includes(extname(path)))
  .map(path=>relative(root,path).replaceAll('\\','/'));
 assert.deepEqual(legacy,[]);
 assert.ok(existsSync(join(root,'vite.config.ts')));
 assert.ok(existsSync(join(root,'src','main.tsx')));
 assert.equal(existsSync(join(root,'server')),false);
 assert.equal(existsSync(join(root,'shared')),false);
 assert.equal(existsSync(join(root,'benchmark','runner.py')),true);
 const benchmarkLegacy=filesBelow(join(root,'benchmark')).filter(path=>['.js','.jsx','.mjs','.ts','.tsx'].includes(extname(path)));
 assert.deepEqual(benchmarkLegacy,[]);
 assert.equal(existsSync(join(root,'jsconfig.json')),false);
 assert.equal(existsSync(join(root,'MANIFEST.json')),false);
 assert.equal(existsSync(join(root,'scripts','update-manifest.ts')),false);
 const retiredImports=['server','shared'].map(name=>['..',name,''].join('/'));
 const stale=['scripts','src'].flatMap(name=>filesBelow(join(root,name)))
  .filter(path=>['.ts','.tsx'].includes(extname(path)))
  .flatMap(path=>retiredImports.filter(specifier=>readFileSync(path,'utf8').includes(specifier)).map(specifier=>`${relative(root,path).replaceAll('\\','/')}: ${specifier}`));
 assert.deepEqual(stale,[]);
});

test('tooling and package entrypoints use the TypeScript baseline',()=>{
 const pkg=JSON.parse(readFileSync(join(root,'package.json'),'utf8'));
 const commands=Object.values(pkg.scripts).join('\n');
 assert.doesNotMatch(commands,/\.(?:mjs|jsx)\b/);
 assert.doesNotMatch(commands,/manifest:update|update-manifest/);
 for(const [name,command] of Object.entries(pkg.scripts)){
  if(/(?:^|\s)(?:scripts|tests)\/.+\.ts\b/.test(command))assert.match(command,/node --experimental-strip-types/,name);
 }
 const config=JSON.parse(readFileSync(join(root,'tsconfig.json'),'utf8'));
 for(const name of ownedRoots)assert.ok(config.include.some(pattern=>pattern.startsWith(`${name}/`)),name);
 const strict=JSON.parse(readFileSync(join(root,'tsconfig.strict.json'),'utf8'));
 assert.equal(strict.compilerOptions.strict,true);
 assert.equal(strict.compilerOptions.noCheck,false);
 for(const path of ['eslint.config.ts','vitest.config.ts','src/generated/api-schema.ts','scripts/generate-api-types.ts'])assert.ok(existsSync(join(root,path)),path);
 for(const name of ['lint','test:components','api:types:check','quality:frontend'])assert.equal(typeof pkg.scripts[name],'string',name);
 for(const name of ['redux','@reduxjs/toolkit','zustand','mobx','recoil'])assert.equal(pkg.dependencies[name],undefined,`${name} requires a recorded state-management trigger`);
 const components=JSON.parse(readFileSync(join(root,'components.json'),'utf8'));
 assert.equal(components.tsx,true);
});
