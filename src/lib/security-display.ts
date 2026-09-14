export function securityIdentity({market,symbol=''}) {
 const code=String(symbol).trim().toUpperCase();
 if(market==='CN')return {market:'A股',code:`${code.startsWith('6')?'SH':/^[489]/.test(code)?'BJ':'SZ'}:${code}`};
 if(market==='HK')return {market:'港股',code:`HK:${code.padStart(5,'0')}`};
 return {market:'美股',code:`US:${code}`};
}

export function companyLogo(security){
 const market=security?.market;
 let symbol=String(security?.symbol??'').trim().toUpperCase();
 if(market==='HK'){
  if(!/^\d{1,5}$/.test(symbol)||Number(symbol)===0)return null;
  symbol=symbol.padStart(5,'0');
 }else if(market==='CN'){
  if(!/^\d{6}$/.test(symbol)||Number(symbol)===0)return null;
 }else if(market==='US'){
  if(!/^[A-Z][A-Z0-9]*(?:[.-][A-Z0-9]+)*$/.test(symbol)||symbol.length>16)return null;
 }else return null;
 return `/api/securities/${market}/${encodeURIComponent(symbol)}/logo`;
}
export const isNumber=value=>typeof value==='number'&&Number.isFinite(value);
export function quoteNumber(value,{signed=false}={}){
 return isNumber(value)?new Intl.NumberFormat('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:4,...(signed?{signDisplay:'exceptZero'}:{})}).format(value):'—';
}
export function quoteAmount(value,unit=''){
 if(!isNumber(value)||value<0)return '—';
 const divisor=value>=1e8?1e8:value>=1e4?1e4:1;
 return new Intl.NumberFormat('zh-CN',{maximumFractionDigits:2}).format(value/divisor)+(divisor===1e8?'亿':divisor===1e4?'万':'')+unit;
}
export function quoteMovement(quote){
 const change=isNumber(quote.price)&&isNumber(quote.previousClose)&&quote.previousClose>0?quote.price-quote.previousClose:null;
 const percent=isNumber(quote.changePercent)?quote.changePercent:change!==null?change/quote.previousClose*100:null;
 return {change,percent,direction:percent>0?'up':percent<0?'down':'flat'};
}
