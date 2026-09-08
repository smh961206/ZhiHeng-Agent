import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRuleStore,moduleCatalog,indexRules} from '../server/knowledge.mjs';
import {createResearchPlan} from '../shared/research-framework.mjs';
import {bodyFilter,mayContain} from '../shared/knowledge-search.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const hash=text=>createHash('sha256').update(text).digest('hex');
function fixture(){const reads=[];return {reads,store:createRuleStore(path=>{reads.push(path);return read(path);})};}

test('V4.5 has one entry and one canonical set; all edits are accounted for by the migration review',()=>{
 const moduleCatalog=JSON.parse(read('knowledge/versions/v4.5.0/modules.json'));
 assert.equal(moduleCatalog.entry,'knowledge/ENTRY.md');
 for(const name of ['CORE.md','FULL.md','modules/core','modules/full'])assert.equal(existsSync(new URL('../knowledge/'+name,import.meta.url)),false);
 const mapping=JSON.parse(read('knowledge/deduplication-v45.json'));
 assert.equal(mapping.coreModules.length,JSON.parse(read('knowledge/versions/v4.4.0/modules.json')).modules.filter(m=>m.source==='core').length);
 for(const old of mapping.coreModules){
  assert.equal(hash(read(old.path)),old.sha256);
  if(!old.disposition.includes('历史说明'))assert.ok(old.targets.length);
  for(const target of old.targets)assert.ok(moduleCatalog.modules.some(m=>m.path===target));
 }
 for(const module of moduleCatalog.modules){
  assert.equal(module.source,'rules');
  const original=read(module.origin.path);assert.equal(hash(original),module.origin.sha256);
  let expected=original.replaceAll('\r\n','\n');
  for(const change of mapping.changes.filter(c=>c.target===module.path)){
   assert.ok(expected.includes(change.before),change.reason);
   expected=expected.replace(change.before,change.after);
  }
  assert.equal(read('knowledge/versions/v4.5.0/'+module.path.slice('knowledge/'.length)),expected,module.path);
  assert.deepEqual(module.sections,indexRules(expected,module.path).map(({content,source,...s})=>s));
 }
});

test('V4.6 preserves every V4.5 rule byte and indexes the split execution module independently',()=>{
 const previous=JSON.parse(read('knowledge/versions/v4.5.0/modules.json'));
 assert.equal(moduleCatalog.modules.length,previous.modules.length+1);
 for(const module of previous.modules){
  const baseline=readFileSync(new URL('../knowledge/versions/v4.5.0/'+module.path.slice('knowledge/'.length),import.meta.url));
  const current=readFileSync(new URL('../'+module.path,import.meta.url));
  const combined=module.id==='15-output-battle-map'?Buffer.concat([current,readFileSync(new URL('../knowledge/modules/rules/15-output-execution.md',import.meta.url))]):current;
  assert.deepEqual(combined,baseline,module.path);
 }
 for(const module of moduleCatalog.modules){
  const text=read(module.path);
  assert.equal(hash(text),module.sha256);assert.equal(Buffer.byteLength(text),module.bytes);
  assert.deepEqual(module.sections,indexRules(text,module.path).map(({content,source,...s})=>s));
  if(module.origin.byteStart!==undefined){
   const original=readFileSync(new URL('../'+module.origin.path,import.meta.url));
   assert.equal(hash(original),module.origin.sha256);
   assert.equal(original.subarray(module.origin.byteStart,module.origin.byteEnd).toString('utf8'),text);
  }
 }
 const files=readdirSync(new URL('../knowledge/modules/rules/',import.meta.url));
 assert.deepEqual(files.sort(),moduleCatalog.modules.map(m=>m.path.split('/').at(-1)).sort());
});

test('B depths reduce initial context while retaining common financial and decision safeguards',()=>{
 const contexts={};
 for(const depth of ['Quick','Standard','Deep']){
  const {store,reads}=fixture(),plan=createResearchPlan({mode:'B',depth});
  const text=store.planTaskRules(plan);contexts[depth]=text;
  for(const chapter of ['03-data','05-financial','08-risk-pricing','09-decision','11-confidence','17-prohibitions','18-principles'])assert.ok(text.includes(read('knowledge/modules/rules/'+chapter+'.md')),depth+' '+chapter);
  assert.equal(reads.some(p=>p.endsWith('10-scoring.md')),depth==='Deep');
  assert.equal(text.includes('### Step 1：选择现金流口径'),depth==='Deep');
  assert.equal(text.includes('## 10.1 总分结构'),depth==='Deep');
  assert.equal(text.includes('## 7.5 三情景估值'),depth!=='Quick');
  assert.equal(text.includes('## 4.2 产品矩阵'),depth!=='Quick');
  assert.match(text,/7.4 相对估值协议/);assert.match(text,/7.7 收益率锚与主估值冲突/);
  if(depth!=='Deep'){
   assert.match(text,/以下详细正文尚未加载/);
   assert.match(store.searchRules('7.3 DCF 计算协议',{limit:1}).sections[0].content,/Step 7/);
   assert.match(store.searchRules('10. SCORING ENGINE',{limit:1}).sections[0].content,/10.2 评分锚/);
  }
 }
 assert.ok(contexts.Quick.length<contexts.Standard.length);
 assert.ok(contexts.Standard.length<contexts.Deep.length);
 for(const mode of ['C','D','E','F']){
  const texts=['Quick','Standard','Deep'].map(depth=>fixture().store.planTaskRules(createResearchPlan({mode,depth,question:'合成研究'})));
  assert.equal(texts[0],texts[1],mode);assert.equal(texts[1],texts[2],mode);
 }
});

test('V4.4 snapshots still reconstruct both V4.3 sources byte-for-byte',()=>{
 const catalog=JSON.parse(read('knowledge/versions/v4.4.0/modules.json'));
 for(const source of catalog.sources){
  const text=catalog.modules.filter(m=>m.source===source.id).map(m=>read('knowledge/versions/v4.4.0/'+m.path.slice('knowledge/'.length))).join('');
  assert.equal(text,read(source.originalPath));assert.equal(hash(text),source.originalSha256);
 }
 const base='knowledge/versions/v4.4.0/',manifest=JSON.parse(read(base+'manifest.json'));
 for(const file of manifest.files){const bytes=readFileSync(new URL('../'+base+file.path,import.meta.url));assert.equal(bytes.length,file.bytes);assert.equal(hash(bytes),file.sha256);}
});

test('quick screening excludes other routes, dividends, portfolios and detailed DCF; audit is deferred',()=>{
 const {store,reads}=fixture();assert.deepEqual(reads,[]);
 const plan=createResearchPlan({mode:'A',question:'快速看公司'});
 const text=store.planTaskRules(plan);store.planRuleContext(plan);
 assert.match(text,/MODE A/);assert.doesNotMatch(text,/## 1\.\d MODE [BCDEF]/);
 assert.doesNotMatch(text,/Step 1：选择现金流口径/);
 assert.ok(reads.every(p=>!/(shareholder-return|portfolio|audit|history)/.test(p)));
 const count=reads.length;store.planTaskRules(plan);store.planRuleContext(plan);assert.equal(reads.length,count);
 store.getAuditRules();assert.equal(reads.filter(p=>p.endsWith('-audit.md')).length,1);
 assert.equal(store.getAuditRules().split('### V4.2 Execution Audit').length-1,1);
});

test('six modes retain their own route, declared chapter bindings and output schemas',()=>{
 for(const mode of ['A','B','C','D','E','F']){
  const {store}=fixture(),plan=createResearchPlan({mode,question:'合成研究'}),text=store.planTaskRules(plan);
  assert.ok(plan.ruleBindings.rules.length);assert.equal(plan.ruleBindings.core,undefined);assert.equal(plan.ruleBindings.full,undefined);
  assert.match(text,new RegExp('## 1\\.\\d MODE '+mode));
  for(const other of ['A','B','C','D','E','F'].filter(m=>m!==mode))assert.ok(!text.includes('MODE '+other+'：'));
  assert.ok(JSON.parse(store.planRuleContext(plan)).sections.length);
 }
});

test('dividend base stays scoped; the dividend mode obtains the full eight-year protocol',()=>{
 const base=fixture(),full=fixture();
 const baseText=base.store.planTaskRules(createResearchPlan({mode:'B',question:'长期研究'}));
 const fullText=full.store.planTaskRules(createResearchPlan({mode:'F',question:'分红'}));
 assert.match(baseText,/6.1 基础验证/);assert.doesNotMatch(baseText,/## 6.3 8 年股息专项/);
 assert.match(fullText,/## 6.3 8 年股息专项/);
 const update=fixture();assert.match(update.store.planTaskRules(createResearchPlan({mode:'C',question:'更新分红判断'})),/6.4 分红承诺/);
});

test('execution and battle maps retain the existing constraints without repeating the portfolio chapter',()=>{
 const {store,reads}=fixture(),plan=createResearchPlan({mode:'E',question:'复盘卖出后是否重新买入'});
 const task=store.planTaskRules(plan),output=store.planRuleContext(plan);
 assert.match(task,/12.3 V4.2 分批减仓/);assert.doesNotMatch(output,/## 12.3/);
 assert.match(task+output,/交易复盘记录/);
 assert.equal((task+output).split('### V4.2 执行输出联动').length-1,1);
 assert.doesNotMatch(task+output,/15.7 Investment Battle Map/);
 assert.ok(reads.some(p=>p.endsWith('15-output-execution.md')));assert.ok(!reads.some(p=>p.endsWith('15-output-battle-map.md')));
 const battle=fixture(),battleText=battle.store.planTaskRules(createResearchPlan({mode:'B',depth:'Quick'}),{question:'生成估值图'});
 assert.match(battleText,/15.7 Investment Battle Map/);assert.match(battleText,/10.1 总分结构/);
 assert.doesNotMatch(battleText,/### V4.2 执行输出联动/);
 assert.ok(!battle.reads.some(p=>p.endsWith('15-output-execution.md')));
 const both=fixture().store.planTaskRules(plan,{question:'复盘并生成作战图'});
 assert.equal(both.split('## 15.7 Investment Battle Map').length-1,1);
 assert.equal(both.split('### V4.2 执行输出联动').length-1,1);
 const neither=fixture(),plain=neither.store.planTaskRules(createResearchPlan({mode:'E',question:'检查行业集中'}));
 assert.doesNotMatch(plain,/15.7 Investment Battle Map|### V4.2 执行输出联动/);
 assert.ok(!neither.reads.some(p=>/15-output-(execution|battle-map)/.test(p)));
});

test('targeted DCF lookup opens one canonical file and reports its real lines',()=>{
 const {store,reads}=fixture(),result=store.searchRules('DCF 计算协议',{limit:1}).sections[0];
 assert.deepEqual(reads,['knowledge/modules/rules/07-valuation.md']);
 assert.equal(read(result.source).split(/\r?\n/)[result.line-1],'## '+result.heading);
 assert.match(result.content,/Step 7/);
 assert.equal(store.searchRules('DCF 计算协议',{limit:1,maxChars:20}).sections[0].truncated,true);
});
test('body lookup prefilters files and verifies actual matches',()=>{
 const {store,reads}=fixture(),result=store.searchRules('养老金',{limit:1});
 assert.ok(result.sections.some(s=>s.content.includes('养老金')));assert.ok(reads.length<moduleCatalog.modules.length);
 const filter=bodyFilter('现金流与Cash Flow口径');
 for(const term of ['现金流','Cash Flow','口径'])assert.equal(mayContain(filter,term),true);
});
test('corrupted selected modules cannot silently alter the prompt',()=>{
 const store=createRuleStore(path=>read(path)+'篡改');assert.throws(()=>store.chapterRules(7),/内容与模块目录不一致/);
});

test('V4.5 release contains the single-entry runtime and the reviewed deduplication record',()=>{
 const base='knowledge/versions/v4.5.0/',manifest=JSON.parse(read(base+'manifest.json'));
 assert.equal(manifest.businessMethodsChanged,false);
 assert.ok(manifest.files.some(f=>f.path==='ENTRY.md'));assert.ok(manifest.files.some(f=>f.path==='deduplication-v45.json'));
 assert.ok(manifest.files.every(f=>!['CORE.md','FULL.md'].includes(f.path)));
 for(const file of manifest.files){
  const bytes=readFileSync(new URL('../'+base+file.path,import.meta.url));
  assert.equal(bytes.length,file.bytes);assert.equal(hash(bytes),file.sha256);
 }
});

test('V4.6 release remains intact with all 36 canonical modules',()=>{
 const base='knowledge/versions/v4.6.0/',manifest=JSON.parse(read(base+'manifest.json'));
 assert.equal(manifest.version,'4.6.0');assert.equal(manifest.baseVersion,'4.5');
 assert.equal(manifest.businessMethodsChanged,false);assert.equal(manifest.editorialDeduplication,false);
 const expected=['ENTRY.md','modules.json','README.md',...moduleCatalog.modules.map(m=>m.path.slice('knowledge/'.length))];
 assert.deepEqual(manifest.files.map(f=>f.path).sort(),expected.sort());
 for(const file of manifest.files){
  const bytes=readFileSync(new URL('../'+base+file.path,import.meta.url));
  assert.equal(bytes.length,file.bytes);assert.equal(hash(bytes),file.sha256);
  if(file.path.startsWith('modules/rules/'))assert.deepEqual(bytes,readFileSync(new URL('../knowledge/'+file.path,import.meta.url)));
 }
});

test('V4.7 release matches the current runtime and preserves every V4.6 business file byte',()=>{
 const base='knowledge/versions/v4.7.0/',manifest=JSON.parse(read(base+'manifest.json'));
 assert.equal(manifest.version,'4.7.0');assert.equal(manifest.baseVersion,'4.6');
 assert.equal(manifest.businessMethodsChanged,false);assert.equal(manifest.editorialDeduplication,false);
 assert.deepEqual(manifest.files.map(f=>f.path).sort(),['ENTRY.md','modules.json','README.md',...moduleCatalog.modules.map(m=>m.path.slice('knowledge/'.length))].sort());
 for(const file of manifest.files){
  const bytes=readFileSync(new URL('../'+base+file.path,import.meta.url));
  assert.equal(bytes.length,file.bytes);assert.equal(hash(bytes),file.sha256);
  if(file.path!=='README.md')assert.deepEqual(bytes,readFileSync(new URL('../knowledge/'+file.path,import.meta.url)));
  if(file.path.startsWith('modules/rules/'))assert.deepEqual(bytes,readFileSync(new URL('../knowledge/versions/v4.6.0/'+file.path,import.meta.url)));
 }
});
