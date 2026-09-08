// Only annotate references backed by this report's saved source list.
// Preserve the Markdown text and leave code, links and unknown IDs untouched.
export function remarkReportCitations({sourceIds=[],prefix='report'}={}){
 const known=new Set(sourceIds);
 return tree=>{
  let index=0;
  function visit(parent){
   if(['link','linkReference','image','imageReference','code','inlineCode','html'].includes(parent.type)||!parent.children)return;
   parent.children=parent.children.flatMap(node=>{
    if(node.type!=='text'){visit(node);return [node];}
    const parts=[];let end=0;
    for(const match of node.value.matchAll(/\[([A-Z]\d+(?:\s*[,，、;；]\s*[A-Z]\d+)*)\]/g)){
     const ids=match[1].match(/[A-Z]\d+/g);
     if(!ids.some(id=>known.has(id)))continue;
     if(match.index>end)parts.push({type:'text',value:node.value.slice(end,match.index)});
     const tokens=ids.length===1?[match[0]]:match[0].split(/([A-Z]\d+)/);
     for(const [tokenIndex,token] of tokens.entries()){
      if(!token)continue;
      const id=ids.length===1?ids[0]:token;
      const anchor=prefix+'-citation-'+(node.position?.start?.offset!==undefined?`${node.position.start.offset}-${match.index}-${tokenIndex}`:index++);
      parts.push(known.has(id)?{type:'link',url:'#'+anchor,children:[{type:'text',value:token}],data:{hProperties:{id:anchor,'data-evidence-id':id}}}:{type:'text',value:token});
     }
     end=match.index+match[0].length;
    }
    if(!end)return [node];
    if(end<node.value.length)parts.push({type:'text',value:node.value.slice(end)});
    return parts;
   });
  }
  visit(tree);
 };
}
