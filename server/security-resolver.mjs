import {securityCatalog} from './market-data.mjs';
import {lookupSECCompanies} from './sec-directory.mjs';
import {extractSecurityIntent} from './security-intent.mjs';
// Search aliases only; security IDs are always resolved against live official directories.
const aliases={茅台:{name:'贵州茅台'},平安:{name:'平安'},腾讯:{name:'腾讯控股'},騰訊:{name:'腾讯控股'},宁德:{name:'宁德时代'},寧德:{name:'宁德时代'},苹果:{us:'Apple Inc.'},蘋果:{us:'Apple Inc.'},微软:{us:'Microsoft'},微軟:{us:'Microsoft'},英伟达:{us:'NVIDIA'},英偉達:{us:'NVIDIA'},英伟達:{us:'NVIDIA'},特斯拉:{us:'Tesla'},亚马逊:{us:'Amazon'},亞馬遜:{us:'Amazon'},谷歌:{us:'Alphabet'},奈飞:{us:'Netflix'},奈飛:{us:'Netflix'},阿里巴巴:{name:'阿里巴巴',us:'Alibaba Group'},阿里:{name:'阿里巴巴',us:'Alibaba Group'},百度:{name:'百度',us:'Baidu'},京东:{name:'京东',us:'JD.com'},京東:{name:'京东',us:'JD.com'},拼多多:{us:'PDD Holdings'},美团:{name:'美团'},美團:{name:'美团'},小米:{name:'小米'},比亞迪:{name:'比亚迪'},台积电:{us:'Taiwan Semiconductor'},台積電:{us:'Taiwan Semiconductor'}};
const ignored=new Set('A B C D E F CN HK US SH SZ BJ SEC ROE ROIC PE PB P2 DCF DPS EPS FCF FCFE FCFF TTM FY USD HKD CNY RMB CEO API EBITDA EV WACC ADR ETF AI JSON PDF YOY CAGR IPO IRR NAV GDP HTTP HTTPS'.split(' '));
const identity=s=>`${s.market}:${s.symbol}`;
function unique(items){return [...new Map(items.map(s=>[identity(s),s])).values()];}
function marketFor(question,index){
 const markers=[...question.matchAll(/A股|Ａ股|沪股|深股|港股|H股|美股|美国上市/gi)].map(m=>({index:m.index,end:m.index+m[0].length,market:/港|H股/i.test(m[0])?'HK':/美/.test(m[0])?'US':'CN'}));
 const markets=[...new Set(markers.map(m=>m.market))];if(markets.length===1)return markets[0];
 const nearest=markers.filter(m=>m.end<=index&&index-m.end<=12).at(-1);return nearest?.market;
}
function names(s){const base=s.zwjc.replace(/[-－](SW|SS|W|S|B|R|Ｗ|Ｂ|ＳＷ)$/i,'');const short=base.replace(/(控股|集团|集團|股份)$/,'');return [...new Set([s.zwjc,base,...(short.length>=3?[short]:[])])].filter(n=>n.length>=2);}
export function localMentions(question,catalogs){
 const mentions=[];
 const add=(mention,index,candidates,usQuery,explicitMarket)=>mentions.push({mention,index,end:index+mention.length,candidates,usQuery,explicitMarket});
 const candidates=(market,symbol)=>catalogs[market].filter(s=>s.code===symbol).map(s=>({market,symbol:s.code,name:s.zwjc,verifiedBy:'巨潮官方证券目录'}));
 const codePattern=/(?<![A-Za-z0-9])(?:(SH|SZ|BJ|HK)\s*[:：.]?\s*(\d{1,6})|(\d{1,6})\.(SH|SZ|BJ|HK)|(\d{5,6}))(?![A-Za-z0-9])/gi;
 for(const m of question.matchAll(codePattern)){
  const prefix=(m[1]||m[4]||'').toUpperCase(),digits=m[2]||m[3]||m[5];
  const market=prefix?(prefix==='HK'?'HK':'CN'):digits.length===6?'CN':'HK';
  const symbol=market==='HK'?digits.padStart(5,'0'):digits;
  if(market==='CN'&&digits.length!==6)continue;
  add(m[0],m.index,candidates(market,symbol),undefined,market);
 }
 for(const market of ['CN','HK'])for(const s of catalogs[market])for(const name of names(s)){
  const i=question.toLowerCase().indexOf(name.toLowerCase());if(i<0)continue;
  if(/^[A-Za-z0-9 ]+$/.test(name)&&(/[A-Za-z]/.test(question[i-1]??'')||/[A-Za-z]/.test(question[i+name.length]??'')))continue;
  add(question.slice(i,i+name.length),i,[{market,symbol:s.code,name:s.zwjc,verifiedBy:'巨潮官方证券目录'}]);
 }
 for(const [mention,query] of Object.entries(aliases)){
  const i=question.indexOf(mention);if(i<0)continue;
  const cs=query.name?['CN','HK'].flatMap(m=>catalogs[m].filter(s=>names(s).some(n=>n.includes(query.name))).map(s=>({market:m,symbol:s.code,name:s.zwjc,verifiedBy:'巨潮官方证券目录'}))):[];
  add(mention,i,cs,query.us);
 }
 // Latin company names/tickers. Indicators and ordinary lowercase prose are excluded.
 for(const m of question.matchAll(/(?<![A-Za-z0-9])\$?([A-Za-z][A-Za-z0-9.-]{0,15})(?![A-Za-z0-9])/g)){
  const token=m[1];if(ignored.has(token.toUpperCase())||token.length<2||/^(COM|INC|CORP|REPORT|COMPARE|ANALYZE)$/i.test(token))continue;
  if(!/^[A-Z0-9.-]+$/.test(token)&&!/[A-Z]/.test(token[0]))continue;
  if(mentions.some(n=>m.index>=n.index&&m.index<n.end))continue;
  add(m[0],m.index,[],token,'US');
 }
 const merged=[];
 for(const m of mentions.sort((a,b)=>(b.end-b.index)-(a.end-a.index))){
  const same=merged.find(n=>n.index===m.index&&n.end===m.end);
  if(same){same.candidates=unique([...same.candidates,...m.candidates]);same.usQuery??=m.usQuery;continue;}
  if(merged.some(n=>m.index>=n.index&&m.end<=n.end))continue;
  merged.push({...m,candidates:unique(m.candidates)});
 }
 const resolved=merged.sort((a,b)=>a.index-b.index).map(m=>{
  const preferred=m.explicitMarket||marketFor(question,m.index);
  return {...m,preferred,candidates:preferred?m.candidates.filter(s=>s.market===preferred):m.candidates,usQuery:preferred&&preferred!=='US'?undefined:m.usQuery};
 });
 // A directly adjacent verified code disambiguates that company's listing only.
 return resolved.map(m=>{
  if(m.explicitMarket||m.candidates.length<2)return m;
  const adjacent=resolved.filter(code=>code.explicitMarket&&code.candidates.length===1&&(
   (code.index>=m.end&&code.index-m.end<=8&&/^[\s（(:：]*$/.test(question.slice(m.end,code.index)))||
   (m.index>=code.end&&m.index-code.end<=8&&/^[\s）):：]*$/.test(question.slice(code.end,m.index)))
  ));
  const matched=unique(adjacent.flatMap(code=>m.candidates.filter(s=>identity(s)===identity(code.candidates[0]))));
  return matched.length===1?{...m,candidates:matched}:m;
 });
}
async function searchUS(query,signal){
 return unique((await lookupSECCompanies(query,signal)).map(({cik,...item})=>item));
}
export async function resolveSecurities(question,{signal,loadCatalog=securityCatalog,lookupUS=searchUS,extractIntent=extractSecurityIntent}={}){
 if(typeof question!=='string'||question.length>10000)throw new Error('问题格式无效，最多10000字');
 if(!question.trim())return {securities:[],ambiguities:[],unresolved:[],warnings:[],overflow:false};
 const [results,intent]=await Promise.all([Promise.allSettled(['CN','HK'].map(m=>loadCatalog(m,signal))),extractIntent(question,{signal})]);
 signal?.throwIfAborted();
 const warnings=[];const catalogs={CN:[],HK:[]};
 results.forEach((r,i)=>{const market=i?'HK':'CN';if(r.status==='fulfilled')catalogs[market]=r.value;else warnings.push(`${market}证券目录不可用：${r.reason.message}`);});
 if(intent.source!=='semantic')warnings.push('语义识别暂不可用，已按名称与代码匹配，请核对研究对象或手动调整。');
 const mentions=intent.source==='semantic'?intent.targets.flatMap(target=>{
  let found=localMentions(target.mention,catalogs);
  if(!found.length)found=[{mention:target.mention,candidates:[],usQuery:target.market==='US'?target.mention:undefined}];
  return found.map(m=>target.market?{...m,candidates:m.candidates.filter(s=>s.market===target.market),usQuery:target.market==='US'?(m.usQuery||(!m.explicitMarket?m.mention:undefined)):undefined}:m);
 }):localMentions(question,catalogs);
 const securities=[],ambiguities=[],unresolved=[];
 for(const m of mentions.slice(0,12)){
  let candidates=m.candidates;
  if(m.usQuery){try{candidates=unique([...candidates,...await lookupUS(m.usQuery,signal)]);}catch(e){signal?.throwIfAborted();warnings.push(`${m.mention}美股查询失败：${e.message}`);}}
  if(candidates.length===1)securities.push({...candidates[0],mention:m.mention});
  else if(candidates.length>1)ambiguities.push({mention:m.mention,candidates:candidates.slice(0,12)});
  else unresolved.push(m.mention);
 }
 const found=unique(securities);return {securities:found.slice(0,3),ambiguities:[...new Map(ambiguities.map(a=>[a.mention,a])).values()],unresolved:[...new Set(unresolved)],warnings,overflow:found.length>3||mentions.length>12,source:intent.source};
}
