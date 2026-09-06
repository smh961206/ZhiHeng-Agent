export const modes={A:{name:'快速初筛',modules:['商业模式','财务快扫','估值快扫','审计']},B:{name:'深度研究',modules:['基本面','财务质量','股东回报','估值交叉验证','决策','审计']},C:{name:'财报更新',modules:['新旧证据对照','参数变更','逻辑变化','审计']},D:{name:'标的对比',modules:['口径统一','同业比较','估值排序','审计']},E:{name:'组合分析',modules:['组合上下文','集中度','风险约束','审计']},F:{name:'股东回报',modules:['八年分红','可分配现金','收益率锚','主估值交叉验证','审计']}};
export function route(input){
  if(input.mode && input.mode!=='auto')return modes[input.mode]?input.mode:'B';
  const q=input.question;
  return /持仓|组合|加仓|减仓/.test(q)?'E':/对比|比较|选哪/.test(q)?'D':/最新财报|财报更新|上次|变化/.test(q)?'C':/股息|分红|股东回报|收益率/.test(q)?'F':/初筛|快速|值不值得研究/.test(q)?'A':'B';
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
  return {question:x.question.trim(),mode:x.mode??'auto',depth:x.depth??'Standard',portfolio:x.portfolio??'',securities,historyYears:x.historyYears??5,sources:[]};
}

import {validateSecurities} from './market-data.mjs';
