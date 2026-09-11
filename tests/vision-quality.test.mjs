import test from 'node:test';
import assert from 'node:assert/strict';
import {gradeVisionTable} from '../server/vision-quality.mjs';
import {loadVisionCorpus} from '../scripts/vision-benchmark.mjs';
const cases=loadVisionCorpus().manifest.cases;

test('live-run footnote, unreadable, header-row, row-label and period regressions remain failures under unchanged strict grading',()=>{
 for(const [id,mutate] of [
  ['VIS-012',o=>o.cells.filter(c=>c.footnote!==null).forEach(c=>c.footnote='1')],
  ['VIS-016',o=>o.footnotes.push('Blank / unreadable cells are missing; do not fill zero.')],
  ['VIS-033',o=>o.cells.find(c=>c.value===null).value='unreadable'],
  ['VIS-044',o=>o.cells.push(...o.headers.slice(1).map(column=>({...o.cells.find(c=>c.column===column),row:o.headers[0],value:null,footnote:null})))],
  ['VIS-045',o=>{o.cells.at(-1).row='Nonreccurring gain';}],
  ['VIS-014',o=>o.cells.filter(c=>c.footnote!==null).forEach(c=>c.row+=' '+c.footnote)],
  ['VIS-002',o=>o.cells.forEach(c=>c.date=o.headers.slice(1).find(h=>h!==c.column)+'-12-31')],
 ]){
  const expected=cases.find(c=>c.id===id).expected,observed=structuredClone(expected);
  mutate(observed);const text=JSON.stringify(observed);
  assert.equal(gradeVisionTable(expected,text).passed,false,id);
  assert.equal(JSON.stringify(observed),text,'grading must not rewrite evidence');
  assert.equal(gradeVisionTable(expected,expected).passed,true,id);
 }
});
test('Vision grading reference matches all frozen cases without numeric floating point coercion',()=>{
 for(const item of cases)assert.equal(gradeVisionTable(item.expected,JSON.stringify(item.expected)).passed,true);
 const expected=structuredClone(cases[0].expected);expected.cells[0].value='900719925474099312345.1200';
 const observed=structuredClone(expected);observed.cells[0].value='900719925474099312345.12';
 assert.equal(gradeVisionTable(expected,observed).passed,true);
 observed.cells[0].value='900719925474099312344.12';assert.equal(gradeVisionTable(expected,observed).passed,false);
});
test('unit, date, header, sign, parentheses, footnote and relationship errors cannot be averaged away',()=>{
 const expected=cases[0].expected;
 for(const [metric,change] of [
  ['numeric',o=>o.cells[0].value='999'],['unit',o=>o.cells[0].unit='CNY thousand'],
  ['date',o=>o.cells[0].date='2026-12-31'],['header',o=>o.headers.reverse()],
  ['sign',o=>o.cells[2].value=o.cells[2].value.slice(1,-1)],
  ['parentheses',o=>o.cells[2].value='-'+o.cells[2].value.slice(1,-1)],
  ['footnote',o=>o.cells[2].footnote=null],
  ['relationship',o=>{[o.cells[0].value,o.cells[1].value]=[o.cells[1].value,o.cells[0].value];}],
 ]){
  const output=structuredClone(expected);change(output);const grade=gradeVisionTable(expected,output);
  assert.equal(grade.passed,false,metric);assert.ok(grade.metrics[metric].score<1,metric);assert.ok(grade.criticalErrors>0);
 }
});
test('missing remains missing; fabricated zeros, extra or duplicate cells and malformed output fail',()=>{
 const expected=cases.find(c=>c.expected.cells.some(cell=>cell.value===null)).expected;
 const output=structuredClone(expected);output.cells.find(cell=>cell.value===null).value='0';
 assert.equal(gradeVisionTable(expected,output).passed,false);assert.ok(gradeVisionTable(expected,output).metrics.missing.score<1);
 for(const mutate of [o=>o.cells.push({...o.cells[0]}),o=>o.cells.push({...o.cells[0],row:'Invented'}),o=>o.cells.pop(),o=>o.reasoning='private',o=>o.cells[0].value=Number.NaN]){
  const value=structuredClone(expected);mutate(value);assert.equal(gradeVisionTable(expected,value).passed,false);
 }
 for(const malformed of ['not JSON','null','{}',undefined])assert.equal(gradeVisionTable(expected,malformed).passed,false);
});
