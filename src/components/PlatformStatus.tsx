import {useId,useState} from 'react';
import {Info} from 'lucide-react';
import {Button} from './ui/button';
import {knowledgeAvailability} from '../domain/research-knowledge.ts';

// Only public configuration is shown. Configuration is not a live health check
// or evidence that any configured stage has completed a real call.
export default function PlatformStatus({config,checking,onRefresh}){
 const titleId=useId();
 const [Panel,setPanel]=useState(null),[open,setOpen]=useState(false),[loading,setLoading]=useState(false),[loadError,setLoadError]=useState(false);
 const rules=knowledgeAvailability(config);
 const state=checking?'checking':!config||config.connectionState==='error'?'unknown':rules.kind==='incompatible'?'incompatible':rules.kind==='pending'?'pending':config.configured?'configured':'unconfigured';
 const label={checking:'正在检查',unknown:'状态待确认',configured:'研究服务已就绪',unconfigured:'研究服务待配置',incompatible:'页面需更新',pending:'规则更新待确认'}[state];
 const statusTitle=state==='unknown'?'暂未确认服务状态':state==='checking'?'正在检查研究服务':state==='configured'?label:rules.title;
 const statusDescription=state==='unknown'?'输入已保留，请重新检查连接后开始。':state==='checking'?'正在检查研究服务，请稍候。':state==='configured'?`可以开始新的研究。具体资料能否取得，以本次研究结果为准。${rules.description}`:rules.description;
 async function showPanel(){
  if(loadError){window.location.reload();return;}
  if(loading)return;setLoading(true);
  try{const module=await import('./PlatformStatusPanel');setPanel(()=>module.default);setOpen(true);}
  catch{setLoadError(true);}finally{setLoading(false);}
 }
 const trigger=<Button variant="ghost" size="sm" className="platform-status-trigger" aria-label="平台运行说明" aria-busy={loading||undefined} disabled={loading}
  {...(!Panel?{'aria-haspopup':'dialog','aria-expanded':false,'aria-describedby':loadError?titleId:undefined,onClick:showPanel}:{})}>
  <span className={'platform-status-dot is-'+state} aria-hidden="true"/><span className="platform-status-label">{label}</span><Info size={14} aria-hidden="true"/>
 </Button>;
 return Panel?<Panel trigger={trigger} open={open} onOpenChange={setOpen} titleId={titleId} statusTitle={statusTitle} statusDescription={statusDescription} checking={checking} onRefresh={onRefresh}/>:<>{trigger}{loadError&&<span id={titleId} role="alert">说明暂时无法加载，请点击说明按钮刷新重试。</span>}</>;
}
