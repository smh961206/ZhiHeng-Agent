import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {processPDFDocument,shouldUseOCR} from '../server/pdf-processing.mjs';
import {ocrTextResult,createLocalOCR,selectOCRResult} from '../server/pdf-ocr.mjs';
import {extractPDF} from '../server/pdf-extractor.mjs';
import {textQuality,rowBlocks} from '../server/document-layout.mjs';
import {searchEvidence} from '../server/evidence-search.mjs';
import {calculationBasis} from '../server/calculations.mjs';

const readable='合成财务报表测试数据，营业收入及经营现金流量。本资料只用于验证解析流程，不代表实际公司财务情况。';
const recognized=()=>ocrTextResult({text:readable,confidence:92},1);
test('numeric-only scans remain searchable unverified evidence without replacing native tables',async()=>{
 const numeric=ocrTextResult({text:'123,456.78    (987,654.32)\n'.repeat(8),confidence:94},1);
 assert.equal(numeric.quality.status,'numeric-only');
 const result=await run([readable,'',readable],{recognize:async()=>numeric});
 const update=result.updates[0];assert.equal(update.page.method,'ocr');assert.equal(update.page.needsReview,true);
 const source={id:'S1',type:'official-report',official:true,text:update.text,documentBlocks:update.documentBlocks};
 const match=searchEvidence([source],'第2页','S1')[0];assert.ok(match.text.includes('123,456.78'));
 assert.equal(match.method,'ocr');assert.equal(match.needsReview,true);
 assert.throws(()=>calculationBasis({currency:'CNY',period:'2025 FY',shareBasis:'普通股',assumptions:'合成测试',sourceIds:['S1'],evidenceBlocks:[{sourceId:'S1',blockId:match.blockId}]},[source]),/OCR|核对/);
 for(const native of [textQuality(readable),numeric.quality])assert.equal(shouldUseOCR(native,numeric,true),false);
});
const fixture=(texts)=>({numPages:texts.length,getPage:async number=>({number,getViewport:()=>({transform:[]}),getTextContent:async()=>({items:[{str:texts[number-1],transform:[1,0,0,10,0,10],width:600,height:10}]}),cleanup(){}})});
async function run(texts,{options={},recognize=async()=>recognized(),clock,createOCR}={}){
 const messages=[],calls=[],timeouts=[];let closes=0;
 await processPDFDocument(fixture(texts),{options,transform:(_a,b)=>b,clock,emit:message=>messages.push(structuredClone(message)),createOCR:createOCR??(()=>({recognize:async(page,opts)=>{calls.push(page.number);timeouts.push(opts.timeoutMs);return recognize(page,opts,messages);},close:async()=>{closes++;}}))});
 const updates=messages.filter(m=>m.type==='pdf:page-update');
 return {messages,calls,timeouts,closes,updates,done:messages.at(-1)};
}

test('all native pages precede OCR; damaged financial body takes priority over sparse covers',async()=>{
 const result=await run(['公司年度报告','','现金流量表'+'�'.repeat(80),readable,'结束'],{options:{maxOCRPages:1},recognize:async(_page,_opts,messages)=>{
  assert.equal(messages.filter(m=>m.type==='pdf:page').length,5);return recognized();
 }});
 assert.deepEqual(result.calls,[3]);assert.equal(result.done.attemptedOCR,1);
 assert.equal(result.updates.find(m=>m.page.page===3).page.method,'ocr');
 assert.equal(result.updates.find(m=>m.page.page===1).page.ocrStatus,'skipped');
 assert.match(result.messages.find(m=>m.type==='pdf:page'&&m.page.page===4).text,/营业收入/);
});

test('blank pages do not consume recognition slots and are not flagged as missing financial text',async()=>{
 const result=await run([readable,'','',readable],{options:{maxOCRPages:1},recognize:async page=>page.number===2?{...ocrTextResult({},1),blank:true}:recognized()});
 assert.deepEqual(result.calls,[2,3]);assert.equal(result.done.attemptedOCR,1);
 const blank=result.updates.find(m=>m.page.page===2);assert.equal(blank.page.status,'blank');assert.equal(blank.page.needsReview,false);
 assert.equal(result.updates.find(m=>m.page.page===3).page.method,'ocr');
});

test('each reused OCR call receives the remaining total budget; subsequent pages record skips',async()=>{
 let now=0;
 const result=await run([readable,'','','',readable],{options:{ocrBudgetMs:60},clock:()=>now,recognize:async()=>{now+=40;return recognized();}});
 assert.deepEqual(result.timeouts,[60,20]);assert.equal(result.done.ocrMs,80);
 assert.equal(result.updates.find(m=>m.page.page===4).page.ocrStatus,'skipped');assert.equal(result.closes,1);
});

test('OCR startup failure is preserved without a secondary close error or losing other pages',async()=>{
 const result=await run(['封面',readable,readable],{options:{maxOCRPages:1},createOCR:()=>{throw new Error('local language unavailable');}});
 assert.equal(result.updates[0].page.ocrStatus,'failed');assert.match(result.updates[0].page.ocrError,/language unavailable/);
 assert.equal(result.messages.filter(m=>m.type==='pdf:page').length,3);assert.equal(result.done.type,'pdf:done');
});

test('OCR errors close the failed engine and the next page can recover with another engine',async()=>{
 let count=0;
 const result=await run([readable,'','',readable],{recognize:async()=>{if(!count++)throw new Error('单页 OCR 超时');return recognized();}});
 assert.deepEqual(result.calls,[2,3]);assert.equal(result.closes,2);assert.equal(result.done.attemptedOCR,2);
 assert.equal(result.updates[0].page.ocrStatus,'failed');assert.equal(result.updates[1].page.method,'ocr');
});

test('more characters cannot let garbled OCR overwrite native text, even when explicitly forced',async()=>{
 const bad=ocrTextResult({text:'�'.repeat(1000)+'12345'},1);
 assert.equal(shouldUseOCR(textQuality(readable),bad,true),false);
 const result=await run([readable],{options:{forceOCRPages:[1]},recognize:async()=>bad});
 assert.equal(result.updates[0].page.method,'native');assert.match(result.updates[0].text,/合成财务/);
 assert.equal(result.updates[0].page.ocrStatus,'no-improvement');
 assert.equal(shouldUseOCR({status:'garbled',meaningfulCharacters:5000},recognized()),true);
});

test('OCR text without valid layout becomes searchable evidence without invented positions',()=>{
 for(const data of [{text:readable},{text:readable,blocks:[{paragraphs:[{lines:[{words:[{text:'broken',bbox:{x0:NaN}}]}]}]}]}]){
  const parsed=ocrTextResult(data,2);const documentBlocks=rowBlocks(parsed.rows,{page:7,method:'ocr',quality:parsed.quality});
  const match=searchEvidence([{id:'S1',text:parsed.text,documentBlocks}],'营业收入','S1')[0];
  assert.ok(match);assert.equal(match.blockId,'p7-b1');assert.equal(match.method,'ocr');assert.equal(match.needsReview,true);
  assert.equal(documentBlocks[0].cellPositions,undefined);
 }
});

test('recognition expansion respects the shared character cap and preserves later native pages',async()=>{
 const result=await run([readable,'',readable],{options:{maxCharacters:230},recognize:async()=>ocrTextResult({text:readable.repeat(10)},1)});
 const records=new Map();for(const message of result.messages)if(message.page)records.set(message.page.page,message);
 assert.ok([...records.values()].reduce((sum,r)=>sum+r.text.length,0)<=230);
 assert.equal(records.get(2).page.truncated,true);assert.match(records.get(3).text,/合成财务/);
});

test('OCR can be disabled without creating an engine; fully readable documents need none',async()=>{
 const disabled=await run([''],{options:{ocr:false},createOCR:()=>{throw new Error('must not initialize');}});
 assert.equal(disabled.done.attemptedOCR,0);assert.equal(disabled.messages[1].page.ocrStatus,'disabled');
 assert.equal((await run([readable,readable])).calls.length,0);
});

test('a character-capped line remains searchable but cannot masquerade as complete financial evidence',async()=>{
 const result=await run([readable.repeat(10)],{options:{maxCharacters:100,ocr:false}});
 const page=result.messages.find(m=>m.type==='pdf:page');assert.equal(page.text.length,100);
 assert.ok(page.documentBlocks.length);const block=page.documentBlocks[0];
 assert.match(block.text,/营业收入/);assert.equal(block.truncated,true);assert.equal(block.needsReview,true);assert.equal(block.cellPositions,undefined);
 assert.ok(page.text.endsWith(block.text));
 const matches=searchEvidence([{id:'S1',text:page.text,documentBlocks:page.documentBlocks}],'营业收入');assert.equal(matches[0].truncated,true);
});

test('out-of-order OCR updates replace native records with stable IDs and ordered text',async()=>{
 const worker=new EventEmitter();worker.terminate=async()=>{};
 const result=extractPDF(Buffer.from('fixture'),undefined,{createWorker:()=>worker});
 const send=message=>worker.emit('message',message);
 send({type:'pdf:start',pages:3});
 for(let page=1;page<=3;page++)send({type:'pdf:page',page:{page,method:'native',status:'sparse',needsReview:true},text:`native${page}\n`,documentBlocks:[{id:`p${page}-b1`,page,text:'native'}]});
 for(const page of [3,1])send({type:'pdf:page-update',page:{page,method:'ocr',status:'readable',needsReview:true,ocrStatus:'recognized'},text:`ocr${page}\n`,documentBlocks:[{id:`p${page}-b1`,page,text:'recognized'}]});
 send({type:'pdf:done',attemptedOCR:2});
 const parsed=await result;assert.equal(parsed.text,'ocr1\nnative2\nocr3\n');
 assert.deepEqual(parsed.documentBlocks.map(b=>b.id),['p1-b1','p2-b1','p3-b1']);assert.equal(parsed.qualitySummary.ocrPages,2);
});

test('timeout during OCR retains all native pages and exposes pending recognition',async()=>{
 const worker=new EventEmitter();worker.terminate=async()=>{};
 const result=extractPDF(Buffer.from('fixture'),undefined,{timeoutMs:10,createWorker:()=>worker});
 worker.emit('message',{type:'pdf:start',pages:3});
 for(let page=1;page<=3;page++)worker.emit('message',{type:'pdf:page',page:{page,method:'native',status:'readable',ocrStatus:page===1?'pending':undefined},text:readable.repeat(2),documentBlocks:[]});
 const parsed=await result;assert.equal(parsed.readPages,3);assert.equal(parsed.qualitySummary.unreadPages,0);assert.deepEqual(parsed.qualitySummary.skippedOCRPages,[1]);assert.match(parsed.parseWarning,/超时/);
});

test('closing an unused OCR engine is idempotent and prevents later recognition',async()=>{
 const engine=createLocalOCR();await engine.close();await engine.close();await assert.rejects(engine.recognize({}),/已结束/);
});

test('numeric disagreements expose both OCR readings with distinct references and explicit review context',async()=>{
 const result=await run([readable,'',readable],{recognize:async()=>selectOCRResult(
  ocrTextResult({text:readable+' 100.00',confidence:90},1),ocrTextResult({text:readable+' -100.00',confidence:92},1))});
 const update=result.updates[0];assert.equal(update.page.ocrNumericDisagreement,true);
 assert.equal(update.documentBlocks[0].id,'p2-b1');
 const alternative=update.documentBlocks.find(b=>b.ocrAlternative);assert.equal(alternative.id,'p2-ocr-original-b1');
 assert.match(alternative.context,/数值分歧/);assert.equal(alternative.method,'ocr');assert.equal(alternative.needsReview,true);
 const matches=searchEvidence([{id:'S1',text:update.text,documentBlocks:update.documentBlocks}],'营业收入','S1');
 assert.ok(matches.some(m=>m.ocrAlternative));assert.ok(matches.every(m=>m.needsReview));
});

test('partial table result can retain original text and allow the next page to initialize a fresh engine',async()=>{
 let engines=0;
 const result=await run([readable,'','',readable],{createOCR:()=>{
  engines++;return {recognize:async()=>({...recognized(),engineClosed:true,processingWarning:'表格补识别超时'}),close:async()=>{}};
 }});
 assert.equal(engines,2);assert.equal(result.done.attemptedOCR,2);assert.ok(result.updates.every(m=>m.page.method==='ocr'&&m.page.ocrWarning));
});
