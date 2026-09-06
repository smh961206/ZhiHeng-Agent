import {useEffect,useMemo,useState} from 'react';
import {api,post} from '@/lib/api';
const empty={securities:[],ambiguities:[],unresolved:[],warnings:[],overflow:false};
const dedupe=items=>[...new Map(items.map(s=>[`${s.market}:${s.symbol}`,s])).values()];
export function useSecurityResolution(question){
 const [result,setResult]=useState(empty),[status,setStatus]=useState('idle'),[error,setError]=useState(''),[choices,setChoices]=useState({}),[manual,setManual]=useState(false),[manualItems,setManualItems]=useState([]);
 useEffect(()=>{
  if(manual){setStatus('manual');return;}
  const controller=new AbortController();setResult(empty);setChoices({});setError('');
  if(!question.trim()){setStatus('idle');return()=>controller.abort();}
  setStatus('loading');
  const timer=setTimeout(async()=>{try{const value=await api('/api/securities/resolve',{...post({question}),signal:controller.signal});if(!controller.signal.aborted){setResult(value);setStatus('ready');}}catch(e){if(!controller.signal.aborted){setStatus('error');setError(e.message);}}},700);
  return()=>{clearTimeout(timer);controller.abort();};
 },[question,manual]);
 const securities=useMemo(()=>manual?manualItems:dedupe([...result.securities,...Object.values(choices)]),[manual,manualItems,result,choices]);
 const ambiguities=manual?[]:result.ambiguities.filter(a=>!choices[a.mention]);
 const blocked=status==='loading'||(!manual&&(!!ambiguities.length||result.overflow||!!result.unresolved.length||status==='error'))||!securities.length||securities.some(s=>!s.symbol.trim())||securities.length>3;
 function edit(items){setManualItems(items);setManual(true);setError('');}
 function choose(mention,item){if(dedupe([...securities,item]).length>3){setError('单次研究最多3个标的，请精简问题或手动调整');return;}setChoices(v=>({...v,[mention]:item}));}
 function reset(){setManual(false);setManualItems([]);setChoices({});setResult(empty);setStatus('idle');setError('');}
 return {securities,status,error,manual,ambiguities,warnings:result.warnings,unresolved:manual?[]:result.unresolved,overflow:!manual&&result.overflow,blocked,choose,edit,reset,auto:()=>setManual(false)};
}
