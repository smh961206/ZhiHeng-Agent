import test from 'node:test';
import assert from 'node:assert/strict';
import {MongoClient} from 'mongodb';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:net';
import {setTimeout as pause} from 'node:timers/promises';
import {createStorage} from '../server/storage.mjs';
import {createResearchPlan,frameworkVersion} from '../shared/research-framework.mjs';
import {createJobRuleSession} from '../server/knowledge.mjs';

test('rule excerpt API reads saved job provenance through real storage and never accepts arbitrary file paths',{timeout:20000},async()=>{
 const uri=process.env.MONGODB_URI||'mongodb://127.0.0.1:27017',database='zhiheng_knowledge_test_'+randomUUID().replaceAll('-','');
 const reservation=createServer();reservation.listen(0,'127.0.0.1');await once(reservation,'listening');const port=reservation.address().port;await new Promise(resolve=>reservation.close(resolve));
 const storage=await createStorage({uri,database});
 const job={id:randomUUID(),status:'completed',createdAt:new Date().toISOString(),mode:'B',input:{question:'合成规则核对',sources:[]},plan:createResearchPlan({mode:'B'}),events:[]};
 const session=createJobRuleSession(job),result=session.searchRules('7.3 DCF 计算协议',{limit:1,maxChars:140});
 await storage.saveJob(job);const receipt=job.knowledgeUsage.records.find(row=>row.kind==='context');
 const child=spawn(process.execPath,['server/index.mjs'],{cwd:new URL('../',import.meta.url),env:{...process.env,HOST:'127.0.0.1',PORT:String(port),MONGODB_URI:uri,MONGODB_DATABASE:database,LLM_API_KEY:'',LLM_MODEL:''},stdio:['ignore','pipe','pipe']});
 let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);
 const base='http://127.0.0.1:'+port;
 try{
  let ready=false;for(let n=0;n<100;n++){try{if((await fetch(base+'/api/health')).ok){ready=true;break;}}catch{}await pause(30);}assert.ok(ready,output);
  const config=await (await fetch(base+'/api/config')).json();assert.equal(config.knowledgeVersion,frameworkVersion);assert.equal(config.knowledgeSnapshot.id,job.plan.knowledgeSnapshot.id);
  const url=base+'/api/jobs/'+job.id+'/rules?record=';
  const response=await fetch(url+receipt.key);assert.equal(response.status,200);const excerpt=await response.json();
  assert.equal(excerpt.content,result.sections[0].content);assert.equal(excerpt.snapshot.id,job.plan.knowledgeSnapshot.id);
  assert.equal((await fetch(url+encodeURIComponent('../../knowledge/ENTRY.md'))).status,404);
  assert.equal((await fetch(base+'/api/jobs/'+randomUUID()+'/rules?record='+receipt.key)).status,404);
  const updated=structuredClone(job);updated.knowledgeUsage.records.find(row=>row.key===receipt.key).sha256='corrupt';await storage.saveJob(updated);
  assert.equal((await fetch(url+receipt.key)).status,409);
 }finally{
  if(child.exitCode===null){const stopped=once(child,'exit');child.kill();await stopped;}
  await storage.close();const cleanup=new MongoClient(uri);try{await cleanup.connect();await cleanup.db(database).dropDatabase();}finally{await cleanup.close();}
 }
});
