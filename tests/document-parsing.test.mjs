import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {PARSER_VERSION,positionedRows,textQuality,sourceSummary,readableCharacterCount} from '../server/document-layout.mjs';
import {pdfDocumentOptions} from '../server/pdf-options.mjs';
import {extractPDF} from '../server/pdf-extractor.mjs';
import {extractHTML} from '../server/filing-text.mjs';
import {extractInlineXBRL,inlineNumber} from '../server/inline-xbrl.mjs';
import {xbrlObservations} from '../server/financial-observations.mjs';
import {searchEvidence} from '../server/evidence-search.mjs';
import {createOfficialReportReader} from '../server/official-reports.mjs';
import {createWebEvidenceReader} from '../server/web-evidence.mjs';
import {digest,parsedDigest,validParsedArchive} from '../server/document-integrity.mjs';
import {calculationBasis} from '../server/calculations.mjs';
import {publicJob} from '../server/job-stream.mjs';
import {BSON} from 'mongodb';

const ns='http://www.xbrl.org/inlineXBRL/transformation/2020-02-12';
const fact=(attributes={},text='1,234.5')=>`<ix:nonFraction name="us-gaap:NetIncomeLoss" contextRef="duration" unitRef="usd" ${Object.entries({format:'ixt:num-dot-decimal',scale:'6',...attributes}).map(([key,value])=>`${key}="${value}"`).join(' ')}>${text}</ix:nonFraction>`;
const inline=(body,extras='')=>`<html xmlns:ix="http://www.xbrl.org/2013/inlineXBRL" xmlns:xbrli="http://www.xbrl.org/2003/instance" xmlns:us-gaap="http://fasb.org/us-gaap/2025" xmlns:custom="https://issuer.example/taxonomy/2025" xmlns:xbrldi="http://xbrl.org/2006/xbrldi" xmlns:iso4217="http://www.xbrl.org/2003/iso4217" xmlns:ixt="${ns}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><body><ix:header><xbrli:context id="duration"><xbrli:entity><xbrli:identifier scheme="http://www.sec.gov/CIK">0000320193</xbrli:identifier></xbrli:entity><xbrli:period><xbrli:startDate>2025-09-28</xbrli:startDate><xbrli:endDate>2026-06-27</xbrli:endDate></xbrli:period></xbrli:context><xbrli:unit id="usd"><xbrli:measure>iso4217:USD</xbrli:measure></xbrli:unit>${extras}</ix:header><h1>FORM 10-Q</h1><p>${'Readable official report body. '.repeat(20)}</p>${body}</body></html>`;
test('PDF ships local CMaps, font and wasm directories instead of relying on network assets',()=>{
 for(const key of ['cMapUrl','standardFontDataUrl','wasmUrl']){assert.ok(pdfDocumentOptions[key].endsWith('/'));assert.doesNotMatch(pdfDocumentOptions[key],/^https?:/);}
 assert.equal(pdfDocumentOptions.cMapPacked,true);assert.equal(pdfDocumentOptions.useWorkerFetch,false);
});
test('positioned text keeps row order, financial columns and negative signs',()=>{
 const rows=positionedRows([{text:'2025',x:300,y:10,width:30,height:10},{text:'2024',x:400,y:10,width:30,height:10},{text:'净利润',x:30,y:30,width:30,height:10},{text:'-1,234.50',x:300,y:30,width:50,height:10},{text:'2,000.00',x:358,y:30,width:50,height:10}]);
 assert.equal(rows[1].text,'净利润\t-1,234.50\t2,000.00');assert.equal(rows[0].text,'2025\t2024');
 assert.equal(textQuality('�'.repeat(80)).status,'garbled');assert.equal(textQuality('12345'.repeat(20)).status,'numeric-only');
 assert.equal(readableCharacterCount('【PDF第1页 · OCR待核对】\n'),0);
});
function workerFixture(options={}){
 const worker=new EventEmitter();worker.terminate=async()=>{};
 const result=extractPDF(Buffer.from('fixture'),undefined,{createWorker:()=>worker,...options});
 worker.emit('message',{type:'pdf:start',pages:3,parserVersion:PARSER_VERSION});
 const page=(number,status='readable')=>worker.emit('message',{type:'pdf:page',page:{page:number,status,method:'native',needsReview:status!=='readable'},text:status==='failed'?'【PDF第'+number+'页】':'营业收入及现金流资料'.repeat(30),documentBlocks:[]});
 return {worker,result,page};
}
test('one broken page preserves other PDF pages with a quality gap',async()=>{
 const {worker,result,page}=workerFixture();page(1);page(2,'failed');page(3);worker.emit('message',{type:'pdf:done'});
 const parsed=await result;assert.equal(parsed.readPages,3);assert.deepEqual(parsed.qualitySummary.unresolvedPages,[2]);assert.equal(parsed.emptyPages,1);assert.ok(parsed.text.includes('现金流'));
});
test('PDF timeout returns substantial completed pages and explicit unread count',async()=>{
 const {result,page}=workerFixture({timeoutMs:10});page(1);const parsed=await result;
 assert.equal(parsed.truncated,true);assert.equal(parsed.qualitySummary.unreadPages,2);assert.match(parsed.parseWarning,/超时/);
});
test('generated page markers cannot masquerade as extracted financial content',async()=>{
 const {worker,result,page}=workerFixture();page(1,'failed');worker.emit('message',{type:'pdf:error',error:'broken'});await assert.rejects(result,/broken/);
});

test('malformed later PDF messages retain earlier pages without accepting invalid evidence',async()=>{
 for(const message of [
  {type:'pdf:page-update',page:{page:9},text:'invalid',documentBlocks:[]},
  {type:'pdf:page',page:{page:2},text:'invalid',documentBlocks:[{id:'p9-b1',page:9,text:'wrong page'}]},
  {type:'pdf:start',pages:900},
 ]){
  const {worker,result,page}=workerFixture();page(1);worker.emit('message',message);
  const parsed=await result;assert.equal(parsed.readPages,1);assert.equal(parsed.pages,3);assert.equal(parsed.truncated,true);
  assert.match(parsed.parseWarning,/格式无效/);assert.doesNotMatch(parsed.text,/invalid|wrong page/);
 }
});

test('malformed PDF metadata with no completed text fails explicitly',async()=>{
 const worker=new EventEmitter();worker.terminate=async()=>{};
 const result=extractPDF(Buffer.from('fixture'),undefined,{createWorker:()=>worker});
 worker.emit('message',{type:'pdf:start',pages:NaN});await assert.rejects(result,/页数返回格式无效/);
});
test('HTML table retrieval carries headers and spanning cells while hidden content stays hidden',()=>{
 const result=extractHTML('<h2>单位：人民币百万元</h2><table><tr><th rowspan="2">项目</th><th colspan="2">截至2025年12月31日</th></tr><tr><th>本期</th><th>比较期</th></tr><tr><td>经营现金流</td><td>(1,200)</td><td>900</td></tr></table><script>fake 999</script>');
 const matches=searchEvidence([{id:'S1',...result}], '经营现金流','S1');
 assert.equal(matches[0].kind,'html-table');assert.match(matches[0].text,/人民币百万元/);assert.match(matches[0].text,/2025年12月31日/);assert.match(matches[0].text,/\(1,200\)\t900/);assert.ok(matches[0].spans.length===2);assert.doesNotMatch(result.text,/fake/);
});
test('retrieval can reach a late paragraph in legacy text and expands Chinese financial terms',()=>{
 const text='a'.repeat(40000)+' late_unique_metric';
 assert.ok(searchEvidence([{id:'S1',text}],'late_unique_metric').length);
 const matches=searchEvidence([{id:'S2',text:'header',financialFacts:[{tag:'us-gaap:NetIncomeLoss',value:100,start:'2025-01-01',end:'2025-12-31',unit:'USD'}]}],'净利润');
 assert.equal(matches[0].kind,'xbrl-fact');assert.match(matches[0].text,/2025-01-01/);
});
test('inline facts preserve true periods and scale once, separately from display decimals',()=>{
 const parsed=extractInlineXBRL(inline(fact({sign:'-',decimals:'-6'})));
 assert.equal(parsed.financialFacts[0].value,-1234500000);assert.equal(parsed.financialFacts[0].start,'2025-09-28');assert.equal(parsed.financialFacts[0].end,'2026-06-27');assert.equal(parsed.financialFacts[0].unit,'USD');assert.equal(parsed.financialFacts[0].entity,'0000320193');
 assert.equal(inlineNumber('1.234,50',{format:'ixt:num-comma-decimal',scale:'0'},ns),1234.5);
});
test('nil, malformed separators, unknown transformations and conflicting contexts are rejected, never zero-filled',()=>{
 const result=extractInlineXBRL(inline(fact({'xsi:nil':'true'})+fact({format:'ixt:future-format'})+fact({},'12,34.00')));
 assert.equal(result.financialFacts.length,0);assert.equal(result.inlineXbrl.rejectedFacts,3);
 const conflict=inline(fact(),'<xbrli:context id="duration"><xbrli:period><xbrli:instant>2020-01-01</xbrli:instant></xbrli:period></xbrli:context>');
 assert.equal(extractInlineXBRL(conflict).financialFacts.length,0);
 assert.throws(()=>inlineNumber('9007199254740993',{},ns),/精度/);
});
test('nested inline tags apply their own scale and context without losing text order',()=>{
 const nested=fact({scale:'0'},fact({scale:'3'},'123'));
 const result=extractInlineXBRL(inline(nested));assert.deepEqual(result.financialFacts.map(f=>f.value),[123000,123]);
 const ordered=extractInlineXBRL(inline(fact({scale:'0'},'1<span>23</span>4')));assert.equal(ordered.financialFacts[0].value,1234);
});
test('custom concepts remain unmapped; dimensions and issuers are not mixed into consolidated observations',()=>{
 const custom=extractInlineXBRL(inline(fact().replace('us-gaap:NetIncomeLoss','custom:NetIncomeLoss')));
 assert.equal(custom.financialFacts[0].standardConcept,false);
 const base={tag:'us-gaap:NetIncomeLoss',value:10,unit:'USD',start:'2025-01-01',end:'2025-12-31',filed:'2026-02-01'};
 const result=xbrlObservations([{id:'S1',security:'US:A',official:true,type:'official-report',financialFacts:[base,{...base,value:3,dimensions:[{axis:'Segment',value:'A'}]},...custom.financialFacts]}, {id:'S2',security:'US:B',type:'official-xbrl',financialFacts:[base]}]);
 assert.equal(result.observations.length,3);assert.equal(result.observations.filter(f=>f.scope==='dimensioned').length,1);assert.equal(result.coverage.revenue,'missing-standard-tag');
});
test('same-day XBRL disagreement does not pick a value and bad dates never enter observations',()=>{
 const base={tag:'us-gaap:NetIncomeLoss',value:10,unit:'USD',start:'2025-01-01',end:'2025-12-31',filed:'2026-02-01'};
 const result=xbrlObservations([{id:'S1',security:'US:A',type:'official-xbrl',financialFacts:[base,{...base,value:20},{...base,end:'2025-02-30'}]}]);
 assert.equal(result.observations[0].value,null);assert.equal(result.observations[0].hasConflict,true);assert.equal(result.errors.length,1);
});
const report={title:'2026 10-Q',url:'https://www.sec.gov/Archives/edgar/data/320193/000032019326000020/aapl.htm',security:'US:AAPL',date:'2026-07-31',form:'10-Q'};
const memory=()=>{const entries=new Map();return {entries,getCachedReport:async key=>structuredClone(entries.get(key)),saveCachedReport:async(key,value)=>entries.set(key,structuredClone(value))};};
test('official archives verify layout and facts, bind CIK and refetch after structured-data corruption',async()=>{
 const store=memory();let calls=0;
 const reader=createOfficialReportReader({storage:async()=>store,request:async()=>{calls++;return Buffer.from(inline(fact()));}});
 const first=await reader(report);assert.equal(first.financialFacts[0].filed,report.date);assert.ok(validParsedArchive(first));assert.equal(first.parserVersion,PARSER_VERSION);
 assert.equal((await reader(report)).fromCache,true);assert.equal(calls,1);
 for(const entry of store.entries.values())entry.financialFacts[0].value=999;
 assert.equal((await reader(report)).financialFacts[0].value,1234500000);assert.equal(calls,2);
 const mismatch=createOfficialReportReader({storage:async()=>memory(),request:async()=>Buffer.from(inline(fact()).replace('0000320193','0000000001'))});
 assert.equal((await mismatch(report)).financialFacts.length,0);
});
test('legacy archive remains available during outage but is marked without claiming upgraded parsing',async()=>{
 const store=memory(),text='历史原始正文'.repeat(100),legacy={...report,text,fetchedAt:'2026-01-01T00:00:00Z',textSha256:digest(text)};
 store.entries.set(digest(`official-report:v2:${report.security}:${report.url}`),legacy);
 const reader=createOfficialReportReader({storage:async()=>store,request:async()=>{throw new Error('offline');}});
 const result=await reader(report);assert.equal(result.legacyParser,true);assert.equal(result.stale,true);assert.equal(result.fetchedAt,legacy.fetchedAt);
});
test('Mongo BSON round-trip preserves structured evidence checksums',async()=>{
 const entries=new Map(),store={getCachedReport:async key=>entries.get(key),saveCachedReport:async(key,value)=>entries.set(key,BSON.deserialize(BSON.serialize(value)))};
 let calls=0;const reader=createOfficialReportReader({storage:async()=>store,request:async()=>{calls++;return Buffer.from(inline(fact()));}});
 const first=await reader(report),second=await reader(report);assert.equal(second.fromCache,true);assert.equal(second.parsedSha256,first.parsedSha256);assert.equal(calls,1);
});
test('web PDF OCR warnings persist with original metadata and parsed evidence hashes',async()=>{
 const source=await createWebEvidenceReader({archive:null,fetchDocument:async()=>({url:'https://www.stats.gov.cn/report.pdf',bytes:Buffer.from('%PDF-1.7'),contentType:'application/pdf'}),parsePDF:async()=>({text:'统计资料原文'.repeat(100),qualitySummary:{ocrPages:1,unresolvedPages:[1]},documentBlocks:[]})})({url:'https://www.stats.gov.cn/report.pdf'});
 assert.match(source.metadataWarnings.join(' '),/OCR/);assert.equal(source.publishedAt,null);assert.equal(source.parsedSha256,parsedDigest(source));
});
test('OCR-only calculations fail and source catalogs do not leak complete structures into model or UI previews',()=>{
 const source={id:'S1',official:true,type:'official-report',text:'evidence',qualitySummary:{ocrPages:1},documentBlocks:[{text:'large'}],financialFacts:[{value:1}],pageQuality:[{page:1}]};
 assert.throws(()=>calculationBasis({currency:'USD',period:'2025',shareBasis:'diluted',assumptions:'verified',sourceIds:['S1']},[source]),/OCR/);
 const summary=sourceSummary(source);assert.equal(summary.evidenceBlocks,1);assert.equal(summary.financialFacts,undefined);assert.equal(summary.pageQuality,undefined);
 assert.equal(publicJob({input:{sources:[source]}}).input.sources[0].documentBlocks,undefined);
});
test('a scanned cover does not prevent calculations from explicitly cited native financial pages',()=>{
 const basis={currency:'CNY',period:'2025',shareBasis:'diluted',assumptions:'原件核对',sourceIds:['S1'],evidenceBlocks:[{sourceId:'S1',blockId:'p165-b1'}]};
 const source={id:'S1',official:true,type:'official-report',qualitySummary:{ocrPages:1},documentBlocks:[{id:'p1-b1',method:'ocr',needsReview:true},{id:'p165-b1',method:'native',needsReview:false,text:'利润及单位'}]};
 assert.equal(calculationBasis(basis,[source]).evidenceBlocks[0].blockId,'p165-b1');
 assert.throws(()=>calculationBasis({...basis,evidenceBlocks:[{sourceId:'S1',blockId:'p1-b1'}]},[source]),/OCR/);
 assert.throws(()=>calculationBasis({...basis,evidenceBlocks:[{sourceId:'S1',blockId:'missing'}]},[source]),/不存在/);
});
