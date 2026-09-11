import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export const cases=['path-default','intent-default','vision-default','path-custom','intent-custom','vision-custom'];
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
const hash=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
export async function routerVisionScenario(owners,name){
 const [kind,configuration]=name.split('-'),custom=configuration==='custom';
 const env={LLM_MODEL:'deepseek-fixture',LLM_API_KEY:'synthetic-analysis',LLM_BASE_URL:'https://analysis.invalid',...(custom?{LLM_ROUTER_MODEL:'custom-router',LLM_VISION_MODEL:'custom-image',LLM_VISION_INPUT:'images',LLM_VISION_API_KEY:'synthetic-vision',LLM_VISION_BASE_URL:'https://vision.invalid'}:{})};
 const question='不做比较，只分析贵州茅台现金流',requests=[];
 const fetchImpl=async(url,options)=>{
  requests.push({url:String(url),method:options.method,headers:options.headers,body:JSON.parse(options.body)});
  const content=kind==='path'?JSON.stringify({mode:'B',reason:'单家公司现金流研究'}):kind==='intent'?JSON.stringify({targets:[{mention:'贵州茅台'}]}):'  原件第 2 页：营业收入 100；单位须核对  ';
  return Response.json({choices:[{finish_reason:'stop',message:{content}}]});
 };
 let result;
 if(kind==='path'){
  const resolver=owners.createPathResolver({env,fetchImpl,now:()=>0});
  const decision=await resolver.recommend(question);
  assert.match(decision.decisionId,/^[a-f0-9-]{36}$/);
  assert.deepEqual(await resolver.resolve({question,pathDecisionId:decision.decisionId}),decision);
  assert.deepEqual(await resolver.recommend(question),decision);
  const {decisionId,...stable}=decision;result=stable;
 }else if(kind==='intent'){
  const extract=owners.createSecurityIntentExtractor({env,fetchImpl,now:()=>0});
  result=await extract(question);assert.deepEqual(await extract(question),result);
 }else result=await owners.readVisionImages([{page:2,region:'整页',dataUrl:'data:image/png;base64,AA=='}],{env,fetcher:fetchImpl,prompt:'逐字读取，缺失保留缺失。'});
 assert.equal(requests.length,1);
 return {name,requests:requests.length,requestHash:hash(requests),resultHash:hash(result)};
}
