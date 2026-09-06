import https from 'node:https';
import {lookup as dnsLookup} from 'node:dns/promises';
import {BlockList,isIP} from 'node:net';
import {createGunzip,createBrotliDecompress,createInflate} from 'node:zlib';
import {remote} from './market-request.mjs';

const blocked=new BlockList();
for(const [address,prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['168.63.129.16',32],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.88.99.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]])blocked.addSubnet(address,prefix,'ipv4');
const globalV6=new BlockList();globalV6.addSubnet('2000::',3,'ipv6');
for(const [address,prefix] of [['2001::',23],['2001:db8::',32],['2002::',16],['3fff::',20]])blocked.addSubnet(address,prefix,'ipv6');
export function publicAddress(address){
 const family=isIP(address);return family===4?!blocked.check(address,'ipv4'):family===6&&globalV6.check(address,'ipv6')&&!blocked.check(address,'ipv6');
}
export function publicWebURL(value){
 if(typeof value!=='string'||value.length>2048)throw new Error('网页地址无效');
 const url=new URL(value),host=url.hostname.toLowerCase();
 if(url.protocol!=='https:'||url.username||url.password||url.port&&url.port!=='443'||isIP(host.replace(/^\[|\]$/g,''))||!host.includes('.')||host.endsWith('.')||/(?:^|\.)(?:localhost|local|internal|test|invalid|onion)$/.test(host))throw new Error('仅允许公开HTTPS网页，不能读取本机、内网或带凭证地址');
 if([...url.searchParams.keys()].some(key=>/^(?:token|access_token|api_key|key|signature|sig|auth|password|x-amz-.+|x-goog-.+)$/i.test(key)))throw new Error('不读取带访问凭证的网页链接');
 url.hash='';return url;
}
export function createPublicWebLookup({systemLookup=dnsLookup,fetchImpl=(...args)=>fetch(...args),enabled=()=>process.env.WEB_RESEARCH_PUBLIC_DNS!=='false'}={}){
 return async(host,options={})=>{
  const addresses=await systemLookup(host,{all:true,verbatim:true});
  // Some desktop tunnels synthesize 198.18/15 addresses. Never connect to
  // those reserved addresses: independently resolve the public hostname and
  // validate/pin the real public answer instead. Other private answers fail.
  if(!enabled()||!addresses.length||!addresses.every(item=>/^198\.(?:18|19)\./.test(item.address)))return addresses;
  const url=new URL('https://cloudflare-dns.com/dns-query');url.searchParams.set('name',host);url.searchParams.set('type','A');
  const response=await fetchImpl(url,{headers:{accept:'application/dns-json'},redirect:'error',signal:AbortSignal.any([options.signal,AbortSignal.timeout(8000)].filter(Boolean))});
  if(!response.ok){await response.body?.cancel();throw new Error('公共DNS校验不可用，未连接保留地址');}
  const chunks=[];let size=0;for await(const chunk of response.body){size+=chunk.length;if(size>100000)throw new Error('公共DNS响应超限');chunks.push(chunk);}
  const data=JSON.parse(Buffer.concat(chunks).toString('utf8')),normalize=name=>String(name).toLowerCase().replace(/\.$/,'');
  if(data.Status!==0||data.TC||!data.Question?.some(item=>normalize(item.name)===normalize(host)&&item.type===1)||!Array.isArray(data.Answer))throw new Error('公共DNS未返回匹配的完整结果');
  const names=new Set([normalize(host)]);
  for(let round=0;round<8;round++)for(const item of data.Answer)if(item.type===5&&names.has(normalize(item.name)))names.add(normalize(item.data));
  const verified=data.Answer.filter(item=>item.type===1&&names.has(normalize(item.name))).map(item=>({address:item.data,family:4}));
  if(!verified.length||verified.some(item=>!publicAddress(item.address)))throw new Error('公共DNS返回非公开地址，未读取');
  return verified;
 };
}
const publicLookup=createPublicWebLookup();
export function createWebDocumentFetcher({lookup=publicLookup,requestImpl=https.request,clock=Date.now,secRequest=remote}={}){
 const cooldown=new Map();
 return async(value,{signal,maxBytes=12_000_000,timeoutMs=25000}={})=>{
  const combined=AbortSignal.any([signal,AbortSignal.timeout(timeoutMs)].filter(Boolean));
  let url=publicWebURL(value);
  for(let redirect=0;redirect<=3;redirect++){
   combined.throwIfAborted();
   if(['www.sec.gov','data.sec.gov','efts.sec.gov'].includes(url.hostname)){
    const bytes=await secRequest(url.href,{signal:combined,maxBytes,totalTimeoutMs:timeoutMs,retries:0});
    return {bytes,url:url.href,contentType:bytes.subarray(0,1024).toString('latin1').includes('%PDF-')?'application/pdf':'text/html; charset=utf-8'};
   }
   if(cooldown.get(url.hostname)>clock())throw new Error(`${url.hostname} 暂在拒绝访问/限流冷却期`);
   // Validate every DNS answer, then pin those same answers on the TLS request.
   // No second resolver lookup is allowed (prevents DNS rebinding).
   let abort;const interrupted=new Promise((_,reject)=>{abort=()=>reject(combined.reason);combined.addEventListener('abort',abort,{once:true});});
   let addresses;try{addresses=await Promise.race([lookup(url.hostname,{all:true,verbatim:true,signal:combined}),interrupted]);}finally{combined.removeEventListener('abort',abort);}
   combined.throwIfAborted();
   if(!addresses.length||addresses.some(item=>!publicAddress(item.address)))throw new Error('网页域名解析到非公开地址，未读取');
   const response=await new Promise((resolve,reject)=>{
    const req=requestImpl(url,{method:'GET',signal:combined,agent:false,headers:{Accept:'text/html,application/xhtml+xml,application/pdf,text/plain;q=0.8','Accept-Encoding':'gzip, br, deflate','User-Agent':url.hostname==='www.sec.gov'||url.hostname==='data.sec.gov'?process.env.SEC_USER_AGENT||'ZhiHengResearch/1.0':'ZhiHengResearch/1.0'},
     lookup:(_host,options,callback)=>{const selected=addresses.filter(item=>!options.family||item.family===options.family);if(!selected.length)return callback(new Error('无匹配公网地址'));callback(null,...(options.all?[selected]:[selected[0].address,selected[0].family]));}},res=>resolve(res));
    req.once('error',reject);req.end();
   });
   if([301,302,303,307,308].includes(response.statusCode)){
    response.destroy();if(redirect===3)throw new Error('网页重定向次数超限');
    if(!response.headers.location)throw new Error('网页重定向缺少目标');
    url=publicWebURL(new URL(response.headers.location,url).href);continue;
   }
   if(response.statusCode!==200){
    response.destroy();
    if([401,403,429].includes(response.statusCode)){
     const retry=response.headers['retry-after'],seconds=Number(retry),until=Number.isFinite(seconds)&&seconds>0?clock()+seconds*1000:Date.parse(retry);
     cooldown.set(url.hostname,Math.max(clock()+(response.statusCode===429?60000:900000),Number.isFinite(until)?until:0));
    }
    throw new Error(`正文读取失败 HTTP ${response.statusCode}，不绕过访问限制`);
   }
   if(Number(response.headers['content-length'])>maxBytes){response.destroy();throw new Error('网页文件超过大小上限');}
   const contentType=String(response.headers['content-type']||'').toLowerCase();
   if(!/^(?:text\/(?:html|plain)|application\/(?:pdf|xhtml\+xml|octet-stream))(?:;|$)/.test(contentType)){response.destroy();throw new Error('网页不是支持的正文格式');}
   const encoding=response.headers['content-encoding'],decoder=encoding==='gzip'?createGunzip():encoding==='br'?createBrotliDecompress():encoding==='deflate'?createInflate():null;
   if(encoding&&encoding!=='identity'&&!decoder){response.destroy();throw new Error('网页压缩格式不支持');}
   let wireSize=0;response.on('data',chunk=>{wireSize+=chunk.length;if(wireSize>maxBytes)response.destroy(new Error('网页压缩文件超过大小上限'));});
   if(decoder)response.on('error',error=>decoder.destroy(error));
   const stream=decoder?response.pipe(decoder):response,chunks=[];let size=0;
   try{for await(const chunk of stream){combined.throwIfAborted();size+=chunk.length;if(size>maxBytes)throw new Error('网页正文超过大小上限');chunks.push(chunk);}}
   finally{response.destroy();decoder?.destroy();}
   combined.throwIfAborted();return {bytes:Buffer.concat(chunks),url:url.href,contentType};
  }
 };
}
export const fetchWebDocument=createWebDocumentFetcher();
