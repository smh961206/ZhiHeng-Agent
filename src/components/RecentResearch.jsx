import {useEffect,useRef} from 'react';
import {Link} from 'react-router';
import {Check, ChevronRight, CircleAlert, Clock3, LoaderCircle, Minus} from 'lucide-react';
import {Button} from './ui/button';
import {Badge} from './ui/badge';
import {deliveryProgress} from '../../shared/research-delivery.mjs';

const statuses = {
  queued: {label: '等待中', Icon: Clock3},
  running: {label: '研究中', Icon: LoaderCircle},
  completed: {label: '已完成', Icon: Check},
  failed: {label: '失败', Icon: CircleAlert},
  cancelled: {label: '已取消', Icon: Minus},
};
const fullDate = new Intl.DateTimeFormat('zh-CN', {year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false});
const timestamp = job => job.createdAt ? new Date(job.createdAt).getTime() : NaN;

function readableDate(date, now) {
  if (date.toDateString() === now.toDateString()) return '今天 ' + date.toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit', hour12: false});
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return '昨天';
  return date.toLocaleDateString('zh-CN', {year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric', month: '2-digit', day: '2-digit'});
}

/** onNavigate runs after an ordinary Link navigation, including the "全部" link. */
export default function RecentResearch({jobs = [], currentId, onNavigate}) {
  const recent = (Array.isArray(jobs) ? jobs : []).filter(job => job?.id != null).slice().sort((a, b) => {
    const first = timestamp(a), second = timestamp(b);
    if (!Number.isFinite(first)) return Number.isFinite(second) ? 1 : 0;
    if (!Number.isFinite(second)) return -1;
    return second - first;
  }).slice(0, 4);
  const list=useRef(null);
  const recentIds=recent.map(job=>job.id).join(',');
  useEffect(()=>{
    const container=list.current;
    if(!container)return;
    function revealCurrent(){
      const active=container.querySelector('[aria-current="page"]');
      if(!active||!container.clientHeight)return;
      const bounds=container.getBoundingClientRect(),item=active.getBoundingClientRect();
      // Scroll only the recent list; keep the page and fixed navigation in place.
      if(item.height>bounds.height-12||item.top<bounds.top+6)container.scrollTop+=item.top-bounds.top-6;
      else if(item.bottom>bounds.bottom-6)container.scrollTop+=item.bottom-bounds.bottom+6;
    }
    revealCurrent();
    const resize=new ResizeObserver(revealCurrent);
    resize.observe(container);
    return()=>resize.disconnect();
  },[currentId,recentIds]);
  if (!recent.length) return null;
  const now = new Date();

  function afterNavigation(event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || (event.currentTarget.target && event.currentTarget.target !== '_self')) return;
    // React Router handles Link after onClick. Defer drawer closing so it cannot unmount the link first.
    // Modified clicks preserve new-tab/window behavior and leave the current drawer open.
    queueMicrotask(() => {if (event.defaultPrevented) onNavigate?.();});
  }

  return <section className="recent-research" aria-label="最近研究">
    <div className="rr-heading"><h2>最近研究</h2><Button asChild variant="ghost" size="sm"><Link to="/history" onClick={afterNavigation} aria-label="查看全部研究记录">全部<ChevronRight size={14} aria-hidden="true"/></Link></Button></div>
    <ul ref={list} className="rr-list" tabIndex={0} aria-label="最近研究列表">
      {recent.map(job => {
        const state = statuses[job.status] || {label: '状态未知', Icon: Clock3};
        const label=deliveryProgress(job)?.label||state.label,Icon=state.Icon;
        const created = new Date(timestamp(job));
        const validDate = Number.isFinite(created.getTime());
        const title = (job.question || job.input?.question || '未命名研究').trimEnd();
        return <li key={job.id}><Button asChild variant="ghost"><Link className="rr-link" to={'/research/' + encodeURIComponent(job.id)} title={title} aria-current={currentId === job.id ? 'page' : undefined} onClick={afterNavigation}>
          <span className="rr-title-row"><span className="rr-title">{title}</span><ChevronRight className="rr-open-icon" size={15} aria-hidden="true"/></span>
          <span className="rr-meta"><Badge variant="outline" className="rr-status" data-status={job.status}><Icon size={13} className={job.status === 'running' ? 'rr-spin' : undefined} aria-hidden="true"/>{label}</Badge>{job.researchOutcome?.action&&<span className="rr-outcome" title={'研究判断 · 置信度 '+job.researchOutcome.confidence}>{job.researchOutcome.action}</span>}<time dateTime={validDate ? created.toISOString() : undefined} title={validDate ? '创建于 ' + fullDate.format(created) : undefined}>{validDate ? readableDate(created, now) : '时间未记录'}</time></span>
        </Link></Button></li>;
      })}
    </ul>
  </section>;
}
