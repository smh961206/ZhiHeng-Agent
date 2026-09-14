import {useEffect,useState} from 'react';
import {ReceiptText} from 'lucide-react';
import {Button} from './ui/button';
const amount=n=>n===null||n===undefined?'未记录':n>0&&n<0.000001?'小于 0.000001':new Intl.NumberFormat('zh-CN',{maximumFractionDigits:6}).format(n);
const tokenAmount=value=>value?.knownTotal===null||value?.knownTotal===undefined?'未记录':new Intl.NumberFormat('zh-CN').format(value.knownTotal);
const tokenNotice=value=>value?.unknownCalls>0?` · ${value.unknownCalls} 次未知`:'';
const purposes={research:'历史研究分析',review:'历史独立复核',followup:'历史补充研究',router:'历史任务识别',input:'问题理解',vision:'原页读取',researcher:'研究分析',writer:'报告整理','evidence-verifier':'证据核验',auditor:'交付复核','critical-review':'关键复核',judge:'分歧裁决'};
export default function ResearchCostSummary({job}){
 const [state,setState]=useState({status:'idle'}),[revision,setRevision]=useState(0);
 useEffect(()=>{
  if(!job.id||revision===0)return;
  const controller=new AbortController();setState({status:'loading'});
  fetch(`/api/jobs/${encodeURIComponent(job.id)}/cost`,{signal:controller.signal}).then(async response=>{
   if(!response.ok)throw new Error(response.status===404?'当前服务未提供本次费用记录':'费用记录暂时无法加载');
   const value=await response.json();if(![1,2].includes(value.version)||!Array.isArray(value.billing)||!Array.isArray(value.byPurpose))throw new Error('费用记录格式暂不支持');
   if(!controller.signal.aborted)setState({status:'ready',value});
  }).catch(error=>{if(!controller.signal.aborted)setState({status:'error',message:error.message});});
  return ()=>controller.abort();
 },[job.id,job.status,revision]);
 const data=state.value;
 const summaryStatus=state.status==='ready'?(!data?.calls?'无调用记录':`${data.calls} 次调用`):state.status==='loading'?'读取中':state.status==='error'?'读取失败':'未读取';
 return <section className="rd-cost-summary" aria-label="服务调用与用量">
  <header className="rd-document-summary"><span className="rd-document-icon"><ReceiptText size={18}/></span><span className="rd-document-heading"><strong>实际调用</strong><span>读取本次研究的调用次数、用量与费用</span></span><span className={`rd-document-label rd-cost-state is-${state.status}`}>{summaryStatus}</span></header>
  <div className="rd-document-body" aria-live="polite">
   {state.status==='idle'&&<p>用量记录按需读取，读取操作不会影响研究结果。</p>}
   {state.status==='loading'&&<p>正在读取本次模型调用记录…</p>}
   {state.status==='error'&&<p role="status">{state.message}；未知 Token 或费用不会记为零。</p>}
   {data&&<>
    <p>{data.calls?`已记录 ${data.calls} 次模型调用，以下数据来自这项研究保存的调用记录。`:'该历史任务没有可读取的模型调用记录，无法从报告反推 Token 和费用。'}{data.calls&&!data.complete?' 仍有未知用量或价格，已知部分不能视为任务总量。':''}</p>
    <dl className="rd-usage-overview" aria-label="服务调用与用量汇总"><div><dt>处理次数</dt><dd>{data.calls||'无记录'}</dd></div><div><dt>输入用量</dt><dd>{tokenAmount(data.usage?.inputTokens)}{tokenNotice(data.usage?.inputTokens)}</dd></div><div><dt>输出用量</dt><dd>{tokenAmount(data.usage?.outputTokens)}{tokenNotice(data.usage?.outputTokens)}</dd></div><div><dt>缓存用量</dt><dd>{tokenAmount(data.usage?.cachedInputTokens)}{tokenNotice(data.usage?.cachedInputTokens)}</dd></div></dl>
    <div className="rd-cost-billing"><strong>费用记录</strong><dl className="rd-model-records">{data.billing.length?data.billing.map(b=><div key={b.currency}><dt>{b.currency} · 已知估算</dt><dd>{amount(b.knownEstimatedCost)}</dd></div>):<div><dt>模型费用</dt><dd>未知</dd></div>}<div><dt>费用未知的调用</dt><dd>{data.unknownBillingCalls??'未记录'}</dd></div></dl></div>
    {data.budget&&<div className="rd-cost-billing"><strong>研究预算账本</strong><dl className="rd-model-records"><div><dt>运行方式</dt><dd>{data.budget.mode==='enforce'?'达到上限时停止新调用':'仅记录，不阻断'}</dd></div><div><dt>模型调用</dt><dd>{data.budget.counts?.model??0}</dd></div><div><dt>工具轮次</dt><dd>{data.budget.counts?.toolRound??0}</dd></div><div><dt>网页请求</dt><dd>{data.budget.counts?.webRequest??0}</dd></div><div><dt>视觉页数</dt><dd>{data.budget.counts?.visionPage??0}</dd></div><div><dt>预算决策</dt><dd>{data.budget.decisions?.length??0}</dd></div></dl></div>}
    {data.byPurpose?.length>0&&<ul className="rd-cost-breakdown" aria-label="按研究环节统计的模型用量">{data.byPurpose.map((r,i)=><li key={i}><strong>{purposes[r.purpose]??'未识别环节'}</strong><span>{r.calls} 次 · 输入 {tokenAmount(r.usage?.inputTokens)} · 输出 {tokenAmount(r.usage?.outputTokens)}{tokenNotice(r.usage?.totalTokens)}{(r.billing??[]).map(b=>` · ${b.currency} ${amount(b.knownEstimatedCost)}`).join('')}{r.unknownBillingCalls>0?` · ${r.unknownBillingCalls} 次费用未知`:''}</span></li>)}</ul>}
    {data.promptEfficiency?.length>0&&<div className="rd-cost-billing"><strong>Prompt 上下文效率</strong><dl className="rd-model-records">{data.promptEfficiency.map(row=><div key={row.promptId}><dt>{row.promptId}</dt><dd>{row.calls} 次 · 平均 {row.averageSerializedCharacters??'未知'} 字符{row.requiredIncompleteCalls?` · ${row.requiredIncompleteCalls} 次必需上下文不完整`:''}</dd></div>)}</dl></div>}
    <p>文本用量按服务返回的 Token 统计；历史缓存不保证后续仍然命中。预算关闭时这里仅记录实际用量；预算强制模式会在新资源调用前检查上限。</p>
    {data.notice&&<p className="rd-model-history-note">{data.notice}</p>}
   </>}
   <Button type="button" variant="outline" size="sm" disabled={state.status==='loading'} onClick={()=>setRevision(v=>v+1)}>{state.status==='idle'?'读取用量记录':'刷新用量记录'}</Button>
  </div>
 </section>;
}
