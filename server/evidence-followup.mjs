import {usableEvidenceBlock} from './document-layout.mjs';
import {webGapLabel} from './web-research.mjs';

const compact=value=>String(value||'').replace(/\s+/g,' ').trim();
// Search terms are constructed from verified task symbols and this public-topic
// vocabulary. Never forward a report's missingData or private user context.
const topics=[
 [/汇率|换汇|exchange rate/i,'汇率 HKD CNY'],
 [/股价|价格|行情|市值|\b(?:PE|PB)\b|估值分位/i,'股价 市值 市盈率 市净率'],
 [/资本开支|购建|Capex|FCF|现金流/i,'经营现金流 购建长期资产 资本开支'],
 [/ROIC|投入资本/i,'投入资本 经营利润 财务报表 附注'],
 [/净利|归母|ROE|EPS|权益|单季|Q[1-4]/i,'净利润 净资产收益率 股东权益 季度报告'],
 [/分红|股息|DPS|支付率|回购/i,'分红 股息 回购 公告'],
 [/毛利|海外|销量|收入|业务|行业|份额|竞争/i,'营业收入 分部业务 毛利率 产销 行业'],
 [/存货|应收|负债|在建|固定资产|债务|货币资金|现金余额/i,'资产负债表 存货 应收 合同负债'],
 [/EV|投资收益率|保险|敏感性/i,'内含价值 投资收益率 敏感性 年报'],
 [/附注|报表|年报|财报|披露|原文|报告|数据/i,'年度报告 半年度报告 财务报表 附注'],
];
export function followupTopic(description){
 if(/(?:P2|市赚率|修正.*系数|N系数).*(?:无官方映射|经验|假设|插值)/i.test(description))return null;
 if(/(?:未提供|缺少|缺失|尚缺).*(?:持仓|仓位|权重|风险承受|流动性需求|上次研究|旧报告)/.test(description))return null;
 return topics.filter(([pattern])=>pattern.test(description)).slice(0,3).map(([,words])=>words).join(' ')||null;
}
const usableMatch=(match,source)=>usableEvidenceBlock(source,match);

export function createEvidenceFollowup({job,web,assess,emit=()=>{},limit=6}){
 const state={status:'pending',checks:[],limit,attempted:0};job.evidenceFollowup=state;
 const securities=(job.input.securities||[]).filter(s=>['CN','HK','US'].includes(s.market)&&/^[A-Z0-9.-]{1,12}$/i.test(s.symbol));
 const records=[];
 const notify=record=>emit('evidence_followup',`${record.id} 关键缺口补证：${record.reason}`,{check:{...record}});
 const call=async(name,args,fn)=>{
  const id=`followup-${records.length+1}`;
  emit('tool',`补证调用 ${name}`,{toolName:name,toolCallId:id,arguments:args});
  let result;try{result=await fn();}catch(error){result={error:error.message};}
  records.push({callId:id,toolName:name,arguments:args,result});
  emit('tool_result',`补证 ${name} 已返回`,{toolName:name,toolCallId:id,result});return result;
 };
 const checkLocal=async(batch,signal)=>{
  if(!batch.length)return;
  let verdicts=[];
  try{verdicts=await assess(batch.map(({check,matches})=>({id:check.id,description:check.description,security:check.security,query:check.query,matches})),signal);}
  catch(error){signal.throwIfAborted();emit('warning','现有证据核对未能完成，将保留缺口并按预算补查。');}
  for(const {check,matches} of batch){
   const verdict=Array.isArray(verdicts)?verdicts.find(v=>v?.id===check.id):null;
   const source=job.input.sources.find(s=>s.id===verdict?.sourceId);
   const match=matches.slice(0,6).find(m=>m.id===verdict?.sourceId&&m.blockId===verdict?.blockId);
   const quote=compact(verdict?.quote);
   if(verdict?.status!=='supported'||!match||!usableMatch(match,source)||quote.length<24||quote.length>800||
    !compact(match.text.slice(0,4000)).includes(quote)||!compact(source.text).includes(quote)||
    typeof verdict.explanation!=='string'||verdict.explanation.trim().length<8||verdict.explanation.length>800)continue;
   check.resolution={sourceId:source.id,blockId:match.blockId,quote:verdict.quote,explanation:verdict.explanation,assessedBy:'research-model'};
   check.status='evidence-located';check.reason='已在读取的原文中定位证据，仍须由最终审计核对其对结论的影响';
  }
 };
 function register(missingData,{late=false}={}){
  if(!Array.isArray(missingData))return [];
  const added=[];
  for(const description of missingData.filter(x=>typeof x==='string').slice(0,80)){
   if(state.checks.some(c=>c.description===description||description.includes(`[${c.id}]`)))continue;
   const existing=description.match(/\[(G\d+)\]/)?.[1];
   if(existing&&web.state.gaps.some(g=>g.id===existing))continue;
   const topic=followupTopic(description);
   for(const security of topic&&securities.length?securities:[null]){
    const check={id:`F${state.checks.length+1}`,description,security:security?`${security.market}:${security.symbol}`:null,status:'pending',sourceIds:[]};
    state.checks.push(check);added.push(check);
    if(!topic){check.status='not-searchable';check.reason='需补充用户信息、核对模型假设或人工确认检索范围，未向外部发送研究上下文';}
    else if(!security){check.status='scope-missing';check.reason='缺少已确认的研究证券，无法安全构造公开检索词';}
    else{
     const periods=[...new Set(description.match(/20\d{2}(?:H[12]|Q[1-4])?/gi)||[])].slice(0,4).join(' ');
     check.query=`${security.market==='CN'?'A股':security.market==='HK'?'港股':'US'} ${security.symbol} ${periods} ${topic}`.replace(/\s+/g,' ').trim();
     if(late){check.status='round-limit';check.reason='最终复核新增的缺口，已达到本次补证轮次上限，保留待核实事项';}
    }
   }
  }
  return added;
 }
 async function run(missingData,signal){
  state.status='running';const batch=[];let reviewed=false;
  emit('evidence_followup','正在定向核对关键证据缺口，核对不足时补查网页。',{followup:structuredClone(state)});
  for(const check of register(missingData)){
   signal.throwIfAborted();
   if(check.status!=='pending'){notify(check);continue;}
   if(state.attempted>=limit){check.status='budget-exhausted';check.reason='达到本次关键缺口补证上限，尚未补查';notify(check);continue;}
   state.attempted++;
   const local=await call('search_evidence',{query:check.query,security:check.security},()=>web.local({query:check.query,security:check.security}));
   signal.throwIfAborted();check.retrievalId=local.retrievalId;check.sourceIds=[...new Set((local.matches||[]).map(m=>m.id))];
   if(local.error){check.status='local-failed';check.reason='已有资料定向检索失败，尚未取得可用检索记录';notify(check);continue;}
   if(!web.state.configured&&!local.matches?.length){check.status='unavailable';check.reason=web.state.enabled?'搜索服务未配置，已定向检索现有资料，缺口仍待核实':'网页搜索已关闭，已定向检索现有资料，缺口仍待核实';notify(check);continue;}
   batch.push({check,matches:local.matches||[]});
  }
  if(batch.length){await checkLocal(batch,signal);reviewed=true;}
  const discovered=[];
  for(const {check} of batch){
   signal.throwIfAborted();
   if(check.status==='evidence-located'){notify(check);continue;}
   if(!web.state.configured){check.status='unavailable';check.reason=web.state.enabled?'现有资料未能解决缺口，搜索服务未配置':'现有资料未能解决缺口，网页搜索已关闭';notify(check);continue;}
   // Earlier searches may have added sources. Refresh the receipt and have
   // the assessor read the updated local evidence before another network call.
   const gap='关键证据缺口：'+check.description.slice(0,750);
   let result=await call('search_web',{retrievalId:check.retrievalId,gap},()=>web.search({retrievalId:check.retrievalId,gap},signal));
   if(result.status==='local-review-required'){
    check.retrievalId=result.retrievalId;
    await checkLocal([{check,matches:result.matches||[]}],signal);
    if(check.status==='evidence-located'){notify(check);continue;}
    result=await call('search_web',{retrievalId:check.retrievalId,gap},()=>web.search({retrievalId:check.retrievalId,gap},signal));
   }
   signal.throwIfAborted();check.webGapId=result.id;check.sourceIds=result.sourceIds||[];
   check.status='unresolved';check.reason=result.error?'网页补证调用失败，缺口仍待核实':`${webGapLabel(result.status)}${result.failures?.length?'：'+result.failures.join('；'):''}`;
   const matches=[];
   for(const sourceId of check.sourceIds){
    const local=await call('search_evidence',{query:check.query,sourceId},()=>web.local({query:check.query,sourceId}));
    matches.push(...(local.matches||[]));
   }
   if(matches.length)discovered.push({check,matches});else notify(check);
  }
  await checkLocal(discovered,signal);
  for(const {check} of discovered){
   if(check.status==='evidence-located'&&check.webGapId){
    const r=check.resolution;
    const result=await call('resolve_web_gap',{gapId:check.webGapId,sourceId:r.sourceId,quote:r.quote,explanation:r.explanation},()=>web.resolve({gapId:check.webGapId,sourceId:r.sourceId,quote:r.quote,explanation:r.explanation}));
    if(result.status!=='evidence-located'){check.status='unresolved';check.reason='原文仍有日期、身份或解析限制，缺口不能关闭';}
   }
   notify(check);
  }
  signal.throwIfAborted();state.status='completed';
  emit('evidence_followup',`关键缺口补证已结束：${state.checks.filter(c=>c.status==='evidence-located').length} 项定位到证据，${state.checks.filter(c=>c.status!=='evidence-located').length} 项保留限制`,{followup:structuredClone(state)});
  return {reviewed,records,state};
 }
 function preserve(review){
  if(state.status!=='completed')throw new Error('关键证据补证流程尚未完成，不能交付报告');
  // A second review cannot silently erase an unresolved initial gap. New gaps
  // have an explicit bounded-stop record rather than triggering an endless run.
  for(const check of register(review.decision?.missingData,{late:true}))notify(check);
  const unresolved=state.checks.filter(c=>c.status!=='evidence-located');
  if(!unresolved.length)return;
  const missing=review.decision?.missingData;if(!Array.isArray(missing))return;
  for(const check of unresolved){
   const note=`[${check.id}] ${check.description}；补证处理：${check.reason}`;
   const i=missing.findIndex(item=>item===check.description||item.includes(`[${check.id}]`));
   if(i>=0)missing[i]=note;else missing.push(note);
  }
  const data=review.decision?.gates?.find(g=>g.id==='data');
  if(unresolved.some(c=>c.status!=='not-searchable')&&data?.status!=='limited')throw new Error('关键证据补证仍有未解决缺口，数据审计须标记limited并降低置信度');
 }
 return {state,run,preserve};
}
