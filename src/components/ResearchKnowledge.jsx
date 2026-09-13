import {useState,useEffect,useRef,useId} from 'react';
import {Link} from 'react-router';
import {BookOpen,ChevronDown} from 'lucide-react';
import {Button} from './ui/button';
import {Input} from './ui/input';
import {Collapsible,CollapsibleTrigger,CollapsibleContent} from './ui/collapsible';
import {ToggleGroup,ToggleGroupItem} from './ui/toggle-group';
import {ruleUsage,knowledgeBenefits,depthGuidance} from '../../shared/research-knowledge.mjs';
import './research-knowledge.css';
import {api} from '../lib/api';

function RuleExcerpt({jobId,record}){
 const [state,setState]=useState({}),[open,setOpen]=useState(false),control=useRef(null),contentId=useId();
 useEffect(()=>()=>control.current?.abort(),[]);
 async function load(){
  control.current?.abort();const request=new AbortController();control.current=request;setState({loading:true});setOpen(true);
  const timer=setTimeout(()=>{if(!request.signal.aborted){request.abort();setState({error:'原文读取超时，请重试。'});}},10000);
  try{const result=await api('/api/jobs/'+encodeURIComponent(jobId)+'/rules?record='+encodeURIComponent(record.key),{signal:request.signal});if(typeof result?.content!=='string')throw new Error('服务返回的原文格式异常，请重试读取。');if(!request.signal.aborted)setState({content:result.content});}
  catch(error){if(!request.signal.aborted)setState({error:error.message});}
  finally{clearTimeout(timer);}
 }
 return <div className="knowledge-excerpt">
  <Button type="button" size="sm" variant="outline" aria-expanded={open} aria-controls={contentId} aria-disabled={state.loading||undefined} onClick={()=>{if(!state.loading){if(state.content!==undefined)setOpen(value=>!value);else void load();}}}>{state.loading?'正在读取':state.error?'重试读取原文':open?'收起原文':'查看当时读取的原文'}</Button>
  <div id={contentId} hidden={!open} aria-busy={state.loading||undefined}>
   {state.loading&&<p role="status">正在核对并读取本次规则原文…</p>}
   {state.error&&<p role="alert">{state.error}</p>}
   {state.content!==undefined&&<><p>来自本次研究依据存档{record.truncated?'，仅展示当时读取的部分':''}。</p><pre tabIndex={0} aria-label={record.heading+' · 当时读取的原文'}>{state.content}</pre></>}
  </div>
 </div>;
}

export function KnowledgeHighlights(){
 return <div className="knowledge-highlights">{knowledgeBenefits.map((item,index)=><article key={item.title}><span>0{index+1}</span><h3>{item.title}</h3><p>{item.description}</p></article>)}</div>;
}
export function DepthScope({plan}){
 if(!plan?.mode)return null;
 const guidance={A:'快筛保留五年趋势、财务红旗与估值快照，完成后再决定是否进入深度研究。',C:'围绕新增事实、旧判断和估值参数变化展开；没有旧结论时建立本期基线。',D:'统一期间与口径，优先交付对比表；公司质量、价格吸引力与研究优先级分别判断。',E:'按持仓构成核对整体现金回报与集中风险；具体配置还需充分的个人约束。',F:'核对八年分红与回购、三年滚动及现金来源；收益率锚需与主估值交叉验证。'};
 return <div className="knowledge-depth" aria-label="规则使用范围"><BookOpen size={17} aria-hidden="true"/><p>{plan.mode==='B'?depthGuidance[plan.depth]:guidance[plan.mode]}{plan.execution?' 本次包含执行复核，作战图仅在明确提出时加入。':''}</p></div>;
}
export function ResearchRuleUsage({job,currentConfig}){
 return <RuleUsagePanel key={job.id+':'+(ruleUsage(job).snapshot?.id??'legacy')} job={job} currentConfig={currentConfig}/>;
}
function RuleUsagePanel({job,currentConfig}){
 const view=ruleUsage(job),[filter,setFilter]=useState('all'),[query,setQuery]=useState(''),[limit,setLimit]=useState(20),searchInput=useRef(null);
 const changed=Boolean(view.snapshot&&currentConfig?.knowledgeSnapshot&&view.snapshot.id!==currentConfig.knowledgeSnapshot.id);
 const historical=/^V?4\./.test(view.snapshot?.version??view.version??'');
 const canReadExcerpt=/^K\d+\.\d+\.\d+$/.test(view.snapshot?.version??'');
 const versionLabel=view.version?(/^\d/.test(view.version)?'V'+view.version:view.version):'未记录';
 const words=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
 const rows=view.records.filter(row=>(filter==='all'||(filter==='audit'?row.reason==='正式输出前审计':row.reason?.startsWith('规则补读')))&&words.every(word=>[row.heading,row.reason,row.path].join(' ').toLocaleLowerCase().includes(word)));
 return <Collapsible className="knowledge-usage rd-process-disclosure" aria-label="本次研究依据">
  <CollapsibleTrigger asChild><Button type="button" variant="ghost" className="knowledge-usage-trigger rd-process-disclosure-trigger"><span className="rd-document-icon"><BookOpen size={18}/></span><span className="rd-document-heading"><strong>本次研究依据</strong><span>{view.recorded?`${view.moduleCount} 类依据 · ${view.sectionCount} 条引用记录`:'此记录未保存依据明细'}</span></span><span className="rd-document-label">查看记录</span><ChevronDown size={16} className="rd-document-chevron"/></Button></CollapsibleTrigger>
  <CollapsibleContent className="knowledge-usage-body rd-process-disclosure-content">
   <dl className="knowledge-version-meta" aria-label="本次规则版本"><div><dt>规则版本</dt><dd>{versionLabel}</dd></div><div><dt>依据记录</dt><dd>{historical?'历史版本存档':view.snapshot?'已固定本次依据':'未保存固定快照'}</dd></div></dl>
   <p>{!view.snapshot?'此记录未保存固定规则快照，不根据当前规则补写历史使用情况。':historical?'以下展示当时保存的版本与读取记录，不会用当前规则替换。':'本次研究固定创建时的规则，研究、补读与复核使用同一份依据。'}{changed&&!historical?' 当前已有更新，本报告仍保留原依据。':''}</p>
   {historical&&<p className="knowledge-history-note">这是当时保存的历史依据。当前服务不再提供 V4.x 规则原文读取；已有报告与读取记录仍保留。</p>}
   {view.recorded&&<><ToggleGroup type="single" value={filter} onValueChange={value=>{if(value){setFilter(value);setLimit(20);}}} size="sm" className="knowledge-filters" aria-label="依据记录筛选">{[['all','全部'],['lookup','研究补充'],['audit','交付复核']].map(([id,label])=><ToggleGroupItem value={id} key={id}>{label}</ToggleGroupItem>)}</ToggleGroup>
   {view.records.length>0&&<div className="knowledge-search"><Input ref={searchInput} aria-label="搜索研究依据" placeholder="搜索依据名称或使用原因" value={query} onChange={event=>{setQuery(event.target.value);setLimit(20);}}/>{query&&<Button type="button" size="sm" variant="ghost" onClick={()=>{setQuery('');setLimit(20);searchInput.current?.focus();}}>清除搜索</Button>}</div>}
   <p role="status" className="knowledge-result-count">{rows.length?`显示 ${Math.min(limit,rows.length)} / ${rows.length} 条记录`:'没有匹配的记录'}</p>
   {rows.length?<ul className="knowledge-read-list">{rows.slice(0,limit).map((row,index)=><li key={row.key??index}><strong>{row.heading}</strong><p>{row.reason} · 第 {row.line}–{row.endLine} 行{row.truncated?' · 部分内容':''}</p><details><summary>技术校验信息</summary><code>{row.path}</code><code>文件：{row.sha256}</code><code>本次内容：{row.contentSha256}</code></details>{canReadExcerpt&&row.key&&<RuleExcerpt jobId={job.id} record={row}/>}</li>)}</ul>:<p className="knowledge-empty">{query?'尝试更短的关键词，或清除搜索条件。':view.records.length?'尚无此类读取记录。':'尚未保存依据正文的使用记录；目录中的内容不代表已经读取。'}</p>}
   {rows.length>20&&<Button type="button" size="sm" variant="outline" className="knowledge-more" aria-disabled={limit>=rows.length} onClick={()=>{if(limit<rows.length)setLimit(value=>value+20);}}>{limit<rows.length?`显示更多记录（剩余 ${rows.length-limit} 条）`:'全部记录已展开'}</Button>}</>}
   {view.snapshot&&<details className="knowledge-snapshot"><summary>查看依据存档编号</summary><code>{view.snapshot.id}</code></details>}
   <Link to="/handbook?tab=method#method-loading">了解研究依据如何保留</Link>
  </CollapsibleContent>
 </Collapsible>;
}
