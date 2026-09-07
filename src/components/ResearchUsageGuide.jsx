import {ChevronDown,FileText,Activity,ShieldCheck,RotateCcw,Sparkles,RefreshCw} from 'lucide-react';
import {Button} from './ui/button';
import {Collapsible,CollapsibleTrigger,CollapsibleContent} from './ui/collapsible';
import './research-usage.css';

const topics=[
 {id:'start',icon:Sparkles,title:'开始一项研究',summary:'写下问题、核对标的，再确认研究路径与范围。',items:[
  ['先写什么','在研究工作台写明公司和想解决的问题，例如“快速筛选贵州茅台是否值得继续研究”或“比较腾讯与苹果的股东回报”。核对识别出的市场与股票代码，有歧义时手动调整。'],
  ['自动匹配与手动选择','自动匹配根据研究问题选择路径；未输入问题时显示待匹配，报告设置和补充背景在匹配后出现。也可手动选择快速筛选、深度研究、财报更新、多公司比较、组合分析或股东回报。手动选择优先于自动匹配。'],
  ['研究类型和报告深度有什么区别','研究类型决定要解决的问题与分析框架，报告深度决定展开程度。“深度研究”路径也可以采用“标准研究”的展开程度。历史范围会随路径调整：快速筛选固定近 5 年，股东回报固定近 8 年。'],
  ['什么时候可以开始','确认研究问题、标的和研究范围摘要；补充资料与背景按需填写。多公司比较需核对 2–3 个不同标的。若开始按钮不可用，按页面提示定位待处理项；尚未加入的资料或未保存的修改需先处理。'],
 ]},
 {id:'materials',icon:FileText,title:'准备与上传资料',summary:'支持文件、截图与文字笔记；失败文件可单独重试。',items:[
  ['如何加入资料','在工作台选择文件、拖入文件或粘贴截图，也可以直接粘贴文字。资料选填；有尚未加入的文字或未保存的修改时，先完成编辑再开始研究。'],
  ['文件如何整理','上传后由平台整理文档文字、表格单元格和原始值；扫描页与图表按需识别。图片识别可能存在误差，关键数字仍需对照原页。'],
  ['格式与限制','支持 PDF、DOCX、XLSX、PPTX、TXT、Markdown、CSV、TSV、JSON，以及 PNG、JPG、JPEG、WebP、BMP。最多 6 份，每份文件 10 MB，每份正文 2 万字、合计 6 万字。PDF 最多 100 页，每份最多补读 2 页原图；未覆盖范围会标注。'],
  ['编辑与原页关联','可预览、查找和修改整理后的文字。已关联原页的资料仅改名称会保留关联；修改正文后作为你的核对笔记使用。如需重新读取原页，请重新导入。'],
  ['上传资料如何参与研究','资料选填，作为补充线索进入分析；关键财务数据仍需与原始证据核对。资料中的文字要求不会替换平台研究规则，图片识别结果不能单独支持财务计算。'],
 ]},
 {id:'progress',icon:Activity,title:'查看研究进度',summary:'创建成功后可离开页面，在研究记录中继续跟进。',items:[
  ['在哪里查看进度','研究创建成功后，可在研究记录中筛选“进行中”，打开详情查看当前阶段和执行轨迹。列表中的“等待中”“研究中”“已完成”表示执行状态，不表示投资判断。'],
  ['研究开始后能离开吗','研究创建成功后可离开页面，稍后从研究记录查看进度。资料仍在导入时请保持页面；创建请求中断时，先到研究记录确认是否已有任务，再决定是否重新提交。'],
  ['平台会主动搜索吗','配置并启用搜索后，研究会先检查已有资料，再围绕缺口搜索、读取原文并补充核对。是否实际搜索、读取了哪些内容，以本次执行轨迹和证据来源为准。'],
  ['读取成功是否等于已经核实','不等于。目录和搜索结果不代表正文已读，图像识别不代表数字准确。查看证据来源中的报告期、读取范围与缺口；资料读取与原页复核卡片可查看已复读页码和未纳入原因。'],
 ]},
 {id:'report',icon:ShieldCheck,title:'阅读报告与审计记录',summary:'报告、审计、来源相互对照，区分结论和待验证事项。',items:[
  ['先看什么','先看研究结论、置信度、风险和判断改变的条件，再通过报告目录定位章节。审计记录展示复核与检查结果，证据来源展示所用资料，执行轨迹展示本次过程。'],
  ['为什么审计会提示问题','可能是引用不完整、数字口径不一致、资料缺失或报告结构不符合要求。系统会尝试补充与修正；尚未核实的事项会保留。审计通过也不代表事实或预测一定正确。'],
  ['已完成和研究判断有什么区别','“已完成”表示任务结束并交付结果；“观察”等研究判断表达本次分析结论，两者应分开看。结合置信度、证据缺口和判断改变的条件理解结果。'],
 ]},
 {id:'follow-up',icon:RefreshCw,title:'更新与复用研究',summary:'沿用已核对的输入，或对照旧报告检查新变化。',items:[
  ['沿用原来的问题与资料','打开研究详情，选择“复用研究输入”，确认问题、标的和补充资料后再开始。也可导出报告，保留当时的判断与证据。'],
  ['用新财报更新旧判断','在已完成的报告中选择“以本报告更新财报”，补充关注变量并确认对照研究。更新会核对本期变化及原有假设；没有旧报告时可以先建立本期基线。'],
  ['从快速筛选进入深度研究','快速筛选完成后，可根据报告提供的入口继续深度研究。此前的待验证事项可作为线索，关键证据仍需重新核对。组合研究还需补充持仓与风险约束。'],
 ]},
 {id:'recovery',icon:RotateCcw,title:'处理中断与失败恢复',summary:'区分文件导入、研究执行和结果保存，按提示继续。',items:[
  ['资料导入时能离开吗','导入期间请保持页面。文件逐个上传与读取，进度按已处理文件数统计。可取消导入，已加入的资料会保留；失败项可单独重试或移除。待处理原文件仅保留在当前页面，刷新或离开后需重新选择。'],
  ['研究失败后怎样继续','在研究记录中查看“失败”的任务，打开详情核对原因，再按提示重试研究或复用输入。重试是否可用，以该记录的恢复提示为准。'],
  ['仅结果保存失败怎么办','如果详情页提供“重试保存”，可只重试保存，无需重新取数或调用模型。尚未保存的结果依赖当前服务暂存，请及时处理；暂存不可用时按页面提示继续。'],
 ]},
];
export default function ResearchUsageGuide(){
 return <section className="research-usage" aria-labelledby="usage-title">
  <div className="usage-heading handbook-chapter-heading"><div><h2 id="usage-title">使用指南</h2><p>按操作顺序查阅，从第一项研究开始；各部分可同时展开。</p></div></div>
  <div className="usage-topics">{topics.map(({id,icon:Icon,title,summary,items},index)=><Collapsible key={id} defaultOpen={index===0} className="usage-topic"><CollapsibleTrigger asChild><Button variant="ghost" className="usage-trigger"><span className="usage-icon"><Icon size={19}/></span><span><strong>{title}</strong><small>{summary}</small></span><ChevronDown size={16}/></Button></CollapsibleTrigger><CollapsibleContent className="usage-body"><dl>{items.map(([label,copy])=><div key={label}><dt>{label}</dt><dd>{copy}</dd></div>)}</dl></CollapsibleContent></Collapsible>)}</div>
 </section>;
}
