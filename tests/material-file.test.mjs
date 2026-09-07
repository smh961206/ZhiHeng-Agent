import test from 'node:test';
import assert from 'node:assert/strict';
import {readMaterialFile,validateMaterialFile} from '../src/lib/material-file.mjs';
import {decodeMaterialText,extractOfficeText} from '../shared/document-text.mjs';
import {materialDocx,materialXlsx,materialPptx,officeArchive} from './fixtures/material-files.mjs';
import {imageFormat,isMaterialImage} from '../src/lib/material-image.mjs';

test('Word preserves paragraphs, table text and tabs without deleted text',async()=>{
 const text=await extractOfficeText(materialDocx,'docx');assert.match(text,/现金流研究笔记\n\n营业收入\t100/);assert.match(text,/需要核对原件/);assert.doesNotMatch(text,/已删除/);
});
test('Excel keeps workbook order, sparse cell addresses, shared strings and saved formula results',async()=>{
 const data=JSON.parse(await extractOfficeText(materialXlsx,'xlsx'));assert.deepEqual(data.worksheets.map(s=>s.name),['现金流','盈利']);assert.deepEqual(data.worksheets[0].cells,[{address:'A1',value:'经营现金流'},{address:'C1',value:'100'}]);assert.deepEqual(data.worksheets[1].cells[1],{address:'C1',value:'15',formula:'SUM(A2:B2)'});
});
test('PowerPoint follows presentation relationships instead of filename order',async()=>{
 const text=await extractOfficeText(materialPptx,'pptx');assert.match(text,/第 1 页\n第一页：研究结论\n\n第 2 页\n第二页：风险假设/);
});
test('rejects empty, damaged, oversized and unrecognized files without silently truncating',async()=>{
 assert.throws(()=>validateMaterialFile({name:'old.doc',size:1}),/不支持/);assert.throws(()=>validateMaterialFile({name:'empty.txt',size:0}),/为空/);assert.throws(()=>validateMaterialFile({name:'big.pdf',size:11*1024*1024}),/10 MB/);
 await assert.rejects(extractOfficeText(new Uint8Array([1,2,3]),'docx'),/无法打开/);
 await assert.rejects(extractOfficeText(officeArchive({'word/document.xml':'<document><p><t>'+'a'.repeat(25*1024*1024)+'</t></p></document>'}),'docx'),/过大/);
});
test('text accepts UTF-8, UTF-16 BOM and GB18030 Chinese; rejects binary bytes',async()=>{
 assert.equal(decodeMaterialText(new TextEncoder().encode('现金流\r\n笔记')),'现金流\n笔记');
 assert.equal(decodeMaterialText(new Uint8Array([255,254,0xB0,0x73])),'现');assert.equal(decodeMaterialText(new Uint8Array([0xD6,0xD0,0xCE,0xC4])),'中文');
 assert.throws(()=>decodeMaterialText(new Uint8Array([0,1,2])),/不是可识别/);
 for(const extension of ['txt','md','markdown','csv','tsv','json'])assert.equal(validateMaterialFile(new File(['{"线索":100}'],`data.${extension}`)),extension);
});
test('abort is honored and external sheet relationships are never followed',async()=>{
 const control=new AbortController();control.abort();await assert.rejects(readMaterialFile(new File(['text'],'a.txt'),{signal:control.signal}),{name:'AbortError'});
 const file=officeArchive({'xl/workbook.xml':'<workbook xmlns:r="rels"><sheet name="external" r:id="r1"/></workbook>','xl/_rels/workbook.xml.rels':'<Relationships><Relationship Id="r1" Target="https://example.invalid/secret" TargetMode="External"/></Relationships>'});
 await assert.rejects(extractOfficeText(file,'xlsx'),/外部/);
});

test('image inputs accept only supported raster formats and reject disguised active content',async()=>{
 for(const extension of ['PNG','jpg','jpeg','webp','bmp']){assert.equal(isMaterialImage(`截图.${extension}`),true);assert.equal(validateMaterialFile({name:`截图.${extension}`,size:100}),extension.toLowerCase());}
 for(const extension of ['svg','gif','heic'])assert.throws(()=>validateMaterialFile({name:`截图.${extension}`,size:100}),/不支持/);
 assert.equal(imageFormat(new Uint8Array([255,216,255,224])),'jpeg');
 const png=new Uint8Array(24);png.set([137,80,78,71,13,10,26,10]);assert.equal(imageFormat(png),'png');
 const webp=new Uint8Array(16);webp.set(new TextEncoder().encode('RIFF0000WEBP'));assert.equal(imageFormat(webp),'webp');
 const bmp=new Uint8Array(26);bmp.set([66,77]);assert.equal(imageFormat(bmp),'bmp');
 assert.throws(()=>imageFormat(new TextEncoder().encode('<svg onload="alert(1)"></svg>')),/图片格式无法识别/);
});

test('every upload sends the original File without local parsing or capability requests',async t=>{
 const calls=[];
 t.mock.method(globalThis,'fetch',async(url,options)=>{calls.push({url,options});return Response.json({text:'后端提取正文',processing:{method:'text'}});});
 for(const extension of ['pdf','docx','xlsx','pptx','txt','md','markdown','csv','tsv','json','png','jpg','jpeg','webp','bmp']){
  const file=new File(['原始二进制由后端检查'],`中文.${extension}`);
  file.arrayBuffer=()=>{throw new Error('browser must not read file contents');};file.text=()=>{throw new Error('browser must not extract text');};
  const result=await readMaterialFile(file);assert.equal(result.text,'后端提取正文');
  const call=calls.at(-1);assert.equal(call.url,'/api/materials/read');assert.equal(call.options.body,file);assert.equal(call.options.headers['Content-Type'],'application/octet-stream');assert.equal(decodeURIComponent(call.options.headers['X-Document-Name']),file.name);
 }
 assert.equal(calls.length,15);
});
test('backend failures and malformed responses remain retryable, never fall back to local text',async t=>{
 const file=new File(['本地可读文字不应被当作成功结果'],'a.txt');
 for(const response of [()=>Response.json({error:'模型暂不可用'},{status:503}),()=>Response.json({error:'读取繁忙'},{status:429}),()=>Response.json({}),()=>Response.json({text:' '}),()=>{throw new TypeError('fetch failed');}]){
  const mock=t.mock.method(globalThis,'fetch',response);
  await assert.rejects(readMaterialFile(file),error=>error.retryable===true);mock.mock.restore();
 }
 t.mock.method(globalThis,'fetch',async()=>Response.json({text:'字'.repeat(20001)}));
 await assert.rejects(readMaterialFile(file),/20,000/);
});
test('cancellation is passed to upload and a late backend response cannot add material',async t=>{
 const controller=new AbortController();
 t.mock.method(globalThis,'fetch',async(url,options)=>{assert.equal(options.signal,controller.signal);controller.abort();return Response.json({text:'late'});});
 await assert.rejects(readMaterialFile(new File(['text'],'a.txt'),{signal:controller.signal}),{name:'AbortError'});
});
