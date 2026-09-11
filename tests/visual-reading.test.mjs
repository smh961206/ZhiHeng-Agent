import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createCanvas} from '@napi-rs/canvas';
import {visionStatus,readVisionImages} from '../server/vision-model.mjs';
import {selectVisualPages,validateVisualTranscript,enhancePDFWithVision,visualAuditContext,withVisualBudget,renderVisualImages,visualNumberChecks} from '../server/visual-reading.mjs';
import {saveVisualAsset,loadVisualAsset,visualDigest} from '../server/visual-assets.mjs';
import {usableEvidenceBlock} from '../server/document-layout.mjs';
import {searchEvidence} from '../server/evidence-search.mjs';
import {normalizeReferenceMaterials} from '../shared/reference-materials.mjs';
import {completion,runAgent} from '../server/agent.mjs';
import {readVisualMaterial} from '../server/material-vision.mjs';
import {reviewFixture} from './fixtures/research-review.mjs';
import {materialPdf} from './fixtures/material-files.mjs';
const env={LLM_MODEL:'deepseek-flash',LLM_VISION_MODEL:'deepseek-flash',LLM_API_KEY:'synthetic-key',LLM_BASE_URL:'https://model.example.invalid'};
const image={page:1,region:'整页',dataUrl:'data:image/png;base64,YWJj'};
const parsed={text:'程序提取的正文',pages:3,pageQuality:[{page:1},{page:2,needsReview:true},{page:3}],documentBlocks:[{id:'p3-b1',page:3,text:'营业收入 100'}]};
const transcript=pages=>JSON.stringify({pages:pages.map(page=>({page,text:'营业收入 | 2025 年 | 人民币万元 | 100',uncertainties:['单位仍需核对']}))});

test('vision capability uses exact supported model or explicit override, never guesses',()=>{
 assert.equal(visionStatus(env).enabled,true);
 for(const change of [{LLM_VISION_MODEL:'some-vision-model'},{LLM_VISION_MODEL:'deepseek-v4-flash'},{LLM_API_KEY:''},{LLM_VISION_INPUT:'off'}])assert.equal(visionStatus({...env,...change}).enabled,false);
 assert.equal(visionStatus({...env,LLM_VISION_MODEL:'custom',LLM_VISION_INPUT:'images'}).enabled,true);
 assert.equal(visionStatus(env).pdfDirect,false);
});
test('actual vision request carries image blocks in user messages and validates completion',async()=>{
 let sent;
 const fetcher=async(url,options)=>{sent=JSON.parse(options.body);assert.equal(url.hostname,'model.example.invalid');return Response.json({choices:[{finish_reason:'stop',message:{content:'ok'}}]});};
 assert.equal(await readVisionImages([image],{env,fetcher,prompt:'read synthetic image'}),'ok');
 assert.equal(sent.messages[1].content[2].type,'image_url');assert.equal(sent.messages[0].role,'system');assert.equal(sent.messages[1].role,'user');
 assert.equal(sent.model,'deepseek-flash');assert.equal(sent.thinking.type,'disabled');
 await assert.rejects(readVisionImages([image],{env,prompt:'read',fetcher:async()=>Response.json({choices:[{finish_reason:'length',message:{content:'partial'}}]})}),/未完整完成/);
 await assert.rejects(readVisionImages([image],{env,prompt:'read',fetcher:async()=>Response.json({error:'secret'},{status:401})}),error=>!error.message.includes('secret')&&/401/.test(error.message));
});
test('visual selection prioritizes damaged pages and financial tables; unknown or duplicate pages rejected',()=>{
 assert.deepEqual(selectVisualPages(parsed),[2,3]);assert.deepEqual(selectVisualPages(parsed,0),[]);
 assert.deepEqual(validateVisualTranscript(transcript([3,2]),[2,3]).map(p=>p.page),[2,3]);
 for(const raw of [transcript([1,1]),transcript([999]),'{"pages":[]}'])assert.throws(()=>validateVisualTranscript(raw,[1]));
});
test('visual enrichment preserves native text and adds separately marked non-calculable searchable evidence',async()=>{
 const result=await enhancePDFWithVision(Buffer.from('pdf'),parsed,undefined,{enabled:true,render:async()=>[image],read:async()=>transcript([2,3]),save:async()=> 'a'.repeat(64)});
 assert.ok(result.text.startsWith(parsed.text));assert.deepEqual(result.visualReading.pages,[2,3]);
 const source={id:'S1',type:'official-report',official:true,...result};
 const blocks=source.documentBlocks.filter(b=>b.method==='vision');assert.ok(blocks.length);assert.ok(blocks.every(b=>b.needsReview));
 assert.ok(searchEvidence([source],'营业收入','S1').some(b=>b.method==='vision'));
 assert.equal(usableEvidenceBlock(source,{...blocks[0],needsReview:false}),false);
});
test('visual budgets bound all documents in one job, failures retain original text, cancellation propagates',async()=>{
 let calls=0;const options={enabled:true,render:async()=>[image],read:async()=>{calls++;return transcript([2,3]);},save:async()=> 'a'.repeat(64)};
 await withVisualBudget(async()=>{await enhancePDFWithVision(Buffer.from('pdf'),parsed,undefined,options);const next=await enhancePDFWithVision(Buffer.from('pdf'),parsed,undefined,options);assert.equal(next.visualReading.status,'limited');assert.equal(calls,1);},2);
 const failed=await enhancePDFWithVision(Buffer.from('pdf'),parsed,undefined,{...options,read:async()=>{throw new Error('provider failed');}});assert.equal(failed.text,parsed.text);assert.equal(failed.visualReading.status,'fallback');
 const controller=new AbortController();controller.abort();await assert.rejects(enhancePDFWithVision(Buffer.from('pdf'),parsed,controller.signal,options));
});
test('original image archives validate content addresses and block invalid paths',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'zhiheng-vision-test-'));
 try{
  const value={images:[image],pages:[1],text:'synthetic'},id=await saveVisualAsset(value,{directory});
  assert.deepEqual(await loadVisualAsset(id,{directory}),value);
  await assert.rejects(loadVisualAsset('../escape',{directory}),/编号/);
  await writeFile(join(directory,id+'.json'),'{}');await assert.rejects(loadVisualAsset(id,{directory}),/校验/);
 }finally{await rm(directory,{recursive:true,force:true});}
});
test('audit attaches exact originals but rejects edited text, unavailable archives and excessive pages',async()=>{
 const asset={pages:[1],images:[image],materialTextHash:visualDigest('original')};
 const input={referenceMaterials:[{id:'M1',text:'original',visualAttachment:'a'.repeat(64)},{id:'M2',text:'edited',visualAttachment:'b'.repeat(64)}],sources:[{id:'S1',visualReading:{attachmentId:'c'.repeat(64)}}]};
 const packet=await visualAuditContext(input,{enabled:true,load:async()=>asset,read:async()=>transcript([1]),maxPages:1});
 assert.deepEqual(packet.coverage.included,[{id:'M1',pages:[1]}]);assert.equal(packet.coverage.omitted.length,2);
 assert.ok(packet.content.every(c=>c.type==='text'));assert.match(packet.content[0].text,/Vision/);assert.ok(!JSON.stringify(packet.coverage).includes('base64'));
 const unavailable=await visualAuditContext(input,{enabled:true,load:async()=>{throw new Error();}});assert.equal(unavailable.content.length,0);assert.equal(unavailable.coverage.omitted.length,3);
});
test('normalization retains only a bounded archive reference, not caller authority or inline images',()=>{
 const item=normalizeReferenceMaterials([{title:'原图',text:'original',visualAttachment:'a'.repeat(64),imageFile:'secret',verified:true,processing:{method:'verified'}}])[0];
 assert.equal(item.visualAttachment,'a'.repeat(64));assert.equal(item.verified,false);assert.equal(item.imageFile,undefined);assert.equal(item.processing,undefined);
 assert.equal(normalizeReferenceMaterials([{...item,visualAttachment:'../escape'}])[0].visualAttachment,undefined);
});
test('numeric cross checks flag missing signs and never claim matching tokens establish a financial fact',()=>{
 const result=visualNumberChecks([{page:3,text:'营业收入 -100，利润 8.2'},{page:2,text:'100'}],parsed);
 assert.deepEqual(result[0].unmatchedNumericTokens,['-100','8.2']);assert.equal(result[1].nativeTextAvailable,false);
 const matched=visualNumberChecks([{page:3,text:'营业收入 100'}],parsed)[0];assert.equal(matched.unmatchedCount,0);assert.equal(matched.needsReview,true);assert.match(matched.notice,/尚未证明/);
});
test('PDF import uses backend OCR when visual service fails, with explicit fallback and no original-image claim',async()=>{
 const previous={model:process.env.LLM_MODEL,key:process.env.LLM_API_KEY};process.env.LLM_MODEL=env.LLM_MODEL;process.env.LLM_API_KEY='synthetic';let calls=0;
 try{
  const result=await readVisualMaterial(Buffer.from('%PDF-1.7 synthetic'),{parse:async(_bytes,_signal,options)=>{calls++;return calls===1?{...parsed,documentBlocks:[]}:{...parsed,text:'OCR 已读取营业收入 100',documentBlocks:[{text:'营业收入 100',method:'ocr'}]};},enhance:async(_b,p)=>({...p,visualReading:{status:'fallback'}})});
  assert.equal(calls,2);assert.equal(result.processing.method,'fallback');assert.match(result.text,/未完成视觉核对/);assert.equal(result.visualAttachment,undefined);
 }finally{for(const [key,value] of [['LLM_MODEL',previous.model],['LLM_API_KEY',previous.key]])if(value===undefined)delete process.env[key];else process.env[key]=value;}
});
test('full research-to-audit request carries validated original images and stores coverage without image payloads',async()=>{
 const previous=global.fetch;let calls=0;const asset={pages:[1],images:[image],materialTextHash:visualDigest('original')};
 const job={mode:'B',input:{question:'合成研究',depth:'Standard',portfolio:'',sources:[{id:'S1',title:'合成证据',text:'仅用于回归测试的合成证据。',url:'',date:''}],referenceMaterials:[{id:'M1',title:'原图',text:'original',visualAttachment:'a'.repeat(64)}]}};
 global.fetch=async(_url,options)=>{
  calls++;const body=JSON.parse(options.body);
  if(calls===1)return Response.json({choices:[{message:{role:'assistant',content:'合成研究草稿，资料不足。[S1]'}}]});
  assert.ok(body.messages.some(m=>m.role==='user'&&Array.isArray(m.content)&&m.content.some(p=>p.type==='text'&&p.text.includes('Vision'))));assert.ok(!options.body.includes('image_url'));assert.equal(body.model,'deepseek-flash');
  return Response.json({choices:[{message:{role:'assistant',content:JSON.stringify(reviewFixture(job.input))}}]});
 };
 try{
  const result=await runAgent(job,()=>{},new AbortController().signal,{readVisualContext:input=>visualAuditContext(input,{enabled:true,load:async()=>asset,read:async()=>transcript([1])})});
  assert.equal(calls,2);assert.deepEqual(result.validation.visualAudit.included,[{id:'M1',pages:[1]}]);assert.ok(!JSON.stringify(job).includes('base64'));
 }finally{global.fetch=previous;}
});
test('real isolated PDF renderer preserves page mapping; image renderer produces overview and readable crops',async()=>{
 const images=await renderVisualImages(Buffer.from(materialPdf()),'pdf',[1]);assert.ok(images.length);assert.ok(images.every(p=>p.page===1&&p.dataUrl.startsWith('data:image/jpeg;base64,')));
 const canvas=createCanvas(1000,1600);canvas.getContext('2d').fillRect(0,0,1000,1600);
 const crops=await renderVisualImages(canvas.toBuffer('image/png'),'image',[1]);assert.equal(crops.length,4);assert.match(crops[1].region,/局部/);
 await assert.rejects(renderVisualImages(Buffer.from('broken'),'pdf',[1]),/无法转换/);
});
test('Pro rejects raw images before sending any network request',async()=>{
 const original=global.fetch;let calls=0,fallback=0;
 const messages=[{role:'user',content:[{type:'text',text:'original supplied'}, {type:'image_url',image_url:{url:image.dataUrl}}]}];
 global.fetch=async(_url,options)=>{calls++;if(calls===1)return Response.json({error:{message:'This model does not support image'}},{status:400});assert.ok(!options.body.includes('base64'));return Response.json({choices:[{message:{content:'text audit'}}]});};
 try{await assert.rejects(completion(messages,undefined,new AbortController().signal),/原图须先由 Vision/);assert.equal(calls,0);}finally{global.fetch=original;}
});
