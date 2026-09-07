import {mkdir,readFile,writeFile,stat,link,unlink} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
export const visualDigest=value=>createHash('sha256').update(value).digest('hex');
const root=fileURLToPath(new URL('../data/visual-attachments/',import.meta.url));
export const validVisualId=id=>typeof id==='string'&&/^[a-f0-9]{64}$/.test(id);
export async function saveVisualAsset(value,{directory=root}={}){
 const raw=JSON.stringify(value);if(Buffer.byteLength(raw)>16*1024*1024)throw new Error('原页归档超过限制');
 const id=visualDigest(raw);await mkdir(directory,{recursive:true});
 const temporary=join(directory,randomUUID()+'.tmp');
 try{
  await writeFile(temporary,raw,{flag:'wx'});
  // Publish a completed file atomically; concurrent identical imports share it.
  try{await link(temporary,join(directory,id+'.json'));}catch(error){if(error.code!=='EEXIST')throw error;await loadVisualAsset(id,{directory});}
 }finally{await unlink(temporary).catch(()=>{});}
 return id;
}
export async function loadVisualAsset(id,{directory=root}={}){
 if(!validVisualId(id))throw new Error('原页编号无效');
 const file=join(directory,id+'.json');if((await stat(file)).size>16*1024*1024)throw new Error('原页归档超过限制');
 const raw=await readFile(file);if(visualDigest(raw)!==id)throw new Error('原页归档校验失败');
 const value=JSON.parse(raw.toString('utf8'));
 if(!Array.isArray(value.images)||!value.images.length||value.images.length>12||value.images.some(image=>!Number.isInteger(image.page)||image.page<1||!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+=*$/.test(image.dataUrl)))throw new Error('原页归档格式无效');
 return value;
}
