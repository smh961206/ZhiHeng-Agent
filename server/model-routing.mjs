export function modelRouting(env=process.env){
 return {analysisModel:env.LLM_MODEL||'deepseek-v4-pro',visionModel:env.LLM_VISION_MODEL||'deepseek-v4-flash-vision-exp',
  analysisBase:env.LLM_BASE_URL||'https://api.deepseek.com',visionBase:env.LLM_VISION_BASE_URL||env.LLM_BASE_URL||'https://api.deepseek.com',
  analysisKey:env.LLM_API_KEY,visionKey:env.LLM_VISION_API_KEY||env.LLM_API_KEY};
}
export function publicModelRouting(env=process.env,state){const {analysisModel,visionModel}=modelRouting(env);return {analysisModel:state?.version===2?state.profiles.find(p=>p.id===state.active.profileId).model:analysisModel,visionModel,workflow:state?.version===2?'Vision 负责原页读取，分析模型负责研究与审计':'Vision 负责看，Pro 负责分析与审计'};}
// Policy recommendations do not activate execution. Unknown values stay legacy.
export const modelRoutingMode=env=>env.MODEL_ROUTING_MODE==='dry-run'?'dry-run':'legacy';
