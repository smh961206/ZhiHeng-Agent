// Serialize periodic snapshots. The final job write must happen after close(),
// otherwise an older running snapshot could overwrite a completed result.
export function createJobCheckpoints({save,onError=()=>{},intervalMs=15000,maxWrites=20,clock=Date.now}={}){
 let timer,inFlight,dirty=false,closed=false,last=-Infinity,reported=false,writes=0;
 function schedule(){
  if(closed||timer||inFlight||!dirty)return;
  timer=setTimeout(()=>{timer=undefined;void write();},Math.max(0,intervalMs-(clock()-last)));
  timer.unref?.();
 }
 function write(){
  if(closed||inFlight||!dirty)return inFlight;
  if(writes>=maxWrites){dirty=false;return;}
  writes++;
  dirty=false;last=clock();
  inFlight=Promise.resolve().then(save).then(()=>{reported=false;}).catch(error=>{if(!reported){reported=true;try{onError(error);}catch{/* A notification failure cannot interrupt research. */}}}).finally(()=>{
   inFlight=undefined;schedule();
  });
  return inFlight;
 }
 return {
  request(){if(!closed&&writes<maxWrites){dirty=true;schedule();}},
  async flush(){clearTimeout(timer);timer=undefined;while(!closed&&(dirty||inFlight)){if(inFlight)await inFlight;else await write();clearTimeout(timer);timer=undefined;}},
  async close(){closed=true;dirty=false;clearTimeout(timer);timer=undefined;await inFlight;},
 };
}
