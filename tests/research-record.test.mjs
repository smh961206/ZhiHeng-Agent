import test from 'node:test';
import assert from 'node:assert/strict';
import {researchToolCalls,researchRecordSummary,researchTimeline} from '../shared/research-record.mjs';
import {exportResearchMarkdown} from '../shared/research-export.mjs';
test('unified timeline keeps progress and errors while joining paired calls exactly once',()=>{
 const events=[{type:'progress',message:'开始'},{type:'tool',toolName:'read_rules',toolCallId:'one',arguments:{query:'核对'}},{type:'warning',message:'资料缺口'},{type:'tool_result',toolName:'read_rules',toolCallId:'one',result:{error:'读取失败'}},{type:'tool',toolName:'read_rules',toolCallId:'one',arguments:{query:'重试'}}];
 const rows=researchTimeline(events,'running');assert.equal(rows.length,4);assert.deepEqual(rows.map(row=>row.index),[0,2,3,4]);assert.equal(rows[2].event.call.status,'failed');assert.equal(rows[2].event.arguments.query,'核对');assert.equal(rows[3].event.call.status,'pending');assert.equal(events.length,5);
});
test('standalone saved returns retain their original inputs; IDs are never guessed',()=>{
 const rows=researchTimeline([{type:'tool',toolName:'same',arguments:{}},{type:'tool_result',toolName:'same',arguments:{symbol:'600519'},result:null}],'completed');
 assert.equal(rows.length,2);assert.equal(rows[0].event.call.status,'unrecorded');assert.equal(rows[1].event.call.hasInput,true);assert.equal(rows[1].event.arguments.symbol,'600519');assert.equal(rows[1].event.call.hasReturn,true);
});
test('pairs interleaved calls by ID and preserves failures across retries with repeated IDs',()=>{
 const events=[{type:'tool',toolName:'read_rules',toolCallId:'a',arguments:{query:'first'},time:'2026-09-08T00:00:00Z'},{type:'tool',toolName:'read_rules',toolCallId:'b',arguments:{query:'second'}},{type:'tool_result',toolName:'read_rules',toolCallId:'b',result:{ok:true}},{type:'tool_result',toolName:'read_rules',toolCallId:'a',result:{error:'not found'},time:'2026-09-08T00:00:01Z'},{type:'tool',toolName:'read_rules',toolCallId:'a',arguments:{query:'retry'}},{type:'tool_result',toolName:'read_rules',toolCallId:'a',result:{ok:true}}];
 const r=researchToolCalls(events,'completed');assert.equal(r.length,3);assert.equal(r[0].status,'failed');assert.equal(r[0].durationMs,1000);assert.equal(r[1].arguments.query,'second');assert.equal(r[2].arguments.query,'retry');assert.equal(researchRecordSummary({events}).failed,1);
});
test('never invents pairing for missing IDs or same ID with conflicting names',()=>{const events=[{type:'tool',toolName:'read_rules',arguments:{}},{type:'tool_result',toolName:'read_rules',result:{ok:true}},{type:'tool',toolName:'search_evidence',toolCallId:'same'},{type:'tool_result',toolName:'read_rules',toolCallId:'same',result:{ok:true}}];const r=researchToolCalls(events,'completed');assert.equal(r.length,4);assert.equal(r[0].status,'unrecorded');assert.equal(r[1].hasInput,false);assert.equal(r[2].status,'unrecorded');assert.equal(r[3].hasInput,false);assert.equal(researchToolCalls(events,'running')[0].status,'pending');});
test('MODE A exports complete process by default and report-only deliberately omits tool parameters',()=>{const job={id:'example',status:'completed',mode:'A',input:{question:'合成快筛',sources:[]},result:{report:'已保存正文',audit:'边界明确'},events:[{type:'tool',message:'真实输入',toolName:'read_rules',toolCallId:'t1',arguments:{query:'UNIQUE_TOOL_INPUT'}},{type:'fetch_error',message:'真实读取失败'},{type:'knowledge_read',message:'已读取规则',ruleRead:{path:'rules/example',line:1,endLine:3}}]};const full=exportResearchMarkdown(job);assert.match(full,/UNIQUE_TOOL_INPUT/);assert.match(full,/真实读取失败/);assert.match(full,/未记录返回/);assert.match(full,/已读取规则/);assert.match(full,/已保存正文/);assert.doesNotMatch(exportResearchMarkdown(job,{includeResearchProcess:false}),/UNIQUE_TOOL_INPUT/);assert.equal(researchRecordSummary({}).ruleRecorded,false);});

test('complete export includes the newest saved public plan, without fabricating progress from older events',()=>{
 const job={status:'completed',mode:'A',input:{question:'合成任务',sources:[]},result:{report:'报告正文'},agentPlan:{revision:3,objective:'新的公开核对目标',hypotheses:['待验证'],steps:[{id:'q',question:'检查同比口径',status:'blocked',note:'尚缺同期附注',evidenceIds:[],toolCallIds:[]}]},events:[{type:'tool_result',toolName:'update_research_plan',result:{revision:2,objective:'旧计划',steps:[]}}]};
 const full=exportResearchMarkdown(job);assert.match(full,/新的公开核对目标/);assert.match(full,/尚缺同期附注/);assert.match(full,/保留缺口/);assert.doesNotMatch(exportResearchMarkdown(job,{includeResearchProcess:false}),/新的公开核对目标/);
});
