import {modes,resolveMode,portfolioFields} from '../shared/research-framework.mjs';
export {modes} from '../shared/research-framework.mjs';
export function route(input){
  return resolveMode(input);
}
export function validateInput(x){
  if(!x||typeof x!=='object'||Array.isArray(x))throw new Error('请求必须为对象');
  if(typeof x.question!=='string'||!x.question.trim()||x.question.length>10000)throw new Error('研究问题必填，最多10000字');
  if(x.mode && !['auto',...Object.keys(modes)].includes(x.mode))throw new Error('研究模式无效');
  if(x.depth && !['Quick','Standard','Deep'].includes(x.depth))throw new Error('报告深度无效');
  const securities=validateSecurities(x.securities??[]);
  if(x.historyYears!==undefined&&![3,5,8].includes(x.historyYears))throw new Error('历史范围须为3、5或8年');
  if(!securities.length)throw new Error('请添加至少一个研究标的，系统将自动抓取行情和官方财报');
  if(!Array.isArray(x.sources??[])||(x.sources??[]).length>12)throw new Error('最多12份资料');
  for(const s of x.sources??[]){if(!s||typeof s.title!=='string'||!s.title.trim()||s.title.length>200||typeof s.text!=='string'||!s.text.trim()||s.text.length>100000)throw new Error('资料标题/正文无效或超限');if(s.url && (typeof s.url!=='string'||!/^https?:\/\//i.test(s.url)))throw new Error('来源链接必须使用http(s)');}
  if(x.portfolio!==undefined&&(typeof x.portfolio!=='string'||x.portfolio.length>20000))throw new Error('组合上下文无效');
  if(x.previousResearch!==undefined&&(typeof x.previousResearch!=='string'||x.previousResearch.length>30000))throw new Error('上次研究结论最多30000字');
  if(x.baselineJobId!=null&&x.baselineJobId!==''&&(typeof x.baselineJobId!=='string'||! /^[\da-f-]{36}$/i.test(x.baselineJobId)))throw new Error('对照研究编号无效');
  if(x.portfolioContext!==undefined&&(!x.portfolioContext||typeof x.portfolioContext!=='object'||Array.isArray(x.portfolioContext)))throw new Error('组合信息无效');
  const portfolioContext={};
  for(const {id,label} of portfolioFields){const value=x.portfolioContext?.[id];if(value!==undefined&&(typeof value!=='string'||value.length>4000))throw new Error(label+'最多4000字');if(value?.trim())portfolioContext[id]=value.trim();}
  return {question:x.question.trim(),mode:x.mode??'auto',depth:x.depth??'Standard',portfolio:x.portfolio??'',securities,historyYears:x.historyYears??5,sources:[],
    previousResearch:x.previousResearch?.trim()||'',baselineJobId:x.baselineJobId||null,portfolioContext};
}

import {validateSecurities} from './market-data.mjs';
