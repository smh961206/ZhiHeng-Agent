import {parentPort,workerData} from 'node:worker_threads';
import {createLocalOCR} from './pdf-ocr.mjs';
import {pdfDocumentOptions} from './pdf-options.mjs';
import {processPDFDocument} from './pdf-processing.mjs';
let loading;
try{
 const {getDocument,Util,OPS}=await import('pdfjs-dist/legacy/build/pdf.mjs');
 loading=getDocument({data:new Uint8Array(workerData?.buffer||workerData),...pdfDocumentOptions});
 await processPDFDocument(await loading.promise,{
  transform:Util.transform,OPS,options:workerData?.options||{},emit:message=>parentPort.postMessage(message),
  createOCR:()=>createLocalOCR({onAssets:path=>parentPort.postMessage({type:'pdf:temporary-assets',path})}),
 });
}catch(e){parentPort.postMessage({type:'pdf:error',error:'PDF解析失败：'+e.message});}
finally{await loading?.destroy().catch(()=>{});}
