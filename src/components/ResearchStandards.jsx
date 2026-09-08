import {ShieldCheck} from 'lucide-react';
import {Badge} from './ui/badge';
import {Card,CardContent} from './ui/card';
import {scoring} from '../../shared/research-framework.mjs';

const conclusionFields=[
 ['研究判断','先看本次路径要回答的问题，再看结论及依据；“已完成”只表示任务交付，不代表判断正确或可以直接交易。'],
 ['研究置信度','结合资料完整度、时效与模型稳定性理解判断把握；高置信度不等于收益承诺，也不消除已知风险。'],
 ['证伪条件','至少保留三条可检验条件，说明出现什么变化时应重新核对假设与结论。'],
 ['适用范围','核对研究时点、对象与证据缺口；未补齐持仓和风险约束时，不把研究结论直接转换为个性化仓位。'],
];
const conclusionTypes=[
 ['快速筛选','判断是否值得继续研究，结论包括淘汰、观察池或进入深度研究。'],
 ['深度研究','围绕长期逻辑、公司质量和估值形成判断；候选状态仍需结合证据与适用条件。'],
 ['财报更新','对照旧判断说明升级、维持、降级或剔除；缺少旧研究时先建立本期基线。'],
 ['多公司比较','按共同维度逐家公司形成判断，区分公司质量、价格吸引力和研究优先级。'],
 ['组合分析','检查配置、集中度与约束；组合信息不完整时说明缺口，不给具体仓位。'],
 ['股东回报','核对分红、回购与现金覆盖，结合主估值形成判断，高股息率本身不是结论。'],
];

export default function ResearchStandards(){
 return <section id="fw-standards" className="fw-section fw-standards" aria-labelledby="fw-standards-title">
  <div className="fw-section-heading"><h2 id="fw-standards-title">怎样理解研究结论</h2><p>把判断、置信度和验证条件放在一起看，结论随研究路径而不同。</p></div>
  <div className="fw-discipline-grid">
   <div className="fw-discipline-copy"><h3>先核对四件事</h3>{conclusionFields.map(([title,copy])=><div key={title}><ShieldCheck size={18}/><span><strong>{title}</strong><p>{copy}</p></span></div>)}</div>
   <div className="fw-conclusion-types"><h3>不同路径，回答不同问题</h3><dl>{conclusionTypes.map(([title,copy])=><div key={title}><dt>{title}</dt><dd>{copy}</dd></div>)}</dl></div>
  </div>
 </section>;
}

export function ResearchScoring(){
 return <section id="fw-scoring" className="fw-section fw-scoring" aria-labelledby="fw-scoring-title">
  <div className="fw-section-heading"><h2 id="fw-scoring-title">评分与估值的使用边界</h2><p>评分解释研究，估值依赖假设；两者都需要结合证据与适用范围。</p></div>
  <div className="fw-discipline-grid">
   <div className="fw-discipline-copy"><h3>先确认是否适用</h3>{[
    ['这套评分何时出现','当前六维 100 分体系用于“深度研究”的“完整展开”。其他路径及标准、简明研究不要求交付这套评分，具体以本次报告范围为准。'],
    ['资料不足怎样处理','无法核实的维度保留“待核实”，不按零分补齐；维度未全部计分时不计算总分。估值、财务与股东回报的相关证据不重复加分。'],
    ['怎样使用评分与估值','评分不是自动买入信号。估值需说明适用方法、关键假设与区间，不能用单一指标或股息率价格代替完整判断。'],
    ['同一风险不重复折价','检查同一风险是否已在利润、情景或折现率中反映，避免再机械叠加安全边际。金融企业等特殊行业需使用适配的模型。'],
   ].map(([title,copy])=><div key={title}><ShieldCheck size={18}/><span><strong>{title}</strong><p>{copy}</p></span></div>)}</div>
   <Card className="fw-score"><CardContent><div className="fw-score-heading"><h3>六个维度的评分权重</h3><Badge variant="outline">100 分体系</Badge></div><p>用于理解各维度在完整研究中的权重，不能直接换算为交易动作或仓位。</p><div className="fw-score-list">{scoring.map(item=><div key={item.id}><span>{item.label}</span><div aria-hidden="true"><i style={{width:item.max*4+'%'}}/></div><strong>{item.max}<small>分</small></strong></div>)}</div><small>仅展示评分权重，不是任何公司的实际得分。</small></CardContent></Card>
  </div>
 </section>;
}
