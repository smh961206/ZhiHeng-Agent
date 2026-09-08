import {recordedFinancialCoverage,coverageFieldLabels} from '../../shared/financial-coverage.mjs';
import {researchToolCalls} from '../../shared/research-record.mjs';
export default function FinancialCoverage({job}){
 const receipts=recordedFinancialCoverage(researchToolCalls(job.events,job.status));
 return <section className="financial-coverage" aria-label="财务数值覆盖">
  <div className="financial-coverage-heading"><h4>财务数值覆盖</h4><span>{receipts.length?`${receipts.length} 次返回`:'未记录'}</span></div>
  <div className="financial-coverage-body">
  {!receipts.length?<p>尚无数值覆盖返回，不根据已读财报份数推定齐全。</p>:receipts.map((r,index)=><section className="financial-coverage-receipt" key={index}>
   <h5>{r.toolCallId||'编号未记录'} · 年度 {r.coverage.annual.complete}/5 · 季度 {r.coverage.quarters.complete}/8 输入齐全</h5>
   <p>{r.coverage.notice}</p>
   <p>年度截至 {r.coverage.anchor.annualEnd||'未记录'}；最晚输入期间 {r.coverage.anchor.latestPeriodEnd||'未记录'}。</p>
   <ul>{[...r.coverage.annual.periods,...r.coverage.quarters.periods].map(row=><li key={row.period}>
    <strong>{row.period}</strong> · {row.conflict?'存在冲突':row.missingFields.length?'缺少 '+row.missingFields.map(f=>coverageFieldLabels[f]||f).join('、'):'输入齐全 · 待核对'}{row.derived?' · 含推导单季':''}
    <small>{row.sourceIds.length?row.sourceIds.join('、'):'未关联该期间数值来源'}</small>
   </li>)}</ul>
   {!!r.coverage.balanceMissing?.length&&<p>余额缺项：{r.coverage.balanceMissing.map(row=>`${row.date} ${coverageFieldLabels[row.field]||row.field}`).join('；')}。</p>}
  </section>)}
  </div>
 </section>;
}
