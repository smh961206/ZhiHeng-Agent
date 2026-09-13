import {useEffect,useState} from 'react';
import {ChevronDown,ReceiptText} from 'lucide-react';
import {Button} from './ui/button';
const amount=n=>n===null||n===undefined?'未记录':n>0&&n<0.000001?'小于 0.000001':new Intl.NumberFormat('zh-CN',{maximumFractionDigits:6}).format(n);
const purposes={research:'历史研究分析',review:'历史独立复核',followup:'历史补充研究',router:'历史任务识别',input:'Input · 输入理解',vision:'Vision · 原页读取',researcher:'研究',writer:'写作','evidence-verifier':'证据核验',auditor:'审计','critical-review':'关键复核',judge:'Judge · 证据裁决'};
export default function ResearchCostSummary({job}){
 const [open,setOpen]=useState(false),[state,setState]=useState({status:'idle'}),[revision,setRevision]=useState(0);
 useEffect(()=>{
  if(!open||!job.id)return;
  const controller=new AbortController();setState({status:'loading'});
  fetch(`/api/jobs/${encodeURIComponent(job.id)}/cost`,{signal:controller.signal}).then(async response=>{
   if(!response.ok)throw new Error(response.status===404?'当前服务未提供本次费用记录':'费用记录暂时无法加载');
   const value=await response.json();if(value.version!==1||!Array.isArray(value.billing)||!Array.isArray(value.byPurpose))throw new Error('费用记录格式暂不支持');
   if(!controller.signal.aborted)setState({status:'ready',value});
  }).catch(error=>{if(!controller.signal.aborted)setState({status:'error',message:error.message});});
  return ()=>controller.abort();
 },[open,job.id,job.status,revision]);
 const data=state.value;
 return <details className="rd-cost-summary" onToggle={event=>setOpen(event.currentTarget.open)}>
  <summary><span className="rd-document-icon"><ReceiptText size={18}/></span><span className="rd-document-heading"><strong>模型费用与缓存</strong><span>查看已记录的模型费用、调用次数和缓存用量</span></span><ChevronDown size={16} className="rd-document-chevron"/></summary>
  <div className="rd-document-body" aria-live="polite">
   {state.status==='loading'&&<p>正在读取费用记录…</p>}
   {state.status==='error'&&<p role="status">{state.message}；未知费用不会记为零。</p>}
   {data&&<>
    <p>{data.calls?`已记录 ${data.calls} 次模型调用。`:'本次没有已记录的模型费用。'}{data.complete?'以下为记录内的模型费用估算。':'记录不完整，以下已知费用不能视为任务总费用。'}</p>
    <dl className="rd-model-records" aria-label="已记录模型费用">{data.billing.length?data.billing.map(b=><div key={b.currency}><dt>{b.currency} · 已知估算</dt><dd>{amount(b.knownEstimatedCost)}</dd></div>):<div><dt>模型费用</dt><dd>未知</dd></div>}<div><dt>费用未知的调用</dt><dd>{data.unknownBillingCalls??'未记录'}</dd></div></dl>
    {data.byPurpose?.length>0&&<ul className="rd-cost-breakdown" aria-label="按研究环节统计的模型费用">{data.byPurpose.map((r,i)=><li key={i}><strong>{purposes[r.purpose]??'未识别环节'}</strong><span>{r.calls} 次{(r.billing??[]).map(b=>` · ${b.currency} ${amount(b.knownEstimatedCost)}`).join('')}{r.unknownBillingCalls>0?` · ${r.unknownBillingCalls} 次费用未知`:''}</span></li>)}</ul>}
    <p>缓存输入用量：{amount(data.cache?.cachedInputTokens)} token；{data.cache?.unknownCalls??'未记录'} 次调用缺少缓存用量。历史缓存命中不保证后续命中。</p>
    {data.notice&&<p className="rd-model-history-note">{data.notice}</p>}
   </>}
   <Button type="button" variant="outline" size="sm" disabled={state.status==='loading'} onClick={()=>setRevision(v=>v+1)}>刷新费用记录</Button>
  </div>
 </details>;
}
