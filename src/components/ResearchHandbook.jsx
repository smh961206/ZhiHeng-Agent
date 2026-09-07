import {useSearchParams} from 'react-router';
import {BookOpen,ShieldCheck} from 'lucide-react';
import {Tabs,TabsList,TabsTrigger,TabsContent} from './ui/tabs';
import {ResearchDiscipline,ResearchGlossary} from './ResearchReference';
import './research-framework.css';
import ResearchUsageGuide from './ResearchUsageGuide';

export default function ResearchHandbook(){
 const [searchParams,setSearchParams]=useSearchParams();
 const validTab=value=>['discipline','glossary'].includes(value)?value:'guide';
 const tab=validTab(searchParams.get('tab'));
 function selectTab(value){
  // A pointer press can also focus the tab before React commits the new URL.
  const next=new URLSearchParams(window.location.search);
  if(value===validTab(next.get('tab')))return;
  if(value==='guide')next.delete('tab');else next.set('tab',value);
  setSearchParams(next);
 }
 return <section className="research-framework research-handbook" aria-labelledby="handbook-title">
  <header className="handbook-heading"><h1 id="handbook-title">研究手册</h1><p>从开始研究到核对结果，按步骤了解操作，再查阅研究纪律与术语。</p></header>
  <Tabs value={tab} onValueChange={selectTab} className="handbook-tabs"><TabsList aria-label="研究手册章节"><TabsTrigger value="guide"><BookOpen size={17}/>使用指南</TabsTrigger><TabsTrigger value="discipline"><ShieldCheck size={17}/>研究纪律</TabsTrigger><TabsTrigger value="glossary"><BookOpen size={17}/>术语速查</TabsTrigger></TabsList>
   <TabsContent value="guide"><ResearchUsageGuide/></TabsContent><TabsContent value="discipline"><ResearchDiscipline/></TabsContent><TabsContent value="glossary"><ResearchGlossary/></TabsContent>
  </Tabs>
 </section>;
}
