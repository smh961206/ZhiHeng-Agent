import {ShieldCheck} from 'lucide-react';
import {Badge} from './ui/badge';
import {Card,CardContent} from './ui/card';
import {scoring} from '../../shared/research-framework.mjs';

export default function ResearchStandards(){
 return <section id="fw-standards" className="fw-section fw-standards" aria-labelledby="fw-standards-title">
  <div className="fw-section-heading"><h2 id="fw-standards-title">怎样阅读一份研究结论</h2><p>先核对依据与适用条件，再结合评分理解公司质量。</p></div>
<div className="fw-discipline-grid"><Card className="fw-score"><CardContent><div className="fw-score-heading"><h3>六个维度，理解公司</h3><Badge variant="outline">100 分体系</Badge></div><p>评分用于解释研究，不直接触发买入。市赚率与股息专项不重复加分，资料不足也不会按零分填充。</p><div className="fw-score-list">{scoring.map(item=><div key={item.id}><span>{item.label}</span><div aria-hidden="true"><i style={{width:item.max*4+'%'}}/></div><strong>{item.max}<small>分</small></strong></div>)}</div><small>仅展示评分权重，不是任何公司的实际得分。</small></CardContent></Card><div className="fw-discipline-copy"><h3>每个正式结论，都留下边界。</h3>{[['研究动作','表达淘汰、观察或候选状态；与个性化仓位分开。'],['研究置信度','根据资料完整度、时效与模型稳定性说明判断把握。'],['证伪条件','至少三条可检验条件，明确什么时候要重新研究。'],['风险定价','一个风险有一个主要定价位置，避免重复折价。']].map(([title,copy])=><div key={title}><ShieldCheck size={18}/><span><strong>{title}</strong><p>{copy}</p></span></div>)}</div></div>
 </section>;
}
