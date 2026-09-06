import {useEffect,useState} from 'react';
import {api} from '../lib/api';
export function useJobStream(selected,setSelected,setJobs){
 const [connection,setConnection]=useState('');
 const id=selected?.id,attempt=selected?.retryCount??0,active=['queued','running'].includes(selected?.status);
 useEffect(()=>{
  if(!id||!active){setConnection('');return;}
  let closed=false,buffer='',timer,lastCheck=0;
  const stream=new EventSource('/api/jobs/'+id+'/stream');
  const update=fn=>{if(!closed)setSelected(job=>{
   if(job?.id!==id||(job.retryCount??0)!==attempt)return job;
   const next=fn(job);return (next.retryCount??0)<attempt?job:next;
  });};
  const clear=()=>{clearTimeout(timer);timer=undefined;buffer='';};
  const flush=()=>{const delta=buffer;buffer='';timer=undefined;if(delta)update(job=>({...job,liveReport:{phase:job.liveReport?.phase||'research',text:(job.liveReport?.text||'')+delta}}));};
  stream.onopen=()=>{if(!closed)setConnection('');};
  stream.addEventListener('snapshot',event=>{clear();const job=JSON.parse(event.data);update(()=>job);});
  stream.addEventListener('workflow',event=>{const workflow=JSON.parse(event.data);update(job=>({...job,workflow}));});
  stream.addEventListener('trace',event=>{const entry=JSON.parse(event.data);update(job=>({...job,events:[...job.events,entry]}));});
  stream.addEventListener('report_reset',event=>{clear();const liveReport=JSON.parse(event.data);update(job=>({...job,liveReport}));});
  stream.addEventListener('report_delta',event=>{buffer+=JSON.parse(event.data).delta;if(!timer)timer=setTimeout(flush,60);});
  stream.addEventListener('report_phase',event=>{flush();const {phase}=JSON.parse(event.data);update(job=>({...job,liveReport:{...job.liveReport,phase}}));});
  const finish=job=>{if(closed||(job.retryCount??0)<attempt)return;clear();stream.close();update(()=>job);const {input,result,events,draft,liveReport,marketData,...summary}=job;setJobs(list=>list.map(item=>item.id===id&&(item.retryCount??0)<=(job.retryCount??0)?{...summary,question:input.question,sourceCount:input.sources.length}:item));setConnection('');api('/api/jobs').then(list=>{if(!closed)setJobs(list);}).catch(()=>{});};
  stream.addEventListener('done',event=>finish(JSON.parse(event.data)));
  stream.onerror=async()=>{
   if(closed)return;setConnection('连接中断，正在恢复实时更新…');
   if(Date.now()-lastCheck<5000)return;lastCheck=Date.now();
   try{const job=await api('/api/jobs/'+id);if(closed)return;if(!['queued','running'].includes(job.status))finish(job);}
   catch{/* EventSource reconnects automatically; an interrupted connection does not cancel research. */}
  };
  return()=>{closed=true;clear();stream.close();};
 },[id,attempt,active,setSelected,setJobs]);
 return connection;
}
