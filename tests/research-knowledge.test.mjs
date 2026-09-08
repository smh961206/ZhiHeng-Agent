import test from 'node:test';
import assert from 'node:assert/strict';
import {frameworkVersion} from '../shared/research-framework.mjs';
import {knowledgeAvailability,ruleUsage,mergeRuleRead} from '../shared/research-knowledge.mjs';
import {createJobRuleSession} from '../server/knowledge.mjs';
import {knowledgeExcerpt} from '../server/knowledge-excerpt.mjs';
import {createResearchPlan} from '../shared/research-framework.mjs';
import {exportResearchMarkdown} from '../shared/research-export.mjs';
import {researchPreparation} from '../shared/research-preparation.mjs';

test('service state distinguishes pending revisions from unavailable or incompatible service',()=>{
 for(const config of [null,{connectionState:'error'},{knowledgeVersion:'0.0'},{configured:false,knowledgeVersion:frameworkVersion}])assert.equal(knowledgeAvailability(config).blocking,true);
 const pending={configured:true,knowledgeVersion:frameworkVersion,knowledgeStatus:{updatePending:true}};
 assert.equal(knowledgeAvailability(pending).kind,'pending');assert.equal(knowledgeAvailability(pending).blocking,false);
 const input={mode:'B',question:'合成研究',securities:[{market:'CN',symbol:'600519'}]};
 assert.equal(researchPreparation(input,{}, {config:pending}).ready,true);
 assert.equal(researchPreparation(input,{}, {config:{...pending,connectionState:'error'}}).ready,false);
 assert.equal(researchPreparation(input,{}, {config:{...pending,knowledgeVersion:'0.0'}}).ready,false);
});

test('live reads merge only into their own snapshot; counts never come from the full catalog',()=>{
 const job={plan:{knowledgeSnapshot:{id:'original',version:frameworkVersion},knowledge:[{id:'unread'}]},events:[]};
 assert.equal(ruleUsage(job).recorded,false);assert.equal(ruleUsage(job).moduleCount,0);
 const event={type:'knowledge_read',ruleRead:{key:'a',snapshotId:'original',kind:'context',moduleId:'07-valuation',path:'rules.md',heading:'DCF',reason:'规则补读'}};
 const next=mergeRuleRead(job,event);assert.equal(ruleUsage(next).moduleCount,1);
 assert.equal(mergeRuleRead(next,event),next);assert.equal(mergeRuleRead(next,{...event,ruleRead:{...event.ruleRead,snapshotId:'different'}}),next);
 assert.equal(job.knowledgeUsage,undefined);
 const result={framework:{snapshot:{id:'original'},usage:{snapshotId:'original',records:[]}}};
 assert.equal(ruleUsage({...next,result}).records.length,0,'Saved final usage takes precedence over later events');
});

test('excerpt endpoint reconstructs only recorded content and refuses guessed paths, changes and missing archives',()=>{
 const job={id:'fixture',plan:createResearchPlan({mode:'B'})},session=createJobRuleSession(job);
 const result=session.searchRules('7.3 DCF 计算协议',{limit:1,maxChars:97}),record=job.knowledgeUsage.records.find(row=>row.kind==='context');
 assert.equal(knowledgeExcerpt(job,record.key).content,result.sections[0].content);
 assert.equal(knowledgeExcerpt(job,record.key).truncated,true);
 assert.throws(()=>knowledgeExcerpt(job,'../../knowledge/ENTRY.md'),{status:404});
 const changed=structuredClone(job);changed.knowledgeUsage.records.find(row=>row.key===record.key).contentSha256='invalid';
 assert.throws(()=>knowledgeExcerpt(changed,record.key),{status:409});
 assert.throws(()=>knowledgeExcerpt(job,record.key,{manager:{open(){throw new Error('missing');}}}),{status:409});
 assert.throws(()=>knowledgeExcerpt(null,record.key),{status:404});
});

test('exports for every mode distinguish actual context from file lookup and retain recorded version',()=>{
 for(const includeResearchProcess of [true,false]){
  const job={mode:'F',input:{question:'测试',sources:[]},plan:createResearchPlan({mode:'F'}),result:{report:'合成报告'}};
  const session=createJobRuleSession(job);session.searchRules('7.3 DCF 计算协议',{limit:1,maxChars:80});
  const text=exportResearchMarkdown(job,{includeResearchProcess});
  assert.match(text,/本次规则依据/);assert.match(text,/固定快照/);assert.match(text,/部分内容/);assert.doesNotMatch(text,/本次使用的研究规则/);
  assert.equal((text.match(/文件：knowledge\/modules\/rules\/07-valuation.md/g)||[]).length,1);
  assert.doesNotMatch(text,/19-glossary.md/);
 }
 const legacy={input:{question:'旧报告'},result:{report:'原始判断'},plan:{version:'4.3',knowledge:[{path:'unread.md'}]}};
 assert.match(exportResearchMarkdown(legacy),/记录版本：V4.3/);assert.match(exportResearchMarkdown(legacy),/未保存实际读取明细/);assert.doesNotMatch(exportResearchMarkdown(legacy),/unread.md/);
});
