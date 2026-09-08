import {useCallback,useEffect,useRef,useState} from 'react';
import {api} from '../lib/api';

export function useResearchConfig(pathname){
 const [config,setConfig]=useState(null),[checking,setChecking]=useState(false);
 const request=useRef(0),controller=useRef(null);
 const refresh=useCallback(async()=>{
  controller.current?.abort();const control=new AbortController();controller.current=control;
  const id=++request.current;setChecking(true);
  const timer=setTimeout(()=>{
   if(id!==request.current||control.signal.aborted)return;
   control.abort();setConfig(current=>({...current,connectionState:'error'}));setChecking(false);
  },10000);
  try{
   const next=await api('/api/config',{signal:control.signal});
   if(typeof next?.configured!=='boolean'||typeof next.knowledgeVersion!=='string'||!next.knowledgeVersion.trim())throw new Error('服务状态不完整');
   if(id===request.current&&!control.signal.aborted)setConfig({...next,connectionState:'ready'});
  }catch{
   if(id===request.current&&!control.signal.aborted)setConfig(current=>({...current,connectionState:'error'}));
  }finally{clearTimeout(timer);if(id===request.current&&!control.signal.aborted)setChecking(false);}
 },[]);
 useEffect(()=>{void refresh();},[pathname,refresh]);
 useEffect(()=>{
  const focus=()=>{if(document.visibilityState==='visible')void refresh();};
  window.addEventListener('focus',focus);
  return()=>{window.removeEventListener('focus',focus);controller.current?.abort();request.current++;};
 },[refresh]);
 return {config,checking,refresh};
}
