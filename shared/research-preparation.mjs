import {knowledgeAvailability} from './research-knowledge.mjs';
import {createResearchPlan,resolveMode} from './research-framework.mjs';
import {validateSecurities} from './security-input.mjs';
import {updateBaselineSelection} from './earnings-update.mjs';

export function researchPreparation(input={},resolution={},state={}){
 const mode=resolveMode(input),issues=[],notes=[];
 let securities=[];
 const issue=(id,message)=>issues.push({id,message});
 if(!input.question?.trim())issue('question','先写下你想研究的问题');
 else if(input.question.length>10000)issue('question','研究问题最多 10,000 字，请精简后开始');
 if(state.pathPending&&input.question?.trim())issue('path','正在判断研究路径，请稍候');
 if(resolution.status==='loading')issue('securities','正在识别公司与市场，请稍候');
 else {
  try{securities=validateSecurities(resolution.securities??input.securities??[]);}
  catch(error){issue('securities',error.message);}
  if(!issues.some(item=>item.id==='securities')){
   if(!securities.length)issue('securities','请添加至少一个研究标的，并核对市场与代码');
   else if(resolution.blocked)issue('securities','请核对标的，解决识别提示后开始');
   else if(mode==='D'&&securities.length<2)issue('securities','多公司比较需要 2–3 个不同标的，请补充比较对象');
  }
 }
 if(state.materialsReading)issue('materials','正在读取补充资料，请稍候');
 else if(state.materialsPending||state.materialEditDraft||state.materialDraft?.trim())issue('materials','请先保存资料修改，或将待加入的文字加入 / 清空');
 if('config' in state&&knowledgeAvailability(state.config).blocking)issue('service',knowledgeAvailability(state.config).description);
 else if(state.config?.configured===false)issue('service','研究服务尚未配置，请完成模型连接后再开始');
 const baseline=mode==='C'?updateBaselineSelection(input,securities,state):null;
 if(baseline?.blocking)issue('context',baseline.message);
 const plan=createResearchPlan({...input,securities},mode);
 if(mode==='C'&&!plan.baseline.provided)notes.push('未提供旧研究，本次建立财报基线；后续可沿用报告核对变化。');
 if(mode==='E'&&!plan.portfolio.complete)notes.push('组合信息尚缺 '+plan.portfolio.missing.join('、')+'；仍可分析已知风险，本次不输出具体仓位。');
 if(securities.length&&(resolution.securities??input.securities??[]).length>securities.length)notes.push('重复代码将合并为同一标的，避免重复采集。');
 if(state.config?.webSearch?.configured===false)notes.push('网页补充尚未连接，将使用已读取的行情、财报与公告，未解决的资料缺口会保留。');
 return {ready:issues.length===0,issues,notes,plan,securities,baseline,
  message:state.busy?'正在创建研究，请稍候':issues[0]?.message||`${securities.length} 个标的已就绪，可以开始${mode==='A'?'快速筛选':'研究'}`};
}
