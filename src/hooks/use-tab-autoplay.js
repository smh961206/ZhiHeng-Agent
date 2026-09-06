import {useEffect,useRef,useState} from 'react';

// Keep each tab group independent, and give readers a full interval after interaction.
export function useTabAutoplay(items,initialValue=items[0],interval=4000){
 const rootRef=useRef(null);
 const [value,setValue]=useState(initialValue),[revision,setRevision]=useState(0);
 const [hovered,setHovered]=useState(false),[focused,setFocused]=useState(false);
 const [inView,setInView]=useState(false),[visible,setVisible]=useState(true);
 const [reducedMotion,setReducedMotion]=useState(()=>typeof window!=='undefined'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);

 useEffect(()=>{
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  const onMotion=()=>setReducedMotion(media.matches);
  const onVisibility=()=>setVisible(document.visibilityState==='visible');
  onMotion();onVisibility();
  media.addEventListener('change',onMotion);
  document.addEventListener('visibilitychange',onVisibility);
  const observer=new IntersectionObserver(([entry])=>setInView(entry.isIntersecting&&entry.intersectionRatio>=.1),{threshold:[0,.1]});
  observer.observe(rootRef.current);
  return()=>{
   observer.disconnect();
   media.removeEventListener('change',onMotion);
   document.removeEventListener('visibilitychange',onVisibility);
  };
 },[]);

 useEffect(()=>{
  if(reducedMotion||hovered||focused||!visible||!inView||items.length<2)return;
  const timer=window.setTimeout(()=>setValue(current=>items[(items.indexOf(current)+1)%items.length]),interval);
  return()=>window.clearTimeout(timer);
 },[reducedMotion,hovered,focused,visible,inView,items,interval,value,revision]);

 useEffect(()=>{
  // Scroll only the horizontal tab strip; never move the page or keyboard focus.
  const list=rootRef.current?.querySelector('[role="tablist"]');
  const active=list?.querySelector('[aria-selected="true"]');
  if(!active||list.scrollWidth<=list.clientWidth)return;
  const boundary=list.getBoundingClientRect(),tab=active.getBoundingClientRect();
  const offset=tab.left<boundary.left+8?tab.left-boundary.left-8:tab.right>boundary.right-8?tab.right-boundary.right+8:0;
  if(offset)list.scrollTo({left:list.scrollLeft+offset,behavior:'instant'});
 },[value]);

 return {
  value,rootRef,
  select(next){setValue(next);setRevision(current=>current+1);},
  interactionProps:{
   onPointerEnter(event){if(event.pointerType!=='touch')setHovered(true);},
   onPointerLeave(){setHovered(false);},
   onPointerCancel(){setHovered(false);},
   onFocusCapture(){setFocused(true);},
   onBlurCapture(event){if(!event.currentTarget.contains(event.relatedTarget))setFocused(false);},
  },
 };
}
