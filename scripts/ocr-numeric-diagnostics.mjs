// Synthetic scanned continuation table, recognized by the installed OCR engine.
// No model, network, research records or original documents are involved.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createCanvas} from '@napi-rs/canvas';
import {createLocalOCR} from '../server/pdf-ocr.mjs';
import {processPDFDocument} from '../server/pdf-processing.mjs';
import {searchEvidence} from '../server/evidence-search.mjs';
import {calculationBasis} from '../server/calculations.mjs';
import {needsParsingRetry} from '../server/document-layout.mjs';

const directory=resolve('artifacts/ocr-numeric');await mkdir(directory,{recursive:true});
const canvas=createCanvas(1000,800),context=canvas.getContext('2d');
context.fillStyle='white';context.fillRect(0,0,canvas.width,canvas.height);
context.fillStyle='black';context.font='32px Arial';
for(let row=0;row<8;row++){
 context.fillText('123,456.78',70,95+row*80);
 context.fillText('(987,654.32)',440,95+row*80);
}
const image=canvas.toBuffer('image/png');await writeFile(join(directory,'numeric-scan.png'),image);
const messages=[],page={getViewport:()=>({transform:[]}),getTextContent:async()=>({items:[]}),cleanup(){}};
await processPDFDocument({numPages:1,getPage:async()=>page},{
 transform:(_a,b)=>b,emit:message=>messages.push(message),options:{maxOCRPages:1},
 createOCR:()=>createLocalOCR({renderPage:async()=>({image,scale:1,blank:false})}),
});
const result=messages.find(message=>message.type==='pdf:page-update');
assert.ok(result);assert.equal(result.page.method,'ocr');assert.equal(result.page.status,'numeric-only');
assert.equal(result.page.needsReview,true);assert.equal(needsParsingRetry({pageQuality:[result.page]}),false);
const source={id:'S1',type:'official-report',official:true,text:result.text,documentBlocks:result.documentBlocks};
const matches=searchEvidence([source],'第1页','S1');assert.ok(matches.length);
assert.ok(matches.every(match=>match.method==='ocr'&&match.needsReview));
assert.throws(()=>calculationBasis({currency:'CNY',period:'2025 FY',shareBasis:'普通股',assumptions:'合成测试',sourceIds:['S1'],evidenceBlocks:[{sourceId:'S1',blockId:matches[0].blockId}]},[source]),/OCR|核对/);
const summary={fixture:'Synthetic numeric-only continuation table; actual local OCR engine',page:result.page,retrievedBlocks:matches.length,text:result.text,
 notice:'Checks retention and evidence restrictions, not financial accuracy.'};
await writeFile(join(directory,'summary.json'),JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary,null,2));
