// Remove only consecutive copies of a heading. Repeated headings after body
// content, quoted material and code samples are distinct and must be preserved.
export function deduplicateReportHeadings(markdown) {
 if(typeof markdown!=='string')return '';
 const lines=markdown.match(/[^\n]*\n|[^\n]+$/g)||[];
 const lineAt=index=>(lines[index]||'').replace(/\r?\n$/,'');
 const blank=line=>/^[ \t]*$/.test(line);
 const divider=line=>/^ {0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$/.test(line);
 const titleKey=value=>{
  let title=value.trim().replace(/[ \t]+/g,' ');
  for(const marker of ['**','__','`'])if(title.startsWith(marker)&&title.endsWith(marker)&&title.length>marker.length*2)title=title.slice(marker.length,-marker.length).trim();
  return title;
 };
 const removed=new Set();
 let previous=null,fence=null;
 for(let i=0;i<lines.length;i++){
  const line=lineAt(i);
  if(fence){
   const closing=/^ {0,3}(`+|~+)[ \t]*$/.exec(line);
   if(closing&&closing[1][0]===fence[0]&&closing[1].length>=fence.length)fence=null;
   continue;
  }
  const opening=/^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
  if(opening&&!(opening[1][0]==='`'&&opening[2].includes('`'))){fence=opening[1];previous=null;continue;}
  const atx=/^ {0,3}#{1,6}(?:[ \t]+(.*)|[ \t]*)$/.exec(line);
  let title=atx?titleKey((atx[1]||'').replace(/[ \t]+#+[ \t]*$/,'')):null;
  let end=i+1;
  // Single-line Setext headings only; do not reinterpret the end of a paragraph.
  if(!atx&&!blank(line)&&!/^ {4}|^\t|^ {0,3}[>#]/.test(line)&&
   (i===0||blank(lineAt(i-1))||previous?.end===i)&&/^ {0,3}(?:=+|-+)[ \t]*$/.test(lineAt(i+1))){
   title=titleKey(line);end=i+2;
  }
  if(title){
   if(previous?.title===title){for(let j=previous.end;j<end;j++)removed.add(j);}
   previous={title,end};i=end-1;
  }else if(!blank(line)&&!divider(line))previous=null;
 }
 return lines.filter((_,index)=>!removed.has(index)).join('');
}

export function reportSectionBody(title,markdown) {
 const heading='## '+title+'\n\n';
 const normalized=deduplicateReportHeadings(heading+markdown.trim());
 return normalized.slice(normalized.indexOf('\n')+1).trim();
}
