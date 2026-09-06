// Presentation only: a readable preview is still an unreviewed draft, never a final report.
export function reportPreview(raw,plan,depth=0){
 if(typeof raw!=='string'||depth>3)return '';
 let body=raw,probe=body.trimStart();
 if(!probe||/^(?:`{1,2}|~{1,2})$/.test(probe))return '';
 const fence=/^(`{3,}|~{3,})([^\r\n]*)(?:\r?\n|$)/.exec(probe);
 if(fence){
  // Hold an incomplete opening fence so its language identifier never flashes on screen.
  if(!fence[0].endsWith('\n'))return '';
  const language=fence[2].trim().toLowerCase();
  if(!['','md','markdown','json'].includes(language))return '';
  body=probe.slice(fence[0].length);
  // Also hold a closing fence arriving one character at a time, retaining the preceding newline.
  const marker=fence[1][0];
  body=body.replace(new RegExp('(\\r?\\n)[ \\t]*'+marker+'+[ \\t]*$'),'$1');
  probe=body.trimStart();
 }
 const first=probe[0];
 const structured=first==='{'||first==='"'||/^\[\s*(?:\{|"|\]|$)/.test(probe);
 if(!structured)return body;
 // Incomplete structured responses stay hidden until their report text can be decoded.
 const last=probe.trimEnd().at(-1),closing={'{':'}','[':']','"':'"'}[first];
 if(last!==closing)return '';
 let value;try{value=JSON.parse(probe);}catch{return '';}
 if(typeof value==='string')return reportPreview(value,plan,depth+1);
 if(!value||Array.isArray(value)||typeof value!=='object')return '';
 if(typeof value.report==='string')return reportPreview(value.report,plan,depth+1);
 if(!Array.isArray(value.sections))return '';
 const expected=plan?.output?.sections;
 const sections=expected?.length?expected.map(section=>({...section,text:value.sections.find(item=>item?.id===section.id)?.text})):value.sections;
 return sections.flatMap(section=>{
  const content=reportPreview(section?.text,plan,depth+1);
  if(!content.trim())return [];
  const title=expected?.find(item=>item.id===section.id)?.title||'研究内容';
  return ['## '+title+'\n\n'+content];
 }).join('\n\n');
}
