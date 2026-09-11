import {createHash} from 'node:crypto';
import {modelRouting} from './model-routing.mjs';
import {ModelGatewayError} from './model-gateway-result.mjs';

// Server-only configuration resolver shared by adapter identity and checkpoint pins.
export function resolveModelConnection(profile,env){
 const config=modelRouting(env),vision=profile.connectionRef==='legacy-vision';
 let base=vision?config.visionBase:config.analysisBase,key=vision?config.visionKey:config.analysisKey;
 if(profile.connectionRef==='main'){base=env.LLM_MAIN_BASE_URL||'https://open.bigmodel.cn/api/coding/paas/v4';key=env.LLM_MAIN_API_KEY;}
 if(profile.connectionRef==='pro'){base=env.LLM_PRO_BASE_URL||config.analysisBase;key=env.LLM_PRO_API_KEY||config.analysisKey;}
 if(profile.connectionRef==='vision-challenger'){base=env.LLM_VISION_CHALLENGER_BASE_URL;key=env.LLM_VISION_CHALLENGER_API_KEY;}
 let url;try{url=new URL(base);}catch{throw new ModelGatewayError('configuration');}
 if(url.username||url.password||url.search||url.hash||url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname)))throw new ModelGatewayError('configuration');
 return {base:url.href.replace(/\/$/,''),key};
}
export function modelConnectionIdentity(profile,env){
 const {base}=resolveModelConnection(profile,env);
 return createHash('sha256').update(JSON.stringify([profile.protocol,base,profile.model])).digest('hex');
}
