import {ArrowUpRight,RefreshCw,ShieldCheck,Sparkles} from 'lucide-react';
import {Button} from './ui/button';
import {Popover,PopoverTrigger,PopoverContent} from './ui/popover';
import {Link} from 'react-router';

export default function PlatformStatusPanel({trigger,open,onOpenChange,titleId,state,label,checking,onRefresh}){
 return <Popover open={open} onOpenChange={onOpenChange}>
  <PopoverTrigger asChild>{trigger}</PopoverTrigger>
  <PopoverContent align="end" className="platform-status-panel" aria-labelledby={titleId}>
   <div className="platform-panel-heading"><ShieldCheck size={20} aria-hidden="true"/><div><h2 id={titleId}>平台说明</h2><p>从一个具体问题出发，形成可以回查依据的投资研究。</p></div></div>
   <div className="platform-connection" role="status"><strong>{label}</strong><p>{state==='incompatible'?'页面需要刷新后才能继续使用。当前输入会保留。':state==='configured'?'可以开始新的研究。具体资料能否取得，以本次研究结果为准。':state==='unconfigured'?'研究服务尚未准备好。你仍可编辑和暂存研究问题。':state==='checking'?'正在检查研究服务，请稍候。':'暂时无法确认研究服务状态，请重新检查。已填写的内容会保留。'}</p></div>
   <ul className="platform-m11-highlights" aria-label="研究方式"><li><Sparkles size={15}/><span><strong>按问题研究</strong>根据筛选、深研、更新、比较或组合问题确定范围</span></li><li><Sparkles size={15}/><span><strong>先核对依据</strong>重要数字回到原始资料，缺失内容如实保留</span></li><li><Sparkles size={15}/><span><strong>过程可回查</strong>在研究详情查看进展、审计记录与证据来源</span></li></ul>
   <p className="platform-policy-note">研究结果用于辅助判断。请结合证据缺口、估值条件和自身投资约束阅读。</p>
   <div className="platform-panel-actions"><Button type="button" variant="outline" size="sm" disabled={checking} onClick={onRefresh}><RefreshCw size={14} className={checking?'animate-spin':''}/>重新检查服务</Button><Link to="/handbook?tab=method#method-quality" target="_blank" rel="noopener noreferrer" title="在新标签页了解研究质量" onClick={()=>onOpenChange(false)}>了解研究质量<ArrowUpRight size={14} aria-hidden="true"/></Link></div>
  </PopoverContent>
 </Popover>;
}
