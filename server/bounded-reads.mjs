// Keep result order deterministic even when remote reads finish out of order.
// Cancellation drains active workers before returning, so no late mutation or
// unhandled rejection can outlive the collection step.
export async function boundedReads(items,read,{concurrency=2,signal}={}){
 if(!Number.isInteger(concurrency)||concurrency<1||concurrency>4)throw new Error('读取并发数须为1至4');
 signal?.throwIfAborted();
 const results=new Array(items.length);let next=0;
 await Promise.all(Array.from({length:Math.min(concurrency,items.length)},async()=>{
  while(!signal?.aborted){
   const index=next++;if(index>=items.length)return;
   try{results[index]={status:'fulfilled',value:await read(items[index],index)};}
   catch(reason){results[index]={status:'rejected',reason};}
  }
 }));
 signal?.throwIfAborted();return results;
}
