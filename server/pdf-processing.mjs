import {PARSER_VERSION,positionedRows,rowBlocks,textQuality} from './document-layout.mjs';

const bounded=(value,fallback,min,max)=>Number.isFinite(value)?Math.min(max,Math.max(min,Math.floor(value))):fallback;
export function pageHasVisualContent(operators,OPS,text,pageArea){
 let matrix=[1,0,0,1,0,0],stack=[],substantialImages=0;
 const imageOps=[OPS.paintImageXObject,OPS.paintInlineImageXObject,OPS.paintImageMaskXObject].filter(Number.isInteger);
 for(let i=0;i<operators.fnArray.length;i++){
  const op=operators.fnArray[i],args=operators.argsArray?.[i];
  if(op===OPS.save)stack.push([...matrix]);
  else if(op===OPS.restore)matrix=stack.pop()||[1,0,0,1,0,0];
  else if(op===OPS.transform&&args?.length===6){
   const [a,b,c,d,e,f]=matrix,[g,h,j,k,l,m]=args;
   matrix=[a*g+c*h,b*g+d*h,a*j+c*k,b*j+d*k,a*l+c*m+e,b*l+d*m+f];
  }else if(imageOps.includes(op)){
   const area=Math.abs(matrix[0]*matrix[3]-matrix[1]*matrix[2])/pageArea;
   if(area>=.12)return true;if(area>=.015)substantialImages++;
  }
 }
 return substantialImages>=3||operators.fnArray.filter(op=>op===OPS.constructPath).length>30&&/图|圖|chart|figure|趋势|trend/i.test(text);
}
export function ocrPriority(record,pages,forced=[]){
 if(forced.includes(record.page.page))return -100;
 const {page,status}=record.page;
 const financial=/现金流|資產負債|资产负债|利润表|利潤表|财务报表|財務報表|cash flows|balance sheet|income statement/i.test(record.text);
 return (financial?-20:0)+(['garbled','numeric-only','failed'].includes(status)?0:status==='empty'?5:20)+(page===1||page===pages?30:0);
}
export function shouldUseOCR(native,recognized,forced=false){
 if(!recognized.text?.trim()||['empty','garbled','failed'].includes(recognized.quality?.status))return false;
 // A scanned continuation table can contain only numbers. Preserve them as
 // unverified OCR evidence when native extraction found no useful body text.
 if(recognized.quality?.status==='numeric-only')return ['empty','failed','sparse'].includes(native.status)
  &&recognized.quality.meaningfulCharacters>=35&&recognized.quality.meaningfulCharacters>(native.meaningfulCharacters||0);
 if(native.status==='readable')return forced&&recognized.quality.status==='readable';
 if(recognized.quality?.status==='readable')return true;
 return recognized.quality.meaningfulCharacters>(native.meaningfulCharacters||0);
}

// Read every native page before expensive OCR so recognition timeouts preserve
// already extracted financial statements, including those late in the document.
export async function processPDFDocument(doc,{transform,createOCR,emit,options={},clock=Date.now,OPS={}}){
 const limit=bounded(options.maxPages,600,1,600),maxCharacters=bounded(options.maxCharacters,1_500_000,1,1_500_000);
 const maxOCRPages=options.ocr===false?0:bounded(options.maxOCRPages,4,0,12),ocrBudgetMs=bounded(options.ocrBudgetMs,90000,0,180000);
 const forced=Array.isArray(options.forceOCRPages)?options.forceOCRPages:[];
 const records=[];let usedCharacters=0,attemptedOCR=0,ocrMs=0,ocr;
 const pack=(number,text,rows,quality,method,metadata={},allowance=maxCharacters-usedCharacters)=>{
  const marker=`\n\n【PDF第${number}页${method==='ocr'?' · OCR待核对':''}】\n`;
  const remaining=Math.max(0,allowance-marker.length),clipped=text.length>remaining;
  let rowLength=0;const included=[];
  for(const row of rows){
   const available=remaining-rowLength-(included.length?1:0);
   if(available<=0)break;
   if(row.text.length>available){included.push({text:row.text.slice(0,available),truncated:true});break;}
   rowLength+=row.text.length+(included.length?1:0);included.push(row);
  }
  const blocks=rowBlocks(included,{page:number,method,quality,kind:metadata.ocrLayoutFallback?'paragraphs':'positioned-rows'});
  if(metadata.ocrNumericDisagreement)for(const alternative of metadata.ocrAlternatives||[]){
   if(alternative.variant===metadata.ocrVariant)continue;
   const context=`同页 OCR 的另一份识别结果（${alternative.variant==='original'?'原图':'表格补识别'}），存在数值分歧，须对照原件核对。`;
   const alternativeRows=alternative.text.split(/\r?\n/).filter(text=>text.trim()).map(text=>({text}));
   blocks.push(...rowBlocks(alternativeRows,{page:number,method:'ocr',quality:textQuality(alternative.text),kind:'paragraphs',idPrefix:`p${number}-ocr-${alternative.variant}`,context})
    .map(block=>({...block,ocrAlternative:true,...(alternative.truncated?{truncated:true}:{})})));
  }
  return {page:{page:number,method,...quality,...metadata,...(clipped?{truncated:true,needsReview:true}:{})},text:(marker+text.slice(0,remaining)).slice(0,allowance),documentBlocks:blocks};
 };
 emit({type:'pdf:start',pages:doc.numPages,parserVersion:PARSER_VERSION});
 try{
  for(let number=1;number<=Math.min(doc.numPages,limit)&&usedCharacters<maxCharacters;number++){
   let page,rows=[],text='',quality,error,hasVisualContent=false;
   try{
    page=await doc.getPage(number);const viewport=page.getViewport({scale:1});
    const content=await page.getTextContent();
    rows=positionedRows(content.items.filter(item=>typeof item.str==='string').map(item=>{const t=transform(viewport.transform,item.transform);return {text:item.str,x:t[4],y:t[5],width:item.width,height:item.height||Math.hypot(t[2],t[3])||10};}));
    text=rows.map(r=>r.text).join('\n');quality=textQuality(text);
    if(page.getOperatorList)try{hasVisualContent=pageHasVisualContent(await page.getOperatorList(),OPS,text,viewport.width*viewport.height);}catch{hasVisualContent=true;}
   }catch(e){error=e.message;quality={status:'failed',needsReview:true,characters:0};}
   finally{page?.cleanup();}
   const candidate=quality.status!=='readable'||forced.includes(number);
   const record=pack(number,text,rows,quality,'native',{hasVisualContent,...(error?{error}:{}),...(candidate?{ocrStatus:maxOCRPages?'pending':'disabled'}:{})});
   records.push(record);usedCharacters+=record.text.length;emit({type:'pdf:page',...record});
   if(record.page.truncated)break;
  }
  const candidates=records.filter(r=>r.page.ocrStatus==='pending'&&!r.page.truncated).sort((a,b)=>ocrPriority(a,doc.numPages,forced)-ocrPriority(b,doc.numPages,forced)||a.page.page-b.page.page);
  for(const record of candidates){
   const number=record.page.page;
   if(attemptedOCR>=maxOCRPages||ocrMs>=ocrBudgetMs){
    record.page={...record.page,ocrStatus:'skipped',ocrError:'OCR 页数或时间预算已用尽，保留缺口'};
    emit({type:'pdf:page-update',...record});continue;
   }
   let page,counted=false;const started=clock();
   try{
    page=await doc.getPage(number);ocr??=createOCR();
    const recognized=await ocr.recognize(page,{timeoutMs:Math.min(45000,ocrBudgetMs-ocrMs)});
    if(recognized.engineClosed)ocr=undefined;
    if(!recognized.blank){attemptedOCR++;counted=true;}
    if(shouldUseOCR(record.page,recognized,forced.includes(number))){
     const next=pack(number,recognized.text,recognized.rows,recognized.quality,'ocr',{ocrConfidence:recognized.confidence,ocrStatus:'recognized',
      ocrVariant:recognized.variant,ocrLayoutFallback:recognized.layoutFallback,ocrLayoutConflict:recognized.layoutConflict,ocrNumericDisagreement:recognized.numericDisagreement,
      ocrAlternatives:recognized.alternatives,ocrImageProcessing:recognized.imageProcessing,...(recognized.processingWarning?{ocrWarning:recognized.processingWarning}:{})},maxCharacters-usedCharacters+record.text.length);
     usedCharacters+=next.text.length-record.text.length;Object.assign(record,next);
    }else if(recognized.blank&&record.page.status==='empty')record.page={...record.page,status:'blank',needsReview:false,ocrStatus:'blank'};
    else record.page={...record.page,ocrStatus:'no-improvement',ocrError:'OCR 未获得更可靠的文字，保留原始提取结果'};
   }catch(e){
    if(!counted)attemptedOCR++;record.page={...record.page,ocrStatus:'failed',ocrError:e.message};
    await ocr?.close().catch(()=>{});ocr=undefined;
   }finally{ocrMs+=Math.max(0,clock()-started);page?.cleanup();}
   emit({type:'pdf:page-update',...record});
  }
  for(const record of records.filter(r=>r.page.ocrStatus==='pending')){
   record.page={...record.page,ocrStatus:'skipped',ocrError:'正文字符预算已用尽，保留缺口'};emit({type:'pdf:page-update',...record});
  }
 }finally{await ocr?.close().catch(()=>{});}
 emit({type:'pdf:done',attemptedOCR,ocrMs});
}
