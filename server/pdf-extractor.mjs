import {Worker} from 'node:worker_threads';

export function extractPDF(buffer,signal,{createWorker=(url,options)=>new Worker(url,options),timeoutMs=90000}={}){
 signal?.throwIfAborted();
 return new Promise((resolve,reject)=>{
  const worker=createWorker(new URL('./pdf-worker.mjs',import.meta.url),{workerData:buffer});
  let finished=false;
  const finish=(error,value)=>{
   if(finished)return;
   finished=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);
   void worker.terminate();
   error?reject(error):resolve(value);
  };
  const abort=()=>finish(new Error('财报解析已取消'));
  const timer=setTimeout(()=>finish(new Error('财报PDF解析超时（90秒）')),timeoutMs);
  worker.on('message',message=>{
   // Node --watch sends watch:import/watch:require over this same channel.
   // Only our explicitly tagged messages can complete PDF extraction.
   if(message?.type==='pdf:error')return finish(new Error(typeof message.error==='string'?message.error:'PDF解析失败'));
   if(message?.type!=='pdf:result')return;
   const result=message.result;
   if(typeof result?.text!=='string'||!Number.isInteger(result.pages)||result.pages<1||!Number.isInteger(result.readPages)||result.readPages<1||result.readPages>result.pages){
    return finish(new Error('PDF解析返回格式无效，请重试或检查解析服务'));
   }
   finish(null,result);
  });
  worker.on('error',error=>finish(error));
  worker.on('exit',code=>{if(!finished)finish(new Error(`PDF解析进程未返回结果即退出（退出码 ${code}）`));});
  signal?.addEventListener('abort',abort,{once:true});
  if(signal?.aborted)abort();
 });
}
