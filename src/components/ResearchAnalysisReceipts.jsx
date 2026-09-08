import {researchAnalysisReceipts} from '../../shared/research-analysis-receipts.mjs';
import {useId,useState} from 'react';
import {Button} from './ui/button';
import './research-analysis-receipts.css';
const format=(v,digits=2)=>Number.isFinite(v)?v.toLocaleString('zh-CN',{maximumFractionDigits:digits,minimumFractionDigits:digits}):'未确认';
const percent=v=>Number.isFinite(v)?format(v*100)+'%':'未确认';
const list=v=>Array.isArray(v)?v:[];
function Grid({result}){
 const growth=list(result.growthRates).slice(0,5),discount=list(result.discountRates).slice(0,5),cells=list(result.cells);
 if(!growth.length||!discount.length)return <p>这次返回未保存可展示的网格，请查看实际记录。</p>;
 return <><p>基于调用 <code>{result.baseToolCallId}</code>，固定现金、股数与终值。每股价值 · {result.basis?.currency||'币种未记录'}。</p><div className="analysis-table-scroll" role="region" aria-label="估值敏感性表格" tabIndex={0}><table><caption>增长率 × 折现率</caption><thead><tr><th scope="col">增长率</th>{discount.map(d=><th scope="col" key={d}>折现 {percent(d)}</th>)}</tr></thead><tbody>{growth.map(g=><tr key={g}><th scope="row">{percent(g)}</th>{discount.map(d=>{const c=cells.find(c=>c.growth===g&&c.discount===d);return <td key={d} data-limited={Boolean(c?.error)} title={c?.error||'假设下的每股价值'}>{c?.error?'不可计算':format(c?.perShare)}</td>;})}</tr>)}</tbody></table></div></>;
}
function Dividends({result}){
 return <><dl className="analysis-metrics"><div><dt>TTM每股分红</dt><dd>{format(result.ttm?.dps,5)}</dd></div><div><dt>税前历史股息率</dt><dd>{percent(result.ttm?.yield)}</dd></div><div><dt>三年累计支付率</dt><dd>{percent(result.rollingThreeYears?.payout)}</dd></div></dl><p>分红金额按 {result.basis?.currency||'未记录币种'} 原单位展示；派息日已到不独立证明实际付款。</p><div className="analysis-table-scroll" role="region" aria-label="分红年度表格" tabIndex={0}><table><caption>按利润归属年度复算</caption><thead><tr><th scope="col">年度</th><th scope="col">每股分红</th><th scope="col">支付率</th><th scope="col">QuickFCF覆盖</th></tr></thead><tbody>{list(result.annual).slice(0,8).map(r=><tr key={r.year}><th scope="row">{r.year}</th><td>{format(r.dps,5)}</td><td>{percent(r.payout)}</td><td>{Number.isFinite(r.quickFcfCoverage)?format(r.quickFcfCoverage)+'倍':'未确认'}</td></tr>)}</tbody></table></div>{result.aggregateCheck?.status==='mismatch'&&<p className="analysis-result-warning">官方汇总与逐年重算不一致：现金差额 {format(result.aggregateCheck.cashDifference)}，年均利润差额 {format(result.aggregateCheck.profitDifference)}。差额使用原金额单位，需回查口径。</p>}{list(result.conflicts).length>0&&<p className="analysis-result-warning">{result.conflicts.length} 项最新版本冲突，相关值保留为空。</p>}</>;
}
function PayoutScenarios({result}){
 return <><p>假设支付率 {percent(result.payout)} · 规划期限：{result.policyThrough||'未记录'}</p><p>期后假设：{result.continuationAssumption||'未记录'}</p><ul className="analysis-scenario-list">{list(result.scenarios).slice(0,5).map(s=><li key={s.toolCallId}><strong>{s.label}</strong><span>每股分红 {list(s.dps).map(v=>format(v)).join(' — ')}；盈利依据 <code>{s.toolCallId}</code></span></li>)}</ul></>;
}
export default function ResearchAnalysisReceipts({job,onTrace}){
 const calls=researchAnalysisReceipts(job),[selection,setSelection]=useState(''),id=useId();
 const current=calls.find(c=>c.key===selection)||calls.at(-1),result=current?.result;
 if(!['B','F'].includes(job.mode||job.plan?.mode)&&!calls.length)return null;
 return <section className="research-analysis-receipts" aria-label="分红与敏感性核对"><header><div><h3>分红与敏感性核对</h3><p>读取实际计算返回，保留不同轮次与未解决的问题。</p></div>{onTrace&&<Button variant="outline" size="sm" onClick={()=>onTrace('tools')}>查看实际输入与返回</Button>}</header>{!calls.length?<p className="analysis-empty">本次尚无分红事件或敏感性专用工具记录；不根据报告文字补造计算结果。旧报告可继续查看原有模型与执行轨迹。</p>:<><label htmlFor={id}>选择计算记录</label><select id={id} value={current.key} onChange={e=>setSelection(e.target.value)}>{calls.map((c,i)=><option key={c.key} value={c.key}>{i+1}. {c.label} · {c.toolCallId||'编号未记录'}{c.status==='failed'?' · 失败':!c.hasReturn?' · 返回未齐':''}</option>)}</select><div className="analysis-receipt-body" aria-live="polite">{!current.hasReturn?<p>返回尚未保存；进行中或中断的调用不显示推测值。</p>:result?.error?<p className="analysis-result-warning">本次调用失败：{result.error}</p>:<>{result?.status==='incomplete'&&<p className="analysis-result-warning">返回中仍有缺值、冲突或不可用组合，请结合原文核对。</p>}{current.toolName==='calculate_shareholder_return'?<Dividends result={result||{}}/>:current.toolName==='calculate_dcf_sensitivity'?<Grid result={result||{}}/>:<PayoutScenarios result={result||{}}/>}<p className="analysis-result-notice">{result?.notice||'返回不代表事实已核实。'}</p></>}</div></>}</section>;
}
