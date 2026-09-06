// Share reads without letting one disconnected caller cancel another caller's work.
// Only successful values are cached, with bounded memory and an explicit lifetime.
export function createMarketCache({maxEntries=32,maxBytes=64_000_000,clock=Date.now}={}){
 const entries=new Map(),pending=new Map();let bytes=0;
 const remove=key=>{const old=entries.get(key);if(old){bytes-=old.size;entries.delete(key);}};
 return function read(key,loader,{signal,ttlMs=60000,shouldCache=()=>true}={}){
  signal?.throwIfAborted();
  const cached=entries.get(key);
  if(cached&&cached.expires>clock())return Promise.resolve(cached.value);
  remove(key);
  let task=pending.get(key);
  if(!task){
   task={controller:new AbortController(),readers:0,finished:false};pending.set(key,task);
   task.promise=Promise.resolve().then(()=>loader(task.controller.signal)).then(value=>{
    const size=Buffer.byteLength(JSON.stringify(value));
    if(ttlMs>0&&size<=maxBytes&&!task.controller.signal.aborted&&shouldCache(value)){
     remove(key);
     while(entries.size>=maxEntries||bytes+size>maxBytes)remove(entries.keys().next().value);
     entries.set(key,{value,size,expires:clock()+ttlMs});bytes+=size;
    }
    return value;
   }).finally(()=>{task.finished=true;if(pending.get(key)===task)pending.delete(key);});
  }
  task.readers++;
  return new Promise((resolve,reject)=>{
   let done=false;
   const finish=(error,value)=>{
    if(done)return;done=true;signal?.removeEventListener('abort',abort);task.readers--;
    if(!task.finished&&!task.readers){task.controller.abort();if(pending.get(key)===task)pending.delete(key);}
    error?reject(error):resolve(value);
   };
   const abort=()=>finish(signal.reason||new DOMException('请求已取消','AbortError'));
   signal?.addEventListener('abort',abort,{once:true});
   task.promise.then(value=>finish(null,value),error=>finish(error));
   if(signal?.aborted)abort();
  });
 };
}
