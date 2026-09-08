import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {backupKnowledge} from '../scripts/backup-knowledge.mjs';
import {indexRules} from '../shared/knowledge-index.mjs';
import {bodyFilter} from '../shared/knowledge-search.mjs';
import {frameworkVersion,modes,knowledgeSources} from '../shared/research-framework.mjs';
import {depthSections} from '../shared/knowledge-loading.mjs';

const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const projectRoot=fileURLToPath(new URL('../',import.meta.url));

// Validate the complete generation before publishing it. Research then opens
// individual files from this immutable archive, never from the editable tree.
export function createSnapshotManager({root=projectRoot,version=frameworkVersion}={}){
 let active,lastError=null;
 function open(ref){
  if(ref?.version!==version||!/^\d+\.\d+$/.test(ref.version)||!/^[a-f0-9]{64}$/.test(ref.id))throw new Error('规则快照标识无效或与执行框架不兼容');
  const directory=join(root,'knowledge/versions/auto',ref.version,ref.id);
  const saved=JSON.parse(readFileSync(join(directory,'manifest.json'),'utf8'));
  if(saved.id!==ref.id||saved.version!==version)throw new Error('规则快照清单不一致');
  const read=path=>{
   if(!/^knowledge\/(ENTRY\.md|modules\.json|modules\/rules\/[a-z0-9-]+\.md)$/.test(path))throw new Error('非法快照文件路径');
   return readFileSync(join(directory,path.slice('knowledge/'.length)),'utf8');
  };
  const entry=read('knowledge/ENTRY.md'),catalogText=read('knowledge/modules.json'),catalog=JSON.parse(catalogText);
  if(catalog.version!==version||catalog.schemaVersion!==2||catalog.entry!=='knowledge/ENTRY.md'||entry.match(/^\s+version:\s*"([^"]+)"/m)?.[1]!==version)throw new Error('规则入口、目录与执行框架版本不一致');
  const ids=new Set(),paths=new Set();
  for(const module of catalog.modules){
   if(module.source!=='rules'||!/^knowledge\/modules\/rules\/[a-z0-9-]+\.md$/.test(module.path)||ids.has(module.id)||paths.has(module.path))throw new Error('非法或重复规则模块');
   ids.add(module.id);paths.add(module.path);
  }
  const expected=['knowledge/ENTRY.md','knowledge/modules.json',...paths];
  if(saved.files.length!==expected.length||new Set(saved.files.map(f=>f.name)).size!==expected.length)throw new Error('规则快照文件清单不完整');
  const digests=[];
  for(const path of expected){
   const text=read(path),sha256=hash(text),file=saved.files.find(f=>f.name===path.slice('knowledge/'.length));
   if(!file||file.sha256!==sha256||file.bytes!==Buffer.byteLength(text))throw new Error('规则快照文件校验失败：'+path);
   digests.push({name:file.name,sha256});
   const module=catalog.modules.find(m=>m.path===path);
   if(module){
    const sections=indexRules(text,path).map(({content,source,...s})=>s);
    if(module.sha256!==sha256||module.bytes!==file.bytes||JSON.stringify(sections)!==JSON.stringify(module.sections)||bodyFilter(text)!==module.bodyFilter)throw new Error('规则正文与章节索引不一致：'+path);
   }
  }
  if(hash(JSON.stringify(digests))!==ref.id)throw new Error('规则快照摘要不一致');
  for(const profile of Object.values(modes))for(const chapter of profile.ruleChapters)if(!catalog.modules.some(m=>m.chapter===chapter))throw new Error('缺少绑定章节 '+chapter);
  for(const selection of Object.values(depthSections))for(const [chapter,prefixes] of Object.entries(selection))for(const prefix of prefixes)if(!catalog.modules.some(m=>m.chapter===Number(chapter)&&m.sections.some(s=>s.level===2&&s.title.startsWith(prefix))))throw new Error('缺少深度加载小节 '+prefix);
  for(const id of ['01-routing-principles','01-routing-links',...Object.keys(modes).map(m=>'01-mode-'+m.toLowerCase()),'15-output-quick','15-output-standard','15-output-deep','15-output-update','15-output-comparison','15-output-dividend','15-output-battle-map','15-output-execution'])if(!ids.has(id))throw new Error('缺少加载模块 '+id);
  const manifest=[{...knowledgeSources[0],version,updatedAt:catalog.updatedAt,sha256:hash(entry)},
   {id:'module-catalog',path:'knowledge/modules.json',role:'按需加载目录',version,updatedAt:catalog.updatedAt,sha256:hash(catalogText)},
   ...catalog.modules.map(m=>({id:m.id,path:m.path,role:m.title,version,updatedAt:catalog.updatedAt,sha256:m.sha256}))];
  return {ref:{id:ref.id,version},catalog,entry,manifest,read};
 }
 function latestSaved(){
  const parent=join(root,'knowledge/versions/auto',version);
  let candidates=[];
  try{candidates=readdirSync(parent).filter(id=>/^[a-f0-9]{64}$/.test(id)).flatMap(id=>{
   try{const saved=JSON.parse(readFileSync(join(parent,id,'manifest.json'),'utf8'));return [{id,version,createdAt:saved.createdAt}];}catch{return [];}
  }).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));}catch{}
  for(const candidate of candidates)try{return open(candidate);}catch{}
 }
 function current(){
  try{
   const backup=backupKnowledge(root);
   const next=open({id:backup.id,version});
   active=next;lastError=null;
  }catch(error){
   lastError=error.message;
   active??=latestSaved();
   if(!active)throw new Error('没有可用的已校验规则快照：'+lastError);
  }
  return active;
 }
 return {current,open,status:()=>({snapshot:active?.ref??null,updatePending:Boolean(lastError),error:lastError})};
}
export const snapshotManager=createSnapshotManager();
