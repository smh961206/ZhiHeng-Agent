import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {frameworkVersion,knowledgeSources,modes} from '../shared/research-framework.mjs';

export function indexRules(text,source){
 const lines=text.split(/\r?\n/),headings=[];
 let fenced=false;
 lines.forEach((line,index)=>{
  if(/^\s*```/.test(line)){fenced=!fenced;return;}
  const match=!fenced&&line.match(/^(#{1,3})\s+(.+)$/);
  if(match)headings.push({level:match[1].length,title:match[2],line:index+1,index});
 });
 return headings.map((heading,index)=>{
  const end=headings.slice(index+1).find(next=>next.level<=heading.level)?.index??lines.length;
  return {...heading,source,endLine:end,content:lines.slice(heading.index,end).join('\n')};
 });
}
const documents=Object.fromEntries(knowledgeSources.map(source=>{
 const text=readFileSync(new URL('../'+source.path,import.meta.url),'utf8');
 const version=text.match(/^\s+version:\s*"([^"]+)"/m)?.[1];
 if(version?.replace(/-core$/,'')!==frameworkVersion)throw new Error(source.path+' 版本与执行配置不一致，请同步研究框架');
 return [source.id,{...source,text,version,updatedAt:text.match(/^\s+last_updated:\s*"([^"]+)"/m)?.[1],sha256:createHash('sha256').update(text).digest('hex'),sections:indexRules(text,source.path)}];
}));
for(const profile of Object.values(modes))for(const source of knowledgeSources)for(const chapter of profile[source.id+'Chapters']){
 if(!documents[source.id].sections.some(section=>section.level===1&&section.title.startsWith(chapter+'. ')))throw new Error(source.path+' 缺少绑定章节 '+chapter);
}
export const coreRules=documents.core.text;
export const knowledgeManifest=knowledgeSources.map(({id})=>{
 const {path,role,version,updatedAt,sha256}=documents[id];return {id,path,role,version,updatedAt,sha256};
});
export function chapterRules(source,chapter){
 return documents[source].sections.find(section=>section.level===1&&section.title.startsWith(chapter+'. '))?.content||'';
}
export const auditRules=chapterRules('core',13)+'\n\n'+chapterRules('full',16);
export function searchRules(query,{source='full',limit=4,maxChars=24000}={}){
 const terms=String(query).toLocaleLowerCase().split(/[\s，、,]+/).filter(Boolean);
 if(!terms.length)return {sections:[],notice:'请提供规则关键词'};
 const candidates=documents[source].sections.map(section=>({...section,score:terms.reduce((sum,term)=>sum+(section.title.toLocaleLowerCase().includes(term)?30:section.content.toLocaleLowerCase().includes(term)?1:0),0)}))
  .filter(section=>section.score>0).sort((a,b)=>b.score-a.score||b.level-a.level||a.line-b.line);
 const selected=[];let remaining=maxChars;
 for(const candidate of candidates){
  if(selected.length>=limit||remaining<=0)break;
  if(selected.some(item=>candidate.line<=item.endLine&&candidate.endLine>=item.line))continue;
  const content=candidate.content.slice(0,remaining);remaining-=content.length;
  selected.push({source:candidate.source,heading:candidate.title,line:candidate.line,endLine:candidate.endLine,content,truncated:content.length<candidate.content.length});
 }
 return {sections:selected,notice:selected.some(item=>item.truncated)?'部分章节已截断，请用小节标题定向读取':selected.length?'规则来源与行号随内容返回':'未匹配章节，请缩短关键词'};
}
export function planRuleContext(plan){
 const keywords=({A:'Quick Output',B:plan.depth==='Deep'?'Deep Output':plan.depth==='Quick'?'Quick Output':'Standard Output',C:'Update Output',D:'Comparison Output',E:'PORTFOLIO ENGINE',F:'Dividend Output'})[plan.mode];
 return JSON.stringify(searchRules(keywords,{limit:1}));
}
