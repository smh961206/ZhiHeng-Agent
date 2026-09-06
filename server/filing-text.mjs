import {Parser} from 'htmlparser2';
import {PARSER_VERSION,plainBlocks,rowBlocks} from './document-layout.mjs';
import {extractInlineXBRL} from './inline-xbrl.mjs';

// Decode entities using a parser and keep table cells separated. No script,
// stylesheet, inline-XBRL hidden facts, or page code is ever executed.
export function extractHTML(html,{maxCharacters=1_500_000}={}){
 const blocks=new Set(['p','div','section','article','h1','h2','h3','h4','h5','h6','tr','table','li','br','hr']);
 const stack=[],links=[],tables=[],tableStack=[];let text='',truncated=false,anchor,structuredCharacters=0;
 const append=value=>{const remaining=maxCharacters-text.length;if(value.length>remaining)truncated=true;if(remaining>0)text+=value.slice(0,remaining);};
 const parser=new Parser({
  onopentag(name,attributes){
   const hidden=stack.at(-1)?.hidden||['head','script','style','noscript','ix:header','ix:hidden'].includes(name)||'hidden' in attributes||/display\s*:\s*none|visibility\s*:\s*hidden/i.test(attributes.style||'');
   stack.push({name,hidden});
   if(hidden)return;
   if(name==='table')tableStack.push({rows:[],context:text.slice(-700),row:null,cell:null});
   const table=tableStack.at(-1);
   if(table&&name==='tr')table.row=[];
   if(table&&(name==='td'||name==='th'))table.cell={text:'',header:name==='th',colspan:Math.min(80,Math.max(1,Number(attributes.colspan)||1)),rowspan:Math.min(100,Math.max(1,Number(attributes.rowspan)||1))};
   if(blocks.has(name))append('\n');if(name==='td'||name==='th')append('\t');
   if(name==='a'&&attributes.href)anchor={href:attributes.href,text:''};
  },
  ontext(value){if(!stack.at(-1)?.hidden){append(value);if(anchor)anchor.text+=value;
   const cell=tableStack.at(-1)?.cell;if(cell&&structuredCharacters<maxCharacters){const kept=value.slice(0,maxCharacters-structuredCharacters);cell.text+=kept;structuredCharacters+=kept.length;}
  }},
  onclosetag(name){
   if(!stack.at(-1)?.hidden){if(blocks.has(name))append('\n');if(name==='a'&&anchor){links.push(anchor);anchor=null;}
    const table=tableStack.at(-1);
    if(table&&(name==='td'||name==='th')&&table.cell){table.row?.push(table.cell);table.cell=null;}
    if(table&&name==='tr'&&table.row){table.rows.push(table.row);table.row=null;}
    if(table&&name==='table'){tableStack.pop();if(table.rows.length)tables.push(table);}
   }
   stack.pop();
  }
 },{decodeEntities:true});
 parser.write(html);parser.end();
 text=text.replace(/\r/g,'').replace(/[ \u00a0]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{3,}/g,'\n\n').trim();
 const tableBlocks=tables.flatMap((table,index)=>{
  const active=new Map(),spans=[];
  const rows=table.rows.map((cells,row)=>{
   const grid=[];for(const [column,span] of active){if(span.end>row)grid[column]=`[跨行单元格见第${span.row+1}行]`;else active.delete(column);}
   let column=0;
   for(const cell of cells){
    while(grid[column]!==undefined)column++;
    if(column>=100)break;
    const value=cell.text.replace(/\s+/g,' ').trim();grid[column]=value;
    if(cell.colspan>1||cell.rowspan>1)spans.push({row:row+1,column:column+1,colspan:cell.colspan,rowspan:cell.rowspan});
    for(let i=0;i<cell.colspan&&column+i<100;i++){
     if(i)grid[column+i]='[跨列]';
     if(cell.rowspan>1)active.set(column+i,{row,end:row+cell.rowspan});
    }column+=cell.colspan;
   }
   return {text:grid.join('\t')};
  });
  const context=[table.context,rows.slice(0,4).map(r=>r.text).join('\n')].join('\n').slice(-1300);
  return rowBlocks(rows,{idPrefix:`table${index+1}`,kind:'html-table',method:'html',context}).map(block=>({...block,spans:spans.filter(s=>s.row>=block.lineStart&&s.row<=block.lineEnd)}));
 });
 const inline=extractInlineXBRL(html);
 return {text,links,truncated,parserVersion:PARSER_VERSION,documentBlocks:[...tableBlocks,...plainBlocks(text,{method:'html'})],...inline,
  coverage:'HTML正文及表格行列提取，跨行跨列显式保留；内嵌XBRL单独核对期间、维度和单位，未识别字段不推断数值'};
}

export function parseTableRows(html){
 const rows=[];let row,cell,anchor;
 const parser=new Parser({
  onopentag(name,attrs){
   if(name==='tr')row={cells:[],links:[]};
   if(row&&(name==='td'||name==='th'))cell={className:attrs.class||'',text:''};
   if(row&&name==='a'&&attrs.href)anchor={href:attrs.href,text:''};
   if(cell&&name==='br')cell.text+=' ';
  },
  ontext(value){if(cell)cell.text+=value;if(anchor)anchor.text+=value;},
  onclosetag(name){
   if((name==='td'||name==='th')&&row&&cell){row.cells.push(cell);cell=null;}
   if(name==='a'&&row&&anchor){row.links.push(anchor);anchor=null;}
   if(name==='tr'&&row){rows.push(row);row=null;cell=null;anchor=null;}
  }
 },{decodeEntities:true});parser.write(html);parser.end();return rows;
}
