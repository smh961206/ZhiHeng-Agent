import {Search,X,ChevronDown,FileText,Activity,ShieldCheck,RotateCcw,Sparkles,RefreshCw} from 'lucide-react';
import {Input} from './ui/input';
import {Button} from './ui/button';
import {Collapsible,CollapsibleTrigger,CollapsibleContent} from './ui/collapsible';
import './research-usage.css';
import {useEffect,useRef,useState} from 'react';
import {useLocation} from 'react-router';

const topics=[
 {id:'start',icon:Sparkles,title:'创建研究',summary:'写清问题，确认公司、研究路径和范围后开始。',items:[
  ['问题应该怎么写','写明公司和希望解决的问题，例如“快速筛选贵州茅台是否值得继续研究”或“比较腾讯与苹果的股东回报”。问题越具体，研究范围和交付重点越清楚。'],
  ['先核对公司和股票代码','确认自动识别的公司名称、市场和股票代码。遇到同名公司、多地上市或代码歧义时，先手动调整再继续。'],
  ['自动识别还是手动选择','平台会根据问题匹配快速筛选、深度研究、财报更新、多公司比较、组合分析或股东回报。你也可以手动选择；手动选择后，以你的选择为准。'],
  ['研究路径和报告深度有什么区别','研究路径决定要解决的问题与分析框架，报告深度决定内容展开程度。“深度研究”也可以选择标准展开。历史范围会随路径调整：快速筛选固定近 5 年，股东回报固定近 8 年。'],
  ['开始前检查什么','确认问题、标的和研究范围摘要；补充资料与背景按需填写。多公司比较需核对 2–3 个不同标的。按钮不可用时，按页面提示处理尚未加入的资料或未保存的修改。'],
  ['减仓、清空和交易复盘怎样开始','在首页组合分析场景选择具体问题，或在工作台写明持仓和调整目的。相关任务会提示填写交易当时依据、原目标、已执行档位与新事实；可加入填写提纲，已有文字会保留。持仓与风险约束仍需单独核对，信息不足时只给条件式框架。'],
 ]},
 {id:'materials',icon:FileText,title:'添加研究资料',summary:'上传文件、截图或文字笔记，并确认读取范围。',items:[
  ['如何加入资料','在工作台选择文件、拖入文件或粘贴截图，也可以直接粘贴文字。资料选填；有尚未加入的文字或未保存的修改时，先完成编辑再开始研究。'],
  ['文件如何整理','文档先提取文字与表格；扫描页、图表和截图按需读取原图。读取完成不代表数字已经核实：负号、小数点、期间、单位和列归属都需对照原页。'],
  ['截图和扫描件怎样准备','尽量使用清晰原件，保留公司名称、报告期间、表头、单位和脚注，避免只截一个数字。跨页表格需保留续表标题；若只提供部分页面，研究范围也会受限。'],
  ['图片模糊或读取不完整怎么办','先查看处理提示与读取范围，再补充清晰页面或文字说明。重复提交同一张模糊图片不保证改善结果；无法读清的数字保留缺口，不推算填齐。'],
  ['格式与限制','支持 PDF、DOCX、XLSX、PPTX、TXT、Markdown、CSV、TSV、JSON，以及 PNG、JPG、JPEG、WebP、BMP。最多 6 份，每份文件 10 MB，每份正文 2 万字、合计 6 万字。PDF 最多 100 页，每份最多补读 2 页原图；未覆盖范围会标注。'],
  ['编辑与原页关联','可预览、查找和修改整理后的文字。已关联原页的资料仅改名称会保留关联；修改正文后作为你的核对笔记使用。如需重新读取原页，请重新导入。'],
  ['上传资料如何参与研究','资料选填，作为补充线索进入分析；关键财务数据仍需与原始证据核对。资料中的文字要求不会替换平台研究规则，图片识别结果不能单独支持财务计算。'],
 ]},
 {id:'progress',icon:Activity,title:'跟踪研究进度',summary:'创建成功后可离开页面，之后从研究记录继续查看。',items:[
  ['研究会怎样自动进行','先确认研究路径、标的与范围，平台会按当前问题依次准备资料、查证、计算和复核。符合恢复条件的任务沿用原进度、资料时点与规则；不符合时，页面会说明重新开始的方式，旧记录仍保留。'],
  ['在哪里查看进度','研究创建成功后，可在研究记录中筛选“进行中”，打开详情查看当前阶段和执行轨迹。列表中的“等待中”“研究中”“已完成”表示执行状态，不表示投资判断。'],
  ['研究开始后能离开吗','研究创建成功后可离开页面，稍后从研究记录查看进度。资料仍在导入时请保持页面；提交结果不确定时，可先查看研究记录。同一标签页保留了提交信息时，刷新后再次提交相同输入会找回已创建的任务；页面不会自动重试提交。'],
  ['平台会主动搜索吗','配置并启用搜索后，研究会先检查已有资料，再围绕缺口搜索、读取原文并补充核对。是否实际搜索、读取了哪些内容，以本次执行轨迹和证据来源为准。'],
  ['财报之外会补读哪些公告','针对已确认的A股标的，平台可按产销、股本、利润分配、回购或股东回报主题补读官方公告。页面会保留公告日期、来源和未能读取的情况，但不保证覆盖全部公告。拿到正文后仍须核对期间、单位及方案是否实施。其他市场会结合已有资料和可用的公开来源补证。'],
  ['读取成功是否等于已经核实','不等于。目录和搜索结果不代表正文已读，图像识别不代表数字准确。查看证据来源中的报告期、读取范围与缺口；资料读取与原页复核卡片可查看已复读页码和未纳入原因。'],
 ]},
 {id:'report',icon:ShieldCheck,title:'阅读与核对结果',summary:'结合报告、审计和证据来源理解结论与限制。',items:[
  ['怎样确认本次研究依据','打开“研究过程”查看研究范围和实际使用的规则，再从“证据来源”核对报告、公告和网页原文。旧记录没有保存的内容不会按当前版本补齐。'],
  ['怎样查看研究过程','研究过程按顺序展示进展、规则、资料读取和使用记录。普通阅读先看进展与资料覆盖即可；需要进一步追查时，再展开相应记录。'],
  ['什么时候会进行额外复核','当审计发现重复且明确的问题时，平台可能增加一次独立复核。额外复核不会代替证据，也不会因为资料缺失自动提高结论强度；最终仍以报告中的限制和待验证事项为准。'],
  ['怎样核对分红与敏感性','在详情的“审计记录”中打开“分红与敏感性核对”，选择实际计算轮次。分红表按利润归属年汇总，TTM按派息日计算，预案、实施与修订使用同一事件标识去重；缺失年份不补零。官方汇总与逐年重算的差额保留。计算输入中的事件身份、原数和完整性仍须回到公告核对。'],
  ['敏感性网格从哪里来','网格引用本次已返回的DCF计算，只改变增长率和折现率，最多5×5格。折现率不大于永续增长率等无效组合显示不可计算，其他格仍可查看。派息情景引用实际盈利模型，并记录规划期限与期后沿用假设。它们不是新的独立估值模型、未来分红承诺或保证收益；旧任务没有调用记录时不会补造。'],
  ['五年和季度数据是否真的齐全','详情页展开“本次查证记录”，在“财务数值覆盖”中按调用编号查看年度、最近八个自然季度的缺失指标和冲突，以及由累计流量推导的单季。这里统计的是实际计算输入，财报份数不能替代数值覆盖；期间以本次最晚输入为锚，仍须核对有无更新披露。旧任务没有覆盖返回时会明确提示，导出保留相同记录。'],
  ['原数核对失败后怎么办','平台会在同一份报告的其他可用位置查找带标签的原数，并补读候选原页与表头，确认期间、单位和列归属后重新核对。找到候选不代表问题已经解决；旧页的符号或识别限制、原失败和后续结果都会保留。若仍缺上年同期余额，不能用半年报中的流量比较列补造。'],
  ['先看什么','顶部摘要概括研究状态、置信度和估值适用性；点击“核对估值依据”查看方法与限制。完整分析在下方报告正文，详细判断依据和阅读提示按需打开，不挤占正文。再通过报告目录定位章节。审计记录展示复核与检查结果，证据来源展示所用资料，执行轨迹展示本次过程。'],
  ['怎样查看并导出完整记录','在“本次查证记录”点击“查看调用”，进入“执行轨迹”并展开“查看调用详情”。有调用编号时可按编号对照；编号显示“未记录”时，直接核对该条记录保存的输入与返回，没有保存的内容不会补齐。可搜索或筛选返回错误、未保存返回的记录；“研究过程”用于查看研究依据、执行阶段与资料覆盖。公开计划和证据依据供复核，不包含内部推理内容。所有研究路径默认导出完整研究记录；也可改为“报告、审计与来源”，省略逐条处理记录。'],
  ['研究会怎样核对关键数字','平台可在本次资料库中定位财报页码，保留表头与正文，必要时补读原图。随后检查原数，并复算同期变化、TTM、PE/PB和敏感性。数字匹配和复算仍不代表财务口径一定正确，待核实项会进入审计。'],
  ['怎样核对研发、股本和估值分歧','研发核算分别保留总投入、费用化和资本化，比较同期资本化率与现金再投资；税前敏感性不自动等于归母利润调整。估值快照区分归母与普通股权益，A股价乘A+H总股数仅是权益等值。多种估值方法通过实际计算记录对照，并区分主方法与压力测试；不取平均掩盖冲突。'],
  ['查证记录的状态表示什么','详情页“本次查证记录”按实际工具返回整理。“已返回 · 待判读”不代表核验通过；部分读取、无结果、数字不匹配等显示“有待回查记录”。历史失败即使重试后也会保留。未记录调用可能是不适用或尚未执行，可展开执行轨迹回查输入与返回。'],
  ['研究会一直查下去吗','研究会在合理范围内围绕证据缺口继续查证。达到安全上限后，平台会整理已有证据和仍未解决的问题，再进入复核；网络限制、原图读取失败和证据缺口都会如实保留。'],
  ['现金流增长需要核对什么','含财务子公司的公司，合并经营现金流会受到客户存款和银行存放款项变动的影响。研究需按带符号的现金流贡献做同期桥接，保留来源和未解释差额；剔除若干项目的余额仍不是标准化自由现金流。可在工具记录中检查两期输入、符号、来源和未解释差额。'],
  ['为什么审计会提示问题','可能是引用不完整、数字口径不一致、资料缺失或报告结构不符合要求。系统会尝试补充与修正；尚未核实的事项会保留。审计通过也不代表事实或预测一定正确。'],
  ['怎样核对正文中的证据','点击报告或审计正文中带下划线的证据编号，打开对应来源并查看已保存的内容。核对后点击“返回报告原文”或“返回审计原文”，回到刚才的阅读位置。未关联来源的编号保持原文，不会跳到其他资料。'],
  ['已完成和研究判断有什么区别','“已完成”表示任务结束并交付结果；“观察”等研究判断表达本次分析结论，两者应分开看。结合置信度、证据缺口和判断改变的条件理解结果。'],
  ['怎样核对组合执行','相关报告摘要把研究状态与组合动作分开。点击“查看执行复核”可定位审计区域，按存在限制、已检查或不适用筛选；每项保留原因，引用入口可打开证据来源并定位对应资料。旧报告没有这些结构化记录时保留原审计正文，不补造检查结果。'],
 ]},
 {id:'follow-up',icon:RefreshCw,title:'更新或复用研究',summary:'沿用已有输入，或用新资料检查原判断是否改变。',items:[
  ['沿用原来的问题与资料','打开研究详情，选择“复用研究输入”，确认问题、标的和补充资料后再开始。也可导出报告，保留当时的判断与证据。'],
  ['用新财报更新旧判断','在已完成的报告中选择“以本报告更新财报”，补充关注变量并确认对照研究。更新会核对本期变化及原有假设；没有旧报告时可以先建立本期基线。'],
  ['所选旧报告无法核对怎么办','先点击“刷新可用记录”。若报告已删除或不覆盖当前标的，可以重新选择，或取消所选对照并填写外部旧结论。取消选择会保留已经填写的文字；没有旧报告和旧结论时建立本期基线。'],
  ['从快速筛选进入深度研究','快速筛选完成后，可根据报告提供的入口继续深度研究。此前的待验证事项可作为线索，关键证据仍需重新核对。组合研究还需补充持仓与风险约束。'],
 ]},
 {id:'recovery',icon:RotateCcw,title:'处理中断与失败',summary:'先判断问题发生在资料、研究还是保存阶段，再按提示恢复。',items:[
  ['资料导入时能离开吗','导入期间请保持页面。文件逐个上传与读取，进度按已处理文件数统计。可取消导入，已加入的资料会保留；失败项可单独重试或移除。待处理原文件仅保留在当前页面，刷新或离开后需重新选择。'],
  ['研究失败后怎样继续','打开失败记录，先查看页面提供的恢复方式。条件允许时优先沿用已保存的研究进度和原资料时点；未完整返回的处理可能重新发起。任务环境或检查点不兼容时会说明原因，也不会强行混用旧计算。页面显示“重新开始研究”时，会先把原输入带回工作台；确认提交后创建新任务，原记录不变。'],
  ['未完成的研究能导出吗','可以在详情页查证记录区域点击“导出已保存记录”，下载公开计划、已保存的工具输入与返回、运行提示和来源目录。进行中、取消或失败均可导出；这是当前记录快照，不包含未保存内容、内部隐藏思维或未完成的正式报告。正式报告保存后仍可通过“导出报告”选择完整研究记录。'],
  ['仅结果保存失败怎么办','如果详情页提供“重试保存”，可只重试保存，无需重新获取和分析资料。尚未保存的结果依赖当前服务暂存，请及时处理；暂存不可用时按页面提示继续。'],
 ]},
];
export default function ResearchUsageGuide(){
 const {hash,key}=useLocation(),frame=useRef(null),root=useRef(null),returnPositions=useRef(new Map());
 const [opened,setOpened]=useState(()=>new Set(['start']));
 const [query,setQuery]=useState(''),[searchClosed,setSearchClosed]=useState(()=>new Set()),searchInput=useRef(null);
 const words=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean),searching=words.length>0;
 const visibleTopics=searching?topics.map(topic=>({...topic,items:topic.items.filter(item=>words.every(word=>[topic.title,...item].join(' ').toLocaleLowerCase().includes(word)))})).filter(topic=>topic.items.length):topics;
 const resultCount=visibleTopics.reduce((sum,topic)=>sum+topic.items.length,0);
 function search(value){setQuery(value);setSearchClosed(new Set());}
 function clearSearch(){search('');searchInput.current?.focus();}
 function reveal(id){
  search('');
  setOpened(current=>new Set([...current,id]));
  cancelAnimationFrame(frame.current);
  frame.current=requestAnimationFrame(()=>{
   const target=document.getElementById('usage-'+id);
   const tabs=target?.closest('.handbook-tabs')?.querySelector(':scope > [role="tablist"]');
   if(target&&tabs)target.style.scrollMarginTop=`${tabs.getBoundingClientRect().height+16}px`;
   target?.focus({preventScroll:true});target?.scrollIntoView({block:'start',behavior:'instant'});
  });
 }
 useEffect(()=>{
  const section=root.current,scroller=section?.closest('.page-scroll');
  const id=topics.find(topic=>hash==='#usage-'+topic.id)?.id;
  if(id)reveal(id);
  else if(!hash&&scroller&&returnPositions.current.has(key)){
   const saved=returnPositions.current.get(key);
   frame.current=requestAnimationFrame(()=>{
    if(saved.focus?.isConnected)saved.focus.focus({preventScroll:true});
    scroller.scrollTo({top:saved.top,behavior:'instant'});
   });
  }
  return()=>{
   cancelAnimationFrame(frame.current);
   // The app scrolls a nested container, so browser history cannot restore it.
   // Save the unanchored guide entry before reveal moves to a topic.
   if(!hash&&scroller)returnPositions.current.set(key,{top:scroller.scrollTop,focus:section.contains(document.activeElement)?document.activeElement:null});
  };
 },[hash,key]);
 return <section ref={root} className="research-usage" aria-labelledby="usage-title">
  <div className="usage-heading handbook-chapter-heading"><div><span className="handbook-chapter-kicker">按任务阶段查阅</span><h2 id="usage-title">完成一项研究</h2><p>按创建、资料、进度、结果、更新和恢复六个阶段查找答案；章节可以分别展开，也可以同时对照。</p></div></div>
  <div className="usage-search"><Search size={18} aria-hidden="true"/><Input ref={searchInput} type="search" aria-label="搜索使用指南" placeholder="搜索问题，例如：上传、保存、更新财报" value={query} onChange={event=>search(event.target.value)} onKeyDown={event=>{if(event.key==='Escape'&&query){event.preventDefault();clearSearch();}}}/>{query&&<Button type="button" variant="ghost" size="icon" aria-label="清空指南搜索" onClick={clearSearch}><X size={16} aria-hidden="true"/></Button>}</div>
  <nav className="usage-shortcuts" aria-label="按阶段查找说明">{topics.map(topic=><Button type="button" variant="outline" size="sm" key={topic.id} onClick={()=>reveal(topic.id)}>{topic.title}</Button>)}</nav>
  {searching&&<p className="usage-search-status" role="status">{resultCount?'找到 '+resultCount+' 条说明，分布在 '+visibleTopics.length+' 个阶段':'没有找到相关说明，试试更短的关键词。'}</p>}
  {searching&&!resultCount&&<Button type="button" variant="outline" onClick={clearSearch}>清除搜索，查看全部说明</Button>}
  <div className="usage-topics">{visibleTopics.map(({id,icon:Icon,title,summary,items})=><Collapsible key={id} id={'usage-'+id} tabIndex={-1} open={searching?!searchClosed.has(id):opened.has(id)} onOpenChange={open=>searching?setSearchClosed(current=>{const next=new Set(current);if(open)next.delete(id);else next.add(id);return next;}):setOpened(current=>{const next=new Set(current);if(open)next.add(id);else next.delete(id);return next;})} className="usage-topic"><CollapsibleTrigger asChild><Button variant="ghost" className="usage-trigger"><span className="usage-icon"><Icon size={19}/></span><span><strong>{title}</strong><small>{summary}</small></span><ChevronDown size={16}/></Button></CollapsibleTrigger><CollapsibleContent className="usage-body"><dl>{items.map(([label,copy])=><div key={label}><dt>{label}</dt><dd>{copy}</dd></div>)}</dl></CollapsibleContent></Collapsible>)}</div>
 </section>;
}
