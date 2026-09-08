import {useState} from 'react';
import {ArrowUpRight,CircleAlert,ShieldCheck} from 'lucide-react';
import {Button} from './ui/button';
import './execution-ui.css';

const states={passed:'已检查',limited:'存在限制',not_applicable:'不适用',failed:'未通过'};
const priority={failed:0,limited:1,passed:2,not_applicable:3};
export default function ExecutionReview({items,onSource}){
 const [filter,setFilter]=useState('all');
 const counts=items.reduce((totals,item)=>({...totals,[item.status]:(totals[item.status]||0)+1}),{});
 const attention=(counts.limited||0)+(counts.failed||0);
 const ordered=[...items].sort((a,b)=>(priority[a.status]??1)-(priority[b.status]??1));
 const visible=filter==='all'?ordered:ordered.filter(item=>item.status===filter);
 const filters=[['all','全部'],...(counts.failed?[['failed','未通过']]:[]),['limited','存在限制'],['passed','已检查'],['not_applicable','不适用']];
 return <section className="rd-execution-review" tabIndex={-1} aria-label="执行纪律复核">
  <header><h3>执行纪律复核</h3><span>{items.length} 项检查</span></header>
  <div className="execution-review-overview" data-attention={attention>0}>
   {attention?<CircleAlert size={20} aria-hidden="true"/>:<ShieldCheck size={20} aria-hidden="true"/>}
   <div><strong>{attention?`${attention} 项需要关注`:'本次复核未标记限制项'}</strong><p>{attention?'限制与未通过事项优先展示，点击证据可回查原始资料。':'可逐项查看适用范围、复核说明与引用资料。'}</p></div>
  </div>
  <p className="execution-review-disclaimer">以下为模型基于本次证据的复核，不代表人工审计通过。</p>
  <div className="execution-review-filters" role="group" aria-label="筛选执行复核">{filters.map(([id,label])=><Button key={id} type="button" variant="ghost" aria-pressed={filter===id} onClick={()=>setFilter(id)}>{label} <span className="execution-filter-count">{id==='all'?items.length:counts[id]||0}</span></Button>)}</div>
  {visible.length>0?<div className="execution-review-items">{visible.map(item=><article key={item.id} className="execution-review-item" data-status={item.status}>
   <div><h4>{item.title}</h4><span className="execution-review-state">{states[item.status]||'未记录'}</span></div><p>{item.reason}</p>
   {item.sourceIds?.length>0&&<nav className="execution-review-sources" aria-label={item.title+'的证据'}>{item.sourceIds.map(id=><Button key={id} type="button" variant="link" onClick={()=>onSource(id)} aria-label={'查看执行复核证据 '+id}>查看证据 {id}<ArrowUpRight size={13}/></Button>)}</nav>}
  </article>)}</div>:<div className="execution-review-empty"><p>本次没有“{states[filter]}”项目</p><Button type="button" variant="outline" onClick={()=>setFilter('all')}>查看全部检查</Button></div>}
  <span role="status" className="sr-only">当前显示 {visible.length} 项</span>
 </section>;
}
