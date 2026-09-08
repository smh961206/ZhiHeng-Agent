import {Button} from './ui/button';
import {Badge} from './ui/badge';
import {researchSecurityDisplay} from '../../shared/security-display.mjs';
const checkLabels={period:'财报期间',amounts:'金额口径',ratios:'比率适配',prices:'行情时点与币种',roeHistory:'ROE统计窗口'};
export default function ComparisonResults({job,onSources,exchanges={}}){
 const records=(job.events??[]).filter(e=>e.type==='tool_result'&&e.toolName==='calculate_comparison');
 const latest=records.at(-1),checks=latest&&!latest.result?.error?latest.result?.checks:null;
 const decisions=job.status==='completed'?job.result?.comparisonDecisions:null;
 const securities=job.input?.securities??job.plan?.securities??[];
 const display=value=>researchSecurityDisplay(job,value,exchanges);
 return <section className="rd-comparison" aria-label="多公司比较结果">
  <h3>比较范围与各公司判断</h3>
  <p className="rd-muted">{securities.map(s=>display(s).name).join(' · ')}。质量、价格吸引力与研究优先级分别判断。</p>
  {Array.isArray(checks)&&<details className="rd-comparison-checks"><summary>查看最近一次计算的可比口径记录</summary><p className="rd-muted">口径一致只表示输入可并列核对，不能代替财务事实与模型适配复核。</p><ul>{checks.map(check=><li key={check.id}><strong>{checkLabels[check.id]||check.id} · {check.comparable?'口径一致':'存在限制'}</strong><p>{check.reason}</p></li>)}</ul></details>}
  {latest?.result?.error&&<p role="status" className="rd-muted">最近一次比较核算未完成，请查看执行轨迹中的失败原因。</p>}
  {Array.isArray(decisions)&&decisions.length?<div className="rd-comparison-grid">{decisions.map(row=><article key={row.security}>
   <h4>{display(row.security).name}</h4><small>{display(row.security).code}</small><div className="rd-decision-tags"><Badge>{row.action}</Badge><Badge variant="outline">置信度 · {row.confidence}</Badge></div>
   <p>{row.summary}</p><p className="rd-muted">待核实：{row.unresolved}</p><strong>什么会改变判断</strong><ul>{row.falsifiers?.map((text,i)=><li key={i}>{text}</li>)}</ul>
   {row.sourceIds?.length>0&&<Button variant="link" className="rd-comparison-sources" onClick={onSources}>查看依据 {row.sourceIds.join('、')}</Button>}
  </article>)}</div>:<p className="rd-muted">{['queued','running'].includes(job.status)?'逐家公司判断将在复核完成后显示，当前计算记录不代表正式结论。':'此记录未保存逐家公司判断卡片，请结合正式报告、审计及来源阅读。'}</p>}
 </section>;
}
