import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {toolsForMode,runAgent} from '../server/agent.mjs';
import {frameworkVersion,createResearchPlan} from '../shared/research-framework.mjs';
import {indexRules,moduleCatalog} from '../server/knowledge.mjs';
import {researchResume,resumeScope,resumeSummary} from '../server/research-resume.mjs';
import {retryNotice} from '../shared/research-recovery.mjs';
import {validateReview} from '../server/research-output.mjs';
import {reviewFixture} from './fixtures/research-review.mjs';
import * as calculations from '../server/calculations.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8').replaceAll('\r\n','\n');
test('V4.3 retires the V4.1 enhancement while retaining base chapters and later execution safeguards',()=>{
 assert.equal(frameworkVersion,'4.7');
 for(const kind of ['FULL']){
  const current=moduleCatalog.modules.map(m=>read(m.path)).join('\n\n'),base=read(`knowledge/versions/v4.0/V4.0_${kind}_SKILL.md`),previous=read(`knowledge/versions/v4.2.0/V4.2.0_${kind}_SKILL.md`);
  const operational=current.split(/# \d+\. V4\.2→V4\.3 更新摘要/)[0];
  assert.doesNotMatch(operational,/\bP2\b|市赚率|行业龙头锚|→100|→50|V4\.1输出联动/);
  for(const heading of indexRules(base,'base').filter(s=>s.level===1&&/^\d+\./.test(s.title)&&parseInt(s.title,10)<20))assert.ok(indexRules(current,'current').some(s=>s.title===heading.title),'Retain V4 chapter '+heading.title);
  for(const title of ['V4.2 执行纪律：研究状态与组合执行','V4.2 交易复盘记录','V4.2 Execution Audit']){
   const oldSection=indexRules(previous,'previous').find(s=>s.title===title);
   const newSection=indexRules(current,'current').find(s=>s.title===title);
   assert.equal(newSection?.content.trim(),oldSection?.content.trim(),title);
  }
  for(const guard of ['无旧结论','Quick FCF','单季','反证','共同','普通股权益','Research Action','至少'])assert.ok(operational.includes(guard));
 }
 for(const mode of ['A','B','C','D','E','F']){
  const names=toolsForMode(mode).map(t=>t.function.name);
  assert.ok(!names.includes('calculate_p2'));assert.ok(names.includes('calculate_screen_metrics'));
  assert.doesNotMatch(JSON.stringify(createResearchPlan({mode,question:'合成研究',securities:[]})),/市赚率|P2/);
 }
 assert.equal(calculations.p2,undefined);assert.equal(calculations.correction,undefined);
});

test('historical source backups stay byte-identical during V4.3 generation',()=>{
 const entries=JSON.parse(read('knowledge/versions/manifest.json').replace(/^\uFEFF/,''));
 for(const entry of entries){const bytes=readFileSync(new URL('../knowledge/versions/'+entry.path,import.meta.url));assert.equal(bytes.length,entry.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256);}
});

test('old framework checkpoints cannot restore retired tools into new research; current checkpoints still resume',()=>{
 const job={status:'failed',mode:'B',input:{question:'合成研究',sources:[{id:'S1'}]},plan:{version:'4.2'},workflow:{stages:[{id:'evidence',status:'completed'}]}};
 assert.equal(researchResume(job),null);
 assert.equal(resumeSummary(job).reason,'framework_changed');assert.match(retryNotice({...job,resume:resumeSummary(job)}),/按新版本重新研究/);
 job.plan.version=frameworkVersion;job.checkpoint={version:1,scope:resumeScope(job),phase:'research',toolRecords:[],evidence:[]};
 assert.ok(researchResume(job));assert.equal(resumeSummary(job).available,true);
});

test('retired valuation methods cannot be accepted as new supported or limited conclusions',()=>{
 const input={mode:'B',question:'合成研究',depth:'Standard',securities:[]},plan=createResearchPlan(input),sources=[{id:'S1',title:'合成资料',text:'合成证据'}];
 for(const status of ['supported','limited']){
  const review=reviewFixture(input);review.decision.valuation={status,methods:['DCF','P2 F1'],explanation:'合成测试'};
  assert.throws(()=>validateReview(review,{input,plan,sources}),/已移除市赚率/);
 }
});

test('a model attempting the retired tool receives a failure instead of a calculation',async()=>{
 const previousFetch=global.fetch,events=[];
 const input={mode:'B',question:'合成研究',depth:'Standard',securities:[],sources:[{id:'S1',title:'合成资料',text:'合成证据'}]};
 let requests=0;
 try{
  global.fetch=async(_url,options)=>{
   const body=JSON.parse(options.body);requests++;
   assert.ok(!body.tools?.some(t=>t.function.name==='calculate_p2'));
   if(requests===1)return Response.json({choices:[{message:{role:'assistant',content:null,tool_calls:[{id:'retired',type:'function',function:{name:'calculate_p2',arguments:'{}'}}]}}]});
   if(requests===2){assert.match(JSON.parse(body.messages.find(m=>m.role==='tool').content).error,/不允许/);return Response.json({choices:[{message:{role:'assistant',content:'合成草稿[S1]'}}]});}
   return Response.json({choices:[{message:{role:'assistant',content:JSON.stringify(reviewFixture(input))}}]});
  };
  await runAgent({mode:'B',input},(type,message,details)=>events.push({type,...details}),new AbortController().signal);
  const record=events.find(e=>e.type==='tool_result'&&e.toolCallId==='retired');assert.ok(record.result.error);assert.equal(record.result.ordinary,undefined);
 }finally{global.fetch=previousFetch;}
});
