import {useEffect,useRef,useState} from 'react';
import {useLocation,useNavigate} from 'react-router';

export function useSectionNavigation(sectionIds){
 const rootRef=useRef(null),navRef=useRef(null);
 const [activeId,setActiveId]=useState(sectionIds[0]);
 const location=useLocation(),navigate=useNavigate();

 useEffect(()=>{
  const root=rootRef.current,nav=navRef.current,scroller=root?.closest('.page-scroll');
  if(!root||!nav||!scroller)return;
  const sections=sectionIds.map(id=>root.querySelector('#'+id)).filter(Boolean);
  let frame=0;
  const update=()=>{
   frame=0;
   const readingTop=scroller.getBoundingClientRect().top+nav.offsetHeight+32;
   let current=sectionIds[0];
   for(const section of sections){if(section.getBoundingClientRect().top<=readingTop)current=section.id;}
   if(scroller.scrollHeight>scroller.clientHeight&&scroller.scrollTop+scroller.clientHeight>=scroller.scrollHeight-2)current=sections.at(-1)?.id||current;
   setActiveId(current);
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  const resize=new ResizeObserver(schedule);
  for(const element of [root,nav,scroller,...sections])resize.observe(element);
  scroller.addEventListener('scroll',schedule,{passive:true});
  schedule();
  return()=>{cancelAnimationFrame(frame);resize.disconnect();scroller.removeEventListener('scroll',schedule);};
 },[sectionIds]);

 // Handle both local anchors and links arriving from the sidebar or browser history.
 // Only this effect scrolls the page, so the browser cannot jump before animating.
 useEffect(()=>{
  const id=location.hash.slice(1);
  if(!sectionIds.includes(id))return;
  const frame=requestAnimationFrame(()=>{
   const root=rootRef.current,nav=navRef.current,scroller=root?.closest('.page-scroll'),section=root?.querySelector('#'+id);
   if(!scroller||!section||!nav)return;
   const top=scroller.scrollTop+section.getBoundingClientRect().top-scroller.getBoundingClientRect().top-nav.offsetHeight-18;
   scroller.scrollTo({top:Math.max(0,top),behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  });
  return()=>cancelAnimationFrame(frame);
 },[location.key,location.hash,sectionIds]);

 useEffect(()=>{
  const nav=navRef.current,active=nav?.querySelector('[aria-current="location"]');
  if(!active||nav.scrollWidth<=nav.clientWidth)return;
  const bounds=nav.getBoundingClientRect(),item=active.getBoundingClientRect();
  const offset=item.left<bounds.left+8?item.left-bounds.left-8:item.right>bounds.right-8?item.right-bounds.right+8:0;
  if(offset)nav.scrollTo({left:nav.scrollLeft+offset,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 },[activeId]);

 function onAnchorClick(event){
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const anchor=event.target.closest('a[href^="#"]');
  if(!anchor||!event.currentTarget.contains(anchor)||anchor.hasAttribute('download')||anchor.target&&anchor.target!=='_self')return;
  const hash=anchor.getAttribute('href');
  if(!sectionIds.includes(hash.slice(1)))return;
  event.preventDefault();
  navigate({pathname:location.pathname,search:location.search,hash});
 }

 return {rootRef,navRef,activeId,onAnchorClick};
}
