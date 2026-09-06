import {parentPort,workerData} from 'node:worker_threads';
import {PARSER_VERSION,positionedRows,rowBlocks,textQuality} from './document-layout.mjs';
import {createLocalOCR} from './pdf-ocr.mjs';
import {pdfDocumentOptions} from './pdf-options.mjs';
let loading,ocr;
try{
 const options=workerData?.options||{};
 const {getDocument,Util}=await import('pdfjs-dist/legacy/build/pdf.mjs');
 loading=getDocument({data:new Uint8Array(workerData?.buffer||workerData),...pdfDocumentOptions});
 const doc=await loading.promise;
 const limit=Math.min(doc.numPages,600,Math.max(1,Math.floor(options.maxPages??600))),maxCharacters=Math.min(1_500_000,Math.max(1,Math.floor(options.maxCharacters??1_500_000)));
 const maxOCRPages=options.ocr===false?0:Math.min(options.maxOCRPages??4,12);
 let attemptedOCR=0,ocrMs=0,usedCharacters=0;
 parentPort.postMessage({type:'pdf:start',pages:doc.numPages,parserVersion:PARSER_VERSION});
 for(let number=1;number<=limit&&usedCharacters<maxCharacters;number++){
  let page,rows=[],text='',method='native',quality,error,ocrError,ocrConfidence;
  try{
   page=await doc.getPage(number);const viewport=page.getViewport({scale:1});
   const content=await page.getTextContent();
   rows=positionedRows(content.items.filter(item=>typeof item.str==='string').map(item=>{const t=Util.transform(viewport.transform,item.transform);return {text:item.str,x:t[4],y:t[5],width:item.width,height:item.height||Math.hypot(t[2],t[3])||10};}));
   text=rows.map(r=>r.text).join('\n');quality=textQuality(text);
  }catch(e){error=e.message;quality={status:'failed',needsReview:true,characters:0};}
  const needsOCR=quality.status!=='readable'||options.forceOCRPages?.includes(number);
  if(needsOCR&&page){
   if(attemptedOCR<maxOCRPages&&ocrMs<(options.ocrBudgetMs??90000)){
    attemptedOCR++;const start=Date.now();
    try{
     ocr??=createLocalOCR({timeoutMs:Math.min(45000,Math.max(1000,(options.ocrBudgetMs??90000)-ocrMs)),onAssets:path=>parentPort.postMessage({type:'pdf:temporary-assets',path})});
     const recognized=await ocr.recognize(page);
     ocrConfidence=recognized.confidence;
     if(recognized.text?.trim()&&(options.forceOCRPages?.includes(number)||recognized.quality.meaningfulCharacters>(quality.meaningfulCharacters||0))){
      ({text,rows,quality}=recognized);method='ocr';error=undefined;
     }
    }catch(e){ocrError=e.message;await ocr.close();ocr=undefined;}
    finally{ocrMs+=Date.now()-start;}
   }else ocrError='OCR 页数或时间预算已用尽，保留缺口';
  }
  const marker=`\n\n【PDF第${number}页${method==='ocr'?' · OCR待核对':''}】\n`;
  const remaining=Math.max(0,maxCharacters-usedCharacters-marker.length);
  const clipped=text.length>remaining;text=text.slice(0,remaining);
  let rowLength=0;rows=rows.filter(row=>{rowLength+=row.text.length+1;return rowLength<=remaining+1;});
  const blocks=rowBlocks(rows,{page:number,method,quality});
  const pageInfo={page:number,method,...quality,ocrConfidence,...(error?{error}:{}),...(ocrError?{ocrError}:{}),...(clipped?{truncated:true,needsReview:true}:{})};
  const pageText=(marker+text).slice(0,maxCharacters-usedCharacters);usedCharacters+=pageText.length;
  parentPort.postMessage({type:'pdf:page',page:pageInfo,text:pageText,documentBlocks:blocks});
  page?.cleanup();
  if(clipped)break;
 }
 await ocr?.close();await loading.destroy();
 parentPort.postMessage({type:'pdf:done',attemptedOCR,ocrMs});
}catch(e){parentPort.postMessage({type:'pdf:error',error:'PDF解析失败：'+e.message});}
finally{await ocr?.close().catch(()=>{});await loading?.destroy().catch(()=>{});}
