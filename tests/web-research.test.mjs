import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {Readable} from 'node:stream';
import {gzipSync} from 'node:zlib';
import {createWebSearchProvider,webSearchStatus,validateSearchQuery} from '../server/web-search-provider.mjs';
import {publicAddress,publicWebURL,createWebDocumentFetcher,createPublicWebLookup} from '../server/web-evidence-request.mjs';
import {createWebEvidenceReader,extractWebMetadata,sourceAuthority} from '../server/web-evidence.mjs';
import {createWebResearchSession,validateWebResearchReview} from '../server/web-research.mjs';
import {searchEvidence,runAgent} from '../server/agent.mjs';
import {calculationBasis} from '../server/calculations.mjs';
import {reviewFixture} from './fixtures/research-review.mjs';
import {PARSER_VERSION} from '../server/document-layout.mjs';
import {parsedDigest} from '../server/document-integrity.mjs';

const now=Date.parse('2026-09-07T00:00:00Z'),clock=()=>now;
const body='行业统计原文：报告期：2025年。发布日期：2026-08-01。样本覆盖需要核对定义，市场份额并不证明未来增长。'.repeat(8);
const html=`<html><head><title>行业统计与范围</title><meta property="article:published_time" content="2026-08-01T10:00:00+08:00"></head><body><article><p>${body}</p></article></body></html>`;
const candidate={url:'https://www.stats.gov.cn/article.html',title:'搜索标题，仅供定位',searchProvider:'Tavily'};
const webSource=()=>({type:'web-evidence',documentRead:true,url:candidate.url,security:'CN:600519',provider:'www.stats.gov.cn',title:'原始统计正文',text:body,publishedAt:'2026-08-01',fetchedAt:new Date(now).toISOString(),authorityVerified:true,metadataWarnings:[],reportPeriod:'报告期：2025年',stale:false});
function archiveMemory(){const values=new Map();return {values,async get(key){return values.has(key)?structuredClone(values.get(key)):null;},async put(key,value){values.set(key,structuredClone(value));}};}

test('future or invalid cache timestamps force refresh and remain unchanged on outage',async()=>{
 for(const fetchedAt of [new Date(now+3600000).toISOString(),'invalid-date']){
  const archive=archiveMemory();let reads=0;
  const fetchDocument=async()=>{reads++;return {bytes:Buffer.from(html),url:candidate.url,contentType:'text/html'};};
  const reader=createWebEvidenceReader({archive,clock,fetchDocument});await reader(candidate);
  for(const source of archive.values.values())source.fetchedAt=fetchedAt;
  const stale=await createWebEvidenceReader({archive,clock,fetchDocument:async()=>{throw new Error('offline');}})(candidate);
  assert.equal(stale.stale,true);assert.equal(stale.fetchedAt,fetchedAt);
  const fresh=await reader(candidate);assert.equal(reads,2);assert.equal(fresh.fetchedAt,new Date(now).toISOString());assert.equal(fresh.fromCache,false);
 }
});

test('parser upgrades refresh old web PDF archives and retain verified previous evidence during outages',async()=>{
 const archive=archiveMemory(),security='CN:600519';let reads=0;
 const fetchDocument=async()=>{reads++;return {bytes:Buffer.from(html),url:candidate.url,contentType:'text/html'};};
 const source=await createWebEvidenceReader({archive,clock,fetchDocument})(candidate,{security});
 archive.values.clear();const legacy={...source,parserVersion:'evidence-5'};legacy.parsedSha256=parsedDigest(legacy);
 archive.values.set(`web-body:evidence-5:${security}:${candidate.url}`,legacy);
 const offline=await createWebEvidenceReader({archive,clock,fetchDocument:async()=>{throw new Error('offline');}})(candidate,{security});
 assert.equal(offline.legacyParser,true);assert.equal(offline.stale,true);assert.equal(offline.fetchedAt,source.fetchedAt);
 const refreshed=await createWebEvidenceReader({archive,clock,fetchDocument})(candidate,{security});
 assert.equal(reads,2);assert.equal(refreshed.parserVersion,PARSER_VERSION);assert.equal(refreshed.legacyParser,undefined);
});
function makeJob(){return {mode:'B',input:{question:'研究合成公司的行业规模',depth:'Standard',sources:[{id:'S1',type:'official-report',official:true,security:'CN:600519',text:'现有财报只有营业收入和现金流，未包含行业规模。',title:'合成原文'}]}};}
function session(options={}){const job=options.job||makeJob();return createWebResearchSession({job,searchLocal:searchEvidence,archive:null,clock,status:{enabled:true,configured:true,providers:['Tavily']},searchWeb:async()=>({candidates:[candidate]}),readDocument:async()=>webSource(),...options});}
const fakeHTTPS=(handler)=>((url,options,callback)=>{
 const req=new EventEmitter();req.end=()=>queueMicrotask(()=>handler(url,options,(status,headers,bytes)=>{
  const response=Readable.from([Buffer.from(bytes)]);response.statusCode=status;response.headers=headers;callback(response);
 },req));return req;
});

test('search configuration exposes capability but never credentials; private queries are rejected',()=>{
 const status=webSearchStatus({TAVILY_API_KEY:'secret-value'});assert.equal(status.configured,true);assert.doesNotMatch(JSON.stringify(status),/secret-value/);
 assert.equal(webSearchStatus({WEB_SEARCH_ENABLED:'false',TAVILY_API_KEY:'x'}).configured,false);
 for(const query of ['foo@example.com','https://example.com?q=a','API_KEY=abc12345','公司 secret-value 报告'])assert.throws(()=>validateSearchQuery(query,{TAVILY_API_KEY:'secret-value'}),/搜索词/);
 assert.equal(validateSearchQuery('苹果 2025 年现金分红'), '苹果 2025 年现金分红');
});
test('Tavily returns only candidate links; summaries, generated answers, raw_content and search dates are discarded',async()=>{
 const search=createWebSearchProvider({config:()=>({enabled:true,tavily:'secret'}),fetchImpl:async(url,options)=>{
  assert.equal(url.href,'https://api.tavily.com/search');assert.equal(options.redirect,'error');assert.equal(options.headers.Authorization,'Bearer secret');
  const args=JSON.parse(options.body);assert.equal(args.include_answer,false);assert.equal(args.include_raw_content,false);assert.equal(args.search_depth,'basic');
  return Response.json({answer:'FAKE ANSWER 999',results:[{...candidate,content:'FAKE NUMBERS 888',raw_content:'FAKE BODY',published_date:'2099-01-01'}]});
 }});
 const result=await search('行业统计');assert.equal(result.candidates.length,1);assert.doesNotMatch(JSON.stringify(result),/FAKE|2099|888|999/);
});
test('provider failure uses independent Brave fallback; access errors cool down and secrets are redacted',async()=>{
 let tavily=0,brave=0;
 const search=createWebSearchProvider({clock,config:()=>({enabled:true,tavily:'secret-one',brave:'secret-two'}),fetchImpl:async(url,options)=>{
  if(url.hostname==='api.tavily.com'){tavily++;return new Response('secret-one',{status:429,headers:{'Retry-After':'60'}});}
  brave++;assert.equal(options.headers['X-Subscription-Token'],'secret-two');return Response.json({web:{results:[candidate]}});
 }});
 assert.equal((await search('行业统计')).candidates[0].searchProvider,'Brave');
 const second=await search('行业统计');assert.equal(tavily,1);assert.equal(brave,2);assert.doesNotMatch(JSON.stringify(second),/secret-one|secret-two/);
});
test('unconfigured provider makes no request; malformed responses stay failures',async()=>{
 let requests=0;const fetchImpl=async()=>{requests++;return Response.json({results:'bad'});};
 assert.equal((await createWebSearchProvider({config:()=>({enabled:true}),fetchImpl})('行业统计')).status,'unconfigured');assert.equal(requests,0);
 const result=await createWebSearchProvider({config:()=>({enabled:true,tavily:'x'}),fetchImpl})('行业统计');assert.equal(result.status,'unavailable');assert.deepEqual(result.candidates,[]);
});
test('public reader rejects local, private, mapped and metadata endpoints and signed URLs',()=>{
 for(const ip of ['127.0.0.1','10.1.2.3','169.254.169.254','100.100.100.200','168.63.129.16','192.168.1.1','::1','::ffff:127.0.0.1','fd00::1','2001:db8::1','2002:7f00:1::'])assert.equal(publicAddress(ip),false,ip);
 for(const ip of ['8.8.8.8','93.184.216.34','2606:4700::1111'])assert.equal(publicAddress(ip),true,ip);
 for(const url of ['http://example.com','https://127.0.0.1','https://2130706433','https://[::1]','https://localhost','https://app.internal','https://user:pass@example.com','https://example.com:8443','https://example.com?token=secret'])assert.throws(()=>publicWebURL(url));
 assert.equal(publicWebURL('https://www.stats.gov.cn/article.html#x').href,candidate.url);
});
test('DNS is validated once and pinned to the request; credentials are absent from page headers',async()=>{
 let lookups=0;
 const read=createWebDocumentFetcher({lookup:async()=>{lookups++;return [{address:'93.184.216.34',family:4}];},requestImpl:fakeHTTPS((url,options,respond)=>{
  assert.equal(options.method,'GET');assert.equal(options.agent,false);assert.equal(options.headers.Authorization,undefined);
  options.lookup(url.hostname,{all:true},(error,addresses)=>{assert.equal(error,null);assert.deepEqual(addresses,[{address:'93.184.216.34',family:4}]);});
  respond(200,{'content-type':'text/html'},html);
 })});
 assert.match((await read(candidate.url)).bytes.toString(),/行业统计/);assert.equal(lookups,1);
 await assert.rejects(createWebDocumentFetcher({lookup:async()=>[{address:'10.0.0.1',family:4}],requestImpl:()=>assert.fail('private request')})(candidate.url),/非公开/);
});
test('redirects recheck DNS and block an internal target',async()=>{
 let calls=0;
 const read=createWebDocumentFetcher({lookup:async host=>[{address:host==='private.example.com'?'10.0.0.1':'93.184.216.34',family:4}],requestImpl:fakeHTTPS((_url,_options,respond)=>{calls++;respond(302,{location:'https://private.example.com/admin'},'');})});
 await assert.rejects(read(candidate.url),/非公开/);assert.equal(calls,1);
});
test('desktop fake-IP mapping is replaced by a validated public DNS answer, never by allowing reserved IPs',async()=>{
 let requests=0;
 const lookup=createPublicWebLookup({enabled:()=>true,systemLookup:async()=>[{address:'198.18.0.2',family:4}],fetchImpl:async(url,options)=>{
  requests++;assert.equal(url.origin,'https://cloudflare-dns.com');assert.equal(options.redirect,'error');
  return Response.json({Status:0,Question:[{name:'www.stats.gov.cn.',type:1}],Answer:[{name:'www.stats.gov.cn.',type:5,data:'cdn.example.com.'},{name:'cdn.example.com.',type:1,data:'93.184.216.34'}]});
 }});
 assert.deepEqual(await lookup('www.stats.gov.cn'),[{address:'93.184.216.34',family:4}]);assert.equal(requests,1);
 const unsafe=createPublicWebLookup({systemLookup:async()=>[{address:'198.18.0.2',family:4}],fetchImpl:async()=>Response.json({Status:0,Question:[{name:'www.stats.gov.cn',type:1}],Answer:[{name:'www.stats.gov.cn',type:1,data:'127.0.0.1'}]})});
 await assert.rejects(unsafe('www.stats.gov.cn'),/非公开/);
 const privateLookup=createPublicWebLookup({systemLookup:async()=>[{address:'10.0.0.1',family:4}],fetchImpl:()=>assert.fail('private addresses must not trigger this fallback')});
 assert.deepEqual(await privateLookup('example.com'),[{address:'10.0.0.1',family:4}]);
});
test('decoded response size is bounded and 403 is not immediately retried',async()=>{
 let calls=0;const lookup=async()=>[{address:'93.184.216.34',family:4}];
 const zipped=gzipSync('x'.repeat(2000));
 await assert.rejects(createWebDocumentFetcher({lookup,requestImpl:fakeHTTPS((_url,_options,respond)=>respond(200,{'content-type':'text/html','content-encoding':'gzip'},zipped))})(candidate.url,{maxBytes:1000}),/大小上限/);
 const read=createWebDocumentFetcher({clock,lookup,requestImpl:fakeHTTPS((_url,_options,respond)=>{calls++;respond(403,{},'forbidden');})});
 await assert.rejects(read(candidate.url),/403/);await assert.rejects(read(candidate.url),/冷却/);assert.equal(calls,1);
});
test('SEC web documents reuse the fixed client, preserving shared restrictions',async()=>{
 let requests=0;
 const read=createWebDocumentFetcher({lookup:()=>assert.fail('must use existing SEC route'),secRequest:async()=>{requests++;throw new Error('SEC shared 403 cooldown');}});
 await assert.rejects(read('https://www.sec.gov/Archives/edgar/data/320193/file.htm'),/shared 403/);assert.equal(requests,1);
});
test('cancellation during DNS stops the read without attempting a connection',async()=>{
 const controller=new AbortController();const pending=createWebDocumentFetcher({lookup:()=>new Promise(()=>{}),requestImpl:()=>assert.fail('aborted request')})(candidate.url,{signal:controller.signal});controller.abort();await assert.rejects(pending,{name:'AbortError'});
});
test('publication metadata comes from the original document; conflicting dates and missing periods stay unknown',()=>{
 const metadata=extractWebMetadata(html,body,clock);assert.equal(metadata.publishedAt,'2026-08-01');assert.ok(metadata.periodMentions.length);
 const conflict=extractWebMetadata(html.replace('</head>','<meta name="pubdate" content="2026-08-02"></head>'),body,clock);assert.equal(conflict.publishedAt,null);assert.match(conflict.metadataWarnings.join(' '),/冲突/);
 const unknown=extractWebMetadata('<title>Company overview</title>','Copyright 2026; updated today',clock);assert.equal(unknown.publishedAt,null);assert.equal(unknown.reportPeriod,null);
 const annual=extractWebMetadata('<title>2025 Annual Report</title>','Copyright 2026',clock);assert.equal(annual.publishedAt,null);assert.match(annual.reportPeriod,/2025/);assert.equal(annual.periodStatus,'requires-review');
 assert.equal(extractWebMetadata('<script type="application/ld+json">{"@graph":[{"datePublished":"2026-08-03"}]}</script>','',clock).publishedAt,'2026-08-03');
});
test('issuer identity requires operator domain bindings; lookalike domains are not trusted',()=>{
 const env={WEB_RESEARCH_ISSUER_DOMAINS:'{"US:AAPL":["apple.com"]}'};
 assert.equal(sourceAuthority('https://investor.apple.com/a','US:AAPL',env).authorityVerified,true);
 assert.equal(sourceAuthority('https://apple.com.evil.com/a','US:AAPL',env).authorityVerified,false);
 assert.equal(sourceAuthority('https://investor.apple.com/a','HK:00700',env).authorityVerified,false);
});
test('only original bodies are archived; timestamps and hashes survive a new reader and failed refresh',async()=>{
 const archive=archiveMemory();let calls=0;const fetchDocument=async()=>{calls++;return {bytes:Buffer.from(html),url:candidate.url,contentType:'text/html'};};
 const source=await createWebEvidenceReader({archive,clock,fetchDocument})(candidate,{security:'CN:600519'});
 assert.equal(source.date,'2026-08-01');assert.equal(source.documentRead,true);assert.equal(source.official,false);assert.equal(source.authorityVerified,true);assert.ok(source.textSha256);
 const cached=await createWebEvidenceReader({archive,clock,fetchDocument})(candidate,{security:'CN:600519'});assert.equal(calls,1);assert.equal(cached.fetchedAt,source.fetchedAt);assert.equal(cached.fromCache,true);
 const stale=await createWebEvidenceReader({archive,clock:()=>now+7*3600000,fetchDocument:async()=>{throw new Error('offline');}})(candidate,{security:'CN:600519'});assert.equal(stale.stale,true);assert.equal(stale.fetchedAt,source.fetchedAt);
 for(const item of archive.values.values())item.text='tampered';
 await assert.rejects(createWebEvidenceReader({archive,clock,fetchDocument:async()=>{throw new Error('offline');}})(candidate,{security:'CN:600519'}),/offline/);
});
test('fake PDFs, access challenges and short pages are never promoted to body evidence',async()=>{
 for(const [url,page] of [['https://www.stats.gov.cn/a.pdf',html],[candidate.url,'<title>Just a moment</title>'+html],[candidate.url,'<html>too short</html>']]){
  const archive=archiveMemory();await assert.rejects(createWebEvidenceReader({archive,clock,fetchDocument:async()=>({url,bytes:Buffer.from(page),contentType:'text/html'})})({...candidate,url}));assert.equal(archive.values.size,0);
 }
});
test('PDF body is parsed from actual bytes; missing publication date is not filled from search metadata',async()=>{
 const source=await createWebEvidenceReader({archive:null,clock,fetchDocument:async()=>({url:'https://www.stats.gov.cn/a.pdf',bytes:Buffer.from('%PDF-1.7 actual original'),contentType:'application/pdf'}),parsePDF:async()=>({text:'原始文件未载明发布日期。'.repeat(30),pages:2,readPages:2,truncated:false})})({...candidate,published_date:'2026-09-01'});
 assert.equal(source.publishedAt,null);assert.equal(source.pages,2);assert.equal(source.documentRead,true);
});
test('archive failures do not discard a successful original body',async()=>{
 const source=await createWebEvidenceReader({clock,archive:{get:async()=>{throw new Error('db');},put:async()=>{throw new Error('db');}},fetchDocument:async()=>({url:candidate.url,bytes:Buffer.from(html),contentType:'text/html'})})(candidate);
 assert.match(source.cacheWarning,/归档失败/);assert.ok(source.text.length>200);
});
test('web search requires a real local receipt and a concrete gap; zero-match local retrieval stays empty',async()=>{
 let calls=0;const web=session({searchWeb:async()=>{calls++;return {candidates:[]};}});
 await assert.rejects(web.search({retrievalId:'R404',gap:'缺少2025年的行业数据'}),/先调用/);
 const local=web.local({query:'不存在词'});assert.deepEqual(local.matches,[]);
 await assert.rejects(web.search({retrievalId:local.retrievalId,gap:'缺少'}),/具体/);assert.equal(calls,0);
});
test('only successfully read bodies receive S IDs; new evidence forces local re-review',async()=>{
 const job=makeJob(),web=session({job});const local=web.local({query:'行业统计',security:'CN:600519'});
 const result=await web.search({retrievalId:local.retrievalId,gap:'现有年报没有2025年的行业统计'});
 assert.deepEqual(result.sourceIds,['S2']);assert.equal(job.input.sources[1].type,'web-evidence');assert.equal(result.status,'body-read-needs-review');
 assert.equal((await web.search({retrievalId:local.retrievalId,gap:'仍需查看具体行业统计'})).status,'local-review-required');
 const reviewed=web.local({query:'行业统计',sourceId:'S2'});assert.ok(reviewed.matches.length);
 const resolved=web.resolve({gapId:'G1',sourceId:'S2',quote:body.slice(0,70),explanation:'原文列明了需要的统计期间及样本范围'});assert.equal(resolved.status,'evidence-located');
 assert.throws(()=>web.resolve({gapId:'G1',sourceId:'S2',quote:'搜索摘要给出另一组并不存在的统计数字'.repeat(3),explanation:'这些数字在摘要里看起来可以使用'}),/连续原文/);
});
test('failed bodies and missing credentials retain explicit gaps without any evidence source',async()=>{
 for(const options of [{status:{enabled:true,configured:false}},{readDocument:async()=>{throw new Error('403');}}]){
  const job=makeJob(),web=session({job,...options}),local=web.local({query:'行业统计'});
  const result=await web.search({retrievalId:local.retrievalId,gap:'现有资料缺少行业官方统计原文'});assert.equal(job.input.sources.length,1);assert.equal(result.sourceIds.length,0);assert.ok(result.failures.length);
 }
});
test('search and document budgets are bounded across gaps',async()=>{
 let searches=0;const web=session({limits:{searches:1,documents:1,seconds:180},searchWeb:async()=>{searches++;return {candidates:[candidate]};}});
 await web.search({retrievalId:web.local({query:'行业统计'}).retrievalId,gap:'缺少行业统计资料及其报告期间'});
 const second=await web.search({retrievalId:web.local({query:'竞争份额'}).retrievalId,gap:'缺少当前市场竞争份额统计数据'});
 assert.equal(second.status,'budget-exhausted');assert.equal(searches,1);assert.equal(web.state.documentAttempts,1);
});
test('search outage reuses only a catalog of previously read originals and keeps the discovery gap',async()=>{
 const archive=archiveMemory(),web=session({archive});await web.search({retrievalId:web.local({query:'行业统计',security:'CN:600519'}).retrievalId,gap:'缺少行业统计资料及其报告期间'});
 const next=session({archive,searchWeb:async()=>({status:'failed',candidates:[],warnings:['offline']})});
 const result=await next.search({retrievalId:next.local({query:'行业统计',security:'CN:600519'}).retrievalId,gap:'缺少行业统计资料及其报告期间'});
 assert.equal(result.discoveryStale,true);assert.deepEqual(result.sourceIds,['S2']);assert.match(result.limitations.join(' '),/未确认/);
});
test('unresolved gaps cannot disappear from final audit; date/identity restrictions remain after a body quote',async()=>{
 const web=session({readDocument:async()=>({...webSource(),publishedAt:null,metadataWarnings:['原文未识别发布日期']})});
 await web.search({retrievalId:web.local({query:'行业统计'}).retrievalId,gap:'缺少行业统计资料及其报告期间'});web.local({query:'行业统计',sourceId:'S2'});
 assert.equal(web.resolve({gapId:'G1',sourceId:'S2',quote:body.slice(0,70),explanation:'原文包含统计范围，但没有明确发布日期'}).status,'evidence-with-limitations');
 assert.throws(()=>validateWebResearchReview({decision:{missingData:[],gates:[]}},web.state),/G1/);
 assert.throws(()=>validateWebResearchReview({decision:{missingData:['[G1] 日期未知'],gates:[{id:'data',status:'passed'}]}},web.state),/limited/);
 validateWebResearchReview({decision:{missingData:['[G1] 日期未知'],gates:[{id:'data',status:'limited'}]}},web.state);
});
test('calculations reject search summaries, unread pages, unverified publishers and undated web facts',()=>{
 const basis={currency:'CNY',period:'2025 FY',shareBasis:'普通股',assumptions:'已核对原文的期间和单位',sourceIds:['S1','S2']};
 const official={id:'S1',official:true,type:'official-report',security:'CN:600519'};
 for(const source of [{type:'search-summary'},{...webSource(),documentRead:false},{...webSource(),authorityVerified:false},{...webSource(),publishedAt:null}])assert.throws(()=>calculationBasis(basis,[official,{...source,id:'S2'}]));
 calculationBasis(basis,[official,{...webSource(),id:'S2'}]);
});
test('agent executes local → search → read → local → quoted resolution and exposes new sources to audit',async()=>{
 const job=makeJob(),old=global.fetch;let step=0;const events=[];
 const calls=[['search_evidence',{query:'行业统计',security:'CN:600519'}],['search_web',{retrievalId:'R1',gap:'现有资料缺少2025年行业统计原文'}],['search_evidence',{query:'行业统计',sourceId:'S2'}],['resolve_web_gap',{gapId:'G1',sourceId:'S2',quote:body.slice(0,70),explanation:'已读取原文，统计期间与研究问题对应'}]];
 global.fetch=async(_url,options)=>{
  const payload=JSON.parse(options.body);const index=step++;
  if(index<calls.length){assert.ok(payload.tools.some(item=>item.function.name==='search_web'));const [name,args]=calls[index];return Response.json({choices:[{message:{role:'assistant',tool_calls:[{id:`tool${index}`,type:'function',function:{name,arguments:JSON.stringify(args)}}]}}]});}
  if(index===calls.length)return Response.json({choices:[{message:{role:'assistant',content:'根据已经读取的原始统计正文分析。[S2]'}}]});
  const audit=JSON.parse(payload.messages.at(-1).content);assert.equal(audit.webResearch.gaps[0].status,'evidence-located');assert.ok(audit.sourceCatalog.some(source=>source.id==='S2'));
  return Response.json({choices:[{message:{role:'assistant',content:JSON.stringify(reviewFixture(job.input,'S2'))}}]});
 };
 try{
  const result=await runAgent(job,(...args)=>events.push(args),new AbortController().signal,{webSession:options=>session(options)});
  assert.match(result.report,/S2/);assert.equal(step,6);assert.ok(events.some(event=>event[0]==='web_search'));assert.equal(job.input.sources.length,2);
 }finally{global.fetch=old;}
});
