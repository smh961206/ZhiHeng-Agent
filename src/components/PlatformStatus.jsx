import {useId} from 'react';
import {Info,RefreshCw,ShieldCheck} from 'lucide-react';
import {Button} from './ui/button';
import {Popover,PopoverTrigger,PopoverContent} from './ui/popover';
import {frameworkVersion} from '../../shared/research-framework.mjs';
import {knowledgeAvailability} from '../../shared/research-knowledge.mjs';

// Only public configuration is shown. Configuration is not a live health check
// or evidence that the optional MAIN/PRO policy has been enabled.
export default function PlatformStatus({config,checking,onRefresh}){
 const titleId=useId();
 const rules=knowledgeAvailability(config);
 const state=checking?'checking':!config||config.connectionState==='error'?'unknown':rules.kind==='incompatible'?'incompatible':config.configured?'configured':'unconfigured';
 const label={checking:'正在检查',unknown:'状态待确认',configured:'模型已配置',unconfigured:'模型待配置',incompatible:'页面需更新'}[state];
 return <Popover>
  <PopoverTrigger asChild><Button variant="ghost" size="sm" className="platform-status-trigger" aria-label="平台与模型说明"><span className={'platform-status-dot is-'+state} aria-hidden="true"/><span className="platform-status-label">{label}</span><span className="platform-version">V4.8</span><Info size={14} aria-hidden="true"/></Button></PopoverTrigger>
  <PopoverContent align="end" className="platform-status-panel" aria-labelledby={titleId}>
   <div className="platform-panel-heading"><ShieldCheck size={20} aria-hidden="true"/><div><h2 id={titleId}>知衡 · V4.8</h2><p>让研究有依据，让进度可回看。</p></div></div>
   <div className="platform-connection" role="status"><strong>{label}</strong><p>{state==='incompatible'?'页面与服务使用的研究规则版本不匹配，请刷新页面。当前输入会保留。':state==='configured'?'服务已提供模型配置；实际可用性以本次请求结果为准。':state==='unconfigured'?'请由平台管理员完成模型配置。你仍可编辑和暂存研究问题。':state==='checking'?'正在读取平台配置，请稍候。':'暂时无法确认服务配置，请重新检查。已填写的研究内容会保留。'}</p></div>
   <details className="platform-version-explainer"><summary>平台版本与研究规则</summary><p>平台 V4.8 表示功能版本；当前页面使用的研究规则为 V{frameworkVersion}。规则与平台分别演进，报告保留任务当时使用的规则及快照，不随平台更新改写。</p></details>
   <dl><div><dt>研究与复核</dt><dd>统一模型接入，研究后独立复核；缺失资料仍如实披露。</dd></div><div><dt>中断后继续</dt><dd>按任务保存的进度与模型配置检查能否恢复，沿用原资料时点。</dd></div><div><dt>结果与依据</dt><dd>报告、审计和来源分别查看；草稿不能替代正式交付。</dd></div></dl>
   <p className="platform-policy-note">模型策略调整须先完成质量验收。平台版本不表示已启用自动升级，也不代表事实核验通过。</p>
   <Button type="button" variant="outline" size="sm" disabled={checking} onClick={onRefresh}><RefreshCw size={14} className={checking?'animate-spin':''}/>重新检查服务</Button>
  </PopoverContent>
 </Popover>;
}
