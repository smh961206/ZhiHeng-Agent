import {useEffect,useMemo,useState} from 'react';
import {api,post} from '@/lib/api';
import {validateSecurities} from '../../shared/security-input.mjs';
const empty={securities:[],ambiguities:[],unresolved:[],warnings:[],overflow:false};
const dedupe=items=>[...new Map(items.map(s=>[`${s.market}:${s.symbol}`,s])).values()];
export function useSecurityResolution(question,initial={}){
 const [result,setResult]=useState(empty),[status,setStatus]=useState('idle'),[error,setError]=useState(''),[choices,setChoices]=useState({}),[manual,setManual]=useState(Boolean(initial.manual)),[manualItems,setManualItems]=useState(initial.securities??[]);
 const [resolvedQuestion,setResolvedQuestion]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  if(manual){setStatus('manual');return;}
  const controller=new AbortController();setResult(empty);setChoices({});setError('');
  if(!question.trim()){setStatus('idle');return()=>controller.abort();}
  setStatus('loading');
  const timer=setTimeout(async()=>{try{const value=await api('/api/securities/resolve',{...post({question}),signal:controller.signal});if(!controller.signal.aborted){setResult(value);setResolvedQuestion(question);setStatus('ready');}}catch(e){if(!controller.signal.aborted){setResolvedQuestion(question);setStatus('error');setError(e.message);}}},700);
  return()=>{clearTimeout(timer);controller.abort();};
 },[question,manual,attempt]);
 const current=resolvedQuestion===question&&status!=='loading';
 const visibleResult=!manual&&current?result:empty;
 const visibleStatus=manual?'manual':!question.trim()?'idle':!current?'loading':status;
 const securities=useMemo(()=>manual?manualItems:current?dedupe([...result.securities,...Object.values(choices)]):[],[manual,manualItems,current,result,choices]);
 const ambiguities=manual?[]:visibleResult.ambiguities.filter(a=>!choices[a.mention]);
 let validationError='';
 try{validateSecurities(securities);}catch(error){validationError=error.message;}
 const blocked=visibleStatus==='loading'||(!manual&&(!!ambiguities.length||visibleResult.overflow||!!visibleResult.unresolved.length||visibleStatus==='error'))||!securities.length||!!validationError;
 function edit(items){setManualItems(items);setManual(true);setError('');}
 function choose(mention,item){if(dedupe([...securities,item]).length>3){setError('单次研究最多3个标的，请精简问题或手动调整');return;}setChoices(v=>({...v,[mention]:item}));}
 function reset(){setManual(false);setManualItems([]);setChoices({});setResult(empty);setResolvedQuestion('');setStatus('idle');setError('');setAttempt(value=>value+1);}
 function auto(){setManual(false);setResolvedQuestion('');setStatus('loading');setChoices({});setError('');setAttempt(value=>value+1);}
 return {securities,status:visibleStatus,source:visibleResult.source,error:validationError||(manual||current?error:''),manual,hasChoices:!manual&&current&&Boolean(Object.keys(choices).length),ambiguities,warnings:visibleResult.warnings,unresolved:visibleResult.unresolved,overflow:visibleResult.overflow,blocked,choose,edit,reset,auto};
}
