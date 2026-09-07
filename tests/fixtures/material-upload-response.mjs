import {decodeMaterialText,extractOfficeText} from '../../shared/document-text.mjs';
// Deterministic UI response fixtures, not an image/PDF reader. Production parsing
// is covered by document-routing/material-processing tests; no model is called here.
export async function materialUploadResponse(bytes,name){
 const extension=name.split('.').at(-1).toLowerCase();let text;
 if(extension==='pdf'){
  text=bytes.toString().match(/Td \((.*?)\) Tj ET/s)?.[1];
  if(!text)throw new Error('PDF 未取得正文，模型读取与程序 OCR 均未完成');
 }else if(['png','jpg','jpeg','webp','bmp'].includes(extension)){
  if(name==='blank.png')throw new Error('未识别到可用文字');
  if(name==='damaged.png')throw new Error('图片格式无法识别');
  const images={'现金流截图.png':'现金流研究笔记\nRevenue 1000','粘贴截图 1.png':'Clipboard cash flow 2026','财务截图.jpeg':'Revenue 1000','财务截图.webp':'Revenue 1001','财务截图.bmp':'Revenue 1002'};
  if(!images[name])throw new Error(`Missing UI image fixture: ${name}`);
  return {text:images[name],visualAttachment:'b'.repeat(64),processing:{method:'vision',notice:'后端读取的合成图片结果'}};
 }else text=['docx','xlsx','pptx'].includes(extension)?await extractOfficeText(bytes,extension):decodeMaterialText(bytes);
 if(text.length>20000)throw new Error('正文超过 20,000 字，请精简或拆分');
 return {text,processing:{method:'text'}};
}
