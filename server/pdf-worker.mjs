import {parentPort,workerData} from 'node:worker_threads';
try{
 const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
 const loading=getDocument({data:new Uint8Array(workerData),useSystemFonts:true,isEvalSupported:false,verbosity:0});
 const doc=await loading.promise;
 let text='',readPages=0,emptyPages=0;
 const limit=Math.min(doc.numPages,600);
 for(let i=1;i<=limit;i++){
  const page=await doc.getPage(i);const content=await page.getTextContent();
  const lines=content.items.map(item=>item.str+(item.hasEOL?'\n':' ')).join('');
  if(!lines.trim())emptyPages++;
  text+=`\n\n【PDF第${i}页】\n${lines}`;readPages=i;page.cleanup();
  if(text.length>1_500_000)break;
 }
 const result={text,pages:doc.numPages,readPages,emptyPages,truncated:readPages<doc.numPages,coverage:'PDF文本提取；表格布局可能丢失，关键数字需核对原件页码'};
 await loading.destroy();parentPort.postMessage(result);
}catch(e){parentPort.postMessage({error:'PDF解析失败：'+e.message});}
