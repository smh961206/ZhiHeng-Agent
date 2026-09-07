export const needsSaveRetry=job=>job?.delivery?.status==='failed'&&job.delivery.recoverable===true;
export const isSavingResult=job=>job?.delivery?.status==='saving';
export function deliveryProgress(job){
 if(isSavingResult(job))return {label:'保存中',title:'正在保存研究结果',text:'正在保存本次报告与执行记录，保存成功后提供正式结果。'};
 if(needsSaveRetry(job))return {label:'待保存',title:job.delivery.targetStatus==='completed'?'研究已复核，结果待保存':'执行记录待保存',text:'可重试保存当前结果，无须重新取数或调用模型。暂存内容仅保留在当前服务中，服务重启可能丢失。'};
 return null;
}
