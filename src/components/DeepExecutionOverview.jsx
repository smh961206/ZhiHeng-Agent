import {Link} from 'react-router';
import {deepExecutionOverview} from '../../shared/research-analysis-receipts.mjs';
import './research-analysis-receipts.css';
export default function DeepExecutionOverview(){
 return <details className="deep-execution-overview"><summary>这次深度研究会怎样核对</summary><ol>{deepExecutionOverview.map(step=><li key={step.title}><strong>{step.title}</strong><p>{step.text}</p></li>)}</ol><Link to="/handbook?tab=guide">了解计算、缺口与完整记录的交付</Link></details>;
}
