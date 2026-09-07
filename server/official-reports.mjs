import {createHash} from 'node:crypto';
import {getStorage} from './storage.mjs';
import {remote} from './market-request.mjs';
import {extractPDF} from './pdf-extractor.mjs';
import {extractHTML} from './filing-text.mjs';
import {PARSER_VERSION,parsingWarnings,readableCharacterCount,needsParsingRetry} from './document-layout.mjs';
import {parsedDigest,validParsedArchive} from './document-integrity.mjs';
import {needsVisualUpgrade} from './visual-reading.mjs';
import {readDocument,documentKind} from './document-reader.mjs';

const digest=value=>createHash('sha256').update(value).digest('hex');
export function createOfficialReportReader({request=remote,storage=getStorage,parsePDF=extractPDF,clock=Date.now}={}){
 return async(report,signal)=>{
  const failures=[];let fallback;
  for(const candidate of [report,...(report.alternatives||[])]){
   signal?.throwIfAborted();const {alternatives,...metadata}=candidate;
   const key=digest(`official-report:${PARSER_VERSION}:${candidate.security}:${candidate.url}`);
   let store,cacheWarning,previous;
   try{store=await storage();}catch{cacheWarning='官方资料缓存暂不可用，本次直接获取原件。';}
   try{
    if(store){
     const cached=await store.getCachedReport(key).catch(()=>{cacheWarning='归档读取失败，本次直接读取官方原件。';return null;});
     signal?.throwIfAborted();
     if(cached?.url===candidate.url&&cached.security===candidate.security&&validParsedArchive(cached)&&cached.parserVersion===PARSER_VERSION){
      previous=cached;
      const age=clock()-Date.parse(cached.fetchedAt);
      if(!needsVisualUpgrade(cached,age)&&(!needsParsingRetry(cached)||age>=0&&age<6*3600000))
      return {...cached,fromCache:true,...(failures.length?{fallbackReason:failures.join('；')}:{}),notice:'使用已校验的原件文本归档；披露日期和原抓取时间保留，不代表已取得更新或修订文件。'};
     }
     if(!previous)for(const version of ['evidence-9','evidence-8','evidence-7','evidence-6','evidence-5','evidence-4','evidence-3','v2']){
      const legacy=await store.getCachedReport(digest(`official-report:${version}:${candidate.security}:${candidate.url}`)).catch(()=>null);
      if(legacy?.url===candidate.url&&legacy.security===candidate.security&&validParsedArchive(legacy)){previous={...legacy,legacyParser:true};break;}
     }
    }
    const bytes=await request(candidate.url,{signal,maxBytes:32_000_000,timeoutMs:45000,totalTimeoutMs:90000,retries:1});
    let parsed;
    if(documentKind(bytes,candidate.url))parsed=await readDocument(bytes,{name:candidate.url,signal,parsePDF});
    else{
     if(/\.pdf(?:\?|$)/i.test(candidate.url))throw new Error('官方链接未返回PDF原件');
     const html=bytes.toString('utf8');
     if(/<title[^>]*>[^<]*(?:access denied|request rate|undeclared automated|forbidden)/i.test(html))throw new Error('官方页面返回访问限制，未当作报告读取');
     parsed=extractHTML(html);
     if(candidate.form&&!new RegExp(`FORM\\s*${candidate.form.replace('/A','').replace('-','[-\\s]?')}`,'i').test(parsed.text))throw new Error('SEC正文缺少对应申报表单标识');
    }
    signal?.throwIfAborted();
    if(readableCharacterCount(parsed.text)<200)throw new Error('原件无充分可读文字，已按识别预算处理，保留缺口');
    if(parsed.financialFacts?.length){
     const expectedCIK=new URL(candidate.url).pathname.match(/^\/Archives\/edgar\/data\/(\d+)\//)?.[1];
     const mismatches=expectedCIK?parsed.financialFacts.filter(f=>!/^https?:\/\/www\.sec\.gov\/CIK$/.test(f.entityScheme||'')||!/^\d+$/.test(f.entity)||Number(f.entity)!==Number(expectedCIK)):[];
     parsed.financialFacts=parsed.financialFacts.filter(f=>!mismatches.includes(f)).map(f=>({...f,filed:candidate.date,form:candidate.form,filingUrl:candidate.url}));
     if(mismatches.length){parsed.inlineXbrl.rejectedFacts+=mismatches.length;parsed.inlineXbrl.acceptedFacts=parsed.financialFacts.length;parsed.inlineXbrl.errors.push({reason:'部分XBRL事实主体与SEC原件CIK不匹配',count:mismatches.length});}
    }
    const {links,...content}=parsed;
    const source={...metadata,...content,parserVersion:PARSER_VERSION,type:'official-report',official:true,fetchedAt:new Date(clock()).toISOString(),sha256:digest(bytes),textSha256:digest(content.text),fromCache:false,
     ...(failures.length?{fallbackReason:failures.join('；')}:{}),...(cacheWarning?{cacheWarning}:{})};
    source.parsedSha256=parsedDigest(source);source.parsingWarnings=parsingWarnings(source);
    // BSON serializes undefined fields as null unless stripped first; preserve
    // the same JSON representation that is covered by parsedSha256.
    if(store){try{await store.saveCachedReport(key,JSON.parse(JSON.stringify(source)),{retainMs:3650*86400000});}catch{source.cacheWarning='官方原文已读取，但持久归档失败。';}}
    return source;
   }catch(error){signal?.throwIfAborted();failures.push(`${candidate.provider||new URL(candidate.url).hostname} ${candidate.title}：${error.message}`);
    if(previous&&!fallback)fallback={...previous,fromCache:true,stale:true,cacheWarning:previous.legacyParser
     ?'原件重新解析失败，使用已校验历史归档；旧版归档没有本次新增的逐页/表格质量核验。'
     :'原件重新解析失败，保留已校验归档及原有识别缺口，抓取时间未更新。'};}
  }
  if(fallback)return {...fallback,fallbackReason:failures.join('；')};
  throw new Error(failures.join('；'));
 };
}
export const readOfficialReport=createOfficialReportReader();

export async function secAttachments(filing,{signal,request=remote,maxAttachments=3}={}){
 const base=filing.url.slice(0,filing.url.lastIndexOf('/')+1);
 // Use the filing's official index to identify Exhibit 99 documents. Never
 // construct a guessed attachment name or download executable/XBRL support files.
 const url=`${base}${filing.accession}-index.html`;
 const bytes=await request(url,{signal,timeoutMs:20000,totalTimeoutMs:35000,retries:1});
 const {links}=extractHTML(bytes.toString('utf8'));
 const candidates=[];
 for(const link of links){
  const resolved=new URL(link.href,base);
  if(!resolved.href.startsWith(base)||resolved.href===filing.url||!/\.(?:htm|html|pdf)$/i.test(resolved.pathname)||!/ex(?:hibit)?[-_. ]?99|earnings|release|results/i.test(link.text+' '+resolved.pathname))continue;
  candidates.push({...filing,title:`${filing.title} · 附件 ${link.text.trim()||resolved.pathname.split('/').at(-1)}`,url:resolved.href,form:undefined,annual:false,attachmentOf:filing.url});
 }
 const unique=[...new Map(candidates.map(item=>[item.url,item])).values()];
 return {reports:unique.slice(0,maxAttachments),limited:unique.length>maxAttachments};
}
