import {useEffect,useState} from 'react';
import {Check,ChevronDown,CircleAlert} from 'lucide-react';
import {portfolioFields,portfolioReadiness} from '../../shared/research-framework.mjs';
import {Badge} from './ui/badge';
import {Button} from './ui/button';
import {Input} from './ui/input';
import {Collapsible,CollapsibleTrigger,CollapsibleContent} from './ui/collapsible';

export default function PortfolioConstraints({mode,execution,context,onChange}){
 const readiness=portfolioReadiness(context),filled=portfolioFields.length-readiness.missing.length;
 const optional=mode==='B'||mode==='F';
 const [open,setOpen]=useState(Boolean(execution||filled));
 useEffect(()=>{if(execution)setOpen(true);},[Boolean(execution)]);
 const groups=mode==='E'?[
  {title:'持仓构成',note:'说明持有什么、各占多少，以及主要集中风险。',ids:['holdings','weights','industryExposure']},
  {title:'风险与资金需求',note:'说明资产范围、可承受波动与资金使用安排。',ids:['assetRange','riskTolerance','liquidityNeeds']},
 ]:[{ids:portfolioFields.map(field=>field.id)}];
 const body=<div className="portfolio-context-body">
  {groups.map((group,index)=><div key={index} className={group.title?'portfolio-field-group':undefined}>{group.title&&<div className="portfolio-group-heading"><h6>{group.title}</h6><p>{group.note}</p></div>}<div className="portfolio-fields">{group.ids.map(id=>{
   const field=portfolioFields.find(item=>item.id===id);return <div key={id}><label htmlFor={'portfolio-'+id}>{field.label}</label><Input id={'portfolio-'+id} value={context[id]||''} maxLength={4000} placeholder={field.placeholder} onChange={event=>onChange(current=>({...current,[id]:event.target.value}))}/></div>;
  })}</div></div>)}
  <p className={'context-readiness'+(mode==='E'&&!readiness.complete?' is-limited':'')} role="status">{readiness.complete?<><Check size={15}/>组合信息已齐，研究中仍会核对有效性与适用条件。</>:<><CircleAlert size={15}/>{mode==='E'?'仅能分析已提供的持仓与已知风险。':''}尚缺：{readiness.missing.join('、')}。本次不输出具体仓位。</>}</p>
 </div>;
 if(!optional)return <section className="portfolio-context" aria-label="持仓与风险约束"><div className="portfolio-section-heading"><h5>持仓与风险约束</h5><Badge variant="secondary">已填 {filled} / {portfolioFields.length}</Badge></div>{body}</section>;
 return <Collapsible className="portfolio-context portfolio-optional" open={open} onOpenChange={setOpen}>
  <CollapsibleTrigger asChild><Button variant="ghost" className="portfolio-optional-trigger" aria-label="补充持仓与配置约束"><span><strong>补充持仓与配置约束</strong><small>{execution?'本次涉及个人执行，建议补充':filled?'已保存的持仓信息将随本次研究提交':'涉及个人配置时填写，普通公司研究可跳过'}</small></span><Badge variant="secondary">{filled?`已填 ${filled}/6`:'选填'}</Badge><ChevronDown size={16}/></Button></CollapsibleTrigger>
  <CollapsibleContent>{body}</CollapsibleContent>
 </Collapsible>;
}
