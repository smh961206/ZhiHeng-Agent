export const materialSearchLimit=500;
export function findMaterialMatches(text,query){
 const term=query.trim();if(!term)return {matches:[],truncated:false};
 const pattern=new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'giu');
 const matches=[];let match;
 while((match=pattern.exec(text))!==null){
  if(matches.length===materialSearchLimit)return {matches,truncated:true};
  matches.push({start:match.index,end:match.index+match[0].length});
 }
 return {matches,truncated:false};
}
