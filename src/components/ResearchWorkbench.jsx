import {KnowledgeStatus,DepthScope} from './ResearchKnowledge';
import DeepExecutionOverview from './DeepExecutionOverview';
import './agent-capabilities.css';
import {researchOutcomeCopy} from '../config/research-presentation';
import {researchSettings} from '../config/research-settings';
import './research-method.css';
import {executionTasks} from '../../shared/execution-discipline.mjs';
import {comparisonCopy} from '../../shared/company-comparison.mjs';
import {earningsUpdateCopy} from '../../shared/earnings-update.mjs';
import {deepResearchCopy} from '../../shared/deep-research.mjs';
import {useEffect,useRef,useState} from 'react';

import {ArrowRight,ArrowUpRight,BookOpen,Check,ChevronRight,CircleAlert,Layers,LoaderCircle,Search,ShieldCheck,Sparkles,Activity,ChartNoAxesCombined} from 'lucide-react';
import {Button} from './ui/button';
import {Card,CardHeader,CardContent,CardFooter} from './ui/card';
import {Textarea} from './ui/textarea';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from './ui/select';
import './workbench-layout.css';
import DataConnect from '../DataConnect';
import ResearchContext from './ResearchContext';
import ResearchMaterials from './ResearchMaterials';
import ResearchPreparation from './ResearchPreparation';
import {researchPreparation} from '../../shared/research-preparation.mjs';
import {quickScreenCopy} from '../../shared/quick-screen-copy.mjs';
import {modes as frameworkModes,resolveMode} from '../../shared/research-framework.mjs';

const modeIcons={A:Search,B:BookOpen,C:Activity,D:Layers,E:ChartNoAxesCombined,F:ShieldCheck};
export const researchModes=[['auto','自动匹配','根据问题选择研究路径，可手动调整',Sparkles],...Object.entries(frameworkModes).map(([id,item])=>[id,item.name,item.description,modeIcons[id]])];
const examples=[['贵州茅台值不值得研究','A股贵州茅台值不值得研究'],['股东回报对比','对比腾讯与苹果的股东回报']];
const screenExamples=[['贵州茅台快速筛选','A股贵州茅台值不值得研究'],['比亚迪快速筛选',quickScreenCopy.example],['苹果财务快筛','快速筛选苹果是否值得进一步研究，重点检查盈利质量与估值适用性。']];
function Choice({label,value,onChange,options,disabled,help}){
 return <div className="choice-field"><span>{label}</span><Select value={String(value)} onValueChange={onChange} disabled={disabled}><SelectTrigger aria-label={label}><SelectValue/></SelectTrigger><SelectContent>{options.map(([v,l])=><SelectItem key={v} value={String(v)}>{l}</SelectItem>)}</SelectContent></Select>{help&&<small>{help}</small>}</div>;
}
export default function ResearchWorkbench({focusRequest=0,pathDecision,question,setQuestion,mode,setMode,depth,setDepth,portfolio,setPortfolio,historyYears,setHistoryYears,resolution,busy,onStart,jobs,jobsLoading,jobsError,onRefreshJobs,previousResearch,setPreviousResearch,baselineJobId,setBaselineJobId,portfolioContext,setPortfolioContext,referenceMaterials,setReferenceMaterials,materialsReading,setMaterialsReading,materialsPending,setMaterialsPending,materialDraft,setMaterialDraft,materialDraftTitle,setMaterialDraftTitle,materialEditDraft,setMaterialEditDraft,draftStatus,onClear,config,configChecking,onRefreshConfig}){
 const questionInput=useRef(null),form=useRef(null),securitiesSection=useRef(null),settingsSection=useRef(null),materialsSection=useRef(null);
 useEffect(()=>{if(focusRequest)questionInput.current?.focus({preventScroll:true});},[focusRequest]);
 const [scopeOnSide,setScopeOnSide]=useState(()=>typeof window!=='undefined'&&window.matchMedia('(min-width: 1280px)').matches);
 useEffect(()=>{const media=window.matchMedia('(min-width: 1280px)'),sync=()=>setScopeOnSide(media.matches);media.addEventListener('change',sync);return()=>media.removeEventListener('change',sync);},[]);

 const awaitingMode=mode==='auto'&&!question.trim();
 const effectiveMode=awaitingMode?null:mode==='auto'?(pathDecision?.mode??resolveMode({question,mode})):mode;
 const quick=effectiveMode==='A',deep=effectiveMode==='B',update=effectiveMode==='C',comparison=effectiveMode==='D';
 const settings=researchSettings[effectiveMode],settingsPending=awaitingMode||pathDecision?.pending;
 const preparation=researchPreparation({question,mode:effectiveMode,depth,historyYears,portfolio,previousResearch,baselineJobId,portfolioContext},resolution,{pathPending:pathDecision?.pending,materialsReading,materialsPending,materialEditDraft,materialDraft,busy,config,jobs,jobsLoading,jobsError});

 const contextProps={jobsLoading,jobsError,onRefreshJobs,execution:preparation.plan.execution,previousResearch,setPreviousResearch,baselineJobId,setBaselineJobId,portfolioContext,setPortfolioContext};
 const automaticPath=mode==='auto';
 const matchedMode=question.trim()?(automaticPath?effectiveMode:resolveMode({question,mode:'auto'})):null;
 const currentMode=researchModes.find(item=>item[0]===(automaticPath?matchedMode:mode))||researchModes[0];
 const CurrentModeIcon=currentMode[3];

 const ready=preparation.ready,step=preparation.issues.some(issue=>issue.id==='question')?1:pathDecision?.pending?2:preparation.issues.some(issue=>issue.id==='securities')?3:4;

 const readiness=preparation.ready&&!busy&&settings?`${preparation.securities.length} 个标的已就绪，可开始${settings.task}`:preparation.message;
 const readinessLoading=busy||materialsReading||resolution.status==='loading'||pathDecision?.pending||preparation.baseline?.pending;
 function goToStep(value){const target=value==='execution'?document.getElementById('execution-background'):value===2||value==='path'?document.getElementById('research-path'):value===1||value==='question'?questionInput.current:value===3||value==='securities'?securitiesSection.current:value==='materials'?materialsSection.current:settingsSection.current;target?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'});target?.focus({preventScroll:true});}
 function selectMode(value){setMode(value);if(value==='B')setDepth('Deep');}
 return <section className="research-workbench">
  <header className="page-heading workbench-heading"><div><h1>研究工作台</h1><p>先明确问题，再确认标的、研究路径和资料范围。模型由平台按已启用的配置执行。</p></div></header>
  <KnowledgeStatus config={config} checking={configChecking} onRefresh={onRefreshConfig}/>
  <div className="workspace-grid">
   <Card className="workbench-composer gap-0 py-0">
    <CardHeader className="composer-intro"><div><span className="composer-title-icon"><Sparkles size={19}/></span><div><h2>{pathDecision?.pending?'正在匹配研究路径':quick?'开启一项快速筛选':deep?'开启一项深度研究':update?'开启一项财报更新':comparison?'开启一项多公司比较':effectiveMode==='F'?'开启一项股东回报研究':effectiveMode==='E'?'开启一项组合分析':'开启一项新研究'}</h2><p>{pathDecision?.pending?'可以继续输入；确认路径后，研究范围与交付内容会同步更新。':quick?'核对五年与近期季度的实际数值，保留补查记录与缺口，判断是否值得进入深度研究。':deep?deepResearchCopy.intro:update?earningsUpdateCopy.intro:comparison?comparisonCopy.intro:effectiveMode==='F'?frameworkModes.F.goal:effectiveMode==='E'?'先核对组合风险；涉及减仓、清空或复盘时，分别说明公司判断与执行条件。':'明确研究对象与关注点，按证据形成可回看的判断。'}</p></div></div><span className="composer-private"><ShieldCheck size={13}/>证据可追溯</span></CardHeader>
    <nav className="composer-steps" aria-label="新建研究步骤">{[[1,'研究问题'],[2,'研究路径'],[3,'核对标的'],[4,'研究设置']].map(([value,label])=><Button type="button" variant="ghost" size="sm" key={value} aria-current={step===value?'step':undefined} className={step>value?'step-complete':''} onClick={()=>goToStep(value)}><span>{step>value?<Check size={12}/>:value.toString().padStart(2,'0')}</span>{label}{value<4&&<ChevronRight size={13} className="step-divider"/>}</Button>)}</nav>
    <form ref={form} onSubmit={onStart} onKeyDown={event=>{if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)&&!event.nativeEvent.isComposing){event.preventDefault();if(ready&&!busy)form.current?.requestSubmit();}}}>
     <CardContent className="workbench-form-body">
      <div className="question-section"><div className="field-heading"><label className="field-label" htmlFor="question">你想研究什么？</label><span>越具体，研究越聚焦</span></div><div className="question-wrap"><Textarea ref={questionInput} id="question" required maxLength={10000} value={question} onChange={event=>setQuestion(event.target.value)} placeholder={quick?"例如："+quickScreenCopy.example:deep?"例如："+deepResearchCopy.example:update?"例如："+earningsUpdateCopy.example:comparison?"例如："+comparisonCopy.example:"例如：分析贵州茅台的长期投资价值，重点关注现金流质量、竞争优势与股东回报。"} className="question-input" aria-describedby="question-guidance"/><div className="question-hint" id="question-guidance"><span><Sparkles size={13}/>自动识别公司名称与股票代码</span><span className="question-count">{question.length.toLocaleString()} / 10,000</span></div></div><div className="suggestions"><span>试着研究</span>{(quick?screenExamples:deep?[['比亚迪深度投资研究',deepResearchCopy.example],...examples]:update?[['比亚迪最新财报分析',earningsUpdateCopy.example]]:comparison?[['比亚迪 · 长城汽车 · 赛力斯',comparisonCopy.example]]:effectiveMode==='E'?executionTasks.map(task=>[task.title,task.question]):effectiveMode==='F'?[['八年股东回报',frameworkModes.F.example],['分红可持续性','研究苹果公司的分红可持续性与回购现金来源']]:examples).map(([label,text])=><Button type="button" variant="outline" size="sm" key={text} title={text} onClick={()=>{setQuestion(text);if(text===deepResearchCopy.example){setMode('B');setDepth('Deep');setHistoryYears(5);}resolution.auto();questionInput.current?.focus();}}>{label}<ArrowUpRight size={13}/></Button>)}</div><div className="path-picker"><div className="path-picker-heading"><label htmlFor="research-path">研究路径</label><span className={`path-match-status${automaticPath?' is-automatic':''}`} role="status">{automaticPath?<><Sparkles size={13}/>{awaitingMode?'等待输入':pathDecision?.pending?'正在判断':pathDecision?.source==='semantic'?'语义识别':'规则推荐'}</>:'手动选择'}</span></div><Select value={mode} onValueChange={selectMode}><SelectTrigger id="research-path" aria-label="研究路径" aria-describedby="research-path-description" className="path-picker-trigger"><span className="path-current"><CurrentModeIcon size={22} aria-hidden="true"/><span className="path-current-copy"><SelectValue>{awaitingMode?'输入问题后自动匹配':automaticPath&&pathDecision?.pending?'正在理解研究问题…':currentMode[1]}</SelectValue><span id="research-path-description">{awaitingMode?'按问题选择合适的研究方式':automaticPath?(pathDecision?.pending?'可以继续输入，也可手动选择路径':pathDecision?.reason||currentMode[2]):currentMode[2]}</span></span></span><span className="path-switch-label" aria-hidden="true">切换</span></SelectTrigger><SelectContent className="path-picker-menu" position="popper" align="start">{researchModes.map(([id,title,description,Icon])=><SelectItem key={id} value={id} aria-label={title} textValue={title} aria-describedby={`path-option-description-${id}`}><Icon size={19} aria-hidden="true"/><span className="path-menu-copy"><strong>{title}{id===matchedMode&&!pathDecision?.pending&&<em aria-hidden="true">根据问题推荐</em>}</strong><small id={`path-option-description-${id}`} aria-hidden="true">{id==='auto'&&matchedMode?`当前识别为${frameworkModes[matchedMode].name}，随问题自动调整`:description}</small></span></SelectItem>)}</SelectContent></Select><div className="path-selection-note">{automaticPath?<span>随问题内容自动调整，也可手动切换。</span>:<><span>已固定当前路径。</span><Button type="button" variant="link" size="sm" onClick={()=>selectMode('auto')}><Sparkles size={13}/>恢复自动识别</Button></>}</div>{!awaitingMode&&!pathDecision?.pending&&<dl className="path-outcome" aria-label="当前路径交付"><div><dt>本次交付</dt><dd>{preparation.baseline?.blocking?'核对旧报告后确认更新范围':researchOutcomeCopy(preparation.plan)}</dd></div><div><dt>判断重点</dt><dd>{preparation.plan.valuationPolicy.guidance}</dd></div></dl>}</div></div>
      <section ref={securitiesSection} tabIndex={-1} className="workbench-securities"><DataConnect resolution={resolution} comparison={comparison}/></section>
      {deep&&!settingsPending&&<DeepExecutionOverview/>}
       {setReferenceMaterials&&<section ref={materialsSection} tabIndex={-1} className="workbench-materials-target"><ResearchMaterials value={referenceMaterials} onChange={setReferenceMaterials} disabled={busy} onReadingChange={setMaterialsReading} onPendingChange={setMaterialsPending} text={materialDraft} setText={setMaterialDraft} title={materialDraftTitle} setTitle={setMaterialDraftTitle} editDraft={materialEditDraft} setEditDraft={setMaterialEditDraft}/></section>}
      <section ref={settingsSection} tabIndex={-1} className="workbench-settings" aria-label="研究设置"><div className="field-heading"><h3>研究设置</h3><span className="settings-path-label">{settingsPending?pathDecision?.pending?"正在匹配路径":"等待选择路径":frameworkModes[effectiveMode].name}</span></div>{settingsPending?<p className="settings-awaiting">{pathDecision?.pending?"路径确认后，将显示对应设置与开始按钮。":"输入问题或选择研究路径后，这里会显示相应设置。"}</p>:<div className="options-row">
        {settings.fixedDepth?<div className="choice-field settings-fixed"><span>报告深度</span><div>{settings.fixedDepth}<small>固定</small></div><small>{settings.depthHelp}</small></div>:<Choice label="报告深度" value={depth} onChange={setDepth} options={settings.depths.map((label,index)=>[["Quick","Standard","Deep"][index],label])} help={settings.depthHelp}/>}
        {settings.history?<div className="choice-field settings-fixed"><span>财报历史范围</span><div>近 {settings.history} 年<small>固定</small></div><small>{settings.historyHelp}</small></div>:<Choice label="财报历史范围" value={historyYears} onChange={value=>setHistoryYears(Number(value))} options={[[3,"近 3 年"],[5,"近 5 年"],[8,"近 8 年"]]} help={settings.historyHelp}/>}
       </div>}
       {!awaitingMode&&!pathDecision?.pending&&<DepthScope plan={preparation.plan}/>}
       {!settingsPending&&<ResearchContext mode={effectiveMode} awaitingMode={awaitingMode} portfolio={portfolio} setPortfolio={setPortfolio} jobs={jobs} securities={resolution.securities} {...contextProps}/>}
      </section>
      {!scopeOnSide&&<ResearchPreparation preparation={preparation} materialCount={referenceMaterials?.length??0} automatic={mode==='auto'} awaitingMode={awaitingMode} pathPending={pathDecision?.pending} showMaterials={Boolean(setReferenceMaterials)} onNavigate={goToStep}/>}
      {draftStatus&&<div className="composer-draft-status"><p role="status">{draftStatus}</p><Button type="button" variant="ghost" size="sm" disabled={busy||materialsReading} onClick={onClear}>清空输入</Button></div>}
     </CardContent>
     <CardFooter className="composer-footer"><div className={'composer-readiness '+(readinessLoading?'is-loading':ready?'is-ready':'is-pending')} id="start-readiness" role="status">
      <span className="readiness-state" aria-hidden="true">{readinessLoading?<LoaderCircle size={15} className="animate-spin"/>:ready?<Check size={15}/>:<CircleAlert size={15}/>}</span>
      <div className="readiness-content"><div className="readiness-primary"><p>{readiness}</p>{!ready&&!readinessLoading&&preparation.issues[0]?.id!=='service'&&<Button type="button" variant="link" size="sm" className="readiness-action" onClick={()=>goToStep(preparation.issues[0]?.id)}>定位待处理项<ArrowUpRight size={13}/></Button>}</div><small>{materialsReading?'资料导入期间请保持当前页面。':'研究创建成功后可离开，稍后在研究记录查看进度。'}</small><span className="composer-shortcut"><kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>Enter</kbd> 开始研究</span></div>
     </div><Button type="submit" size="lg" className="start-button" disabled={busy||!ready} aria-describedby="start-readiness" aria-keyshortcuts="Control+Enter Meta+Enter">{busy?<><LoaderCircle size={17} className="animate-spin"/>创建中…</>:<>{settingsPending?pathDecision?.pending?'正在匹配研究路径…':'开始研究':'开始'+settings.task}<ArrowRight size={17}/></>}</Button></CardFooter>
    </form>
   </Card>
   {scopeOnSide&&<aside className="workbench-scope-rail" aria-label="研究范围核对"><ResearchPreparation preparation={preparation} materialCount={referenceMaterials?.length??0} automatic={mode==='auto'} awaitingMode={awaitingMode} pathPending={pathDecision?.pending} showMaterials={Boolean(setReferenceMaterials)} onNavigate={goToStep}/></aside>}
  </div>
 </section>;
}
