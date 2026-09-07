import test from 'node:test';
import assert from 'node:assert/strict';
import {reportWarningGroups,reportWarningSourceMatches} from '../shared/report-warnings.mjs';

test('warning shortcuts match full titles and preserve exact source positions',()=>{
 const sources=[{id:'S1',title:'公司甲2024年报'},{id:'S2',title:'公司甲 2025年报'},{id:'S3',title:'公司甲2025年报'},{id:'S4',title:'公司甲2025年报摘要'}];
 assert.deepEqual(reportWarningSourceMatches('公司甲2025年报',sources).map(item=>item.index),[1,2]);
 assert.deepEqual(reportWarningSourceMatches('公司甲2026年报',sources),[]);
 assert.deepEqual(reportWarningSourceMatches('',sources),[]);
});

test('pairs report warnings without dropping page references or original wording',()=>{
 const warnings=['公司甲2025年报：1 页使用 OCR，识别内容待原件核对，不能单独作为计算依据','公司乙2025年报：PDF 仍有待核对页：2、3','公司甲2025年报：PDF 仍有待核对页：1、370','行情可能延迟'];
 const result=reportWarningGroups(warnings);
 assert.equal(result.parsingCount,3);assert.equal(result.groups.length,2);
 assert.equal(result.groups[0].title,'公司甲2025年报');
 assert.deepEqual(result.groups[0].items.map(item=>[item.kind,item.value]),[['ocr','1'],['pages','1、370']]);
 assert.deepEqual(result.other,['行情可能延迟']);
 assert.deepEqual([...result.other,...result.groups.flatMap(group=>group.items.map(item=>item.original))].sort(),[...warnings].sort());
});
test('unrecognized formats and additional OCR limitations keep their full text',()=>{
 const warnings=['CN:601318 数据口径尚需核对','OCR 仍有未读页。','公司甲:2025年报：1 页使用 OCR，单位冲突尚需核对。'];
 const result=reportWarningGroups(warnings);
 assert.deepEqual(result.other,[warnings[0]]);
 assert.equal(result.groups[0].items[0].text,warnings[1]);
 assert.equal(result.groups[1].title,'公司甲:2025年报');
 assert.equal(result.groups[1].items[0].kind,'note');
 assert.equal(result.groups[1].items[0].text,'1 页使用 OCR，单位冲突尚需核对。');
 assert.deepEqual(reportWarningGroups([]),{other:[],groups:[],parsingCount:0});
});
