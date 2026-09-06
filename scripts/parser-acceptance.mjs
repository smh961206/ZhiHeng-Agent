import {readFile,writeFile} from 'node:fs/promises';
import {createOfficialReportReader} from '../server/official-reports.mjs';
import {remote} from '../server/market-request.mjs';
import {getStorage,closeStorage} from '../server/storage.mjs';
import {secFactsSources} from '../server/market-data.mjs';
import {xbrlObservations} from '../server/financial-observations.mjs';
import {sourceSummary} from '../server/document-layout.mjs';
import {searchEvidence} from '../server/evidence-search.mjs';
import assert from 'node:assert/strict';
const sampleDirectory=new URL('../artifacts/parser/',import.meta.url);
const reports=[
 {title:'贵州茅台2026年第一季度报告',security:'CN:600519',date:'2026-04-25',url:'https://static.cninfo.com.cn/finalpage/2026-04-25/1225187851.PDF'},
 {title:'腾讯2020年年度报告',security:'HK:00700',date:'2021-04-08',url:'https://www1.hkexnews.hk/listedco/listconews/sehk/2021/0408/2021040802046_c.pdf'},
 {title:'Apple 2026-06-27 10-Q',security:'US:AAPL',date:'2026-07-31',reportDate:'2026-06-27',form:'10-Q',accession:'0000320193-26-000020',url:'https://www.sec.gov/Archives/edgar/data/320193/000032019326000020/aapl-20260627.htm'}
];
const result={startedAt:new Date().toISOString(),sources:[],sampleOnly:true};
try{
 const store=await getStorage();
 const reader=createOfficialReportReader({storage:async()=>store});
 for(const report of reports){
  const started=Date.now(),source=await reader(report,AbortSignal.timeout(180000));
  assert.ok(source.documentBlocks.length);assert.ok(source.parsedSha256);
  const cached=await createOfficialReportReader({storage:async()=>store,request:async()=>{throw new Error('offline archive check');}})(report);
  assert.equal(cached.fromCache,true);assert.equal(cached.parsedSha256,source.parsedSha256);assert.equal(cached.fetchedAt,source.fetchedAt);
  result.sources.push({...sourceSummary(source),bytes:Buffer.byteLength(JSON.stringify(source)),archiveRecovered:true,ms:Date.now()-started});
  await writeFile(new URL(report.security.split(':')[0]+'.official.json',sampleDirectory),JSON.stringify(source));
  console.log(JSON.stringify({security:report.security,ms:Date.now()-started,pages:source.pages,blocks:source.documentBlocks.length,facts:source.financialFacts?.length,archiveRecovered:true}));
 }
 const url='https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json';
 const data=JSON.parse((await remote(url,{maxBytes:35000000,signal:AbortSignal.timeout(90000)})).toString('utf8'));
 const [api]=secFactsSources(data,[reports[2]],{symbol:'AAPL'},url);api.id='S2';
 await writeFile(new URL('US.companyfacts.json',sampleDirectory),JSON.stringify(api));
 const body=JSON.parse(await readFile(new URL('US.official.json',sampleDirectory)));body.id='S1';
 const key=f=>JSON.stringify([f.tag,f.unit,f.start||null,f.end]);
 const pairs=body.financialFacts.filter(f=>f.standardConcept&&!f.dimensions.length).flatMap(f=>{
  const counterparts=api.financialFacts.filter(a=>key(a)===key(f));return counterparts.length?[{tag:f.tag,unit:f.unit,start:f.start,end:f.end,inline:f.value,api:[...new Set(counterparts.map(a=>a.value))],matched:counterparts.some(a=>a.value===f.value)}]:[];
 });
 const unique=[...new Map(pairs.map(pair=>[key(pair),pair])).values()];
 result.crossCheck={pairedFacts:pairs.length,distinctFacts:unique.length,matches:pairs.filter(p=>p.matched).length,conflicts:pairs.filter(p=>!p.matched),netIncome:unique.filter(p=>p.tag==='us-gaap:NetIncomeLoss'),notice:'原件重复展示的数字可能产生多处匹配，distinctFacts按标签/单位/实际期间去重；仅比较同一申报号、无分部维度，不能证明原始披露正确'};
 assert.ok(pairs.length>20);assert.equal(result.crossCheck.conflicts.length,0);
 result.observations=xbrlObservations([body,api]);
 result.retrieval=searchEvidence([body],'净利润','S1').slice(0,2);
 console.log(JSON.stringify({crossCheck:result.crossCheck}));
}catch(error){result.error=error.message;process.exitCode=1;console.log(JSON.stringify({error:error.message}));}
finally{await closeStorage();await writeFile(new URL('acceptance.json',sampleDirectory),JSON.stringify(result,null,2));}
