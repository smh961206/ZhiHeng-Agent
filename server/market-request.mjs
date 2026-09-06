import {setTimeout as pause} from 'node:timers/promises';

const allowedHosts=new Set(['push2.eastmoney.com','query1.finance.yahoo.com','qt.gtimg.cn','www.cninfo.com.cn','static.cninfo.com.cn','www.sec.gov','efts.sec.gov','data.sec.gov','api.tushare.pro','www1.hkexnews.hk','www.hkexnews.hk','static.www.tencent.com']);
const transientCodes=new Set(['ECONNRESET','ECONNREFUSED','ETIMEDOUT','EAI_AGAIN','ENOTFOUND','UND_ERR_CONNECT_TIMEOUT','UND_ERR_HEADERS_TIMEOUT','UND_ERR_BODY_TIMEOUT','UND_ERR_SOCKET']);
const transientStatus=new Set([408,500,502,503,504]);
const tushareReads=new Set(['income','balancesheet','cashflow','hk_income','hk_balancesheet','hk_cashflow','us_income','us_balancesheet','us_cashflow','dividend','repurchase','daily_basic']);
const secHost=host=>host.endsWith('.sec.gov');
const retryDelay=(value,now)=>{
 if(!value)return 0;
 const milliseconds=/^\d+(\.\d+)?$/.test(value)?Number(value)*1000:Date.parse(value)-now;
 return Number.isFinite(milliseconds)?Math.max(0,milliseconds):0;
};

export function createRemoteClient({fetchImpl=(...args)=>fetch(...args),wait=pause,clock=Date.now,random=Math.random}={}){
 let secQueue=Promise.resolve(),hkexQueue=Promise.resolve();
 const blocked=new Map();
 return async function remote(url,{signal,method='GET',body,contentType='application/x-www-form-urlencoded',maxBytes=12_000_000,timeoutMs=15000,retries=2,totalTimeoutMs=45000}={}){
  const parsed=new URL(url),host=parsed.hostname,isSEC=secHost(host);
  if(parsed.protocol!=='https:'||!allowedHosts.has(host)||parsed.username||parsed.password||parsed.port&&parsed.port!=='443')throw new Error('数据源地址不在允许列表');
  if(host==='www.sec.gov'&&parsed.pathname!=='/files/company_tickers.json'&&!/^\/Archives\/edgar\/data\/\d+\/\d{18}\/[\w.-]+\.(?:htm|html|txt|pdf|json)$/i.test(parsed.pathname))throw new Error('数据源地址不在允许列表');
  if(host.endsWith('.hkexnews.hk')&&!/^\/(?:search\/(?:prefix\.do|titlesearch\.xhtml)|listedco\/listconews\/sehk\/\d{4}\/\d{4}\/[\w.-]+\.pdf)$/i.test(parsed.pathname))throw new Error('数据源地址不在允许列表');
  if(host==='static.www.tencent.com'&&!/^\/(?:storage\/)?uploads\/\d{4}\/\d{2}\/\d{2}\/[a-f0-9]+\.pdf$/i.test(parsed.pathname))throw new Error('数据源地址不在允许列表');
  if(host==='api.tushare.pro'&&(parsed.pathname!=='/'||parsed.search))throw new Error('数据源地址不在允许列表');
  signal?.throwIfAborted();
  const deadline=AbortSignal.timeout(totalTimeoutMs),combined=signal?AbortSignal.any([signal,deadline]):deadline;
  const started=clock(),scope=isSEC?'sec.gov':host;
  const checkBlocked=()=>{
   const entry=blocked.get(scope);
   if(entry&&entry.until>clock())throw new Error(`${host} HTTP ${entry.status}：来源拒绝访问或限流，冷却中（约${Math.ceil((entry.until-clock())/1000)}秒）；不会绕过限制${isSEC?'。请检查 SEC_USER_AGENT 的真实联系信息':''}`);
   blocked.delete(scope);
  };
  const headers={'User-Agent':isSEC?(process.env.SEC_USER_AGENT||'ValueResearchAgent/1.0 local-research'):'ValueResearchAgent/1.0','Accept':'application/json, application/pdf, */*'};
  if(body)headers['Content-Type']=contentType;
  if(host.endsWith('.cninfo.com.cn'))headers.Referer='https://www.cninfo.com.cn/';
  if(host.endsWith('.hkexnews.hk'))headers.Referer='https://www1.hkexnews.hk/search/titlesearch.xhtml';
  // Only allowlisted read APIs can replay a POST; never replay writes.
  let tushareRead=false;
  if(host==='api.tushare.pro'&&method==='POST'){try{tushareRead=tushareReads.has(JSON.parse(body).api_name);}catch{}}
  const safeToRetry=method==='GET'||method==='POST'&&(host==='www.cninfo.com.cn'&&parsed.pathname==='/new/hisAnnouncement/query'||tushareRead);
  for(let attempt=0;;attempt++){
   signal?.throwIfAborted();checkBlocked();
   if(isSEC){
    const slot=secQueue.then(()=>wait(350,undefined,{signal:combined}));
    secQueue=slot.catch(()=>{});await slot;
    signal?.throwIfAborted();checkBlocked();
   }
   if(host.endsWith('.hkexnews.hk')){
    const slot=hkexQueue.then(()=>wait(400,undefined,{signal:combined}));hkexQueue=slot.catch(()=>{});await slot;signal?.throwIfAborted();checkBlocked();
   }
   const attemptSignal=AbortSignal.any([combined,AbortSignal.timeout(timeoutMs)]);
   let retryAfter=0;
   try{
    const response=await fetchImpl(url,{signal:attemptSignal,method,body,headers,redirect:'error'});
    if(!response.ok){
     retryAfter=retryDelay(response.headers.get('retry-after'),clock());
     await response.body?.cancel();
     const restricted=[403,429].includes(response.status);
     if(restricted)blocked.set(scope,{status:response.status,until:clock()+Math.max(retryAfter,response.status===403?15*60000:60000)});
     throw Object.assign(new Error(`${host} HTTP ${response.status}${restricted?'：来源拒绝访问或限流；不会绕过限制'+(isSEC?'。请检查 SEC_USER_AGENT 的真实联系信息':''):''}`),{retryable:transientStatus.has(response.status)});
    }
    if(Number(response.headers.get('content-length'))>maxBytes){await response.body?.cancel();throw Object.assign(new Error('数据文件超过大小上限'),{retryable:false});}
    const chunks=[];let size=0;
    for await(const chunk of response.body){
     size+=chunk.length;
     if(size>maxBytes)throw Object.assign(new Error('数据文件超过大小上限'),{retryable:false});
     chunks.push(chunk);
    }
    return Buffer.concat(chunks);
   }catch(error){
    signal?.throwIfAborted();
    const code=error.cause?.code||error.code;
    const retryable=error.retryable??(attemptSignal.aborted||transientCodes.has(code)||error.message==='fetch failed'&&!code);
    const backoff=Math.max(retryAfter,400*2**attempt+Math.floor(random()*200));
    const remaining=totalTimeoutMs-(clock()-started);
    if(!safeToRetry||!retryable||attempt>=retries||combined.aborted||backoff>=remaining){
     const reason=attemptSignal.aborted?'请求超时':error.message==='fetch failed'?`网络连接失败${code?`（${code}）`:''}`:error.message;
     throw new Error(`${host}：${reason}（已尝试${attempt+1}次）`,{cause:error});
    }
    await wait(backoff,undefined,{signal:combined});
   }
  }
 };
}

export const remote=createRemoteClient();
