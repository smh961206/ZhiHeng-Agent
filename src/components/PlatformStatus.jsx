import {useId,useState} from 'react';
import {Info} from 'lucide-react';
import {Button} from './ui/button';
import {knowledgeAvailability} from '../../shared/research-knowledge.mjs';
import {platformVersion} from '../config/platform-release.mjs';

// Only public configuration is shown. Configuration is not a live health check
// or evidence that the optional MAIN/PRO policy has been enabled.
export default function PlatformStatus({config,checking,onRefresh}){
 const titleId=useId();
 const [Panel,setPanel]=useState(null),[open,setOpen]=useState(false),[loading,setLoading]=useState(false),[loadError,setLoadError]=useState(false);
 const rules=knowledgeAvailability(config);
 const state=checking?'checking':!config||config.connectionState==='error'?'unknown':rules.kind==='incompatible'?'incompatible':config.configured?'configured':'unconfigured';
 const label={checking:'正在检查',unknown:'状态待确认',configured:'模型已配置',unconfigured:'模型待配置',incompatible:'页面需更新'}[state];
 async function showPanel(){
  if(loadError){window.location.reload();return;}
  if(loading)return;setLoading(true);
  try{const module=await import('./PlatformStatusPanel');setPanel(()=>module.default);setOpen(true);}
  catch{setLoadError(true);}finally{setLoading(false);}
 }
 const trigger=<Button variant="ghost" size="sm" className="platform-status-trigger" aria-label="平台与模型说明" aria-busy={loading||undefined} disabled={loading}
  {...(!Panel?{'aria-haspopup':'dialog','aria-expanded':false,'aria-describedby':loadError?titleId:undefined,onClick:showPanel}:{})}>
  <span className={'platform-status-dot is-'+state} aria-hidden="true"/><span className="platform-status-label">{label}</span><span className="platform-version">V{platformVersion}</span><Info size={14} aria-hidden="true"/>
 </Button>;
 return Panel?<Panel trigger={trigger} open={open} onOpenChange={setOpen} titleId={titleId} state={state} label={label} checking={checking} onRefresh={onRefresh}/>:<>{trigger}{loadError&&<span id={titleId} role="alert">说明暂时无法加载，请点击说明按钮刷新重试。</span>}</>;
}
