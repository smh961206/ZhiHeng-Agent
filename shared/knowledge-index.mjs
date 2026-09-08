export function indexRules(text,source){
 const lines=text.split(/\r?\n/),headings=[];let fenced=false;
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
