import {isNumber,quoteMovement,quoteNumber} from '../lib/security-display.mjs';

export default function CompanyQuotePreview({item,loading,blocked,error=false,className=''}){
 const quote=item?.quote,{percent,direction}=quoteMovement(quote||{});
 const failed=Boolean(item?.error||error);
 return <span className={`multi-company-price quote-${direction} ${className}`}>
  {quote?<><strong>{quoteNumber(quote.price)} <small>{quote.currency}</small></strong><span>{quoteNumber(percent,{signed:true})}{isNumber(percent)?'%':''}</span></>:<span className={failed?'multi-company-error':''}>{failed?'行情暂不可用':blocked?'待核对标的':loading?'行情加载中…':'等待行情'}</span>}
 </span>;
}
