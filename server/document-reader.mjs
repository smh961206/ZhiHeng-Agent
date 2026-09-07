import {decodeMaterialText,extractOfficeText} from '../shared/document-text.mjs';
import {plainBlocks} from './document-layout.mjs';
import {extractPDF} from './pdf-extractor.mjs';
import {readVisualMaterial,visualFileKind} from './material-vision.mjs';
import {readImageMaterial} from './visual-reading.mjs';
import {publicModelRouting} from './model-routing.mjs';
export function documentKind(bytes,name=''){
 try{return visualFileKind(bytes);}catch{}
 const extension=name.split(/[?#]/)[0].split('.').at(-1).toLowerCase();
 if(['docx','xlsx','pptx','md','markdown','txt','csv','tsv','json'].includes(extension))return extension;
 return null;
}
// Both upload and retrieval use these parsers; only size/coverage budgets differ.
export async function readDocument(bytes,{name='',signal,upload=false,parsePDF=extractPDF}={}){
 signal?.throwIfAborted();const kind=documentKind(bytes,name),maxCharacters=upload?20000:1_500_000;
 if(!kind)throw new Error('不支持此文件格式，请使用 PDF、DOCX、XLSX 或文本文件');
 let result;
 if(kind==='pdf')result=upload?await readVisualMaterial(bytes,{signal}):await parsePDF(bytes,signal);
 else if(kind==='image'){
  result=upload?await readVisualMaterial(bytes,{signal}):await readImageMaterial(bytes,signal);
  result={...result,visualReading:{status:'read',pages:[1],attachmentId:result.visualAttachment,notice:'Vision 已读取原图，转写交给 Pro，数值仍待核实'}};
 }else{
  const text=['docx','xlsx','pptx'].includes(kind)?await extractOfficeText(new Uint8Array(bytes),kind,{maxCharacters}):decodeMaterialText(new Uint8Array(bytes)).trim();
  if(!text)throw new Error('文件没有可读正文');
  if(text.length>maxCharacters)throw new Error(`正文超过 ${maxCharacters.toLocaleString()} 字，请精简或拆分`);
  result={text,documentBlocks:plainBlocks(text,{method:'native',kind:kind==='xlsx'?'spreadsheet-json':'paragraphs'}),coverage:kind==='xlsx'?'Excel 转为单元格 JSON，保留公式与原始值':'提取完整文档文字',processing:{method:kind==='xlsx'?'spreadsheet-json':'text',notice:kind==='xlsx'?'Excel 已转为 JSON，将交给 Pro 深度分析':'已提取文本，将交给 Pro 深度分析'}};
 }
 signal?.throwIfAborted();
 return {...result,documentFormat:kind,modelRouting:publicModelRouting()};
}
