import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const args=pkg.scripts.start.split(' ').slice(1,-1);
function fixture(run){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'zhiheng-env-loading-'));
 try{return run(dir);}finally{fs.rmSync(dir,{recursive:true,force:true});}
}
function read(dir,extra={}){
 const env={...process.env};
 for(const name of Object.keys(env))if(/^(LLM_|MODEL_|FEATURE_VISION_|VISION_ACCEPTANCE|NODE_OPTIONS)/.test(name))delete env[name];
 const result=spawnSync(process.execPath,[...args,'-e',`console.log(JSON.stringify({model:process.env.LLM_MODEL,main:process.env.LLM_MAIN_MODEL,key:process.env.LLM_MAIN_API_KEY,mode:process.env.MODEL_ROUTING_MODE}))`],{cwd:dir,env:{...env,...extra},encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);return JSON.parse(result.stdout);
}

test('Local command loads model credentials and policy controls from one environment file',()=>fixture(dir=>{
 fs.writeFileSync(path.join(dir,'.env'),'LLM_MODEL=baseline\nMODEL_ROUTING_MODE=legacy\nLLM_MAIN_MODEL=candidate\nLLM_MAIN_API_KEY="synthetic # quoted"\n');
 assert.deepEqual(read(dir),{model:'baseline',mode:'legacy',main:'candidate',key:'synthetic # quoted'});
}));

test('Single environment file preserves legacy variable compatibility',()=>fixture(dir=>{
 fs.writeFileSync(path.join(dir,'.env'),'LLM_MODEL=baseline\nLLM_MAIN_MODEL=old-main\nMODEL_ROUTING_MODE=legacy\n');
 assert.deepEqual(read(dir),{model:'baseline',main:'old-main',mode:'legacy'});
}));

test('Inherited process environment takes precedence over the environment file',()=>fixture(dir=>{
 fs.writeFileSync(path.join(dir,'.env'),'LLM_MAIN_MODEL=basic\n');
 assert.equal(read(dir).main,'basic');
 assert.equal(read(dir,{LLM_MAIN_MODEL:'inherited'}).main,'inherited');
}));

test('Dev, commands and production Compose use one environment file per environment',()=>{
 for(const command of Object.values(pkg.scripts).filter(c=>c.includes('--env-file-if-exists=.env ')))
  assert.doesNotMatch(command,/\.env\.models/);
 const dev=fs.readFileSync(new URL('../scripts/dev.mjs',import.meta.url),'utf8');
 assert.ok(dev.includes("['--env-file-if-exists=.env','server/index.mjs']"));
 const compose=fs.readFileSync(new URL('../compose.production.yaml',import.meta.url),'utf8');
 assert.match(compose,/env_file:\s+- path: \.env\.production\s+required: true/);
 assert.doesNotMatch(compose,/\.env\.production\.models/);
 assert.equal(fs.existsSync(new URL('../.env.models.example',import.meta.url)),false);
});
