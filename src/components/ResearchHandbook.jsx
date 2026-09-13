import ResearchMethod from './ResearchMethod';
import {useSearchParams,useLocation} from 'react-router';
import {useEffect} from 'react';
import {ArrowRight} from 'lucide-react';
import {Button} from './ui/button';
import {Tabs,TabsList,TabsTrigger,TabsContent} from './ui/tabs';
import {ResearchDiscipline,ResearchGlossary} from './ResearchReference';
import './research-framework.css';
import ResearchUsageGuide from './ResearchUsageGuide';


export default function ResearchHandbook({onStart}){
 const [searchParams,setSearchParams]=useSearchParams();
 const validTab=value=>['method','discipline','glossary'].includes(value)?value:'guide';
 const tab=validTab(searchParams.get('tab'));
 const {hash,key}=useLocation();
 useEffect(()=>{
  if(!(tab==='discipline'&&hash==='#execution-discipline-title'||tab==='method'&&['#method-loading','#method-quality'].includes(hash)))return;
  const frame=requestAnimationFrame(()=>{
   const target=document.getElementById(hash.slice(1)),tabs=target?.closest('.handbook-tabs')?.querySelector(':scope > [role="tablist"]');
   if(!target)return;
   target.setAttribute('tabindex','-1');if(tabs)target.style.scrollMarginTop=`${tabs.getBoundingClientRect().height+16}px`;
   target.focus({preventScroll:true});target.scrollIntoView({block:'start',behavior:'instant'});
  });
  return()=>cancelAnimationFrame(frame);
 },[tab,hash,key]);
 function selectTab(value){
  // A pointer press can also focus the tab before React commits the new URL.
  const next=new URLSearchParams(window.location.search);
  if(value===validTab(next.get('tab')))return;
  if(value==='guide')next.delete('tab');else next.set('tab',value);
  setSearchParams(next);
 }
 return <section className="research-framework research-handbook" aria-labelledby="handbook-title">
  <header className="handbook-heading"><div><h1 id="handbook-title">研究手册</h1><p>查找操作答案，理解研究方法，核对术语与使用边界。</p></div><Button onClick={()=>onStart()}>前往研究工作台<ArrowRight size={16}/></Button></header>
  <Tabs value={tab} onValueChange={selectTab} className="handbook-tabs"><TabsList variant="line" className="handbook-section-nav" aria-label="研究手册章节"><TabsTrigger value="guide">使用指南</TabsTrigger><TabsTrigger value="method">研究方法</TabsTrigger><TabsTrigger value="discipline">研究规范</TabsTrigger><TabsTrigger value="glossary">术语速查</TabsTrigger></TabsList>
   <TabsContent value="guide"><ResearchUsageGuide/></TabsContent><TabsContent value="method"><ResearchMethod/></TabsContent><TabsContent value="discipline"><ResearchDiscipline/></TabsContent><TabsContent value="glossary"><ResearchGlossary/></TabsContent>
  </Tabs>
 </section>;
}
