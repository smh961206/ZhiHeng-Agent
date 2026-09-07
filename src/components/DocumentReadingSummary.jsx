import {ChevronDown,FileText,ScanLine} from 'lucide-react';
import {Button} from './ui/button';

export default function DocumentReadingSummary({job,onSources}){
 const audit=job.visualAudit;
 if(!job.modelRouting&&!audit)return null;
 const included=audit?.included??[],omitted=audit?.omitted??[];
 const rejected=audit?.delivery==='rejected',partial=rejected||omitted.length>0;
 const materials=[...(job.input?.sources??[]),...(job.sources??[]),...(job.input?.referenceMaterials??[])];
 const name=id=>materials.find(item=>item.id===id)?.title;
 return <details className={`rd-document-reading${partial?' has-gaps':''}`}>
  <summary><span className="rd-document-icon"><ScanLine size={18}/></span><span className="rd-document-heading"><strong>资料读取与原页复核</strong><span>{!audit?'文字与图像分别读取，整理后交给 Pro 分析':rejected?'本次原页复核未完成，请查看原因':`Vision 已复读 ${included.length} 份资料原页，${omitted.length} 份未纳入`}</span></span><span className="rd-document-label">{partial?'有待核对':audit?'查看范围':'处理说明'}</span><ChevronDown size={16} className="rd-document-chevron"/></summary>
  <div className="rd-document-body">
   <p>Vision 负责读取扫描页、图表和截图；Pro 结合转写内容与其他证据进行分析和审计。读取完成不代表数据已经核实。</p>
   {audit&&<><div className="rd-document-coverage">
    <section aria-label="已复读原页"><h3>已复读原页 <span>{included.length}</span></h3>{included.length?<ul>{included.map((item,index)=><li key={`${item.id}-${index}`}><FileText size={14}/><div><strong>{item.id}{name(item.id)?` · ${name(item.id)}`:''}</strong><span>{item.pages?.length?`第 ${item.pages.join('、')} 页`:'页码未记录'}</span></div></li>)}</ul>:<p>本次没有已复读的原页记录。</p>}</section>
    <section aria-label="未纳入原页复核"><h3>未纳入原页复核 <span>{omitted.length}</span></h3>{omitted.length?<ul>{omitted.map((item,index)=><li key={`${item.id}-${index}`}><FileText size={14}/><div><strong>{item.id}{name(item.id)?` · ${name(item.id)}`:''}</strong><span>{item.reason||'未记录原因，请结合来源说明核对。'}</span></div></li>)}</ul>:<p>{rejected?'本次未形成完整的原页复核记录，请查看下方原因。':'本次复核记录中没有遗漏项；不代表整份文件已逐页核对。'}</p>}</section>
   </div>{rejected&&<p className="rd-document-warning">{audit.notice||'原页复核结果未能交付，请结合已有文字和原始资料继续核对。'}</p>}</>}
   <div className="rd-document-footer"><span>关键数字仍需核对期间、单位和原始出处。</span><Button type="button" variant="outline" size="sm" onClick={onSources}>查看证据来源</Button></div>
  </div>
 </details>;
}
