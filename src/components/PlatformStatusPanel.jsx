import {ArrowUpRight,RefreshCw,ShieldCheck} from 'lucide-react';
import {Button} from './ui/button';
import {Popover,PopoverTrigger,PopoverContent} from './ui/popover';
import {frameworkVersion} from '../../shared/research-framework.mjs';
import {platformVersion} from '../config/platform-release.mjs';
import {Link} from 'react-router';

export default function PlatformStatusPanel({trigger,open,onOpenChange,titleId,state,label,checking,onRefresh,selection}){
 const current=state==='configured'?selection:null;
 const modeLabel={legacy:'固定模型', 'dry-run':'固定模型 · 策略观察',policy:'分层研究策略',champion:'任务优选策略'}[current?.mode];
 return <Popover open={open} onOpenChange={onOpenChange}>
  <PopoverTrigger asChild>{trigger}</PopoverTrigger>
  <PopoverContent align="end" className="platform-status-panel" aria-labelledby={titleId}>
   <div className="platform-panel-heading"><ShieldCheck size={20} aria-hidden="true"/><div><h2 id={titleId}>知衡 · V{platformVersion}</h2><p>模型先评估，研究有依据，历史可回查。</p></div></div>
   <div className="platform-connection" role="status"><strong>{label}</strong><p>{state==='incompatible'?'页面与服务使用的研究规则版本不匹配，请刷新页面。当前输入会保留。':state==='configured'?'服务已提供模型配置；实际可用性以本次请求结果为准。':state==='unconfigured'?'请由平台管理员完成模型配置。你仍可编辑和暂存研究问题。':state==='checking'?'正在读取平台配置，请稍候。':'暂时无法确认服务配置，请重新检查。已填写的研究内容会保留。'}</p></div>
   <section className="platform-current-models" aria-label="当前模型设置">
    <div className="platform-model-heading"><strong>新研究使用</strong><span>{!modeLabel?'状态待确认':current.candidatesEnabled===false?'候选未启用':current.candidatesEnabled===true?'已采用验收策略':'候选状态待确认'}</span></div>
    <dl><div><dt>运行方式</dt><dd>{modeLabel||'未确认'}</dd></div><div><dt>研究模型</dt><dd>{modeLabel?(current.analysisModel||'按任务选择，见研究记录'):'未确认'}</dd></div><div><dt>原页读取</dt><dd>{modeLabel?(current.visionModel||'未启用'):'未确认'}</dd></div></dl>
    <p>以服务当前设置为准；已有研究沿用保存的模型，具体调用以任务记录为准。</p>
   </section>
   <dl><div><dt>质量优先</dt><dd>用相同问题与资料对照模型，先检查事实、计算和引用，再比较速度与成本；完成验收后才可启用。</dd></div><div><dt>文档与图像</dt><dd>整理报告文字与表格，按需补读原页；是否可读以本次处理结果为准，读取完成仍需核实。</dd></div><div><dt>中断后继续</dt><dd>按任务保存的进度与模型配置检查能否恢复，沿用原资料时点；不能兼容时说明原因。</dd></div></dl>
   <div className="platform-version-explainer"><strong>平台与研究规则分别更新</strong><p>当前研究规则 V{frameworkVersion}；历史报告保留任务当时的规则与快照，不随平台 V{platformVersion} 更新改写。</p></div>
   <p className="platform-policy-note">模型策略调整须先完成质量验收。平台版本不表示已启用自动升级，也不代表事实核验通过。</p>
   <div className="platform-panel-actions"><Button type="button" variant="outline" size="sm" disabled={checking} onClick={onRefresh}><RefreshCw size={14} className={checking?'animate-spin':''}/>重新检查服务</Button><Link to="/handbook?tab=method#method-quality" target="_blank" rel="noopener noreferrer" title="在新标签页了解模型评估" onClick={()=>onOpenChange(false)}>了解模型评估<ArrowUpRight size={14} aria-hidden="true"/></Link></div>
  </PopoverContent>
 </Popover>;
}
