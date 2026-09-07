import {plainBlocks} from './document-layout.mjs';
const aliases=[['营业收入','收入','营收','營業收入','revenue','sales'],['净利润','归母净利','淨利潤','年度盈利','本公司權益持有人','netincome','profitloss','net income','n_income_attr_p'],['经营现金流','经营活动','經營活動','operatingactivities','operating activities','n_cashflow_act'],['资本开支','資本開支','購買物業','capex','propertyplantandequipment','c_pay_acq_const_fiolta'],['股本','shares','股数','股數'],['分红','分紅','股息','dividend'],['回购','回購','repurchase'],['权益','權益','equity'],['债务','債務','debt'],['现金','現金','cash'],['应收','應收','accounts_receiv'],['存货','存貨','inventories'],['在建工程','cip'],['合同负债','合同負債','contract_liab']];
export function financialRowBlocks(source){
 if(source.type!=='vendor-financials')return [];
 try{
  const start=source.text.indexOf('\n{');if(start<0)return [];
  const table=JSON.parse(source.text.slice(start));if(!Array.isArray(table.rows))return [];
  return table.rows.map((row,index)=>({id:`financial-row-${index+1}`,kind:'financial-record',method:'vendor-api',needsReview:true,
   context:`证券：${source.security}；接口：${source.api}；币种：${table.currency??'未知'}；单位：${table.unit??'未知'}；金额须对照官方原文，保留报告类型与修订标记，不自动合并。`,
   text:JSON.stringify(row)}));
 }catch{return [];}
}
// Retrieval and calculations must resolve the same stable block identifiers,
// including generated quote, vendor-row and XBRL blocks.
export function evidenceBlocks(source){
 const rows=financialRowBlocks(source);
 const blocks=rows.length?rows:Array.isArray(source.documentBlocks)?source.documentBlocks:plainBlocks(source.text||'',{idPrefix:'legacy'});
 return [...(source.financialFacts||[]).map((fact,index)=>({id:`fact${index+1}`,kind:'xbrl-fact',text:JSON.stringify(fact),method:fact.origin||'xbrl-api',needsReview:fact.needsReview})),...blocks];
}
export function searchEvidence(sources,query,sourceId){
 const input=String(query??'').trim().toLowerCase();if(!input)return [];
 const pages=new Set();
 const q=input.replace(/(?:pdf\s*)?第\s*(\d{1,5})\s*页|\bpage\s+(\d{1,5})\b/g,(_match,cn,en)=>{pages.add(Number(cn||en));return ' ';}).trim();
 const terms=[...new Set([...q.split(/[\s，、,]+/).filter(Boolean),...(q.match(/[\p{Script=Han}]{2,}/gu)||[]).flatMap(t=>Array.from({length:t.length-1},(_,i)=>t.slice(i,i+2))),...aliases.filter(group=>group.some(term=>q.includes(term))).flat()])];
 const chunks=[];
 for(const source of sources.filter(s=>(!sourceId||s.id===sourceId)&&typeof s.text==='string'&&!['search-result','search-summary'].includes(s.type))){
  const entries=evidenceBlocks(source);
  const identifiers=new Map();for(const block of entries)identifiers.set(block.id,(identifiers.get(block.id)||0)+1);
  const duplicateSource=sources.filter(candidate=>candidate.id===source.id).length>1;
  for(const block of entries){
   if(pages.size&&!pages.has(block.page))continue;
   const lower=block.text.toLowerCase();const score=!q&&pages.size?1:terms.reduce((n,t)=>n+(lower.includes(t)?1:0),0);
   if(!score)continue;
   const referenceAmbiguous=duplicateSource||identifiers.get(block.id)>1;
   const text=[referenceAmbiguous?'【引用编号重复，无法唯一定位，须重新核对资料】':'',block.page?`【PDF第${block.page}页${block.method==='ocr'?' · OCR待核对':''}】`:'',block.context&&!block.text.includes(block.context)?`【页首/表头上下文】\n${block.context}`:'',block.text].filter(Boolean).join('\n');
   chunks.push({id:source.id,title:source.title,url:source.url,date:source.date,publishedAt:source.publishedAt,reportPeriod:source.reportPeriod,reportDate:source.reportDate,periodStatus:source.periodStatus,fetchedAt:source.fetchedAt,stale:source.stale,type:source.type,provider:source.provider,official:source.official,authorityVerified:source.authorityVerified,
    blockId:block.id,page:block.page,kind:block.kind,lineStart:block.lineStart,lineEnd:block.lineEnd,method:block.method,needsReview:referenceAmbiguous||block.needsReview,referenceAmbiguous,symbolReview:block.symbolReview,ocrAlternative:block.ocrAlternative,quality:block.quality,truncated:!!(block.truncated||source.truncated&&!source.documentBlocks?.length&&!source.financialFacts?.length),sourceTruncated:!!source.truncated,cellPositions:block.cellPositions,spans:block.spans,text,
    score:score+(block.kind==='xbrl-fact'?.25:block.kind==='html-table'?.1:0)});
  }
 }
 const counts=new Map();return chunks.sort((a,b)=>b.score-a.score).filter(c=>{const n=counts.get(c.id)||0;if(n>=(sourceId?8:2))return false;counts.set(c.id,n+1);return true;}).slice(0,8).map(({score,...rest})=>rest);
}
