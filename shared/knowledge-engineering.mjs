import {createHash} from 'node:crypto';

const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const uniq=values=>[...new Set(values)];
const asArray=value=>Array.isArray(value)?value:[];

export const KNOWLEDGE_LAYERS=['constitution','ontology','methodology','playbook','contract'];
export const KNOWLEDGE_ROOT_CAUSES=['knowledge','retrieval','tool','model','data','runtime','unknown'];

export function knowledgeInventory(catalog){
 const modules=asArray(catalog?.modules).map(module=>({id:module.id,path:module.path,chapter:module.chapter,sha256:module.sha256,bytes:module.bytes,sections:asArray(module.sections).map(section=>({title:section.title,line:section.line,endLine:section.endLine}))}));
 return {schemaVersion:catalog?.schemaVersion??null,knowledgeVersion:catalog?.knowledgeVersion??null,moduleCount:modules.length,sectionCount:modules.reduce((sum,module)=>sum+module.sections.length,0),modules,ownership:{entry:catalog?.entry??null,catalog:'knowledge/modules.json',activePointer:'knowledge/current.json',snapshots:'server/knowledge-snapshots.mjs',runtime:'server/knowledge.mjs'}};
}

export function validateKnowledgeGovernance(catalog,{at=new Date().toISOString()}={}){
 const governance=catalog?.governance??{},rules=asArray(governance.rules),ontology=asArray(governance.ontology),regressions=asArray(governance.regressions),errors=[],warnings=[];
 const ruleIds=new Set(),termIds=new Set(),regressionIds=new Set(),modules=new Map(asArray(catalog?.modules).map(module=>[module.id,module]));
 if(!/^K\d+\.\d+\.\d+$/.test(catalog?.knowledgeVersion??''))errors.push({code:'invalid_knowledge_version',id:catalog?.knowledgeVersion??null,severity:'critical'});
 if(Object.hasOwn(catalog??{},'version'))errors.push({code:'legacy_version_field',id:catalog.version,severity:'critical'});
 for(const term of ontology){
  if(!term.id||termIds.has(term.id))errors.push({code:'duplicate_ontology_id',id:term.id,severity:'critical'});else termIds.add(term.id);
  const aliases=asArray(term.aliases);if(new Set(aliases.map(alias=>typeof alias==='string'?alias:alias.value)).size!==aliases.length)errors.push({code:'duplicate_alias',id:term.id,severity:'critical'});
  for(const alias of aliases)if(typeof alias==='object'&&!alias.condition)errors.push({code:'ambiguous_alias_without_condition',id:term.id,severity:'critical'});
 }
 for(const regression of regressions){if(!regression.id||regressionIds.has(regression.id))errors.push({code:'duplicate_regression_id',id:regression.id,severity:'critical'});else regressionIds.add(regression.id);}
 for(const rule of rules){
  if(!rule.id||ruleIds.has(rule.id))errors.push({code:'duplicate_rule_id',id:rule.id,severity:'critical'});else ruleIds.add(rule.id);
  const module=modules.get(rule.moduleId);if(!module)errors.push({code:'orphan_rule',id:rule.id,severity:'critical'});
  else if(!asArray(module.sections).some(section=>section.title===rule.section))errors.push({code:'undefined_section',id:rule.id,severity:'critical'});
  if(!rule.scope||!asArray(rule.scope.modes).length)errors.push({code:'missing_scope',id:rule.id,severity:'critical'});
  if(!asArray(rule.tests).length)errors.push({code:'missing_tests',id:rule.id,severity:'critical'});
  for(const ref of asArray(rule.ontologyRefs))if(!termIds.has(ref))errors.push({code:'undefined_ontology',id:rule.id,ref,severity:'critical'});
  if(rule.effectiveTo&&Date.parse(rule.effectiveTo)<Date.parse(at))errors.push({code:'expired_rule',id:rule.id,severity:'critical'});
  if(rule.needsReview)warnings.push({code:'needs_review',id:rule.id,severity:'warning'});
 }
 for(const rule of rules)for(const dependency of asArray(rule.dependsOn))if(!ruleIds.has(dependency))errors.push({code:'undefined_dependency',id:rule.id,ref:dependency,severity:'critical'});
 const visiting=new Set(),visited=new Set(),byId=new Map(rules.map(rule=>[rule.id,rule]));
 function visit(id,path=[]){if(visiting.has(id)){errors.push({code:'dependency_cycle',id,path:[...path,id],severity:'critical'});return;}if(visited.has(id))return;visiting.add(id);for(const next of asArray(byId.get(id)?.dependsOn))visit(next,[...path,id]);visiting.delete(id);visited.add(id);}
 for(const id of ruleIds)visit(id);
 const conflicts=new Map();
 for(const rule of rules)for(const target of asArray(rule.conflictsWith)){const pair=[rule.id,target].sort().join('|');if(!conflicts.has(pair))conflicts.set(pair,[]);conflicts.get(pair).push(rule.id);}
 for(const [pair,owners] of conflicts)if(owners.length>1)errors.push({code:'hard_rule_conflict',id:pair,severity:'critical'});
 for(const id of asArray(governance.constitution))if(!ruleIds.has(id))errors.push({code:'undefined_constitution_rule',id,severity:'critical'});
 for(const rule of rules)for(const testId of asArray(rule.tests))if(!regressionIds.has(testId))errors.push({code:'undefined_regression',id:rule.id,ref:testId,severity:'critical'});
 return {ok:errors.length===0,errors,warnings,summary:{rules:rules.length,ontology:ontology.length,regressions:regressions.length,critical:errors.length}};
}

const applies=(values,value)=>!asArray(values).length||values.includes('*')||values.includes(value);
export function resolveKnowledgePack(catalog,{mode='B',archetype='unknown',claim='general',method='general',at=new Date().toISOString()}={}){
 const governance=catalog?.governance??{},rules=asArray(governance.rules),knownMode=/^[A-F]$/.test(mode);
 const constitution=new Set(asArray(governance.constitution));
 const selected=rules.filter(rule=>{
  if(rule.effectiveFrom&&Date.parse(rule.effectiveFrom)>Date.parse(at)||rule.effectiveTo&&Date.parse(rule.effectiveTo)<Date.parse(at))return false;
  if(constitution.has(rule.id))return true;
  if(!knownMode&&rule.severity==='critical')return true;
  return applies(rule.scope?.modes,mode)&&applies(rule.scope?.archetypes,archetype)&&applies(rule.scope?.claims,claim)&&applies(rule.scope?.methods,method);
 });
 const hardRules=rules.filter(rule=>rule.severity==='critical'&&(knownMode?applies(rule.scope?.modes,mode)&&applies(rule.scope?.archetypes,archetype)&&applies(rule.scope?.claims,claim)&&applies(rule.scope?.methods,method):true));
 for(const rule of hardRules)if(!selected.includes(rule))selected.push(rule);
 const ids=uniq(selected.map(rule=>rule.id));
 return {knowledgeVersion:catalog.knowledgeVersion,input:{mode,archetype,claim,method},fallback:!knownMode||archetype==='unknown',ruleIds:ids,rules:selected,selectionComparison:{selectedRules:ids.length,totalRules:rules.length,criticalRulesIncluded:hardRules.every(rule=>ids.includes(rule.id))}};
}

function sectionText(snapshot,rule){
 const module=snapshot.catalog.modules.find(item=>item.id===rule.moduleId),section=module?.sections.find(item=>item.title===rule.section);
 if(!module||!section)throw new Error('知识规则引用不存在：'+rule.id);
 return snapshot.read(module.path).split(/\r?\n/).slice(section.index,section.endLine).join('\n');
}
export function compileKnowledgeContext(snapshot,input={}){
 const pack=resolveKnowledgePack(snapshot.catalog,input),seen=new Set(),blocks=[];
 for(const layer of KNOWLEDGE_LAYERS){
  if(layer==='ontology'){
   const refs=uniq(pack.rules.flatMap(rule=>asArray(rule.ontologyRefs))),terms=asArray(snapshot.catalog.governance?.ontology).filter(term=>refs.includes(term.id));
   if(terms.length)blocks.push({layer,id:'ontology',content:terms.map(term=>`${term.id}: ${term.label}`).join('\n')});
   continue;
  }
  for(const rule of pack.rules.filter(rule=>rule.layer===layer))if(!seen.has(rule.id)){seen.add(rule.id);blocks.push({layer,id:rule.id,content:sectionText(snapshot,rule)});}
 }
 const payload={knowledgeVersion:pack.knowledgeVersion,ruleIds:[...seen],blocks};
 return {...payload,context:blocks.map(block=>`[${block.id}]\n${block.content}`).join('\n\n'),fingerprint:hash(payload),characters:blocks.reduce((sum,block)=>sum+block.content.length,0)};
}

export function resolveOntology(catalog,type,value,{condition}={}){
 const normalized=String(value??'').normalize('NFKC').trim().toLowerCase(),matches=[];
 for(const term of asArray(catalog?.governance?.ontology).filter(term=>term.type===type)){
  if(term.id.toLowerCase()===normalized||term.label.toLowerCase()===normalized)matches.push(term.id);
  for(const alias of asArray(term.aliases))if((typeof alias==='string'?alias:alias.value).normalize('NFKC').trim().toLowerCase()===normalized&&(typeof alias==='string'||alias.condition===condition))matches.push(term.id);
 }
 return uniq(matches).length===1?uniq(matches)[0]:null;
}

export function createKnowledgePin(snapshot){
 const knowledgeVersion=snapshot.catalog?.knowledgeVersion,governance=snapshot.catalog?.governance;
 if(!/^K\d+\.\d+\.\d+$/.test(knowledgeVersion??'')||!governance)throw new Error('任务必须绑定已治理的 K-Series Knowledge 快照');
 return {knowledgeVersion,knowledgeFingerprint:hash({knowledgeVersion,governance})};
}

export function validateKnowledgeChangeProposal(value){
 if(!value||value.schemaVersion!==1||!value.id||!KNOWLEDGE_ROOT_CAUSES.includes(value.rootCause)||!value.source||!value.proposedChange||!value.risk||!asArray(value.affectedRules).length||!asArray(value.positiveTests).length||!asArray(value.negativeTests).length)throw new Error('KCP 必须包含来源、根因、受影响规则、变更、风险以及正反回归');
 if(value.rootCause!=='knowledge')throw new Error('根因不是 Knowledge；请在对应 Retrieval/Tool/Model/Data/Runtime 所有者修复');
 return structuredClone(value);
}
export function transitionKnowledgeDebt(debt,status,{at=new Date().toISOString(),reason}={}){
 const allowed={open:['accepted','rejected'],accepted:['resolved'],rejected:[],resolved:[]};
 if(!allowed[debt?.status]?.includes(status))throw new Error('Knowledge Debt 状态转换无效');
 return {...structuredClone(debt),status,updatedAt:at,history:[...asArray(debt.history),{from:debt.status,to:status,at,...(reason?{reason}:{})}]};
}

export function validateRuntimeKnowledge(catalog,input={}){
 const checks=[['period','period'],['currency','currency'],['shareBasis','share-basis'],['accountingScope','accounting-scope'],['valuationBasis','valuation-basis']].map(([field,type])=>({field,value:input[field]??null,canonicalId:input[field]==null?null:resolveOntology(catalog,type,input[field],{condition:input.aliasCondition})}));
 return {ok:checks.every(check=>check.value==null||check.canonicalId),checks,issues:checks.filter(check=>check.value!=null&&!check.canonicalId).map(check=>({code:'invalid_'+check.field,field:check.field,value:check.value}))};
}

export function knowledgeImpact(catalog,ruleIds,{at=new Date().toISOString()}={}){
 const selected=asArray(catalog?.governance?.rules).filter(rule=>ruleIds.includes(rule.id)),active=selected.filter(rule=>!(rule.effectiveFrom&&Date.parse(rule.effectiveFrom)>Date.parse(at)||rule.effectiveTo&&Date.parse(rule.effectiveTo)<Date.parse(at)));
 return {knowledgeVersion:catalog.knowledgeVersion,ruleIds:selected.map(rule=>rule.id),inactiveRuleIds:selected.filter(rule=>!active.includes(rule)).map(rule=>rule.id),modes:uniq(active.flatMap(rule=>asArray(rule.impact?.modes))),archetypes:uniq(active.flatMap(rule=>asArray(rule.impact?.archetypes))),claims:uniq(active.flatMap(rule=>asArray(rule.impact?.claims))),benchmarks:uniq(active.flatMap(rule=>asArray(rule.impact?.benchmarks))),tests:uniq(active.flatMap(rule=>asArray(rule.tests))),needsReview:active.filter(rule=>rule.needsReview).map(rule=>rule.id)};
}

export function assertPublishableKnowledge(catalog,options){const result=validateKnowledgeGovernance(catalog,options);if(!result.ok)throw Object.assign(new Error('Knowledge linter 阻止发布：'+result.errors.map(item=>item.code+':'+item.id).join(', ')),{result});return result;}
