import {createRequire} from 'node:module';
import {copyFile,mkdtemp,rm} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {tmpdir} from 'node:os';
import {createCanvas} from '@napi-rs/canvas';
import {createWorker,PSM} from 'tesseract.js';
import {positionedRows,textQuality} from './document-layout.mjs';
const require=createRequire(import.meta.url);
export async function renderPDFPage(page,{scale=2.5,maxPixels=6_000_000}={}){
 const base=page.getViewport({scale:1});
 const actual=Math.min(scale,Math.sqrt(maxPixels/(base.width*base.height)));
 const viewport=page.getViewport({scale:actual});
 const canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
 await page.render({canvasContext:canvas.getContext('2d'),viewport,background:'rgb(255,255,255)'}).promise;
 return {image:canvas.toBuffer('image/png'),scale:actual};
}
export function createLocalOCR({timeoutMs=45000,onAssets=()=>{}}={}){
 let worker,pending,closed=false,languageDirectory;
 async function getWorker(){
  if(!pending)pending=(async()=>{
   // Stage only installed language files in a private temporary directory. An
   // explicit local langPath prevents Tesseract's default CDN download.
   languageDirectory=await mkdtemp(join(tmpdir(),'zhiheng-ocr-'));
   onAssets(languageDirectory);
   await Promise.all(['eng','chi_sim','chi_tra'].map(code=>copyFile(join(dirname(require.resolve(`@tesseract.js-data/${code}/package.json`)),'4.0.0_best_int',`${code}.traineddata.gz`),join(languageDirectory,`${code}.traineddata.gz`))));
   const created=await createWorker('eng+chi_sim+chi_tra',1,{langPath:languageDirectory,cacheMethod:'none',gzip:true,errorHandler:()=>{}});
   if(closed){await created.terminate();throw new Error('OCR任务已结束');}
   worker=created;
   await worker.setParameters({tessedit_pageseg_mode:PSM.AUTO,preserve_interword_spaces:'1'});
   return worker;
  })();
  return pending;
 }
 return {
  async recognize(page){
   let timer;
   try{return await Promise.race([(async()=>{
    const engine=await getWorker();const rendered=await renderPDFPage(page);
    const {data}=await engine.recognize(rendered.image,{}, {text:true,blocks:true,tsv:true});
    const words=(data.blocks||[]).flatMap(b=>b.paragraphs||[]).flatMap(p=>p.lines||[]).flatMap(line=>(line.words||[]).map(word=>({...word,lineBox:line.bbox})));
    const rows=positionedRows(words.filter(w=>w.text?.trim()).map(w=>({text:w.text,x:w.bbox.x0/rendered.scale,y:(w.lineBox||w.bbox).y1/rendered.scale,width:(w.bbox.x1-w.bbox.x0)/rendered.scale,height:((w.lineBox||w.bbox).y1-(w.lineBox||w.bbox).y0)/rendered.scale})));
    const text=rows.length?rows.map(r=>r.text).join('\n'):data.text;
    return {text,rows,confidence:Number.isFinite(data.confidence)?data.confidence:null,quality:{...textQuality(text),needsReview:true}};
   })(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('单页 OCR 超时')),timeoutMs);})]);}
   catch(error){closed=true;if(worker)await worker.terminate();throw error;}
   finally{clearTimeout(timer);}
  },
  async close(){closed=true;if(worker){await worker.terminate();worker=undefined;}if(languageDirectory){await rm(languageDirectory,{recursive:true,force:true});languageDirectory=undefined;}}
 };
}
