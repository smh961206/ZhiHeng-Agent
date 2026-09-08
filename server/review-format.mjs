import {requiresResearchSummary} from '../shared/deep-research.mjs';
import {scoring,confidenceLevels} from '../shared/research-framework.mjs';

const string={type:'string'};
const enumeration=values=>({type:'string',enum:values});
const array=(items,limits={})=>({type:'array',items,...limits});
const object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});

// Transport constraints prevent malformed fields. Evidence quality and action
// boundaries still have to pass validateReview after the response is parsed.
export function reviewJsonSchema(plan) {
 return object({
  sections:array(object({id:enumeration(plan.output.sections.map(section=>section.id)),text:string}),{minItems:plan.output.sections.length,maxItems:plan.output.sections.length}),
  audit:string,
  ...(plan.execution?{executionAudit:array(object({id:enumeration(plan.execution.checks.map(item=>item.id)),status:enumeration(['passed','limited','not_applicable','failed']),reason:string}),{minItems:10,maxItems:10})}:{}),
  ...(requiresResearchSummary(plan)?{researchSummary:object({checks:array(object({topic:string,assessment:string,sourceIds:array(string),unresolved:string}),{minItems:3,maxItems:8})})}:{}),
  decision:object({
   action:enumeration(plan.output.actions),summary:string,confidence:enumeration(confidenceLevels),
   dataAsOf:{type:'string',pattern:'^\\d{4}-\\d{2}-\\d{2}$',description:'本次研究截止日期，仅YYYY-MM-DD，不添加解释，不冒充行情日期'},
   falsifiers:array(string,{minItems:3,maxItems:80}),missingData:array(string,{maxItems:80}),
   gates:array(object({id:enumeration(['data','quality','valuation','risk']),status:enumeration(['passed','limited','not_applicable','failed']),reason:string}),{minItems:4,maxItems:4}),
   valuation:object({status:enumeration(['supported','limited','not_applicable']),methods:array(string),explanation:string}),
   portfolio:object({status:enumeration(['reviewed','insufficient','not_applicable']),summary:string}),
   ...(plan.output.schema==='Deep'?{scores:array(object({id:enumeration(scoring.map(item=>item.id)),score:{type:['number','null']},reason:string}),{minItems:scoring.length,maxItems:scoring.length})}:{}),
  }),
 });
}

export function reviewResponseFormat(plan,mode=process.env.LLM_REVIEW_FORMAT||'auto') {
 if(!['auto','json_schema','json_object','text'].includes(mode))throw new Error('LLM_REVIEW_FORMAT须为auto、json_schema、json_object或text');
 return mode==='text'?undefined:mode==='json_object'?{type:'json_object'}:{type:'json_schema',json_schema:{name:'research_review',strict:true,schema:reviewJsonSchema(plan)}};
}

function formatError(message,details={}) {
 return Object.assign(new Error('审计输出格式无效：'+message),{code:'review_json',validationIssues:[{code:'invalid_review_json',path:'response',message,...details}]});
}

// Only correct unambiguous JSON punctuation. Never insert missing quotes,
// closing brackets, fields, references, dates, scores, or financial values.
function normalizeJsonSyntax(text) {
 let result='',quoted=false,escaped=false;const changes=new Set();
 for(let index=0;index<text.length;index++){
  const char=text[index];
  if(quoted){
   if(escaped){result+=char;escaped=false;continue;}
   if(char==='\\'){result+=char;escaped=true;continue;}
   if(char==='"')quoted=false;
   if(['\n','\r','\t'].includes(char)){result+=JSON.stringify(char).slice(1,-1);changes.add('string_whitespace');continue;}
  }else{
   if(char==='"')quoted=true;
   if(char===','){
    let next=index+1;while(/\s/.test(text[next]||'')&&next<text.length)next++;
    if(['}',']'].includes(text[next])){changes.add('trailing_comma');continue;}
   }
  }
  result+=char;
 }
 return {text:result,changes:[...changes]};
}

export function parseReviewResponse(message) {
 if(message?.refusal)throw Object.assign(new Error('模型未能完成审计，未生成可交付结果'),{code:'model_refusal'});
 if(typeof message?.content!=='string'||!message.content.trim())throw formatError('模型未返回完整JSON对象');
 if(message.content.length>1_000_000)throw formatError('响应超过长度上限');
 let text=message.content.trim();const changes=[];
 const fenced=text.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i);
 if(fenced){text=fenced[1].trim();changes.push('code_fence');}
 let value;
 try{value=JSON.parse(text);}
 catch{
  const normalized=normalizeJsonSyntax(text);
  try{value=JSON.parse(normalized.text);changes.push(...normalized.changes);}
  catch(error){
   const match=error.message.match(/position (\d+)/),offset=match?Number(match[1]):undefined;
   const before=offset===undefined?'':normalized.text.slice(0,offset);
   throw formatError('须返回一个完整JSON对象；检查引号、逗号、字符串转义及括号闭合',
    offset===undefined?{}:{offset,line:before.split('\n').length,column:before.length-before.lastIndexOf('\n')});
  }
 }
 if(!value||typeof value!=='object'||Array.isArray(value))throw formatError('顶层须为JSON对象，不能是数组、字符串或null');
 return {value,normalizations:changes};
}

export function unsupportedReviewFormat(status,error,format) {
 if(!format||![400,422].includes(status))return false;
 const detail=error?.error||error||{},message=typeof detail.message==='string'?detail.message:'';
 if(/invalid.*schema|schema.*invalid|missing|required|additionalProperties/i.test(message)||detail.code==='invalid_json_schema')return false;
 return /response_format|json_schema|json_object|structured.?outputs?/i.test(String(detail.param||'')+' '+message)
  && (/not supported|unsupported|not available|\bunavailable\b|unknown parameter|unrecognized|not permitted|not allowed|不支持/i.test(message)||detail.code==='unsupported_parameter'||detail.code==='unsupported_value');
}
