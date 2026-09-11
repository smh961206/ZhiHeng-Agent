import {Link} from 'react-router';
import {agentCapabilities} from '../../shared/agent-capabilities.mjs';
import './agent-capabilities.css';
export default function ResearchCapabilities(){
 return <section className="agent-capabilities" aria-label="研究执行能力"><header><h3>从问题到可复核的结论</h3><p>从查证到计算持续推进。分红逐笔核算，估值展开假设，模型分歧与未解决的问题随报告交付。</p></header><ol>{agentCapabilities.map((item,index)=><li key={item.title}><span aria-hidden="true">0{index+1}</span><div><h4>{item.title}</h4><p>{item.text}</p></div></li>)}</ol><p className="agent-capability-note">原图补读取决于视觉服务是否启用；实际做过哪些核对，可在详情的审计记录与执行轨迹查看。<Link to="/handbook?tab=guide#usage-report">查看取证与复核说明</Link></p></section>;
}
