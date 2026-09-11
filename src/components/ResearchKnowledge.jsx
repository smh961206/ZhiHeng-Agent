import {useState,useEffect,useRef,useId} from 'react';
import {Link} from 'react-router';
import {BookOpen,ChevronDown,RefreshCw,ShieldCheck} from 'lucide-react';
import {Button} from './ui/button';
import {Input} from './ui/input';
import {Collapsible,CollapsibleTrigger,CollapsibleContent} from './ui/collapsible';
import {knowledgeAvailability,ruleUsage,knowledgeBenefits,depthGuidance} from '../../shared/research-knowledge.mjs';
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
   {state.content!==undefined&&<><p>来自本次固定快照{record.truncated?'，仅展示当时读取的部分':''}。</p><pre tabIndex={0} aria-label={record.heading+' · 当时读取的原文'}>{state.content}</pre></>}
  </div>
 </div>;
}

export function KnowledgeStatus({config,checking,onRefresh}){
 const state=knowledgeAvailability(config);
 // Normal readiness lives in the global status control; keep actionable
 // exceptions visible without repeating a version banner on every page.
 if(state.kind==='ready'||state.kind==='loading')return null;
 return <section className={'knowledge-status is-'+state.kind} aria-label="研究规则状态">
  <ShieldCheck size={19} aria-hidden="true"/><div role="status"><strong>{state.title}</strong><p>{state.description}</p></div>
  {onRefresh&&<Button type="button" variant="ghost" size="sm" disabled={checking} onClick={onRefresh}><RefreshCw size={14} className={checking?'animate-spin':''}/>{checking?'正在检查':'重新检查'}</Button>}
 </section>;
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
 const words=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
 const rows=view.records.filter(row=>(filter==='all'||(filter==='audit'?row.reason==='正式输出前审计':row.reason?.startsWith('规则补读')))&&words.every(word=>[row.heading,row.reason,row.path].join(' ').toLocaleLowerCase().includes(word)));
 return <Collapsible className="knowledge-usage" aria-label="本次规则依据">
  <CollapsibleTrigger asChild><Button type="button" variant="ghost" className="knowledge-usage-trigger"><BookOpen size={18}/><span><strong>本次规则依据{view.version?' · 规则 V'+view.version:''}</strong><small>{view.recorded?`${view.moduleCount} 项规则 · ${view.sectionCount} 条使用记录`:'此记录未保存实际读取明细'}</small></span><ChevronDown size={16}/></Button></CollapsibleTrigger>
  <CollapsibleContent className="knowledge-usage-body">
   <p>{view.snapshot?'本次研究固定创建时的规则，研究、补读与复核使用同一份依据。':'此记录未保存固定规则快照，不根据当前规则补写历史使用情况。'}{changed?' 当前已有更新，本报告仍保留原依据。':''}</p>
   {view.recorded&&<><div className="knowledge-filters" role="group" aria-label="规则记录筛选">{[['all','全部'],['lookup','按需补读'],['audit','审计']].map(([id,label])=><Button type="button" size="sm" variant={filter===id?'secondary':'ghost'} aria-pressed={filter===id} key={id} onClick={()=>{setFilter(id);setLimit(20);}}>{label}</Button>)}</div>
   {view.records.length>0&&<div className="knowledge-search"><Input ref={searchInput} aria-label="搜索规则记录" placeholder="搜索标题、读取原因或文件名" value={query} onChange={event=>{setQuery(event.target.value);setLimit(20);}}/>{query&&<Button type="button" size="sm" variant="ghost" onClick={()=>{setQuery('');setLimit(20);searchInput.current?.focus();}}>清除搜索</Button>}</div>}
   <p role="status" className="knowledge-result-count">{rows.length?`显示 ${Math.min(limit,rows.length)} / ${rows.length} 条记录`:'没有匹配的记录'}</p>
   {rows.length?<ul className="knowledge-read-list">{rows.slice(0,limit).map((row,index)=><li key={row.key??index}><strong>{row.heading}</strong><p>{row.reason} · 第 {row.line}–{row.endLine} 行{row.truncated?' · 部分内容':''}</p><details><summary>核对文件与校验值</summary><code>{row.path}</code><code>文件：{row.sha256}</code><code>本次内容：{row.contentSha256}</code></details>{view.snapshot&&row.key&&<RuleExcerpt jobId={job.id} record={row}/>}</li>)}</ul>:<p className="knowledge-empty">{query?'尝试更短的关键词，或清除搜索条件。':view.records.length?'尚无此类读取记录。':'尚未记录规则正文的使用；目录中的文件不代表已经读取。'}</p>}
   {rows.length>20&&<Button type="button" size="sm" variant="outline" className="knowledge-more" aria-disabled={limit>=rows.length} onClick={()=>{if(limit<rows.length)setLimit(value=>value+20);}}>{limit<rows.length?`显示更多记录（剩余 ${rows.length-limit} 条）`:'全部记录已展开'}</Button>}</>}
   {view.snapshot&&<details className="knowledge-snapshot"><summary>查看本次规则快照编号</summary><code>{view.snapshot.id}</code></details>}
   <Link to="/handbook?tab=method#method-loading">了解规则如何使用与更新</Link>
  </CollapsibleContent>
 </Collapsible>;
}
