import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createAgentPageReader,extractReportPages} from '../server/agent-page-reader.mjs';
import {verifyFinancialInputs} from '../server/financial-input-verification.mjs';
import {valuationSnapshot} from '../server/valuation-snapshot.mjs';
import {executionBudget,updateExecutionPlan,compactExecutionContext} from '../server/agent-execution.mjs';
import {toolsForMode,runAgent} from '../server/agent.mjs';
import {reviewFixture} from './fixtures/research-review.mjs';
import {materialPdf} from './fixtures/material-files.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const body='2025年度 人民币元 营业收入 1,200.00 1,100.00；归母净利润 100；经营现金流 -100.25；毛利率 20%；投资损失 (25.50)。';
const sources=()=>[{id:'S1',type:'official-report',official:true,title:'合成财务报告',text:body,pages:2,documentBlocks:[{id:'p1-b1',page:1,method:'native',text:body,needsReview:false}],sha256:sha('original'),url:'https://static.cninfo.com.cn/original.pdf'},
 {id:'Q1',type:'quote',text:JSON.stringify({price:20,currency:'CNY',asOf:'2026-09-08T07:00:00Z'})}];
const job=()=>({mode:'A',input:{mode:'A',question:'合成企业值不值得研究',sources:sources()}});
const flow=(start,end,value)=>({start,end,value,sourceIds:['S1']});
const valuation=()=>({valuationBasis:'single-class',equityBasis:'common',otherEquity:null,quote:{sourceId:'Q1',price:20,currency:'CNY',asOf:'2026-09-08T07:00:00Z'},shares:{date:'2026-06-30',value:100,changesReviewed:false,sourceIds:['S1']},annual:flow('2025-01-01','2025-12-31',100),previous:flow('2025-01-01','2025-06-30',40),current:flow('2026-01-01','2026-06-30',50),equity:{date:'2026-06-30',value:1000,sourceIds:['S1']},earningsFactors:[.9,1,1.1],peMultiples:[15,20],basis:{currency:'CNY',period:'2025FY与2026/2025H1',shareBasis:'普通股股数；金额为元',assumptions:'合成数据，资本变动未完整核对',sourceIds:['S1','Q1']}});
const item=(value,overrides={})=>({key:'revenue',sourceId:'S1',blockId:'p1-b1',quote:body,label:'营业收入',period:'2025',unit:'元',value,scale:1,...overrides});

test('raw verification preserves signed complete tokens, columns, percentages, parentheses and scaling',()=>{
 const items=[item(1200),item(-100.25,{key:'outflow',label:'经营现金流'}),item(.2,{key:'ratio',label:'毛利率',unit:'小数'}),item(-25.5,{key:'loss',label:'投资损失'}),item(12000000,{key:'scaled',scale:10000})];
 assert.equal(verifyFinancialInputs({items},{sources:sources()}).matched,5);
 for(const value of [200,100.25,25.5,12])assert.equal(verifyFinancialInputs({items:[item(value)]},{sources:sources()}).checks[0].status,'mismatch');
 assert.equal(verifyFinancialInputs({items:[item(1200,{quote:'伪造原文 营业收入 1200'})]},{sources:sources()}).unresolved,1);
 const unsafe=sources();unsafe[0].documentBlocks[0].method='vision';assert.equal(verifyFinancialInputs({items:[item(1200)]},{sources:unsafe}).checks[0].status,'unusable');
 assert.throws(()=>verifyFinancialInputs({items:[item(1200),item(1200)]},{sources:sources()}),/重复/);
 const large=sources();large[0].documentBlocks[0].text='营业收入 100000000000.00';
 assert.equal(verifyFinancialInputs({items:[item(100000000000.01,{quote:'营业收入 100000000000.00'})]},{sources:large}).unresolved,1,'A one-cent mismatch must not be hidden by a large relative tolerance');
});

test('targeted reader returns exact stored pages, supports continuation and does not fetch arbitrary URLs',async()=>{
 const j=job();let requests=0;const reader=createAgentPageReader({request:async()=>{requests++;throw Error('should not fetch');}});
 const result=await reader({sourceId:'S1',pages:[1],view:'text'},{job:j});assert.match(result.matches[0].text,/1,200.00/);assert.equal(result.pages[0].complete,true);assert.equal(requests,0);
 await assert.rejects(reader({sourceId:'Q1',pages:[1],view:'text'},{job:j}),/官方PDF/);
 await assert.rejects(reader({sourceId:'S1',pages:[3],view:'text'},{job:j}),/范围/);
 j.input.sources[0].documentBlocks=Array.from({length:25},(_,i)=>({id:'b'+i,page:1,method:'native',text:'测'.repeat(2200)}));
 const first=await reader({sourceId:'S1',pages:[1],view:'text'},{job:j});assert.equal(first.pages[0].nextBlock,18);
 const next=await reader({sourceId:'S1',pages:[1],view:'text',startBlock:18},{job:j});assert.equal(next.pages[0].nextBlock,null);assert.equal(next.matches.length,7);
});

test('missing-page rereads keep file identity and budgets, while changed originals remain untouched',async()=>{
 const j=job(),reader=createAgentPageReader({request:async()=>Buffer.from('original'),extract:async()=>({totalPages:2,pages:[{page:2,blocks:[{id:'target-p2-b1',page:2,text:'核对原件第二页',method:'native'}],quality:{status:'readable'}}]}),maxPages:1});
 const result=await reader({sourceId:'S1',pages:[2],view:'text'},{job:j});assert.equal(result.matches[0].page,2);assert.ok(j.input.sources[0].documentBlocks.some(b=>b.id==='target-p2-b1'));assert.equal(j.input.sources[0].text,body);
 assert.equal((await reader({sourceId:'S1',pages:[1],view:'visual'},{job:j})).status,'unavailable');
 const changed=job(),mismatch=createAgentPageReader({request:async()=>Buffer.from('changed')});
 await assert.rejects(mismatch({sourceId:'S1',pages:[2],view:'text'},{job:changed}),/内容已改变/);assert.equal(changed.input.sources[0].documentBlocks.length,1);assert.equal(changed.agentPageReads[0].status,'attempted');
 const exhausted=createAgentPageReader({enabled:()=>true,maxPages:1});assert.equal((await exhausted({sourceId:'S1',pages:[1],view:'visual'},{job:j})).status,'budget-exhausted');
});

test('requested visual pages return transcription and discrepancies without storing images in job records',async()=>{
 const j=job(),reader=createAgentPageReader({enabled:()=>true,request:async()=>Buffer.from('original'),extract:async()=>({totalPages:2,pages:[{page:1,blocks:[{id:'target-p1-b1',page:1,text:body,method:'native'}]}]}),render:async()=>[{page:1,dataUrl:'PRIVATE_IMAGE_BYTES'}],readVision:async()=>JSON.stringify({pages:[{page:1,text:'营业收入 999',uncertainties:['原表头待核实']}]}),save:async()=> 'asset-1'});
 const result=await reader({sourceId:'S1',pages:[1],view:'visual'},{job:j});assert.ok(result.visual.checks[0].unmatchedCount>0);assert.ok(result.matches.some(m=>m.method==='vision'&&m.needsReview));assert.equal(j.input.sources[0].agentVisualReadings[0].attachmentId,'asset-1');assert.doesNotMatch(JSON.stringify(j),/PRIVATE_IMAGE_BYTES/);
});

test('targeted PDF worker reads a requested physical page and rejects out-of-range pages',async()=>{
 const result=await extractReportPages(materialPdf(),[1]);assert.equal(result.pages[0].page,1);assert.ok(result.pages[0].blocks.length);
 await assert.rejects(extractReportPages(materialPdf(),[999]),/超出/);
 const c=new AbortController();c.abort();await assert.rejects(extractReportPages(materialPdf(),[1],c.signal));
});

test('valuation snapshot computes matched TTM and explicit sensitivity without fair-value claims',()=>{
 const result=valuationSnapshot(valuation(),{sources:sources()});assert.equal(result.ttmProfit,110);assert.equal(result.marketCap,2000);assert.equal(result.pb,2);assert.equal(result.peFY,20);assert.equal(result.epsProxy,1.1);assert.equal(result.sensitivity[1].prices[1].price,22);assert.equal(result.period.start,'2025-07-01');assert.match(result.limitations.join(''),/不是内在价值/);
 for(const mutate of [a=>a.previous.end='2025-12-31',a=>a.current.start='2026-04-01',a=>a.quote.currency='USD',a=>a.quote.price=30,a=>a.current=null,a=>a.shares.date='2027-01-01']){const a=valuation();mutate(a);assert.throws(()=>valuationSnapshot(a,{sources:sources()}));}
 const missing=valuation();missing.current.value=null;assert.equal(valuationSnapshot(missing,{sources:sources()}).peTTM,null);
 const loss=valuation();loss.annual.value=-100;const r=valuationSnapshot(loss,{sources:sources()});assert.equal(r.peTTM,null);assert.deepEqual(r.sensitivity,[]);
});

test('public plans require actual receipts for completed steps and budgets follow depth',()=>{
 const j=job(),args={objective:'公开目标',hypotheses:['暂时波动','长期变化'],steps:[{id:'numbers',question:'数字是否一致',status:'completed',evidenceIds:['S1'],toolCallIds:[],note:'仅声明核对进展'}]};
 assert.throws(()=>updateExecutionPlan(args,{job:j}),/实际工具/);args.steps[0].toolCallIds=['real'];assert.throws(()=>updateExecutionPlan(args,{job:j,records:[{toolCallId:'real',result:{error:'failed'}}]}),/非错误/);
 const plan=updateExecutionPlan(args,{job:j,records:[{toolCallId:'real',result:{matched:1}}]});assert.equal(plan.revision,1);assert.equal(j.agentPlan.steps[0].status,'completed');
 assert.equal(executionBudget({mode:'A',depth:'Deep'}).maxTurns,24);assert.equal(executionBudget({mode:'B',depth:'Deep'}).maxTurns,48);
});

test('long-run context packs complete evidence and calls without interrupting pending tool responses',()=>{
 const j=job();j.plan={depth:'Quick'};
 const messages=[{role:'system',content:'固定规则'},{role:'user',content:'x'.repeat(250000)}],records=[{toolCallId:'real',toolName:'read_source_pages',result:{large:'a'.repeat(51000)}},{toolCallId:'small',toolName:'verify_financial_inputs',result:{matched:1}}];
 const window=compactExecutionContext({messages,job:j,evidence:[{id:'S1',blockId:'p1-b1',text:body}],records});
 assert.equal(messages[0].content,'固定规则');const content=JSON.parse(messages[1].content);assert.equal(content.context.evidence[0].text,body);assert.equal(content.context.tools[0].toolCallId,'small');assert.equal(window.omittedTools[0].toolCallId,'real');assert.equal(records[0].result.large.length,51000);
 const pending=[{role:'system',content:'规则'},{role:'user',content:'x'.repeat(250000)},{role:'assistant',tool_calls:[{id:'pending'}]}];
 assert.equal(compactExecutionContext({messages:pending,job:j,evidence:[],records:[]}),null);
});

test('tool-loop budget ends with a tool-free draft and still requires independent audit',async()=>{
 const original=global.fetch,j=job();let calls=0,synthesis=0;const events=[];
 global.fetch=async(_url,options)=>{const body=JSON.parse(options.body);calls++;
  if(body.tools)return Response.json({choices:[{message:{role:'assistant',content:null,tool_calls:[{id:'status-'+calls,type:'function',function:{name:'get_research_status',arguments:'{}'}}]}}]});
  if(!body.response_format){synthesis++;return Response.json({choices:[{message:{role:'assistant',content:'预算到限，合成资料仍不足。[S1]'}}]});}
  return Response.json({choices:[{message:{role:'assistant',content:JSON.stringify(reviewFixture(j.input))}}]});
 };
 try{const result=await runAgent(j,(type,message)=>events.push({type,message}),new AbortController().signal);assert.ok(result.report);assert.equal(synthesis,1);assert.equal(calls,26);assert.ok(events.some(e=>e.type==='warning'&&e.message.includes('轮次上限')));}finally{global.fetch=original;}
});

test('platform agent runs plan → page → raw check → TTM → plan receipt → report → independent audit',async()=>{
 const original=global.fetch,j=job(),events=[];
 const plan={objective:'核对合成财务与价格要求',hypotheses:['利润增长','现金流受资金往来影响'],steps:[{id:'numbers',question:'核对原数与估值快照',status:'in_progress',evidenceIds:[],toolCallIds:[],note:'读取原文再计算'}]};
 const completed=structuredClone(plan);completed.steps[0]={...completed.steps[0],status:'completed',evidenceIds:['S1','Q1'],toolCallIds:['raw','ttm']};
 const steps=[['plan','update_research_plan',plan],['pages','read_source_pages',{sourceId:'S1',pages:[1],view:'text'}],['raw','verify_financial_inputs',{items:[item(1200)]}],['ttm','calculate_valuation_snapshot',valuation()],['updated','update_research_plan',completed],['status','get_research_status',{}]];
 let count=0;
 global.fetch=async(_url,options)=>{const request=JSON.parse(options.body),i=count++;
  if(i<steps.length){const [id,name,args]=steps[i];return Response.json({choices:[{message:{role:'assistant',content:null,tool_calls:[{id,type:'function',function:{name,arguments:JSON.stringify(args)}}]}}]});}
  if(i===steps.length){assert.equal(JSON.parse(request.messages.findLast(m=>m.role==='tool').content).budget.maxTurns,24);return Response.json({choices:[{message:{role:'assistant',content:'合成研究，敏感性不是合理价值。[S1][Q1]'}}]});}
  const audit=JSON.parse(request.messages[1].content);assert.ok(audit.toolEvidence.some(r=>r.toolName==='verify_financial_inputs'&&r.result.matched===1));assert.ok(audit.toolEvidence.some(r=>r.toolName==='calculate_valuation_snapshot'&&r.result.ttmProfit===110));return Response.json({choices:[{message:{role:'assistant',content:JSON.stringify(reviewFixture(j.input))}}]});
 };
 try{const result=await runAgent(j,(type,message,extra)=>events.push({type,message,...extra}),new AbortController().signal);assert.ok(result.report);assert.equal(j.agentPlan.revision,2);assert.equal(count,8);assert.ok(!events.some(e=>e.type==='tool_result'&&e.result?.error));assert.ok(toolsForMode('A').some(t=>t.function.name==='calculate_valuation_snapshot'));assert.ok(!toolsForMode('A').some(t=>t.function.name==='calculate_dcf'));}finally{global.fetch=original;}
});
