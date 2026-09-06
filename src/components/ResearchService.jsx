import {useState} from 'react';
import {ArrowRight,ArrowUpRight,BookOpen,Check,FileText,RefreshCw,ShieldCheck,Sparkles} from 'lucide-react';
import {Button} from './ui/button';
import {Badge} from './ui/badge';
import {Card,CardContent} from './ui/card';
import {Sheet,SheetTrigger,SheetContent,SheetTitle,SheetDescription,SheetHeader,SheetFooter} from './ui/sheet';
import {researchService as service} from '../config/research-service';

const benefits=[
 [FileText,'从问题到完整研究','按研究场景组织结论、财务证据、估值假设与风险。'],
 [ShieldCheck,'判断有出处','回查原始资料和审计记录，了解结论的依据与适用条件。'],
 [RefreshCw,'把研究持续做下去','保留历史报告，以新财报核对旧假设，跟踪判断的变化。'],
];

export default function ResearchService({onStart}){
 const [open,setOpen]=useState(false);
 const destination=service.purchaseUrl||service.contactUrl;
 return <section id="fw-plans" className="fw-section fw-plans" aria-labelledby="fw-plans-title">
  <div className="fw-section-heading"><span>03 / 服务方案</span><h2 id="fw-plans-title">从了解方法，到持续开展研究。</h2><p>先熟悉知衡的研究方式，再了解适合长期使用的研究服务。</p></div>
  <div className="fw-plan-grid">
   <Card className="fw-guide-plan"><CardContent><span className="fw-icon"><BookOpen size={22}/></span><h3>先了解如何使用</h3><p>第一次接触知衡，从一份清晰的使用指南开始。</p><ul>{['三步上手与提问示例','六种研究场景说明','报告阅读与来源核对方法'].map(text=><li key={text}><Check size={15}/>{text}</li>)}</ul><Button asChild variant="outline"><a href="#fw-guide">查看使用指南<ArrowRight size={16}/></a></Button></CardContent></Card>
   <Card className="fw-service-plan"><CardContent>
    <div className="fw-service-heading"><span className="fw-service-kicker"><Sparkles size={16}/>系统研究 · 持续跟踪</span><Badge variant="outline">{destination?'了解开通':'开通筹备中'}</Badge></div>
    <h3>{service.name}</h3><p className="fw-service-description">适合希望深入理解公司，并在每次新披露后重新核对判断的研究者。</p>
    <div className="fw-service-benefits">{benefits.map(([Icon,title,copy])=><div key={title}><Icon size={19}/><span><strong>{title}</strong><p>{copy}</p></span></div>)}</div>
    <div className="fw-service-purchase"><div><strong>{service.priceLabel}</strong><p>{service.terms}</p></div>
     {destination?<Button asChild><a href={destination} target="_blank" rel="noopener noreferrer">{service.purchaseUrl?'前往开通':service.contactLabel}<ArrowUpRight size={16}/></a></Button>:<Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild><Button>查看开通说明<ArrowRight size={16}/></Button></SheetTrigger>
      <SheetContent className="fw-service-sheet w-full sm:max-w-lg"><SheetHeader><span className="fw-icon"><Sparkles size={23}/></span><SheetTitle>研究服务开通说明</SheetTitle><SheetDescription>知衡研究服务正在筹备，当前暂未开放在线购买。</SheetDescription></SheetHeader>
       <div className="fw-service-sheet-body"><h3>开放开通时，你可以在这里了解</h3><ul>{['套餐价格与服务周期','可用研究额度与适用范围','购买方式与服务说明'].map(text=><li key={text}><Check size={17}/>{text}</li>)}</ul><p>具体内容以正式公布的方案为准。你现在可以先查看使用指南，或进入工作台熟悉研究流程。</p></div>
       <SheetFooter><Button onClick={()=>{setOpen(false);onStart();}}>前往研究工作台<ArrowRight size={16}/></Button><Button variant="outline" onClick={()=>setOpen(false)}>返回方案介绍</Button></SheetFooter>
      </SheetContent>
     </Sheet>}
    </div>
   </CardContent></Card>
  </div>
 </section>;
}
