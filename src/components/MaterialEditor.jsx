import {useId,useState} from 'react';
import {Check} from 'lucide-react';
import {Button} from './ui/button';
import {Input} from './ui/input';
import {Textarea} from './ui/textarea';
import {materialLimits} from '../../shared/reference-materials.mjs';

export default function MaterialEditor({item,draft,onDraftChange,remaining,disabled,onSave,onCancel}){
 const {title,text}=draft;const [error,setError]=useState('');
 const id=useId(),limit=Math.min(materialLimits.characters,remaining),over=text.trim().length>limit;
 function save(){
  if(disabled)return;
  try{onSave({...item,title:title.trim(),text:text.trim()});}catch(error){setError(error.message);}
 }
 return <div className="material-inline-editor" role="group" aria-label={`编辑资料：${item.title}`} onKeyDown={event=>{
  if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)&&!event.nativeEvent.isComposing){event.preventDefault();event.stopPropagation();save();}
 }}>
  <label htmlFor={`${id}-title`}>资料名称</label>
  <Input autoFocus id={`${id}-title`} value={title} maxLength={200} disabled={disabled} onChange={event=>{onDraftChange({...draft,title:event.target.value});setError('');}}/>
  <label htmlFor={`${id}-text`}>资料正文</label>
  {item.visualAttachment&&<p className="material-reading-note">仅修改名称会保留原页关联；修改正文后将作为你的核对笔记使用。如需重新读取原页，请重新导入文件。</p>}
  <Textarea id={`${id}-text`} value={text} disabled={disabled} aria-invalid={over||undefined} aria-describedby={`${id}-count`} onChange={event=>{onDraftChange({...draft,text:event.target.value});setError('');}}/>
  <div className="material-edit-count" id={`${id}-count`}><span className={over?'materials-over-limit':''}>{text.trim().length.toLocaleString()} / {limit.toLocaleString()} 字</span><span>保存后用于本次研究</span></div>
  {error&&<p role="alert">{error}</p>}
  {over&&<p role="alert">还需精简 {(text.trim().length-limit).toLocaleString()} 字才能保存。</p>}
  <div className="material-edit-actions"><Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={onCancel}>取消编辑</Button><Button type="button" size="sm" disabled={disabled||over||!title.trim()||!text.trim()} onClick={save}><Check size={14}/>保存修改</Button></div>
 </div>;
}
