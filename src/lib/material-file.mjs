import {materialLimits} from '../../shared/reference-materials.mjs';
import {materialImageExtensions,isMaterialImage} from './material-image.mjs';
import {api} from './api.js';

export const materialFileExtensions=['pdf','docx','xlsx','pptx','txt','md','markdown','csv','tsv','json',...materialImageExtensions];
export const materialFileAccept=materialFileExtensions.map(extension=>`.${extension}`).join(',');
export const materialFileBytes=10*1024*1024;
export function validateMaterialFile(file){
 const extension=file.name.split('.').at(-1).toLowerCase();
 if(!materialFileExtensions.includes(extension))throw new Error('不支持此格式，请使用 PDF、Office 文档、文本或 PNG / JPG / WebP / BMP 图片');
 if(!file.size)throw new Error('文件为空，请选择有内容的文件');
 if(file.size>materialFileBytes)throw new Error('文件超过 10 MB，请精简或拆分后导入');
 if(file.name.length>200)throw new Error('文件名过长，请缩短至 200 字以内');
 return extension;
}
function checkedText(text){
 text=text.trim();
 if(!text)throw Object.assign(new Error('后端未返回可用正文，请检查文件或重试'),{retryable:true});
 if(text.length>materialLimits.characters)throw new Error(`提取到 ${text.length.toLocaleString()} 字，超过单份 20,000 字；请精简或拆分后导入`);
 return text;
}
export async function readMaterialFile(file,{signal,onProgress}={}){
 validateMaterialFile(file);
 signal?.throwIfAborted();
 onProgress?.('正在上传原文件，等待后端处理…');
 let result;
 try{
  // Send the original File as binary. Parsing, rendering and OCR belong to the server.
  result=await api('/api/materials/read',{method:'POST',headers:{'Content-Type':'application/octet-stream','X-Document-Name':encodeURIComponent(file.name)},body:file,signal});
  signal?.throwIfAborted();
  if(typeof result?.text!=='string')throw new Error('后端返回内容异常，请重试');
 }catch(error){
  signal?.throwIfAborted();
  throw Object.assign(new Error(error.code==='network'?'文件上传失败，请检查网络后重试':error.message||'后端文件处理失败，请重试'),{retryable:true});
 }
 return {title:file.name,text:checkedText(result.text),visualAttachment:result.visualAttachment,processing:result.processing,...(isMaterialImage(file.name)?{imageFile:file}:{})};
}
