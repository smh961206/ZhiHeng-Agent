import {Link} from 'react-router';
import {agentCapabilities} from '../../shared/agent-capabilities.mjs';
import './agent-capabilities.css';
export default function ResearchCapabilities(){
 return <section className="agent-capabilities" aria-label="研究执行能力"><header><h3>从问题到可复核的结论</h3><p>先按研究路径明确范围，再从查证推进到计算、写作和复核。已经完成的核对与未解决问题会随报告交付。</p></header><ol>{agentCapabilities.map((item,index)=><li key={item.title}><span aria-hidden="true">0{index+1}</span><div><h4>{item.title}</h4><p>{item.text}</p></div></li>)}</ol><p className="agent-capability-note">图片和扫描件会在需要时补读；具体核对过程可在详情页的审计记录与执行轨迹中查看。<Link to="/handbook?tab=guide#usage-report">查看取证与复核说明</Link></p></section>;
}
