import {RefreshCw,ShieldCheck} from 'lucide-react';
import {Button} from './ui/button';
import {Popover,PopoverTrigger,PopoverContent} from './ui/popover';
import {frameworkVersion} from '../../shared/research-framework.mjs';
import {platformVersion} from '../config/platform-release.mjs';

export default function PlatformStatusPanel({trigger,open,onOpenChange,titleId,state,label,checking,onRefresh}){
 return <Popover open={open} onOpenChange={onOpenChange}>
  <PopoverTrigger asChild>{trigger}</PopoverTrigger>
  <PopoverContent align="end" className="platform-status-panel" aria-labelledby={titleId}>
   <div className="platform-panel-heading"><ShieldCheck size={20} aria-hidden="true"/><div><h2 id={titleId}>知衡 · V{platformVersion}</h2><p>文档与图像按需读取，关键数字回到原页核对。</p></div></div>
   <div className="platform-connection" role="status"><strong>{label}</strong><p>{state==='incompatible'?'页面与服务使用的研究规则版本不匹配，请刷新页面。当前输入会保留。':state==='configured'?'服务已提供模型配置；实际可用性以本次请求结果为准。':state==='unconfigured'?'请由平台管理员完成模型配置。你仍可编辑和暂存研究问题。':state==='checking'?'正在读取平台配置，请稍候。':'暂时无法确认服务配置，请重新检查。已填写的研究内容会保留。'}</p></div>
   <dl><div><dt>文档与图像</dt><dd>整理报告文字与表格，按需补读扫描页、图表和截图；是否可读以本次处理结果为准。</dd></div><div><dt>读取与核实</dt><dd>读取结果仍需核对期间、单位、列归属和出处。模糊、缺页或未覆盖内容会保留限制。</dd></div><div><dt>中断后继续</dt><dd>按任务保存的进度与模型配置检查能否恢复，沿用原资料时点。</dd></div></dl>
   <div className="platform-version-explainer"><strong>平台与研究规则分别更新</strong><p>当前研究规则 V{frameworkVersion}；历史报告保留任务当时的规则与快照，不随平台 V{platformVersion} 更新改写。</p></div>
   <p className="platform-policy-note">模型策略调整须先完成质量验收。平台版本不表示已启用自动升级，也不代表事实核验通过。</p>
   <Button type="button" variant="outline" size="sm" disabled={checking} onClick={onRefresh}><RefreshCw size={14} className={checking?'animate-spin':''}/>重新检查服务</Button>
  </PopoverContent>
 </Popover>;
}
