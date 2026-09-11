import fs from 'node:fs';
import path from 'node:path';
import {validateChampionRegistry} from '../server/model-champion.mjs';
import {objectHash} from './fixtures.mjs';
import {requireBenchmark} from './case.mjs';
import {persistBenchmark} from './runner.mjs';
export async function saveChampionRegistry(file,input,env){
 const registry=validateChampionRegistry(input,env);fs.mkdirSync(path.dirname(file),{recursive:true});
 const lock=file+'.lock',fd=fs.openSync(lock,'wx');fs.closeSync(fd);
 try{
  if(fs.existsSync(file)){const prior=JSON.parse(fs.readFileSync(file));for(const old of prior.policies){const next=registry.policies.find(p=>p.id===old.id);requireBenchmark(next&&objectHash(next)===objectHash(old),'historical champion policy cannot be overwritten');}}
  await persistBenchmark(file,registry);return registry;
 }finally{fs.unlinkSync(lock);}
}
