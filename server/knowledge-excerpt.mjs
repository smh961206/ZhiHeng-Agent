import {createHash} from 'node:crypto';
import {createSnapshotManager} from './knowledge-snapshots.mjs';
import {ruleUsage} from '../shared/research-knowledge.mjs';
const hash=text=>createHash('sha256').update(text).digest('hex');
const fail=(status,message)=>Object.assign(new Error(message),{status});

// Accept a saved receipt key, never a caller-supplied file path or range.
export function knowledgeExcerpt(job,key,{manager}={}){
 if(!job)throw fail(404,'任务不存在');
 const usage=ruleUsage(job),record=usage.records.find(row=>row.key===key);
 if(!record||!usage.snapshot||record.snapshotId!==usage.snapshot.id)throw fail(404,'此任务未保存对应规则的读取记录');
 let snapshot;
 try{snapshot=(manager??createSnapshotManager({version:usage.snapshot.version})).open(usage.snapshot);}catch{throw fail(409,'原规则快照暂不可读取，已保留读取记录，请检查归档后重试');}
 const module=snapshot.catalog.modules.find(m=>m.path===record.path);
 if(!module||module.sha256!==record.sha256)throw fail(409,'读取记录与原规则快照不一致');
 const text=snapshot.read(record.path);
 if(hash(text)!==record.sha256)throw fail(409,'原规则文件未通过完整性校验');
 if(!Number.isSafeInteger(record.line)||record.line<1||!Number.isSafeInteger(record.characters)||record.characters<0||record.characters>text.length)throw fail(409,'读取范围记录无效');
 const normalized=text.split(/\r?\n/).slice(record.line-1,record.sectionEndLine??record.endLine).join('\n').slice(0,record.characters);
 const candidates=[normalized,...(record.line===1?[text.slice(0,record.characters)]:[])];
 const content=candidates.find(value=>hash(value)===record.contentSha256);
 if(content===undefined)throw fail(409,'本次读取内容未通过校验，未使用当前规则替代原文');
 return {key:record.key,heading:record.heading,content,path:record.path,line:record.line,endLine:record.endLine,truncated:record.truncated,snapshot:usage.snapshot,sha256:record.sha256,contentSha256:record.contentSha256};
}
