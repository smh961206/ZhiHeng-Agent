const parsingPattern=/OCR|PDF\s*仍有待核对页|正文提取未完整|页未获得可读文字|内嵌\s*XBRL|页含特殊勾选符号/;
const documentPattern=/^(.+?)[：:]\s*((?:\d+\s*页使用\s*OCR|PDF\s*仍有待核对页|正文提取未完整|\d+\s*页未获得可读文字|内嵌\s*XBRL|\d+\s*页含特殊勾选符号)[\s\S]*)$/;

export function reportWarningSourceMatches(title,sources=[]){
 const normalize=value=>String(value||'').normalize('NFKC').replace(/\s+/g,'');
 const expected=normalize(title);
 return expected?sources.map((source,index)=>({source,index})).filter(({source})=>normalize(source.title)===expected):[];
}

export function reportWarningGroups(warnings=[]){
 const other=[],groups=new Map();
 let parsingCount=0;
 for(const warning of warnings){
  if(!parsingPattern.test(warning)){other.push(warning);continue;}
  parsingCount++;
  const match=warning.match(documentPattern);
  const title=match?.[1].trim()||'其他解析提示',text=match?.[2]||warning;
  if(!groups.has(title))groups.set(title,{title,items:[]});
  const pages=text.match(/^PDF\s*仍有待核对页[：:]\s*(.+)$/);
  const ocr=text.match(/^(\d+)\s*页使用\s*OCR[，,]\s*识别内容待原件核对[，,]\s*不能单独作为计算依据[。.]?$/);
  groups.get(title).items.push({original:warning,text,kind:pages?'pages':ocr?'ocr':'note',value:pages?.[1]||ocr?.[1]||text});
 }
 return {other,groups:[...groups.values()],parsingCount};
}
