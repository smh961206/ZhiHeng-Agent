import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {ArrowDown,ArrowUp,Check,ChevronDown,Copy,Image as ImageIcon,Pencil,Search,X} from 'lucide-react';
import {Button} from './ui/button';
import {Input} from './ui/input';
import {findMaterialMatches} from '../lib/material-search.mjs';

export default function MaterialPreview({item,imageUrl,disabled,onEdit}){
 const [query,setQuery]=useState(''),[active,setActive]=useState(0),[copyStatus,setCopyStatus]=useState('');
 const body=useRef(null),alive=useRef(true),searchId=useId();
 const {matches,truncated}=useMemo(()=>findMaterialMatches(item.text,query),[item.text,query]);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{
  const container=body.current,mark=container?.querySelector('[data-current=true]');
  if(mark)container.scrollTop+=mark.getBoundingClientRect().top-container.getBoundingClientRect().top-container.clientHeight/2;
 },[active,query,item.text]);
 async function copy(){
  try{await navigator.clipboard.writeText(item.text);if(alive.current)setCopyStatus('已复制正文');}
  catch{if(alive.current)setCopyStatus('未能复制，请选中正文后复制。');}
 }
 function move(direction){if(matches.length)setActive(current=>(current+direction+matches.length)%matches.length);}
 const pieces=[];let position=0;
 matches.forEach((match,index)=>{pieces.push(item.text.slice(position,match.start));pieces.push(<mark key={match.start} data-current={index===active} aria-current={index===active?'true':undefined}>{item.text.slice(match.start,match.end)}</mark>);position=match.end;});pieces.push(item.text.slice(position));
 return <div className="material-preview-body">
  {imageUrl&&<details className="material-image-original"><summary><ImageIcon size={14}/>对照原图<ChevronDown size={13}/></summary><div><a href={imageUrl} target="_blank" rel="noopener noreferrer" aria-label={`放大查看：${item.title}`}><img src={imageUrl} alt={`补充资料原图：${item.title}`} loading="lazy"/></a><p>{item.visualAttachment?'原图已归档并关联当前正文，研究时可用于原页复核。此处预览仅在当前页面可用。':'此处原图仅在当前页面预览，研究时使用下方识别文字。'}点击图片可放大查看。</p></div></details>}
  {item.visualAttachment&&<p className="material-reading-note">原页已关联，读取结果仍需核对。可先检查数字、单位和报告期间，再开始研究。</p>}
  <div className="material-preview-toolbar"><span>正文预览</span><div><Button type="button" variant="ghost" size="sm" onClick={copy}>{copyStatus==='已复制正文'?<Check size={13}/>:<Copy size={13}/>}复制正文</Button><Button type="button" variant="outline" size="sm" disabled={disabled} onClick={onEdit}><Pencil size={13}/>编辑资料</Button></div></div>
  <div className="material-search"><div className="material-search-input"><Search size={14} aria-hidden="true"/><Input id={searchId} aria-label={`在${item.title}中查找`} placeholder="查找关键词…" value={query} maxLength={100} onChange={event=>{setQuery(event.target.value);setActive(0);}} onKeyDown={event=>{if(event.key==='Enter'&&!event.nativeEvent.isComposing){event.preventDefault();event.stopPropagation();move(event.shiftKey?-1:1);}if(event.key==='Escape'){event.preventDefault();event.stopPropagation();setQuery('');setActive(0);}}}/>{query&&<Button type="button" variant="ghost" size="icon" aria-label="清空查找" onClick={()=>{setQuery('');setActive(0);document.getElementById(searchId)?.focus();}}><X size={13}/></Button>}</div><div className="material-search-navigation" hidden={!query.trim()}><span role="status" aria-live="polite">{query.trim()?(matches.length?`${active+1} / ${matches.length}${truncated?'+':''}`:'无匹配'):'查找正文'}</span><Button type="button" variant="ghost" size="icon" aria-label="上一处匹配" disabled={!matches.length} onClick={()=>move(-1)}><ArrowUp size={14}/></Button><Button type="button" variant="ghost" size="icon" aria-label="下一处匹配" disabled={!matches.length} onClick={()=>move(1)}><ArrowDown size={14}/></Button></div></div>
  {truncated&&<p className="material-search-hint">匹配较多，仅定位前 500 处。可输入更完整的关键词缩小范围。</p>}
  <pre ref={body} tabIndex={0} aria-label={`${item.title}正文预览`}>{pieces}</pre>
  <span className="material-copy-status" role="status">{copyStatus}</span>
 </div>;
}
