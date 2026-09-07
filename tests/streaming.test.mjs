import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {readCompletion} from '../server/model-stream.mjs';
import {createJobStreams,publicJob} from '../server/job-stream.mjs';
import {runAgent} from '../server/agent.mjs';
import {reviewFixture} from './fixtures/research-review.mjs';
import {reportPreview} from '../shared/report-preview.mjs';
const frame=(delta,finish_reason=null)=>'data: '+JSON.stringify({choices:[{index:0,delta,finish_reason}]})+'\r\n\r\n';
function response(text){const bytes=Buffer.from(text);return new Response(new ReadableStream({start(c){for(let i=0;i<bytes.length;i+=3)c.enqueue(bytes.subarray(i,i+3));c.close();}}),{headers:{'Content-Type':'text/event-stream'}});}
test('DeepSeek thinking context survives tool turns without entering user-facing deltas',async()=>{
 const visible=[];
 const result=await readCompletion(response(frame({reasoning_content:'synthetic internal context'})+frame({content:'可见正文'})+frame({tool_calls:[{index:0,id:'t1',function:{name:'read_rules',arguments:'{}'}}]})+frame({},'tool_calls')+'data: [DONE]\n\n'),text=>visible.push(text));
 assert.equal(result.reasoning_content,'synthetic internal context');assert.deepEqual(visible,['可见正文']);assert.equal(result.tool_calls[0].id,'t1');
});
const complete=text=>response(frame({content:text})+frame({},'stop')+'data: [DONE]\n\n');
test('stream parser preserves split Chinese characters and joins tool arguments',async()=>{
 const deltas=[];const r=await readCompletion(response(': heartbeat\n\n'+frame({content:'现金流'})+frame({tool_calls:[{index:0,id:'call_1',function:{name:'calculate_p2',arguments:'{"pe":'}}]})+frame({tool_calls:[{index:0,function:{arguments:'12.5}'}}]})+frame({},'tool_calls')+'data: [DONE]\n\n'),d=>deltas.push(d));
 assert.equal(deltas.join(''),'现金流');assert.equal(r.tool_calls[0].id,'call_1');assert.deepEqual(JSON.parse(r.tool_calls[0].function.arguments),{pe:12.5});
});
test('stream parser rejects truncation, missing completion and upstream errors',async()=>{
 await assert.rejects(readCompletion(response(frame({content:'partial'}))),/中断/);
 await assert.rejects(readCompletion(response(frame({},'length'))),/截断/);
 await assert.rejects(readCompletion(response('data: {"error":{"message":"failure"}}\n\n')),/接口返回错误/);
 await assert.rejects(readCompletion(response(frame({})+'data: [DONE]\n\n')),/中断/);
});
test('stream parser propagates cancellation without returning partial report',async()=>{
 const controller=new AbortController();let streamControl;
 const stream=new ReadableStream({start(c){streamControl=c;c.enqueue(Buffer.from(frame({content:'partial'})));}});
 controller.signal.addEventListener('abort',()=>streamControl.error(controller.signal.reason));
 const pending=readCompletion(new Response(stream,{headers:{'Content-Type':'text/event-stream'}}));controller.abort();
 await assert.rejects(pending,{name:'AbortError'});
});
test('streaming agent previews draft but still validates final audit references',async()=>{
 const old=global.fetch;let calls=0;const events=[];
 const job={mode:'B',input:{question:'test',depth:'Standard',portfolio:'',sources:[{id:'S1',title:'test',text:'test evidence'}]}};
 global.fetch=async(_url,options)=>{assert.equal(JSON.parse(options.body).stream,true);return ++calls===1?complete('生成中[S1]'):complete(JSON.stringify(reviewFixture(job.input)));};
 try{
  const result=await runAgent(job,(...e)=>events.push(e),new AbortController().signal);
  assert.match(result.report,/经审计/);assert.ok(events.some(e=>e[0]==='report_delta'&&e[1]==='生成中[S1]'));
  assert.ok(events.some(e=>e[0]==='report_phase'&&e[1]==='audit'));
  calls=0;global.fetch=async()=>++calls===1?complete('草稿[S1]'):complete(JSON.stringify(reviewFixture(job.input,'S99')));
  await assert.rejects(runAgent(job,()=>{},new AbortController().signal),/不存在/);
 }finally{global.fetch=old;}
});
test('agent separates the Markdown draft from JSON audit and never streams protocol fields as report text',async()=>{
 const old=global.fetch;
 try{
  for(const fenced of [false,true]){
   let calls=0,visible='',raw;
   const phases=[],snapshots=[];
   const job={mode:'B',input:{mode:'B',question:'合成格式验证',depth:'Standard',sources:[{id:'S1',title:'合成证据',text:'合成参数'}]}};
   global.fetch=async(_url,options)=>{
    const payload=JSON.parse(options.body);
    if(++calls===1){
     assert.match(payload.messages[0].content,/直接输出Markdown正文/);
     assert.doesNotMatch(payload.messages[0].content,/"instruction":"只返回JSON/);
     raw=fenced?'```markdown\n# 草稿正文\n\n现金流尚待核实。[S1]\n```':JSON.stringify(reviewFixture(job.input));
     return response(Array.from(raw,char=>frame({content:char})).join('')+frame({},'stop')+'data: [DONE]\n\n');
    }
    const audit=JSON.parse(payload.messages.at(-1).content);
    assert.equal(audit.draft,raw,'Audit still receives the complete original draft');
    assert.match(audit.contract.instruction,/只返回JSON/);
    return complete(JSON.stringify(reviewFixture(job.input)));
   };
   const result=await runAgent(job,(type,message)=>{
    if(type==='report_reset')visible='';
    if(type==='report_delta'){visible+=message;snapshots.push(visible);}
    if(type==='report_phase')phases.push(message);
   },new AbortController().signal);
   assert.equal(visible,reportPreview(raw,job.plan));
   assert.ok(phases.includes('formatting')&&phases.includes('audit'));
   assert.ok(snapshots.length>0);
   for(const snapshot of snapshots)assert.doesNotMatch(snapshot,/```|"sections"|"decision"|"gates"|\\n/);
   assert.match(result.report,/经审计/);
   assert.equal(calls,2);
  }
 }finally{global.fetch=old;}
});

class ResponseMock extends EventEmitter{
 data='';writableLength=0;destroyed=false;writableEnded=false;
 writeHead(status,headers){this.headers=headers;}flushHeaders(){}write(text){this.data+=text;return true;}
 end(){this.writableEnded=true;this.emit('close');}destroy(){this.destroyed=true;this.emit('close');}
}
test('SSE publishes deltas, resends snapshots on reconnect and clears failed previews',()=>{
 const hub=createJobStreams();const job={id:'abc',status:'running',draft:'private raw draft',input:{question:'test',sources:[]},events:[],liveReport:{text:'当前预览',phase:'research'}};
 const first=new ResponseMock();hub.subscribe({},first,job);assert.match(first.data,/event: snapshot/);assert.doesNotMatch(first.data,/private raw draft/);
 hub.publish(job.id,'report_delta',{delta:'新片段'});assert.match(first.data,/新片段/);first.destroy();
 job.liveReport.text+='新片段';const second=new ResponseMock();hub.subscribe({},second,job);assert.match(second.data,/当前预览新片段/);
 job.status='failed';hub.finish(job);assert.equal(second.writableEnded,true);
 const final=second.data.split('event: done\ndata: ')[1].trim();assert.equal(JSON.parse(final).liveReport,undefined);
 assert.equal(publicJob(job).draft,undefined);
});
test('SSE closes slow readers without cancelling the job',()=>{
 const hub=createJobStreams();const job={id:'abc',status:'running',input:{sources:[]},events:[]};const res=new ResponseMock();hub.subscribe({},res,job);
 res.writableLength=2_000_001;hub.publish(job.id,'trace',{message:'test'});assert.equal(res.destroyed,true);assert.equal(job.status,'running');
});
