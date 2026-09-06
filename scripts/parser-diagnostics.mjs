// Read-only parsing acceptance against already downloaded official originals.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {extractPDF} from '../server/pdf-extractor.mjs';
import {extractHTML} from '../server/filing-text.mjs';
import {searchEvidence} from '../server/evidence-search.mjs';
import {renderPDFPage} from '../server/pdf-ocr.mjs';
import {pdfDocumentOptions} from '../server/pdf-options.mjs';
const directory=new URL('../artifacts/parser/',import.meta.url);
await mkdir(directory,{recursive:true});
const summary={startedAt:new Date().toISOString(),samples:[],notice:'限定样本验收；不代表全部发行人或全部版式的正确率'};
for(const file of ['cn.pdf','hk.pdf','sec.htm']){
 const bytes=await readFile(new URL(file,directory)),started=Date.now();
 const result=file.endsWith('.pdf')?await extractPDF(bytes,undefined,{ocr:false}):extractHTML(bytes.toString('utf8'));
 await writeFile(new URL(file+'.parsed.json',directory),JSON.stringify(result));
 const source={id:'S1',text:result.text,...result};
 const matches=searchEvidence([source],file==='sec.htm'?'NetIncomeLoss':'现金流量 Cash flows');
 const record={file,ms:Date.now()-started,pages:result.pages,readPages:result.readPages,truncated:result.truncated,blocks:result.documentBlocks.length,quality:result.qualitySummary,
  inlineXbrl:result.inlineXbrl,matches:matches.slice(0,2).map(({cellPositions,...match})=>match)};
 summary.samples.push(record);console.log(JSON.stringify({...record,matches:undefined}));
}
const bytes=await readFile(new URL('cn.pdf',directory));
const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
const loading=getDocument({data:new Uint8Array(bytes),...pdfDocumentOptions});
const doc=await loading.promise;const rendered=await renderPDFPage(await doc.getPage(2));
await writeFile(new URL('cn-page-2.png',directory),rendered.image);await loading.destroy();
const started=Date.now();
const ocr=await extractPDF(bytes,undefined,{maxPages:2,maxOCRPages:1,forceOCRPages:[2],ocrBudgetMs:60000,timeoutMs:100000});
await writeFile(new URL('cn-ocr.parsed.json',directory),JSON.stringify(ocr));
summary.ocr={ms:Date.now()-started,quality:ocr.qualitySummary,pages:ocr.pageQuality,excerpt:ocr.documentBlocks.filter(b=>b.page===2).map(b=>b.text).join('\n').slice(0,5000)};
console.log(JSON.stringify({ocr:summary.ocr}));
await writeFile(new URL('diagnostics.json',directory),JSON.stringify(summary,null,2));
if(ocr.qualitySummary.ocrPages!==1)process.exitCode=1;
