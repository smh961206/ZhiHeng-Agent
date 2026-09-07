import test from 'node:test';
import assert from 'node:assert/strict';
import {boundedReads} from '../server/bounded-reads.mjs';
import {collectMarketData} from '../server/market-data.mjs';
import {buildResearchContext} from '../server/research-context.mjs';
import {exportResearchMarkdown} from '../shared/research-export.mjs';
import {auditCoverage} from '../shared/audit-coverage.mjs';
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};

test('bounded reads overlap only two requests and return original order with individual failures',async()=>{
 const first=deferred(),bothStarted=deferred();let active=0,peak=0;
 const results=await boundedReads([0,1,2,3],async item=>{
  active++;peak=Math.max(peak,active);if(item===1)bothStarted.resolve();
  try{if(item===0){await bothStarted.promise;await first.promise;}if(item===1){first.resolve();throw new Error('合成失败');}return item;}
  finally{active--;}
 });
 assert.equal(peak,2);assert.deepEqual(results.map(item=>item.status==='fulfilled'?item.value:item.reason.message),[0,'合成失败',2,3]);
});

test('cancellation drains started reads, starts no further documents and rejects the collection',async()=>{
 const control=new AbortController(),started=[];
 await assert.rejects(boundedReads([0,1,2,3],async item=>{started.push(item);if(item===1)control.abort();await Promise.resolve();return item;},{signal:control.signal}),/abort/i);
 assert.deepEqual(started,[0,1]);
 await assert.rejects(boundedReads([],async()=>{}, {concurrency:0}),/并发数/);
});

test('collector removes duplicate URLs, preserves source order and keeps partial failures and archive provenance',async()=>{
 const security={market:'CN',symbol:'601999'},label='CN:601999',finished=deferred(),events=[];const fetched=[];
 const records=[2025,2024,2023].map(year=>({title:`${year}年度报告`,reportDate:`${year}-12-31`,date:`${year+1}-03-20`,annual:true,security:label,url:`https://static.cninfo.com.cn/${year}.pdf`}));
 const collected=await collectMarketData([security],{mode:'A',years:3,quotes:async()=>{throw new Error('合成行情缺失');},
  listReports:async()=>({reports:[records[0],records[1],records[0],records[2]],name:'合成主体',limited:false}),
  readReport:async report=>{
   fetched.push(report.url);if(report===records[0])await finished.promise;
   if(report===records[1]){finished.resolve();throw new Error('合成解析故障');}
   return {...report,type:'official-report',text:'合成财务正文',fromCache:report===records[0],documentBlocks:[],pages:10,readPages:10};
  },financials:async()=>({configured:false}),emit:(type,message)=>events.push({type,message})});
 assert.equal(fetched.length,3);assert.equal(new Set(fetched).size,3);
 assert.deepEqual(collected.sources.filter(source=>source.type==='official-report').map(source=>source.url),[records[0].url,records[2].url]);
 const coverage=collected.coverage[0];assert.equal(coverage.listed,3);assert.equal(coverage.read,2);assert.equal(coverage.failed.length,1);
 assert.equal(coverage.processing.duplicatesSkipped,1);assert.equal(coverage.processing.reusedArchives,1);
 assert.ok(events.some(event=>/2份成功、1份失败/.test(event.message)));
});

test('evidence packing retains complete tables and metadata, balances cited sources and reports omitted blocks',()=>{
 const block=(id,blockId,text)=>({id,blockId,text,page:6,method:'native',needsReview:false});
 const a=block('S1','a','| 项目 | 单位 |\n| -- | -- |\n| 合成值 | 元 |'),b=block('S2','b','另一主体的完整证据'),large=block('S1','large','X'.repeat(5000));
 const context=buildResearchContext({evidence:[large,a,b,a],draft:'对比[S2]和[S1]，另需[S99]',evidenceBudget:500});
 assert.equal(context.evidence.length,2);assert.deepEqual(context.evidence.find(item=>item.id==='S1'),a);
 assert.ok(context.window.omittedEvidence.some(item=>item.blockId==='large'));
 assert.deepEqual(context.window.citedSourcesWithoutExcerpt,['S99']);assert.ok(JSON.stringify(context.evidence).length<=500);
 assert.deepEqual(JSON.parse(JSON.stringify(context.evidence)),context.evidence);
});

test('earlier calculations retain inputs, results and provenance despite later large retrievals',()=>{
 const calc={toolName:'calculate_p2',toolCallId:'early',arguments:{pe:10,roe:.1,basis:{sourceIds:['S1']}},result:{ordinary:1,basis:{sourceIds:['S1']}}};
 const bulky={toolName:'search_evidence',toolCallId:'late',result:{matches:[{text:'X'.repeat(10000)}]}};
 const context=buildResearchContext({tools:[calc,bulky],toolBudget:500});
 assert.deepEqual(context.tools,[calc]);assert.deepEqual(context.window.omittedTools,[{toolName:'search_evidence',toolCallId:'late'}]);
});

test('tight audit windows prioritize successful calculations and their exact original blocks over failed attempts',()=>{
 const unrelated={id:'S1',blockId:'intro',text:'背景'.repeat(80)},original={id:'S1',blockId:'p9',text:'| 项目 | 单位 | 合成金额 |\n| 现金流 | 元 | 123 |',page:9,method:'native'};
 const failed={toolName:'calculate_p2',toolCallId:'failed',result:{error:'合成的参数错误'.repeat(20)}};
 const success={toolName:'calculate_p2',toolCallId:'success',arguments:{pe:10},result:{ordinary:1,basis:{sourceIds:['S1'],evidenceBlocks:[{sourceId:'S1',blockId:'p9'}]}}};
 const input={evidence:[unrelated,original],tools:[failed,success],draft:'合成结论[S1]',evidenceBudget:JSON.stringify([original]).length,toolBudget:JSON.stringify([success]).length};
 const before=structuredClone(input),context=buildResearchContext(input);
 assert.deepEqual(context.tools,[success]);assert.deepEqual(context.evidence,[original]);
 assert.deepEqual(context.window.omittedTools,[{toolName:'calculate_p2',toolCallId:'failed'}]);
 assert.deepEqual(context.window.calculationEvidence,[{toolName:'calculate_p2',toolCallId:'success',sourceIdsWithoutExcerpt:[],missingBlocks:[]}]);
 assert.deepEqual(input,before);
});

test('another excerpt from the same source cannot hide missing calculation dependencies',()=>{
 const blocks=[{id:'S1',blockId:'other',text:'另一片段'},{id:'S1',blockId:'large',text:'完整表格'.repeat(500)}];
 const success={toolName:'calculate_dcf',toolCallId:'scenario',result:{value:10,basis:{sourceIds:['S1','S2'],evidenceBlocks:[{sourceId:'S1',blockId:'large'},{sourceId:'S1',blockId:'never-read'}]}}};
 const context=buildResearchContext({evidence:blocks,tools:[success],evidenceBudget:100});
 assert.deepEqual(context.evidence,[blocks[0]]);
 assert.deepEqual(context.window.calculationEvidence[0].sourceIdsWithoutExcerpt,['S2']);
 assert.deepEqual(context.window.calculationEvidence[0].missingBlocks,[{sourceId:'S1',blockId:'large',reason:'window-limit'},{sourceId:'S1',blockId:'never-read',reason:'not-retrieved'}]);
});

test('citation variants receive priority and independent calculation scenarios and failures remain visible',()=>{
 const a={id:'S1',blockId:'one',text:'未引用片段'},b={id:'S9',blockId:'two',text:'已引用片段'};
 const context=buildResearchContext({evidence:[a,b],draft:'依据【S9】',evidenceBudget:JSON.stringify([b]).length});
 assert.deepEqual(context.evidence,[b]);assert.deepEqual(context.window.citedSourcesWithoutExcerpt,[]);
 const calls=[{toolCallId:'base',result:{value:1}},{toolCallId:'error',result:{error:'失败'}},{toolCallId:'stress',result:{value:2}}].map(item=>({toolName:'calculate_dcf',...item}));
 assert.deepEqual(buildResearchContext({tools:calls}).tools.map(item=>item.toolCallId),['stress','base','error']);
});

test('audit coverage separates initial and supplemental packets, preserves omissions and supports historical records',()=>{
 const initial={evidenceIncluded:1,evidenceTotal:3,toolsIncluded:1,toolsTotal:2,citedSourcesWithoutExcerpt:['S2'],calculationEvidence:[{missingBlocks:[{sourceId:'S1',blockId:'large'}]}]};
 const supplemental={evidenceIncluded:3,evidenceTotal:3,toolsIncluded:2,toolsTotal:2};
 const validation={initialEvidenceWindow:initial,evidenceWindows:[{phase:'initial',...initial},{phase:'supplement',...supplemental}]};
 const coverage=auditCoverage(validation);assert.equal(coverage.length,2);assert.equal(coverage[0].limitations.length,3);assert.equal(coverage[1].limitations.length,0);
 assert.match(coverage[1].summary,/补证复核收到 3\/3/);assert.deepEqual(auditCoverage({initialEvidenceWindow:initial}),[coverage[0]]);assert.deepEqual(auditCoverage(),[]);
 assert.match(auditCoverage({initialEvidenceWindow:{evidenceIncluded:0,toolsIncluded:0}})[0].summary,/0\/未记录/);
 const job={input:{sources:[]},result:{report:'# 合成报告',validation}};
 for(const includeResearchProcess of [true,false]){
  const text=exportResearchMarkdown(job,{includeResearchProcess});
  assert.match(text,/初次复核收到 1\/3/);assert.match(text,/补证复核收到 3\/3/);assert.match(text,/计算返回成功不代表参数已核实/);assert.match(text,/重复片段不累加/);
 }
});

test('both report exports retain audit scope and actual document digest and page coverage',()=>{
 const job={input:{question:'合成报告',sources:[{id:'S1',title:'合成原件',sha256:'abc123',pages:20,readPages:18,parserVersion:'test',truncated:true}]},
  result:{report:'# 合成报告\n\n内容[S1]',audit:'合成审计',validation:{initialEvidenceWindow:{evidenceIncluded:2,evidenceTotal:3,toolsIncluded:1,toolsTotal:2}}}};
 for(const includeResearchProcess of [true,false]){
  const output=exportResearchMarkdown(job,{includeResearchProcess});assert.match(output,/2\/3 段完整证据/);assert.match(output,/abc123/);assert.match(output,/已读取页数：18/);
 }
});
