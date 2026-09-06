import {remote} from './market-request.mjs';
import {createMarketCache} from './market-cache.mjs';

export const normalizedTicker=value=>String(value).toUpperCase().replaceAll('.','-');
const normalizedName=value=>String(value).toUpperCase().replace(/[.,]/g,'').replace(/\s+/g,' ').trim();
const select=(items,query)=>{
 const exact=items.filter(item=>normalizedTicker(item.symbol)===normalizedTicker(query));
 const matches=exact.length?exact:items.filter(item=>normalizedName(item.name).startsWith(normalizedName(query)));
 return [...new Map(matches.map(item=>[`${item.cik}:${item.symbol}`,item])).values()];
};
const valid=item=>/^\d{10}$/.test(item.cik)&&/^[A-Z][A-Z0-9.-]{0,11}$/.test(item.symbol)&&typeof item.name==='string'&&Boolean(item.name.trim());

export function createSECLookup({request=remote}={}){
 const read=createMarketCache();
 const getJSON=async(url,signal)=>JSON.parse((await request(url,{signal})).toString('utf8'));
 return (query,signal)=>read(`query:${query.toUpperCase()}`,async shared=>{
  let primaryError;
  try{
   const data=await getJSON(`https://efts.sec.gov/LATEST/search-index?keysTyped=${encodeURIComponent(query)}&narrow=true`,shared);
   if(data.timed_out||!Array.isArray(data.hits?.hits))throw new Error('SEC公司检索响应无效或超时');
   const items=data.hits.hits.flatMap(hit=>String(hit._source?.tickers??'').split(/[,;\s]+/).map(ticker=>({
    market:'US',symbol:ticker.toUpperCase(),cik:String(hit._id).padStart(10,'0'),name:String(hit._source?.entity??'').replace(/\s*\([^)]*\)\s*$/,''),verifiedBy:'SEC官方公司索引',
   }))).filter(valid);
   const matches=select(items,query);if(matches.length)return matches;
  }catch(error){shared.throwIfAborted();primaryError=error.message;}
  try{
   // SEC documents this directory as the ticker/CIK/name association file.
   const items=await read('directory',async directorySignal=>{
    const data=await getJSON('https://www.sec.gov/files/company_tickers.json',directorySignal);
    if(!data||Array.isArray(data)||typeof data!=='object')throw new Error('SEC官方代码目录格式无效');
    const items=Object.values(data).map(item=>({market:'US',symbol:String(item.ticker??'').toUpperCase(),cik:String(item.cik_str).padStart(10,'0'),name:item.title,verifiedBy:'SEC官方证券目录'}));
    if(!items.length||items.some(item=>!valid(item)))throw new Error('SEC官方代码目录格式无效');
    return items;
   },{signal:shared,ttlMs:86400000});
   return select(items,query);
  }catch(error){shared.throwIfAborted();throw new Error(`SEC公司身份查询失败：${[primaryError,error.message].filter(Boolean).join('；')}`);}
 },{signal,ttlMs:3600000});
}

export const lookupSECCompanies=createSECLookup();
