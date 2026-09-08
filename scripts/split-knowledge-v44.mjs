// One-time, byte-preserving migration. Existing releases are never overwritten.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {backupKnowledge} from './backup-knowledge.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const hash=text=>createHash('sha256').update(text).digest('hex');
const catalogPath=join(root,'knowledge/modules.json');
if(existsSync(catalogPath))throw new Error('V4.4 模块已存在，不覆盖已有拆分');
backupKnowledge(root);
const catalog={schemaVersion:1,version:'4.4',updatedAt:'2026-09-08',sources:[],modules:[]};
const slugs={core:['overview','router','data','fundamental','financial','shareholder-return','valuation','risk-pricing','decision','scoring-confidence','portfolio','financial-update','output','audit','prohibitions','principles','history'],full:['overview','router','execution-graph','data','fundamental','financial','shareholder-return','valuation','risk-pricing','decision','scoring','confidence','portfolio','financial-update','valuation-change','output','audit','prohibitions','principles','glossary','history-v4','history-v43']};
for(const source of ['core','full']){
 const original=readFileSync(join(root,`knowledge/${source.toUpperCase()}.md`),'utf8');
 const archived=readFileSync(join(root,`knowledge/versions/v4.3.0/V4.3.0_${source.toUpperCase()}_SKILL.md`),'utf8');
 if(original!==archived)throw new Error(`${source} 与当前 V4.3 发布快照不一致，请核对后再迁移`);
 // Split on actual headings only; headings inside code fences are untouched.
 const lines=original.match(/[^\n]*\n|[^\n]+$/g),headings=[];let offset=0,fenced=false,chapter=0;
 for(let i=0;i<lines.length;i++){
  const line=lines[i];
  if(/^\s*```/.test(line))fenced=!fenced;
  const match=!fenced&&line.match(/^(#{1,3}) (.+?)\r?\n?$/);
  if(match){if(match[1]==='#'&&/^\d+\./.test(match[2]))chapter=Number(match[2].match(/^\d+/)[0]);headings.push({level:match[1].length,title:match[2],line:i+1,index:i,offset,chapter});}
  offset+=line.length;
 }
 const outputChapter=source==='core'?12:15;
 const boundaries=[{offset:0,line:1,chapter:0,title:'定位与核心原则'},...headings.filter(h=>h.level===1&&/^\d+\./.test(h.title)||h.level===2&&[1,outputChapter].includes(h.chapter))];
 for(let i=0;i<boundaries.length;i++){
  const start=boundaries[i],end=boundaries[i+1]?.offset??original.length,content=original.slice(start.offset,end);
  const suffix=start.level===2?'-'+String(i).padStart(2,'0'):'';
  const id=`${source}-${String(start.chapter).padStart(2,'0')}-${slugs[source][start.chapter]}${suffix}`;
  const path=`knowledge/modules/${source}/${id.slice(source.length+1)}.md`;
  const sections=headings.filter(h=>h.offset>=start.offset&&h.offset<end).map(h=>{
   const next=headings.find(n=>n.offset>h.offset&&n.level<=h.level);
   return {level:h.level,title:h.title,line:h.line-start.line+1,endLine:Math.min(next?.line??lines.length+1,(boundaries[i+1]?.line??lines.length+1))-start.line,index:h.index-start.line+1};
  });
  mkdirSync(join(root,`knowledge/modules/${source}`),{recursive:true});writeFileSync(join(root,path),content,{flag:'wx'});
  catalog.modules.push({id,source,chapter:start.chapter,title:start.title,path,bytes:Buffer.byteLength(content),sha256:hash(content),originalLine:start.line,sections});
 }
 const modules=catalog.modules.filter(m=>m.source===source);
 const reconstructed=modules.map(m=>readFileSync(join(root,m.path),'utf8')).join('');
 if(reconstructed!==original)throw new Error('拆分内容不一致');
 catalog.sources.push({id:source,originalPath:`knowledge/versions/v4.3.0/V4.3.0_${source.toUpperCase()}_SKILL.md`,originalSha256:hash(original),bytes:Buffer.byteLength(original)});
 const index=`---\nmetadata:\n  version: "4.4${source==='core'?'-core':''}"\n  last_updated: "2026-09-08"\n---\n\n# V4.4 ${source.toUpperCase()} 模块索引\n\n本版只拆分和按需加载文件，以下模块逐字保留 V4.3 原文（包括原版本标签），不修改业务规则。\n运行时依据 modules.json 选择文件；本索引不承载完整规则。\n\n| 模块 | 原章节 | 文件 |\n| --- | --- | --- |\n${modules.map(m=>`| ${m.title} | ${m.chapter} | [原文模块](${m.path.replace('knowledge/','')}) |`).join('\n')}\n`;
 writeFileSync(join(root,`knowledge/${source.toUpperCase()}.md`),index);
}
writeFileSync(catalogPath,JSON.stringify(catalog,null,2)+'\n',{flag:'wx'});
console.log(`V4.4：${catalog.modules.length} 个独立模块，逐字还原 V4.3 校验通过。`);
