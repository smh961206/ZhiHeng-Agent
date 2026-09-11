// V4.8.11 isolated comparison harness. Importing this module never starts a run.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {modelRolloutFingerprint,validateModelRollout} from '../server/model-rollout.mjs';

export const root=fileURLToPath(new URL('../',import.meta.url));
export const digest=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
export const readJSON=file=>JSON.parse(fs.readFileSync(file,'utf8'));
export function comparisonInput(c,cutoff){
 const input=structuredClone(c.input);
 input.question+='\n本次固定材料对照的研究截止日为 '+cutoff+'；仅使用归档原文，无法补取的资料必须保留缺口。';
 return input;
}
// Replay the existing market-data coverage distinction; quotes/directories and
// shareholder-action disclosures never stand in for financial report reads.
export function frozenMarketData(input,cutoff){
 return {sources:structuredClone(input.sources),coverage:(input.securities??[]).map(s=>{
  const security=s.market+':'+s.symbol,sources=input.sources.filter(source=>source.security===security&&source.official===true);
  const reports=sources.filter(source=>source.type==='official-report'&&source.purpose!=='shareholder-action');
  const coreFacts=sources.filter(source=>s.market==='US'&&source.type==='official-xbrl'&&Number.isSafeInteger(source.factsCount)&&source.factsCount>0&&Array.isArray(source.financialFacts)&&source.financialFacts.length===source.factsCount&&typeof source.filingUrl==='string'&&source.filingUrl.startsWith('https://'));
  return {security,read:new Set([...reports.map(source=>source.url),...coreFacts.map(source=>source.filingUrl)]).size,
   fullTextRead:new Set(reports.map(source=>source.url)).size,coreFactsRead:coreFacts.length};
 }),warnings:['固定归档材料；不采集最新行情或披露。'],asOf:cutoff};
}
export function writeJSON(file,value){
 const temporary=file+'.'+randomUUID()+'.tmp';
 fs.writeFileSync(temporary,JSON.stringify(value,null,2)+'\n',{mode:0o600,flag:'wx'});
 fs.renameSync(temporary,file);
}
const requireThat=(ok,message)=>{if(!ok)throw new Error(message);};
const date=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
export function validatePlan(plan,{live=false}={}){
 requireThat(plan?.version===1&&plan.kind==='frozen-research-comparison','Expected frozen-research-comparison v1');
 requireThat(['synthetic','curated'].includes(plan.material),'Material must be synthetic or curated');
 requireThat(!live||plan.material==='curated','Synthetic material cannot run in live mode');
 requireThat(date(plan.cutoff),'A valid research cutoff is required');
 requireThat(Array.isArray(plan.cases)&&plan.cases.length>0&&plan.cases.length<=10000,'Expected 1–10000 cases');
 const ids=new Set();
 for(const c of plan.cases){
  requireThat(typeof c.id==='string'&&c.id.trim()===c.id&&/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(c.id)&&!ids.has(c.id.toLowerCase()),'Invalid or duplicate case id');ids.add(c.id.toLowerCase());
  requireThat(['A','B','C','D','E','F'].includes(c.mode)&&c.input?.mode===c.mode,'Case mode must match input mode');
  requireThat(typeof c.input.question==='string'&&c.input.question.trim(),'Case question required');
  requireThat(Array.isArray(c.input.sources)&&c.input.sources.length>0,'Frozen source text required');
  const sources=new Set();
  for(const source of c.input.sources){
   requireThat(typeof source.id==='string'&&source.id.trim()===source.id&&/^S[1-9]\d*$/.test(source.id)&&!sources.has(source.id),'Source ids must be unique S numbers');sources.add(source.id);
   requireThat(typeof source.title==='string'&&typeof source.text==='string'&&source.text.trim(),'Source title and text required');
   requireThat(date(source.publishedAt)&&source.publishedAt<=plan.cutoff,'Source publication must be known and no later than cutoff');
   requireThat(typeof source.url==='string'&&/^https:\/\//.test(source.url),'Source provenance URL required');
   requireThat(!source.visualReading&&!source.agentVisualReadings,'This corpus version supports frozen text, not visual assets');
  }
  requireThat(!c.input.referenceMaterials?.length,'Archive attachments separately; corpus v1 accepts text sources only');
 }
 return plan;
}
export function validateLimits(limits){
 requireThat(limits&&/^[A-Z]{3}$/.test(limits.currency),'A budget currency is required');
 for(const key of ['maxRequests','budgetMinor','reservePerRequestMinor','timeoutMs'])requireThat(Number.isSafeInteger(limits[key])&&limits[key]>0,'Positive integer required: '+key);
 requireThat(limits.timeoutMs<=3600000,'Per-arm timeout cannot exceed one hour');
 requireThat(limits.reservePerRequestMinor<=limits.budgetMinor,'Budget cannot fund one reserved request');
 return limits;
}
// Reserve before every HTTP attempt, including retries. Never refund uncertain usage.
// This is an operator-supplied spending estimate, not a provider billing guarantee.
export function reserveAttempt(state,unit){
 const {limits,ledger}=state;
 requireThat(ledger.length<limits.maxRequests,'Request limit reached');
 requireThat((ledger.length+1)*limits.reservePerRequestMinor<=limits.budgetMinor,'Reserved budget limit reached');
 const item={id:ledger.length+1,unit,status:'reserved',reservedMinor:limits.reservePerRequestMinor,startedAt:new Date().toISOString()};
 ledger.push(item);return item;
}
export function budgetedTransport({state,unit,connections,persist,control,dispatch,onStop=()=>{}}){
 return async(url,options)=>{
  control.signal.throwIfAborted();
  let body,target;
  try{body=JSON.parse(options?.body??'null');target=new URL(url);}catch{}
  const allowed=target&&connections.some(conn=>target.href.startsWith(conn.base+'/')&&body?.model===conn.model&&options?.headers?.Authorization==='Bearer '+conn.key);
  const stop=reason=>{onStop(reason);control.abort(new Error(reason));throw new Error(reason);};
  if(!allowed||options?.method!=='POST'||options.redirect!=='error')stop('network_scope_violation');
  let attempt;
  try{attempt=reserveAttempt(state,unit);persist();}catch{stop('budget_or_ledger_failure');}
  try{
   const response=await dispatch(url,options);
   attempt.status='response_received';attempt.httpStatus=response.status;
   try{persist();}catch{void response.body?.cancel().catch(()=>{});stop('budget_or_ledger_failure');}
   return response;
  }catch(error){attempt.status='uncertain';try{persist();}catch{stop('budget_or_ledger_failure');}throw error;}
 };
}
export function executionFingerprint(env=process.env){
 const files=[];
 const walk=dir=>{for(const entry of fs.readdirSync(path.join(root,dir),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
  const p=dir+'/'+entry.name;if(entry.isDirectory())walk(p);else files.push([p,digest(fs.readFileSync(path.join(root,p)).toString('base64'))]);
 }};
 for(const dir of ['server','shared','knowledge/modules'])walk(dir);
 for(const p of ['knowledge/ENTRY.md','knowledge/modules.json','package.json','pnpm-lock.yaml','scripts/model-comparison.mjs','scripts/model-comparison-worker.mjs'])files.push([p,digest(fs.readFileSync(path.join(root,p)).toString('base64'))]);
 return digest({rollout:modelRolloutFingerprint(env),files});
}
export function comparisonEnv(env,offline){
 const result={...env,MODEL_ROUTING_MODE:'legacy',MODEL_POLICY_ACCEPTANCE_FILE:'',MODEL_TELEMETRY_ENABLED:'true'};
 if(offline)Object.assign(result,{LLM_API_KEY:'synthetic-comparison',LLM_MAIN_API_KEY:'synthetic-comparison',LLM_PRO_API_KEY:'synthetic-comparison',LLM_BASE_URL:'https://legacy.invalid',LLM_MAIN_BASE_URL:'https://main.invalid',LLM_PRO_BASE_URL:'https://pro.invalid',LLM_MODEL:'deepseek-v4-pro',LLM_MAIN_MODEL:'glm-5.3-flash',LLM_PRO_MODEL:'deepseek-v4-pro',LLM_REVIEW_FORMAT:'auto'});
 return result;
}
export function evidenceSummary(state,directory){
 requireThat(state.version===1&&typeof state.offline==='boolean','Invalid comparison state');
 requireThat(digest(state.plan)===state.corpusHash,'Stored corpus was modified');
 validatePlan(state.plan,{live:!state.offline});
 return {version:1,kind:state.offline?'offline-executor-validation':'live-comparison-pending-review',qualityAcceptance:false,
  runId:state.id,fingerprint:state.fingerprint,executionFingerprint:state.executionFingerprint,corpusHash:state.corpusHash,cutoff:state.plan.cutoff,
  budget:{...state.limits,attempts:state.ledger.length,reservedMinor:state.ledger.length*state.limits.reservePerRequestMinor,actualCost:null,notice:'Reservations are conservative operator estimates; provider invoice/cap is authoritative. Unknown usage is not zero.'},
  cases:state.plan.cases.map(c=>({id:c.id,mode:c.mode,source:state.offline?'mock':'live',...Object.fromEntries(['baseline','candidate'].map(arm=>{
   const unit=c.id+'--'+arm,entry=state.units[unit];
   const artifact=entry.status==='completed'?readJSON(path.join(directory,'results',unit+'.json')):null;
   const artifactHash=artifact?digest(artifact):null;
   requireThat(entry.status!=='completed'||artifactHash===entry.artifactHash,'Completed output was modified: '+unit);
   requireThat(!artifact||artifact.version===1&&artifact.kind===(state.offline?'synthetic-research-result':'live-research-result')&&artifact.runId===state.id&&artifact.unit===unit&&artifact.corpusHash===state.corpusHash&&artifact.cutoff===state.plan.cutoff&&artifact.inputHash===digest(c.input),'Output provenance mismatch: '+unit);
   return [arm,{status:entry.status,deliveryPassed:entry.status==='completed',citationPassed:null,criticalFactErrors:null,artifact:entry.status==='completed'?'results/'+unit+'.json':null,artifactHash}];
  }))}))};
}
function runWorker(directory,unit,env,timeoutMs){
 return new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[fileURLToPath(new URL('./model-comparison-worker.mjs',import.meta.url)),directory,unit],{env,cwd:root,stdio:['ignore','ignore','ignore','ipc'],windowsHide:true});
  const timer=setTimeout(()=>child.kill(),timeoutMs+10000);
  const stop=()=>child.kill();process.once('SIGINT',stop);process.once('SIGTERM',stop);
  const cleanup=()=>{clearTimeout(timer);process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);};
  child.once('error',error=>{cleanup();reject(error);});child.once('exit',code=>{cleanup();resolve(code);});
 });
}
export async function runComparison({plan,directory,offline=true,allowPaid=false,limits,resume=false,retryIncomplete=false,env=process.env}){
 validatePlan(plan,{live:!offline});validateLimits(limits);
 requireThat(offline||allowPaid===true,'Live mode requires explicit --allow-paid');
 requireThat(!retryIncomplete||resume,'Retry requires --resume');
 const scopedEnv=comparisonEnv(env,offline);
 if(!offline)requireThat(scopedEnv.LLM_API_KEY&&scopedEnv.LLM_MAIN_API_KEY&&(scopedEnv.LLM_PRO_API_KEY||scopedEnv.LLM_API_KEY),'Legacy, MAIN and PRO credentials required');
 directory=path.resolve(directory);
 if(!fs.existsSync(directory))fs.mkdirSync(directory,{recursive:true,mode:0o700});
 const lock=path.join(directory,'.lock'),fd=fs.openSync(lock,'wx',0o600);
 fs.writeFileSync(fd,JSON.stringify({pid:process.pid,createdAt:new Date().toISOString()}));
 try{
  const stateFile=path.join(directory,'run.json'),corpusHash=digest(plan),code=executionFingerprint(scopedEnv);
  let state;
  if(resume){
   state=readJSON(stateFile);
   requireThat(state.version===1&&state.offline===offline&&state.corpusHash===corpusHash&&digest(state.plan)===corpusHash&&state.executionFingerprint===code&&digest(state.limits)===digest(limits),'Resume configuration, corpus, code or limits changed');
   requireThat(Array.isArray(state.ledger)&&state.ledger.every((a,i)=>a.id===i+1&&a.reservedMinor===limits.reservePerRequestMinor&&Object.hasOwn(state.units,a.unit)),'Budget ledger corrupt');
   evidenceSummary(state,directory);
   requireThat(state.executionDate===new Date().toISOString().slice(0,10),'New-arm execution date changed; start a separately reviewed run');
  }else{
   requireThat(fs.readdirSync(directory).every(p=>p==='.lock'),'New run needs an empty output directory');
   state={version:1,id:randomUUID(),offline,plan:structuredClone(plan),corpusHash,executionDate:new Date().toISOString().slice(0,10),fingerprint:modelRolloutFingerprint(scopedEnv),executionFingerprint:code,limits,ledger:[],units:Object.fromEntries(plan.cases.flatMap(c=>['baseline','candidate'].map(arm=>[c.id+'--'+arm,{status:'pending'}])))};
   fs.mkdirSync(path.join(directory,'private'),{mode:0o700});fs.mkdirSync(path.join(directory,'results'),{mode:0o700});writeJSON(stateFile,state);
  }
  for(const unit of Object.keys(state.units)){
   if(state.units[unit].status==='completed')continue;
   requireThat(state.executionDate===new Date().toISOString().slice(0,10),'New-arm execution date changed; start a separately reviewed run');
   requireThat(state.units[unit].status==='pending'||retryIncomplete,'Incomplete arm needs explicit --resume --retry-incomplete; reservations remain charged');
   const code=await runWorker(directory,unit,scopedEnv,limits.timeoutMs);
   state=readJSON(stateFile);
   writeJSON(path.join(directory,'comparison.json'),evidenceSummary(state,directory));
   if(code!==0||state.units[unit].status!=='completed')throw new Error('Comparison stopped at '+unit+'; inspect private checkpoint and safe status, then explicitly resume');
  }
  const summary=evidenceSummary(state,directory);writeJSON(path.join(directory,'comparison.json'),summary);return summary;
 }finally{fs.closeSync(fd);fs.unlinkSync(lock);}
}
export function exportAcceptance(directory,review,env=process.env){
 const state=readJSON(path.join(directory,'run.json'));
 requireThat(!state.offline&&state.plan.material==='curated','Offline/synthetic runs cannot produce acceptance');
 requireThat(state.executionFingerprint===executionFingerprint(comparisonEnv(env,false)),'Execution/configuration changed');
 const summary=evidenceSummary(state,directory);
 requireThat(review.runId===state.id&&review.corpusHash===state.corpusHash&&Array.isArray(review.cases)&&review.cases.length===summary.cases.length,'Review must bind to this complete run');
 requireThat(new Set(review.cases.map(c=>c.id)).size===review.cases.length,'Duplicate review ids');
 const cases=summary.cases.map(c=>{
  const human=review.cases.find(r=>r.id===c.id);requireThat(human,'Missing case review');
  return {id:c.id,mode:c.mode,source:'live',...Object.fromEntries(['baseline','candidate'].map(arm=>{
   requireThat(c[arm].status==='completed'&&human[arm]?.artifactHash===c[arm].artifactHash,'Review output hash missing/changed');
   requireThat(typeof human[arm].notes==='string'&&human[arm].notes.trim(),'Citation/fact review notes required');
   return [arm,{deliveryPassed:c[arm].deliveryPassed,citationPassed:human[arm].citationPassed,criticalFactErrors:human[arm].criticalFactErrors}];
  }))};
 });
 const result={version:1,kind:'live-model-comparison',fingerprint:state.fingerprint,runId:state.id,corpusHash:state.corpusHash,dryRunAccepted:review.dryRunAccepted,rollbackVerified:review.rollbackVerified,approvedBy:review.approvedBy,approvedAt:review.approvedAt,cases};
 const gate=validateModelRollout(result,env);requireThat(gate.accepted,'Acceptance rejected: '+gate.reasons.join(', '));
 return result;
}
async function main(){
 const [command,...args]=process.argv.slice(2),options={};
 for(let i=0;i<args.length;i++){
  requireThat(args[i].startsWith('--'),'Expected named options');const key=args[i].slice(2);
  requireThat(!Object.hasOwn(options,key),'Duplicate option');
  options[key]=['live','allow-paid','resume','retry-incomplete'].includes(key)?true:args[++i];
 }
 if(command==='help'||!command){console.log('model-comparison: check|run --plan <json> --out <empty-directory> --limits <json> [--live --allow-paid] [--resume --retry-incomplete]; export --out <directory> --review <json>. Default run is offline; no production mode is changed.');return;}
 requireThat(['check','run','export'].includes(command),'Unknown command');
 const allowed=command==='export'?['out','review']:['plan','out','limits','live','allow-paid','resume','retry-incomplete'];
 requireThat(Object.keys(options).every(k=>allowed.includes(k)),'Unknown option');
 if(command==='export'){
  const report=exportAcceptance(path.resolve(options.out),readJSON(options.review));
  fs.writeFileSync(path.join(options.out,'acceptance.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});console.log('Acceptance file written; production configuration unchanged.');return;
 }
 const plan=validatePlan(readJSON(options.plan),{live:Boolean(options.live)}),limits=validateLimits(readJSON(options.limits));
 if(command==='check'){console.log(JSON.stringify({valid:true,cases:plan.cases.length,arms:plan.cases.length*2,live:Boolean(options.live),limits,paidCalls:0}));return;}
 requireThat(typeof options.out==='string','Output directory required');
 const summary=await runComparison({plan,limits,directory:options.out,offline:!options.live,allowPaid:options['allow-paid'],resume:options.resume,retryIncomplete:options['retry-incomplete']});
 console.log(JSON.stringify({kind:summary.kind,cases:summary.cases.length,qualityAcceptance:false,attempts:summary.budget.attempts}));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error instanceof Error?error.message:'Comparison failed');process.exitCode=1;});
