// Shared navigation lockup: locale changes the name, never the symbol.
export default function Brand({locale='zh',onClick,className=''}) {
 const international=locale.startsWith('en');
 return <button type="button" className={`brand ${className}`} onClick={onClick} aria-label={`${international?'ZHIHENG':'知衡'} · ${international?'Home':'首页'}`}>
  <img className="brand-symbol" src="/brand/zhiheng-symbol.svg" alt="" width="42" height="42"/>
  <span className={`brand-wordmark ${international?'brand-international':''}`}>{international?'ZHIHENG':'知衡'}{!international&&<span className="brand-en">知价值，衡长远</span>}</span>
 </button>;
}

