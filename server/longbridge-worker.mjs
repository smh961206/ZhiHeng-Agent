import {createRequire} from 'node:module';
import {createMarketCache} from './market-cache.mjs';
import {redactProviderError} from './data-provider-config.mjs';
const require=createRequire(import.meta.url);
let context,secrets=[];const read=createMarketCache({maxEntries:256});
process.on('disconnect',()=>process.exit(0));
process.on('message',async({type,credentials,id,symbol})=>{
 if(type==='configure'){
  if(context)return;
  secrets=Object.values(credentials);
  try{
   const {Config,QuoteContext}=require('longbridge');
   context=QuoteContext.new(Config.fromApikey(credentials.appKey,credentials.appSecret,credentials.accessToken,{
    httpUrl:'https://openapi.longbridge.com',quoteWsUrl:'wss://openapi-quote.longbridge.com/v2',
    enablePrintQuotePackages:false,enableOvernight:false,
   }));
  }catch{process.exit(1);}
  return;
 }
 try{
  if(!context)throw new Error('长桥行情连接未初始化');
  const [quotes,info]=await Promise.all([
   context.quote([symbol]),
   read(symbol,async()=>{
    const [item]=await context.staticInfo([symbol]);
    if(!item||item.symbol!==symbol)throw new Error('长桥证券基础信息不匹配');
    return {symbol:item.symbol,currency:item.currency,name:item.nameCn||item.nameEn||item.nameHk,totalShares:item.totalShares,circulatingShares:item.circulatingShares,hkShares:item.hkShares,fetchedAt:new Date().toISOString()};
   },{ttlMs:86400000}),
  ]);
  const quote=quotes.find(item=>item.symbol===symbol);
  if(!quote)throw new Error('长桥没有返回该证券行情');
  process.send?.({id,value:{symbol:quote.symbol,lastDone:quote.lastDone.toString(),prevClose:quote.prevClose.toString(),timestamp:quote.timestamp.toISOString(),info}});
 }catch(error){process.send?.({id,error:redactProviderError(error,secrets)});}
});
