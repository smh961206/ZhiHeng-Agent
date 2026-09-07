// Evidence layouts are not audited statements. Coordinates preserve observed
// cells; neither values nor missing cells are inferred from alignment.
export const PARSER_VERSION='evidence-10';
export function needsParsingRetry(source){
 const summary=source.qualitySummary||{};
 return !!(source.truncated||summary.unreadPages>0||summary.failedOCRPages?.length||summary.skippedOCRPages?.length||summary.ocrIncompletePages?.length
  ||source.pageQuality?.some(page=>['failed','garbled','empty'].includes(page.status)
   ||(page.status==='numeric-only'&&!(page.method==='ocr'&&page.ocrStatus==='recognized'))
   ||['failed','pending','skipped'].includes(page.ocrStatus)||page.ocrWarning));
}
const round=n=>Math.round(n*10)/10;
export function textQuality(text){
 // Dot leaders in a table of contents are layout, not corrupted text.
 const chars=[...String(text).replace(/[.．·…]{4,}/g,'').replace(/\s/g,'')];
 const checkboxSymbols=chars.filter(c=>/[\uF052\uF0A3]/u.test(c)).length;
 const bad=chars.filter(c=>/[\uFFFD\uE000-\uF8FF\u0000-\u0008]/u.test(c)&&!/[\uF052\uF0A3]/u.test(c)).length;
 const meaningful=chars.filter(c=>/[\p{L}\p{N}]/u.test(c)).length;
 const letters=chars.filter(c=>/\p{L}/u.test(c)).length;
 const status=!chars.length?'empty':bad/Math.max(1,chars.length)>.02||meaningful/chars.length<.35?'garbled':meaningful<35?'sparse':letters<5?'numeric-only':'readable';
 return {status,characters:chars.length,meaningfulCharacters:meaningful,suspiciousCharacters:bad,needsReview:status!=='readable'||bad>0,...(checkboxSymbols?{symbolReview:true}: {})};
}
export function positionedRows(items){
 const rows=[];
 for(const item of items.filter(v=>v.text?.trim()&&[v.x,v.y,v.width,v.height].every(Number.isFinite)).sort((a,b)=>a.y-b.y||a.x-b.x)){
  let row=rows.slice(-4).find(r=>Math.abs(r.y-item.y)<=Math.max(2,Math.min(r.height,item.height)*.35));
  if(!row){row={y:item.y,height:item.height,items:[]};rows.push(row);}
  row.items.push(item);
 }
 return rows.sort((a,b)=>a.y-b.y).map(row=>{
  const cells=[];
  for(const item of row.items.sort((a,b)=>a.x-b.x)){
   const last=cells.at(-1),gap=last?item.x-(last.x+last.width):Infinity;
   const separateNumbers=last&&/[\d)]$/.test(last.text)&&/^[-(\d]/.test(item.text)&&gap>item.height*.3;
   if(last&&!separateNumbers&&gap<Math.max(6,item.height*.7)){
    const separator=gap>Math.max(1,item.height*.18)&&!/[\p{Script=Han}]$/u.test(last.text)&&!/^\p{Script=Han}/u.test(item.text)?' ':'';
    last.text+=separator+item.text;last.width=Math.max(last.width,item.x+item.width-last.x);
   }else cells.push({text:item.text,x:item.x,width:item.width});
  }
  return {y:round(row.y),cells:cells.map(c=>({...c,x:round(c.x),width:round(c.width)})),text:cells.map(c=>c.text).join('\t')};
 });
}
export function rowBlocks(rows,{page,method='native',quality,kind='positioned-rows',idPrefix=page?`p${page}`:'body',maxCharacters=2200,context}={}){
 const blocks=[];
 const heading=context??rows.slice(0,6).map(r=>r.text).join('\n').slice(0,600);
 let index=0;
 while(index<rows.length){
  const start=index;let text='';const positions=[];
  while(index<rows.length){
   const row=rows[index];
   if(text&&text.length+row.text.length+1>maxCharacters)break;
   text+=(text?'\n':'')+row.text.slice(0,12000);
   if(row.cells)positions.push([round(row.y??index),...row.cells.slice(0,80).map(c=>round(c.x??0))]);
   index++;
  }
  const nearby=start?rows.slice(Math.max(0,start-15),start).filter((row,index,array)=>index>=array.length-2||/单位|幣種|币种|千元|百萬|百万|in millions|in thousands|ended|截至/i.test(row.text)).map(row=>row.text).join('\n').slice(-800):'';
  const blockQuality=quality?textQuality([heading,nearby,text].filter(Boolean).join('\n')):undefined;
  const truncated=rows.slice(start,index).some(r=>r.truncated||r.text.length>12000);
  blocks.push({id:`${idPrefix}-b${blocks.length+1}`,kind,page,method,quality:blockQuality?.status,needsReview:!!(blockQuality?.needsReview||method==='ocr'||truncated),...(blockQuality?.symbolReview?{symbolReview:true}:{}),
   lineStart:start+1,lineEnd:index,context:[heading,nearby].filter(Boolean).join('\n'),text,cellPositions:positions.length?positions:undefined,
   ...(truncated?{truncated:true}:{})});
 }
 return blocks;
}
export function plainBlocks(text,{idPrefix='body',...options}={}){
 const rows=String(text).split(/\n+/).filter(s=>s.trim()).flatMap(line=>line.match(/[\s\S]{1,2200}/g)||[]).map(text=>({text}));
 return rowBlocks(rows,{idPrefix,kind:'paragraphs',...options});
}
export function sourceSummary(source){
 const {text,documentBlocks,financialFacts,pageQuality,...metadata}=source;
 return {...metadata,...(documentBlocks?{evidenceBlocks:documentBlocks.length}:{}),...(financialFacts?{structuredFacts:financialFacts.length}:{})};
}
export function usableEvidenceBlock(source,block){
 return !!source&&!source.stale&&!source.legacyParser&&['official-report','official-xbrl','web-evidence'].includes(source.type)
  &&(source.official===true||source.type==='web-evidence'&&source.documentRead&&source.authorityVerified&&source.publishedAt&&!source.metadataWarnings?.length)
  &&!!block&&!!block.method&&!['ocr','vision'].includes(block.method)&&!block.needsReview&&!block.symbolReview&&!block.truncated;
}
export function parsingWarnings(source){
 const warnings=[];
 if(source.visualReading?.notice)warnings.push(source.visualReading.notice);
 if(source.truncated)warnings.push('正文提取未完整完成，保留未读取范围');
 if(source.qualitySummary?.ocrPages)warnings.push(`${source.qualitySummary.ocrPages} 页使用 OCR，识别内容待原件核对，不能单独作为计算依据`);
 if(source.qualitySummary?.ocrDisagreementPages?.length)warnings.push(`OCR 原图与表格补识别存在数值分歧，已保留两种结果，须核对原件：${source.qualitySummary.ocrDisagreementPages.join('、')}`);
 if(source.qualitySummary?.ocrIncompletePages?.length)warnings.push(`OCR 表格补识别未完成，保留原图识别结果：${source.qualitySummary.ocrIncompletePages.join('、')}`);
 if(source.qualitySummary?.symbolReviewPages?.length)warnings.push(`${source.qualitySummary.symbolReviewPages.length} 页含特殊勾选符号，勾选状态须对照原件；其余可读文字保留`);
 if(source.qualitySummary?.unresolvedPages?.length)warnings.push(`PDF 仍有待核对页：${source.qualitySummary.unresolvedPages.join('、')}`);
 else if(source.emptyPages)warnings.push(`${source.emptyPages} 页未获得可读文字`);
 if(source.inlineXbrl?.rejectedFacts)warnings.push(`${source.inlineXbrl.rejectedFacts} 个内嵌 XBRL 字段缺少有效口径或转换不支持，未纳入数值事实`);
 if(source.inlineXbrl?.omittedFacts)warnings.push(`${source.inlineXbrl.omittedFacts} 个内嵌 XBRL 字段超过解析预算，未纳入数值事实`);
 return warnings;
}
export const readableCharacterCount=text=>String(text).replace(/【PDF第\d+页[^】]*】/g,'').replace(/\s/g,'').length;
