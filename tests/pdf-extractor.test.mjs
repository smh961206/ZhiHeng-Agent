import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {extractPDF} from '../server/pdf-extractor.mjs';

function setup(signal,options={}){
 const worker=new EventEmitter();let terminated=0;
 worker.terminate=async()=>{terminated++;};
 const result=extractPDF(Buffer.from('%PDF-'),signal,{createWorker:()=>worker,...options});
 return {worker,result,terminated:()=>terminated};
}
test('PDF ignores Node watch notifications until a tagged extraction result arrives',async()=>{
 const {worker,result,terminated}=setup();
 worker.emit('message',{'watch:import':['pdfjs-dist']});
 worker.emit('message',{'watch:require':['@napi-rs/canvas']});
 worker.emit('message',null);
 let resolved=false;result.then(()=>{resolved=true;});await Promise.resolve();
 assert.equal(resolved,false);assert.equal(terminated(),0);
 const payload={text:'Annual report text',pages:2,readPages:2,emptyPages:0,truncated:false};
 worker.emit('message',{type:'pdf:result',result:payload});
 assert.deepEqual(await result,payload);assert.equal(terminated(),1);
});
test('PDF rejects malformed results and propagates parser errors',async()=>{
 for(const message of [{type:'pdf:result',result:{pages:1,readPages:1}},{type:'pdf:error',error:'PDF解析失败：文件损坏'}]){
  const {worker,result}=setup();worker.emit('message',message);await assert.rejects(result,/PDF解析/);
 }
});
test('PDF cancellation and timeout terminate the worker',async()=>{
 const control=new AbortController();const active=setup(control.signal);control.abort();
 await assert.rejects(active.result,/取消/);assert.equal(active.terminated(),1);
 const timed=setup(undefined,{timeoutMs:10});await assert.rejects(timed.result,/超时/);assert.equal(timed.terminated(),1);
 assert.throws(()=>extractPDF(Buffer.alloc(0),control.signal),{name:'AbortError'});
});
test('PDF exit without a result fails even after watch notifications',async()=>{
 const {worker,result}=setup();worker.emit('message',{'watch:import':['example']});worker.emit('exit',0);
 await assert.rejects(result,/未返回结果/);
});
