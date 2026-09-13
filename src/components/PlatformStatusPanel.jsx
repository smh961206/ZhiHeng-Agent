import {ArrowUpRight,RefreshCw,ShieldCheck} from 'lucide-react';
import {Button} from './ui/button';
import {Popover,PopoverTrigger,PopoverContent} from './ui/popover';
import {frameworkVersion} from '../../shared/research-framework.mjs';
import {modelTrackVersion,platformVersion} from '../config/platform-release.mjs';
import {Link} from 'react-router';

const stages=[
 ['input','Input · 输入理解'],['vision','Vision · 原页读取'],['researcher','研究'],['writer','写作'],
 ['evidenceVerifier','证据核验'],['auditor','审计'],['criticalReviewer','关键复核'],['judge','Judge · 证据裁决'],
];

export default function PlatformStatusPanel({trigger,open,onOpenChange,titleId,state,label,checking,onRefresh,selection}){
 const current=state==='configured'?selection:null;
 const pipeline=current?.mode==='pipeline';
 const modeLabel=pipeline?'按研究环节配置':current?'兼容历史模型配置':null;
 return <Popover open={open} onOpenChange={onOpenChange}>
  <PopoverTrigger asChild>{trigger}</PopoverTrigger>
  <PopoverContent align="end" className="platform-status-panel" aria-labelledby={titleId}>
   <div className="platform-panel-heading"><ShieldCheck size={20} aria-hidden="true"/><div><div className="platform-title-line"><h2 id={titleId}>知衡 · V{platformVersion}</h2><span>模型配置 {modelTrackVersion}</span></div><p>模型按环节分工，研究有依据，历史可回查。</p></div></div>
   <div className="platform-connection" role="status"><strong>{label}</strong><p>{state==='incompatible'?'页面与服务使用的研究规则版本不匹配，请刷新页面。当前输入会保留。':state==='configured'?'服务已提供模型配置；实际可用性以本次请求结果为准。':state==='unconfigured'?'请由平台管理员完成模型配置。你仍可编辑和暂存研究问题。':state==='checking'?'正在读取平台配置，请稍候。':'暂时无法确认服务配置，请重新检查。已填写的研究内容会保留。'}</p></div>
   <section className="platform-current-models" aria-label="当前模型设置">
    <div className="platform-model-heading"><strong>新研究使用</strong><span>{!modeLabel?'状态待确认':pipeline?'环节模型已就绪':'仅供历史任务兼容'}</span></div>
    <dl className="platform-model-mode"><div><dt>运行方式</dt><dd>{modeLabel||'未确认'}</dd></div></dl>
    {pipeline?<dl className="platform-stage-models" aria-label="八个研究环节的当前模型">{stages.map(([key,name])=><div key={key}><dt>{name}</dt><dd>{current.stageModels?.[key]||(['criticalReviewer','judge'].includes(key)?'未启用':'未配置')}</dd></div>)}</dl>:<dl><div><dt>研究模型</dt><dd>{modeLabel?(current.analysisModel||'按任务记录读取'):'未确认'}</dd></div><div><dt>原页读取</dt><dd>{modeLabel?(current.visionModel||'未启用'):'未确认'}</dd></div></dl>}
    <p>以服务当前设置为准；已有研究沿用保存的模型，具体调用以任务记录为准。</p>
   </section>
   <dl><div><dt>分工明确</dt><dd>每个环节使用自己的配置；关键复核与裁决未启用时不会调用。</dd></div><div><dt>文档与图像</dt><dd>整理报告文字与表格，按需补读原页；是否可读以本次处理结果为准，读取完成仍需核实。</dd></div><div><dt>中断后继续</dt><dd>按任务保存的进度与模型配置检查能否恢复，沿用原资料时点；不能兼容时说明原因。</dd></div></dl>
   <div className="platform-version-explainer"><strong>平台与研究规则分别更新</strong><p>当前研究规则 V{frameworkVersion}；历史报告保留任务当时的规则与快照，不随平台 V{platformVersion} 更新改写。</p></div>
   <p className="platform-policy-note">模型配置只决定各环节由谁执行；证据、计算、审计和恢复规则仍独立生效，配置模型不代表事实已经核验。</p>
   <div className="platform-panel-actions"><Button type="button" variant="outline" size="sm" disabled={checking} onClick={onRefresh}><RefreshCw size={14} className={checking?'animate-spin':''}/>重新检查服务</Button><Link to="/handbook?tab=method#method-quality" target="_blank" rel="noopener noreferrer" title="在新标签页了解研究质量" onClick={()=>onOpenChange(false)}>了解研究质量<ArrowUpRight size={14} aria-hidden="true"/></Link></div>
  </PopoverContent>
 </Popover>;
}
