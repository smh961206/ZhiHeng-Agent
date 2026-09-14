// One input contract for the workbench, quotes and research creation.
export function validateSecurities(value){
 if(!Array.isArray(value)||value.length>3)throw new Error('每项研究最多3个标的');
 const securities=value.map(x=>{
  if(!x||!['CN','HK','US'].includes(x.market)||typeof x.symbol!=='string')throw new Error('市场或股票代码无效');
  const symbol=x.symbol.trim().toUpperCase();
  if(x.market==='CN'&&!/^[036489]\d{5}$/.test(symbol))throw new Error('A股请输入6位股票代码');
  if(x.market==='HK'&&!/^\d{1,5}$/.test(symbol))throw new Error('港股请输入1至5位代码');
  if(x.market==='US'&&!/^[A-Z][A-Z0-9.-]{0,11}$/.test(symbol))throw new Error('美股代码格式无效，例如 AAPL、BRK-B');
  return {market:x.market,symbol:x.market==='HK'?symbol.padStart(5,'0'):symbol};
 });
 return [...new Map(securities.map(x=>[x.market+':'+x.symbol,x])).values()];
}
