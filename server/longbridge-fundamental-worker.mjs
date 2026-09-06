import {createRequire} from 'node:module';
import {redactProviderError} from './data-provider-config.mjs';
const require=createRequire(import.meta.url),methods=new Set(['valuationHistory','dividendDetail','buyback','corpAction']);
let context,secrets=[];
process.on('disconnect',()=>process.exit(0));
process.on('message',async({type,credentials,id,symbol,method})=>{
 if(type==='configure'){
  if(context)return;secrets=Object.values(credentials);
  try{
   const {Config,FundamentalContext}=require('longbridge');
   context=FundamentalContext.new(Config.fromApikey(credentials.appKey,credentials.appSecret,credentials.accessToken,{httpUrl:'https://openapi.longbridge.com',enablePrintQuotePackages:false}));
  }catch{process.exit(1);}return;
 }
 try{
  if(!context||!methods.has(method))throw new Error('未授权的基本面读取方法');
  const data=await context[method](symbol);
  if(JSON.stringify(data).length>12_000_000)throw new Error('基本面响应超过大小上限');
  process.send?.({id,value:{symbol,method,data,fetchedAt:new Date().toISOString()}});
 }catch(error){process.send?.({id,error:redactProviderError(error,secrets)});}
});
