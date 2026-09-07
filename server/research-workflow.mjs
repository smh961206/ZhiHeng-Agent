import {researchStages} from '../shared/research-framework.mjs';
export function updateStage(job,id,status,emit){
 job.workflow??={stages:researchStages.map(stage=>({...stage,status:'pending'}))};
 const stage=job.workflow.stages.find(stage=>stage.id===id);
 if(!stage)throw new Error('未知研究阶段');
 const now=new Date().toISOString();
 if(status==='running'&&!stage.startedAt)stage.startedAt=now;
 if(status==='running')delete stage.finishedAt;
 stage.status=status;
 if(['completed','partial','skipped','failed','cancelled'].includes(status))stage.finishedAt=now;
 job.workflow.updatedAt=now;
 emit('workflow','研究阶段已更新',{workflow:structuredClone(job.workflow)});
}
export function interruptWorkflow(job,status){
 if(!job.workflow)return;
 for(const stage of job.workflow.stages){if(stage.status==='running'){stage.status=status;stage.finishedAt=new Date().toISOString();}}
}
