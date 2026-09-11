import {createResearchPlan,frameworkVersion,researchStages} from '../shared/research-framework.mjs';
import {bindKnowledge,currentKnowledge} from './knowledge.mjs';
import {knowledgeExcerpt} from './knowledge-excerpt.mjs';
import {attachResearchBaseline} from './research-baseline.mjs';
import {interruptWorkflow} from './research-workflow.mjs';
import {createJobStreams,publicJob} from './job-stream.mjs';
import {createResearchRetrier} from './research-retry.mjs';
import {createJobCheckpoints} from './job-checkpoints.mjs';
import {createResearchDelivery} from './research-delivery.mjs';
import {createResearchCreator} from './research-create.mjs';
import {researchPathResolver} from './research-path.mjs';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runAgent} from './agent.mjs';
import {configureModelTelemetry,withModelCallContext} from './model-telemetry.mjs';
import {assertModelRollout} from './model-rollout.mjs';
import {modes,validateInput} from './router.mjs';
import {validateSecurities,fetchQuote} from './market-data.mjs';
import {resolveSecurities} from './security-resolver.mjs';
import {lookupSecurityExchanges} from './security-exchanges.mjs';
import {providerStatus} from './data-provider-config.mjs';
import {webSearchStatus} from './web-search-provider.mjs';
import {getStorage} from './storage.mjs';
import {migrateLegacy} from './migrate.mjs';
import {createAccessPolicy} from './access.mjs';
import {visionStatus} from './vision-model.mjs';
import {withVisualBudget} from './visual-reading.mjs';
import {readDocument} from './document-reader.mjs';
const allowRequest=createAccessPolicy(process.env.PUBLIC_ORIGINS);
const root=fileURLToPath(new URL('../',import.meta.url));
const storage=await getStorage();
configureModelTelemetry(process.env.MODEL_TELEMETRY_ENABLED==='false'?undefined:record=>storage.saveModelCall(record));
console.log('MongoDB 已连接；旧数据迁移：',await migrateLegacy(storage));
await storage.recoverInterrupted();
const jobs=new Map(),controllers=new Map(),streams=createJobStreams();
const pendingStarts=new Set(),mutations=new Set(),finishing=new Map();
let activeVisualImports=0;
const retryResearch=createResearchRetrier({storage,jobs,controllers,pendingStarts,mutations,finishing,execute,configured:()=>Boolean(process.env.LLM_API_KEY&&process.env.LLM_MODEL)});
const save=job=>storage.saveJob(job);
const delivery=createResearchDelivery({save,loadJob:id=>storage.getJob(id),jobs,controllers,mutations,streams,onError:error=>console.error('结果保存失败',error.message)});
const createResearch=createResearchCreator({storage,jobs,controllers,pendingStarts,mutations,execute,prepare:async(payload,id)=>{
 if(Array.isArray(payload.securities)&&payload.securities.length===0||payload.securities===undefined){
  const resolved=await resolveSecurities(payload.question);
  if(resolved.ambiguities.length||resolved.unresolved.length||resolved.overflow)throw new Error('问题中的标的存在歧义或未识别，请先核对标的');
  payload.securities=resolved.securities;
 }
 const pathDecision=await researchPathResolver.resolve(payload),mode=pathDecision.mode;
 let input=validateInput({...payload,mode});input.mode=payload.mode||'auto';input.pathDecision=pathDecision;
 input=await attachResearchBaseline(input,mode,id=>storage.getJob(id));
 if(!(process.env.LLM_API_KEY&&process.env.LLM_MODEL))throw new Error('请先在.env配置LLM_API_KEY和LLM_MODEL');
 const job={id,input,mode,status:'queued',createdAt:new Date().toISOString(),events:[]};
 job.plan=createResearchPlan(input,mode);bindKnowledge(job.plan);
 job.input.depth=job.plan.depth;job.input.historyYears=job.plan.historyYears;return job;
}});
function send(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));}
async function body(req){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>1500000)throw new Error('请求超过1.5MB');chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
async function execute(job){
 const control=new AbortController();controllers.set(job.id,control);job.status='running';
 let outcome;
 const checkpoints=createJobCheckpoints({save:()=>save(job),maxWrites:Infinity,onError:()=>emit('warning','阶段进度暂未保存，研究仍在继续；结束时将再次保存。')});
 const emit=(type,message,details)=>{
  if(type==='workflow'){streams.publish(job.id,'workflow',details.workflow);checkpoints.request();return;}
  if(type==='report_reset'){job.liveReport={text:'',phase:'research'};streams.publish(job.id,'report_reset',job.liveReport);return;}
  if(type==='report_delta'){job.liveReport.text+=message;streams.publish(job.id,'report_delta',{delta:message});return;}
  if(type==='report_phase'){job.liveReport.phase=message;streams.publish(job.id,'report_phase',{phase:message});return;}
  if(['research','evidence_followup','web_search'].includes(type))streams.publish(job.id,'snapshot',publicJob(job));
  const event={time:new Date().toISOString(),type,message,...details};job.events.push(event);streams.publish(job.id,'trace',event);
  if(['tool_result','audit_validation','audit_context','evidence_followup','research_input','knowledge_read'].includes(type))checkpoints.request();
 };
 try{assertModelRollout(job);await save(job);const result=await withModelCallContext(job.id,()=>withVisualBudget(()=>runAgent(job,emit,control.signal,{onCheckpoint:async()=>{checkpoints.request();await checkpoints.flush();},onModelCheckpoint:async()=>{await checkpoints.flush();await save(job);}})));control.signal.throwIfAborted();delete job.checkpoint;outcome={status:'completed',result,researchOutcome:{action:result.decision.action,confidence:result.decision.confidence,summary:result.decision.summary}};}
 catch(e){const status=control.signal.aborted?'cancelled':'failed';outcome={status,error:control.signal.aborted?'任务已取消':e.message};interruptWorkflow(job,status);}
 finally{
  const settled=Promise.withResolvers();finishing.set(job.id,settled.promise);
  try{await checkpoints.close();await delivery.finish(job,outcome);}
  finally{controllers.delete(job.id);try{streams.finish(job);}finally{finishing.delete(job.id);settled.resolve();}}
 }
}
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(!allowRequest(req))return send(res,403,{error:'访问地址或请求来源未获允许'});
  if(url.pathname==='/api/materials/capabilities'&&req.method==='GET')return send(res,200,visionStatus());
  if(url.pathname==='/api/materials/read'&&req.method==='POST'){
   if(activeVisualImports>=2)return send(res,429,{error:'原件读取繁忙，请稍后重试'});
   activeVisualImports++;const control=new AbortController();
   const timeout=setTimeout(()=>{control.abort();if(!req.complete)req.destroy();},110000);res.on('close',()=>{if(!res.writableEnded)control.abort();});
   try{
    const chunks=[];let size=0;
    for await(const chunk of req){control.signal.throwIfAborted();size+=chunk.length;if(size>10*1024*1024)throw new Error('文件超过 10 MB');chunks.push(chunk);}
    let name;try{name=decodeURIComponent(req.headers['x-document-name']||'document.pdf');}catch{throw new Error('文件名无效');}
    if(name.length>200)throw new Error('文件名过长');
    const result=await readDocument(Buffer.concat(chunks),{name,signal:control.signal,upload:true});return send(res,200,result);
   }finally{clearTimeout(timeout);activeVisualImports--;}
  }
  if(url.pathname==='/api/config')return send(res,200,{configured:!!(process.env.LLM_API_KEY&&process.env.LLM_MODEL),model:process.env.LLM_MODEL||null,modes,knowledgeVersion:frameworkVersion,...currentKnowledge(),researchStages,dataProvider:'行情与股本：长桥优先，多源备用；官方财报与公告：巨潮、港交所、SEC正文/XBRL；三市场结构化财务：Tushare；历史估值与股东回报：Tushare及长桥基本面；原文归档与缺口核验；网页补充：先查资料、按缺口定位原始正文',dataProviders:providerStatus(),webSearch:webSearchStatus(),markets:['CN','HK','US'],secUserAgentConfigured:!!process.env.SEC_USER_AGENT});
  if(url.pathname==='/api/research/path'&&req.method==='POST'){
   const {question}=await body(req),control=new AbortController();res.on('close',()=>{if(!res.writableEnded)control.abort();});
   return send(res,200,await researchPathResolver.recommend(question,{signal:control.signal}));
  }
  if(url.pathname==='/api/research/plan'&&req.method==='POST'){const payload=await body(req),decision=await researchPathResolver.resolve(payload),mode=decision.mode;let input=validateInput({...payload,mode});input=await attachResearchBaseline(input,mode,id=>storage.getJob(id));return send(res,200,{...createResearchPlan(input,mode),...currentKnowledge()});}
  if(url.pathname==='/api/securities/resolve'&&req.method==='POST'){
   const {question}=await body(req);const control=new AbortController();
   res.on('close',()=>{if(!res.writableEnded)control.abort();});
   return send(res,200,await resolveSecurities(question,{signal:control.signal}));
  }
  if(url.pathname==='/api/quotes'&&req.method==='POST'){
   const securities=validateSecurities((await body(req)).securities);if(!securities.length)throw new Error('请先添加标的');
   const control=new AbortController();res.on('close',()=>{if(!res.writableEnded)control.abort();});
   const result=await Promise.allSettled(securities.map(s=>fetchQuote(s,control.signal)));
   return send(res,200,result.map((r,i)=>r.status==='fulfilled'?{security:securities[i],quote:r.value}:{security:securities[i],error:r.reason.message}));
  }
  if(url.pathname==='/api/securities/exchanges'&&req.method==='POST'){
   const {symbols}=await body(req);const control=new AbortController();
   res.on('close',()=>{if(!res.writableEnded)control.abort();});
   return send(res,200,await lookupSecurityExchanges(symbols,control.signal));
  }
  if(url.pathname==='/api/health'&&req.method==='GET'){try{await storage.ping();return send(res,200,{ok:true,storage:'mongodb'});}catch{return send(res,503,{ok:false,storage:'mongodb'});}}
  if(url.pathname==='/api/jobs'&&req.method==='GET'){
   const summaries=new Map((await storage.listJobs()).map(j=>[j.id,j]));
   for(const {input,result,events,draft,liveReport,marketData,submission,checkpoint,knowledgeUsage,modelState,...j} of jobs.values())summaries.set(j.id,{...j,question:input.question,sourceCount:input.sources.length});
   return send(res,200,[...summaries.values()].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)));
  }
  if(url.pathname==='/api/jobs'&&req.method==='POST'){
   const {job,replayed}=await createResearch(await body(req),req.headers['idempotency-key']);
   return send(res,replayed?200:201,publicJob(job));
  }
  const retryMatch=url.pathname.match(/^\/api\/jobs\/([\da-f-]+)\/retry$/);
  const ruleMatch=url.pathname.match(/^\/api\/jobs\/([\da-f-]+)\/rules$/);
  if(ruleMatch&&req.method==='GET'){
   const id=ruleMatch[1],stored=jobs.get(id)??await storage.getJob(id),job=jobs.get(id)??stored;
   return send(res,200,knowledgeExcerpt(job,url.searchParams.get('record')));
  }
  if(retryMatch&&req.method==='POST'){
   const payload=await body(req);
   const job=await retryResearch(retryMatch[1],payload?.expectedRetryCount);
   return send(res,200,publicJob(job));
  }
  const saveMatch=url.pathname.match(/^\/api\/jobs\/([\da-f-]+)\/save$/);
  if(saveMatch&&req.method==='POST'){
   const payload=await body(req);const job=await delivery.retry(saveMatch[1],payload?.expectedRetryCount);
   return send(res,200,publicJob(job));
  }
  const streamMatch=url.pathname.match(/^\/api\/jobs\/([\da-f-]+)\/stream$/);
  if(streamMatch&&req.method==='GET'){
   const id=streamMatch[1];const stored=jobs.get(id)??await storage.getJob(id);const job=jobs.get(id)??stored;
   if(!job)return send(res,404,{error:'任务不存在'});streams.subscribe(req,res,job);return;
  }
  const match=url.pathname.match(/^\/api\/jobs\/([\da-f-]+)(\/cancel)?$/);
  if(match&&!match[2]&&req.method==='DELETE'){
   if(mutations.has(match[1])||controllers.has(match[1])||['queued','running'].includes(jobs.get(match[1])?.status))return send(res,409,{error:'研究正在运行或处理中，请等待结束后再删除'});
   mutations.add(match[1]);
   try{await storage.deleteJob(match[1]);jobs.delete(match[1]);delivery.forget(match[1]);return send(res,200,{ok:true});}
   catch(e){return send(res,e.status===409?409:503,{error:e.status===409?e.message:'删除失败，请检查数据库连接并重试'});}
   finally{mutations.delete(match[1]);}
  }
  if(match){const stored=jobs.get(match[1])??await storage.getJob(match[1]);const job=jobs.get(match[1])??stored;if(!job)return send(res,404,{error:'任务不存在'});if(match[2]&&req.method==='POST'){if(job.delivery?.status==='saving')return send(res,409,{error:'正在保存最终结果，请等待保存完成'});controllers.get(job.id)?.abort();return send(res,200,{ok:true});}if(req.method==='GET')return send(res,200,publicJob(job));}
  if(url.pathname.startsWith('/api/'))return send(res,404,{error:'接口不存在'});
  if(req.method!=='GET')return send(res,405,{error:'不支持的方法'});
  const dist=path.join(root,'dist');let file=path.resolve(dist,'.'+decodeURIComponent(url.pathname));
  if(file!==dist&&!file.startsWith(dist+path.sep))return send(res,403,{error:'路径无效'});
  let content;try{content=await readFile(file);}catch{if(path.extname(file))return send(res,404,{error:'文件不存在'});file=path.join(dist,'index.html');try{content=await readFile(file);}catch{return send(res,404,{error:'请先运行 pnpm build，或用 pnpm dev 启动开发模式'});}}
  const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(content);
 }catch(e){send(res,[400,404,409,429,503].includes(e.status)?e.status:400,{error:e instanceof SyntaxError?'JSON格式错误':e.message});}
});
server.listen(Number(process.env.PORT)||3001,process.env.HOST||'127.0.0.1',()=>console.log(`知衡 Agent: http://${process.env.HOST||'127.0.0.1'}:${process.env.PORT||3001}`));
