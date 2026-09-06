import {fork} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {providerConfig,redactProviderError} from './data-provider-config.mjs';

export function longbridgeSymbol(security){
 if(security.market==='HK'&&/^\d{5}$/.test(security.symbol))return `${Number(security.symbol)}.HK`;
 if(security.market==='US'&&/^[A-Z][A-Z0-9.-]{0,11}$/.test(security.symbol))return `${security.symbol.replaceAll('-','.')}.US`;
 if(security.market==='CN'&&/^[036]\d{5}$/.test(security.symbol))return `${security.symbol}.${security.symbol.startsWith('6')?'SH':'SZ'}`;
 throw new Error('长桥当前适配沪深A股、港股和美股；该代码使用其他行情源');
}
export function parseLongbridge(value,security,fetchedAt=new Date().toISOString()){
 const symbol=longbridgeSymbol(security);
 if(value?.symbol!==symbol||value.info?.symbol!==symbol)throw new Error('长桥行情证券代码不匹配');
 const number=value=>typeof value==='string'&&value.trim()!==''&&Number.isFinite(Number(value))?Number(value):null;
 const price=number(value.lastDone),previousClose=number(value.prevClose),time=Date.parse(value.timestamp);
 if(!(price>0)||!Number.isFinite(time)||time<946684800000||typeof value.info.currency!=='string'||!/^[A-Z]{3}$/.test(value.info.currency))throw new Error('长桥行情价格、币种或时间无效');
 const shares=value=>Number.isSafeInteger(value)&&value>0?value:null;
 return {market:security.market,symbol:security.symbol,name:value.info.name||security.symbol,currency:value.info.currency,price,
  shareCapital:{totalShares:shares(value.info.totalShares),circulatingShares:shares(value.info.circulatingShares),hkShares:security.market==='HK'?shares(value.info.hkShares):null,unit:'股',fetchedAt:value.info.fetchedAt||fetchedAt,asOf:null,shareBasisVerified:false,
   notice:'证券基础信息快照，数据生效日期未提供，抓取时间不是生效日。总股本、流通股本及港股股数分列；不代表稀释加权平均股本，A/H与ADR每份对应股数仍须核对。'},
  previousClose:previousClose>0?previousClose:null,changePercent:previousClose>0?(price/previousClose-1)*100:null,
  asOf:new Date(time).toISOString(),fetchedAt,provider:'长桥 OpenAPI',official:false,url:'https://open.longbridge.cn/zh-CN/docs/quote/pull/quote',
  notice:'长桥账户授权行情；延迟取决于市场权限。使用常规行情字段，不混入盘前、盘后及夜盘价格。行情币种与财报币种分别核对。'};
}

function createConnectionProcess(url,{workerData}){
 // Isolate the native SDK: terminating it during connection startup must never
 // terminate the HTTP server. Worker-thread termination is unsafe for this SDK.
 const child=fork(fileURLToPath(url),[],{stdio:['ignore','ignore','ignore','ipc'],windowsHide:true,execArgv:[]});
 const ref=child.ref.bind(child),unref=child.unref.bind(child);
 child.ref=()=>{ref();child.channel?.ref();};child.unref=()=>{unref();child.channel?.unref();};
 child.postMessage=message=>child.send(message);
 child.terminate=async()=>{if(!child.killed)child.kill();};
 child.send({type:'configure',credentials:workerData});
 return child;
}
export function createLongbridgeFetcher({credentials=()=>providerConfig().longbridge,createWorker=createConnectionProcess,timeoutMs=10000,workerUrl=new URL('./longbridge-worker.mjs',import.meta.url),parseValue=(value,security)=>parseLongbridge(value,security)}={}){
 let worker,sequence=0;const pending=new Map();
 const destroy=current=>{if(worker===current)worker=undefined;void current.terminate().catch(()=>{});};
 const start=()=>{
  if(worker)return worker;
  const keys=credentials();if(!['appKey','appSecret','accessToken'].every(key=>keys[key]))throw new Error('长桥凭证未完整配置');
  const current=createWorker(workerUrl,{workerData:keys});worker=current;
  const fail=error=>{
   for(const task of [...pending.values()])if(task.worker===current)task.finish(new Error(`长桥行情连接失败：${redactProviderError(error,Object.values(keys))}`));
   destroy(current);
  };
  current.on('message',message=>{
   const task=pending.get(message?.id);if(!task||task.worker!==current)return;
   if(message.error)task.finish(new Error(`长桥：${redactProviderError(message.error,Object.values(keys))}`));
   else if(message.value)task.finish(null,message.value);
  });
  current.on('error',fail);current.on('exit',code=>{if(worker===current)fail(new Error(`连接进程退出（${code}）`));});
  return current;
 };
 const fetchQuote=async(security,signal,options={})=>{
  signal?.throwIfAborted();const symbol=longbridgeSymbol(security);
  if(pending.size>=5)throw new Error('长桥行情请求繁忙，使用备用源');
  const current=start(),id=++sequence;current.ref();
  const value=await new Promise((resolve,reject)=>{
   let finished=false;
   const finish=(error,value)=>{
    if(finished)return;finished=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);pending.delete(id);
    if(!pending.size){if(error)destroy(current);else current.unref();}
    error?reject(error):resolve(value);
   };
   const abort=()=>finish(signal.reason||new Error('行情请求已取消'));
   const timer=setTimeout(()=>finish(new Error('长桥行情请求超时，使用备用源')),timeoutMs);
   pending.set(id,{worker:current,finish});signal?.addEventListener('abort',abort,{once:true});
   try{current.postMessage({...options,id,symbol});}catch(error){finish(error);}
   if(signal?.aborted)abort();
  });
  signal?.throwIfAborted();return parseValue(value,security,options);
 };
 fetchQuote.close=()=>{
  for(const task of [...pending.values()])task.finish(new Error('长桥行情连接已关闭'));
  if(worker)destroy(worker);
 };
 return fetchQuote;
}
export const fetchLongbridgeQuote=createLongbridgeFetcher();
