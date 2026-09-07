import test from 'node:test';
import assert from 'node:assert/strict';
import {evidenceBlocks,searchEvidence} from '../server/evidence-search.mjs';
import {calculationBasis} from '../server/calculations.mjs';

const source={id:'S1',type:'official-report',official:true,security:'CN:000001',text:'合成PDF正文',qualitySummary:{ocrPages:1},documentBlocks:[
 {id:'p2-b1',page:2,text:'营业收入及现金流量：合成数值。',method:'ocr',needsReview:true},
 {id:'p34-b1',page:34,text:'现金流量表，单位人民币元：2026年合成经营现金流。',method:'native',needsReview:false},
]};
const basis={currency:'CNY',period:'2026',shareBasis:'普通股',assumptions:'合成测试，核对页码与期间',sourceIds:['S1']};

test('explicit PDF page retrieval uses metadata rather than numbers printed in the text',()=>{
 for(const query of ['第34页','PDF第34页','PDF 第 34 页','page 34','第34页 现金流']){
  const matches=searchEvidence([source],query,'S1');assert.equal(matches.length,1,query);assert.equal(matches[0].blockId,'p34-b1');assert.equal(matches[0].page,34);
 }
 assert.deepEqual(searchEvidence([source],'第34页 营业收入','S1'),[]);
 assert.deepEqual(searchEvidence([source],'第35页','S1'),[]);assert.deepEqual(searchEvidence([source],'第0页','S1'),[]);
 assert.deepEqual(searchEvidence([source],'第34页','S2'),[]);
 assert.ok(searchEvidence([source],'2026年现金流','S1').some(match=>match.page===34));
});

test('a page-directed result keeps a stable usable native reference despite OCR elsewhere',()=>{
 const match=searchEvidence([source],'第34页','S1')[0];
 const result=calculationBasis({...basis,evidenceBlocks:[{sourceId:match.id,blockId:match.blockId}]},[source]);
 assert.equal(result.evidenceBlocks[0].blockId,'p34-b1');
 assert.throws(()=>calculationBasis({...basis,evidenceBlocks:[{sourceId:'S1',blockId:searchEvidence([source],'第2页','S1')[0].blockId}]},[source]),/OCR/);
});

test('explicitly empty parsed blocks cannot fall back to apparently usable legacy evidence',()=>{
 const empty={...source,text:'现金流量 12345，只有未定位的解析残留文字。',documentBlocks:[]};
 assert.deepEqual(evidenceBlocks(empty),[]);assert.deepEqual(searchEvidence([empty],'现金流量','S1'),[]);
 assert.throws(()=>calculationBasis(basis,[empty]),/没有可引用/);
 const {documentBlocks,...legacy}=empty;assert.ok(searchEvidence([legacy],'现金流量','S1').length);
 const structured={...empty,financialFacts:[{tag:'CashFlow',value:12345}]};assert.equal(evidenceBlocks(structured)[0].id,'fact1');
});

test('duplicate block or source identifiers cannot silently choose the first financial statement',()=>{
 const duplicated={...source,documentBlocks:[source.documentBlocks[1],{...source.documentBlocks[1],text:'现金流量：另一个相互矛盾的值。'}]};
 const input={...basis,evidenceBlocks:[{sourceId:'S1',blockId:'p34-b1'}]};
 for(const sources of [[duplicated],[source,{...source}]])assert.throws(()=>calculationBasis(input,sources),error=>error.code==='calculation_evidence'&&/编号重复/.test(error.message));
 assert.throws(()=>calculationBasis(basis,[source,{...source}]),/编号重复/);
 for(const sources of [[duplicated],[source,{...source}]]){
  const matches=searchEvidence(sources,'第34页','S1');assert.ok(matches.length);
  assert.ok(matches.every(match=>match.referenceAmbiguous&&match.needsReview));assert.match(matches[0].text,/引用编号重复/);
 }
});

test('verified web origins do not make damaged or ambiguous PDF blocks valid calculation evidence',()=>{
 const web={id:'S2',type:'web-evidence',documentRead:true,authorityVerified:true,publishedAt:'2026-01-01',security:source.security,text:'补充原文',documentBlocks:[{id:'p8-b1',page:8,method:'native',text:'损坏数字 12�34',needsReview:true}]};
 const input={...basis,sourceIds:['S1','S2'],evidenceBlocks:[{sourceId:'S1',blockId:'p34-b1'},{sourceId:'S2',blockId:'p8-b1'}]};
 assert.throws(()=>calculationBasis(input,[source,web]),/待核对/);
 const checkbox={...web,documentBlocks:[{...web.documentBlocks[0],needsReview:false,symbolReview:true}]};
 assert.throws(()=>calculationBasis(input,[source,checkbox]),/待核对/);
 const clean={...web,documentBlocks:[{...web.documentBlocks[0],text:'合成财务正文，已明确金额与单位。',needsReview:false}]};
 assert.equal(calculationBasis(input,[source,clean]).evidenceBlocks.length,2);
});
