import {unzip} from 'fflate';
import {parseDocument,DomUtils} from 'htmlparser2';
import {materialLimits} from './reference-materials.mjs';
const expandedLimit=24*1024*1024;
const elements=(node,name)=>DomUtils.findAll(item=>item.type==='tag'&&item.name.split(':').at(-1)===name,node.children??[]);
const content=node=>node?DomUtils.textContent(node):'';
const xml=bytes=>parseDocument(new TextDecoder('utf-8',{fatal:true}).decode(bytes),{xmlMode:true});
const attr=(node,name)=>Object.entries(node.attribs??{}).find(([key])=>key.split(':').at(-1)===name)?.[1];

export function decodeMaterialText(bytes){
 let text;
 try{
  const encoding=bytes[0]===255&&bytes[1]===254?'utf-16le':bytes[0]===254&&bytes[1]===255?'utf-16be':'utf-8';
  text=new TextDecoder(encoding,{fatal:true}).decode(bytes);
 }catch{
  try{text=new TextDecoder('gb18030',{fatal:true}).decode(bytes);}catch{throw new Error('无法识别文字编码，请另存为 UTF-8 后重试');}
 }
 if(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFD]/.test(text))throw new Error('内容不是可识别的文本，请检查文件格式或编码');
 return text.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
}

function checkedText(text){
 text=text.trim();
 if(!text)throw new Error('未提取到文字，请转为含文字的文档或粘贴正文');
 if(text.length>materialLimits.characters)throw new Error(`提取到 ${text.length.toLocaleString()} 字，超过单份 20,000 字；请精简或拆分后导入`);
 return text;
}

function unpack(bytes,extension){
 let size=0,count=0,limitError;
 const roots={docx:'word/',xlsx:'xl/',pptx:'ppt/'};
 return new Promise((resolve,reject)=>unzip(bytes,{filter:file=>{
  if(!file.name.startsWith(roots[extension])||!(/\.(xml|rels)$/.test(file.name)))return false;
  size+=file.originalSize;count++;
  if(size>expandedLimit||count>1200){limitError=new Error('文档展开后过大或结构过于复杂，请精简后导入');return false;}
  return true;
 }},(error,files)=>limitError?reject(limitError):error?reject(new Error('文档无法打开，请确认文件未损坏、未加密，并另存为受支持的格式')):resolve(files)));
}

export async function extractOfficeText(bytes,extension,{maxCharacters=materialLimits.characters}={}){
 const files=await unpack(bytes,extension);
 const read=path=>{if(!files[path])throw new Error('文档结构不完整，请用 Office 重新保存后导入');return xml(files[path]);};
 // Relationship targets are resolved within the archive only; external links are never fetched.
 const related=(base,relationships,id)=>{
  const link=elements(relationships,'Relationship').find(item=>item.attribs.Id===id);
  if(!link||link.attribs.TargetMode==='External')throw new Error('文档包含无法读取的外部工作表或幻灯片，请转为 PDF');
  return new URL(link.attribs.Target,`https://archive.invalid/${base}`).pathname.slice(1);
 };
 let parts=[];
 if(extension==='docx'){
  const document=read('word/document.xml');
  parts=elements(document,'p').map(paragraph=>{
   // Preserve paragraph/table order and explicit breaks; do not import field instructions.
   const walk=node=>(node.children??[]).map(child=>{
    const name=child.name?.split(':').at(-1);
    if(name==='del')return '';
    if(name==='t')return content(child);
    if(name==='tab')return '\t';
    if(name==='br'||name==='cr')return '\n';
    return walk(child);
   }).join('');
   return walk(paragraph);
  });
 }else if(extension==='pptx'){
  const presentation=read('ppt/presentation.xml'),relationships=read('ppt/_rels/presentation.xml.rels');
  parts=elements(presentation,'sldId').map((slide,index)=>{
   const id=slide.attribs['r:id']??Object.entries(slide.attribs).find(([key])=>key.includes(':')&&key.endsWith(':id'))?.[1];
   const document=read(related('ppt/presentation.xml',relationships,id));
   const text=elements(document,'p').map(p=>elements(p,'t').map(content).join('')).filter(Boolean).join('\n');
   return text?`第 ${index+1} 页\n${text}`:'';
  });
 }else if(extension==='xlsx'){
  const workbook=read('xl/workbook.xml'),relationships=read('xl/_rels/workbook.xml.rels');
  const strings=files['xl/sharedStrings.xml']?elements(read('xl/sharedStrings.xml'),'si').map(si=>elements(si,'t').map(content).join('')):[];
  const worksheets=elements(workbook,'sheet').map(sheet=>{
   const document=read(related('xl/workbook.xml',relationships,attr(sheet,'id')));
   const cells=elements(document,'c').map(cell=>{
    const type=cell.attribs.t,value=content(elements(cell,'v')[0]),formula=content(elements(cell,'f')[0]);
    const text=type==='s'?strings[Number(value)]:type==='inlineStr'?elements(cell,'t').map(content).join(''):type==='b'?(value==='1'?'TRUE':'FALSE'):value;
    if(text===undefined)throw new Error('表格文本索引无效，请重新保存文件');
    if(!text&&!formula)return '';
    return {address:cell.attribs.r??null,value:text||null,...(formula?{formula}:{})};
   }).filter(Boolean);
   return {name:sheet.attribs.name,cells};
  });
  if(!worksheets.some(sheet=>sheet.cells.length))throw new Error('未提取到文字，请转为含文字的文档或粘贴正文');
  parts=[JSON.stringify({format:'spreadsheet-cells',notice:'数值保留原始字符串与单元格地址，未应用日期、百分比等显示格式；公式使用已保存的结果，未重新计算；空值不是零。',worksheets},null,2)];
 }
 const text=parts.filter(Boolean).join('\n\n').trim();
 if(!text)throw new Error('未提取到文字，请转为含文字的文档或粘贴正文');
 if(text.length>maxCharacters)throw new Error(`提取结果超过 ${maxCharacters.toLocaleString()} 字，请精简或拆分后导入`);
 return text;
}
