import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadVisionCorpus,visionFixtureRoot} from '../scripts/vision-benchmark.mjs';
import {renderVisualImages} from '../server/visual-reading.mjs';
import {extractPDFText} from '../server/pdf-extractor.mjs';
test('frozen Vision corpus covers 48 distinct originals, three media types, missing/zero/sign/footnote cases',()=>{
 const {manifest}=loadVisionCorpus();assert.equal(manifest.cases.length,48);
 assert.equal(new Set(manifest.cases.map(c=>c.sha256)).size,48);
 for(const kind of ['table','screenshot','scanned-pdf'])assert.equal(manifest.cases.filter(c=>c.kind===kind).length,16);
 const cells=manifest.cases.flatMap(c=>c.expected.cells);
 assert.ok(cells.some(c=>c.value===null));assert.ok(cells.some(c=>c.value==='0'));
 assert.ok(cells.some(c=>c.value?.startsWith('(')));assert.ok(cells.some(c=>c.value?.startsWith('-')));
 assert.ok(cells.some(c=>c.unit==='%'));assert.ok(cells.some(c=>c.footnote==='[1]'));
});
test('frozen scanned PDFs have no native answers and render through the production worker',async()=>{
 const {manifest}=loadVisionCorpus();
 for(const item of manifest.cases.filter(c=>c.kind==='scanned-pdf')){
  const bytes=fs.readFileSync(new URL(item.file,visionFixtureRoot));
  const parsed=await extractPDFText(bytes,undefined,{ocr:false});
  assert.equal(parsed.pages,1);assert.ok(!parsed.documentBlocks.some(block=>/Net profit|Assets|\d+\.25/.test(block.text)));
  const images=await renderVisualImages(bytes,'pdf',[1]);assert.ok(images.length>=1&&images.length<=4);assert.ok(images.every(image=>image.page===1));
 }
});
test('fixture loader rejects modified bytes and traversal before opening an original',()=>{
 const directory=fs.mkdtempSync(join(tmpdir(),'vision-corpus-'));
 try{
  fs.cpSync(visionFixtureRoot,directory,{recursive:true});const root=pathToFileURL(directory+'/');
  fs.appendFileSync(join(directory,'VIS-001.png'),'tampered');assert.throws(()=>loadVisionCorpus(root),/Invalid frozen Vision corpus/);
  const manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',root)));manifest.cases[0].file='../private.png';
  fs.writeFileSync(new URL('manifest.json',root),JSON.stringify(manifest));assert.throws(()=>loadVisionCorpus(root),/Invalid frozen Vision corpus/);
 }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
