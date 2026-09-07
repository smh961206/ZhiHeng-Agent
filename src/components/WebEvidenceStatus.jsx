import {Globe,ArrowUpRight} from 'lucide-react';
import {Button} from './ui/button';
import {webEvidenceProgress} from '../../shared/web-evidence-progress.mjs';

export default function WebEvidenceStatus({job,onSources}) {
 const {web,followup,searches,sources,checks,remaining,reusedSearches,duplicateCandidates}=webEvidenceProgress(job);
 if(!web&&!followup)return null;
 const active=['queued','running'].includes(job.status);
 const message=followup?.status==='running'?'正在补查关键证据，先核对已有原文，必要时搜索网页。'
  :searches?`本次已搜索 ${searches} 次，新增 ${sources} 份已读取的网页资料。`
   :checks.length&&remaining===0?'关键缺口已在现有原文中定位到证据，本次未发起网页搜索。'
    :active?'先核对已有资料，再按可公开核实的缺口补查网页。':'本次未发起网页搜索。';
 return <section className="rd-web-status" aria-label="网页补证状态">
  <Globe size={17}/><div><strong>网页补证</strong><p>{message}</p>
   {web&&!web.configured&&<small>{web.enabled?'搜索服务未配置。':'网页搜索已关闭。'}</small>}
   {reusedSearches>0&&<small>已复用 {reusedSearches} 次本次检索资料，未重复联网；各项缺口仍需分别核对。</small>}
   {duplicateCandidates>0&&<small>已跳过 {duplicateCandidates} 个重复候选链接，将读取名额留给不同原文。</small>}
   {remaining>0&&<small>仍有 {remaining} 项待核实或受限事项；处理原因见执行轨迹，最终报告须保留未解决缺口。</small>}
  </div>{sources>0&&<Button variant="ghost" size="sm" onClick={onSources}>查看来源<ArrowUpRight size={13}/></Button>}
 </section>;
}
