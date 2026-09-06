import {createHash} from 'node:crypto';
import {Parser} from 'htmlparser2';
import {extractHTML} from './filing-text.mjs';
import {PARSER_VERSION,parsingWarnings,readableCharacterCount} from './document-layout.mjs';
import {parsedDigest,validParsedArchive} from './document-integrity.mjs';
import {extractPDF} from './pdf-extractor.mjs';
import {fetchWebDocument,publicWebURL} from './web-evidence-request.mjs';
import {dataArchive} from './data-archive.mjs';

const digest=value=>createHash('sha256').update(value).digest('hex');
const primaryDomains=['sec.gov','cninfo.com.cn','hkexnews.hk','sse.com.cn','szse.cn','bse.cn','stats.gov.cn','pbc.gov.cn','csrc.gov.cn','nfra.gov.cn','census.gov','bls.gov','bea.gov'];
const within=(host,domain)=>host===domain||host.endsWith('.'+domain);
export function sourceAuthority(url,security,env=process.env){
 const host=new URL(url).hostname;
 if(primaryDomains.some(domain=>within(host,domain)))return {sourceRole:'regulator-or-disclosure',authorityVerified:true};
 // Operator-maintained identity bindings; search ranking/model claims cannot
 // promote an arbitrary site to an issuer's official website.
 let issuers={};try{issuers=JSON.parse(env.WEB_RESEARCH_ISSUER_DOMAINS||'{}');}catch{/* Invalid configuration confers no authority. */}
 const domains=issuers[security];
 if(Array.isArray(domains)&&domains.some(domain=>typeof domain==='string'&&/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)&&within(host,domain)))return {sourceRole:'issuer',authorityVerified:true};
 return {sourceRole:'unverified-publisher',authorityVerified:false};
}
function validDate(value){
 const match=String(value).match(/^(\d{4})[-年/](\d{1,2})[-月/](\d{1,2})(?:日|T|\s|$)/);
 if(!match)return null;const date=`${match[1]}-${match[2].padStart(2,'0')}-${match[3].padStart(2,'0')}`;
 return Number.isFinite(Date.parse(date))&&new Date(date).toISOString().slice(0,10)===date?date:null;
}
export function extractWebMetadata(html,body,clock=Date.now){
 let title='',inTitle=false,ld='',inLD=false;const dates=[];
 const add=(value,basis)=>{const date=validDate(value);if(date&&Date.parse(date)<=clock()+86400000)dates.push({date,basis});};
 const visit=(value,depth=0)=>{
  if(!value||typeof value!=='object'||depth>6)return;
  if(Array.isArray(value)){value.slice(0,30).forEach(item=>visit(item,depth+1));return;}
  if(value.datePublished)add(value.datePublished,'原页JSON-LD datePublished');
  if(value['@graph'])visit(value['@graph'],depth+1);
 };
 const parser=new Parser({
  onopentag(name,attrs){
   if(name==='title')inTitle=true;
   if(name==='script'&&attrs.type==='application/ld+json'){inLD=true;ld='';}
   if(name==='meta'&&/^(?:article:published_time|datepublished|pubdate|publishdate|publication_date)$/i.test(attrs.property||attrs.name||''))add(attrs.content,`原页meta ${attrs.property||attrs.name}`);
  },
  ontext(value){if(inTitle)title+=value;if(inLD&&ld.length<100000)ld+=value;},
  onclosetag(name){if(name==='title')inTitle=false;if(name==='script'&&inLD){inLD=false;try{visit(JSON.parse(ld));}catch{/* No evaluation. */}}}
 },{decodeEntities:true});parser.write(html);parser.end();
 for(const match of body.slice(0,12000).matchAll(/(?:发布日期|发布时间|Published(?:\s+on)?|Release\s+date)\s*[:：]?\s*(\d{4}[-年/]\d{1,2}[-月/]\d{1,2}(?:日)?)/gi))add(match[1],'正文明确发布日期标签');
 const unique=[...new Set(dates.map(item=>item.date))],publishedAt=unique.length===1?unique[0]:null;
 const periods=[...body.slice(0,150000).matchAll(/(?:报告期(?:间)?|报告年度|Reporting period|(?:fiscal )?year ended|(?:three|six|nine|twelve) months ended)\s*[:：]?\s*[^\n]{0,100}/gi)].filter(match=>/\d{4}/.test(match[0])).map(match=>({label:match[0].trim().slice(0,140),offset:match.index})).slice(0,8);
 const titleYears=[...new Set([...title.matchAll(/(?:19|20)\d{2}/g)].map(match=>match[0]))];
 const titlePeriod=titleYears.length===1&&/年报|年度报告|统计公报|年度业绩|annual report|statistical communiqu|fiscal year/i.test(title)?`原文标题年度：${titleYears[0]}（统计/财政期间边界待核对）`:null;
 const reportPeriod=titlePeriod||(periods.length===1?periods[0].label:null);
 return {title:title.trim().slice(0,300),publishedAt,publicationDateBasis:publishedAt?dates.find(item=>item.date===publishedAt).basis:null,publicationDateCandidates:dates,
  reportPeriod,periodMentions:periods,periodStatus:reportPeriod||periods.length?'requires-review':'unknown',
  metadataWarnings:[...(!publishedAt?[unique.length>1?'原文发布日期存在冲突，未择一作为确定日期':'原文未识别明确发布日期']:[]),...(!reportPeriod?[periods.length?'原文涉及多个资料期间，须按引用段落核对':'原文未识别明确资料期间']:[])]};
}
function decodeBody(bytes,type){
 const prefix=bytes.subarray(0,4096).toString('latin1'),charset=(type.match(/charset\s*=\s*["']?([\w-]+)/i)||prefix.match(/charset\s*=\s*["']?([\w-]+)/i))?.[1]||'utf-8';
 try{return new TextDecoder(charset).decode(bytes);}catch{throw new Error('网页字符编码不支持');}
}
export function createWebEvidenceReader({fetchDocument=fetchWebDocument,parsePDF=extractPDF,archive=dataArchive,clock=Date.now}={}){
 return async(candidate,{security,signal}={})=>{
  const requested=publicWebURL(candidate.url).href,key=`web-body:${PARSER_VERSION}:${security||'general'}:${requested}`;
  let cached,cacheWarning;
  try{cached=await archive?.get(key,{maxAgeMs:30*86400000});}catch{cacheWarning='网页归档读取失败，本次尝试原始网页';}
  signal?.throwIfAborted();
  if(!cached){try{cached=await archive?.get(`web-body:v1:${security||'general'}:${requested}`,{maxAgeMs:30*86400000});if(cached)cached={...cached,legacyParser:true};}catch{}}
  if(cached&&(!cached.documentRead||cached.requestedUrl!==requested||cached.security!==security||!validParsedArchive(cached)))cached=null;
  if(cached){Object.assign(cached,sourceAuthority(cached.url,security));cached.metadataWarnings=(cached.metadataWarnings||[]).filter(warning=>warning!=='发布者身份未由配置的机构/公司域名确认');if(!cached.authorityVerified)cached.metadataWarnings.push('发布者身份未由配置的机构/公司域名确认');}
  if(cached&&!cached.legacyParser&&clock()-Date.parse(cached.fetchedAt)<6*3600000)return {...cached,fromCache:true};
  try{
   const response=await fetchDocument(requested,{signal});signal?.throwIfAborted();
   const url=publicWebURL(response.url).href;let content,metadata;
   if(response.bytes.subarray(0,1024).toString('latin1').includes('%PDF-')){
    content=await parsePDF(response.bytes,signal);metadata=extractWebMetadata('',content.text,clock);
   }else{
    if(/\.pdf$/i.test(new URL(url).pathname)||response.contentType.includes('application/pdf'))throw new Error('原始链接未返回有效PDF');
    const html=decodeBody(response.bytes,response.contentType);
    if(response.contentType.startsWith('application/octet-stream'))throw new Error('下载内容不是可验证的PDF正文');
    content=response.contentType.startsWith('text/plain')?{text:html.slice(0,500000),truncated:html.length>500000,coverage:'原始纯文本文件'}:extractHTML(html,{maxCharacters:500000});
    metadata=extractWebMetadata(html,content.text,clock);
    if(/access denied|just a moment|verify.*human|captcha|robot check|request rejected|sign in|log in|subscribe to continue|访问验证|安全验证|登录/i.test(metadata.title)||/enable javascript and cookies to continue|verify you are human|checking your browser|完成验证后继续访问/i.test(content.text.slice(0,4000)))throw new Error('网页返回登录、验证码或访问限制，未作为正文');
   }
   signal?.throwIfAborted();
   if(readableCharacterCount(content.text)<200)throw new Error('网页没有足够可读正文，未使用搜索摘要补齐');
   const {links,...parsed}=content,authority=sourceAuthority(url,security);
   const source={...parsed,...metadata,...authority,parserVersion:PARSER_VERSION,title:metadata.title||candidate.title||new URL(url).pathname,security,url,requestedUrl:requested,type:'web-evidence',official:false,documentRead:true,
    provider:new URL(url).hostname,discoveredBy:candidate.searchProvider||'已发现原始链接',fetchedAt:new Date(clock()).toISOString(),date:metadata.publishedAt,dateBasis:'publication',
    sha256:digest(response.bytes),textSha256:digest(content.text),fromCache:false,stale:false,...(cacheWarning?{cacheWarning}:{}),
    coverage:`${content.coverage||'原始正文'}；网页为补充证据，发布者身份、报告期及数值口径须核对；搜索摘要未进入证据正文`,
    metadataWarnings:[...metadata.metadataWarnings,...(authority.authorityVerified?[]:['发布者身份未由配置的机构/公司域名确认']),...parsingWarnings(content)]};
   source.parsedSha256=parsedDigest(source);
   try{await archive?.put(key,source,{retainMs:30*86400000});}catch{source.cacheWarning='网页正文已读取，但持久归档失败';}
   return source;
  }catch(error){
   signal?.throwIfAborted();
   if(cached)return {...cached,fromCache:true,stale:true,cacheWarning:`原始网页刷新失败，使用 ${cached.fetchedAt} 归档：${error.message}`};
   throw error;
  }
 };
}
export const readWebEvidence=createWebEvidenceReader();
