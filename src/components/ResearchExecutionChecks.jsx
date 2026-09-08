import {useState} from 'react';
import {Collapsible,CollapsibleTrigger,CollapsibleContent} from './ui/collapsible';
import {researchExecutionChecks} from '../../shared/research-execution-checks.mjs';
import {Button} from './ui/button';
import {Download,ArrowUpRight,ChevronDown,ClipboardList} from 'lucide-react';
import './execution-checks.css';
import FinancialCoverage from './FinancialCoverage';
const stateLabels={'not-recorded':'未记录','has-gaps':'待回查',pending:'返回未齐',returned:'已返回'};
export default function ResearchExecutionChecks({job,onTrace,onDownload}){
 const [open,setOpen]=useState(true);
 const checks=researchExecutionChecks(job),used=checks.filter(c=>c.attempts).length;
 const priority={'has-gaps':0,pending:1,returned:2};
 const recorded=checks.filter(check=>check.attempts).sort((a,b)=>priority[a.state]-priority[b.state]);
 const unrecorded=checks.filter(check=>!check.attempts);
 function renderCheck(check){
  return <li key={check.id} className="execution-check-item" data-state={check.state}>
   <div className="execution-check-title">
    <strong>{check.title}</strong>{check.attempts>0&&<span className="execution-check-state" title={check.label}>{stateLabels[check.state]}</span>}
   </div>
   <div className="execution-check-content">
    <p>{check.notice}</p>
    {check.attempts>0?<>
     <p className="execution-check-result">{check.label} · {check.attempts} 次记录{check.gaps>0?`，${check.gaps} 次存在限制`:''}{check.unreturned>0?`，${check.unreturned} 次返回未齐`:''}</p>
     {check.gaps>0&&<p>历史失败会保留，是否已解决需回查后续证据。</p>}
    </>:<p className="execution-check-result">未记录调用，不据此判断已完成或执行失败。</p>}
   </div>
  </li>;
 }
 return <section className="research-execution-checks" data-state={open?'open':'closed'} aria-label="本次查证记录">
  <Collapsible open={open} onOpenChange={setOpen} className="execution-checks-disclosure">
   <CollapsibleTrigger asChild><Button variant="ghost" className="execution-checks-heading rd-rail-trigger"><ClipboardList size={18} aria-hidden="true"/><strong>本次查证记录</strong><span>{used} / {checks.length} 项有调用</span><ChevronDown size={16} aria-hidden="true"/></Button></CollapsibleTrigger>
   <CollapsibleContent className="execution-checks-content">
   <div className="execution-checks-body" role="region" aria-label="查证清单" tabIndex={0}>
    {used>0?<>
     <p className="execution-checks-intro">优先查看待回查项，已返回内容仍需核对。</p>
     <ul className="execution-checks-list execution-recorded-list">{recorded.map(renderCheck)}</ul>
    </>:<div className="execution-checks-empty">
     <span className="execution-empty-icon"><ClipboardList size={22} aria-hidden="true"/></span>
     <strong>暂无专项调用记录</strong>
     <p>这些查证项可能尚未执行或不适用，不代表研究失败。</p>
    </div>}
    {unrecorded.length>0&&<section className="execution-unrecorded" aria-label="未记录的查证项">
     <div className="execution-subheading"><h4>未记录的查证项</h4><span>{unrecorded.length} 项</span></div>
     <ul className="execution-unrecorded-list">{unrecorded.map(check=><li key={check.id} title={check.notice} aria-label={check.title+'：'+check.notice}>{check.title}</li>)}</ul>
    </section>}
    <FinancialCoverage job={job}/>
   </div>

  <div className="execution-checks-actions">
   <Button variant="outline" className="execution-checks-trace" aria-label="查看实际输入与返回" disabled={!onTrace} onClick={()=>onTrace?.('tools')}>查看调用<ArrowUpRight size={14}/></Button>
   <Button variant="outline" className="execution-record-download" aria-label="导出已保存记录" disabled={!onDownload} onClick={()=>onDownload?.({executionOnly:true})}><Download size={14}/>导出记录</Button>
  </div>
  <p className="execution-record-note">仅导出已保存记录，进行中或中断后也可使用。</p>
   </CollapsibleContent>
  </Collapsible>
 </section>;
}
