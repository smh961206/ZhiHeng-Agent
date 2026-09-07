import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeReferenceMaterials} from '../shared/reference-materials.mjs';
import {validateInput} from '../server/router.mjs';
import {prepareResearchRetry} from '../server/research-retry.mjs';
import {createJobCheckpoints} from '../server/job-checkpoints.mjs';
import {runAgent} from '../server/agent.mjs';
import {reviewFixture} from './fixtures/research-review.mjs';
const base={question:'合成材料研究',mode:'B',securities:[{market:'CN',symbol:'002594'}]};
const material={id:'S99',title:' 用户笔记 ',text:' 待核实的合成数字，不能当作官方披露。 ',official:true,verified:true,authorityVerified:true,type:'official-report'};
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};

test('input preserves reference materials while rejecting forged provenance and limiting size',()=>{
 const input=validateInput({...base,sources:[material]});assert.deepEqual(input.sources,[]);
 assert.equal(input.referenceMaterials[0].id,'M1');assert.equal(input.referenceMaterials[0].verified,false);assert.equal(input.referenceMaterials[0].official,undefined);
 assert.match(input.referenceMaterials[0].text,/待核实/);
 assert.throws(()=>normalizeReferenceMaterials([{...material,text:'x'.repeat(20001)}]),/20000/);
 assert.throws(()=>normalizeReferenceMaterials(Array.from({length:4},()=>({...material,text:'x'.repeat(20000)}))),/60000/);
 assert.throws(()=>normalizeReferenceMaterials([{...material,url:'https://user:password@example.com/file'}]),/链接/);
 assert.throws(()=>validateInput({...base,sources:[material],referenceMaterials:[material]}),/重复/);
});

test('retry keeps user materials but discards all previously collected evidence',async()=>{
 const input=validateInput({...base,referenceMaterials:[material]});input.sources=[{id:'S1',title:'上次官方财报',text:'旧资料'}];
 const retry=await prepareResearchRetry({id:'test',status:'failed',mode:'B',input},async()=>null);
 assert.deepEqual(retry.input.referenceMaterials,input.referenceMaterials);assert.deepEqual(retry.input.sources,[]);
});

test('both research and audit receive materials separately from official sources',async()=>{
 const original=global.fetch;let calls=0;
 const input=validateInput({...base,referenceMaterials:[material]});input.securities=[];input.sources=[{id:'S1',title:'合成证据',text:'合成研究资料'}];
 try{
  global.fetch=async(_url,options)=>{
   calls++;const payload=JSON.parse(options.body);
   if(calls===1){assert.match(JSON.stringify(payload.messages),/用户笔记/);return Response.json({choices:[{message:{role:'assistant',content:'合成草稿[S1]'}}]});}
   const audit=JSON.parse(payload.messages[1].content);assert.equal(audit.referenceMaterials[0].id,'M1');assert.ok(!audit.sourceCatalog.some(source=>source.id==='M1'));
   return Response.json({choices:[{message:{role:'assistant',content:JSON.stringify(reviewFixture(input))}}]});
  };
  assert.ok((await runAgent({mode:'B',input},()=>{},new AbortController().signal)).report);assert.equal(calls,2);
 }finally{global.fetch=original;}
});

test('checkpoint writes serialize and coalesce; closing drains the old write before final persistence',async()=>{
 const entered=deferred(),release=deferred(),saved=[];let active=0,peak=0;
 const checkpoint=createJobCheckpoints({save:async()=>{active++;peak=Math.max(peak,active);entered.resolve();await release.promise;saved.push('running');active--;}});
 checkpoint.request();const flushing=checkpoint.flush();await entered.promise;
 checkpoint.request();checkpoint.request();const closing=checkpoint.close().then(()=>saved.push('final'));
 release.resolve();await Promise.all([flushing,closing]);assert.equal(peak,1);assert.deepEqual(saved,['running','final']);
 checkpoint.request();await checkpoint.flush();assert.deepEqual(saved,['running','final']);
});

test('checkpoint failure remains bounded and does not fail research, success clears notification suppression',async()=>{
 const errors=[];let writes=0;
 const checkpoint=createJobCheckpoints({maxWrites:4,save:async()=>{writes++;if(writes!==3)throw new Error('合成存储故障');},onError:error=>errors.push(error.message)});
 for(let i=0;i<6;i++){checkpoint.request();await checkpoint.flush();}
 await checkpoint.close();assert.equal(writes,4);assert.equal(errors.length,2);
});
