import {eligibleUpdateBaselines} from '../../shared/earnings-update.mjs';
import {Layers,Check,CircleAlert} from 'lucide-react';
import {Badge} from './ui/badge';
import {Textarea} from './ui/textarea';
import {Input} from './ui/input';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from './ui/select';
import {portfolioFields,portfolioReadiness} from '../../shared/research-framework.mjs';

export default function ResearchContext({mode,awaitingMode=false,portfolio='',setPortfolio,previousResearch='',setPreviousResearch,baselineJobId,setBaselineJobId,portfolioContext={},setPortfolioContext,jobs=[],securities=[]}){
 const readiness=portfolioReadiness(portfolioContext),previous=mode==='C';
 const filledCount=portfolioFields.length-readiness.missing.length;
 const complete=previous?Boolean(baselineJobId||previousResearch.trim()):mode==='E'?readiness.complete:Boolean(portfolio.trim()||!awaitingMode&&mode!=='A'&&filledCount);
 const completed=eligibleUpdateBaselines(jobs,securities);
 return <section className="workbench-context"><div className="context-section-heading"><h4><Layers size={15}/>{awaitingMode?'补充研究背景':previous?'选择对照研究与关注变量':mode==='E'?'补充组合信息':mode==='A'?'补充筛选关注点':mode==='D'?'补充比较目标与重点':'补充组合与研究背景'}</h4><span>{complete?'已填写':previous||mode==='E'?'建议填写':'选填'}</span></div><div className="research-context-body">
  {previous?<div className="research-context-fields"><p>选择覆盖当前标的的已完成研究，或填写外部旧结论。说明旧判断、估值假设与这次最想验证的变量；未提供旧结论也可建立本期基线。</p><div><label htmlFor="baseline-research">对照研究</label><Select value={baselineJobId||'none'} onValueChange={value=>setBaselineJobId(value==='none'?'':value)}><SelectTrigger id="baseline-research" aria-label="对照研究"><SelectValue placeholder="选择已完成的研究"/></SelectTrigger><SelectContent><SelectItem value="none">建立本期基线（无旧报告）</SelectItem>{baselineJobId&&!completed.some(job=>job.id===baselineJobId)&&<SelectItem value={baselineJobId}>已选对照需核对标的</SelectItem>}{completed.map(job=><SelectItem value={job.id} key={job.id}>{job.question||job.input?.question||'未命名研究'}</SelectItem>)}</SelectContent></Select></div><div><label htmlFor="previous-research">上次结论与关注的变化</label><Textarea id="previous-research" aria-label="上次研究结论" maxLength={30000} value={previousResearch} onChange={event=>setPreviousResearch(event.target.value)} placeholder={"旧报告日期及判断：\n旧估值假设：\n待验证变量（例如海外盈利、资本开支、库存）：\n升级或证伪条件："}/></div>{baselineJobId&&!completed.some(job=>job.id===baselineJobId)&&<p role="alert">所选对照未在当前可用记录中匹配，请重新选择或核对标的。</p>}<p className="context-readiness" role="status">{complete?<><Check size={15}/>将对照旧结论，检查新证据与假设变化。</>:<><CircleAlert size={15}/>未提供旧结论：可比较财报期间变化，本次研究动作记为“建立基线”。</>}</p></div>:<>
   <p>{awaitingMode?'可先补充关注点或已有背景；输入研究问题后，这里会按匹配的研究路径展示相关选项。':mode==='E'?'分开填写持仓与约束，才能判断组合动作是否适用。信息不完整时仍可研究已知风险。':mode==='A'?'可补充最想验证的风险或业务问题，帮助本次筛选聚焦。':mode==='D'?'说明更看重公司质量、当前价格还是现金回报，并补充希望统一的期间与口径。':'补充关注方向、研究期限或其他背景；具体组合动作还需要完整持仓与风险约束。'}</p>
   <Textarea aria-label={awaitingMode?'研究背景':mode==='A'?'筛选关注点':mode==='D'?'比较重点':'组合上下文'} maxLength={20000} value={portfolio} onChange={event=>setPortfolio(event.target.value)} placeholder={awaitingMode?'例如：重点关注现金流质量，希望结合已有资料核对。':mode==='A'?'例如：存货增长是否合理，利润能否持续转化为现金？':mode==='D'?'例如：主体使用三家共同披露的最新半年报；更看重现金流与ROE稳定性，价格吸引力单独比较。':'例如：计划持有3–5年，关注现金回报与盈利稳定性。'}/>
   {!awaitingMode&&mode!=='A'&&mode!=='D'&&<section className="portfolio-context" aria-label="持仓与风险约束">
    <div className="portfolio-section-heading"><h5>持仓与风险约束</h5><Badge variant="secondary" className={readiness.complete?'is-complete':undefined}>已填 {filledCount} / {portfolioFields.length}</Badge></div>
    <div className="portfolio-context-body">
     <div className="portfolio-fields">{portfolioFields.map(field=><div key={field.id}><label htmlFor={'portfolio-'+field.id}>{field.label}</label><Input id={'portfolio-'+field.id} value={portfolioContext[field.id]||''} maxLength={4000} placeholder={field.placeholder} onChange={event=>setPortfolioContext(current=>({...current,[field.id]:event.target.value}))}/></div>)}</div>
     <p className="context-readiness" role="status">{readiness.complete?<><Check size={15}/>组合信息已齐，研究中仍会核对有效性与适用条件。</>:<><CircleAlert size={15}/>尚缺：{readiness.missing.join('、')}。本次不输出具体仓位。</>}</p>
    </div>
   </section>}
  </>}
 </div></section>;
}
