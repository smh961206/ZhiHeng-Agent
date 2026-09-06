import {deepResearchProgress} from '../../shared/deep-research.mjs';
import {useCallback, useEffect, useId, useMemo, useRef, useState} from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Activity, ArrowUpRight, BookOpen, Check, ChevronDown, CircleAlert,
  Clock3, Download, FileText, Globe, List, LoaderCircle, RotateCcw,
  Search, ShieldCheck, Square, X,
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
import DeepResearchProcess from './DeepResearchProcess';
import ResearchProgress from './ResearchProgress';
import ResearchDecision from './ResearchDecision';
import {modes} from '../../shared/research-framework.mjs';
import {reportPreview} from '../../shared/report-preview.mjs';
import {modeOf} from '../lib/research-mode';

const statusLabels = {
  queued: '等待中', running: '研究中', completed: '已完成', failed: '失败', cancelled: '已取消',
};
const depthLabels = {Quick: '简明研究', Standard: '标准研究', Deep: '深入研究'};
const tabLabels = {report: '研究报告', audit: '审计记录', sources: '证据来源'};
const isActive = status => status === 'queued' || status === 'running';

function formatDate(value, timeOnly = false) {
  if (!value || Number.isNaN(new Date(value).getTime())) return '时间未记录';
  return new Date(value).toLocaleString('zh-CN', timeOnly
    ? {hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false}
    : {year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false});
}

function Status({status}) {
  const Icon = status === 'running' ? LoaderCircle : status === 'completed' ? Check
    : status === 'failed' ? CircleAlert : status === 'cancelled' ? Square : Clock3;
  return <Badge variant="outline" className={`rd-status rd-status-${status}`}>
    <Icon size={13} aria-hidden="true" className={status === 'running' ? 'rd-spin' : undefined}/>
    {statusLabels[status] || '状态未知'}
  </Badge>;
}

function RetryButton({onRetry,retrying}) {
  return <Button type="button" variant="outline" onClick={onRetry} disabled={retrying} aria-busy={Boolean(retrying)}>
    {retrying?<LoaderCircle size={16} className="rd-spin"/>:<RotateCcw size={16}/>}{retrying?'正在重试…':'重试研究'}
  </Button>;
}

function EmptyState({icon: Icon = FileText, title, children, active = false, actions}) {
  return <div className="rd-empty">
    <span className="rd-empty-icon"><Icon size={27} aria-hidden="true" className={active ? 'rd-spin' : undefined}/></span>
    <h3>{title}</h3>
    <p>{children}</p>
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

function ReportDocument({text, prefix, draft = false, onOutline}) {
  const article = useRef(null);
  const markdown = useMemo(() => <Markdown
    remarkPlugins={[remarkGfm, [remarkHeadingIds, {prefix}]]}
    components={markdownComponents}>{text}</Markdown>, [text, prefix]);

  // Read only the headings actually rendered by Markdown, so fenced code, inline
  // formatting and streaming incomplete headings cannot create phantom entries.
  useEffect(() => {
    const next = Array.from(article.current?.querySelectorAll('h1, h2, h3, h4, h5, h6') || [])
      .map(heading => ({id: heading.id, label: heading.textContent.trim(), level: Number(heading.tagName[1])}))
      .filter(heading => heading.label);
    onOutline?.({prefix,items:next});
  }, [text, prefix, onOutline]);
  return <article ref={article} className={`rd-markdown${draft ? ' rd-draft' : ''}`} aria-label={draft ? '实时报告草稿，尚未完成审计' : '报告正文'}>{markdown}</article>;
}

function ReportPanel({job, prefix, preview, onRetry, retrying, onReuse, onOutline, onUpdate, onDeepen}) {
  const quick=modeOf(job)==='A';
  if (job.result?.report?.trim()) return <><ResearchDecision job={job} onUpdate={onUpdate} onDeepen={onDeepen}/><ReportDocument text={job.result.report} prefix={prefix} onOutline={onOutline}/></>;
  const active = isActive(job.status);
  if (!job.result && active && preview.trim()) return <>
    <div className="rd-notice rd-draft-notice" role="status"><LoaderCircle size={17} className="rd-spin" aria-hidden="true"/>
      <div><strong>{job.liveReport.phase === 'audit' ? '草稿已生成，正在审计' : '实时草稿 · 尚未审计'}</strong>
        <p>{quick?'筛选判断仍在形成，数据缺口与解释可能调整；正式报告将在复核完成后提供。':'内容可能继续调整，请以最终报告为准。正式报告生成后方可导出。'}</p></div>
    </div>
    <ReportDocument text={preview} prefix={prefix} onOutline={onOutline} draft/>
  </>;
  const screenState=quick?quickScreenProgress(job,false):modeOf(job)==='B'?deepResearchProgress(job,false):null;
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
  const actions=onRetry?<div className="rd-retry-actions"><RetryButton onRetry={onRetry} retrying={retrying}/>{onReuse&&<Button type="button" variant="ghost" onClick={onReuse} disabled={retrying}>修改研究输入</Button>}</div>
    :onReuse?<Button type="button" variant="outline" onClick={onReuse}><RotateCcw size={15}/>复用研究输入</Button>:null;
  return <EmptyState title={state[0]} icon={state[2]} active={job.status === 'running'} actions={!active?actions:null}>{state[1]}</EmptyState>;
}

function AuditPanel({job, prefix, onOutline}) {
  const validation = job.result?.validation;
  const checks = Array.isArray(validation?.checks) ? validation.checks : [];
  return <>
    {validation && <section className="rd-validation" aria-label="程序校验记录">
      <h3><ShieldCheck size={17} aria-hidden="true"/>程序校验记录</h3>
      <ul>{checks.map((check, index) => <li key={`${check.id || 'check'}-${index}`} data-passed={check.passed}>
        {check.passed === true ? <Check size={15} aria-label="通过"/> : <CircleAlert size={15} aria-label={check.passed === false ? '未通过' : '未标记结果'}/>}
        <span>{check.label}{check.passed === false && ' · 未通过'}{check.passed == null && ' · 未标记结果'}</span>
      </li>)}</ul>
      {validation.scope && <p>{validation.scope}</p>}
      {validation.checkedAt && <small>校验于 {formatDate(validation.checkedAt)}</small>}
    </section>}
    {job.result?.audit?.trim() ? <ReportDocument text={job.result.audit} prefix={prefix} onOutline={onOutline}/> : <EmptyState icon={ShieldCheck}
      title={job.status === 'cancelled' ? '审计未完成，任务已取消' : job.status === 'failed' ? '研究未完成，暂无正式审计' : isActive(job.status) ? (job.liveReport?.phase === 'audit' ? '正在复核研究草稿' : '等待研究进入审计阶段') : '暂无审计记录'}>
      {isActive(job.status) ? '正式审计结果将在研究完成后显示；实时草稿不代表审计结论。' : '本次记录没有正式审计正文，可查看执行轨迹了解研究过程。'}
    </EmptyState>}
  </>;
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

function SourcesPanel({sources, status}) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(() => new Set());
  const input = useRef(null);
  const inputId = useId();
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
    <div className="rd-source-list">{filtered.map(({source, key}) => <Collapsible key={key} className="rd-source" open={expanded.has(key)} onOpenChange={open=>setSourceOpen(key,open)}>
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

function isIssue(event) { return /error|fail|warn/i.test(event.type || '') || Boolean(event.result?.error); }
function isTool(event) { return /tool/i.test(event.type || '') || event.arguments != null || event.result != null; }

function Trace({events, status, hidden}) {
  const [open, setOpen] = useState(true);
  const [filter, setFilter] = useState('all');
  const filterId = useId();
  const filtered = events.map((event, index) => ({event, index})).filter(({event}) =>
    filter === 'issues' ? isIssue(event) : filter === 'tools' ? isTool(event) : true).reverse();
  return <aside className="rd-trace-aside" hidden={hidden} aria-label="研究执行轨迹">
    <Card className="rd-trace"><Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild><Button variant="ghost" className="rd-trace-trigger"><Activity size={18} aria-hidden="true"/><strong>执行轨迹</strong><Badge variant="secondary">{events.length}</Badge><ChevronDown size={16} aria-hidden="true"/></Button></CollapsibleTrigger>
      <CollapsibleContent className="rd-trace-body">
        <div className="rd-trace-filter"><label htmlFor={filterId}>事件筛选</label><Select value={filter} onValueChange={setFilter}><SelectTrigger id={filterId} aria-label="事件筛选"><SelectValue/></SelectTrigger><SelectContent>
          <SelectItem value="all">全部事件</SelectItem><SelectItem value="tools">工具调用</SelectItem><SelectItem value="issues">异常与提示</SelectItem>
        </SelectContent></Select></div>
        <p className="rd-trace-count" role="status">{filter === 'all' ? `${events.length} 条记录` : `${filtered.length} / ${events.length} 条记录`} · 最新在前</p>
        <div className="rd-events" tabIndex={filtered.length ? 0 : undefined} role="region" aria-label="执行事件列表，可滚动">
          {filtered.length ? <ol>{filtered.map(({event, index}) => <li className={`rd-event${isIssue(event) ? ' rd-event-issue' : ''}`} key={index}>
            <div className="rd-event-meta"><span>{formatDate(event.time, true)}</span><span>{isIssue(event) ? '异常 / 提示' : isTool(event) ? '工具' : '进展'}</span></div>
            <p>{event.message || '执行记录'}</p>
            {(event.arguments != null || event.result != null) && <Collapsible className="rd-event-data"><CollapsibleTrigger asChild><Button variant="ghost" size="sm">查看工具数据<ChevronDown size={14} aria-hidden="true"/></Button></CollapsibleTrigger><CollapsibleContent>
              {event.arguments != null && <><h4>输入参数</h4><pre tabIndex={0}>{JSON.stringify(event.arguments, null, 2)}</pre></>}
              {event.result != null && <><h4>返回结果</h4><pre tabIndex={0}>{JSON.stringify(event.result, null, 2)}</pre></>}
            </CollapsibleContent></Collapsible>}
          </li>)}</ol> : <p className="rd-trace-empty">{events.length ? '没有符合筛选条件的事件。' : isActive(status) ? '等待第一条执行记录…' : '本次研究未保存执行记录。'}</p>}
        </div>
        {events.length > 0 && !filtered.length && <Button variant="ghost" className="rd-text-button" onClick={() => setFilter('all')}>查看全部事件</Button>}
      </CollapsibleContent>
    </Collapsible></Card>
  </aside>;
}

function Outline({items,activeId,onNavigate,reportHref=''}) {
  if(!items.length)return null;
  const firstLevel=items.length?Math.min(...items.map(item=>item.level)):1;
  return <Card className="rd-outline"><CardHeader><CardTitle><List size={17}/>报告目录</CardTitle><Badge variant="secondary">{items.length} 章节</Badge></CardHeader><CardContent>
    <nav aria-label="报告目录"><ol>{items.map(item=><li key={item.id} style={{'--rd-indent':Math.min(item.level-firstLevel,2)}}><Button asChild variant="ghost"><a href={reportHref+'#'+item.id} aria-current={activeId===item.id?'location':undefined} onClick={event=>onNavigate?.(event,item.id)}>{item.label}</a></Button></li>)}</ol></nav>
  </CardContent></Card>;
}

function ResearchActions({reading,setReading,active,hasReport,cancelling,onCancel,onRetry,retrying,onReuse,onDownload,onNavigate}) {
  function perform(action){onNavigate?.();action?.();}
  return <Card className="rd-action-panel" role="group" aria-label="研究操作"><CardContent>
    <Button variant="outline" className="rd-reading-toggle" aria-pressed={reading} onClick={()=>perform(()=>setReading(value=>!value))}><BookOpen size={17}/>{reading?'退出阅读模式':'阅读模式'}</Button>
    {!active&&(onRetry?<RetryButton onRetry={()=>perform(onRetry)} retrying={retrying}/>:onReuse&&<Button variant="outline" onClick={()=>perform(onReuse)}><RotateCcw size={17}/>复用研究输入</Button>)}
    <Button className="rd-export" disabled={!hasReport||!onDownload} title={hasReport?'导出报告、审计与来源；深度研究同时包含验证计划及实际工具记录（Markdown）':'正式报告生成后可导出'} onClick={()=>perform(onDownload)}><Download size={17}/>导出报告</Button>
    {active&&<Button variant="outline" className="rd-cancel" disabled={cancelling||!onCancel} aria-busy={Boolean(cancelling)} onClick={()=>{if(!cancelling)perform(onCancel);}}>{cancelling?<LoaderCircle size={16} className="rd-spin"/>:<Square size={16}/>} {cancelling?'正在取消…':'取消任务'}</Button>}
  </CardContent></Card>;
}

function ReportDirectory({compact,open,onOpenChange,items,activeId,onNavigate,onCloseAutoFocus,reportHref}) {
 const trigger=<Button variant="ghost" size="sm" className="rd-directory-trigger" aria-label="打开报告目录" disabled={!items.length} title={items.length?'选择章节，定位研究报告':'报告章节生成后可查看目录'}><List size={17}/><span>报告目录</span><ChevronDown size={14}/></Button>;
 const outline=<Outline {...{items,activeId,onNavigate,reportHref}}/>;
 return compact?<Sheet open={open} onOpenChange={onOpenChange}><SheetTrigger asChild>{trigger}</SheetTrigger><SheetContent side="left" className="research-detail rd-mobile-sheet" onCloseAutoFocus={onCloseAutoFocus}><SheetHeader><SheetTitle>报告目录</SheetTitle><SheetDescription>选择章节，切换到研究报告并定位。</SheetDescription></SheetHeader>{outline}</SheetContent></Sheet>
 :<Popover open={open} onOpenChange={onOpenChange}><PopoverTrigger asChild>{trigger}</PopoverTrigger><PopoverContent align="end" collisionPadding={16} className="research-detail rd-directory-popover" aria-label="报告目录" onCloseAutoFocus={onCloseAutoFocus}>{outline}</PopoverContent></Popover>;
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

function DetailView({job, tab, onTabChange, streamConnection, onRetry, retrying, retryError, onReuse, onUpdate,onDeepen, onDownload, onCancel, cancelling}) {
  const [reading,setReading]=useState(false);
  const [outline,setOutline]=useState({prefix:'',items:[]});
  const [activeHeading,setActiveHeading]=useState('');
  const [directoryOpen,setDirectoryOpen]=useState(false),[actionsOpen,setActionsOpen]=useState(false);
  const [compact,setCompact]=useState(()=>typeof window!=='undefined'&&window.matchMedia('(max-width: 1023px)').matches);
  const [headerHeight,setHeaderHeight]=useState(80),[toolbarHeight,setToolbarHeight]=useState(68),[anchorTarget,setAnchorTarget]=useState(null);
  const header=useRef(null),section=useRef(null),toolbar=useRef(null),pendingAnchor=useRef(null);
  const retryAlert=useRef(null);
  useEffect(()=>{if(retryError){retryAlert.current?.focus({preventScroll:true});retryAlert.current?.scrollIntoView({block:'start',behavior:'instant'});}},[retryError]);
  const instanceId=useId();
  const prefix='rd-'+instanceId.replace(/[^a-zA-Z0-9_-]/g,'')+'-'+encodeURIComponent(job.id||'job');
  const sources=Array.isArray(job.input?.sources)?job.input.sources:[];
  const events=(Array.isArray(job.events)?job.events:[])
    .filter(event=>event.type!=='research_plan'&&(modeOf(job)==='B'||event.toolName!=='read_rules'))
    .map(event=>event.type==='audit'&&/CORE|FULL/.test(event.message||'')?{...event,message:'正在复核报告证据与结论。'}:event);
  const warnings=Array.isArray(job.result?.warnings)?job.result.warnings:[];
  const active=isActive(job.status),hasReport=Boolean(job.result?.report?.trim());
  const quick=modeOf(job)==='A',screenState=quick?quickScreenProgress(job,hasReport):modeOf(job)==='B'?deepResearchProgress(job,hasReport):null;
  const preview=useMemo(()=>reportPreview(job.liveReport?.text,job.plan),[job.liveReport?.text,job.plan]);
  const currentTab=Object.hasOwn(tabLabels,tab)?tab:'report';
  const outlineItems=outline.prefix===prefix+'-report'?outline.items:[];
  const hasOutline=outlineItems.length>0;
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
    event.preventDefault();setActiveHeading(id);pendingAnchor.current=id;
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
  const actionProps={reading,setReading,active,hasReport,cancelling,onCancel,onRetry,retrying,onReuse,onDownload};
  const title=job.input?.question||job.question||'未命名研究';
  const overview=job.status==='queued'?'任务已排队':job.status==='running'
    ?(job.liveReport?.phase==='audit'?'正在复核研究草稿':job.liveReport?.phase==='formatting'?'正在整理研究报告':'研究正在进行')
    :job.status==='completed'?(hasReport?'报告已完成，可以查阅与导出':'研究已结束，未找到报告正文')
      :job.status==='failed'?'本次研究未完成':job.status==='cancelled'?'研究已取消':'研究记录';
  const overviewCopy=active?(events.at(-1)?.message||'任务进度将在这里更新。')
    :job.error||(job.status==='completed'&&hasReport?'结合审计记录和原始证据，一起阅读研究结论。':onRetry?'输入和执行记录已保留，可在当前详情页直接重试。':'输入和执行记录已保留，可复用输入重新研究。');
  return <section ref={section} className={'research-detail'+(reading?' rd-reading':'')} style={{'--rd-header-height':headerHeight+'px','--rd-toolbar-height':toolbarHeight+'px'}} aria-labelledby={prefix+'-title'}>
    <header className="rd-header" ref={header}>
      <div className="rd-title-row"><h1 id={prefix+'-title'} title={title}>{title}</h1><Status status={job.status}/></div>
      <div className="rd-desktop-tools"><ResearchActions {...actionProps}/></div>
      <div className="rd-mobile-tools">
        <Sheet open={actionsOpen} onOpenChange={setActionsOpen}><SheetTrigger asChild><Button variant="outline" size="sm" aria-label="打开研究操作"><BookOpen size={16}/>研究操作</Button></SheetTrigger><SheetContent side="right" className="research-detail rd-mobile-sheet"><SheetHeader><SheetTitle>研究操作</SheetTitle><SheetDescription>{onRetry?'切换阅读模式或直接重试本次研究。':'切换阅读模式、复用输入或导出正式报告。'}</SheetDescription></SheetHeader><ResearchActions {...actionProps} onNavigate={()=>setActionsOpen(false)}/></SheetContent></Sheet>
      </div>
    </header>
    <dl className="rd-meta">
      <div><dt>研究路径</dt><dd>{modes[job.mode]?.name||(job.mode==='auto'?'智能路由':job.plan?.name||'研究路径未记录')}</dd></div>
      {job.input?.depth&&<div><dt>{quick?'研究目标':'报告深度'}</dt><dd>{quick?'判断是否继续研究':depthLabels[job.input.depth]||job.input.depth}</dd></div>}
      {(job.plan?.historyYears||job.input?.historyYears)&&<div><dt>财报范围</dt><dd>近 {job.plan?.historyYears||job.input.historyYears} 年</dd></div>}
      <div><dt>创建时间</dt><dd>{formatDate(job.createdAt)}</dd></div>
      {job.lastRetriedAt&&<div><dt>最近重试</dt><dd>{formatDate(job.lastRetriedAt)}</dd></div>}
    </dl>
    {retrying&&<p className="rd-retry-status" role="status"><LoaderCircle size={16} className="rd-spin"/>正在重新提交研究，请稍候…</p>}
    {retryError&&<Alert ref={retryAlert} tabIndex={-1} variant="destructive" className="rd-retry-error"><CircleAlert size={17}/><AlertTitle>重试未能启动</AlertTitle><AlertDescription><p>{retryError}</p><p>原研究记录已保留，可以再次重试。</p>{onReuse&&<Button type="button" variant="ghost" onClick={onReuse}>修改研究输入</Button>}</AlertDescription></Alert>}
    <div className="rd-layout">
      <div className="rd-main-column">
        <section className={'rd-overview rd-overview-'+job.status} aria-label="研究进展">
          <span className="rd-overview-icon">{active?(job.status==='queued'?<Clock3 size={20}/>:<LoaderCircle size={20} className="rd-spin"/>):job.status==='failed'?<CircleAlert size={20}/>:job.status==='completed'?<Check size={20}/>:<Square size={18}/>}</span>
          <div className="rd-overview-copy"><strong>{screenState?.title||overview}</strong><p>{screenState?.text||overviewCopy}</p>{(quick||modeOf(job)==='B')&&job.error&&<p className="rd-screen-error">{job.error}</p>}</div>
          <div className="rd-overview-counts"><span><strong>{sources.length}</strong> 份资料</span><span><strong>{events.length}</strong> 条轨迹</span></div>
        </section>
        {streamConnection&&<p className="rd-connection" role="status"><Activity size={15} aria-hidden="true"/>{streamConnection}</p>}
        <ResearchProgress job={job}/>
        <Card className="rd-report-card" aria-label="研究内容">
          <Tabs value={currentTab} onValueChange={onTabChange} className="rd-tabs">
            <div ref={toolbar} className="rd-content-toolbar"><TabsList className="rd-tab-list" aria-label="研究详情内容">
              <TabsTrigger value="report"><FileText size={16}/>研究报告</TabsTrigger>
              <TabsTrigger value="audit"><ShieldCheck size={16}/>审计记录</TabsTrigger>
              <TabsTrigger value="sources"><Globe size={16}/>证据来源<Badge variant="secondary" className="rd-source-count">{sources.length}</Badge></TabsTrigger>
            </TabsList>
            <ReportDirectory compact={compact} open={directoryOpen} onOpenChange={setDirectoryOpen} items={outlineItems} activeId={activeHeading} onNavigate={navigateOutline} onCloseAutoFocus={finishDirectoryClose} reportHref={'/research/'+encodeURIComponent(job.id)}/></div>
            {warnings.length>0&&<section className="rd-warnings" aria-label="报告使用提示"><CircleAlert size={17} aria-hidden="true"/><div><strong>阅读提示</strong><ul>{warnings.map((warning,index)=><li key={index}>{warning}</li>)}</ul></div></section>}
            <TabsContent value="report" className="rd-panel" forceMount hidden={currentTab!=='report'}>{modeOf(job)==='B'&&<DeepResearchProcess key={job.retryCount??0} job={job} onSources={()=>onTabChange('sources')}/>}<ReportPanel job={job} prefix={prefix+'-report'} preview={preview} onRetry={onRetry} retrying={retrying} onReuse={onReuse} onUpdate={job.status==='completed'?onUpdate:undefined} onDeepen={job.status==='completed'?onDeepen:undefined} onOutline={updateOutline}/></TabsContent>
            <TabsContent value="audit" className="rd-panel"><AuditPanel job={job} prefix={prefix+'-audit'}/></TabsContent>
            <TabsContent value="sources" className="rd-panel" forceMount hidden={currentTab!=='sources'}><SourcesPanel key={job.retryCount??0} sources={sources} status={job.status}/></TabsContent>
          </Tabs>
        </Card>
      </div>
      <aside className="rd-right-rail" aria-label="研究执行记录" hidden={reading}><Trace key={job.retryCount??0} events={events} status={job.status} hidden={reading}/></aside>
    </div>
  </section>;
}

/**
 * Controlled tab: 'report' | 'audit' | 'sources'; onTabChange(nextTab) stays in
 * the parent so its URL/query parameters remain authoritative. Action callbacks
 * take no arguments; the parent owns requests, download content and errors.
 * onRetry restarts this record in place; onReuse only loads the workbench inputs.
 * streamConnection comes from useJobStream; cancelling/retrying/retryError are parent-owned.
 * All reading/search/expansion/filter state resets only when job.id changes.
 */
export default function ResearchDetail(props) {
  if (!props.job) return <section className="research-detail"><EmptyState title="尚未选择研究">打开一条研究记录后，可在这里阅读报告与执行过程。</EmptyState></section>;
  return <DetailView key={props.job.id} {...props}/>;
}
