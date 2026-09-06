import {createHash} from 'node:crypto';
import {getStorage} from './storage.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
// Only parsed public data belongs here. Callers must never store request bodies,
// credentials, cookies or authorization headers in this archive.
export function createDataArchive({storage=getStorage,clock=Date.now}={}){
 return {
  async put(key,value,{retainMs=30*86400000}={}){
   const text=JSON.stringify(value);
   if(Buffer.byteLength(text)>12_000_000)throw new Error('持久数据超过归档大小上限');
   const source={type:'data-archive',fetchedAt:new Date(clock()).toISOString(),text,sha256:hash(text)};
   await (await storage()).saveCachedReport(hash(`data-archive:v1:${key}`),source,{retainMs});
  },
  async get(key,{maxAgeMs}={}){
   const source=await (await storage()).getCachedReport(hash(`data-archive:v1:${key}`));
   if(!source)return null;
   const age=clock()-Date.parse(source.fetchedAt);
   if(!Number.isFinite(age)||age<0||age>maxAgeMs)return null;
   if(source.type!=='data-archive'||typeof source.text!=='string'||hash(source.text)!==source.sha256)throw new Error('归档完整性校验失败');
   return JSON.parse(source.text);
  }
 };
}
export const dataArchive=createDataArchive();
