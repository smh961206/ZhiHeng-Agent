import {frameworkVersion} from './research-framework.mjs';

export const knowledgeBenefits=[
 {title:'研究按问题展开',description:'简明、标准与完整展开各有侧重，详细规则在需要时补充。'},
 {title:'同一任务，依据一致',description:'新研究采用已校验的更新，进行中的研究和续跑保留创建时的规则。'},
 {title:'实际使用可以回查',description:'在详情查看用到了哪些规则、为何读取；旧报告保留当时的记录。'},
];
export const depthGuidance={
 Quick:'先看核心业务、财务质量与估值快照；详细计算和评分按任务需要补读。',
 Standard:'覆盖业务、财务、股东回报与估值判断；使用 DCF 时再补读详细协议。',
 Deep:'完整展开估值、三情景、敏感性与研究评分；资料不足时仍保留缺口。',
};
export function knowledgeAvailability(config){
 if(!config||config.connectionState==='loading')return {kind:'loading',title:'正在核对研究服务',description:'核对完成后显示当前可用规则。',blocking:true};
 if(config.connectionState==='error')return {kind:'offline',title:'暂未确认服务状态',description:'输入已保留，请重新检查连接后开始。',blocking:true};
 if(config.knowledgeVersion&&config.knowledgeVersion!==frameworkVersion)return {kind:'incompatible',title:'页面与服务版本不一致',description:'请刷新页面以使用匹配的研究设置；当前输入会保留。',blocking:true};
 if(config.configured===false)return {kind:'unconfigured',title:'研究服务尚未就绪',description:'研究服务尚未配置，请完成模型连接后再开始。',blocking:true};
 if(config.knowledgeStatus?.updatePending)return {kind:'pending',title:'继续使用已校验规则',description:'新的修订尚未通过校验，本次仍可使用最近一份有效规则。',blocking:false};
 return {kind:'ready',title:config.knowledgeVersion?'当前可用规则 · V'+config.knowledgeVersion:'研究服务已连接',description:'创建时确认并固定研究依据，后续更新不会改变本次任务。',blocking:false};
}
export function ruleUsage(job={}){
 const framework=job.result?.framework;
 const snapshot=framework?.snapshot??job.plan?.knowledgeSnapshot;
 const version=framework?.version??job.plan?.version??snapshot?.version;
 const usage=framework?.usage??job.knowledgeUsage;
 const recorded=Array.isArray(usage?.records)&&(!snapshot||usage.snapshotId===snapshot.id);
 const events=(job.events??[]).flatMap(event=>event.type==='knowledge_read'&&event.ruleRead?[event.ruleRead]:[]);
 const rows=recorded?usage.records:events;
 const unique=new Map();
 for(const row of rows){
  if(row.kind!=='context'||row.moduleId==='entry'||snapshot&&row.snapshotId!==snapshot.id)continue;
  const key=row.key??JSON.stringify([row.path,row.line,row.endLine,row.reason,row.contentSha256]);
  if(!unique.has(key))unique.set(key,row);
 }
 const records=[...unique.values()],modules=new Set(records.map(row=>row.path));
 return {version,snapshot,recorded:recorded||records.length>0,records,moduleCount:modules.size,sectionCount:records.length};
}
export function mergeRuleRead(job,event){
 const row=event?.ruleRead,snapshot=job.plan?.knowledgeSnapshot;
 if(event?.type!=='knowledge_read'||!row?.key||!snapshot||row.snapshotId!==snapshot.id)return job;
 const usage=job.knowledgeUsage?.snapshotId===snapshot.id?job.knowledgeUsage:{snapshotId:snapshot.id,records:[]};
 if(usage.records.some(item=>item.key===row.key))return job;
 return {...job,knowledgeUsage:{...usage,records:[...usage.records,row]}};
}
