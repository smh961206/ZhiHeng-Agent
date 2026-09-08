import {parentPort,workerData} from 'node:worker_threads';
import {getDocument,Util} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {pdfDocumentOptions} from './pdf-options.mjs';
import {positionedRows,rowBlocks,textQuality} from './document-layout.mjs';
let loading;
try{
 loading=getDocument({data:new Uint8Array(workerData.bytes),...pdfDocumentOptions});loading.onPassword=()=>{void loading.destroy();};
 const doc=await loading.promise,results=[];
 for(const number of workerData.pages){
  if(number<1||number>doc.numPages)throw new Error('指定页码超出原件范围');
  const page=await doc.getPage(number),viewport=page.getViewport({scale:1}),content=await page.getTextContent();
  const rows=positionedRows(content.items.filter(i=>typeof i.str==='string').map(i=>{const t=Util.transform(viewport.transform,i.transform);return {text:i.str,x:t[4],y:t[5],width:i.width,height:i.height||Math.hypot(t[2],t[3])||10};}));
  const text=rows.map(r=>r.text).join('\n');
  if(text.length>150000)throw new Error('指定页面文字超过读取上限');
  const quality=textQuality(text);results.push({page:number,quality,blocks:rowBlocks(rows,{page:number,quality,idPrefix:`target-p${number}`})});page.cleanup();
 }
 parentPort.postMessage({type:'pages',pages:results,totalPages:doc.numPages});
}catch(error){parentPort.postMessage({type:'error',error:error.message});}
finally{await loading?.destroy().catch(()=>{});}
