import {KnowledgeStatus} from './ResearchKnowledge';
import ResearchMethod from './ResearchMethod';
import {useSearchParams,useLocation} from 'react-router';
import {useEffect} from 'react';
import {BookOpen,ShieldCheck} from 'lucide-react';
import {Tabs,TabsList,TabsTrigger,TabsContent} from './ui/tabs';
import {ResearchDiscipline,ResearchGlossary} from './ResearchReference';
import './research-framework.css';
import ResearchUsageGuide from './ResearchUsageGuide';


export default function ResearchHandbook({config,checking,onRefresh,onStart}){
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
  <header className="handbook-heading"><h1 id="handbook-title">研究手册</h1><p>从资料准备到报告核对，按问题查阅；了解模型评估、研究依据与历史记录的区别。</p></header>
  <KnowledgeStatus config={config} checking={checking} onRefresh={onRefresh}/>
  <Tabs value={tab} onValueChange={selectTab} className="handbook-tabs"><TabsList aria-label="研究手册章节"><TabsTrigger value="guide"><BookOpen size={17}/>使用指南</TabsTrigger><TabsTrigger value="method"><BookOpen size={17}/>研究方法</TabsTrigger><TabsTrigger value="discipline"><ShieldCheck size={17}/>研究纪律</TabsTrigger><TabsTrigger value="glossary"><BookOpen size={17}/>术语速查</TabsTrigger></TabsList>
   <TabsContent value="guide"><ResearchUsageGuide/></TabsContent><TabsContent value="method"><ResearchMethod/></TabsContent><TabsContent value="discipline"><ResearchDiscipline/></TabsContent><TabsContent value="glossary"><ResearchGlossary/></TabsContent>
  </Tabs>
 </section>;
}
