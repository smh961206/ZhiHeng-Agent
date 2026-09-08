import {createHash} from 'node:crypto';
import {modes} from '../shared/research-framework.mjs';
import {mayContain} from '../shared/knowledge-search.mjs';
import {snapshotManager} from './knowledge-snapshots.mjs';
import {depthSections} from '../shared/knowledge-loading.mjs';
export {indexRules} from '../shared/knowledge-index.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const initialSnapshot=snapshotManager.current();
export const moduleCatalog=initialSnapshot.catalog;
const entryText=initialSnapshot.entry;
// Compatibility exports describe the startup snapshot; job paths use pinned sessions.
export const knowledgeManifest=initialSnapshot.manifest;

export function createRuleStore(readModule=initialSnapshot.read,{catalog=moduleCatalog,entry=entryText,snapshotId=null,records=[],onRead=()=>{}}={}){
 const moduleCatalog=catalog,entryText=entry;
 const cache=new Map(),seen=new Set(records.map(record=>record.key));
 function record(module,content,reason,{kind='context',section,truncated=false}={}){
  const line=section?.line??1,endLine=line+content.split(/\r?\n/).length-1;
  const item={snapshotId,moduleId:module.id,path:module.path,heading:section?.title??module.title,line,endLine,
   sectionEndLine:section?.endLine??endLine,sha256:module.sha256,contentSha256:hash(content),characters:content.length,reason,kind,truncated};
  const key=hash(JSON.stringify(item));if(seen.has(key))return;
  seen.add(key);const saved={...item,key,at:new Date().toISOString()};records.push(saved);onRead(saved);
 }

 function load(module,reason='规则读取'){
  if(!cache.has(module.id)){
   const text=readModule(module.path);
   if(hash(text)!==module.sha256)throw new Error(module.path+' 内容与模块目录不一致，当前任务的固定快照无法读取');
   cache.set(module.id,text);record(module,text,reason,{kind:'file'});
  }
  return cache.get(module.id);
 }
 const chapterRules=(chapter,{reason='章节查询'}={})=>moduleCatalog.modules.filter(m=>m.chapter===chapter).map(module=>{
  const content=load(module,reason);record(module,content,reason);return content;
 }).join('\n\n');
 function sectionResult(module,section,reason){
  const text=load(module,reason).split(/\r?\n/).slice(section.index,section.endLine).join('\n');
  return {source:module.path,heading:section.title,line:section.line,endLine:section.endLine,content:text,truncated:false};
 }
 function searchRules(query,{limit=4,maxChars=24000,reason='规则补读',recordContext=true}={}){
  const terms=String(query).toLocaleLowerCase().split(/[\s，、,]+/).filter(Boolean);
  if(!terms.length)return {sections:[],notice:'请提供规则关键词'};
  const entries=moduleCatalog.modules.flatMap(module=>module.sections.map(section=>({module,section,score:terms.reduce((sum,t)=>sum+(section.title.toLocaleLowerCase().includes(t)?30:0),0)})));
  let candidates=entries.filter(e=>e.score>0);
  if(!candidates.length)candidates=entries.filter(e=>terms.some(t=>mayContain(e.module.bodyFilter,t))).map(e=>({...e,score:terms.reduce((sum,t)=>sum+(sectionResult(e.module,e.section,'检索候选：'+query).content.toLocaleLowerCase().includes(t)?1:0),0)})).filter(e=>e.score>0);
  candidates.sort((a,b)=>b.score-a.score||b.section.level-a.section.level||a.module.originalLine+a.section.line-b.module.originalLine-b.section.line);
  const selected=[];let remaining=Math.max(0,maxChars);
  for(const {module,section} of candidates){
   if(selected.length>=limit||remaining<=0)break;
   if(selected.some(s=>s.source===module.path&&section.line<=s.endLine&&section.endLine>=s.line))continue;
   const result=sectionResult(module,section,reason+'：'+query),content=result.content.slice(0,remaining);remaining-=content.length;
   selected.push({...result,content,truncated:content.length<result.content.length});
   if(recordContext)record(module,content,reason+'：'+query,{section,truncated:content.length<result.content.length});
  }
  return {sections:selected,notice:selected.some(s=>s.truncated)?'部分章节已截断，请用小节标题定向读取':selected.length?'规则来源与行号随内容返回':'未匹配章节，请缩短关键词'};
 }
 function planTaskRules(plan,{question=''}={}){
  const profile=modes[plan.mode];if(!profile)throw new Error('研究模式无效');
  const chapters=new Set([0,17,18,...profile.ruleChapters.filter(n=>![1,15,16].includes(n))]);
  if(plan.secondaryModules?.some(m=>m.includes('股东回报')))chapters.add(6);
  if(plan.secondaryModules?.includes('组合约束')||plan.execution)chapters.add(12);
  const needsBattle=/作战图|估值图|买入区间图/.test(question);
  const depth=plan.depth||profile.defaultDepth;
  const deferred=[];
  if(plan.mode==='B'&&depth!=='Deep'&&!needsBattle){
   chapters.delete(10);deferred.push('10. SCORING ENGINE：100 分研究仪表盘');
  }
  if(needsBattle)chapters.add(10);
  const texts=[entryText];
  record({id:'entry',path:'knowledge/ENTRY.md',title:'研究执行入口',sha256:hash(entryText)},entryText,'任务入口');
  for(const module of moduleCatalog.modules){
   const route=module.chapter===1&&(module.id==='01-routing-principles'||module.id==='01-routing-links'||module.id==='01-mode-'+plan.mode.toLowerCase());
   const battle=module.id==='15-output-battle-map'&&needsBattle;
   const execution=module.id==='15-output-execution'&&plan.execution;
   if(!chapters.has(module.chapter)&&!route&&!battle&&!execution)continue;
   const reason=battle?'用户请求作战图':execution?'任务涉及执行或复盘':route?'主模式路由':`任务范围 ${plan.mode} / ${depth}`;
   // Select from the single canonical chapter, never maintain a second summary.
   const selectedSections=plan.mode==='A'&&module.chapter===7?['7.1 ','7.4 ']:
    plan.mode!=='F'&&module.chapter===6?['6.1 ','6.2 ','6.4 ','6.5 ','6.9 ']:
    plan.mode==='B'?depthSections[depth]?.[module.chapter]:null;
   if(selectedSections){
    const sections=module.sections.filter(s=>s.level===2);
    texts.push(sections.filter(s=>selectedSections.some(prefix=>s.title.startsWith(prefix))).map(s=>{const content=sectionResult(module,s,reason).content;record(module,content,reason,{section:s});return content;}).join('\n\n'));
    if(plan.mode==='B'&&depthSections[depth]?.[module.chapter])deferred.push(...sections.filter(s=>!selectedSections.some(prefix=>s.title.startsWith(prefix))).map(s=>s.title));
   }
   else {const content=load(module,reason);record(module,content,reason);texts.push(content);}
  }
  if(deferred.length)texts.push('按需补读目录（以下详细正文尚未加载）：\n'+deferred.map(title=>'- '+title).join('\n')+'\n如本次交付需要使用这些专项，先通过 read_rules 按上述标题读取完整原文，再执行或给出评分；补读不改变本次计划的输出范围。');
  return texts.join('\n\n');
 }
 function planRuleContext(plan){
  const keyword=({A:'Quick Output',B:plan.depth==='Deep'?'Deep Output':plan.depth==='Quick'?'Quick Output':'Standard Output',C:'Update Output',D:'Comparison Output',E:'PORTFOLIO ENGINE',F:'Dividend Output'})[plan.mode];
  // E's portfolio protocol is already in the task context. Keep the returned
  // schema reference but avoid sending the same body a second time.
  const result=searchRules(keyword,{limit:1,reason:'输出模板',recordContext:plan.mode!=='E'});
  if(plan.mode==='E')for(const section of result.sections){section.content='本专项已在本次任务规则中加载，按计划给定的组合报告章节交付。';}
  const review=plan.execution&&!modes[plan.mode].ruleChapters.includes(13)?searchRules('V4.2 交易复盘记录',{limit:1,reason:'执行复盘补充'}).sections[0]?.content:'';
  return JSON.stringify(result)+(review?'\n\n'+review:'');
 }
 return {chapterRules,searchRules,planTaskRules,planRuleContext,getAuditRules:()=>chapterRules(16,{reason:'正式输出前审计'}),
  usage:()=>structuredClone(records),
  loadedModules:()=>[...cache.keys()]};
}
const store=createRuleStore();
export const {chapterRules,searchRules,planTaskRules,planRuleContext,getAuditRules}=store;

export function bindKnowledge(plan,manager=snapshotManager){
 const snapshot=plan.knowledgeSnapshot?manager.open(plan.knowledgeSnapshot):manager.current();
 if(!plan.knowledgeSnapshot)plan.knowledgeUpdatePending=manager.status().updatePending;
 plan.knowledgeSnapshot=structuredClone(snapshot.ref);
 plan.knowledge=structuredClone(snapshot.manifest);
 return snapshot;
}

export function createJobRuleSession(job,{manager=snapshotManager,onRead=()=>{}}={}){
 const snapshot=bindKnowledge(job.plan,manager);
 if(job.knowledgeUsage?.snapshotId!==snapshot.ref.id)job.knowledgeUsage={snapshotId:snapshot.ref.id,records:[]};
 const rules=createRuleStore(snapshot.read,{catalog:snapshot.catalog,entry:snapshot.entry,snapshotId:snapshot.ref.id,records:job.knowledgeUsage.records,onRead});
 return {...rules,snapshot:snapshot.ref,manifest:snapshot.manifest};
}

export function currentKnowledge(){
 const snapshot=snapshotManager.current();
 return {knowledge:structuredClone(snapshot.manifest),knowledgeSnapshot:structuredClone(snapshot.ref),knowledgeStatus:snapshotManager.status()};
}

export function savedKnowledgeMatches(plan,manager=snapshotManager){
 if(!plan?.knowledgeSnapshot&&!Array.isArray(plan?.knowledge))return true;
 try{
  const snapshot=plan?.knowledgeSnapshot?manager.open(plan.knowledgeSnapshot):manager.current();
  if(!Array.isArray(plan?.knowledge))return !plan?.knowledgeSnapshot;
  return snapshot.manifest.length===plan.knowledge.length&&snapshot.manifest.every(current=>plan.knowledge.find(saved=>saved.id===current.id)?.sha256===current.sha256);
 }catch{return false;}
}
