import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,copyFileSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {createSnapshotManager} from '../server/knowledge-snapshots.mjs';
import {createRuleStore,createJobRuleSession,savedKnowledgeMatches,moduleCatalog} from '../server/knowledge.mjs';
import {createResearchPlan,frameworkVersion} from '../shared/research-framework.mjs';
import {indexRules} from '../shared/knowledge-index.mjs';
import {bodyFilter} from '../shared/knowledge-search.mjs';
import {runAgent} from '../server/agent.mjs';
import {reviewFixture} from './fixtures/research-review.mjs';

const hash=text=>createHash('sha256').update(text).digest('hex');
function fixture(t){
 const root=mkdtempSync(join(tmpdir(),'knowledge-snapshot-'));
 t.after(()=>rmSync(root,{recursive:true,force:true}));
 for(const path of ['knowledge/ENTRY.md','knowledge/modules.json',...moduleCatalog.modules.map(m=>m.path)]){
  const target=join(root,path);mkdirSync(dirname(target),{recursive:true});copyFileSync(new URL('../'+path,import.meta.url),target);
 }
 return {root,manager:createSnapshotManager({root})};
}
function revise(root,path,addition,{index=true}={}){
 const target=join(root,path),text=readFileSync(target,'utf8')+addition;writeFileSync(target,text);
 if(index){
  const file=join(root,'knowledge/modules.json'),catalog=JSON.parse(readFileSync(file,'utf8')),module=catalog.modules.find(m=>m.path===path);
  module.sha256=hash(text);module.bytes=Buffer.byteLength(text);module.bodyFilter=bodyFilter(text);
  module.sections=indexRules(text,path).map(({content,source,...s})=>s);
  writeFileSync(file,JSON.stringify(catalog,null,2)+'\n');
 }
}

test('new jobs adopt validated revisions; queued, running and restored sessions keep their complete original snapshot',t=>{
 const {root,manager}=fixture(t),job={plan:createResearchPlan({mode:'A'})};
 const old=createJobRuleSession(job,{manager});
 old.planTaskRules(job.plan);
 const audit='knowledge/modules/rules/16-audit.md',baseline=readFileSync(join(root,audit),'utf8');
 assert.ok(!old.loadedModules().includes('16-audit'));
 revise(root,audit,'\n只用于测试的新审计修订\n');
 const nextJob={plan:createResearchPlan({mode:'A'})},next=createJobRuleSession(nextJob,{manager});
 assert.notEqual(next.snapshot.id,old.snapshot.id);
 assert.equal(old.getAuditRules(),baseline,'An audit file first opened after the update still comes from the old generation');
 assert.match(next.getAuditRules(),/只用于测试的新审计修订/);
 const restoredManager=createSnapshotManager({root});
 const restored=createJobRuleSession(structuredClone(job),{manager:restoredManager});
 assert.equal(restored.snapshot.id,old.snapshot.id);assert.equal(restored.getAuditRules(),baseline);
 assert.equal(savedKnowledgeMatches(job.plan,restoredManager),true);
 const changed=structuredClone(job.plan);changed.knowledge[0].sha256='changed';assert.equal(savedKnowledgeMatches(changed,manager),false);
});

test('partial writes, malformed indexes and incompatible versions never replace the last valid snapshot',t=>{
 const {root,manager}=fixture(t),first=manager.current(),path='knowledge/modules/rules/19-glossary.md';
 revise(root,path,'\n未登记的新正文\n',{index:false});
 assert.equal(manager.current().ref.id,first.ref.id);assert.equal(manager.status().updatePending,true);
 // Even an unselected module must validate before a new generation can be used.
 assert.equal(createSnapshotManager({root}).current().ref.id,first.ref.id,'Restart falls back to a complete validated archive');
 revise(root,path,'\n目录完成\n');
 const second=manager.current();assert.notEqual(second.ref.id,first.ref.id);assert.equal(manager.status().updatePending,false);
 const file=join(root,'knowledge/modules.json'),valid=readFileSync(file,'utf8'),catalog=JSON.parse(valid);
 catalog.modules[0].sections[0].line=999;writeFileSync(file,JSON.stringify(catalog));
 assert.equal(manager.current().ref.id,second.ref.id);assert.match(manager.status().error,/章节索引不一致/);
 writeFileSync(file,'{"unfinished":');assert.equal(manager.current().ref.id,second.ref.id);
 writeFileSync(file,valid.replace('"version": "'+frameworkVersion+'"','"version": "99.9"'));
 assert.equal(manager.current().ref.id,second.ref.id);
 assert.throws(()=>manager.open({version:frameworkVersion,id:'../outside'}),/标识无效/);
 const pinned=join(root,'knowledge/versions/auto',frameworkVersion,first.ref.id,'modules/rules/16-audit.md');
 writeFileSync(pinned,'corrupt');assert.throws(()=>manager.open(first.ref),/校验失败/);
});

test('usage distinguishes candidate file reads from exact delivered sections, with hashes and truncation',t=>{
 const {manager}=fixture(t),snapshot=manager.current(),records=[];
 const store=createRuleStore(snapshot.read,{catalog:snapshot.catalog,entry:snapshot.entry,snapshotId:snapshot.ref.id,records});
 const result=store.searchRules('养老金',{limit:1,maxChars:60});
 assert.ok(records.some(r=>r.kind==='file'));
 const delivered=records.filter(r=>r.kind==='context');assert.equal(delivered.length,result.sections.length);
 for(const [index,record] of delivered.entries()){
  const section=result.sections[index];assert.equal(record.contentSha256,hash(section.content));assert.equal(record.truncated,section.truncated);
  assert.equal(record.endLine,record.line+section.content.split(/\r?\n/).length-1);
  assert.equal(record.sha256,snapshot.catalog.modules.find(m=>m.path===record.path).sha256);
  assert.match(record.reason,/规则补读：养老金/);
 }
 const count=records.length;store.searchRules('养老金',{limit:1,maxChars:60});assert.equal(records.length,count,'identical reads are not duplicated');
 const untouched=createJobRuleSession({plan:createResearchPlan({mode:'A'})},{manager});assert.deepEqual(untouched.usage(),[]);
 const job={plan:createResearchPlan({mode:'B',depth:'Quick'})},session=createJobRuleSession(job,{manager});
 session.planTaskRules(job.plan);session.planRuleContext(job.plan);
 assert.ok(job.knowledgeUsage.records.some(r=>r.heading==='4.1 一句话商业模型'&&r.kind==='context'));
 assert.ok(!job.knowledgeUsage.records.some(r=>r.kind==='context'&&/DCF 计算协议|产品矩阵/.test(r.heading)));
 assert.ok(!job.knowledgeUsage.records.some(r=>r.moduleId==='16-audit'));
 const restored=createJobRuleSession(structuredClone(job),{manager}),before=restored.usage().length;
 restored.planTaskRules(job.plan);restored.planRuleContext(job.plan);
 assert.equal(restored.usage().length,before);restored.getAuditRules();assert.ok(restored.usage().some(r=>r.reason==='正式输出前审计'));
});

test('agent keeps one generation through live update, tool lookup, checkpoints and final audit provenance',async t=>{
 const {root,manager}=fixture(t),oldFetch=global.fetch; t.after(()=>{global.fetch=oldFetch;});
 const job={mode:'B',input:{mode:'B',question:'合成研究',depth:'Standard',sources:[{id:'S1',title:'测试资料',text:'合成证据，仅测试。'}]},events:[]};
 let calls=0,checkpoint;
 global.fetch=async(_url,options)=>{
  calls++;const body=JSON.parse(options.body);
  if(calls===1){
   revise(root,'knowledge/modules/rules/16-audit.md','\n只属于新任务的审计标记\n');
   revise(root,'knowledge/modules/rules/07-valuation.md','\n只属于新任务的估值标记\n');
   assert.notEqual(manager.current().ref.id,job.plan.knowledgeSnapshot.id);
   return Response.json({choices:[{message:{role:'assistant',tool_calls:[{id:'rules',type:'function',function:{name:'read_rules',arguments:JSON.stringify({query:'7.3 DCF 计算协议'})}}]}}]});
  }
  if(calls===2){
   const result=JSON.parse(body.messages.find(m=>m.role==='tool').content);
   assert.match(result.sections[0].content,/Step 7/);assert.doesNotMatch(result.sections[0].content,/新任务的估值标记/);
   return Response.json({choices:[{message:{role:'assistant',content:'合成研究草稿[S1]'}}]});
  }
  assert.doesNotMatch(body.messages[0].content,/新任务的审计标记/);
  return Response.json({choices:[{message:{role:'assistant',content:JSON.stringify(reviewFixture(job.input))}}]});
 };
 const result=await runAgent(job,(type,message,details)=>job.events.push({type,message,...details}),new AbortController().signal,{ruleManager:manager,onCheckpoint:async()=>{checkpoint=structuredClone(job);}});
 assert.equal(calls,3);assert.equal(result.framework.snapshot.id,job.plan.knowledgeSnapshot.id);
 assert.deepEqual(result.framework.knowledge,job.plan.knowledge);assert.deepEqual(result.framework.usage,job.knowledgeUsage);
 assert.equal(checkpoint.knowledgeUsage.snapshotId,job.plan.knowledgeSnapshot.id);
 assert.ok(checkpoint.knowledgeUsage.records.some(r=>r.reason==='正式输出前审计'));
 assert.ok(job.events.some(e=>e.type==='knowledge_read'&&e.ruleRead.reason==='规则补读：7.3 DCF 计算协议'));
 assert.ok(result.framework.usage.records.every(r=>r.snapshotId===result.framework.snapshot.id));
});
