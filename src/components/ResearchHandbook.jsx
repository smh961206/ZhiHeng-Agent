import {useSearchParams} from 'react-router';
import {BookOpen,ShieldCheck} from 'lucide-react';
import {Tabs,TabsList,TabsTrigger,TabsContent} from './ui/tabs';
import {ResearchDiscipline,ResearchGlossary} from './ResearchReference';
import './research-framework.css';

export default function ResearchHandbook(){
 const [searchParams,setSearchParams]=useSearchParams();
 const tab=searchParams.get('tab')==='glossary'?'glossary':'discipline';
 function selectTab(value){
  // A pointer press can also focus the tab before React commits the new URL.
  const next=new URLSearchParams(window.location.search);
  if(value===(next.get('tab')==='glossary'?'glossary':'discipline'))return;
  if(value==='discipline')next.delete('tab');else next.set('tab',value);
  setSearchParams(next);
 }
 return <section className="research-framework research-handbook" aria-labelledby="handbook-title">
  <header className="handbook-heading"><h1 id="handbook-title">研究手册</h1><p>查阅研究标准、数据来源、判断边界与术语解释。</p></header>
  <Tabs value={tab} onValueChange={selectTab} className="handbook-tabs"><TabsList aria-label="研究手册章节"><TabsTrigger value="discipline"><ShieldCheck size={17}/>研究纪律</TabsTrigger><TabsTrigger value="glossary"><BookOpen size={17}/>术语速查</TabsTrigger></TabsList>
   <TabsContent value="discipline"><ResearchDiscipline/></TabsContent><TabsContent value="glossary"><ResearchGlossary/></TabsContent>
  </Tabs>
 </section>;
}
