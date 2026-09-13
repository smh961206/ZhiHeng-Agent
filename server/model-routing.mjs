import {modelEnvironment,modelConfig} from './model-config.mjs';
export function modelRouting(env=process.env){
 const config=modelConfig(env);
 if(config?.schemaVersion===2){
  const first=stage=>{const value=config.pipeline[stage],alias=typeof value==='string'?value:value[0];return config.models[alias];};
  const analysis=first('researcher'),vision=first('vision');
  return {analysisModel:analysis.model,visionModel:vision.model,analysisBase:analysis.baseUrl,visionBase:vision.baseUrl,analysisKey:env[analysis.apiKeyEnv],visionKey:env[vision.apiKeyEnv]};
 }
 env=modelEnvironment(env);
 return {analysisModel:env.LLM_MODEL||'deepseek-flash',visionModel:env.LLM_VISION_MODEL||'deepseek-flash',
  analysisBase:env.LLM_BASE_URL||'https://api.deepseek.com',visionBase:env.LLM_VISION_BASE_URL||env.LLM_BASE_URL||'https://api.deepseek.com',
  analysisKey:env.LLM_API_KEY,visionKey:env.LLM_VISION_API_KEY||env.LLM_API_KEY};
}
export function publicModelRouting(env=process.env,state){const {analysisModel,visionModel}=modelRouting(env),stageModels=state?.version===4?Object.fromEntries(Object.entries(state.stages).map(([stage,value])=>[stage,value.active?state.profiles.find(p=>p.id===value.active)?.model??null:null])):undefined;return {analysisModel:state?.version===4?stageModels.researcher:state?.version===2||state?.version===3?state.profiles.find(p=>p.id===state.active.profileId).model:analysisModel,visionModel:state?.profiles?.find(p=>p.purposes?.includes('vision'))?.model??visionModel,...(stageModels?{stageModels}:{}),workflow:state?.version===4?'Vision 负责原页读取，研究、写作、证据核验与审计按各环节配置执行':'Vision 负责原页读取，分析模型负责研究与审计'};}
// Policy recommendations do not activate execution. Unknown values stay legacy.
export const modelRoutingMode=env=>env.MODEL_ROUTING_MODE==='dry-run'?'dry-run':'legacy';
