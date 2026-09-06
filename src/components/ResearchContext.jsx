import {ChevronDown,Layers,Check,CircleAlert} from 'lucide-react';
import {Button} from './ui/button';
import {Badge} from './ui/badge';
import {Textarea} from './ui/textarea';
import {Input} from './ui/input';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from './ui/select';
import {Collapsible,CollapsibleTrigger,CollapsibleContent} from './ui/collapsible';
import {portfolioFields,portfolioReadiness} from '../../shared/research-framework.mjs';

export default function ResearchContext({mode,open,onOpenChange,portfolio='',setPortfolio,previousResearch='',setPreviousResearch,baselineJobId,setBaselineJobId,portfolioContext={},setPortfolioContext,jobs=[]}){
 const readiness=portfolioReadiness(portfolioContext),previous=mode==='C';
 const complete=previous?Boolean(baselineJobId||previousResearch.trim()):mode==='E'?readiness.complete:Boolean(portfolio.trim());
 const completed=jobs.filter(job=>job.status==='completed');
 return <Collapsible open={open} onOpenChange={onOpenChange} className="workbench-context"><CollapsibleTrigger asChild><Button type="button" variant="ghost"><span><Layers size={15}/>{previous?'补充上次研究结论':mode==='E'?'补充组合信息':'补充组合与研究背景'}<small>{complete?'已填写':previous||mode==='E'?'建议填写':'选填'}</small></span><ChevronDown size={15}/></Button></CollapsibleTrigger><CollapsibleContent>
  {previous?<div className="research-context-fields"><p>选择已完成的同标的研究，或补充外部结论。新研究将对照旧假设，保留变化依据。</p><div><label htmlFor="baseline-research">对照研究</label><Select value={baselineJobId||'none'} onValueChange={value=>setBaselineJobId(value==='none'?'':value)}><SelectTrigger id="baseline-research" aria-label="对照研究"><SelectValue placeholder="选择已完成的研究"/></SelectTrigger><SelectContent><SelectItem value="none">暂不选择旧报告</SelectItem>{completed.map(job=><SelectItem value={job.id} key={job.id}>{job.question||job.input?.question||'未命名研究'}</SelectItem>)}</SelectContent></Select></div><div><label htmlFor="previous-research">上次结论与关注的变化</label><Textarea id="previous-research" aria-label="上次研究结论" maxLength={30000} value={previousResearch} onChange={event=>setPreviousResearch(event.target.value)} placeholder="旧判断、估值假设与证伪条件；也可补充选择旧报告后的关注重点。"/></div><p className="context-readiness" role="status">{complete?<><Check size={15}/>将对照旧结论，检查新证据与假设变化。</>:<><CircleAlert size={15}/>未提供对照时，仅建立本期基线，不编造前后变化。</>}</p></div>:<>
   <p>{mode==='E'?'分开填写持仓与约束，才能判断组合动作是否适用。信息不完整时仍可研究已知风险。':'补充关注方向、研究期限或其他背景；具体组合动作还需要完整持仓与风险约束。'}</p>
   <Textarea aria-label="组合上下文" maxLength={20000} value={portfolio} onChange={event=>setPortfolio(event.target.value)} placeholder="例如：计划持有3–5年，关注现金回报与盈利稳定性。"/>
   <Collapsible key={mode} defaultOpen={mode==='E'} className="portfolio-context"><CollapsibleTrigger asChild><Button type="button" variant="ghost"><span>持仓与风险约束<Badge variant="secondary">{portfolioFields.length-readiness.missing.length} / {portfolioFields.length}</Badge></span><ChevronDown size={14}/></Button></CollapsibleTrigger><CollapsibleContent><div className="portfolio-fields">{portfolioFields.map(field=><div key={field.id}><label htmlFor={'portfolio-'+field.id}>{field.label}</label><Input id={'portfolio-'+field.id} value={portfolioContext[field.id]||''} maxLength={4000} placeholder={field.placeholder} onChange={event=>setPortfolioContext(current=>({...current,[field.id]:event.target.value}))}/></div>)}</div><p className="context-readiness" role="status">{readiness.complete?<><Check size={15}/>组合信息已齐，研究中仍会核对有效性与适用条件。</>:<><CircleAlert size={15}/>尚缺：{readiness.missing.join('、')}。本次不输出具体仓位。</>}</p></CollapsibleContent></Collapsible>
  </>}
 </CollapsibleContent></Collapsible>;
}
