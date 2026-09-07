import test from 'node:test';
import assert from 'node:assert/strict';
import {textQuality,rowBlocks,usableEvidenceBlock} from '../server/document-layout.mjs';
import {searchEvidence} from '../server/evidence-search.mjs';
import {calculationBasis} from '../server/calculations.mjs';
import {calculationRecovery} from '../server/calculation-recovery.mjs';
import {quickScreenMetrics} from '../server/quick-screen.mjs';

test('isolated damaged digits are not diluted by long readable financial text',()=>{
 const text='合成财务报表，单位人民币元。'.repeat(30)+'营业收入 12�345.67';
 const quality=textQuality(text);assert.equal(quality.status,'readable');assert.equal(quality.suspiciousCharacters,1);assert.equal(quality.needsReview,true);
 const documentBlocks=rowBlocks([{text}],{page:2,quality});
 const source={id:'S1',type:'official-report',official:true,text,documentBlocks};
 assert.equal(usableEvidenceBlock(source,documentBlocks[0]),false);
 assert.throws(()=>calculationBasis({currency:'CNY',period:'2025 FY',shareBasis:'普通股',assumptions:'测试',sourceIds:['S1'],evidenceBlocks:[{sourceId:'S1',blockId:'p2-b1'}]},[source]),/核对|OCR|证据/);
 const cleanText='合成财务报表，单位人民币元。'.repeat(10);
 assert.equal(usableEvidenceBlock(source,rowBlocks([{text:cleanText}],{page:1,quality:textQuality(cleanText)})[0]),true);
});

const basis={currency:'CNY',period:'2025 FY',shareBasis:'普通股一致口径',assumptions:'合成测试参数',sourceIds:['S1','S2']};
const official={id:'S1',type:'official-report',official:true,text:'合成官方财务正文：营业收入、股息及普通股权益，单位为人民币元。'.repeat(3),documentBlocks:[{id:'p10-b1',method:'native',text:'股息及普通股权益，单位为人民币元。',needsReview:false}],qualitySummary:{ocrPages:1}};

test('calculation references resolve every block ID emitted by retrieval',()=>{
 const variants=[
  {id:'S2',type:'quote',currency:'CNY',text:'合成股票价格及普通股权益，单位人民币元'},
  {id:'S2',type:'vendor-financials',text:'合成表格\n'+JSON.stringify({rows:[{metric:'普通股权益',value:100}]})},
  {id:'S2',type:'official-xbrl',official:true,factsCount:1,text:'官方普通股权益',financialFacts:[{label:'普通股权益',value:100,needsReview:false}]},
 ];
 for(const source of variants){
  const match=searchEvidence([source],'普通股权益','S2')[0];assert.ok(match);
  const evidenceBlocks=[{sourceId:'S1',blockId:'p10-b1'},{sourceId:'S2',blockId:match.blockId}];
  assert.deepEqual(calculationBasis({...basis,evidenceBlocks},[official,source]).evidenceBlocks,evidenceBlocks);
 }
 assert.throws(()=>calculationBasis({...basis,evidenceBlocks:[{sourceId:'S2',blockId:'invented'}]},[official,variants[0]]),/不存在/);
});

test('a valid native reference cannot conceal an explicitly cited OCR or unreviewed block',()=>{
 const source={...official,documentBlocks:[...official.documentBlocks,{id:'p1-b1',method:'ocr',needsReview:true,text:'识别数字123'}]};
 assert.throws(()=>calculationBasis({...basis,sourceIds:['S1'],evidenceBlocks:[{sourceId:'S1',blockId:'p10-b1'},{sourceId:'S1',blockId:'p1-b1'}]},[source]),/OCR/);
});

test('TOC leaders and known checkbox glyphs do not trigger whole-page garbling or OCR',()=>{
 const toc='年度报告目录\n'+['主要财务指标','管理层讨论与分析','公司治理','环境和社会责任','重要事项','股份变动及股东情况','财务报告'].map((title,index)=>title+'.'.repeat(100)+(index+1)).join('\n');
 assert.equal(textQuality(toc).status,'readable');
 const body='公司报告期未出售重大资产。出售重大股权情况，适用与不适用选项及原文说明。\n□适用\uF052不适用';
 const quality=textQuality(body);assert.equal(quality.status,'readable');assert.equal(quality.needsReview,false);assert.equal(quality.symbolReview,true);
 const blocks=rowBlocks([{text:body}],{page:3,quality});assert.equal(blocks[0].symbolReview,true);assert.ok(blocks[0].text.includes('\uF052'));
 assert.equal(usableEvidenceBlock(official,blocks[0]),false,'Ambiguous checked states still require original-page verification');
 assert.equal(textQuality('�'.repeat(100)).status,'garbled');assert.equal(textQuality('\uE123'.repeat(100)).status,'garbled');
});

test('complete native blocks survive a missing later page; damaged blocks remain excluded',()=>{
 const source={...official,truncated:true,qualitySummary:{ocrPages:1,unreadPages:1},documentBlocks:[{id:'p10-b1',method:'native',needsReview:false,text:official.text}]};
 const match=searchEvidence([source],'普通股权益','S1')[0];
 assert.equal(match.truncated,false);assert.equal(match.sourceTruncated,true);assert.equal(usableEvidenceBlock(source,match),true);
 assert.equal(usableEvidenceBlock(source,{...match,truncated:true}),false);
 assert.equal(usableEvidenceBlock(source,{...match,method:'ocr'}),false);
});

test('first-quarter cumulative figures can derive Q2 without treating half-year figures as a quarter',()=>{
 const q1={start:'2026-01-01',end:'2026-03-31',kind:'cumulative',sourceIds:['S1'],revenue:100,netIncome:10,roe:.1};
 const h1={...q1,end:'2026-06-30',revenue:250,netIncome:25,roe:.2};
 const args={sector:'non-financial',amountUnit:'人民币元',roeBasis:'加权平均归母ROE，小数',basis:{...basis,sourceIds:['S1']},periods:[q1,h1],balances:[]};
 const result=quickScreenMetrics(args);assert.equal(result.derivedQuarters[0].revenue,150);assert.equal(result.derivedQuarters[0].start,'2026-04-01');assert.equal(result.derivedQuarters[0].roe,undefined);
 assert.throws(()=>quickScreenMetrics({...args,periods:[{...h1,kind:'quarter'}]}),/期间长度/);
 assert.throws(()=>quickScreenMetrics({...args,periods:[{...q1,end:'2026-01-31'}]}),/期间长度/);
});

test('calculation recovery uses only already retrieved safe blocks and never injects evidence',()=>{
 const matches=searchEvidence([official],'普通股权益','S1');
 const error={code:'calculation_evidence',sourceIds:['S1']};
 const recovery=calculationRecovery(error,[official],matches);
 assert.deepEqual(recovery.candidates.map(c=>c.blockId),['p10-b1']);assert.match(recovery.instruction,/不代表支持当前参数/);
 assert.deepEqual(calculationRecovery(error,[official],[]).candidates,[]);
 assert.deepEqual(calculationRecovery(error,[official],matches.map(m=>({...m,method:'ocr'}))).candidates,[]);
});

test('calculation recovery resolves retrieved blocks against the current source contents and quality',()=>{
 const matches=searchEvidence([official],'普通股权益','S1'),error={code:'calculation_evidence',sourceIds:['S1']};
 for(const source of [
  {...official,documentBlocks:[]},
  {...official,documentBlocks:official.documentBlocks.map(b=>({...b,text:'已更新的另一报告期普通股权益'}))},
  {...official,documentBlocks:official.documentBlocks.map(b=>({...b,method:'ocr'}))},
  {...official,documentBlocks:official.documentBlocks.map(b=>({...b,needsReview:true}))},
  {...official,documentBlocks:[...official.documentBlocks,...official.documentBlocks]},
 ])assert.deepEqual(calculationRecovery(error,[source],matches).candidates,[]);
 assert.deepEqual(calculationRecovery(error,[official,official],matches).candidates,[]);
 assert.equal(calculationRecovery(error,[structuredClone(official)],matches).candidates.length,1);
});
