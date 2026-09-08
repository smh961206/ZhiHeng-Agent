// Reviewed CORE -> canonical rule migration. Immutable V4.4 is the baseline.
import {readFileSync,writeFileSync,mkdirSync,existsSync,unlinkSync,rmdirSync} from 'node:fs';
import {join,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {backupKnowledge} from './backup-knowledge.mjs';
import {indexRules} from '../shared/knowledge-index.mjs';
import {bodyFilter} from '../shared/knowledge-search.mjs';

const root=fileURLToPath(new URL('../',import.meta.url)),knowledge=join(root,'knowledge');
const read=path=>readFileSync(join(root,path),'utf8');
const hash=text=>createHash('sha256').update(text).digest('hex');
const prior=JSON.parse(read('knowledge/modules.json'));
if(prior.version!=='4.4'||existsSync(join(knowledge,'ENTRY.md')))throw new Error('仅迁移尚未去重的 V4.4，不覆盖已有版本');
const backup=backupKnowledge(root);
for(const module of prior.modules){
 const archived=read('knowledge/versions/v4.4.0/'+module.path.slice('knowledge/'.length));
 if(hash(read(module.path))!==module.sha256||read(module.path)!==archived)throw new Error('当前规则与 V4.4 快照不一致：'+module.path);
}
const changes=[];
const coreToRules={0:[0],1:[1,15],2:[3],3:[4],4:[5],5:[6],6:[7],7:[8],8:[9],9:[10,11],10:[12],11:[13,14],12:[15],13:[16],14:[17],15:[18],16:[]};
const catalog={schemaVersion:2,version:'4.5',updatedAt:'2026-09-08',entry:'knowledge/ENTRY.md',baseVersion:'4.4',modules:[]};
const names={};
let originalLine=1;
for(const old of prior.modules.filter(m=>m.source==='full'&&m.chapter<20)){
 let text=read(old.path).replaceAll('\r\n','\n'),filename=old.path.split('/').at(-1);
 if(old.chapter===1){
  const mode=old.title.match(/MODE ([A-F])/);
  filename=mode?`01-mode-${mode[1].toLowerCase()}.md`:old.title.includes('第一原则')?'01-routing-principles.md':old.title.includes('联动')?'01-routing-links.md':'01-router.md';
 }
 if(old.chapter===15){
  const schema=old.title.match(/(Quick|Standard|Deep|Update|Comparison|Dividend)/)?.[1]?.toLowerCase();
  filename=schema?`15-output-${schema}.md`:old.title.includes('Battle Map')?'15-output-battle-map.md':'15-output.md';
 }
 const edit=(before,after,origin,reason)=>{
  before=before.replaceAll('\r\n','\n');after=after.replaceAll('\r\n','\n');
  if(!text.includes(before))throw new Error(filename+' 未找到迁移位置：'+before);
  text=text.replace(before,after);changes.push({target:'knowledge/modules/rules/'+filename,origin,before,after,reason});
 };
 if(old.chapter===0){
  edit(text.slice(0,text.indexOf('## 0. 核心定位')),'# 价值投资研究：定位与核心原则\r\n\r\n','FULL 元数据','版本元数据集中到唯一入口，不重复维护版本标题');
  const start=text.indexOf('### V4.3 执行范围');
  edit(text.slice(start),'','FULL V4.3 执行范围','旧版变更叙述保留于 V4.4 归档；执行规则仍由专项承载');
 }
 if(filename==='01-mode-a.md')edit('- 强制跑 8 年股息模块','- 强制跑 8 年股息模块\r\n\r\nA/H与ADR价格、币种、股类和股本分别核对。核心行情与财报走固定接口，只有证据缺口才联网，参考案例中的数字与判断不能替代本次取证。','CORE MODE A','保留跨市场股类核验和固定接口、证据缺口、参考案例边界');
 if(filename==='01-mode-b.md')edit('维护性和成长性Capex难以拆分时，以显式假设做现金流敏感性。','维护性和成长性Capex难以拆分时，以显式假设做现金流敏感性，不输出伪精确DCF。','CORE MODE B','保留资本开支无法拆分时的估值精度约束');
 if(filename==='01-mode-d.md')edit('当前增长与长期潜力、毛利率水平与趋势、现金流与营运资金来源分别解释。','当前增长与长期潜力、毛利率水平与趋势、现金流与营运资金来源分别解释。现金流高于利润不能单独证明质量，亏损时现金利润比不作排名。','CORE MODE D','保留亏损与现金利润比的比较限制');
 if(old.chapter===3)edit('Accounting Basis =','Accounting Basis =\r\nValue Basis = Enterprise Value / Equity Value','CORE 2.3','保留企业价值与股权价值的口径锁定');
 if(old.chapter===4)edit('- 固定资产与在建工程','- 固定资产与在建工程\r\n- 供应链依赖','CORE 3.4','保留制造端供应链依赖检查');
 if(old.chapter===5)edit('- 一次性重组','- 一次性项目（包括重组）','CORE 4.5','保留 ROIC 对一次性项目的一致调整范围');
 if(old.chapter===6)edit('| 注销式回购 | 注销股份 | 直接减少股本，可能增厚每股价值 |','| 注销式回购 | 注销股份 | 直接减少股本，可能增厚每股价值；计入股东现金回报时需看价格与实际注销 |','CORE 5.2','保留回购价格与实际注销的验证要求');
 if(old.chapter===7)edit('禁止为了得到想要的目标价任意调低折现率。','禁止为了得到想要的目标价任意调整折现率。','CORE 6.2','保留不得为目标价任意调整折现率的双向约束');
 if(old.chapter===8)edit('| 数据不足 | 置信度 | 暂不买入 |','| 数据不足 | 置信度 | 暂不买入 |\r\n| 组合集中 | Portfolio Action | 无 |','CORE 7','保留组合集中风险的主要处理位置');
 if(old.chapter===9)edit('四层一致，才进入高确信度估值。','四层一致，才进入高确信度估值。\r\n\r\n重大矛盾无法解释：降低估值、置信度或直接淘汰。','CORE 8.1','保留证据链重大矛盾的处理动作');
 if(old.chapter===10)edit('风险越低得分越高。','风险越低得分越高。\r\n\r\n考察周期、政策、技术、债务、客户集中、治理、估值不确定性。','CORE 9.1 风险10','保留风险评分的具体维度');
 if(old.chapter===16)edit('## 16.5 Valuation Audit\r\n\r\n','## 16.5 Valuation Audit\r\n\r\n- [ ] 模型与商业模式匹配\r\n','CORE Valuation Audit','保留审计阶段模型适配的显式检查');
 const path='knowledge/modules/rules/'+filename,id=filename.slice(0,-3);
 if(names[id])throw new Error('重复模块名');names[id]=true;
 mkdirSync(join(knowledge,'modules/rules'),{recursive:true});
 if(existsSync(join(root,path))&&read(path).replaceAll('\r\n','\n')!==text)throw new Error('未完成迁移文件存在不同内容：'+path);
 writeFileSync(join(root,path),text);
 catalog.modules.push({id,source:'rules',chapter:old.chapter,title:old.chapter===0?'定位与核心原则':old.title,path,bytes:Buffer.byteLength(text),sha256:hash(text),originalLine,
  origin:{path:'knowledge/versions/v4.4.0/'+old.path.slice('knowledge/'.length),sha256:old.sha256},
  sections:indexRules(text,path).map(({content,source,...section})=>section),bodyFilter:bodyFilter(text)});
 originalLine+=(text.match(/\n/g)||[]).length;
}
const entry=`---\nname: value-investment-research\nmetadata:\n  version: "4.5"\n  last_updated: "2026-09-08"\n---\n\n# 价值投资研究执行入口\n\n业务规则的唯一正文位于 modules/rules/，文件、章节和校验值以 modules.json 为准。\n\n执行当前计划的主模式，读取通用原则、对应路由和所需专项；输出模板按本次交付类型选择。需要详细协议时通过 read_rules 按标题或关键词读取原文。进入复核阶段再读取审计专项。\n\n入口只负责加载，不另写公式、评分或判断条件。模式、辅助模块和输出深度沿用当前计划；详细规则未读取时不得声称已经执行。组合约束、股东回报、执行复盘及作战图按任务触发。\n\n规则有变更时更新目录和校验，重启后端生效。历史版本供追溯，不作为当前规则加载来源。\n`;
writeFileSync(join(knowledge,'ENTRY.md'),entry,{flag:'wx'});
writeFileSync(join(knowledge,'modules.json'),JSON.stringify(catalog,null,2)+'\n');
const mapping={version:'4.5',baseVersion:'4.4',backupId:backup.id,policy:'保留 FULL 详细规则；CORE 同义缩写以映射引用归并；独有约束逐项迁入专项；历史说明仅归档。',changes,
 coreModules:prior.modules.filter(m=>m.source==='core').map(m=>({path:'knowledge/versions/v4.4.0/'+m.path.slice('knowledge/'.length),sha256:m.sha256,title:m.title,
 targets:catalog.modules.filter(n=>coreToRules[m.chapter].includes(n.chapter)).map(n=>n.path),disposition:m.chapter===16?'历史说明保留归档':'同义规则归并；独有约束见 changes'}))};
writeFileSync(join(knowledge,'deduplication-v45.json'),JSON.stringify(mapping,null,2)+'\n',{flag:'wx'});
// Delete only the exact runtime files that were verified against the archive.
// No archive, user file, or computed directory tree is recursively removed.
for(const module of prior.modules){
 const target=resolve(root,module.path),allowed=resolve(knowledge,'modules')+sep;
 if(!target.startsWith(allowed)||!/^knowledge\/modules\/(core|full)\/[a-z0-9-]+\.md$/.test(module.path))throw new Error('清理路径超出旧运行模块');
 if(hash(read(module.path))!==module.sha256)throw new Error('旧模块已变化，停止清理');
 unlinkSync(target);
}
for(const filename of ['CORE.md','FULL.md']){
 const target=join(knowledge,filename);
 if(!readFileSync(target).equals(readFileSync(join(root,'knowledge/versions/v4.4.0',filename))))throw new Error('旧入口已变化，停止清理');
 unlinkSync(target);
}
for(const dirname of ['core','full'])rmdirSync(join(knowledge,'modules',dirname));
backupKnowledge(root);
console.log(`V4.5：${catalog.modules.length} 个唯一正文模块，${changes.length} 项有记录的迁移，旧版完整保留。`);
