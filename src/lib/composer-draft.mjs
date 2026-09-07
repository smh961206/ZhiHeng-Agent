import {normalizeReferenceMaterials} from '../../shared/reference-materials.mjs';
import {portfolioFields} from '../../shared/research-framework.mjs';
const key='zhiheng:composer:v1';
const fields={question:10000,portfolio:20000,previousResearch:30000,materialDraft:20000,materialDraftTitle:200};
export function composerDraft(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('草稿格式无效');
 const result={};
 for(const [field,limit] of Object.entries(fields)){
  const text=value[field]??'';if(typeof text!=='string'||text.length>limit)throw new Error('草稿字段超限');result[field]=text;
 }
 result.mode=['auto','A','B','C','D','E','F'].includes(value.mode)?value.mode:'auto';
 result.depth=['Quick','Standard','Deep'].includes(value.depth)?value.depth:'Standard';
 result.historyYears=[3,5,8].includes(value.historyYears)?value.historyYears:5;
 result.baselineJobId=typeof value.baselineJobId==='string'&&value.baselineJobId.length<=36?value.baselineJobId:'';
 result.contextOpen=Boolean(value.contextOpen);
 result.portfolioContext=Object.fromEntries(Object.entries(value.portfolioContext??{}).filter(([key,text])=>portfolioFields.some(field=>field.id===key)&&typeof text==='string'&&text.length<=4000));
 result.referenceMaterials=normalizeReferenceMaterials(value.referenceMaterials??[]);
 result.materialEditDraft=null;
 if(value.materialEditDraft!=null){
  const draft=value.materialEditDraft,item=result.referenceMaterials[draft.index];
  // An edit can only be restored against the exact material it was made from.
  if(Number.isInteger(draft.index)&&item&&draft.originalTitle===item.title&&draft.originalText===item.text){
   if(typeof draft.title!=='string'||draft.title.length>200||typeof draft.text!=='string'||draft.text.length>60000)throw new Error('资料编辑草稿超限');
   result.materialEditDraft={index:draft.index,originalTitle:item.title,originalText:item.text,title:draft.title,text:draft.text};
  }
 }
 result.manual=Boolean(value.manual);
 if(value.securities?.length>3)throw new Error('草稿标的超限');
 result.securities=Array.isArray(value.securities)?value.securities.filter(item=>item&&['CN','HK','US'].includes(item.market)&&typeof item.symbol==='string'&&item.symbol.length<=20).map(({market,symbol})=>({market,symbol})):[];
 return result;
}
export function loadComposerDraft(storage){
 try{
  const raw=(storage??globalThis.sessionStorage).getItem(key);if(!raw||raw.length>600000)return null;
  const saved=JSON.parse(raw);if(saved.version!==1||!Number.isFinite(saved.savedAt)||Date.now()-saved.savedAt>86400000)return null;
  return composerDraft(saved.input);
 }catch{return null;}
}
export function saveComposerDraft(input,storage){
 const store=storage??globalThis.sessionStorage,draft=composerDraft(input);
 const filled=Object.keys(fields).some(field=>draft[field].trim())||draft.referenceMaterials.length||Object.keys(draft.portfolioContext).length||draft.securities.length||draft.baselineJobId;
 if(!filled){store.removeItem(key);return false;}
 store.setItem(key,JSON.stringify({version:1,savedAt:Date.now(),input:draft}));return true;
}
export function clearComposerDraft(storage){(storage??globalThis.sessionStorage).removeItem(key);}
