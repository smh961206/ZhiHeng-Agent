import {useRef,useState} from 'react';
import {ArrowUpRight,ChevronDown,ChevronRight,CircleAlert,FileText} from 'lucide-react';
import {Button} from './ui/button';
import {Sheet,SheetTrigger,SheetContent,SheetHeader,SheetTitle,SheetDescription} from './ui/sheet';
import {Tabs,TabsContent,TabsList,TabsTrigger} from './ui/tabs';
import {reportWarningGroups,reportWarningSourceMatches} from '../../shared/report-warnings.mjs';

export default function ReportWarnings({warnings=[],sources=[],onSource}){
 const [open,setOpen]=useState(false),pendingSource=useRef(null);
 const [visibleCount,setVisibleCount]=useState(4),[category,setCategory]=useState('reports');
 if(!warnings.length)return null;
 const {other,groups}=reportWarningGroups(warnings);
 const activeCategory=groups.length&&other.length?category:groups.length?'reports':'notes';
 const shown=groups.slice(0,visibleCount),remaining=groups.length-shown.length;
 const overview=[groups.length&&`${groups.length} 组财报核对`,other.length&&`${other.length} 项数据说明`].filter(Boolean).join(' · ');
 return <Sheet open={open} onOpenChange={setOpen}>
  <SheetTrigger asChild><button type="button" className="rd-warning-strip" aria-label={`查看阅读提示：${overview}`}><CircleAlert size={15} aria-hidden="true"/><span>阅读提示</span><span className="rd-warning-strip-count">{warnings.length}</span><span className="rd-warning-strip-overview">{overview}</span><span className="rd-warning-strip-action">查看<ChevronRight size={14} aria-hidden="true"/></span></button></SheetTrigger>
  <SheetContent className="research-detail rd-warning-sheet" onCloseAutoFocus={event=>{if(pendingSource.current!==null){event.preventDefault();const index=pendingSource.current;pendingSource.current=null;onSource?.(index);}}}>
   <SheetHeader><SheetTitle>阅读提示</SheetTitle><SheetDescription>{overview}。提示仅供核对，关闭后继续阅读正文。</SheetDescription></SheetHeader>
   <div className="rd-warning-summary">
  <Tabs className="rd-warning-body" value={activeCategory} onValueChange={setCategory}>
   {groups.length>0&&other.length>0&&<TabsList variant="line" className="rd-warning-tabs" aria-label="阅读提示分类"><TabsTrigger value="reports">财报核对<span>{groups.length}</span></TabsTrigger><TabsTrigger value="notes">数据说明<span>{other.length}</span></TabsTrigger></TabsList>}
   <TabsContent value="reports"><section className="rd-parsing-warnings" aria-label="财报解析提示">
    <p className="rd-parsing-context">请对照报告原件核对下列内容。OCR 识别结果不能单独作为计算依据。</p>
    <ul className="rd-parsing-reports">{shown.map(group=>{
     const matches=onSource?reportWarningSourceMatches(group.title,sources):[];
     return <li key={group.title} className="rd-parsing-report">
      <FileText className="rd-parsing-file-icon" size={19} aria-hidden="true"/>
      <div className="rd-parsing-report-content"><div className="rd-parsing-report-name"><strong>{group.title}</strong></div>
       <div className="rd-parsing-report-issues">{group.items.map((item,index)=><p key={index} className={'rd-parsing-issue rd-parsing-issue-'+item.kind}>
        {item.kind==='ocr'?<><span className="rd-issue-label">识别方式</span><span className="rd-ocr-label">OCR 识别 · {item.value} 页</span></>:item.kind==='pages'?<><span className="rd-issue-label">待核对页码</span><span className="rd-page-numbers">{item.value}</span></>:item.text}
       </p>)}</div>
      </div>
      <div className="rd-warning-source-actions">{matches.length?matches.map(({source,index})=><button type="button" key={index} className="rd-warning-source-link" aria-label={`查看证据 ${source.id||index+1}：${group.title}`} onClick={()=>{pendingSource.current=index;setOpen(false);}}>查看原文{source.id&&<span>{source.id}</span>}<ArrowUpRight size={15} aria-hidden="true"/></button>):<span className="rd-warning-source-missing">暂无关联原文</span>}</div>
     </li>;
    })}</ul>
    {groups.length>4&&<div className="rd-warning-more"><span role="status" aria-live="polite">已显示 {shown.length} / {groups.length} 组报告</span><Button type="button" variant="ghost" disabled={!remaining} onClick={()=>setVisibleCount(count=>count+4)}>{remaining?`显示更多报告（${remaining}）`:'已显示全部'}{remaining>0&&<ChevronDown size={16}/>}</Button></div>}
   </section></TabsContent>
   <TabsContent value="notes"><section aria-label="数据说明"><p className="rd-parsing-context">阅读研究结论时，请一并考虑以下数据范围与使用限制。</p><ol className="rd-general-warnings">{other.map((warning,index)=><li key={index}><span className="rd-general-warning-index" aria-hidden="true">{String(index+1).padStart(2,'0')}</span><p>{warning}</p></li>)}</ol></section></TabsContent>
  </Tabs>
   </div>
  </SheetContent>
 </Sheet>;
}
