import {reportSecurityHeadings,reportSecurities} from '../../shared/report-security-headings.mjs';
import {researchSecurityDisplay} from '../../shared/security-display.mjs';
import {useSecurityExchanges} from '../hooks/use-security-exchanges';
import {ResearchRuleUsage} from './ResearchKnowledge';
import {researchTimeline} from '../../shared/research-record.mjs';
import {toolResultHasGap} from '../../shared/research-execution-checks.mjs';
import ResearchExecutionChecks from './ResearchExecutionChecks';
import ResearchAnalysisReceipts from './ResearchAnalysisReceipts';
import {Link} from 'react-router';
import './research-method.css';
import ComparisonResults from './ComparisonResults';
import {comparisonProgress} from '../../shared/company-comparison.mjs';
import {earningsUpdateProgress} from '../../shared/earnings-update.mjs';
import {deepResearchProgress} from '../../shared/deep-research.mjs';
import ReportWarnings from './ReportWarnings';
import {useCallback, useEffect, useId, useMemo, useRef, useState} from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Activity, ArrowLeft, ArrowUp, ArrowUpRight, BookOpen, Check, ChevronDown, CircleAlert,
  Clock3, Download, FileText, Globe, List, LoaderCircle, RotateCcw,
  Search, ShieldCheck, SlidersHorizontal, Square, X,
} from 'lucide-react';
import {Button} from './ui/button';
import {Badge} from './ui/badge';
import {Alert,AlertTitle,AlertDescription} from './ui/alert';
import {Card,CardContent,CardHeader,CardTitle} from './ui/card';
import {Input} from './ui/input';
import {Collapsible,CollapsibleTrigger,CollapsibleContent} from './ui/collapsible';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from './ui/select';
import {Sheet,SheetTrigger,SheetContent,SheetHeader,SheetTitle,SheetDescription} from './ui/sheet';
import {Popover,PopoverTrigger,PopoverContent} from './ui/popover';
import {Tabs, TabsContent, TabsList, TabsTrigger} from './ui/tabs';
import DocumentReadingSummary from './DocumentReadingSummary';
import ResearchProgress from './ResearchProgress';
import {researchProgress} from '../../shared/research-progress.mjs';
import ResearchDecision from './ResearchDecision';
import ExecutionReview from './ExecutionReview';
import {modes,frameworkVersion} from '../../shared/research-framework.mjs';
import {remarkReportCitations} from '../lib/report-citations.mjs';
import {reportPreview} from '../../shared/report-preview.mjs';
import {deduplicateReportHeadings} from '../../shared/report-headings.mjs';
import {auditCoverage,auditCoverageNotice} from '../../shared/audit-coverage.mjs';
import {needsSaveRetry,isSavingResult} from '../../shared/research-delivery.mjs';
import {researchRecovery,researchDraftState,researchRetryNotice,saveRetryNotice,retryNotice,researchContinuation} from '../../shared/research-recovery.mjs';
import {modeOf} from '../lib/research-mode';
import {webEvidenceProgress} from '../../shared/web-evidence-progress.mjs';
import './research-recovery.css';
import './research-report-first.css';
import './report-warnings.css';
import './research-trace.css';

const depthLabels = {Quick: '简明研究', Standard: '标准研究', Deep: '深入研究'};
const tabLabels = {report: '研究报告', audit: '审计记录', sources: '证据来源'};
const isActive = status => status === 'queued' || status === 'running';

function formatDate(value, timeOnly = false) {
  if (!value || Number.isNaN(new Date(value).getTime())) return '时间未记录';
  return new Date(value).toLocaleString('zh-CN', timeOnly
    ? {hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false}
    : {year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false});
}

function RetryButton({onRetry,retrying,saveOnly=false,notice=researchRetryNotice}) {
  return <Button type="button" variant="outline" onClick={()=>{if(!retrying)onRetry?.();}} disabled={retrying} aria-busy={Boolean(retrying)} title={saveOnly?saveRetryNotice:notice}>
    {retrying?<LoaderCircle size={16} className="rd-spin"/>:<RotateCcw size={16}/>}{saveOnly?(retrying?'正在保存…':'重试保存'):(retrying?'正在重试…':'重试研究')}
  </Button>;
}

function EmptyState({icon: Icon = FileText, title, children, active = false, actions, failed = false, descriptionClassName}) {
  return <div className={`rd-empty${failed ? " rd-empty-failed" : ""}`}>
    <span className="rd-empty-icon"><Icon size={27} aria-hidden="true" className={active ? 'rd-spin' : undefined}/></span>
    <h3>{title}</h3>
    <p className={descriptionClassName}>{children}</p>
    {actions}
  </div>;
}

// The Markdown parser supplies offsets, including for Setext headings. Appending
// stream chunks cannot rename earlier anchors, even when titles repeat or grow.
function remarkHeadingIds({prefix}) {
  return tree => {
    let fallback = 0;
    function visit(node) {
      if (node.type === 'heading') {
        node.data ??= {};
        node.data.hProperties = {
          ...node.data.hProperties,
          id: `${prefix}-section-${node.position?.start?.offset ?? `n${fallback++}`}`,
          tabIndex: -1,
        };
      }
      node.children?.forEach(visit);
    }
    visit(tree);
  };
}

const markdownComponents = {
  a: ({node, href, children, ...props}) => <a {...props} href={href}
    {...(/^https?:\/\//i.test(href || '') ? {target: '_blank', rel: 'noopener noreferrer'} : {})}>{children}</a>,
  table: ({node, ...props}) => <div className="rd-table-scroll" tabIndex={0} role="region" aria-label="报告表格，可横向滚动"><table {...props}/></div>,
  pre: ({node, ...props}) => <pre {...props} tabIndex={0}/>,
};

function ReportDocument({text, prefix, draft = false, draftLabel, onOutline, sources=[], onCitation}) {
  const article = useRef(null);
  const citationHandler=useRef(onCitation);citationHandler.current=onCitation;
  const citationsEnabled=Boolean(onCitation);
  const sourceKey=JSON.stringify((Array.isArray(sources)?sources:[]).filter(source=>source.id).map(source=>[source.id,source.title||'未命名来源']));
  const markdown = useMemo(() => {
    const titles=new Map(JSON.parse(sourceKey));
    return <Markdown
    remarkPlugins={[remarkGfm, [remarkHeadingIds, {prefix}], [remarkReportCitations,{prefix,sourceIds:citationsEnabled?[...titles.keys()]:[]}]]}
    components={{...markdownComponents,a:props=>{
      const id=props['data-evidence-id'];
      if(id&&citationsEnabled)return <Button type="button" variant="link" className="rd-citation" id={props.id} aria-label={'查看证据 '+id} title={id+' · '+titles.get(id)} onClick={event=>citationHandler.current?.(id,event.currentTarget)}>{props.children}</Button>;
      return markdownComponents.a(props);
    }}}>{deduplicateReportHeadings(text)}</Markdown>;
  }, [text, prefix, sourceKey, citationsEnabled]);

  // Read only the headings actually rendered by Markdown, so fenced code, inline
  // formatting and streaming incomplete headings cannot create phantom entries.
  useEffect(() => {
    const next = Array.from(article.current?.querySelectorAll('h1, h2, h3, h4, h5, h6') || [])
      .map(heading => ({id: heading.id, label: heading.textContent.trim(), level: Number(heading.tagName[1])}))
      .filter(heading => heading.label);
    onOutline?.({prefix,items:next});
  }, [text, prefix, onOutline]);
  return <article ref={article} className={`rd-markdown${draft ? ' rd-draft' : ''}`} aria-label={draft ? `实时报告草稿，${draftLabel||'尚未完成审计'}` : '报告正文'}>{markdown}</article>;
}

function RecoveryGuide({recovery,onSources,onTrace,onReuse,retrying,errorInOverview=false}) {
  return <section className="rd-recovery-guide" aria-label="恢复说明">
    <div className="rd-recovery-body">
      <p>{recovery.notice}</p>
      {recovery.error&&!errorInOverview&&<p className="rd-recovery-error"><strong>本次原因：</strong>{recovery.error}</p>}
      {recovery.kind==='save'&&<p>若提示版本已变化或暂存内容不存在，请刷新详情确认状态，再选择下一步。</p>}
      <div className="rd-recovery-links">
        <Button variant="ghost" size="sm" onClick={onTrace} aria-label="查看执行轨迹"><Activity size={15}/>执行轨迹</Button>
        <Button variant="ghost" size="sm" onClick={onSources} aria-label="查看证据来源"><Globe size={15}/>证据来源</Button>
      </div>
      {recovery.kind==='save-unavailable'&&onReuse&&<Button variant="outline" onClick={onReuse} disabled={retrying}>复用研究输入</Button>}
    </div>
  </section>;
}

function ReportPanel({job, exchanges, prefix, preview, onRetry, retrying, retryError, onReuse, onOutline, onUpdate, onDeepen,onSources,onTrace,onExecutionAudit,onCitation}) {
  const quick=modeOf(job)==='A';
  const recovery=researchRecovery(job),draftState=researchDraftState(job);
  const failed=job.status==='failed'||job.delivery?.status==='failed';
  const guide=recovery&&<RecoveryGuide {...{recovery,onSources,onTrace,onReuse,retrying}} errorInOverview={failed}/>;
  if(recovery&&['save','saving','save-unavailable'].includes(recovery.kind))return <EmptyState failed={failed} title={recovery.title} icon={isSavingResult(job)?LoaderCircle:CircleAlert} active={isSavingResult(job)} actions={<>{needsSaveRetry(job)&&onRetry&&<RetryButton onRetry={onRetry} retrying={retrying} saveOnly/>}{guide}</>}>{recovery.text}</EmptyState>;
  const recordedVersion=job.result?.framework?.version||job.plan?.version;
  if (job.result?.report?.trim()) return <><div className="rd-provenance" aria-label="报告版本" title="按本次任务保存的研究规则记录，与平台功能版本分别管理。"><span>{recordedVersion?'本报告规则 V'+recordedVersion:'本报告规则版本未记录'}{recordedVersion&&recordedVersion!==frameworkVersion?' · 历史报告保留原始判断':''}</span><Link to="/handbook?tab=method">当前方法说明</Link></div><div className="rd-report-intro"><ResearchDecision job={job} onUpdate={onUpdate} onDeepen={onDeepen} onExecutionAudit={onExecutionAudit}/></div><ReportDocument text={reportSecurityHeadings(job.result.report,job,exchanges)} prefix={prefix} onOutline={onOutline} sources={job.input?.sources} onCitation={onCitation}/>{modeOf(job)==='D'&&<ComparisonResults job={job} onSources={onSources} exchanges={exchanges}/>} {guide}</>;
  const active = isActive(job.status);
  if (!job.result && active && preview.trim()) return <>
    <div className="rd-notice rd-draft-notice" role="status"><LoaderCircle size={17} className="rd-spin" aria-hidden="true"/>
      <div><strong>{draftState.title}</strong>
        <p>{draftState.text}</p></div>
    </div>
    <ReportDocument text={preview} prefix={prefix} onOutline={onOutline} sources={job.input?.sources} onCitation={onCitation} draft draftLabel={draftState.title}/>
  </>;
  const formatting=active&&job.liveReport?.phase!=='audit'&&(job.liveReport?.phase==='formatting'||job.liveReport?.text?.trim()&&!preview.trim());
  const screenState=active&&['supplement','audit'].includes(draftState?.kind)?draftState:formatting?{title:'正在整理研究报告',text:'草稿内容已返回，正在整理为可读正文；完整内容仍须经过复核。'}:quick?quickScreenProgress(job,false):modeOf(job)==='B'?deepResearchProgress(job,false):modeOf(job)==='C'?earningsUpdateProgress(job,false):modeOf(job)==='D'?comparisonProgress(job,false):null;
  const state = screenState?[screenState.title,screenState.text,active?LoaderCircle:job.status==='failed'?CircleAlert:job.status==='cancelled'?Square:FileText]:job.status === 'queued'
    ? ['任务已排队', '等待研究引擎开始执行，阶段进展和执行轨迹将在这里更新。', Clock3]
    : job.status === 'running'
      ? job.liveReport?.phase==='audit'
        ? ['正在复核研究内容', '正在检查研究依据、数据口径与结论。复核完成后会显示正式报告。', LoaderCircle]
        : job.liveReport?.phase==='formatting'||job.liveReport?.text?.trim()
          ? ['正在整理研究报告', '正在将研究内容整理为可阅读的报告，可在执行轨迹中查看进度。', LoaderCircle]
          : ['正在建立证据链', '正在采集资料、分析与查证。草稿生成后会实时显示在这里。', LoaderCircle]
      : job.status === 'failed'
        ? ['本次研究未完成', '可沿用本次输入重新运行当前研究，执行进度、资料和报告将在本页更新。', CircleAlert]
        : job.status === 'cancelled'
          ? ['研究已取消', '可沿用本次输入重新运行当前研究，执行进度、资料和报告将在本页更新。', Square]
          : ['暂无可用报告', '这条研究记录未包含正式报告正文，可查看审计、来源与执行轨迹，或载入输入重新研究。', FileText];
  const actions=onRetry?<div className="rd-retry-actions"><RetryButton onRetry={onRetry} retrying={retrying} notice={retryNotice(job)}/>{onReuse&&!retryError&&<Button type="button" variant="ghost" onClick={onReuse} disabled={retrying} title="回到工作台调整输入，确认提交后创建新的研究">修改研究输入</Button>}</div>
    :onReuse?<Button type="button" variant="outline" onClick={onReuse}><RotateCcw size={15}/>复用研究输入</Button>:null;
  return <EmptyState failed={failed||recovery?.kind==='cancelled'} title={recovery?.continuation?.title||recovery?.restart?.title||state[0]} icon={recovery?.continuation?RotateCcw:state[2]} active={job.status === 'running'} descriptionClassName={recovery?.continuation?'rd-resume-retained':undefined} actions={!active?<>{actions}{guide}</>:null}>{recovery?.continuation?.retained||recovery?.text||state[1]}</EmptyState>;
}

function auditResearchNotes(job) {
  const checks=job.status==='completed'?job.result?.researchSummary?.checks??[]:[];
  const {unresolved,gaps}=webEvidenceProgress(job);
  // General research follow-ups stay with the report's decision summary. Only
  // evidence gaps not already explained in the audit or a judgment appear here.
  const normalize=text=>String(text??'').replace(/\s+/g,'').trim();
  const explained=[job.result?.audit,...checks.map(check=>check.unresolved)].map(normalize).filter(Boolean);
  const seen=new Set();
  const missing=[
    ...unresolved.map(item=>({id:item.id,text:[item.description,item.reason].filter(Boolean).join(' · ')})),
    ...gaps.map(item=>({id:item.id,text:[item.description,...(item.failures??[]),...(item.limitations??[])].filter(Boolean).join(' · ')})),
  ].filter(item=>{
    const text=normalize(item.text||item.id);
    if(!text||seen.has(text)||explained.some(existing=>existing.includes(text)))return false;
    seen.add(text);return true;
  }).map(item=>[item.id,item.text].filter(Boolean).join(' · '));
  return {checks,missing};
}

function AuditResearchNotes({checks,missing,prefix,onSources}) {
  if(!checks.length&&!missing.length)return null;
  return <section className="rd-audit-research-notes" aria-label="判断依据与资料限制">
    {checks.length>0&&<section className="rd-audit-basis" aria-labelledby={prefix+'-basis'}>
      <header className="rd-audit-notes-heading">
        <h3 id={prefix+'-basis'}>判断依据</h3><span>{checks.length} 项研究问题</span>
      </header>
      <dl>{checks.map((check,index)=><div className="rd-audit-question" key={index}>
          <dt>
            <span className="rd-audit-question-number" aria-hidden="true">{String(index+1).padStart(2,'0')}</span>
            <span className="rd-audit-question-title">{check.topic}</span>
          </dt>
          <dd>
            <p className="rd-audit-assessment">{check.assessment}</p>
            {check.unresolved&&<p className="rd-audit-unresolved"><strong>证据限制</strong>{check.unresolved}</p>}
            {check.sourceIds?.length>0&&<Button type="button" variant="link" size="sm" className="rd-audit-evidence-link" onClick={onSources}><BookOpen size={14} aria-hidden="true"/>查看依据 <span>{check.sourceIds.join('、')}</span><ArrowUpRight size={13}/></Button>}
          </dd>
        </div>
      )}</dl>
    </section>}
    {missing.length>0&&<section className="rd-audit-missing" aria-labelledby={prefix+'-missing'}>
      <h4 id={prefix+'-missing'}>补充资料限制</h4>
      <ul>{missing.map(item=><li key={item}>{item}</li>)}</ul>
    </section>}
  </section>;
}

function AuditReview({job,prefix,onOutline,onCitation}) {
  return <section className="rd-audit-review" aria-labelledby={prefix+'-review'}>
    <header className="rd-audit-review-heading"><h2 id={prefix+'-review'}>复核说明</h2><p>复核过程、修正记录与结论适用范围</p></header>
    <div className="rd-audit-review-body"><ReportDocument text={job.result.executionAudit?.length&&typeof job.result.auditNarrative==='string'?job.result.auditNarrative:job.result.audit} prefix={prefix} onOutline={onOutline} sources={job.input?.sources} onCitation={onCitation}/></div>
  </section>;
}

function AuditPanel({job, prefix, onOutline,onSources,onSource,onCitation,onTrace}) {
  const {checks:researchChecks,missing}=auditResearchNotes(job);
  const hasAudit=Boolean(job.result?.audit?.trim());
  const recovery=researchRecovery(job),draftState=researchDraftState(job);
  if(recovery&&['save','saving','save-unavailable'].includes(recovery.kind))return <EmptyState icon={ShieldCheck} title="等待结果保存">{job.delivery.targetStatus==='completed'?'复核记录将在结果保存成功后提供；当前保存状态见研究进展。':'当前正在处理执行记录的保存，不代表已有正式审计；请回到研究报告查看恢复指引。'}</EmptyState>;
  const validation = job.result?.validation;
  const checks = Array.isArray(validation?.checks) ? validation.checks : [];
  const coverage=auditCoverage(validation);
  return <div className="rd-audit-content">
    <ResearchAnalysisReceipts job={job} onTrace={onTrace}/>
    {validation && <section className="rd-validation" aria-label="程序校验记录">
      <header className="rd-validation-heading"><h3><ShieldCheck size={17} aria-hidden="true"/>程序校验记录</h3>{validation.checkedAt&&<small>校验于 {formatDate(validation.checkedAt)}</small>}</header>
      <ul>{checks.map((check, index) => <li key={`${check.id || 'check'}-${index}`} data-passed={check.passed}>
        {check.passed === true ? <Check size={15} aria-label="通过"/> : <CircleAlert size={15} aria-label={check.passed === false ? '未通过' : '未标记结果'}/>}
        <span>{check.label}{check.passed === false && ' · 未通过'}{check.passed == null && ' · 未标记结果'}</span>
      </li>)}</ul>
      {validation.scope && <p>{validation.scope}</p>}
      {coverage.length>0&&<div className="rd-audit-window" aria-label="复核资料范围">
        {coverage.map((item,index)=><div className="rd-audit-round" key={index}>
          <p><strong>{item.title}</strong>{item.summary.slice(item.title.length)}</p>
          {item.limitations.map((text,index)=><p key={index}>{text}</p>)}
        </div>)}
        <p>{auditCoverageNotice}</p>
      </div>}
    </section>}
    {hasAudit ? <AuditReview job={job} prefix={prefix} onOutline={onOutline} onCitation={onCitation}/> : <EmptyState icon={ShieldCheck}
      title={job.status === 'cancelled' ? '审计未完成，任务已取消' : job.status === 'failed' ? '研究未完成，暂无正式审计' : isActive(job.status) ? draftState?.auditTitle : '暂无审计记录'}>
      {isActive(job.status) ? (draftState?.kind==='supplement'||draftState?.kind==='audit'?draftState.text:'正式审计结果将在研究完成后显示；实时草稿不代表审计结论。') : '本次记录没有正式审计正文，可查看执行轨迹了解研究过程。'}
    </EmptyState>}
    {job.result?.executionAudit?.length>0&&<ExecutionReview items={job.result.executionAudit} onSource={onSource}/>}
    <AuditResearchNotes checks={researchChecks} missing={missing} prefix={prefix} onSources={onSources}/>
  </div>;
}

function sourceHref(value) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined;
  } catch { return undefined; }
}

function SourceLink({url, children}) {
  const href = sourceHref(url);
  return href ? <a href={href} target="_blank" rel="noopener noreferrer">{children}<ArrowUpRight size={14} aria-hidden="true"/></a>
    : url ? <span className="rd-muted">{children}链接不可用</span> : null;
}

function SourcesPanel({sources, status, referenceMaterials=[],job,sourceTarget,active}) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(() => new Set());
  const input = useRef(null);
  const sourceNodes=useRef(new Map()),pendingSource=useRef(null),handledSource=useRef(null);
  useEffect(()=>{
    if(!active||!sourceTarget||handledSource.current===sourceTarget||!sources[sourceTarget.index])return;
    handledSource.current=sourceTarget;
    const key=`${sources[sourceTarget.index].id||'source'}-${sourceTarget.index}`;
    pendingSource.current=key;
    setQuery('');setExpanded(current=>new Set([...current,key]));
  },[sourceTarget,active,sources]);
  useEffect(()=>{
    const key=pendingSource.current;
    if(!active||!key||query||!expanded.has(key))return;
    const frame=requestAnimationFrame(()=>{
      const node=sourceNodes.current.get(key);
      if(!node)return;
      node.scrollIntoView({block:'start',behavior:'instant'});
      node.querySelector('.rd-source-trigger')?.focus({preventScroll:true});
      pendingSource.current=null;
    });
    return()=>cancelAnimationFrame(frame);
  },[active,query,expanded]);
  const inputId = useId();
  const web=webEvidenceProgress(job);
  const normalized = query.trim().toLocaleLowerCase();
  const filtered = sources.map((source, index) => ({source, key: `${source.id || 'source'}-${index}`}))
    .filter(({source}) => [source.id, source.title, source.provider, source.url, source.filingUrl, source.date]
      .join(' ').toLocaleLowerCase().includes(normalized));
  const allExpanded = filtered.length > 0 && filtered.every(({key}) => expanded.has(key));
  function clearSearch() { setQuery(''); input.current?.focus(); }
  function setSourceOpen(key, open) {
    setExpanded(current => {
      if (current.has(key) === open) return current;
      const next = new Set(current);
      if (open) next.add(key); else next.delete(key);
      return next;
    });
  }
  return <div className="rd-sources">
    {(web.searches>0||web.sources>0)&&<p className="rd-web-source-note">网页资料：已搜索 {web.searches} 次，{web.sources>0?`新增 ${web.sources} 份已读取的网页资料，列入下方来源。`:'尚未取得可用正文。'}未解决的资料缺口见审计记录。</p>}
    {referenceMaterials.length>0&&<section aria-label="已保存的用户补充资料">
      <h3>用户补充资料 · {referenceMaterials.length} 份</h3>
      <p className="rd-muted">作为待核实研究线索保存，财务事实仍需对应原始证据。</p>
      {referenceMaterials.map((item,index)=><Collapsible key={index} className="rd-source"><CollapsibleTrigger asChild><Button variant="ghost" className="rd-source-trigger"><FileText size={16}/><span className="rd-source-heading"><strong>[{item.id}] {item.title}</strong><small>用户提供 · 待核实</small></span><ChevronDown size={16}/></Button></CollapsibleTrigger><CollapsibleContent className="rd-source-body"><pre tabIndex={0}>{item.text}</pre>{item.url&&<SourceLink url={item.url}>用户附带链接</SourceLink>}</CollapsibleContent></Collapsible>)}
    </section>}
    <label className="rd-field-label" htmlFor={inputId}>检索证据</label>
    <div className="rd-source-search"><Search size={17} aria-hidden="true"/>
      <Input ref={input} id={inputId} type="search" value={query} aria-label="搜索证据来源" aria-describedby={`${inputId}-count`}
        placeholder="搜索标题、提供方、编号或 URL" onChange={event => setQuery(event.target.value)}
        onKeyDown={event => { if (event.key === 'Escape' && query) { event.preventDefault(); clearSearch(); } }}/>
      {query && <Button variant="ghost" size="icon" onClick={clearSearch} aria-label="清除来源搜索"><X size={16}/></Button>}
    </div>
    <div className="rd-source-results">
      <p id={`${inputId}-count`} role="status">{normalized ? `找到 ${filtered.length} / ${sources.length} 份来源` : `共 ${sources.length} 份来源`}</p>
      {filtered.length > 0 && <Button variant="ghost" size="sm" className="rd-text-button" onClick={() => setExpanded(current => {
        const next = new Set(current);
        filtered.forEach(({key}) => { if (allExpanded) next.delete(key); else next.add(key); });
        return next;
      })}>{allExpanded ? '收起' : '展开'}{normalized ? '搜索结果' : '全部来源'}<ChevronDown size={14} className={allExpanded ? 'rd-rotate' : undefined}/></Button>}
    </div>
    <div className="rd-source-list">{filtered.map(({source, key}) => <Collapsible key={key} ref={node=>{if(node)sourceNodes.current.set(key,node);else sourceNodes.current.delete(key);}} className="rd-source" open={expanded.has(key)} onOpenChange={open=>setSourceOpen(key,open)}>
      <CollapsibleTrigger asChild><Button variant="ghost" className="rd-source-trigger"><span className="rd-source-icon"><FileText size={18} aria-hidden="true"/></span>
        <span className="rd-source-heading"><strong><span className="rd-source-id">[{source.id || '未编号'}]</span> {source.title || '未命名来源'}</strong>
          <small>{source.provider || '历史资料'} · {source.dateBasis==='latest-report-period'?'报告期 ':source.dateBasis==='latest-observation'?'观测日 ':source.dateBasis==='latest-event'?'记录日期 ':''}{source.date || '日期未提供'}</small></span>
        <ChevronDown size={16} aria-hidden="true"/>
      </Button></CollapsibleTrigger>
      <CollapsibleContent className="rd-source-body">
        <div className="rd-source-tags"><Badge variant="secondary">{source.official ? '官方披露' : source.type==='web-evidence'?'网页原文（补充）':source.type==='vendor-financials'?'结构化财务（数据商）':source.type==='shareholder-data'?'股东回报（数据商）':source.type==='valuation-history'?'历史估值（数据商）':source.type==='data-check'?'数据覆盖检查':'行情数据'}</Badge>{source.fromCache && <Badge variant="outline">已保存资料</Badge>}{source.stale && <Badge variant="destructive">旧数据 · 待更新</Badge>}</div>
        {(source.url||source.filingUrl)&&<div className="rd-source-links"><SourceLink url={source.url}>{['vendor-financials','shareholder-data','valuation-history'].includes(source.type)?'数据接口说明':'原始来源'}</SourceLink><SourceLink url={source.filingUrl}>美国证监会申报原件</SourceLink></div>}
        {source.url && <p className="rd-source-url">{source.url}</p>}
        {source.fetchedAt && <p>抓取于 {formatDate(source.fetchedAt)}</p>}
        {source.type==='web-evidence' && <>
          <p>发布日期：{source.publishedAt||'原文未明确'} · 资料期间：{source.reportPeriod||'待核对'}</p>
          <p>{source.authorityVerified?'来源机构域名已确认，内容仍需核验。':'发布者身份待核验。'} 本页为已读取的原始正文，搜索摘要不作为证据。</p>
          {source.metadataWarnings?.length>0 && <p>{source.metadataWarnings.join('；')}</p>}
        </>}
          {source.coverage && <p>{source.coverage}</p>}
          {source.visualReading && <p>原页读取：{source.visualReading.notice}</p>}
          {source.cacheWarning && <p>{source.cacheWarning}</p>}
          {source.stale && <p>这是保留的旧数据，请核对披露日和抓取时间；尚未确认最新披露。</p>}
        {source.text ? <pre tabIndex={0} role="region" aria-label={`${source.id || '来源'} 正文预览`}>{source.text}</pre> : <p className="rd-source-no-text">这份来源未提供正文预览，可打开原始来源查阅。</p>}
        {source.previewTruncated && <p className="rd-source-footnote">仅预览前 12,000 字符；研究引擎可检索已提取正文。</p>}
      </CollapsibleContent>
    </Collapsible>)}</div>
    {!filtered.length && (sources.length ? <EmptyState icon={Search} title="没有匹配的证据来源">试试来源编号、标题关键词或提供方。<Button variant="ghost" className="rd-text-button" onClick={clearSearch}>清除搜索</Button></EmptyState>
      : <EmptyState icon={Globe} title={isActive(status) ? '等待证据来源' : '本次研究未取得来源'}>
        {isActive(status) ? '资料获取后会显示在这里，可从执行轨迹查看采集进度。' : status === 'cancelled' ? '任务已取消，没有已保存的证据来源。' : '没有已保存的证据来源，请查看执行轨迹了解原因。'}
      </EmptyState>)}
  </div>;
}

function isIssue(event) { return /error|fail|warn/i.test(event.type || '') || event.type==='audit_validation' || toolResultHasGap(event.result); }
function isTool(event) { return /tool/i.test(event.type || '') || event.arguments != null || event.result != null; }

function Trace({events, status, hidden,reveal=0,revealFilter='issues'}) {
  const [open, setOpen] = useState(true);
  const [filter, setFilter] = useState('all');
  const [detailed,setDetailed]=useState(false),[query,setQuery]=useState(''),[limit,setLimit]=useState(20);
  const timeline=useMemo(()=>researchTimeline(events,status),[events,status]);
  const trigger=useRef(null),searchInput=useRef(null),eventList=useRef(null);
  const detailsId=useId();
  useEffect(()=>{if(eventList.current)eventList.current.scrollTop=0;},[filter,query]);
  useEffect(()=>{
    if(!reveal)return;
    setOpen(true);setFilter(revealFilter);setDetailed(revealFilter!=='all');setQuery('');setLimit(20);
    const frame=requestAnimationFrame(()=>{if(window.matchMedia('(max-width: 1023px)').matches)trigger.current?.scrollIntoView({block:'start',behavior:'instant'});trigger.current?.focus({preventScroll:true});});
    return()=>cancelAnimationFrame(frame);
  },[reveal,revealFilter]);
  const filterId = useId();
  const filtered = timeline.filter(({event}) =>
    (filter === 'issues' ? isIssue(event) : filter === 'tools' ? isTool(event) : filter==='missing'?event.call&&!event.call.hasReturn:true)&&
    (!query.trim()||[event.message,event.call?.label,event.call?.toolName,event.call?.toolCallId].join(' ').toLowerCase().includes(query.trim().toLowerCase()))).reverse();
  return <aside className="rd-trace-aside" data-state={open?'open':'closed'} hidden={hidden} aria-label="研究执行轨迹">
    <Card className="rd-trace"><Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild><Button ref={trigger} variant="ghost" className="rd-trace-trigger rd-rail-trigger"><Activity size={18} aria-hidden="true"/><strong>执行轨迹</strong><Badge variant="secondary">{timeline.length}</Badge><ChevronDown size={16} aria-hidden="true"/></Button></CollapsibleTrigger>
      <CollapsibleContent className="rd-trace-body">
        <div className="rd-trace-toolbar"><span>最新在前</span><Button variant="ghost" size="sm" className="rd-trace-detail-toggle" aria-label={detailed?'收起详细筛选':'查看详细执行记录'} aria-controls={detailsId} aria-expanded={detailed} onClick={()=>{setDetailed(value=>!value);setFilter('all');setQuery('');setLimit(20);}}><SlidersHorizontal size={14}/>{detailed?'收起筛选':'筛选与详情'}</Button></div>
        <div id={detailsId} hidden={!detailed} className="rd-trace-controls">{detailed&&<><div className="rd-trace-search"><Search size={15} aria-hidden="true"/><Input ref={searchInput} aria-label="搜索执行记录" placeholder="搜索执行记录" value={query} onChange={event=>{setQuery(event.target.value);setLimit(20);}}/>{query&&<Button variant="ghost" size="icon" aria-label="清除执行记录搜索" onClick={()=>{setQuery('');setLimit(20);searchInput.current?.focus();}}><X size={14}/></Button>}</div>
        <div className="rd-trace-filter"><label className="sr-only" htmlFor={filterId}>事件筛选</label><Select value={filter} onValueChange={value=>{setFilter(value);setLimit(20);}}><SelectTrigger id={filterId} aria-label="事件筛选"><SelectValue/></SelectTrigger><SelectContent>
          <SelectItem value="all">全部事件</SelectItem><SelectItem value="tools">工具调用</SelectItem><SelectItem value="issues">异常与提示</SelectItem><SelectItem value="missing">未保存返回</SelectItem>
        </SelectContent></Select></div></>}</div>
        <p className="rd-trace-count" role="status">{filtered.length} 条记录{filtered.length>limit?` · 已显示 ${limit} 条`:''}{(query||filter!=='all')&&<Button variant="ghost" size="sm" onClick={()=>{setFilter('all');setQuery('');setLimit(20);searchInput.current?.focus();}}>重置</Button>}</p>
        <div ref={eventList} className="rd-events" tabIndex={filtered.length ? 0 : undefined} role="region" aria-label="执行事件列表，可滚动">
          {filtered.length ? <ol>{filtered.slice(0,limit).map(({event, key}) => <li className={`rd-event${isIssue(event) ? ' rd-event-issue' : ''}`} key={key}>
            <div className="rd-event-meta"><span>{formatDate(event.time, true)}</span>{event.call?<span className={'rd-call-status rd-call-'+event.call.status}>{{returned:'已返回',failed:'返回错误',pending:'等待返回',unrecorded:'未保存返回'}[event.call.status]}</span>:<span>{isIssue(event) ? '异常 / 提示' : isTool(event) ? '工具' : '进展'}</span>}</div>
            <p>{event.call&&event.message?.includes(event.call.toolName)?event.message.replaceAll(event.call.toolName,event.call.label).replace(/\s*已返回\s*$/,''):event.message || '执行记录'}</p>
            {event.type==='audit_validation' && <div className="rd-audit-issues">
              <p>{event.category==='format'?'报告格式需要修复': '交付内容需要修正'}{event.retryable===true?' · 正在自动修正':event.retryable===false?' · 自动修正已停止':''}</p>
              {event.issues?.length>0 ? <ul>{[...new Set(event.issues.map(issue=>issue.message).filter(Boolean))].map(message=><li key={message}>{message}</li>)}</ul> : event.reason && <p>{event.reason}</p>}
              {event.stopReason && <p>{event.stopReason}</p>}
            </div>}
            {(event.call||event.arguments != null || event.result != null) && <Collapsible className="rd-event-data"><CollapsibleTrigger asChild><Button variant="ghost" size="sm">{event.call?'查看调用详情':'查看工具数据'}<ChevronDown size={14} aria-hidden="true"/></Button></CollapsibleTrigger><CollapsibleContent>
              {event.call&&<><p>工具：{event.call.label}</p><p>调用编号：{event.call.toolCallId||'未记录'}</p>{event.call.durationMs!==null&&<p>记录间隔：{(event.call.durationMs/1000).toFixed(2)} 秒</p>}{!event.call.hasInput&&<p>输入参数未记录。</p>}{!event.call.hasReturn&&<p>{event.call.status==='pending'?'等待返回，尚不能判断调用结果。':'未保存返回结果，不推断成功或失败。'}</p>}</>}
              {(event.call?event.call.hasInput:event.arguments != null) && <><h4>输入参数</h4><pre tabIndex={0}>{JSON.stringify(event.arguments, null, 2)}</pre></>}
              {(event.call?event.call.hasReturn:event.result != null) && <><h4>返回结果</h4><pre tabIndex={0}>{JSON.stringify(event.result, null, 2)??'返回内容未保存'}</pre></>}
            </CollapsibleContent></Collapsible>}
          </li>)}</ol> : <p className="rd-trace-empty">{events.length ? '没有符合筛选条件的事件。' : isActive(status) ? '等待第一条执行记录…' : '本次研究未保存执行记录。'}</p>}
        {filtered.length>20&&<Button variant="outline" size="sm" aria-disabled={limit>=filtered.length} onClick={()=>{if(limit<filtered.length)setLimit(value=>value+20);}}>{limit<filtered.length?'显示更多执行记录':'全部记录已展开'}</Button>}
        {events.length > 0 && !filtered.length && <Button variant="ghost" className="rd-text-button" onClick={() => {setFilter('all');setQuery('');setLimit(20);}}>查看全部事件</Button>}
        </div>
      </CollapsibleContent>
    </Collapsible></Card>
  </aside>;
}

function Outline({items,activeId,onNavigate,reportHref=''}) {
  const navigation=useRef(null);
  useEffect(()=>{
    const nav=navigation.current;if(!nav||!activeId)return;
    let frame;
    function revealActive(){
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{
        const link=nav.querySelector('[aria-current="location"]');if(!link)return;
        const viewport=nav.getBoundingClientRect(),item=link.getBoundingClientRect();
        const top=viewport.top+nav.clientTop,bottom=top+nav.clientHeight;
        // Scroll only the directory; revealing a link must not move the report.
        if(item.top<top||item.bottom>bottom){
          nav.scrollTo({top:nav.scrollTop+item.top-top-(nav.clientHeight-item.height)/2,behavior:'instant'});
        }
      });
    }
    const observer=new ResizeObserver(revealActive);observer.observe(nav);
    revealActive();
    return()=>{cancelAnimationFrame(frame);observer.disconnect();};
  },[activeId,items]);
  if(!items.length)return null;
  const firstLevel=items.length?Math.min(...items.map(item=>item.level)):1;
  return <Card className="rd-outline"><CardHeader><CardTitle><List size={17}/>报告目录</CardTitle><Badge variant="secondary">{items.length} 章节</Badge></CardHeader><CardContent>
    <nav ref={navigation} aria-label="报告目录"><ol>{items.map(item=><li key={item.id} style={{'--rd-indent':Math.min(item.level-firstLevel,2)}}><Button asChild variant="ghost"><a href={reportHref+'#'+item.id} aria-current={activeId===item.id?'location':undefined} onClick={event=>onNavigate?.(event,item.id)}>{item.label}</a></Button></li>)}</ol></nav>
  </CardContent></Card>;
}

function ResearchActions({job,reading,setReading,active,hasReport,cancelling,onCancel,onRetry,retrying,onReuse,onDownload,exporting,onNavigate,saveOnly,saving,saveUnavailable}) {
  const [exportScope,setExportScope]=useState('full'),[exportOpen,setExportOpen]=useState(false),exportDescription=useId();
  function perform(action){onNavigate?.();action?.();}
  return <Card className="rd-action-panel" role="group" aria-label="研究操作"><CardContent>
    <Button variant="outline" className="rd-reading-toggle" aria-pressed={reading} onClick={()=>perform(()=>setReading(value=>!value))}><BookOpen size={17}/>{reading?'退出阅读模式':'阅读模式'}</Button>
    {!active&&(onRetry?<RetryButton onRetry={()=>perform(onRetry)} retrying={retrying} saveOnly={saveOnly} notice={retryNotice(job)}/>:onReuse&&<Button variant="outline" onClick={()=>perform(onReuse)} disabled={retrying} title="将输入载入工作台，确认提交后才会开始新的研究"><RotateCcw size={17}/>复用研究输入</Button>)}
    <Popover open={exportOpen} onOpenChange={setExportOpen}>
      <PopoverTrigger asChild><Button className="rd-export" disabled={!hasReport||!onDownload||retrying||exporting} aria-busy={Boolean(exporting)} title={hasReport?'选择下载内容':saveOnly||saving||saveUnavailable?'结果保存成功后可导出':'正式报告生成后可导出'}>{exporting?<LoaderCircle size={17} className="rd-spin"/>:<Download size={17}/>}{exporting?'准备导出…':'导出报告'}</Button></PopoverTrigger>
      <PopoverContent align="end" collisionPadding={12} className="rd-export-popover" aria-label="下载选项" aria-describedby={exportDescription}>
        <h3>下载选项</h3><p id={exportDescription}>选择需要保留的内容，下载为 Markdown 文件。</p>
        <fieldset><legend className="sr-only">下载内容</legend>{[
          ['full','完整研究记录','包含报告、审计、来源、公开计划、工具调用及规则依据。'],
          ['report','报告、审计与来源','适合阅读与分享，省略公开计划和工具参数。'],
        ].map(([value,label,description])=><label className="rd-export-option" key={value}><input type="radio" name={exportDescription} value={value} checked={exportScope===value} onChange={()=>setExportScope(value)}/><span><strong>{label}</strong><small>{description}</small></span></label>)}</fieldset>
        <Button className="rd-export-confirm" disabled={!hasReport||!onDownload||retrying||exporting} aria-busy={Boolean(exporting)} onClick={async()=>{setExportOpen(false);await onDownload?.({includeResearchProcess:exportScope==='full'});onNavigate?.();}}><Download size={16}/>开始下载</Button>
      </PopoverContent>
    </Popover>
    {active&&<Button variant="outline" className="rd-cancel" disabled={saving||cancelling||!onCancel} aria-busy={Boolean(cancelling)} title={saving?'正在保存原结果，请等待保存完成':'停止当前执行；之后可重试研究，优先从已保存的进度继续'} onClick={()=>{if(!cancelling&&!saving)perform(onCancel);}}>{cancelling?<LoaderCircle size={16} className="rd-spin"/>:<Square size={16}/>} {saving?'正在保存':cancelling?'正在取消…':'取消任务'}</Button>}
  </CardContent></Card>;
}

function ReportDirectory({compact,open,onOpenChange,items,activeId,onNavigate,onCloseAutoFocus,reportHref}) {
 const trigger=<Button variant="ghost" size="sm" className="rd-directory-trigger" aria-label="打开报告目录" disabled={!items.length} title={items.length?'选择章节，定位研究报告':'报告章节生成后可查看目录'}><List size={17}/><span>报告目录</span><ChevronDown size={14}/></Button>;
 const outline=<Outline {...{items,activeId,onNavigate,reportHref}}/>;
 return compact?<Sheet open={open} onOpenChange={onOpenChange}><SheetTrigger asChild>{trigger}</SheetTrigger><SheetContent side="left" className="research-detail rd-mobile-sheet" onCloseAutoFocus={onCloseAutoFocus}><SheetHeader><SheetTitle>报告目录</SheetTitle><SheetDescription>选择章节，切换到研究报告并定位。</SheetDescription></SheetHeader>{outline}</SheetContent></Sheet>
 :<Popover open={open} onOpenChange={onOpenChange}><PopoverTrigger asChild>{trigger}</PopoverTrigger><PopoverContent align="end" collisionPadding={16} className="research-detail rd-directory-popover" aria-label="报告目录" onCloseAutoFocus={onCloseAutoFocus}>{outline}</PopoverContent></Popover>;
}

function ReadingTools({body,toolbar,reportActive,onDirectoryOpenChange,directory,children,floatingDirectory=true}) {
  const layer=useRef(null);
  const [showDirectory,setShowDirectory]=useState(false);
  useEffect(()=>{if(floatingDirectory&&(!reportActive||!showDirectory))onDirectoryOpenChange(false);},[reportActive,showDirectory,onDirectoryOpenChange,floatingDirectory]);
  useEffect(()=>{
    const content=body.current,root=content?.closest('.page-scroll'),tools=layer.current;
    if(!content||!root||!tools)return;
    let frame;
    function update(){
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{
        const bounds=content.getBoundingClientRect(),viewport=root.getBoundingClientRect();
        const toolbarBottom=toolbar.current?.getBoundingClientRect().bottom??viewport.top;
        const top=Math.max(bounds.top,toolbarBottom)+12;
        const bottom=Math.min(bounds.bottom-12,viewport.bottom-16);
        const article=content.querySelector('[role="tabpanel"]:not([hidden]) .rd-markdown');
        setShowDirectory(reportActive&&Boolean(article)&&article.getBoundingClientRect().top<=toolbarBottom-120&&bottom-top>=100);
        Object.assign(tools.style,{left:bounds.left+12+'px',width:Math.max(0,bounds.width-24)+'px',top:top+'px',height:Math.max(0,bottom-top)+'px',visibility:bottom-top>=100?'visible':'hidden'});
      });
    }
    const observer=new ResizeObserver(update);
    observer.observe(content);observer.observe(root);if(toolbar.current)observer.observe(toolbar.current);
    update();root.addEventListener('scroll',update,{passive:true});
    return()=>{cancelAnimationFrame(frame);observer.disconnect();root.removeEventListener('scroll',update);};
  },[body,toolbar,reportActive]);
  return <div ref={layer} className="rd-reading-tools">{floatingDirectory&&reportActive&&showDirectory&&directory}{children}</div>;
}

function quickScreenProgress(job,hasReport){
 const stage=job.liveReport?.phase==='audit'?'review':job.workflow?.stages?.find(item=>item.status==='running')?.id;
 const progress={task:['正在明确筛选问题','按本次问题确定研究范围和需要验证的事项。'],evidence:['正在读取研究资料','汇集可得财务数据与披露原文，记录时点、读取范围和缺口。'],research:['正在查证变化与红旗','核对财务趋势与近期变化，同时寻找解释和反证。'],calculation:['正在核对关键计算','按行业和数据口径计算适用指标，缺值与冲突会单独记录。'],review:['正在复核筛选判断','核对依据、数据缺口与下一步验证条件，通过后显示筛选报告。']};
 if(job.status==='queued')return {title:'快速筛选已排队',text:'等待开始读取研究资料，进展将在本页更新。'};
 if(job.status==='running'){const [title,text]=progress[stage]||['快速筛选正在进行','先查已有资料，再按缺口查证。实际耗时取决于资料获取与核对，可稍后回来查看。'];return {title,text};}
 if(job.status==='completed'&&hasReport){const d=job.result?.decision;return {title:'快速筛选已完成',text:d?`本次判断为「${d.action}」。${d.missingData?.length?`仍有 ${d.missingData.length} 项资料待核实，建议先阅读判断依据。`:'结合证据、审计与验证条件阅读本次判断。'}`:'可以查阅筛选报告、审计记录及证据来源。'};}
 if(job.status==='failed')return {title:'快速筛选未完成',text:'尚未形成可交付的筛选判断。已保留输入与执行记录，重试将重新执行筛选流程。'};
 if(job.status==='cancelled')return {title:'快速筛选已取消',text:'本次未交付筛选判断。输入与执行记录已保留，可沿用输入重试。'};
 return {title:'未找到筛选报告',text:'可查看已有资料、审计与执行记录；未保存的判断不会补写。'};
}

function DetailView({job, currentConfig, tab, onTabChange, streamConnection, onRetry, retrying, retryError, onReuse, onUpdate,onDeepen, onDownload:download, exporting, onCancel, cancelling}) {
  const exchangeJobs=useMemo(()=>[{securities:reportSecurities(job).map(value=>researchSecurityDisplay(job,value))}],[job]);
  const exchanges=useSecurityExchanges(exchangeJobs);
  const onDownload=download?options=>download({...options,usExchanges:exchanges}):undefined;
  const [reading,setReading]=useState(false);
  const [showBackToTop,setShowBackToTop]=useState(false);
  const [processOpen,setProcessOpen]=useState(false);
  const processDestination=useRef(null);
  const [traceReveal,setTraceReveal]=useState({attempt:0,count:0});
  const [contentTarget,setContentTarget]=useState(null);
  const [sourceTarget,setSourceTarget]=useState(null);
  const [readingReturn,setReadingReturn]=useState(null),[restoreReading,setRestoreReading]=useState(null);
  const [outline,setOutline]=useState({prefix:'',items:[]});
  const [activeHeading,setActiveHeading]=useState('');
  const [directoryOpen,setDirectoryOpen]=useState(false),[actionsOpen,setActionsOpen]=useState(false);
  const [compact,setCompact]=useState(()=>typeof window!=='undefined'&&window.matchMedia('(max-width: 1023px)').matches);
  const [headerHeight,setHeaderHeight]=useState(80),[toolbarHeight,setToolbarHeight]=useState(68),[anchorTarget,setAnchorTarget]=useState(null);
  const header=useRef(null),section=useRef(null),toolbar=useRef(null),reportBody=useRef(null),pendingAnchor=useRef(null);
  useEffect(()=>{
    const root=section.current?.closest('.page-scroll');if(!root)return;
    let frame;
    function update(){cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>setShowBackToTop(root.scrollTop>Math.max(320,root.clientHeight*.6)));}
    const observer=new ResizeObserver(update);observer.observe(section.current);observer.observe(root);
    update();root.addEventListener('scroll',update,{passive:true});
    return()=>{cancelAnimationFrame(frame);observer.disconnect();root.removeEventListener('scroll',update);};
  },[]);
  const retryAlert=useRef(null);
  useEffect(()=>{if(retryError){retryAlert.current?.focus({preventScroll:true});retryAlert.current?.scrollIntoView({block:'start',behavior:'instant'});}},[retryError]);
  const instanceId=useId();
  const prefix='rd-'+instanceId.replace(/[^a-zA-Z0-9_-]/g,'')+'-'+encodeURIComponent(job.id||'job');
  const sources=Array.isArray(job.input?.sources)?job.input.sources:[];
  const events=(Array.isArray(job.events)?job.events:[])
    .filter(event=>event.type!=='research_plan')
    .map(event=>event.type==='audit'&&/CORE|FULL/.test(event.message||'')?{...event,message:'正在复核报告证据与结论。'}:event);
  const warnings=Array.isArray(job.result?.warnings)?job.result.warnings:[];
  const recovery=researchRecovery(job),draftState=researchDraftState(job);
  const retryAction=recovery?.retryKind?onRetry:undefined;
  const active=isActive(job.status),hasReport=!['saving','failed'].includes(job.delivery?.status)&&Boolean(job.result?.report?.trim());
  const quick=modeOf(job)==='A',screenState=(recovery&&['save','saving','save-unavailable'].includes(recovery.kind)?recovery:null)||(['supplement','audit'].includes(draftState?.kind)?draftState:null)||(quick?quickScreenProgress(job,hasReport):modeOf(job)==='B'?deepResearchProgress(job,hasReport):modeOf(job)==='C'?earningsUpdateProgress(job,hasReport):modeOf(job)==='D'?comparisonProgress(job,hasReport):null);
  const preview=useMemo(()=>reportPreview(job.liveReport?.text,job.plan),[job.liveReport?.text,job.plan]);
  const currentTab=Object.hasOwn(tabLabels,tab)?tab:'report';
  useEffect(()=>{
    if(!contentTarget||currentTab!==(contentTarget==='execution'?'audit':contentTarget))return;
    const frame=requestAnimationFrame(()=>{
      const target=contentTarget==='execution'?section.current?.querySelector('.rd-execution-review'):toolbar.current;
      target?.scrollIntoView({block:'start',behavior:'instant'});
      if(contentTarget==='execution')target?.focus({preventScroll:true});
      else toolbar.current?.querySelector('[role="tab"][data-state="active"]')?.focus({preventScroll:true});
      setContentTarget(null);
    });
    return()=>cancelAnimationFrame(frame);
  },[currentTab,contentTarget]);
  const outlineItems=outline.prefix===prefix+'-report'?outline.items:[];
  const hasOutline=outlineItems.length>0;
  const directory=<ReportDirectory compact={compact} open={directoryOpen} onOpenChange={setDirectoryOpen} items={outlineItems} activeId={activeHeading} onNavigate={navigateOutline} onCloseAutoFocus={finishDirectoryClose} reportHref={'/research/'+encodeURIComponent(job.id)}/>;
  const updateOutline=useCallback(next=>setOutline(current=>current.prefix===next.prefix&&current.items.length===next.items.length&&current.items.every((item,index)=>item.id===next.items[index].id&&item.label===next.items[index].label&&item.level===next.items[index].level)?current:next),[]);
  useEffect(()=>{
    const query=window.matchMedia('(max-width: 1023px)'),change=()=>{setCompact(query.matches);setDirectoryOpen(false);};
    query.addEventListener('change',change);return()=>query.removeEventListener('change',change);
  },[]);
  useEffect(()=>{
    const observer=new ResizeObserver(()=>{
      setHeaderHeight(Math.ceil(header.current?.getBoundingClientRect().height||80));
      setToolbarHeight(Math.ceil(toolbar.current?.getBoundingClientRect().height||68));
    });
    if(header.current)observer.observe(header.current);if(toolbar.current)observer.observe(toolbar.current);
    return()=>observer.disconnect();
  },[]);
  useEffect(()=>{if(!hasReport&&(!active||!preview.trim()))updateOutline({prefix:prefix+'-report',items:[]});},[hasReport,active,preview,prefix,updateOutline]);
  useEffect(()=>{if(!hasOutline)setDirectoryOpen(false);},[hasOutline]);
  useEffect(()=>{
    if(currentTab!=='report')return;
    const root=section.current?.closest('.page-scroll');if(!root)return;
    let frame;
    function update(){cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
      const threshold=(header.current?.getBoundingClientRect().bottom??0)+toolbarHeight+24;
      let current=outlineItems[0]?.id||'';
      for(const item of outlineItems){const element=document.getElementById(item.id);if(element&&element.getBoundingClientRect().top<=threshold)current=item.id;}
      setActiveHeading(current);
    });}
    update();root.addEventListener('scroll',update,{passive:true});window.addEventListener('resize',update);
    return()=>{cancelAnimationFrame(frame);root.removeEventListener('scroll',update);window.removeEventListener('resize',update);};
  },[outline,currentTab,headerHeight,toolbarHeight]);
  function navigateOutline(event,id){
    if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    event.preventDefault();setReadingReturn(null);setActiveHeading(id);pendingAnchor.current=id;
    onTabChange('report','#'+id);setDirectoryOpen(false);
  }
  function finishDirectoryClose(event){
    if(!pendingAnchor.current)return;
    event.preventDefault();setAnchorTarget(pendingAnchor.current);pendingAnchor.current=null;
  }
  useEffect(()=>{
    if(!anchorTarget||currentTab!=='report')return;
    const frame=requestAnimationFrame(()=>{
      const target=document.getElementById(anchorTarget);
      target?.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
      target?.focus({preventScroll:true});setAnchorTarget(null);
    });
    return()=>cancelAnimationFrame(frame);
  },[anchorTarget,currentTab,headerHeight,toolbarHeight]);
  function showTrace(issues=true){setReading(false);setTraceReveal(value=>({attempt:job.retryCount??0,count:value.count+1,filter:issues==='tools'?'tools':issues?'issues':'all'}));}
  function backToTop(){
    header.current?.querySelector('h1')?.focus({preventScroll:true});
    if(window.location.hash)onTabChange(currentTab,'');
    section.current?.closest('.page-scroll')?.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  }
  function showContent(next){setReadingReturn(null);setProcessOpen(false);setContentTarget(next);onTabChange(next);}
  function showWarningSource(index){setReadingReturn(null);setContentTarget(null);setSourceTarget({index});onTabChange('sources');}
  const showCitation=useCallback((id,node)=>{
    const index=sources.findIndex(source=>source.id===id);
    const root=section.current?.closest('.page-scroll');
    if(index<0||!root)return;
    setReadingReturn({tab:currentTab,id:node.id,top:root.scrollTop,offset:node.getBoundingClientRect().top-root.getBoundingClientRect().top});
    setContentTarget(null);setSourceTarget({index});onTabChange('sources');
  },[sources,currentTab,onTabChange]);
  function returnToReading(){
    if(!readingReturn)return;
    setSourceTarget(null);setContentTarget(null);setRestoreReading(readingReturn);setReadingReturn(null);onTabChange(readingReturn.tab);
  }
  useEffect(()=>{
    if(!restoreReading||currentTab!==restoreReading.tab)return;
    let frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(()=>{
      const root=section.current?.closest('.page-scroll'),node=document.getElementById(restoreReading.id);
      if(root){root.scrollTo({top:node?root.scrollTop+node.getBoundingClientRect().top-root.getBoundingClientRect().top-restoreReading.offset:restoreReading.top,behavior:'instant'});}
      node?.focus({preventScroll:true});setRestoreReading(null);
    });});
    return()=>cancelAnimationFrame(frame);
  },[restoreReading,currentTab]);
  function showExecutionAudit(){setContentTarget('execution');onTabChange('audit');}
  function showExecutionSource(id){const index=sources.findIndex(source=>source.id===id);if(index>=0)showWarningSource(index);else showContent('sources');}
  function showProcessSources(){processDestination.current='sources';setProcessOpen(false);}
  function closeProcess(event){if(processDestination.current){event.preventDefault();const next=processDestination.current;processDestination.current=null;showContent(next);}}
  const actionProps={job,reading,setReading,active,hasReport,cancelling,onCancel,onRetry:retryAction,retrying,onReuse,onDownload,exporting,saveOnly:needsSaveRetry(job),saving:isSavingResult(job),saveUnavailable:recovery?.kind==='save-unavailable'};
  const title=job.input?.question||job.question||'未命名研究';
  const progressState=researchProgress(job);
  const progressFailed=job.status==='failed'||job.delivery?.status==='failed';
  const failureReason=progressFailed?(typeof job.error==='string'&&job.error.trim()||'未记录具体失败原因，可查看研究过程与执行轨迹。'):'';
  const executionReason=progressFailed&&typeof job.delivery?.executionError==='string'?job.delivery.executionError.trim():'';
  const compactFailure=recovery?.retryKind==='research'&&Boolean(failureReason);
  const ProgressIcon=progressState.busy?LoaderCircle:progressState.status==='queued'?Clock3:progressState.status==='completed'?Check:progressState.status==='cancelled'?Square:CircleAlert;
  const overview=job.status==='queued'?'任务已排队':job.status==='running'
    ?(job.liveReport?.phase==='audit'?'正在复核研究草稿':job.liveReport?.phase==='formatting'?'正在整理研究报告':'研究正在进行')
    :job.status==='completed'?(hasReport?'报告已完成，可以查阅与导出':'研究已结束，未找到报告正文')
      :job.status==='failed'?'本次研究未完成':job.status==='cancelled'?'研究已取消':'研究记录';
  return <section ref={section} className={'research-detail'+(reading?' rd-reading':'')} style={{'--rd-header-height':headerHeight+'px','--rd-toolbar-height':toolbarHeight+'px'}} aria-labelledby={prefix+'-title'}>
    <header className="rd-header" ref={header}>
      <div className="rd-title-row"><h1 id={prefix+'-title'} title={title} tabIndex={-1}>{title}</h1></div>
      <div className="rd-desktop-tools"><ResearchActions {...actionProps}/></div>
      <div className="rd-mobile-tools">
        <Sheet open={actionsOpen} onOpenChange={setActionsOpen}><SheetTrigger asChild><Button variant="outline" size="sm" aria-label="打开研究操作"><BookOpen size={16}/>研究操作</Button></SheetTrigger><SheetContent side="right" className="research-detail rd-mobile-sheet"><SheetHeader><SheetTitle>研究操作</SheetTitle><SheetDescription>{needsSaveRetry(job)?'重试保存当前结果，或切换阅读模式。':retryAction?'切换阅读模式或直接重试本次研究。':'切换阅读模式、复用输入或导出正式报告。'}</SheetDescription></SheetHeader><ResearchActions {...actionProps} onNavigate={()=>setActionsOpen(false)}/></SheetContent></Sheet>
      </div>
    </header>
   {retrying&&<p className="rd-retry-status" role="status"><LoaderCircle size={16} className="rd-spin"/>{needsSaveRetry(job)||isSavingResult(job)?'正在重新保存结果，请稍候…':researchContinuation(job)?`正在恢复${researchContinuation(job).phase}进度，请稍候…`:'正在重新提交研究，请稍候…'}</p>}
    {retryError&&<Alert ref={retryAlert} tabIndex={-1} variant="destructive" className="rd-retry-error"><CircleAlert size={17}/><AlertTitle>{needsSaveRetry(job)?'结果仍未保存':'重试未能启动'}</AlertTitle><AlertDescription><p>{retryError}</p><p>{needsSaveRetry(job)?'可稍后重试保存；若提示版本变化或暂存内容不存在，请刷新详情确认最新状态。':'若请求超时或提示版本变化，请先刷新详情确认是否已启动，避免重复操作；输入需调整时可选择“修改研究输入”。'}</p>{onReuse&&!needsSaveRetry(job)&&<Button type="button" variant="ghost" onClick={onReuse} disabled={retrying}>修改研究输入</Button>}</AlertDescription></Alert>}
    <div className="rd-layout">
      <div className="rd-main-column">
        <div className={'rd-overview rd-context-strip rd-overview-'+job.status} data-progress-state={progressState.status} data-recovery={compactFailure||undefined} aria-label="研究进展">
          <span className="rd-overview-icon" aria-hidden="true"><ProgressIcon size={21} className={progressState.busy?'rd-spin':undefined}/></span>
          <span className="rd-overview-copy" role="status" aria-atomic="true">{compactFailure?<><span className="rd-progress-label">未完成原因</span><strong><span className="rd-progress-error">{failureReason}</span></strong></>:<><span className="rd-progress-label">研究进展<span aria-hidden="true">·</span>{progressState.label}</span><strong>{screenState?.title||overview}{failureReason&&<span className="rd-progress-error">（{job.delivery?.status==='failed'?'保存问题：':'失败原因：'}{failureReason}{executionReason&&executionReason!==failureReason?`；原执行问题：${executionReason}`:''}）</span>}</strong></>}</span>
          <Sheet open={processOpen} onOpenChange={setProcessOpen}><SheetTrigger asChild><Button type="button" variant="outline" size="sm" className="rd-process-trigger" aria-label="研究过程"><Activity size={16} aria-hidden="true"/>查看研究过程<ArrowUpRight size={16} aria-hidden="true"/></Button></SheetTrigger><SheetContent side="right" className="research-detail rd-process-sheet" onCloseAutoFocus={closeProcess}><SheetHeader><SheetTitle>研究过程</SheetTitle><SheetDescription>查看研究设置、规则依据、执行阶段与资料覆盖。</SheetDescription></SheetHeader><div className="rd-process-body">
    <dl className="rd-meta">
      <div><dt>本次研究规则版本</dt><dd>{job.result?.framework?.version||job.plan?.version?'V'+(job.result?.framework?.version||job.plan.version):'未记录'}</dd></div><div><dt>研究路径</dt><dd>{modes[job.mode]?.name||(job.mode==='auto'?'自动匹配':job.plan?.name||'研究路径未记录')}</dd></div>
      {job.input?.depth&&<div><dt>{quick?'研究目标':'报告深度'}</dt><dd>{quick?'判断是否继续研究':depthLabels[job.input.depth]||job.input.depth}</dd></div>}
      {(job.plan?.historyYears||job.input?.historyYears)&&<div><dt>财报范围</dt><dd>近 {job.plan?.historyYears||job.input.historyYears} 年</dd></div>}
      <div><dt>创建时间</dt><dd>{formatDate(job.createdAt)}</dd></div>
      {job.lastRetriedAt&&<div><dt>最近重试</dt><dd>{formatDate(job.lastRetriedAt)}</dd></div>}
    </dl>

            <ResearchRuleUsage key={job.retryCount??0} job={job} currentConfig={currentConfig}/>
            <ResearchProgress job={job} expanded/>
            <DocumentReadingSummary job={job} onSources={showProcessSources}/>
          </div></SheetContent></Sheet>
        </div>
        {streamConnection&&<p className="rd-connection" role="status"><Activity size={15} aria-hidden="true"/>{streamConnection}</p>}
        <Card className="rd-report-card" aria-label="研究内容">
          <Tabs value={currentTab} onValueChange={onTabChange} className="rd-tabs">
            <div ref={toolbar} className="rd-content-toolbar"><TabsList className="rd-tab-list" aria-label="研究详情内容">
              <TabsTrigger value="report"><FileText size={16}/>研究报告</TabsTrigger>
              <TabsTrigger value="audit"><ShieldCheck size={16}/>审计记录</TabsTrigger>
              <TabsTrigger value="sources"><Globe size={16}/>证据来源<Badge variant="secondary" className="rd-source-count">{sources.length}</Badge></TabsTrigger>
            </TabsList>{!compact&&directory}{currentTab==='sources'&&readingReturn&&<Button type="button" variant="ghost" className="rd-return-reading" onClick={returnToReading}><ArrowLeft size={16}/>{readingReturn.tab==='audit'?'返回审计原文':'返回报告原文'}</Button>}</div>
            <div ref={reportBody} className="rd-reading-body">
            <ReadingTools body={reportBody} toolbar={toolbar} reportActive={currentTab==='report'} onDirectoryOpenChange={setDirectoryOpen} floatingDirectory={compact} directory={hasOutline&&directory}>
              {showBackToTop&&!processOpen&&!directoryOpen&&!actionsOpen&&<Button type="button" variant="outline" className="rd-back-to-top" onClick={backToTop} aria-label="回到顶部" title="回到顶部"><ArrowUp size={18} aria-hidden="true"/><span>回到顶部</span></Button>}
            </ReadingTools>
            {currentTab==='report'&&<ReportWarnings warnings={warnings} sources={sources} onSource={showWarningSource}/>}
            <TabsContent value="report" className="rd-panel" forceMount hidden={currentTab!=='report'}><ReportPanel job={job} exchanges={exchanges} prefix={prefix+'-report'} preview={preview} onRetry={retryAction} retrying={retrying} retryError={retryError} onReuse={onReuse} onUpdate={job.status==='completed'?onUpdate:undefined} onDeepen={job.status==='completed'?onDeepen:undefined} onOutline={updateOutline} onSources={()=>showContent('sources')} onAudit={()=>showContent('audit')} onTrace={showTrace} onExecutionAudit={showExecutionAudit} onCitation={showCitation}/></TabsContent>
            <TabsContent value="audit" className="rd-panel rd-audit-panel"><AuditPanel job={job} prefix={prefix+'-audit'} onSources={()=>showContent('sources')} onSource={showExecutionSource} onCitation={showCitation} onTrace={showTrace}/></TabsContent>
            <TabsContent value="sources" className="rd-panel" forceMount hidden={currentTab!=='sources'}><SourcesPanel key={job.retryCount??0} job={job} sources={sources} status={job.status} referenceMaterials={job.input?.referenceMaterials} sourceTarget={sourceTarget} active={currentTab==='sources'}/></TabsContent>
            </div>
          </Tabs>
        </Card>
      </div>
      <aside className="rd-right-rail" aria-label="研究执行记录" hidden={reading}><ResearchExecutionChecks job={job} onTrace={showTrace} onDownload={onDownload} exporting={exporting}/><Trace key={job.retryCount??0} events={events} status={job.status} hidden={reading} revealFilter={traceReveal.filter||'issues'} reveal={traceReveal.attempt===(job.retryCount??0)?traceReveal.count:0}/></aside>
    </div>
  </section>;
}

/**
 * Controlled tab: 'report' | 'audit' | 'sources'; onTabChange(nextTab) stays in
 * the parent so its URL/query parameters remain authoritative. Action callbacks
 * take no arguments; the parent owns requests, download content and errors.
 * onRetry saves the retained result when recoverable, otherwise restarts this
 * record in place; onReuse only loads the workbench inputs.
 * streamConnection comes from useJobStream; cancelling/retrying/retryError are parent-owned.
 * All reading/search/expansion/filter state resets only when job.id changes.
 */
export default function ResearchDetail(props) {
  if (!props.job) return <section className="research-detail"><EmptyState title="尚未选择研究">打开一条研究记录后，可在这里阅读报告与执行过程。</EmptyState></section>;
  return <DetailView key={props.job.id} {...props}/>;
}
