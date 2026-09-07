import {useEffect,useState} from 'react';
import {api} from '../lib/api';
export function useJobStream(selected,setSelected,setJobs){
 const [connection,setConnection]=useState('');
 const id=selected?.id,attempt=selected?.retryCount??0,active=['queued','running'].includes(selected?.status);
 useEffect(()=>{
  if(!id||!active){setConnection('');return;}
  let closed=false,finished=false,buffer='',timer,lastCheck=0,pulling=false,streamVersion=0,lastStreamAt=Date.now();
  const control=new AbortController();
  const stream=new EventSource('/api/jobs/'+id+'/stream');
  const update=fn=>{if(!closed)setSelected(job=>{
   if(job?.id!==id||(job.retryCount??0)!==attempt)return job;
   const next=fn(job);return (next.retryCount??0)<attempt?job:next;
  });};
  const clear=()=>{clearTimeout(timer);timer=undefined;buffer='';};
  const flush=()=>{const delta=buffer;buffer='';timer=undefined;if(delta)update(job=>({...job,liveReport:{phase:job.liveReport?.phase||'research',text:(job.liveReport?.text||'')+delta}}));};
  const valid=job=>job?.id===id&&Array.isArray(job.events)&&Array.isArray(job.input?.sources)&&['queued','running','completed','failed','cancelled'].includes(job.status)&&(job.retryCount??0)>=attempt;
  const finish=job=>{if(closed||finished||!valid(job)||['queued','running'].includes(job.status))return;finished=true;clear();stream.close();update(()=>job);const {input,result,events,draft,liveReport,marketData,...summary}=job;setJobs(list=>list.map(item=>item.id===id&&(item.retryCount??0)<=(job.retryCount??0)?{...summary,question:input.question,sourceCount:input.sources.length}:item));setConnection('');api('/api/jobs',{signal:control.signal}).then(list=>{if(!closed)setJobs(list);}).catch(()=>{});};
  async function sync(){
   if(closed||finished||pulling||Date.now()-lastCheck<5000||document.visibilityState==='hidden')return;
   pulling=true;lastCheck=Date.now();const version=streamVersion;
   try{
    const job=await api('/api/jobs/'+id,{signal:control.signal});if(closed||finished||!valid(job))return;
    if(!['queued','running'].includes(job.status)){finish(job);return;}
    // Do not overwrite stream events that arrived after this read began.
    if(version===streamVersion){clear();update(()=>job);}
   }catch{if(!closed&&!finished)setConnection('暂时无法同步进度，将自动重试；刷新页面不会取消研究。');}
   finally{pulling=false;}
  }
  function listen(type,handler){stream.addEventListener(type,event=>{
   if(closed||finished)return;streamVersion++;lastStreamAt=Date.now();
   try{const value=JSON.parse(event.data);if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid event');handler(value);}catch{setConnection('进度更新异常，正在重新同步…');void sync();}
  });}
  stream.onopen=()=>{if(!closed&&!finished){streamVersion++;setConnection('');void sync();}};
  listen('snapshot',job=>{if(valid(job)){if(!['queued','running'].includes(job.status))finish(job);else{clear();update(()=>job);}}});
  listen('workflow',workflow=>{if(!Array.isArray(workflow.stages))throw new Error('Invalid workflow');update(job=>({...job,workflow}));});
  listen('trace',entry=>update(job=>({...job,events:[...job.events,entry]})));
  listen('report_reset',liveReport=>{if(typeof liveReport.text!=='string')throw new Error('Invalid preview');clear();update(job=>({...job,liveReport}));});
  listen('report_delta',value=>{if(typeof value.delta!=='string')throw new Error('Invalid delta');buffer+=value.delta;if(!timer)timer=setTimeout(flush,60);});
  listen('report_phase',({phase})=>{flush();update(job=>({...job,liveReport:{...job.liveReport,phase}}));});
  listen('done',finish);
  stream.onerror=()=>{if(closed||finished)return;setConnection('连接中断，正在恢复实时更新…');void sync();};
  const focus=()=>{void sync();};const poll=setInterval(()=>{if(Date.now()-lastStreamAt>=15000)void sync();},15000);
  window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);
  return()=>{closed=true;control.abort();clearInterval(poll);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus);clear();stream.close();};
 },[id,attempt,active,setSelected,setJobs]);
 return connection;
}
