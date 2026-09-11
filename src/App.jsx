import {useResearchConfig} from './hooks/use-research-config';
import {useResearchPath} from './hooks/use-research-path';
import {Link,useNavigate,useParams,useLocation,useSearchParams} from 'react-router';
import {researchPreparation} from '../shared/research-preparation.mjs';
import {knowledgeAvailability} from '../shared/research-knowledge.mjs';
import {modeOf} from './lib/research-mode';

import {ResearchWorkbenchPage,ResearchDetailPage,ResearchHandbookPage,ResearchHistoryPage} from './components/ResearchPages';
import RecentResearch from './components/RecentResearch';
import './components/sidebar-layout.css';

import {useJobStream} from './hooks/use-job-stream';
import {useComposerDraft} from './hooks/use-composer-draft';
import {loadComposerDraft} from './lib/composer-draft.mjs';
import {createSubmissionTracker} from './lib/research-submission.mjs';
import Brand from './components/Brand';
import PlatformStatus from './components/PlatformStatus';
import ResearchFramework from './components/ResearchFramework';
import DeleteResearchDialog from './components/DeleteResearchDialog';
import {useCallback,useEffect,useState,useRef} from 'react';


import {ChartNoAxesCombined,History,FileText,ShieldCheck,House,X,LoaderCircle,Check,Menu,ChevronRight,Trash2,ArrowUpRight,Sparkles,BookOpen} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Sheet,SheetTrigger,SheetContent,SheetTitle,SheetDescription} from '@/components/ui/sheet';
import {Alert,AlertDescription} from '@/components/ui/alert';
import {api,post} from '@/lib/api';
import {useSecurityResolution} from '@/hooks/use-security-resolution';
import {modes as frameworkModes} from '../shared/research-framework.mjs';

import {needsSaveRetry,deliveryProgress} from '../shared/research-delivery.mjs';
const nav=[['rules','首页',House],['work','研究工作台',ChartNoAxesCombined],['history','研究记录',History],['handbook','研究手册',BookOpen]];
const labels={queued:'等待中',running:'研究中',completed:'已完成',failed:'失败',cancelled:'已取消'};
function Status({status,delivery}){return <Badge variant={status==='failed'?'destructive':'secondary'} className={'gap-1.5 shrink-0 job-status job-status-'+status}>{status==='running'?<LoaderCircle size={12} className="animate-spin"/>:status==='completed'?<Check size={12}/>:null}{deliveryProgress({delivery})?.label||labels[status]||"未知状态"}</Badge>;}
export default function App({page}){
 const routerNavigate=useNavigate(),{jobId}=useParams(),location=useLocation();
 const [searchParams,setSearchParams]=useSearchParams();
 const tab=['report','audit','sources'].includes(searchParams.get('tab'))?searchParams.get('tab'):'report';
 useEffect(()=>{
  if(!jobId||searchParams.get('tab')!=='approach')return;
  const next=new URLSearchParams(searchParams);next.delete('tab');
  setSearchParams(next,{replace:true});
 },[jobId,searchParams,setSearchParams]);
 function setTab(value,hash){
  // Tabs may activate on both pointer-down and focus before Router commits its
  // transition. The browser URL already reflects the first navigation.
  const current=new URLSearchParams(window.location.search);
  const currentTab=['report','audit','sources'].includes(current.get('tab'))?current.get('tab'):'report';
  if(value===currentTab&&hash===undefined)return;
  if(value==='report')current.delete('tab');else current.set('tab',value);
  if(hash!==undefined)routerNavigate({pathname:location.pathname,search:current.toString(),hash},{replace:hash===''});else setSearchParams(current);
 }
 const pagePaths={rules:'/',work:'/workbench',history:'/history',handbook:'/handbook'};
 const pageScroll=useRef(null);
 const [workbenchFocusRequest,setWorkbenchFocusRequest]=useState(0);
 const [savedDraft]=useState(()=>loadComposerDraft());
 const [submission]=useState(()=>createSubmissionTracker());
 const {config,checking:configChecking,refresh:refreshConfig}=useResearchConfig(location.pathname);
 const [jobs,setJobs]=useState([]),[mode,setMode]=useState(savedDraft?.mode??'auto'),[depth,setDepth]=useState(savedDraft?.depth??'Standard'),[question,setQuestion]=useState(savedDraft?.question??''),[portfolio,setPortfolio]=useState(savedDraft?.portfolio??''),[historyYears,setHistoryYears]=useState(savedDraft?.historyYears??5),[storedJob,setSelected]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[mobileOpen,setMobileOpen]=useState(false),[contextOpen,setContextOpen]=useState(savedDraft?.contextOpen??false);
 const [deleteTarget,setDeleteTarget]=useState(null),[deleting,setDeleting]=useState(false),[deleteError,setDeleteError]=useState('');
 const [opening,setOpening]=useState(null),[cancelling,setCancelling]=useState(false);
 const [exporting,setExporting]=useState(false),exportPending=useRef(false);
 const [retryState,setRetryState]=useState({id:null,pending:false,error:''});
 const retryPending=useRef(null),retryLocation=useRef(location.pathname);
 retryLocation.current=location.pathname;
 useEffect(()=>()=>{retryPending.current=null;},[]);
 const startPending=useRef(false),listRequest=useRef(0),detailRequest=useRef(0);
 const [jobsLoading,setJobsLoading]=useState(true),[jobsError,setJobsError]=useState('');
 const [previousResearch,setPreviousResearch]=useState(savedDraft?.previousResearch??''),[baselineJobId,setBaselineJobId]=useState(savedDraft?.baselineJobId??''),[portfolioContext,setPortfolioContext]=useState(savedDraft?.portfolioContext??{});
 const [referenceMaterials,setReferenceMaterials]=useState(savedDraft?.referenceMaterials??[]),[materialsReading,setMaterialsReading]=useState(false),[materialsPending,setMaterialsPending]=useState(false);
 const [materialDraft,setMaterialDraft]=useState(savedDraft?.materialDraft??'');
 const [materialDraftTitle,setMaterialDraftTitle]=useState(savedDraft?.materialDraftTitle??''),[materialEditDraft,setMaterialEditDraft]=useState(savedDraft?.materialEditDraft??null);
 const selected=jobId&&storedJob?.id===jobId?storedJob:null;
 const [loadError,setLoadError]=useState(''),[loadAttempt,setLoadAttempt]=useState(0);
 useEffect(()=>{
  setMobileOpen(false);setError('');
  pageScroll.current?.scrollTo({top:0,left:0,behavior:'instant'});
  document.title=(jobId?'研究详情':nav.find(item=>item[0]===page)?.[1]||'页面不存在')+' · 知衡';
 },[location.pathname]);
 useEffect(()=>{
  setLoadError('');setSelected(null);if(!jobId){setOpening(null);return;}
  const control=new AbortController(),request=++detailRequest.current;setOpening(jobId);
  api('/api/jobs/'+encodeURIComponent(jobId),{signal:control.signal}).then(job=>{if(!control.signal.aborted&&request===detailRequest.current)setSelected(job);}).catch(e=>{if(!control.signal.aborted&&request===detailRequest.current)setLoadError(e.message);}).finally(()=>{if(!control.signal.aborted&&request===detailRequest.current)setOpening(null);});
  return()=>control.abort();
 },[jobId,loadAttempt]);
 const pathDecision=useResearchPath(question,mode,{enabled:page==='work'&&!jobId&&!knowledgeAvailability(config).blocking,configured:config?.configured});
 const executionMode=mode==='auto'?pathDecision.mode:mode;
 const resolution=useSecurityResolution(question,savedDraft??{});
 const draftStorage=useComposerDraft({question,mode,depth,historyYears,portfolio,previousResearch,baselineJobId,portfolioContext,referenceMaterials,materialDraft,materialDraftTitle,materialEditDraft,contextOpen,manual:resolution.manual||resolution.hasChoices,securities:resolution.securities},page==='work'&&!jobId);
 const refresh=useCallback(async()=>{
  const request=++listRequest.current;
  try{const list=await api('/api/jobs');if(request===listRequest.current){setJobs(list);setJobsError('');}}
  catch(e){if(request===listRequest.current)setJobsError(e.message);}
  finally{if(request===listRequest.current)setJobsLoading(false);}
 },[]);
 useEffect(()=>()=>{listRequest.current++;},[]);
 useEffect(()=>{refresh();},[location.pathname,refresh]);
 const hasActiveJobs=jobs.some(job=>['queued','running'].includes(job.status));
 useEffect(()=>{
  const onFocus=()=>refresh();window.addEventListener('focus',onFocus);
  const timer=hasActiveJobs?setInterval(()=>{if(document.visibilityState==='visible')refresh();},15000):null;
  return()=>{window.removeEventListener('focus',onFocus);clearInterval(timer);};
 },[hasActiveJobs,refresh]);
 const streamConnection=useJobStream(selected,setSelected,setJobs);
 function navigate(id){routerNavigate(pagePaths[id]||'/workbench');setMobileOpen(false);}
 function newResearch(preset,example=''){submission.clear();draftStorage.clear();setMaterialDraft('');setMaterialDraftTitle('');setMaterialEditDraft(null);setReferenceMaterials([]);setSelected(null);setQuestion(typeof example==='string'?example:'');setPortfolio('');setPreviousResearch('');setBaselineJobId('');setPortfolioContext({});setMode(typeof preset==='string'&&(preset==='auto'||Object.hasOwn(frameworkModes,preset))?preset:'auto');setDepth(frameworkModes[preset]?.defaultDepth||'Standard');setHistoryYears(5);setContextOpen(preset==='E'||preset==='C');resolution.reset();setError('');navigate('work');setWorkbenchFocusRequest(value=>value+1);}
 async function start(e){
  e.preventDefault();if(startPending.current)return;
  const preparation=researchPreparation({question,mode:executionMode,depth,historyYears,portfolio,previousResearch,baselineJobId,portfolioContext},resolution,{pathPending:pathDecision.pending,materialsReading,materialsPending,materialEditDraft,materialDraft,config,jobs,jobsLoading,jobsError});
  if(!preparation.ready){setError(preparation.message);return;}
  startPending.current=true;setBusy(true);setError('');
  try{draftStorage.flush();const payload={question,mode,depth:preparation.plan.depth,portfolio,securities:preparation.securities,historyYears:preparation.plan.historyYears,
    ...(mode==='auto'?(pathDecision.decisionId?{pathDecisionId:pathDecision.decisionId}:{pathRuleFallback:true}):{}),
    ...(executionMode==='C'?{previousResearch,baselineJobId:baselineJobId||null}:{}),
    ...(Object.keys(portfolioContext).length?{portfolioContext}:{}),...(referenceMaterials.length?{referenceMaterials}:{})};
   const request=submission.requestFor(payload);
   const options=post(request.payload);options.headers['Idempotency-Key']=request.key;
   const job=await api('/api/jobs',options);if(!job?.id)throw Object.assign(new Error('服务未返回研究编号'),{code:'invalid_response'});
   submission.clear();draftStorage.clear();routerNavigate('/research/'+encodeURIComponent(job.id));}
  catch(e){if(e.status===409&&e.message.includes('路径判断已失效')){submission.clear();pathDecision.refresh();}setError(['network','invalid_response'].includes(e.code)||e.status>=500?'暂时无法确认提交结果。输入已保留；再次提交相同输入会确认原任务，避免重复研究。':e.message);pageScroll.current?.scrollTo({top:0,behavior:'smooth'});}
  finally{startPending.current=false;setBusy(false);}
 }
 async function cancelResearch(){
  if(cancelling||!selected)return;setCancelling(true);
  try{await api('/api/jobs/'+encodeURIComponent(selected.id)+'/cancel',post({}));}
  catch(e){setError(e.message);pageScroll.current?.scrollTo({top:0,behavior:'smooth'});}
  finally{setCancelling(false);}
 }
 function open(id){routerNavigate('/research/'+encodeURIComponent(id));}
 function requestDelete(job){setDeleteError('');setDeleteTarget(job);}
 async function deleteResearch(){
  if(!deleteTarget||deleting)return;
  const id=deleteTarget.id;setDeleting(true);setDeleteError('');
  try{
   await api('/api/jobs/'+encodeURIComponent(id),{method:'DELETE'});
   listRequest.current++;setJobs(current=>current.filter(job=>job.id!==id));
   setSelected(current=>current?.id===id?null:current);
   setDeleteTarget(null);if(jobId===id)routerNavigate('/history',{replace:true});
  }catch(e){setDeleteError(e.message);}finally{setDeleting(false);}
 }
 function deleteButton(job){const running=['queued','running'].includes(job.status);return <Button type="button" variant="ghost" size="icon" className="delete-research" aria-label={'删除研究：'+job.question} title={running?'研究结束后可删除':'删除研究'} disabled={deleting||running} onClick={()=>requestDelete(job)}><Trash2 size={16}/></Button>;}
 async function retryResearch(){
  if(retryPending.current||!selected||!['failed','cancelled'].includes(selected.status))return;
  const request={id:selected.id,pathname:location.pathname};
  retryPending.current=request;setRetryState({id:request.id,pending:true,error:''});
  try{
   const next=await api('/api/jobs/'+encodeURIComponent(request.id)+(needsSaveRetry(selected)?'/save':'/retry'),post({expectedRetryCount:selected.retryCount??0}));
   if(retryPending.current!==request)return;
   refresh();
   // Replace the current record without navigation, and ignore older detail-load responses.
   if(retryLocation.current===request.pathname){detailRequest.current++;setLoadError('');setOpening(null);setSelected(next);}
  }catch(e){if(retryPending.current===request)setRetryState({id:request.id,pending:false,error:e.message});}
  finally{if(retryPending.current===request){retryPending.current=null;setRetryState(current=>({...current,pending:false}));}}
 }
 function reuseInput(){submission.clear();setMaterialDraft('');setMaterialDraftTitle('');setMaterialEditDraft(null);const v=selected.input;setReferenceMaterials(v.referenceMaterials??[]);setQuestion(v.question);resolution.edit(v.securities??[]);setMode(selected.mode||'auto');setDepth(v.depth||'Standard');setHistoryYears(v.historyYears??5);setPortfolio(v.portfolio??'');setPreviousResearch(v.previousResearch??'');setBaselineJobId(v.baselineJobId??'');setPortfolioContext(v.portfolioContext??{});setContextOpen(!!v.portfolio||selected.mode==='C'||selected.mode==='E');setSelected(null);navigate('work');}
 function updateResearch(){submission.clear();setMaterialDraft('');setMaterialDraftTitle('');setMaterialEditDraft(null);const prior=selected;if(!prior?.result?.report)return;setReferenceMaterials(prior.input.referenceMaterials??[]);setQuestion(('更新最新财报，检查这项研究的原有判断是否改变：'+prior.input.question).slice(0,10000));resolution.edit(prior.input.securities??[]);setMode('C');setDepth('Standard');setHistoryYears(prior.input.historyYears??5);setPortfolio('');setPortfolioContext({});setPreviousResearch('');setBaselineJobId(prior.id);setContextOpen(true);setSelected(null);navigate('work');}
 function prepareDeepResearch(){submission.clear();setMaterialDraft('');setMaterialDraftTitle('');setMaterialEditDraft(null);
  const prior=selected;if(!prior?.result?.report||prior.status!=='completed')return;
  setReferenceMaterials(prior.input.referenceMaterials??[]);const v=prior.input,questions=(prior.result.decision?.missingData??[]).slice(0,8);
  setQuestion(('深度研究：'+v.question.replace(/快速筛选|初筛|快筛/g,'').trim()+'。重新核对证据，验证长期逻辑、财务质量与估值假设。').slice(0,10000));
  resolution.edit(v.securities??[]);setMode('B');setDepth('Deep');setHistoryYears([3,5,8].includes(v.historyYears)?v.historyYears:5);
  setPortfolio([v.portfolio,questions.length?'上次快筛的待验证事项（须重新取证，不作为当前事实）：\n'+JSON.stringify(questions,null,2):''].filter(Boolean).join('\n\n').slice(0,20000));
  setPortfolioContext(v.portfolioContext??{});setPreviousResearch('');setBaselineJobId('');setContextOpen(Boolean(v.portfolio||questions.length));setError('');setSelected(null);navigate('work');
 }
 async function download({includeResearchProcess=true,executionOnly=false,usExchanges={}}={}){
  if(exportPending.current||!selected||!executionOnly&&!selected.result)return;
  exportPending.current=true;setExporting(true);setError('');
  try{
   const {exportResearchMarkdown,exportExecutionMarkdown}=await import('../shared/research-export.mjs');
   const text=executionOnly?exportExecutionMarkdown(selected):exportResearchMarkdown(selected,{includeResearchProcess,usExchanges});
   const url=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'}));
   try{
    const link=document.createElement('a');link.href=url;
    link.download=`research-${selected.id.slice(0,8)}-${executionOnly?'execution':includeResearchProcess?'complete':'report'}.md`;link.click();
   }finally{setTimeout(()=>URL.revokeObjectURL(url),1000);}
  }catch{setError('导出失败，请刷新页面后重试。已保存的研究记录不受影响。');}
  finally{exportPending.current=false;setExporting(false);}
 }
 const navLink=([id,title,Icon])=><Button variant="ghost" asChild key={id} className={"nav-button "+(page===id?"nav-current":"")}><Link to={pagePaths[id]} aria-current={page===id&&!jobId?"page":undefined} onClick={()=>setMobileOpen(false)}><Icon size={18}/>{title}{id==="history"&&<span className="ml-auto text-xs opacity-70" aria-hidden="true">{jobs.length}</span>}</Link></Button>;
 const sidebar=<div className="sidebar-inner sidebar-layout"><div className="sidebar-top"><Brand onClick={()=>navigate('rules')}/><nav className="sidebar-navigation" aria-label="主导航">{nav.slice(0,3).map(navLink)}<div className="sidebar-reference">{navLink(nav[3])}</div></nav></div><RecentResearch jobs={jobs} currentId={jobId} onNavigate={()=>setMobileOpen(false)}/><div className="sidebar-bottom"><Link to="/#fw-plans" className="sidebar-service" onClick={()=>setMobileOpen(false)}><span><Sparkles size={16}/>知衡研究服务</span><small>了解方案与开通方式<ArrowUpRight size={14}/></small></Link><div className="side-principle"><ShieldCheck size={21}/><p>知价值，衡长远。</p><span>价值投资与股东回报智能研究</span></div></div></div>;
 return <div className="app-shell"><a href="#main-content" className="skip-to-content">跳至主要内容</a><DeleteResearchDialog job={deleteTarget} pending={deleting} error={deleteError} onConfirm={deleteResearch} onClose={()=>{if(!deleting)setDeleteTarget(null);}}/><aside className="desktop-sidebar">{sidebar}</aside><div className="main-shell"><header className="topbar"><div className="flex items-center gap-3"><Sheet open={mobileOpen} onOpenChange={setMobileOpen}><SheetTrigger asChild><Button variant="ghost" size="icon" className="lg:hidden" aria-label="打开导航菜单"><Menu size={20}/></Button></SheetTrigger><SheetContent side="left" className="sidebar-drawer w-[280px] p-0"><SheetTitle className="sr-only">研究导航</SheetTitle><SheetDescription className="sr-only">切换首页、研究工作台与研究记录、研究手册</SheetDescription>{sidebar}</SheetContent></Sheet><nav className="breadcrumbs" aria-label="面包屑导航"><ol>{page!=='rules'&&<><li><Link to="/">首页</Link></li><li aria-hidden="true"><ChevronRight size={14}/></li></>}{jobId?<><li><Link to="/history">研究记录</Link></li><li aria-hidden="true"><ChevronRight size={14}/></li><li><span aria-current="page">研究详情</span></li></>:<li><span aria-current="page">{nav.find(n=>n[0]===page)?.[1]||"页面不存在"}</span></li>}</ol></nav></div><PlatformStatus config={config} checking={configChecking} onRefresh={refreshConfig}/></header><div className="page-scroll" ref={pageScroll}><main className="page-content" id="main-content" tabIndex={-1}>{error&&<Alert variant="destructive" className="mb-6"><AlertDescription className="flex items-center justify-between gap-3"><span>{error}{error.startsWith('暂时无法确认提交结果')&&<Button asChild variant="link" size="sm"><Link to="/history">查看研究记录<ArrowUpRight size={14}/></Link></Button>}</span><Button variant="ghost" size="icon" aria-label="关闭错误" onClick={()=>setError('')}><X size={16}/></Button></AlertDescription></Alert>}
 {page==='work'&&!jobId&&<ResearchWorkbenchPage focusRequest={workbenchFocusRequest} pathDecision={pathDecision} {...{question,setQuestion,mode,setMode,depth,setDepth,portfolio,setPortfolio,historyYears,setHistoryYears,contextOpen,setContextOpen,resolution,busy,jobs,jobsLoading,jobsError,previousResearch,setPreviousResearch,baselineJobId,setBaselineJobId,portfolioContext,setPortfolioContext,referenceMaterials,setReferenceMaterials,materialsReading,setMaterialsReading,materialsPending,setMaterialsPending,materialDraft,setMaterialDraft,materialDraftTitle,setMaterialDraftTitle,materialEditDraft,setMaterialEditDraft}} config={config} configChecking={configChecking} onRefreshConfig={refreshConfig} onRefreshJobs={refresh} draftStatus={draftStorage.status} onClear={()=>newResearch('auto')} onStart={start}/>}
 {page==='missing'&&<div className="empty-state"><FileText size={32}/><h1>页面不存在</h1><p>请检查地址，或返回研究工作台。</p><Button onClick={()=>navigate('work')}>研究工作台</Button></div>}
 {jobId&&!selected&&<div className="empty-state" role="status">{loadError?<><FileText size={32}/><h2>暂时无法打开研究</h2><p>{loadError}</p><Button variant="outline" onClick={()=>setLoadAttempt(n=>n+1)}>重新加载</Button><Button onClick={()=>navigate('history')}>查看研究记录</Button></>:<><LoaderCircle size={32} className="animate-spin"/><p>正在加载研究记录…</p></>}</div>}
 {page==='work'&&selected&&<ResearchDetailPage key={selected.id} currentConfig={config} job={selected} tab={tab} onTabChange={setTab} streamConnection={streamConnection} onRetry={['failed','cancelled'].includes(selected.status)?retryResearch:undefined} retrying={retryState.id===selected.id&&retryState.pending} retryError={retryState.id===selected.id?retryState.error:''} onReuse={reuseInput} onUpdate={updateResearch} onDeepen={prepareDeepResearch} onDownload={download} exporting={exporting} onCancel={cancelResearch} cancelling={cancelling}/>}
 {page==='history'&&<ResearchHistoryPage jobs={jobs} jobsLoading={jobsLoading} jobsError={jobsError} onRefresh={refresh} onStart={newResearch} onOpen={open} renderDelete={deleteButton} Status={Status} opening={opening}/>}
 {page==='rules'&&<ResearchFramework config={config} checking={configChecking} onRefresh={refreshConfig} onStart={newResearch}/>}
 {page==='handbook'&&<ResearchHandbookPage onStart={newResearch} config={config} checking={configChecking} onRefresh={refreshConfig}/>}
 </main></div></div></div>;
}
