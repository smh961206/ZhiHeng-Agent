import {useEffect,useId,useRef,useState} from 'react';
import {AlertCircle,Check,ChevronDown,FileSpreadsheet,FileText,Image as ImageIcon,LoaderCircle,Pencil,Plus,Presentation,RotateCcw,ShieldCheck,Trash2,Undo2,UploadCloud} from 'lucide-react';
import {Button} from './ui/button';
import {Textarea} from './ui/textarea';
import {Input} from './ui/input';
import {Tabs,TabsList,TabsTrigger,TabsContent} from './ui/tabs';
import {materialLimits,normalizeReferenceMaterials} from '../../shared/reference-materials.mjs';
import {materialFileAccept,readMaterialFile} from '../lib/material-file.mjs';
import {isMaterialImage} from '../lib/material-image.mjs';
import MaterialEditor from './MaterialEditor';
import MaterialPreview from './MaterialPreview';
import './research-materials.css';

const number=value=>value.toLocaleString();
const fileSize=bytes=>bytes<1024?`${bytes} B`:bytes<1024*1024?`${(bytes/1024).toFixed(1)} KB`:`${(bytes/1024/1024).toFixed(1)} MB`;
function materialIcon(title){return isMaterialImage(title)?ImageIcon:/\.(xlsx|csv|tsv)$/i.test(title)?FileSpreadsheet:/\.pptx$/i.test(title)?Presentation:FileText;}
function materialReadingLabel(item,imageAsset){
 if(item.visualAttachment)return '原页已关联 · 仍需核对';
 if(item.text.startsWith('处理提示：后端文档处理未完成，已回退为'))return '文字已保留 · 图像待核对';
 return imageAsset||isMaterialImage(item.title)?'图片文字已识别 · 请核对':'正文已整理 · 作为待核实线索';
}
export default function ResearchMaterials({value=[],onChange,disabled=false,onReadingChange,onPendingChange,text='',setText,title='',setTitle,editDraft=null,setEditDraft}){
 const [error,setError]=useState(''),[reading,setReading]=useState(false),[dragging,setDragging]=useState(false);
 const [tab,setTab]=useState(text.trim()||title?'paste':'files'),[queue,setQueue]=useState([]),[notice,setNotice]=useState(''),[showResults,setShowResults]=useState(false);
 const [undo,setUndo]=useState(null),[imageAssets,setImageAssets]=useState([]);
 const imageAssetsRef=useRef(imageAssets);imageAssetsRef.current=imageAssets;
 const editItem=editDraft&&value[editDraft.index];
 const editing=editItem&&editItem.title===editDraft.originalTitle&&editItem.text===editDraft.originalText?{item:editItem,index:editDraft.index}:null;
 const hasEdit=!!editing;
 const files=useRef(null),savedList=useRef(null),alive=useRef(true),active=useRef(null),dragDepth=useRef(0),currentValue=useRef(value);
 const titleId=useId(),bodyId=useId();currentValue.current=value;
 const pending=disabled||reading||!!editing,full=value.length>=materialLimits.count,total=value.reduce((sum,item)=>sum+item.text.length,0);
 const remaining=materialLimits.totalCharacters-total,draftLimit=Math.min(materialLimits.characters,remaining);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;active.current?.abort();onReadingChange?.(false);onPendingChange?.(false);};},[onReadingChange,onPendingChange]);
 useEffect(()=>{onPendingChange?.(Boolean(text.trim())||hasEdit);},[text,hasEdit,onPendingChange]);
 useEffect(()=>{if(editDraft&&!hasEdit)setEditDraft(null);if(undo&&value!==undo.after)setUndo(null);},[value,editDraft,hasEdit,undo,setEditDraft]);
 useEffect(()=>()=>{imageAssetsRef.current.forEach(asset=>URL.revokeObjectURL(asset.url));},[]);
 useEffect(()=>{setImageAssets(current=>{
  const keep=current.filter(asset=>[...value,...(undo?[undo.item]:[])].some(item=>item.title===asset.title&&item.text===asset.text));
  current.filter(asset=>!keep.includes(asset)).forEach(asset=>URL.revokeObjectURL(asset.url));
  return keep.length===current.length?current:keep;
 });},[value,undo]);
 function beginEdit(item,index){setEditDraft({index,originalTitle:item.title,originalText:item.text,title:item.title,text:item.text});setError('');}
 function finishEditing(index){setEditDraft(null);requestAnimationFrame(()=>{const preview=savedList.current?.querySelector(`[data-material-index="${index}"] details`);if(preview){preview.open=true;preview.querySelector('summary')?.focus();}});}
 function saveEdit(item){
  if(value.some((saved,index)=>index!==editing.index&&saved.text===item.text))throw new Error('相同内容已存在于其他资料中，请核对后修改');
  if(item.text!==editing.item.text){item={...item};delete item.visualAttachment;}
  const next=normalizeReferenceMaterials(value.map((saved,index)=>index===editing.index?item:saved));
  setImageAssets(current=>current.map(asset=>asset.title===editing.item.title&&asset.text===editing.item.text?{...asset,title:item.title,text:item.text}:asset));
  onChange(next);setError('');setNotice(`已保存「${item.title}」`);finishEditing(editing.index);
 }
 function removeMaterial(index){
  const item=value[index],next=normalizeReferenceMaterials(value.filter((_,i)=>i!==index));
  onChange(next);setUndo({item,index,after:next});setNotice(`已移除「${item.title}」`);setError('');
 }
 function undoRemoval(){
  if(pending||!undo||value!==undo.after)return;
  try{const next=[...value];next.splice(undo.index,0,undo.item);onChange(normalizeReferenceMaterials(next));setNotice(`已恢复「${undo.item.title}」`);setUndo(null);setError('');}
  catch(error){setError(error.message);}
 }
 function addText(){
  if(pending||full||!text.trim())return;
  try{
   const item={title:title.trim()||`补充资料 ${value.length+1}`,text:text.trim()};
   if(value.some(saved=>saved.text===item.text))throw new Error('这段内容已经加入资料，无需重复添加');
   onChange(normalizeReferenceMaterials([...value,item]));setText('');setTitle('');setError('');setNotice(`已加入「${item.title}」`);
  }catch(error){setError(error.message);}
 }
 async function importFiles(selected,retryIndexes=null){
  if(pending||active.current||(!selected.length&&!retryIndexes?.length))return;
  if(full){setError('已达到 6 份上限，请移除部分资料后再导入');return;}
  const control=new AbortController();active.current=control;
  const snapshot=value,items=[...value],images=[],jobs=retryIndexes?queue.map((job,index)=>retryIndexes.includes(index)?{...job,status:'waiting',message:'等待重新上传',retryable:false}:job):selected.slice(0,20).map(file=>({file,status:'waiting',message:'排队中，尚未上传'}));
  const skipped=selected.length-jobs.length;
  setQueue(jobs);setShowResults(true);setError(skipped?`单次最多处理 20 个文件，另 ${skipped} 个请分批选择。`:'');
  setReading(true);onReadingChange?.(true);setNotice('');setDragging(false);
  const update=(index,status,message,retryable=false)=>{jobs[index]={...jobs[index],status,message,retryable};if(alive.current)setQueue([...jobs]);};
  try{
   for(let index=0;index<jobs.length;index++){
    if(control.signal.aborted)break;
    if(jobs[index].status!=='waiting')continue;
    if(items.length>=materialLimits.count){update(index,'error','已达到 6 份上限，移除部分资料后可重试',true);continue;}
    update(index,'reading','准备上传原文件…');
    const fileControl=new AbortController(),cancelFile=()=>fileControl.abort();
    control.signal.addEventListener('abort',cancelFile,{once:true});
    const timer=setTimeout(()=>fileControl.abort(),150000);
    let rejectOnAbort;
    try{
     const aborted=new Promise((_,reject)=>{rejectOnAbort=()=>reject(new Error(control.signal.aborted?'导入已取消，可点击重试继续':'文件处理超时，请精简后重试'));fileControl.signal.addEventListener('abort',rejectOnAbort,{once:true});});
     const item=await Promise.race([readMaterialFile(jobs[index].file,{signal:fileControl.signal,onProgress:message=>{if(!fileControl.signal.aborted&&alive.current)update(index,'reading',message);}}),aborted]);
     if(!alive.current||currentValue.current!==snapshot)return;
     if(items.some(saved=>saved.text===item.text))throw new Error('相同内容已加入，已跳过重复文件');
     const normalized=normalizeReferenceMaterials([...items,item]);items.splice(0,items.length,...normalized);
     if(item.imageFile)images.push({title:item.title,text:item.text,file:item.imageFile});
     const processingNotice=item.processing?.notice||(item.text.startsWith('处理提示：后端文档处理未完成，已回退为')?'已保留提取文字，图像内容尚未完成 Vision 核对':'');
     update(index,'success',`${number(item.text.length)} 字 · 已加入${processingNotice?' · '+processingNotice:''}`);
    }catch(error){if(!alive.current)return;update(index,'error',error.message||'文件读取失败，请重新保存后重试',error.retryable||fileControl.signal.aborted||/fetch|network|加载|读取失败|识别失败|合计最多/i.test(error.message??''));}
    finally{clearTimeout(timer);fileControl.signal.removeEventListener('abort',rejectOnAbort);control.signal.removeEventListener('abort',cancelFile);}
   }
   if(!alive.current||currentValue.current!==snapshot)return;
   for(let index=0;index<jobs.length;index++)if(jobs[index].status==='waiting')update(index,'error','尚未导入，可点击重试继续',true);
   if(items.length>snapshot.length)onChange(items);
   if(images.length)setImageAssets(current=>[...current,...images.map(({title,text,file})=>({title,text,url:URL.createObjectURL(file)}))]);
   const added=items.length-snapshot.length,failed=jobs.filter(item=>item.status==='error').length;
   setShowResults(failed>0);
   setNotice(`${added?`已加入 ${added} 份资料`:'未加入新资料'}${failed?`，${failed} 个文件未导入，请查看处理结果`:''}`);
  }finally{if(active.current===control)active.current=null;if(alive.current){setReading(false);onReadingChange?.(false);}}
 }
 function receiveDrop(event){event.preventDefault();dragDepth.current=0;setDragging(false);if(!pending)void importFiles([...event.dataTransfer.files]);}
 function retryFiles(indexes){void importFiles([],indexes);}
 function receivePaste(event){
  const images=[...(event.clipboardData?.items??[])].filter(item=>item.kind==='file'&&item.type.startsWith('image/')).map(item=>item.getAsFile()).filter(Boolean);
  if(!images.length)return;event.preventDefault();
  if(pending){setError('请先完成当前的导入或编辑，再粘贴截图。');return;}
  setTab('files');void importFiles(images.map((file,index)=>{
   const extension=isMaterialImage(file.name)?file.name.split('.').at(-1).toLowerCase():file.type==='image/jpeg'?'jpg':file.type.split('/').at(-1);
   return new File([file],`粘贴截图 ${value.length+index+1}.${extension}`,{type:file.type});
  }));
 }
 return <section className="research-materials" aria-label="用户补充资料" aria-busy={reading} onPaste={receivePaste}>
  <div className="field-heading"><h3><span className="materials-heading-icon"><FileText size={17}/></span>补充资料<span className="materials-optional">选填</span></h3><span className={full?'materials-at-limit':''}>{value.length} / 6 份</span></div>
  <p className="materials-intro">上传报告、表格或截图，系统会整理内容，供本次研究参考。</p>
  <input ref={files} type="file" accept={materialFileAccept} multiple hidden disabled={pending||full} aria-label="选择补充资料文件" onChange={event=>{const selected=[...event.target.files];event.target.value='';void importFiles(selected);}}/>
  <Tabs value={tab} onValueChange={setTab} className="materials-tabs">
   <TabsList aria-label="添加资料方式"><TabsTrigger value="files"><UploadCloud size={15}/>导入文件</TabsTrigger><TabsTrigger value="paste"><FileText size={15}/>粘贴文字{text.trim()&&<span className="materials-draft-dot" aria-label="有未加入的文字"/>}</TabsTrigger></TabsList>
   <TabsContent value="files">
    <div role="group" aria-label="导入文件或粘贴图片" tabIndex={pending||full?-1:0} aria-disabled={pending||full} onClick={event=>{if(!pending&&!full&&!event.target.closest('button'))files.current?.click();}} onKeyDown={event=>{if(event.target===event.currentTarget&&['Enter',' '].includes(event.key)){event.preventDefault();event.stopPropagation();if(!pending&&!full)files.current?.click();}}} className={`materials-dropzone${value.length?' is-compact':''}${dragging?' is-dragging':''}${pending||full?' is-disabled':''}`} onDragEnter={event=>{event.preventDefault();if(event.dataTransfer.types.includes('Files')){dragDepth.current++;if(!pending&&!full)setDragging(true);}}} onDragOver={event=>{event.preventDefault();event.dataTransfer.dropEffect=pending||full?'none':'copy';}} onDragLeave={event=>{event.preventDefault();if(--dragDepth.current<=0){dragDepth.current=0;setDragging(false);}}} onDrop={receiveDrop}>
     <span className="materials-upload-icon">{reading?<LoaderCircle size={23} className="animate-spin"/>:<UploadCloud size={23}/>}</span>
     <strong>{reading?'正在处理你的资料…':full?'资料名额已满':dragging?'松开即可添加资料':'拖入文件或图片，也可直接粘贴截图'}</strong>
     <span className="materials-format-chips"><span><FileText size={13}/>报告文档</span><span><FileSpreadsheet size={13}/>财务表格</span><span><ImageIcon size={13}/>截图与照片</span></span>
     <Button type="button" variant="outline" size="sm" disabled={pending||full} onClick={()=>files.current?.click()}><Plus size={15}/>选择文件</Button>
     <small>单份不超过 10 MB · 最多 6 份 · 支持多选</small>
    </div>
    <div className="materials-import-help">
     <details className="materials-format-help"><summary><span><ShieldCheck size={14}/>格式与限制</span><ChevronDown size={14}/></summary>
      <p><strong>支持格式</strong><br/>PDF、DOCX、XLSX、PPTX；TXT、Markdown、CSV、TSV、JSON；PNG、JPG、JPEG、WebP、BMP。</p>
      <p><strong>读取范围</strong><br/>PDF 最多 100 页，每份最多补读 2 页原图；其余页面按后端文字提取情况提供。Office 内嵌图片可单独导入。文本支持 UTF-8、带 BOM 的 UTF-16 和 GB18030。</p>
      <p><strong>失败后如何继续</strong><br/>后端未完成处理时，可在当前页面重试原文件；刷新或离开后需重新选择文件。浏览器不会自行提取文字或识别图片。</p>
     </details>
    </div>
   </TabsContent>
   <TabsContent value="paste">
    <div className="materials-editor">
     <label htmlFor={titleId}>资料名称 <span>选填，方便之后查找</span></label><Input id={titleId} aria-label="补充资料名称" placeholder="例如：2025 年报阅读笔记" maxLength={200} value={title} disabled={pending||full} onChange={event=>setTitle(event.target.value)}/>
     <label className="sr-only" htmlFor={bodyId}>补充资料正文</label><Textarea id={bodyId} aria-label="补充资料正文" value={text} disabled={pending} onChange={event=>setText(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)&&!event.nativeEvent.isComposing){event.preventDefault();event.stopPropagation();addText();}}} placeholder="粘贴已有材料、研究假设或需要重点核对的段落…"/>
     <div className="materials-editor-footer"><span className={text.length>draftLimit?'materials-over-limit':''}>{number(text.length)} / {number(draftLimit)} 字</span><div><Button type="button" variant="ghost" size="sm" disabled={pending||!text} onClick={()=>{setText('');setError('');}}>清空文字</Button><Button type="button" size="sm" disabled={pending||full||!text.trim()||text.length>draftLimit} onClick={addText}><Plus size={15}/>加入资料</Button></div></div>
     {text.length>draftLimit&&<p className="materials-draft-limit" role="alert">还需精简 {number(text.length-draftLimit)} 字{draftLimit<materialLimits.characters?'，或先精简已加入的资料':''}。</p>}
    </div>
   </TabsContent>
  </Tabs>
  {text.trim()&&<p className="materials-pending" role="status"><AlertCircle size={14}/><span>有文字尚未加入，请加入资料或清空后开始研究。{tab==='files'&&<Button type="button" variant="link" size="sm" onClick={()=>setTab('paste')}>继续编辑</Button>}</span></p>}
  {editing&&<p className="materials-pending" role="status"><Pencil size={14}/><span>正在编辑「{editing.item.title}」，请保存修改或取消编辑后开始研究。</span></p>}
  {error&&<p className="materials-error" role="alert"><AlertCircle size={15}/><span>{error}</span></p>}
  {queue.length>0&&<div className={`materials-import-results${reading?' is-processing':queue.some(job=>job.status==='error')?' has-errors':' is-complete'}`}><div className="materials-queue-heading"><span>{reading?`文件处理进度 · ${queue.filter(job=>['success','error'].includes(job.status)).length} / ${queue.length}`:`本次导入 · ${queue.filter(job=>job.status==='success').length} 个已加入${queue.some(job=>job.status==='error')?` · ${queue.filter(job=>job.status==='error').length} 个未导入`:''}`}</span><div>{!reading&&queue.some(job=>job.retryable)&&<Button type="button" variant="ghost" size="sm" disabled={pending||full} onClick={()=>retryFiles(queue.flatMap((job,index)=>job.retryable?[index]:[]))}><RotateCcw size={12}/>重试未完成</Button>}{reading?<Button type="button" variant="ghost" size="sm" onClick={()=>active.current?.abort()}>取消导入</Button>:<Button type="button" variant="ghost" size="sm" aria-expanded={showResults} aria-controls={`${bodyId}-results`} onClick={()=>setShowResults(current=>!current)}>{showResults?'收起':'查看处理结果'}<ChevronDown size={13} className={showResults?'is-expanded':''}/></Button>}</div></div>{reading&&<><progress className="materials-import-progress" aria-label="文件处理进度" max={queue.length} value={queue.filter(job=>['success','error'].includes(job.status)).length}/><p className="materials-queue-note" role="status">文件正逐个上传与读取，进度按已处理文件数统计。请保持当前页面，取消后已加入的资料会保留。</p></>}{!reading&&queue.some(job=>job.status==='error')&&<p className="materials-queue-note">{full?'资料名额已满，请先移除已加入的资料，再重试。':'已加入的资料不受影响。可逐个重试，或移除不再需要的待处理文件。'}<span>待处理原文件仅保留在当前页面，刷新后需重新选择。</span></p>}<ul id={`${bodyId}-results`} hidden={!reading&&!showResults} aria-label="文件处理结果">{queue.map((job,index)=><li key={index} className={`materials-import-${job.status}`}>
   {job.status==='reading'?<LoaderCircle size={15} className="animate-spin"/>:job.status==='success'?<Check size={15}/>:job.status==='error'?<AlertCircle size={15}/>:<FileText size={15}/>}<span className="materials-job-content"><strong>{job.file.name}</strong><span className="materials-job-meta"><em>{fileSize(job.file.size)}</em><span className={`materials-job-status is-${job.status}`}>{job.status==='reading'?'处理中':job.status==='success'?'已加入':job.status==='error'?'未导入':'待上传'}</span></span><small>{job.message}</small>{!reading&&job.status==='error'&&<span className="materials-job-actions">{job.retryable&&<Button type="button" variant="outline" size="sm" disabled={pending||full} aria-label={`重试：${job.file.name}`} onClick={()=>retryFiles([index])}><RotateCcw size={13}/>重试此文件</Button>}<Button type="button" variant="ghost" size="sm" disabled={pending} aria-label={`移除待处理文件：${job.file.name}`} onClick={()=>{setQueue(current=>current.filter((_,i)=>i!==index));setNotice(`已移除待处理文件「${job.file.name}」，已加入的资料不受影响`);}}><Trash2 size={13}/>移除</Button></span>}</span>
  </li>)}</ul></div>}
  <div className="materials-feedback"><div className="materials-live-status" role="status" aria-live="polite">{notice}</div>{undo&&<Button type="button" variant="link" size="sm" disabled={pending} onClick={undoRemoval}><Undo2 size={13}/>撤销移除</Button>}</div>
  {value.length>0&&<div className="materials-saved" ref={savedList}><div className="materials-list-heading"><strong>已加入的资料 <span>{value.length}</span></strong><span>{number(total)} / 60,000 字</span></div><meter className="materials-capacity" aria-label="资料总字数" min={0} max={materialLimits.totalCharacters} value={total}/><p className="materials-capacity-help">{full?'已满 6 份，可编辑或移除现有资料':`还可加入 ${materialLimits.count-value.length} 份 · 剩余 ${number(remaining)} 字`}</p><ul aria-label="已加入的资料">{value.map((item,index)=>{const Icon=materialIcon(item.title),imageAsset=imageAssets.find(asset=>asset.title===item.title&&asset.text===item.text);return <li key={`${item.id}-${item.title}`} data-material-index={index}>
   {editing?.item===item?<MaterialEditor item={item} draft={editDraft} onDraftChange={setEditDraft} remaining={remaining+item.text.length} disabled={disabled||reading} onSave={saveEdit} onCancel={()=>finishEditing(index)}/>:<><details className="material-preview"><summary><span className={`material-file-icon${imageAsset?' is-image':''}`}>{imageAsset?<img src={imageAsset.url} alt=""/>:<Icon size={18}/>}</span><span className="material-summary"><strong>{item.title}</strong><small>{number(item.text.length)} 字 · {materialReadingLabel(item,imageAsset)}</small></span><ChevronDown size={15} className="material-preview-chevron"/></summary><MaterialPreview item={item} imageUrl={imageAsset?.url} disabled={pending} onEdit={()=>beginEdit(item,index)}/></details><Button className="material-remove" type="button" variant="ghost" size="icon" disabled={pending} aria-label={`移除资料：${item.title}`} onClick={()=>removeMaterial(index)}><Trash2 size={15}/></Button></>}
  </li>;})}</ul></div>}
  <div className="materials-footnote"><ShieldCheck size={14}/><p>每份文字最多 2 万字，合计 6 万字。补充资料作为研究线索，图片识别结果与财务数据仍需核对原件。</p></div>
 </section>;
}
