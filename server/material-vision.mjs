import {extractPDFText} from './pdf-extractor.mjs';
import {enhancePDFWithVision,readImageMaterial} from './visual-reading.mjs';
import {saveVisualAsset,loadVisualAsset,visualDigest} from './visual-assets.mjs';
export function visualFileKind(bytes){
 if(bytes.subarray(0,1024).toString('latin1').includes('%PDF-'))return 'pdf';
 if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||bytes[0]===255&&bytes[1]===216&&bytes[2]===255||bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP'||bytes.subarray(0,2).toString()==='BM')return 'image';
 throw new Error('仅支持 PDF、PNG、JPEG、WebP 或 BMP 原件');
}
export async function readVisualMaterial(bytes,{signal,parse=extractPDFText,enhance=enhancePDFWithVision,readImage=readImageMaterial,load=loadVisualAsset,save=saveVisualAsset}={}){
 if(!bytes.length||bytes.length>10*1024*1024)throw new Error('文件为空或超过 10 MB');
 const kind=visualFileKind(bytes);
 if(kind==='image')return {...await readImage(bytes,signal),processing:{method:'vision',notice:'Vision 已读取原图，转写将交给 Pro 深度分析与审计'}};
 const parsed=await parse(bytes,signal,{ocr:false,timeoutMs:45000});
 if(parsed.pages>100)throw new Error('PDF 超过 100 页，请只保留需要研究的页面');
 const enhanced=await enhance(bytes,parsed,signal);
 if(enhanced.visualReading?.status==='text-only'){
  if(enhanced.text.length>20000)throw new Error('PDF 正文超过 20,000 字，请精简后导入');
  return {text:enhanced.text,processing:{method:'text',notice:enhanced.visualReading.notice}};
 }
 if(enhanced.visualReading?.status!=='read'){
  const fallback=parsed.pageQuality?.some(p=>p.needsReview)?await parse(bytes,signal,{timeoutMs:45000}):parsed;
  if(!fallback.documentBlocks?.some(block=>block.text.trim()))throw new Error('PDF 未取得可用正文，模型读取与程序识别均未完成');
  const notice='模型原页读取未完成，已回退为程序提取与 OCR；未完成视觉核对。';
  const text=`处理提示：${notice}\n\n${fallback.text}`;
  if(text.length>20000)throw new Error('PDF 提取结果超过 20,000 字，请仅保留需要研究的页面');
  return {text,processing:{method:'fallback',notice}};
 }
 if(enhanced.text.length>20000)throw new Error('PDF 提取结果超过 20,000 字，请仅保留需要研究的页面');
 let visualAttachment;
 if(enhanced.visualReading.attachmentId){
  const asset=await load(enhanced.visualReading.attachmentId);
  visualAttachment=await save({...asset,materialTextHash:visualDigest(enhanced.text)});
 }
 return {text:enhanced.text,visualAttachment,processing:{method:'vision',notice:enhanced.visualReading.notice}};
}
