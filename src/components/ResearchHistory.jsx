import {useRef, useState} from 'react';
import {Link, useSearchParams} from 'react-router';
import {AlertCircle, ArrowRight, CheckCheck, ChevronLeft, ChevronRight, FileText, History, LoaderCircle, Plus, RefreshCw, Search, X} from 'lucide-react';
import {modeLabels, modeOf, modeLabel} from '../lib/research-mode';
import {Button} from './ui/button';
import {Badge} from './ui/badge';
import {Card} from './ui/card';
import {Input} from './ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from './ui/select';
import {Skeleton} from './ui/skeleton';
import {useSecurityExchanges} from '../hooks/use-security-exchanges';
import {securityDisplayLabel} from '../../shared/security-display.mjs';

const PAGE_SIZE = 8;
const groups = [['all', '全部'], ['active', '进行中'], ['completed', '已完成'], ['failed', '失败'], ['cancelled', '已取消']];
const statusLabels = {queued: '等待中', running: '研究中', completed: '已完成', failed: '失败', cancelled: '已取消'};
const dateFormatter = new Intl.DateTimeFormat('zh-CN', {year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false});
const matchesStatus = (job, status) => status === 'all' || (status === 'active' ? ['queued', 'running'].includes(job.status) : job.status === status);
const titleOf = job => job.question || job.input?.question || '未命名研究';
const dateOf = value => value ? new Date(value) : new Date(NaN);
const errorMessage = error => typeof error === 'string' ? error : error?.message || '暂时无法获取研究记录，请稍后重试。';

function Highlight({text, terms}) {
  if (!terms.length) return text;
  const escaped = terms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).sort((a,b)=>b.length-a.length);
  return String(text).split(new RegExp('(' + escaped.join('|') + ')', 'ig'))
    .map((part,index)=>index%2?<mark key={index}>{part}</mark>:part);
}

function securitiesOf(job) {
  // Storage keeps plan in list summaries; input is only available in detail responses.
  const securities = job.plan?.securities ?? job.securities ?? job.input?.securities;
  return Array.isArray(securities) ? securities : [];
}

function searchableText(job, exchanges) {
  return [titleOf(job), modeOf(job), modeLabel(job), job.researchOutcome?.action, job.researchOutcome?.confidence, ...securitiesOf(job).flatMap(security =>
    [securityDisplayLabel(security, exchanges), ...(typeof security === 'string' ? [security] : [security?.name, security?.symbol, security?.ticker, security?.market])]
  )].filter(Boolean).join(' ').toLocaleLowerCase();
}

function FallbackStatus({status}) {
  return <Badge variant="outline" className="rh-status" data-status={status}>{statusLabels[status] || '状态未知'}</Badge>;
}

// The legacy onOpen prop may still be passed; Link continues to own navigation, including new tabs.
export default function ResearchHistory({jobs = [], onStart, renderDelete, Status = FallbackStatus, opening, jobsLoading = false, jobsError, onRefresh}) {
  const exchanges = useSecurityExchanges(jobs);
  const [params, setParams] = useSearchParams();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(null);
  const [refreshed, setRefreshed] = useState(false);
  const refreshInFlight = useRef(false);
  const resultsHeading = useRef(null);
  const searchInput = useRef(null);
  const records = Array.isArray(jobs) ? jobs.filter(job => job?.id != null) : [];
  const query = params.get('q') || '';
  const status = groups.some(([key]) => key === params.get('status')) ? params.get('status') : 'all';
  const mode = Object.hasOwn(modeLabels, params.get('mode')) ? params.get('mode') : 'all';
  const order = params.get('sort') === 'oldest' ? 'oldest' : 'newest';
  const requestedPage = Number(params.get('page'));
  const index = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const busy = jobsLoading || refreshing;
  const error = refreshError || jobsError;
  const initialLoading = busy && !records.length;
  const hasFilters = Boolean(query.trim()) || status !== 'all' || mode !== 'all';
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const searched = records.filter(job => {
    const text = searchableText(job, exchanges);
    return terms.every(term => text.includes(term));
  });
  const modeFiltered = searched.filter(job => mode === 'all' || modeOf(job) === mode);
  const counts = Object.fromEntries(groups.map(([key]) => [key, modeFiltered.filter(job => matchesStatus(job, key)).length]));
  const filtered = modeFiltered.filter(job => matchesStatus(job, status)).sort((a, b) => {
    const first = dateOf(a.createdAt).getTime(), second = dateOf(b.createdAt).getTime();
    // Records without a usable date stay last in both sort directions.
    if (!Number.isFinite(first)) return Number.isFinite(second) ? 1 : 0;
    if (!Number.isFinite(second)) return -1;
    return order === 'newest' ? second - first : first - second;
  });
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(index, pages);
  const start = (current - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);
  const unavailable = !records.length && (busy || Boolean(error));

  function update(values) {
    setParams(currentParams => {
      const next = new URLSearchParams(currentParams);
      for (const [key, value] of Object.entries(values)) {
        if (value == null || value === '') next.delete(key);
        else next.set(key, String(value));
      }
      return next;
    }, {replace: true});
    setRefreshed(false);
  }

  function clear() {
    update({q: null, status: null, mode: null, page: null});
    searchInput.current?.focus();
  }

  function changePage(page) {
    update({page: page === 1 ? null : page});
    resultsHeading.current?.focus({preventScroll: true});
    resultsHeading.current?.scrollIntoView({block: 'nearest'});
  }

  async function refresh() {
    if (!onRefresh || busy || refreshInFlight.current) return;
    refreshInFlight.current = true;
    setRefreshing(true);
    setRefreshError(null);
    setRefreshed(false);
    try {
      await onRefresh();
      setRefreshed(true);
    } catch (cause) {
      setRefreshError(errorMessage(cause));
    } finally {
      refreshInFlight.current = false;
      setRefreshing(false);
    }
  }

  return <section className="history-page research-history" aria-label="研究记录">
    <header className="rh-heading">
      <div><h1>研究记录</h1><p>留存每一次判断，连接下一次思考。</p></div>
      <Button type="button" onClick={() => onStart?.()} className="rh-create"><Plus size={17} aria-hidden="true"/>新建研究</Button>
    </header>

    <Card className="rh-surface gap-0 py-0">
      <div className="rh-toolbar">
        <div className="rh-search">
          <Search size={18} aria-hidden="true"/>
          <Input ref={searchInput} type="search" aria-label="搜索研究问题、模式或标的" placeholder="搜索问题、研究模式或标的" value={query} onChange={event => update({q: event.target.value, page: null})}
            onKeyDown={event=>{if(event.key==='Escape'&&query){event.preventDefault();update({q:null,page:null});}}}/>
          {query && <Button type="button" variant="ghost" size="icon-lg" aria-label="清空搜索" onClick={() => {update({q: null, page: null}); searchInput.current?.focus();}}><X size={16} aria-hidden="true"/></Button>}
        </div>
        <div className="rh-tools">
          <Select value={mode} onValueChange={value => update({mode: value === 'all' ? null : value, page: null})}>
            <SelectTrigger aria-label="按研究模式筛选" className="rh-mode-filter" data-active={mode !== 'all'}><SelectValue/></SelectTrigger>
            <SelectContent><SelectItem value="all">全部研究模式</SelectItem>{Object.entries(modeLabels).map(([id, label]) => <SelectItem value={id} key={id}>{label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={order} onValueChange={value => update({sort: value === 'newest' ? null : value, page: null})}>
            <SelectTrigger aria-label="研究排序" className="rh-sort"><SelectValue/></SelectTrigger>
            <SelectContent><SelectItem value="newest">最新创建优先</SelectItem><SelectItem value="oldest">最早创建优先</SelectItem></SelectContent>
          </Select>
          {onRefresh && <Button type="button" variant="outline" className="rh-refresh" disabled={busy} onClick={refresh} aria-label={busy ? '正在刷新研究记录' : '刷新研究记录'}><RefreshCw size={16} className={busy ? 'rh-spin' : undefined} aria-hidden="true"/><span>刷新</span></Button>}
        </div>
      </div>

      <div className="rh-filters" role="group" aria-label="按研究状态筛选">
        {groups.map(([key, label]) => <Button type="button" variant={status === key ? 'secondary' : 'ghost'} size="sm" key={key} aria-pressed={status === key} onClick={() => update({status: key === 'all' ? null : key, page: null})}>{label}<Badge variant={status === key ? 'default' : 'secondary'} className="rh-filter-count">{unavailable ? '—' : counts[key]}</Badge></Button>)}
      </div>

      {error && <div className="rh-error" role="alert">
        <AlertCircle size={19} aria-hidden="true"/>
        <div><strong>{records.length ? '记录更新失败' : '研究记录加载失败'}</strong><p>{errorMessage(error)}</p>{records.length > 0 && <p>已保留上次获取的记录，可继续查看。</p>}</div>
        {onRefresh && <Button type="button" variant="outline" size="sm" disabled={busy} onClick={refresh}>{busy ? '正在重试…' : '重试'}</Button>}
      </div>}

      <div className="rh-results-heading" ref={resultsHeading} tabIndex={-1}>
        <p className="rh-results-note" role="status" aria-live="polite" aria-atomic="true">
          {busy ? <><LoaderCircle size={14} className="rh-spin" aria-hidden="true"/>{records.length ? '正在更新，当前显示上次获取的记录…' : '正在加载研究记录…'}</> : !records.length && error ? '记录暂不可用' : <>
            {refreshed && !error && <span className="rh-refreshed"><CheckCheck size={14} aria-hidden="true"/>已刷新</span>}
            <span>{hasFilters ? <>找到 <strong>{filtered.length}</strong> 项匹配研究 / 共 {records.length} 项</> : <>共 <strong>{records.length}</strong> 项研究</>}</span>
            {status !== 'all' && <span className="rh-query">{groups.find(([key]) => key === status)[1]}</span>}
            {mode !== 'all' && <span className="rh-query">{modeLabels[mode]}</span>}
            {query.trim() && <span className="rh-query">搜索“{query.trim()}”</span>}
          </>}
        </p>
        {hasFilters && <Button type="button" variant="ghost" size="sm" className="rh-clear" onClick={clear}><X size={13} aria-hidden="true"/>清除筛选</Button>}
      </div>

      <div className="rh-results" aria-busy={busy}>
        {initialLoading ? <div className="rh-skeletons" aria-hidden="true">{Array.from({length: 4}, (_, index) => <div className="rh-skeleton-row" key={index}><Skeleton className="rh-skeleton-icon"/><div><Skeleton className="rh-skeleton-title"/><Skeleton className="rh-skeleton-meta"/></div><Skeleton className="rh-skeleton-status"/></div>)}</div> : visible.length > 0 ? <ul className="rh-list" aria-label="研究记录列表">
          {visible.map(job => {
            const created = dateOf(job.createdAt);
            const validDate = Number.isFinite(created.getTime());
            const sourceCount = job.sourceCount ?? job.input?.sources?.length ?? 0;
            const securities = securitiesOf(job).map(security => securityDisplayLabel(security, exchanges)).filter(Boolean);
            const recordMode = modeOf(job);
            return <li className="rh-row" key={job.id} data-status={job.status}>
              <Link className="rh-open" to={'/research/' + encodeURIComponent(job.id)} aria-busy={opening === job.id}>
                <div className="rh-row-copy">
                  <div className="rh-title-row"><strong className="rh-title" title={titleOf(job)}><Highlight text={titleOf(job)} terms={terms}/></strong><Badge variant="outline" className="rh-mode" data-mode={recordMode}><Highlight text={modeLabel(job)} terms={terms}/></Badge></div>
                  <div className="rh-meta">{job.researchOutcome?.action&&<Badge variant="secondary" className="rh-outcome" title={'研究判断 · 置信度 '+job.researchOutcome.confidence}><Highlight text={job.researchOutcome.action} terms={terms}/></Badge>}{securities.length > 0 && <span className="rh-securities" title={securities.join(' · ')}>{securities.map((symbol, index) => <span className="rh-security" key={index} title={symbol.startsWith('US:')?symbol+' · 交易所信息待核实':symbol}>{index > 0 && ' · '}<Highlight text={symbol} terms={terms}/></span>)}</span>}<span className="rh-source-total"><FileText size={13} aria-hidden="true"/>{sourceCount} 份资料</span></div>
                </div>
                <span className="rh-created"><span>创建时间</span><time className="rh-time" dateTime={validDate ? created.toISOString() : undefined} title={validDate ? dateFormatter.format(created) : undefined}>{validDate ? dateFormatter.format(created) : '时间未记录'}</time></span>
                <span className="rh-row-state"><Status status={job.status}/></span>
              </Link>
              {renderDelete && <div className="rh-delete">{renderDelete(job)}</div>}
            </li>;
          })}
        </ul> : (records.length > 0 || (!error && !busy)) && <div className="rh-empty">
          <span className="rh-empty-icon">{records.length ? <Search size={29} aria-hidden="true"/> : <History size={29} aria-hidden="true"/>}</span>
          <h2>{records.length ? '没有找到匹配的研究' : '从第一项研究开始积累'}</h2>
          <p>{records.length ? '试试公司名称、证券代码或研究模式，也可以清除筛选重新查找。' : '研究报告、证据来源与执行过程，都会在这里为你留存。'}</p>
          <Button type="button" variant={records.length ? 'outline' : 'default'} onClick={records.length ? clear : () => onStart?.()}>{records.length ? '清除筛选' : '开始第一项研究'}<ArrowRight size={16} aria-hidden="true"/></Button>
        </div>}
      </div>

      {filtered.length > 0 && <nav className="rh-pagination" aria-label="研究记录分页">
        <span>显示 {start + 1}–{Math.min(start + PAGE_SIZE, filtered.length)} 项，共 {filtered.length} 项<span className="rh-page-size"> · 每页 {PAGE_SIZE} 项</span></span>
        <div><Button type="button" variant="outline" size="sm" disabled={current === 1} onClick={() => changePage(current - 1)} aria-label="上一页研究记录"><ChevronLeft size={16} aria-hidden="true"/><span>上一页</span></Button><span className="rh-page-number" aria-live="polite">{current} / {pages}</span><Button type="button" variant="outline" size="sm" disabled={current === pages} onClick={() => changePage(current + 1)} aria-label="下一页研究记录"><span>下一页</span><ChevronRight size={16} aria-hidden="true"/></Button></div>
      </nav>}
    </Card>
  </section>;
}
