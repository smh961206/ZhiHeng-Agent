import {Worker} from 'node:worker_threads';
import {readableCharacterCount} from './document-layout.mjs';
import {rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve as resolvePath,dirname,basename} from 'node:path';

export function extractPDF(buffer,signal,{createWorker=(url,options)=>new Worker(url,options),timeoutMs=180000,...options}={}){
 signal?.throwIfAborted();
 return new Promise((resolve,reject)=>{
  const worker=createWorker(new URL('./pdf-worker.mjs',import.meta.url),{workerData:{buffer,options}});
  let finished=false,pages=0,parserVersion,text='';const pageQuality=[],documentBlocks=[],temporaryDirectories=new Set();
  const finish=(error,value)=>{
   if(finished)return;
   finished=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);
   // A hard worker termination does not run its finally block. Only remove the
   // private, exact temporary paths reported before language files are staged.
   void Promise.resolve(worker.terminate()).then(()=>Promise.all([...temporaryDirectories].map(path=>rm(path,{recursive:true,force:true})))).catch(()=>{});
   error?reject(error):resolve(value);
  };
  const abort=()=>finish(new Error('财报解析已取消'));
  const snapshot=(reason,extra={})=>({text,pages,readPages:pageQuality.length,emptyPages:pageQuality.filter(p=>['empty','failed'].includes(p.status)).length,
   truncated:!!reason||pageQuality.length<pages||pageQuality.some(p=>p.truncated),parserVersion,pageQuality,documentBlocks,
   qualitySummary:{nativePages:pageQuality.filter(p=>p.method==='native').length,ocrPages:pageQuality.filter(p=>p.method==='ocr').length,
    unresolvedPages:pageQuality.filter(p=>p.needsReview).map(p=>p.page),unreadPages:pages-pageQuality.length,...extra},
   ...(reason?{parseWarning:reason}:{}),coverage:'按页提取，保留文字行和单元位置；OCR与表格布局为待核对证据，未自动确认财务数字。'});
  const partialOrFail=error=>readableCharacterCount(text)>=200?finish(null,snapshot(error.message)):finish(error);
  const timer=setTimeout(()=>partialOrFail(new Error(`财报PDF解析超时（${Math.round(timeoutMs/1000)}秒），保留已读取页`)),timeoutMs);
  worker.on('message',message=>{
   // Node --watch sends watch:import/watch:require over this same channel.
   // Only our explicitly tagged messages can complete PDF extraction.
   if(message?.type==='pdf:temporary-assets'&&typeof message.path==='string'){
    const path=resolvePath(message.path);if(dirname(path)===resolvePath(tmpdir())&&/^zhiheng-ocr-[a-zA-Z0-9]+$/.test(basename(path)))temporaryDirectories.add(path);return;
   }
   if(message?.type==='pdf:start'){pages=message.pages;parserVersion=message.parserVersion;return;}
   if(message?.type==='pdf:page'){
    if(!Number.isInteger(pages)||pages<1||message.page?.page!==pageQuality.length+1||message.page.page>pages||typeof message.text!=='string'||!Array.isArray(message.documentBlocks))return finish(new Error('PDF解析页面返回格式无效'));
    pageQuality.push(message.page);documentBlocks.push(...message.documentBlocks);text+=message.text;return;
   }
   if(message?.type==='pdf:done')return pageQuality.length?finish(null,snapshot(null,{attemptedOCR:message.attemptedOCR,ocrMs:message.ocrMs})):finish(new Error('PDF解析未读取任何页面'));
   if(message?.type==='pdf:error')return partialOrFail(new Error(typeof message.error==='string'?message.error:'PDF解析失败'));
   if(message?.type!=='pdf:result')return;
   const result=message.result;
   if(typeof result?.text!=='string'||!Number.isInteger(result.pages)||result.pages<1||!Number.isInteger(result.readPages)||result.readPages<1||result.readPages>result.pages){
    return finish(new Error('PDF解析返回格式无效，请重试或检查解析服务'));
   }
   finish(null,result);
  });
  worker.on('error',partialOrFail);
  worker.on('exit',code=>{if(!finished)partialOrFail(new Error(`PDF解析进程未返回结果即退出（退出码 ${code}）`));});
  signal?.addEventListener('abort',abort,{once:true});
  if(signal?.aborted)abort();
 });
}
