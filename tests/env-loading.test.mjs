import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

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

test('Current configuration files have one organized schema-v2 path and no active acceptance directories',()=>{
 const root=fileURLToPath(new URL('..',import.meta.url));
 const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
 assert.equal(Object.hasOwn(pkg.scripts,'models:preview'),false);
 assert.equal(Object.hasOwn(pkg.scripts,'start:legacy'),false);
 for(const name of ['.env.example','.env.production.example']){
  const source=fs.readFileSync(path.join(root,name),'utf8');
  assert.doesNotMatch(source,/\.env(?:\.production)?\.models|ACCEPTANCE_FILE|MODEL_CHAMPION|MODEL_AB_ENABLED|FEATURE_VISION_ROUTING|FEATURE_COST_ROUTER|RESEARCH_BUDGET_FILE|FEATURE_RESEARCH_BUDGET/);
  assert.deepEqual([...source.matchAll(/^# ── (\d{2}) ·/gm)].map(match=>match[1]),['01','02','03','04','05','06']);
  const keys=[...source.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map(match=>match[1]);
  assert.equal(new Set(keys).size,keys.length);
 }
 const models=JSON.parse(fs.readFileSync(path.join(root,'config/models.example.json'),'utf8'));
 assert.equal(models.schemaVersion,2);
 assert.deepEqual(Object.keys(models.pipeline),['input','vision','researcher','writer','evidenceVerifier','auditor','criticalReviewer','judge']);
 for(const old of ['model_policy_acceptance_file','vision_acceptance_file'])assert.equal(fs.existsSync(path.join(root,old)),false);
 assert.equal(fs.existsSync(path.join(root,'docs/releases/V4.9/archive/vision-acceptance-glm53-fields-20260911-approved.json')),true);
 const deploy=fs.readFileSync(path.join(root,'DEPLOY.md'),'utf8');
 assert.doesNotMatch(deploy,/models\.production\.preview|MODEL_POLICY_ACCEPTANCE_FILE|VISION_ACCEPTANCE_FILE|MODEL_CHAMPION|MODEL_AB_ENABLED|RESEARCH_BUDGET_FILE|FEATURE_RESEARCH_BUDGET|research-budget\.production/);
 const create=fs.readFileSync(path.join(root,'server/research-create.mjs'),'utf8');
 assert.doesNotMatch(create,/configuredResearchBudget|budgetState=/);
 for(const name of ['.gitignore','.dockerignore'])assert.doesNotMatch(fs.readFileSync(path.join(root,name),'utf8'),/flagship-review\.acceptance|judge\.acceptance/);
});
