import {AlertDialog} from 'radix-ui';
import {Trash2,LoaderCircle} from 'lucide-react';
import {Button} from './ui/button';

export default function DeleteResearchDialog({job,pending,error,onConfirm,onClose}){
 return <AlertDialog.Root open={!!job} onOpenChange={open=>{if(!open&&!pending)onClose();}}>
  <AlertDialog.Portal>
   <AlertDialog.Overlay className="delete-overlay"/>
   <AlertDialog.Content className="delete-dialog" onEscapeKeyDown={event=>{if(pending)event.preventDefault();}}>
    <span className="delete-dialog-icon"><Trash2 size={22}/></span>
    <AlertDialog.Title className="delete-dialog-title">删除这项研究？</AlertDialog.Title>
    <AlertDialog.Description className="delete-dialog-description">
     <span className="delete-question">{job?.question}</span>
     研究报告、审计记录和执行轨迹将一并删除，删除后无法恢复。
    </AlertDialog.Description>
    {error&&<p className="delete-dialog-error" role="alert">{error}</p>}
    <div className="delete-dialog-actions">
     <AlertDialog.Cancel asChild><Button variant="outline" disabled={pending}>保留研究</Button></AlertDialog.Cancel>
     <Button variant="destructive" disabled={pending} onClick={onConfirm}>{pending?<><LoaderCircle size={16} className="animate-spin"/>删除中…</>:<>确认删除</>}</Button>
    </div>
   </AlertDialog.Content>
  </AlertDialog.Portal>
 </AlertDialog.Root>;
}
