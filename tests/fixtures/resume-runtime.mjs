import assert from 'node:assert/strict';
import {createStorage} from '../../server/storage.mjs';
import {runAgent} from '../../server/agent.mjs';
import {prepareResearchRetry} from '../../server/research-retry.mjs';
import {reviewFixture} from './research-review.mjs';
import {createWebResearchSession} from '../../server/web-research.mjs';
assert.match(process.env.MONGODB_DATABASE,/^zhiheng_resume_test_/);
const storage=await createStorage();
try{
 let job=await storage.getJob('resume-process');
 const first=process.env.RESUME_TEST_PHASE==='first';let calls=0;
 if(!first){await storage.recoverInterrupted();job=await prepareResearchRetry(await storage.getJob(job.id),id=>storage.getJob(id));await storage.restartJob(job,0);}
 global.fetch=async(_url,options)=>{
  const body=JSON.parse(options.body);calls++;
  if(first)return Response.json({choices:[{message:{role:'assistant',content:null,reasoning_content:'private-resume-reasoning',tool_calls:[{id:'saved-call',type:'function',function:{name:'read_rules',arguments:JSON.stringify({query:'现金流'})}}]}}]});
  if(calls===1){assert.equal(body.messages.filter(m=>m.role==='tool').length,1);assert.equal(body.messages.find(m=>m.tool_calls).reasoning_content,'private-resume-reasoning');return Response.json({choices:[{message:{role:'assistant',content:'恢复草稿[S1]'}}]});}
  return Response.json({choices:[{message:{role:'assistant',content:JSON.stringify(reviewFixture(job.input))}}]});
 };
 job.status='running';
 const result=await runAgent(job,(type,message,details)=>job.events.push({type,message,...details}),new AbortController().signal,{
  webSession:options=>createWebResearchSession({...options,status:{enabled:false,configured:false,provider:'fixture'}}),
  collectData:async()=>{assert.ok(first,'Restart must not collect again');return {sources:[{id:'S1',title:'合成资料',text:'仅供续跑验证的原文。'}],coverage:[{security:'CN:600519',read:1}],warnings:[]};},
  onCheckpoint:async()=>{await storage.saveJob(job);if(first&&job.checkpoint.toolRecords.length===1)process.exit(73);},
 });
 assert.equal(calls,2);job.result=result;job.status='completed';delete job.checkpoint;await storage.saveJob(job);
}finally{await storage.close();}
