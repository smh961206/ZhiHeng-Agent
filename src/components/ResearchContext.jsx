import {useRef,useState} from 'react';
import {eligibleUpdateBaselines,updateBaselineSelection} from '../../shared/earnings-update.mjs';
import {Layers,Check,CircleAlert} from 'lucide-react';
import PortfolioConstraints from './PortfolioConstraints';
import {contextGuidance} from '../config/research-context';
import './research-context.css';
import {Textarea} from './ui/textarea';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from './ui/select';
import {portfolioFields,portfolioReadiness} from '../../shared/research-framework.mjs';
import {executionContextTemplate} from '../../shared/execution-discipline.mjs';
import {Link} from 'react-router';
import {Button} from './ui/button';
import './execution-ui.css';

export default function ResearchContext({mode,execution,awaitingMode=false,portfolio='',setPortfolio,previousResearch='',setPreviousResearch,baselineJobId,setBaselineJobId,portfolioContext={},setPortfolioContext,jobs=[],jobsLoading=false,jobsError,onRefreshJobs,securities=[]}){
 const readiness=portfolioReadiness(portfolioContext),previous=mode==='C';
 const baseline=updateBaselineSelection({baselineJobId,previousResearch},securities,{jobs,jobsLoading,jobsError});
 const [refreshing,setRefreshing]=useState(false);
 async function refreshBaselines(){if(refreshing||!onRefreshJobs)return;setRefreshing(true);try{await onRefreshJobs();}finally{setRefreshing(false);}}
 const filledCount=portfolioFields.length-readiness.missing.length;
 const complete=previous?['ready','external'].includes(baseline.status):mode==='E'?readiness.complete:Boolean(portfolio.trim()||!awaitingMode&&mode!=='A'&&filledCount);
 const guidance=!awaitingMode?contextGuidance[mode]:null;
 function addTopic(text){if(!portfolio.includes(text)&&portfolio.length+text.length+2<=20000){setPortfolio([portfolio,text].filter(Boolean).join('\n\n'));requestAnimationFrame(()=>backgroundInput.current?.focus());}}
 const completed=eligibleUpdateBaselines(jobs,securities);
 const backgroundInput=useRef(null);
 const templateAdded=portfolio.includes('交易日期与当时依据：');
 const templateFits=portfolio.length+executionContextTemplate.length+2<=20000;
 function addExecutionTemplate(){if(!templateAdded&&templateFits){setPortfolio([portfolio,executionContextTemplate].filter(Boolean).join('\n\n'));requestAnimationFrame(()=>backgroundInput.current?.focus());}}
 return <section className={'workbench-context context-mode-'+mode}><div className="context-section-heading"><h4><Layers size={15}/>{guidance?guidance.title:awaitingMode?'补充研究背景':previous?'选择对照研究与关注变量':mode==='E'?'补充组合信息':mode==='A'?'补充筛选关注点':mode==='D'?'补充比较目标与重点':'补充组合与研究背景'}</h4><span>{previous&&baseline.blocking?(baseline.pending?'核对中':'需核对'):complete?'已填写':previous||mode==='E'?'建议填写':'选填'}</span></div><div className="research-context-body">
  {previous?<div className="research-context-fields"><p>选择覆盖当前标的的已完成研究，或填写外部旧结论。说明旧判断、估值假设与这次最想验证的变量；未提供旧结论也可建立本期基线。</p><div><label htmlFor="baseline-research">对照研究</label><Select value={baselineJobId||'none'} onValueChange={value=>setBaselineJobId(value==='none'?'':value)}><SelectTrigger id="baseline-research" aria-label="对照研究"><SelectValue placeholder="选择已完成的研究"/></SelectTrigger><SelectContent><SelectItem value="none">{previousResearch.trim()?'使用填写的外部旧结论':'建立本期基线（无旧报告）'}</SelectItem>{baselineJobId&&!completed.some(job=>job.id===baselineJobId)&&<SelectItem value={baselineJobId}>所选对照待核对</SelectItem>}{completed.map(job=><SelectItem value={job.id} key={job.id}>{job.question||job.input?.question||'未命名研究'}</SelectItem>)}</SelectContent></Select></div><div><label htmlFor="previous-research">上次结论与关注的变化</label><Textarea id="previous-research" aria-label="上次研究结论" maxLength={30000} value={previousResearch} onChange={event=>setPreviousResearch(event.target.value)} placeholder={"旧报告日期及判断：\n旧估值假设：\n待验证变量（例如海外盈利、资本开支、库存）：\n升级或证伪条件："}/></div>{baseline.blocking&&<div className="baseline-resolution" role="status" aria-label="对照研究核对"><p>{baseline.message}</p>{!baseline.pending&&<div><Button type="button" variant="outline" size="sm" disabled={refreshing||!onRefreshJobs} aria-busy={refreshing} onClick={refreshBaselines}>{refreshing?'正在刷新记录…':'刷新可用记录'}</Button><Button type="button" variant="ghost" size="sm" onClick={()=>setBaselineJobId('')}>取消所选对照</Button></div>}</div>}{!baseline.blocking&&<p className="context-readiness" role="status">{baselineJobId&&!complete?<><CircleAlert size={15}/>旧报告尚未核对，请先处理所选对照。</>:complete?<><Check size={15}/>将对照旧结论，检查新证据与假设变化。</>:<><CircleAlert size={15}/>未提供旧结论：可比较财报期间变化，本次研究动作记为“建立基线”。</>}</p>}</div>:<>
   <p>{guidance?guidance.description:awaitingMode?'可先补充关注点或已有背景；输入研究问题后，这里会按匹配的研究路径展示相关选项。':mode==='E'?'分开填写持仓与约束，才能判断组合动作是否适用。信息不完整时仍可研究已知风险。':mode==='A'?'可补充最想验证的风险或业务问题，帮助本次筛选聚焦。':mode==='D'?'说明更看重公司质量、当前价格还是现金回报，并补充希望统一的期间与口径。':'补充关注方向、研究期限或其他背景；具体组合动作还需要完整持仓与风险约束。'}</p>
   {execution&&<div className="execution-input-guide"><strong>补充交易当时的依据与执行约束</strong><p>写明调整原因、交易日期、原目标、已执行档位和后来出现的新事实。没有的信息可留空，报告会说明限制。</p><div className="execution-input-actions"><Button type="button" variant="outline" disabled={templateAdded||!templateFits} onClick={addExecutionTemplate}>{templateAdded?'填写提纲已加入':!templateFits?'背景字数已接近上限':'加入填写提纲'}</Button><Link className="execution-guide-link" to="/handbook?tab=discipline#execution-discipline-title">查看执行纪律</Link></div></div>}
   {guidance?.topics&&!execution&&<div className="context-topics" aria-label="添加专项关注点">{guidance.topics.map(([label,text])=><Button type="button" variant="outline" size="sm" key={label} disabled={portfolio.includes(text)||portfolio.length+text.length+2>20000} onClick={()=>addTopic(text)}>{portfolio.includes(text)&&<Check size={13}/>} {label}</Button>)}</div>}
   <Textarea id={execution?'execution-background':undefined} ref={backgroundInput} aria-label={guidance?guidance.label:awaitingMode?'研究背景':mode==='A'?'筛选关注点':mode==='D'?'比较重点':'组合上下文'} maxLength={20000} value={portfolio} onChange={event=>setPortfolio(event.target.value)} placeholder={execution?executionContextTemplate:guidance?guidance.placeholder:awaitingMode?'例如：重点关注现金流质量，希望结合已有资料核对。':mode==='A'?'例如：存货增长是否合理，利润能否持续转化为现金？':mode==='D'?'例如：主体使用三家共同披露的最新半年报；更看重现金流与ROE稳定性，价格吸引力单独比较。':'例如：计划持有3–5年，关注现金回报与盈利稳定性。'}/>
  </>}
  {previous&&execution&&<div className="execution-input-guide"><strong>本次也涉及组合执行，请补充交易背景</strong><p>财报更新与交易复盘分别核对；请写明原交易依据、目标区间、已执行档位及新增事实。</p><Textarea id={execution?'execution-background':undefined} ref={backgroundInput} aria-label="组合上下文" maxLength={20000} value={portfolio} onChange={event=>setPortfolio(event.target.value)} placeholder={executionContextTemplate}/></div>}
   {!awaitingMode&&mode!=='A'&&(previous?execution:mode!=='D'||execution)&&<PortfolioConstraints key={mode} mode={mode} execution={execution} context={portfolioContext} onChange={setPortfolioContext}/>}
 </div></section>;
}
