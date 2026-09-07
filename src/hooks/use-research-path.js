import {useEffect,useState} from 'react';
import {api,post} from '../lib/api';
import {modes,resolveMode} from '../../shared/research-framework.mjs';

export function useResearchPath(question,mode,{enabled=true,configured}={}){
 const text=question.trim(),[result,setResult]=useState(null),[attempt,setAttempt]=useState(0);
 const automatic=mode==='auto',eligible=enabled&&automatic&&Boolean(text)&&configured!==false;
 useEffect(()=>{
  if(!eligible||configured!==true)return;
  const control=new AbortController();let deadline;
  const fallback=()=>setResult({question:text,attempt,mode:resolveMode({question:text}),source:'rules',reason:'语义判断暂不可用，已按关键词推荐，可手动调整。'});
  const timer=setTimeout(async()=>{
   deadline=setTimeout(()=>{fallback();control.abort();},10000);
   try{
    const value=await api('/api/research/path',{...post({question:text}),signal:control.signal});
    if(!control.signal.aborted){
     if(!Object.hasOwn(modes,value.mode)||!['semantic','rules'].includes(value.source)||typeof value.reason!=='string'||typeof value.decisionId!=='string')throw new Error('路径响应无效');
     setResult({...value,question:text,attempt});
    }
   }catch{if(!control.signal.aborted)fallback();}finally{clearTimeout(deadline);}
  },800);
  return()=>{clearTimeout(timer);clearTimeout(deadline);control.abort();};
 },[text,eligible,configured,attempt]);
 const current=result?.question===text&&result?.attempt===attempt?result:null;
 if(!automatic)return {mode,source:'manual',pending:false,refresh:()=>setAttempt(n=>n+1)};
 return {...(current??{mode:resolveMode({question:text}),source:'rules',reason:''}),pending:eligible&&!current,refresh:()=>setAttempt(n=>n+1)};
}
