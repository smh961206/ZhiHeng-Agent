import {useEffect,useRef,useState} from 'react';
import {saveComposerDraft,clearComposerDraft} from '../lib/composer-draft.mjs';
export function useComposerDraft(input,enabled){
 const [status,setStatus]=useState('');const timer=useRef(),latest=useRef(),suppressed=useRef(),lastActive=useRef();
 const serialized=JSON.stringify(input);latest.current={input,enabled,serialized};
 if(enabled)lastActive.current=latest.current;
 function save(current=latest.current){
  if(!current?.enabled||suppressed.current===current.serialized)return;
  try{setStatus(saveComposerDraft(current.input)?'输入已在当前标签页暂存，刷新后可恢复。':'');}
  catch{setStatus('浏览器暂存不可用，请在离开前自行保留输入。');}
 }
 useEffect(()=>{clearTimeout(timer.current);if(enabled)timer.current=setTimeout(save,250);else if(lastActive.current){save(lastActive.current);lastActive.current=undefined;}return()=>clearTimeout(timer.current);},[serialized,enabled]);
 useEffect(()=>{const hide=()=>{clearTimeout(timer.current);save();};window.addEventListener('pagehide',hide);return()=>window.removeEventListener('pagehide',hide);},[]);
 return {status,flush(){clearTimeout(timer.current);save();},clear(){clearTimeout(timer.current);suppressed.current=latest.current.serialized;try{clearComposerDraft();setStatus('');}catch{setStatus('浏览器暂存无法清除，请检查浏览器设置。');}}};
}
