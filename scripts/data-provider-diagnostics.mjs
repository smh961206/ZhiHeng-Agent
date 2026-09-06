// Read-only checks for optional paid/account-based sources. No orders or model calls.
import {providerStatus} from '../server/data-provider-config.mjs';
import {fetchLongbridgeQuote} from '../server/longbridge-quotes.mjs';
import {fetchTushareFinancials} from '../server/tushare-financials.mjs';
import {closeStorage} from '../server/storage.mjs';
const status=providerStatus(),samples=[{market:'CN',symbol:'600519'},{market:'HK',symbol:'00700'},{market:'US',symbol:'AAPL'}];
console.log(JSON.stringify({configuration:status}));
let passed=0,failed=0,skipped=0;
try{
 for(const security of samples)for(const provider of ['longbridge','tushare']){
  const name=`${provider} ${security.market}:${security.symbol}`;
  if(!status[provider].configured){skipped++;console.log(JSON.stringify({name,status:'skipped',reason:'尚未配置凭证'}));continue;}
  const started=Date.now();
  try{
   const signal=AbortSignal.timeout(90000);let detail;
   if(provider==='longbridge'){
    const quote=await fetchLongbridgeQuote(security,signal);detail={provider:quote.provider,currency:quote.currency,asOf:quote.asOf};
   }else{
    const result=await fetchTushareFinancials(security,{years:3,signal});
    if(result.sources.length!==3)throw new Error(result.warnings.join('；')||'三张财务报表未全部返回');
    detail={tables:result.coverage};
   }
   passed++;console.log(JSON.stringify({name,status:'passed',ms:Date.now()-started,detail}));
  }catch(error){failed++;console.log(JSON.stringify({name,status:'failed',ms:Date.now()-started,error:error.message}));}
 }
}finally{fetchLongbridgeQuote.close();await closeStorage();}
console.log(JSON.stringify({passed,failed,skipped}));
process.exitCode=failed?1:skipped?2:0;
