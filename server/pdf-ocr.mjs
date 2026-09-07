import {createRequire} from 'node:module';
import {copyFile,mkdtemp,rm} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {tmpdir} from 'node:os';
import {createCanvas} from '@napi-rs/canvas';
import {createWorker,PSM} from 'tesseract.js';
import {positionedRows,textQuality} from './document-layout.mjs';
import {prepareOCRCanvas} from './ocr-image.mjs';
const require=createRequire(import.meta.url);
export function pdfRenderGeometry(base,{scale=2.5,maxPixels=6_000_000}={}){
 if(![base.width,base.height,scale,maxPixels].every(n=>Number.isFinite(n)&&n>0)||maxPixels<1)throw new Error('PDF 页面尺寸或渲染比例无效');
 const budget=Math.min(6_000_000,Math.floor(maxPixels));
 let actual=Math.min(scale,4,10000/Math.max(base.width,base.height),Math.sqrt(budget/(base.width*base.height)));
 let width=Math.ceil(base.width*actual),height=Math.ceil(base.height*actual);
 while(width*height>budget){actual*=Math.min(.99,Math.sqrt(budget/(width*height)));width=Math.ceil(base.width*actual);height=Math.ceil(base.height*actual);}
 if(!actual||!width||!height)throw new Error('PDF 页面比例无法渲染');
 return {scale:actual,width,height};
}
export async function renderPDFPage(page,{scale=2.5,maxPixels=6_000_000}={}){
 const base=page.getViewport({scale:1});
 const {scale:actual,width,height}=pdfRenderGeometry(base,{scale,maxPixels});
 const viewport=page.getViewport({scale:actual});
 const canvas=createCanvas(width,height);
 await page.render({canvasContext:canvas.getContext('2d'),viewport,background:'rgb(255,255,255)'}).promise;
 const prepared=prepareOCRCanvas(canvas);
 return {image:canvas.toBuffer('image/png'),scale:actual,blank:prepared.blank,
  ...(prepared.processing.tableRulesRemoved?{tableImage:prepared.canvas.toBuffer('image/png')}:{}),imageProcessing:prepared.processing};
}
export function ocrTextResult(data,scale){
 if(!Number.isFinite(scale)||scale<=0)throw new Error('OCR 坐标缩放比例无效');
 const lines=(Array.isArray(data.blocks)?data.blocks:[]).flatMap(b=>b.paragraphs||[]).flatMap(p=>p.lines||[]);
 const words=lines.flatMap(line=>(line.words||[]).map(word=>({...word,lineBox:line.bbox})));
 const validBox=box=>box&&['x0','y0','x1','y1'].every(key=>Number.isFinite(box[key]))&&box.x0>=0&&box.y0>=0&&box.x1>box.x0&&box.y1>box.y0;
 let rows=positionedRows(words.filter(w=>w.text?.trim()&&validBox(w.bbox)).map(w=>{
  const box=validBox(w.lineBox)?w.lineBox:w.bbox;
  return {text:w.text,x:w.bbox.x0/scale,y:box.y1/scale,width:(w.bbox.x1-w.bbox.x0)/scale,height:(box.y1-box.y0)/scale};
 }));
 const rawText=String(data.text||''),positioned=rows.map(r=>r.text).join('\n');
 // A partial word layout must not silently drop raw OCR text, signs or cells.
 // Compare character counts, not reading order (columns can be reordered).
 const containsCharacters=(whole,part)=>{
  const counts=new Map();for(const char of whole.replace(/\s/g,''))counts.set(char,(counts.get(char)||0)+1);
  for(const char of part.replace(/\s/g,'')){if(!(counts.get(char)>0))return false;counts.set(char,counts.get(char)-1);}return true;
 };
 const missingRawText=!containsCharacters(positioned,rawText);
 const missingLayout=words.some(w=>w.text?.trim()&&!validBox(w.bbox))||lines.some(line=>line.text?.trim()&&!line.words?.length);
 const layoutFallback=!rows.length||missingRawText||missingLayout;
 let layoutConflict=false;
 if(layoutFallback){
  const transcript=lines.map(line=>{
   const words=(line.words||[]).map(w=>w.text||'').join(' '),text=String(line.text||'');
   if(containsCharacters(text,words))return text;
   if(containsCharacters(words,text))return words;
   layoutConflict=true;
   return [text,'【OCR 词块补充，须核对原件】',words].join('\n');
  }).join('\n');
  let fallback;
  if(containsCharacters(rawText,transcript))fallback=rawText;
  else if(containsCharacters(transcript,rawText))fallback=transcript;
  else{layoutConflict=true;fallback=[rawText,'【OCR 词块补充：与整页文字有差异，须核对原件】',transcript].join('\n');}
  rows=fallback.split(/\r?\n/).filter(line=>line.trim()).map(text=>({text}));
 }
 const text=rows.map(r=>r.text).join('\n');
 return {text,rows,rawText,layoutFallback,layoutConflict,confidence:Number.isFinite(data.confidence)?data.confidence:null,quality:{...textQuality(text),needsReview:true}};
}
// These tokens compare OCR variants only. They are never financial facts and
// whitespace normalization is never applied to the stored evidence itself.
export const ocrNumberTokens=text=>String(text).replace(/(\d,)[ \t]+(?=\d{3}(?:[,\.\s)]|$))/g,'$1').replace(/(\d\.)[ \t]+(?=\d+(?:\D|$))/g,'$1')
 .match(/(?<![\d,.(])(?:\([-+−]?\d+(?:,\d{3})*(?:\.\d+)?%?\)|[-+−]?\d+(?:,\d{3})*(?:\.\d+)?%?)(?![\d,.])/g)||[];
export const ocrDecimalTokens=text=>ocrNumberTokens(text).filter(token=>/\.\d{2}\)?$/.test(token));
export function selectOCRResult(original,table){
 const a=ocrNumberTokens(original.text),b=ocrNumberTokens(table.text);
 const financial=tokens=>tokens.filter(token=>/[,.(%−+-]/.test(token));
 const useTable=table.quality.status==='readable'&&table.confidence!==null&&original.confidence!==null&&table.confidence>=original.confidence-5
  &&!table.layoutConflict&&table.quality.meaningfulCharacters>=original.quality.meaningfulCharacters*.75&&financial(b).length>0&&financial(b).length>=financial(a).length;
 // Reading order matters: exchanging two financial columns is a disagreement
 // even when the same numbers appear in both variants.
 const different=a.length!==b.length||a.some((value,index)=>value!==b[index]);
 return {...(useTable?table:original),variant:useTable?'table':'original',numericDisagreement:different,
  alternatives:[original,table].map((result,index)=>({variant:index?'table':'original',text:result.text.slice(0,8000),truncated:result.text.length>8000,confidence:result.confidence}))};
}
export function createLocalOCR({timeoutMs=45000,onAssets=()=>{},workerFactory=createWorker,renderPage=renderPDFPage}={}){
 let worker,pending,closed=false,languageDirectory,closing;
 const removeAssets=async()=>{if(languageDirectory){const path=languageDirectory;languageDirectory=undefined;await rm(path,{recursive:true,force:true});}};
 const close=()=>{
  closed=true;
  return closing??=(async()=>{
   const current=worker;worker=undefined;
   try{await current?.terminate();}finally{
    // Initialization may still be copying local files. Let it observe closed,
    // then remove its assets, without making a timed-out request wait for it.
    if(pending)void pending.then(removeAssets,removeAssets).catch(()=>{});
    else await removeAssets();
   }
  })();
 };
 async function getWorker(){
  if(!pending)pending=(async()=>{
   // Stage only installed language files in a private temporary directory. An
   // explicit local langPath prevents Tesseract's default CDN download.
   languageDirectory=await mkdtemp(join(tmpdir(),'zhiheng-ocr-'));
   onAssets(languageDirectory);
   await Promise.all(['eng','chi_sim','chi_tra'].map(code=>copyFile(join(dirname(require.resolve(`@tesseract.js-data/${code}/package.json`)),'4.0.0_best_int',`${code}.traineddata.gz`),join(languageDirectory,`${code}.traineddata.gz`))));
   if(closed)throw new Error('OCR任务已结束');
   const created=await workerFactory('eng+chi_sim+chi_tra',1,{langPath:languageDirectory,cacheMethod:'none',gzip:true,errorHandler:()=>{}});
   if(closed){await created.terminate();throw new Error('OCR任务已结束');}
   worker=created;
   await created.setParameters({tessedit_pageseg_mode:PSM.AUTO,preserve_interword_spaces:'1'});
   if(closed)throw new Error('OCR任务已结束');
   return created;
  })();
  return pending;
 }
 return {
  async recognize(page,{timeoutMs:remaining=timeoutMs}={}){
   if(closed)throw new Error('OCR任务已结束');
   let timer,completed;
   try{return await Promise.race([(async()=>{
    const rendered=await renderPage(page);
    if(closed)throw new Error('OCR任务已结束');
    if(rendered.blank)return {...ocrTextResult({},rendered.scale),blank:true};
    const engine=await getWorker();
    await engine.setParameters({tessedit_pageseg_mode:PSM.AUTO});
    const {data}=await engine.recognize(rendered.image,{}, {text:true,blocks:true,tsv:true});
    completed={...ocrTextResult(data,rendered.scale),variant:'original',imageProcessing:rendered.imageProcessing};
    if(!rendered.tableImage)return completed;
    await engine.setParameters({tessedit_pageseg_mode:PSM.SINGLE_BLOCK});
    const table=await engine.recognize(rendered.tableImage,{}, {text:true,blocks:true,tsv:true});
    return {...selectOCRResult(completed,ocrTextResult(table.data,rendered.scale)),imageProcessing:rendered.imageProcessing};
   })(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('单页 OCR 超时')),Math.max(1,Math.min(timeoutMs,remaining)));})]);}
   catch(error){await close();if(completed)return {...completed,engineClosed:true,processingWarning:'表格补识别未完成，保留已完成的原图识别：'+error.message};throw error;}
   finally{clearTimeout(timer);}
  },
  close,
 };
}
