export function securityIdentity({market,symbol=''}) {
 const code=String(symbol).trim().toUpperCase();
 if(market==='CN')return {market:'A股',code:`${code.startsWith('6')?'SH':/^[489]/.test(code)?'BJ':'SZ'}:${code}`};
 if(market==='HK')return {market:'港股',code:`HK:${code.padStart(5,'0')}`};
 return {market:'美股',code:`US:${code}`};
}

const logos={
 'CN:601318':'pingan.png','HK:02318':'pingan.png',
 'CN:002594':'byd.ico','HK:01211':'byd.ico',
 'CN:601633':'gwm.ico','HK:02333':'gwm.ico',
 'CN:601127':'seres.ico','HK:09927':'seres.ico',
 'CN:600519':'moutai.ico','HK:00700':'tencent.png',
 'US:AAPL':'apple.ico','US:MSFT':'microsoft.ico','US:TSLA':'tesla.ico','US:NVDA':'nvidia.ico',
};
export function companyLogo(security){
 const symbol=security.market==='HK'?String(security.symbol).padStart(5,'0'):String(security.symbol).toUpperCase();
 const file=logos[`${security.market}:${symbol}`];
 return file?`/company-logos/${file}`:null;
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
