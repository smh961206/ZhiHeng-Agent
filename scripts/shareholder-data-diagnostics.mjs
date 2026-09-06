// External read-only checks; only local data archives are written.
import {closeStorage} from '../server/storage.mjs';
import {fetchShareholderData} from '../server/shareholder-data.mjs';
import {fetchTushareFinancials} from '../server/tushare-financials.mjs';
import {checkDataBasis} from '../server/data-basis.mjs';
const security={market:'CN',symbol:process.argv[2]||'600519'};
if(!/^[036489]\d{5}$/.test(security.symbol))throw new Error('请提供有效A股代码');
const signal=AbortSignal.timeout(240000);
try{
const financials=await fetchTushareFinancials(security,{years:9,signal});
console.log(JSON.stringify({security,financialTables:financials.coverage}));
const shareholder=await fetchShareholderData(security,{years:8,signal});
console.log(JSON.stringify({configured:shareholder.configured,coverage:shareholder.coverage.map(({changes,annualSnapshots,...item})=>({...item,shareChangeObservations:changes?.length})),warnings:shareholder.warnings}));
console.log(JSON.stringify({basis:checkDataBasis(security,{years:8,financials,shareholder}).checks.map(({id,status,missingYears,conflictingYears,checkedRows})=>({id,status,missingYears,conflictingYears,checkedRows}))}));
process.exitCode=!shareholder.configured?2:shareholder.coverage.some(item=>item.status==='failed'||item.limited)||financials.sources.length!==3?1:0;
}finally{await closeStorage();}
