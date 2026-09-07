// Local, read-only acceptance: rasterize one existing PDF page into a test
// document with a sparse cover, a blank page and a later native-text page.
// No research records, original PDFs or cached archives are modified.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {renderPDFPage,ocrDecimalTokens} from '../server/pdf-ocr.mjs';
import {pdfDocumentOptions} from '../server/pdf-options.mjs';
import {extractPDF} from '../server/pdf-extractor.mjs';
import {searchEvidence} from '../server/evidence-search.mjs';

const [input,pageArg='11',outputDirectory='artifacts/pdf-ocr']=process.argv.slice(2);
if(!input)throw new Error('Usage: node scripts/pdf-ocr-diagnostics.mjs <local.pdf> [page] [output-directory]');
const directory=resolve(outputDirectory);await mkdir(directory,{recursive:true});
const bytes=await readFile(resolve(input)),pageNumber=Number(pageArg);
const loading=getDocument({data:new Uint8Array(bytes),...pdfDocumentOptions});
let rendered,originalText;
try{
 const doc=await loading.promise;assert.ok(Number.isInteger(pageNumber)&&pageNumber>0&&pageNumber<=doc.numPages);
 const page=await doc.getPage(pageNumber);rendered=await renderPDFPage(page);
 originalText=(await page.getTextContent()).items.map(item=>item.str||'').join(' ');
}finally{await loading.destroy();}
await writeFile(join(directory,'original-page.png'),rendered.image);
const bitmap=await loadImage(rendered.image),canvas=createCanvas(bitmap.width,bitmap.height);
canvas.getContext('2d').drawImage(bitmap,0,0);const jpeg=canvas.toBuffer('image/jpeg',95);
const stream=(dictionary,data)=>Buffer.concat([Buffer.from(`<< ${dictionary} /Length ${data.length} >>\nstream\n`),data,Buffer.from('\nendstream')]);
const width=595,height=Math.round(width*bitmap.height/bitmap.width);
const textPage=text=>stream('',Buffer.from(`BT /F1 14 Tf 40 ${height-60} Td (${text}) Tj ET`));
const pageObject=content=>`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 3 0 R >> /XObject << /Scan 4 0 R >> >> /Contents ${content} 0 R >>`;
const objects=[
 '<< /Type /Catalog /Pages 2 0 R >>',
 '<< /Type /Pages /Kids [5 0 R 7 0 R 9 0 R 11 0 R 13 0 R] /Count 5 >>',
 '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
 stream(`/Type /XObject /Subtype /Image /Width ${bitmap.width} /Height ${bitmap.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`,jpeg),
 pageObject(6),textPage('QA cover'),pageObject(8),stream('',Buffer.alloc(0)),
 pageObject(10),stream('',Buffer.from(`q ${width} 0 0 ${height} 0 0 cm /Scan Do Q`)),
 pageObject(12),textPage('Native financial statement survives OCR: revenue 123456; cash flow 789012.'),
 pageObject(14),textPage('QA end'),
 '<< /Creator (Codex) /Title (Local OCR regression fixture - not an official filing) >>',
];
const parts=[Buffer.from('%PDF-1.7\n')],offsets=[0];let position=parts[0].length;
for(const [index,object] of objects.entries()){
 const chunk=Buffer.concat([Buffer.from(`${index+1} 0 obj\n`),Buffer.isBuffer(object)?object:Buffer.from(object),Buffer.from('\nendobj\n')]);
 offsets.push(position);position+=chunk.length;parts.push(chunk);
}
parts.push(Buffer.from(`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(offset=>String(offset).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size ${objects.length+1} /Root 1 0 R /Info 15 0 R >>\nstartxref\n${position}\n%%EOF\n`));
const fixture=Buffer.concat(parts);await writeFile(join(directory,'scanned-fixture.pdf'),fixture);
const started=Date.now();
const parsed=await extractPDF(fixture,undefined,{maxOCRPages:1,ocrBudgetMs:60000,timeoutMs:100000});
await writeFile(join(directory,'parsed.json'),JSON.stringify(parsed,null,2));
assert.equal(parsed.readPages,5);assert.equal(parsed.qualitySummary.unreadPages,0);
assert.equal(parsed.qualitySummary.attemptedOCR,1);assert.deepEqual(parsed.qualitySummary.blankPages,[2]);
assert.equal(parsed.pageQuality[2].method,'ocr');assert.equal(parsed.pageQuality[3].method,'native');
assert.match(parsed.text,/revenue 123456/);assert.ok(parsed.documentBlocks.some(block=>block.page===3&&block.method==='ocr'&&block.needsReview));
const ocrText=parsed.documentBlocks.filter(block=>block.page===3&&!block.ocrAlternative).map(block=>block.text).join('\n');
const originalNumbers=[...new Set(ocrDecimalTokens(originalText))],recognizedNumbers=new Set(ocrDecimalTokens(ocrText));
const matches=searchEvidence([{id:'QA',...parsed}],'现金流 cash flow');
const summary={input:resolve(input),originalPage:pageNumber,ms:Date.now()-started,quality:parsed.qualitySummary,
 ocrPage:parsed.pageQuality[2],retrievedOCRBlocks:matches.filter(m=>m.method==='ocr').length,
 numberComparison:{originalCount:originalNumbers.length,exactMatches:originalNumbers.filter(value=>ocrText.includes(value)).length,
  matchesIgnoringSpaces:originalNumbers.filter(value=>recognizedNumbers.has(value)).length,
  notice:'Sample comparison only; matching characters do not establish financial accuracy. Spacing within numeric groups is normalized only for comparison; separate values are never joined.'},excerpt:ocrText.slice(0,1000)};
await writeFile(join(directory,'summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
