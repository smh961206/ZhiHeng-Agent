import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {snapshotManager} from '../server/knowledge-snapshots.mjs';
import {assertPublishableKnowledge,compileKnowledgeContext,createKnowledgePin,knowledgeImpact,knowledgeInventory,resolveKnowledgePack,resolveOntology,transitionKnowledgeDebt,validateKnowledgeChangeProposal,validateKnowledgeGovernance,validateRuntimeKnowledge} from '../shared/knowledge-engineering.mjs';

const catalog=JSON.parse(readFileSync(new URL('../knowledge/modules.json',import.meta.url),'utf8'));
const clone=()=>structuredClone(catalog);

test('V5.3.0 inventory maps every current module, section, hash and owner without changing legacy files',()=>{
 const inventory=knowledgeInventory(catalog);assert.equal(inventory.moduleCount,catalog.modules.length);assert.equal(inventory.sectionCount,catalog.modules.flatMap(module=>module.sections).length);
 assert.ok(inventory.modules.every(module=>/^[a-f0-9]{64}$/.test(module.sha256)&&module.sections.length));assert.equal(inventory.ownership.runtime,'server/knowledge.mjs');
});
test('V5.3.1 rule foundation has 20-50 stable unique IDs, metadata, tests and valid legacy section mappings',()=>{
 const rules=catalog.governance.rules;assert.ok(rules.length>=20&&rules.length<=50);assert.equal(new Set(rules.map(rule=>rule.id)).size,rules.length);assert.ok(rules.every(rule=>rule.scope&&rule.severity&&rule.rationale&&rule.tests.length));assertPublishableKnowledge(catalog);
});
test('V5.3.2 constitution is short, ordered, stable and loaded across all six modes',()=>{
 assert.ok(catalog.governance.constitution.length<=10);for(const mode of ['A','B','C','D','E','F']){const pack=resolveKnowledgePack(catalog,{mode,archetype:'general'});assert.deepEqual(pack.ruleIds.slice(0,catalog.governance.constitution.length),catalog.governance.constitution);}
});
test('V5.3.3 ontology resolves periods, cash flows and valuation bases but refuses ambiguous aliases',()=>{
 for(const value of ['FY','TTM','YTD','Instant'])assert.ok(resolveOntology(catalog,'period',value));assert.equal(resolveOntology(catalog,'metric','FCFF'),'ONT-METRIC-FCFF');assert.equal(resolveOntology(catalog,'metric','FCFE'),'ONT-METRIC-FCFE');assert.equal(resolveOntology(catalog,'valuation-basis','EV'),'ONT-VAL-EV');assert.equal(resolveOntology(catalog,'valuation-basis','Equity Value'),'ONT-VAL-EQUITY');assert.equal(resolveOntology(catalog,'currency','元'),null);assert.equal(resolveOntology(catalog,'currency','元',{condition:'CNY'}),'ONT-CURRENCY-CNY');
});
test('V5.3.4 resolver covers A-F, safely falls back, and avoids bank/commodity false triggers',()=>{
 for(const mode of ['A','B','C','D','E','F'])assert.equal(resolveKnowledgePack(catalog,{mode,archetype:'general'}).selectionComparison.criticalRulesIncluded,true);
 assert.equal(resolveKnowledgePack(catalog,{mode:'?',archetype:'unknown'}).fallback,true);assert.ok(resolveKnowledgePack(catalog,{mode:'B',archetype:'bank',claim:'cash-flow'}).ruleIds.includes('KNW-FCF-002'));assert.ok(!resolveKnowledgePack(catalog,{mode:'B',archetype:'commodity',claim:'normalization'}).ruleIds.includes('KNW-FCF-002'));assert.ok(resolveKnowledgePack(catalog,{mode:'B',archetype:'commodity',claim:'normalization'}).ruleIds.includes('KNW-NRM-001'));
});
test('V5.3.5 compiler is deterministic, ordered, deduplicated and bound to one snapshot',()=>{
 const snapshot=snapshotManager.current(),one=compileKnowledgeContext(snapshot,{mode:'B',archetype:'bank',claim:'cash-flow'}),two=compileKnowledgeContext(snapshot,{mode:'B',archetype:'bank',claim:'cash-flow'});assert.equal(one.fingerprint,two.fingerprint);assert.deepEqual(one.ruleIds,two.ruleIds);assert.equal(new Set(one.ruleIds).size,one.ruleIds.length);assert.deepEqual([...new Set(one.blocks.map(block=>block.layer))].filter(layer=>layer!=='ontology'),['constitution','methodology','contract']);assert.ok(one.characters<50000);
});
test('V5.3.6 linter rejects duplicates, undefined refs, conflicts, cycles, orphans, missing scope/tests and expiry',()=>{
 const cases=[];
 let value=clone();value.governance.rules.push(structuredClone(value.governance.rules[0]));cases.push('duplicate_rule_id');
 value=clone();value.governance.rules[0].ontologyRefs=['missing'];cases.push('undefined_ontology');
 value=clone();value.governance.rules[0].moduleId='missing';cases.push('orphan_rule');
 value=clone();delete value.governance.rules[0].scope;cases.push('missing_scope');
 value=clone();value.governance.rules[0].tests=[];cases.push('missing_tests');
 value=clone();value.governance.rules[0].dependsOn=['KNW-EVD-002'];value.governance.rules[1].dependsOn=['KNW-EVD-001'];cases.push('dependency_cycle');
 value=clone();value.governance.rules[0].effectiveTo='2020-01-01';cases.push('expired_rule');
 for(let i=0;i<cases.length;i++){value=clone();if(i===0)value.governance.rules.push(structuredClone(value.governance.rules[0]));if(i===1)value.governance.rules[0].ontologyRefs=['missing'];if(i===2)value.governance.rules[0].moduleId='missing';if(i===3)delete value.governance.rules[0].scope;if(i===4)value.governance.rules[0].tests=[];if(i===5){value.governance.rules[0].dependsOn=['KNW-EVD-002'];value.governance.rules[1].dependsOn=['KNW-EVD-001'];}if(i===6)value.governance.rules[0].effectiveTo='2020-01-01';assert.ok(validateKnowledgeGovernance(value).errors.some(error=>error.code===cases[i]),cases[i]);assert.throws(()=>assertPublishableKnowledge(value));}
});
test('V5.3.7 every critical rule owns regression evidence and frozen behaviors preserve missing data',()=>{
 const ids=new Set(catalog.governance.regressions.map(item=>item.id));for(const rule of catalog.governance.rules.filter(item=>item.severity==='critical'))assert.ok(rule.tests.every(id=>ids.has(id)));assert.match(catalog.governance.regressions.find(item=>item.id==='KRG-MISSING').negative,/does not infer missing facts/);
});
test('V5.3.8 K-Series pin is stable and catalogs without K-Series governance are rejected',()=>{
 const snapshot=snapshotManager.current(),pin=createKnowledgePin(snapshot);assert.equal(pin.knowledgeVersion,'K1.0.0');assert.match(pin.knowledgeFingerprint,/^[a-f0-9]{64}$/);const legacy=clone();delete legacy.knowledgeVersion;delete legacy.governance;assert.throws(()=>createKnowledgePin({ref:{id:'a'.repeat(64)},catalog:legacy}),/K-Series/);
});
test('V5.3.9 KCP requires Knowledge root cause and debt lifecycle is explicit',()=>{
 const proposal={schemaVersion:1,id:'KCP-1',source:'benchmark',rootCause:'knowledge',affectedRules:['KNW-MIS-001'],proposedChange:'clarify existing missing-data language',risk:'false trigger',positiveTests:['KRG-MISSING'],negativeTests:['KRG-EVIDENCE']};assert.equal(validateKnowledgeChangeProposal(proposal).id,'KCP-1');assert.throws(()=>validateKnowledgeChangeProposal({...proposal,rootCause:'retrieval'}),/Retrieval/);const accepted=transitionKnowledgeDebt({id:'KD-1',status:'open'},'accepted');assert.equal(transitionKnowledgeDebt(accepted,'resolved').status,'resolved');assert.throws(()=>transitionKnowledgeDebt({id:'KD-1',status:'resolved'},'open'));
});
test('V5.3.10 prompt/runtime bindings agree on explicit period, currency, share, scope and valuation basis',()=>{
 assert.equal(validateRuntimeKnowledge(catalog,{period:'FY',currency:'USD',shareBasis:'diluted shares',accountingScope:'归母',aliasCondition:'parent-attributable',valuationBasis:'EV'}).ok,true);assert.deepEqual(validateRuntimeKnowledge(catalog,{period:'FY/TTM',currency:'元',valuationBasis:'EV/Equity'}).issues.map(item=>item.field),['period','currency','valuationBasis']);
});
test('V5.3.11 impact analysis lists tests and refuses silent activation of expired rules',()=>{
 const impact=knowledgeImpact(catalog,['KNW-FCF-002']);assert.ok(impact.modes.includes('B'));assert.ok(impact.archetypes.includes('bank'));assert.ok(impact.benchmarks.includes('V53-KNOWLEDGE'));const old=clone();old.governance.rules.find(rule=>rule.id==='KNW-FCF-002').effectiveTo='2020-01-01';assert.deepEqual(knowledgeImpact(old,['KNW-FCF-002']).inactiveRuleIds,['KNW-FCF-002']);
});
