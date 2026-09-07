import test from 'node:test';
import assert from 'node:assert/strict';
import {createCanvas} from '@napi-rs/canvas';
import {prepareOCRCanvas} from '../server/ocr-image.mjs';
import {pdfRenderGeometry,ocrTextResult,selectOCRResult,createLocalOCR,ocrDecimalTokens,ocrNumberTokens} from '../server/pdf-ocr.mjs';
import {parsingWarnings} from '../server/document-layout.mjs';

const sample='合成现金流量表，营业收入及经营现金流量，仅用于验证资料解析和识别结果的完整性。';
function blankCanvas(width=400,height=500){const c=createCanvas(width,height),ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,width,height);return c;}
const at=(c,x,y)=>Array.from(c.getContext('2d').getImageData(x,y,1,1).data);
const box=(x,y,w=30,h=12)=>({x0:x,y0:y,x1:x+w,y1:y+h});
const data=(text,words)=>({text,confidence:90,blocks:[{paragraphs:[{lines:[{text,words}]}]}]});

test('OCR table copy removes intersecting grid rules while preserving minus signs, decimals and original pixels',()=>{
 const original=blankCanvas(),ctx=original.getContext('2d');ctx.fillStyle='black';
 for(const y of [50,150,250,350,450])ctx.fillRect(20,y,360,1);
 for(const x of [20,200,379])ctx.fillRect(x,50,1,401);
 ctx.fillRect(70,90,15,2);ctx.fillRect(110,95,2,2);
 const prepared=prepareOCRCanvas(original);
 assert.equal(prepared.processing.tableRulesRemoved,true);assert.deepEqual(at(prepared.canvas,100,150),[255,255,255,255]);
 assert.deepEqual(at(prepared.canvas,75,90),[0,0,0,255]);assert.deepEqual(at(prepared.canvas,110,95),[0,0,0,255]);
 assert.deepEqual(at(original,100,150),[0,0,0,255]);assert.equal(prepared.blank,false);
});

test('a single underline and faint image marks are preserved, never labelled blank',()=>{
 const original=blankCanvas(),ctx=original.getContext('2d');ctx.fillStyle='black';ctx.fillRect(20,250,360,1);
 assert.equal(prepareOCRCanvas(original).processing.tableRulesRemoved,false);
 const faint=blankCanvas();faint.getContext('2d').fillStyle='rgb(253,253,253)';faint.getContext('2d').fillRect(100,100,2,2);
 assert.equal(prepareOCRCanvas(faint).blank,false);assert.equal(prepareOCRCanvas(blankCanvas()).blank,true);
});

test('render dimensions reject malformed geometry and enforce pixel budget after rounding',()=>{
 for(const base of [{width:595,height:842},{width:4000,height:5000},{width:1e9,height:1},{width:1,height:1e9}]){
  const result=pdfRenderGeometry(base);assert.ok(result.width*result.height<=6_000_000);assert.ok(Math.max(result.width,result.height)<=10000);
 }
 for(const base of [{width:NaN,height:1},{width:Infinity,height:1},{width:0,height:1},{width:-10,height:20}])assert.throws(()=>pdfRenderGeometry(base),/无效/);
 assert.throws(()=>pdfRenderGeometry({width:1,height:1},{maxPixels:0}),/无效/);
 assert.throws(()=>ocrTextResult({},0),/比例/);
});

test('partially missing OCR coordinates retain raw numbers and signs instead of dropping them',()=>{
 const input=data('营业收入 -1,234.50 900.00',[{text:'营业收入',bbox:box(0,10)},{text:'-1,234.50',bbox:{x0:NaN}},{text:'900.00',bbox:box(200,10)}]);
 const result=ocrTextResult(input,2);assert.equal(result.text,input.text);assert.equal(result.layoutFallback,true);assert.equal(result.rows[0].cells,undefined);
 const missing=data('营业收入 -1,234.50',[{text:'营业收入',bbox:box(0,10)}]);assert.equal(ocrTextResult(missing,2).text,missing.text);
});

test('complete positioned OCR keeps adjacent financial values separate and does not invent missing values',()=>{
 const words=[{text:'净利润',bbox:box(10,10)},{text:'-1,234.50',bbox:box(100,10,60)},{text:'900.00',bbox:box(180,10,45)}];
 const result=ocrTextResult(data('净利润 -1,234.50 900.00',words),1);
 assert.equal(result.layoutFallback,false);assert.match(result.text,/-1,234\.50\t900\.00/);assert.equal(result.rows[0].cells.length,3);
 const invalid=ocrTextResult(data('',[{text:'负数 -80.00',bbox:{x0:10,y0:10,x1:1,y1:5}}]),1);
 assert.equal(invalid.text,'负数 -80.00');assert.equal(invalid.rows[0].cells,undefined);
});

test('table variants retain disagreements and cannot replace original with lost decimals or low confidence',()=>{
 assert.deepEqual(ocrDecimalTokens('-1, 234. 50\t900.00'),['-1,234.50','900.00']);
 const original=ocrTextResult({text:sample+' 1,234.50 900.00',confidence:90},1);
 const table=ocrTextResult({text:sample+' -1,234.50 900.00',confidence:91},1);
 const selected=selectOCRResult(original,table);assert.equal(selected.variant,'table');assert.equal(selected.numericDisagreement,true);
 assert.ok(selected.alternatives[0].text.includes('1,234.50'));assert.ok(selected.alternatives[1].text.includes('-1,234.50'));assert.equal(selected.quality.needsReview,true);
 for(const bad of [ocrTextResult({text:sample+' 1,234. 900.',confidence:95},1),{...table,confidence:70}])assert.equal(selectOCRResult(original,bad).variant,'original');
 assert.match(parsingWarnings({qualitySummary:{ocrDisagreementPages:[2],ocrIncompletePages:[3]}}).join(' '),/数值分歧/);
});

test('OCR comparison detects accounting negatives, integer column swaps and changed decimal precision',()=>{
 assert.deepEqual(ocrNumberTokens('(260,532) 16.844 −7,887 3.25%'),['(260,532)','16.844','−7,887','3.25%']);
 for(const [before,after] of [['(260,532)','260,532'],['16.844','16.84'],['100 200','200 100'],['-80.00 90.00','90.00 -80.00'],['3.25%','3.25']]){
  const result=selectOCRResult(ocrTextResult({text:sample+' '+before,confidence:90},1),ocrTextResult({text:sample+' '+after,confidence:92},1));
  assert.equal(result.numericDisagreement,true,`${before} → ${after}`);
 }
 assert.deepEqual(ocrNumberTokens('1,234. 50\t900.00'),['1,234.50','900.00']);
 assert.deepEqual(ocrNumberTokens('1,23.45'),[]);
});

test('partial raw text cannot discard unpositioned word-block amounts',()=>{
 const result=ocrTextResult(data('营业收入',[{text:'营业收入',bbox:box(0,10)},{text:'(260,532)',bbox:{x0:NaN}}]),1);
 assert.match(result.text,/\(260,532\)/);assert.equal(result.layoutFallback,true);assert.equal(result.rows[0].cells,undefined);
 const conflict=ocrTextResult(data('营业收入 100.00',[{text:'营业收入 900.00',bbox:{x0:NaN}}]),1);
 assert.match(conflict.text,/100\.00/);assert.match(conflict.text,/900\.00/);assert.equal(conflict.layoutConflict,true);
 assert.equal(conflict.quality.needsReview,true);
});

test('failed table second pass keeps completed original OCR and closes its engine',async()=>{
 let calls=0,terminated=0;
 const engine=createLocalOCR({renderPage:async()=>({image:'original',tableImage:'table',scale:1}),workerFactory:async()=>({
  setParameters:async()=>{},recognize:async()=>{if(calls++)throw new Error('table failure');return {data:{text:sample,confidence:90}};},terminate:async()=>{terminated++;}
 })});
 const result=await engine.recognize({});assert.equal(result.text,sample);assert.equal(result.engineClosed,true);assert.match(result.processingWarning,/table failure/);
 await engine.close();assert.equal(terminated,1);
});

test('table recognition timeout returns the completed first pass rather than losing the page',async()=>{
 let calls=0,terminated=0;
 const engine=createLocalOCR({timeoutMs:500,renderPage:async()=>({image:'original',tableImage:'table',scale:1}),workerFactory:async()=>({
  setParameters:async()=>{},recognize:async()=>calls++?new Promise(()=>{}):{data:{text:sample,confidence:90}},terminate:async()=>{terminated++;}
 })});
 const result=await engine.recognize({});assert.equal(result.text,sample);assert.equal(result.engineClosed,true);assert.match(result.processingWarning,/超时/);assert.equal(terminated,1);
});

test('table mode does not leak into the next page and successful alternatives remain inspectable',async()=>{
 const modes=[];let call=0,render=0;
 const engine=createLocalOCR({renderPage:async()=>({image:'original',...(render++===0?{tableImage:'table'}:{}),scale:1}),workerFactory:async()=>({
  setParameters:async p=>modes.push(p.tessedit_pageseg_mode),recognize:async()=>({data:{text:sample+' '+(call++===1?'-100.00':'100.00'),confidence:92}}),terminate:async()=>{}
 })});
 try{const first=await engine.recognize({});const second=await engine.recognize({});assert.equal(first.alternatives.length,2);assert.equal(second.variant,'original');assert.deepEqual(modes.slice(-3),['3','6','3']);}
 finally{await engine.close();}
});
