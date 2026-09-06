// Build an event ledger without guessing ordinary/special classification,
// cancellation status, or summing cumulative buyback updates.
export function dividendLedger(rows,today){
 const groups=new Map(),unresolved=[];
 for(const [index,row] of rows.entries()){
  if(row.div_proc!=='实施')continue;
  if(!row.end_date||!row.record_date||!row.ex_date||!row.pay_date){unresolved.push({row:index,reason:'实施记录缺少事件日期'});continue;}
  const key=[row.end_date,row.record_date,row.ex_date,row.pay_date].join(':');
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push({row,index});
 }
 const events=[...groups.entries()].map(([id,items])=>{
  const versions=new Set(items.map(({row})=>JSON.stringify([row.cash_div_tax,row.cash_div,row.base_share,row.stk_div]))),row=items[0].row;
  const conflict=versions.size>1;
  return {id,earningsPeriod:row.end_date,recordDate:row.record_date,exDate:row.ex_date,paymentDate:row.pay_date,sourceRows:items.map(item=>item.index),duplicateRows:items.length-versions.size,
   status:conflict?'conflict':row.pay_date<=today?'payment-date-observed':'scheduled',cashPerShareBeforeTax:conflict?null:row.cash_div_tax,cashPerShareAfterTax:conflict?null:row.cash_div,
   baseShares:!conflict&&typeof row.base_share==='number'?Math.round(row.base_share*10000):null,baseSharesUnit:'股',currency:null,regularOrSpecial:'unverified',officiallyVerified:false};
 });
 return {events,unresolved,notice:'按归属期、登记日、除息日和派息日合并完全重复的实施记录；冲突不择优猜测。派息日已到不独立证明付款完成，不在未分类或币种不明时汇总可持续分红。'};
}
export function capitalEvidence(sources){
 const pattern=/注销|註銷|回购|購回|repurchas|cancell?ed|cancellation|特别股息|特別股息|特别分红|special dividend|dividend policy|分红政策|股息政策|股權激勵|股权激励|share.based compensation/i;
 const snippets=[];
 for(const source of sources.filter(item=>item.type==='official-report')){
  if(snippets.length>=96)break;
  let count=0,pageIndex=0;
  const pages=[...source.text.matchAll(/【PDF第(\d+)页】/g)].map(match=>({offset:match.index,page:Number(match[1])}));
  // Keep original snippets and page markers instead of interpreting intention
  // words as completed cancellation or treating plans as paid distributions.
  for(let offset=0;offset<source.text.length;offset+=650){
   const text=source.text.slice(offset,offset+1100);if(!pattern.test(text))continue;
   while(pageIndex+1<pages.length&&pages[pageIndex+1].offset<=offset)pageIndex++;
   const page=pages[pageIndex]?.offset<=offset?pages[pageIndex].page:null;
   snippets.push({sourceId:source.id,title:source.title,url:source.url,offset,page,text});
   if(++count>=4||snippets.length>=96)break;
  }
 }
 return {status:snippets.length?'evidence-available':'missing',snippets,purposeVerified:false,cancellationVerified:false,
  notice:'定位到官方原文中的资本配置线索；关键词命中不证明已完成注销、已付款或属于常规分红。须核对对应金额、股份类别、期间、实施日期和否定/将来时，再引用原来源。'};
}
