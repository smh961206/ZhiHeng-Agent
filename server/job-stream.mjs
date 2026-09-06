// Each reconnect starts with a current snapshot; no event replay store is needed.
export function publicJob(job){
 const {draft,...visible}=job;
 return {...visible,liveReport:['queued','running'].includes(job.status)?job.liveReport:undefined,input:{...job.input,sources:job.input.sources.map(s=>({...s,text:s.text.slice(0,12000),previewTruncated:s.text.length>12000}))}};
}
export function createJobStreams(){
 const clients=new Map();
 const write=(res,type,data)=>{
  if(res.destroyed||res.writableEnded)return;
  res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  if(res.writableLength>2_000_000)res.destroy();
 };
 return {
  subscribe(req,res,job){
   res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no','X-Content-Type-Options':'nosniff'});res.flushHeaders();
   if(!['queued','running'].includes(job.status)){write(res,'done',publicJob(job));res.end();return;}
   let group=clients.get(job.id);if(!group){group=new Set();clients.set(job.id,group);}group.add(res);
   write(res,'snapshot',publicJob(job));
   const heartbeat=setInterval(()=>{if(!res.destroyed&&!res.writableEnded){res.write(': heartbeat\n\n');if(res.writableLength>2_000_000)res.destroy();}},15000);heartbeat.unref();
   res.on('close',()=>{clearInterval(heartbeat);group.delete(res);if(!group.size)clients.delete(job.id);});
  },
  publish(id,type,data){for(const res of clients.get(id)??[])write(res,type,data);},
  finish(job){for(const res of clients.get(job.id)??[]){write(res,'done',publicJob(job));res.end();}clients.delete(job.id);}
 };
}
