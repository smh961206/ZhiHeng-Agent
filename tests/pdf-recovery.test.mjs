import test from 'node:test';
import assert from 'node:assert/strict';
import {createOfficialReportReader} from '../server/official-reports.mjs';
import {needsParsingRetry} from '../server/document-layout.mjs';

const report={title:'合成测试财报',url:'https://www.cninfo.com.cn/fixture.pdf',security:'CN:000001'};
const bytes=Buffer.from('%PDF-1.7 fixture'),body='合成财务报表原文及报告期说明，仅用于验证归档刷新和识别缺口处理。'.repeat(30);
const memory=()=>{const values=new Map();return {getCachedReport:async key=>structuredClone(values.get(key)),saveCachedReport:async(key,value)=>values.set(key,structuredClone(value))};};
const parsed=gap=>({text:body,pages:2,readPages:2,truncated:false,pageQuality:[{page:1,status:'readable',method:'native'},
 {page:2,status:gap?'failed':'readable',method:gap?'native':'ocr',needsReview:true,ocrStatus:gap?'failed':'recognized'}],qualitySummary:{failedOCRPages:gap?[2]:[],ocrPages:gap?0:1}});

test('completed OCR review flags do not trigger retries, but actual processing gaps do',()=>{
 assert.equal(needsParsingRetry(parsed(false)),false);
 for(const source of [parsed(true),{truncated:true},{qualitySummary:{skippedOCRPages:[2]}},{qualitySummary:{ocrIncompletePages:[2]}},{qualitySummary:{unreadPages:1}}])assert.equal(needsParsingRetry(source),true);
 assert.equal(needsParsingRetry({pageQuality:[{status:'blank',ocrStatus:'blank'}]}),false);
 const numeric={status:'numeric-only',method:'ocr',ocrStatus:'recognized',needsReview:true};
 assert.equal(needsParsingRetry({pageQuality:[numeric]}),false);
 for(const change of [{method:'native'},{ocrStatus:'failed'},{ocrWarning:'补识别超时'}])assert.equal(needsParsingRetry({pageQuality:[{...numeric,...change}]}),true);
});

test('incomplete OCR archives refresh after six hours even when all native pages were read',async()=>{
 const store=memory();let now=Date.parse('2026-09-07T00:00:00Z'),reads=0,parses=0;
 const reader=createOfficialReportReader({storage:async()=>store,clock:()=>now,request:async()=>{reads++;return bytes;},parsePDF:async()=>parsed(parses++===0)});
 const first=await reader(report);assert.equal(first.truncated,false);
 now+=2*3600000;assert.equal((await reader(report)).fromCache,true);assert.equal(reads,1);
 now+=5*3600000;const refreshed=await reader(report);assert.equal(refreshed.fromCache,false);assert.equal(reads,2);assert.deepEqual(refreshed.qualitySummary.failedOCRPages,[]);
 now+=24*3600000;assert.equal((await reader(report)).fromCache,true);assert.equal(reads,2);
});

test('failed refresh preserves original OCR gaps and timestamps instead of appearing newly parsed',async()=>{
 const store=memory(),now=Date.parse('2026-09-07T00:00:00Z');
 const initial=await createOfficialReportReader({storage:async()=>store,clock:()=>now,request:async()=>bytes,parsePDF:async()=>parsed(true)})(report);
 const result=await createOfficialReportReader({storage:async()=>store,clock:()=>now+7*3600000,request:async()=>{throw new Error('offline');}})(report);
 assert.equal(result.stale,true);assert.equal(result.fetchedAt,initial.fetchedAt);assert.deepEqual(result.qualitySummary.failedOCRPages,[2]);
 assert.doesNotMatch(result.cacheWarning,/旧版/);
});

test('available official alternative is tried before settling for an incomplete stale archive',async()=>{
 const store=memory(),now=Date.parse('2026-09-07T00:00:00Z'),calls=[];
 await createOfficialReportReader({storage:async()=>store,clock:()=>now,request:async()=>bytes,parsePDF:async()=>parsed(true)})(report);
 const alternative={...report,url:'https://www.cninfo.com.cn/alternative.pdf'};
 const result=await createOfficialReportReader({storage:async()=>store,clock:()=>now+7*3600000,request:async url=>{
  calls.push(url);if(url===report.url)throw new Error('primary offline');return bytes;
 },parsePDF:async()=>parsed(false)})({...report,alternatives:[alternative]});
 assert.deepEqual(calls,[report.url,alternative.url]);assert.equal(result.url,alternative.url);assert.equal(result.stale,undefined);assert.equal(result.fromCache,false);
});
