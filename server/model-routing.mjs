export function modelRouting(env=process.env){
 return {analysisModel:env.LLM_MODEL||'deepseek-v4-pro',visionModel:env.LLM_VISION_MODEL||'deepseek-v4-flash-vision-exp',
  analysisBase:env.LLM_BASE_URL||'https://api.deepseek.com',visionBase:env.LLM_VISION_BASE_URL||env.LLM_BASE_URL||'https://api.deepseek.com',
  analysisKey:env.LLM_API_KEY,visionKey:env.LLM_VISION_API_KEY||env.LLM_API_KEY};
}
export function publicModelRouting(env=process.env){const {analysisModel,visionModel}=modelRouting(env);return {analysisModel,visionModel,workflow:'Vision 负责看，Pro 负责分析与审计'};}
