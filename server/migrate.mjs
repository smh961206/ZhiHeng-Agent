import {readdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

async function files(dir){try{return (await readdir(dir)).filter(f=>f.endsWith('.json'));}catch(e){if(e.code==='ENOENT')return [];throw e;}}
export async function migrateLegacy(storage,dir=fileURLToPath(new URL('../data/',import.meta.url))){
 const counts={jobs:0,cache:0,skipped:0};
 for(const file of await files(dir)){
  const job=JSON.parse(await readFile(path.join(dir,file),'utf8'));
  if(!job.id||!job.input||!Array.isArray(job.input.sources)||!Array.isArray(job.events)||!job.createdAt)throw new Error(`旧任务格式无效：${file}`);
  if(await storage.hasJob(job.id)){counts.skipped++;continue;}
  await storage.saveJob(job);counts.jobs++;
 }
 for(const file of await files(path.join(dir,'cache'))){
  const source=JSON.parse(await readFile(path.join(dir,'cache',file),'utf8'));
  if(!source.url||!Number.isFinite(Date.parse(source.fetchedAt)))throw new Error(`旧缓存格式无效：${file}`);
  if(Date.now()-Date.parse(source.fetchedAt)>=7*86400000){counts.skipped++;continue;}
  const key=createHash('sha256').update(source.url).digest('hex');
  if(await storage.getCachedReport(key)){counts.skipped++;continue;}
  await storage.saveCachedReport(key,source);counts.cache++;
 }
 return counts;
}
