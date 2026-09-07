import test from 'node:test';
import assert from 'node:assert/strict';
import {readDocument,documentKind} from '../server/document-reader.mjs';
import {modelRouting,publicModelRouting} from '../server/model-routing.mjs';
import {pageHasVisualContent} from '../server/pdf-processing.mjs';
import {enhancePDFWithVision,visualAuditContext} from '../server/visual-reading.mjs';
import {materialDocx,materialXlsx,materialPdf} from './fixtures/material-files.mjs';
test('uploads and downloaded text, Word and Excel share identical parsing and Pro handoff',async()=>{
 for(const [name,bytes] of [['memo.md',Buffer.from('# 研究\n现金流待核对')],['memo.txt',Buffer.from('文本资料')],['report.docx',Buffer.from(materialDocx)],['report.xlsx',Buffer.from(materialXlsx)]]){
  const upload=await readDocument(bytes,{name,upload:true}),download=await readDocument(bytes,{name:'https://example.invalid/'+name});
  assert.equal(upload.text,download.text);assert.equal(upload.modelRouting.analysisModel,'deepseek-v4-pro');assert.equal(download.modelRouting.visionModel,'deepseek-v4-flash-vision-exp');
  if(name.endsWith('xlsx'))assert.equal(JSON.parse(upload.text).worksheets[0].cells[1].address,'C1');
 }
 assert.equal(documentKind(Buffer.from('data'),'file.exe'),null);
});
test('ordinary readable PDF bypasses Vision; classification does not spend visual budget',async()=>{
 let calls=0;const parsed={text:'普通文字内容',pageQuality:[{page:1,status:'readable'}],documentBlocks:[{page:1,text:'普通文档正文'}]};
 const result=await enhancePDFWithVision(Buffer.from('pdf'),parsed,undefined,{enabled:true,read:async()=>{calls++;throw new Error();}});
 assert.equal(calls,0);assert.equal(result.visualReading.status,'text-only');
 const actual=await readDocument(materialPdf(),{name:'report.pdf',upload:true});assert.equal(actual.processing.method,'text');assert.ok(actual.text.includes('Annual cash flow'));
});
test('large raster content and vector charts require Vision; a small logo alone does not',()=>{
 const OPS={save:1,restore:2,transform:3,paintImageXObject:4,constructPath:5};
 const raster=size=>({fnArray:[1,3,4,2],argsArray:[[],[size,0,0,size,0,0],[],[]]});
 assert.equal(pageHasVisualContent(raster(40),OPS,'普通文字',600*800),false);
 assert.equal(pageHasVisualContent(raster(600),OPS,'扫描财报',600*800),true);
 assert.equal(pageHasVisualContent({fnArray:Array(40).fill(5)},OPS,'收入趋势图',600*800),true);
});
test('analysis and vision credentials are separate and public metadata never contains credentials',()=>{
 const env={LLM_MODEL:'deepseek-v4-pro',LLM_API_KEY:'analysis-secret',LLM_VISION_API_KEY:'vision-secret',LLM_VISION_BASE_URL:'https://vision.example.invalid'};
 const config=modelRouting(env);assert.equal(config.analysisKey,'analysis-secret');assert.equal(config.visionKey,'vision-secret');assert.equal(config.visionBase,'https://vision.example.invalid');
 assert.ok(!JSON.stringify(publicModelRouting(env)).includes('secret'));
});
test('Vision failure in audit records a gap and never forwards images to Pro',async()=>{
 const result=await visualAuditContext({sources:[{id:'S1',visualReading:{attachmentId:'a'.repeat(64)}}]},{enabled:true,load:async()=>({pages:[1],images:[{page:1,dataUrl:'data:image/png;base64,YQ=='}]}),read:async()=>{throw new Error('service unavailable');}});
 assert.equal(result.content.length,0);assert.equal(result.coverage.included.length,0);assert.match(result.coverage.omitted[0].reason,/Vision 复读失败/);
});
