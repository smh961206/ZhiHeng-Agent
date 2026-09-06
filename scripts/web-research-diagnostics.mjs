// Public search/body/archival checks. No model, research job or trading calls.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {searchWebCandidates,webSearchStatus,createWebSearchProvider,webSearchConfig} from '../server/web-search-provider.mjs';
import {createWebEvidenceReader,sourceAuthority} from '../server/web-evidence.mjs';
import {dataArchive} from '../server/data-archive.mjs';
import {closeStorage} from '../server/storage.mjs';

const results=[],configuration=webSearchStatus(),signal=AbortSignal.timeout(150000);
await mkdir(new URL('../artifacts/',import.meta.url),{recursive:true});
try{
 const search=await searchWebCandidates('国家统计局 2025年 国民经济和社会发展统计公报',{signal});
 results.push({...search,check:'搜索服务',searchStatus:search.status,status:!configuration.configured?'skipped':search.candidates.length?'passed':'failed',reason:!configuration.configured?'搜索服务尚未配置；不能宣称真实搜索已验收':undefined});
 console.log(JSON.stringify({check:'搜索服务',status:results.at(-1).status,candidates:search.candidates.length}));
 if(configuration.providers.includes('Brave')){
  const backup=await createWebSearchProvider({config:()=>({...webSearchConfig(),tavily:''})})('国家统计局 2025年 国民经济和社会发展统计公报',{signal});
  results.push({check:'Brave独立备用搜索',status:backup.candidates.length?'passed':'failed',candidateCount:backup.candidates.length,warnings:backup.warnings});console.log(JSON.stringify(results.at(-1)));
 }
 const primary=search.candidates.filter(candidate=>sourceAuthority(candidate.url).authorityVerified);
 const candidates=search.candidates.length?(primary.length?primary:search.candidates).slice(0,2):[
  {url:'https://www.stats.gov.cn/xxgk/sjfb/tjgb2020/202602/t20260228_1962662.html',title:'国家统计局统计公报',searchProvider:'已知原始链接：仅验证正文读取'},
  {url:'https://investor.apple.com/dividend-history/',title:'Apple股息历史',searchProvider:'已知原始链接：仅验证正文读取'},
 ];
 for(const candidate of candidates){
  try{
   const source=await createWebEvidenceReader({archive:{get:async()=>null,put:(...args)=>dataArchive.put(...args)}})(candidate,{signal});
   let attempted=0;
   const cached=await createWebEvidenceReader({fetchDocument:async()=>{attempted++;throw new Error('injected offline');}})(candidate,{signal});
   assert.equal(cached.fromCache,true);assert.equal(cached.fetchedAt,source.fetchedAt);assert.equal(attempted,0);
   results.push({check:'原始正文及归档恢复',status:'passed',url:source.url,title:source.title,characters:source.text.length,publishedAt:source.publishedAt,reportPeriod:source.reportPeriod,
    authorityVerified:source.authorityVerified,fetchedAt:source.fetchedAt,sha256:source.sha256,metadataWarnings:source.metadataWarnings,cacheRestored:true,offlineRequests:attempted});
  }catch(error){signal.throwIfAborted();results.push({check:'原始正文及归档恢复',status:'failed',url:candidate.url,error:error.message});}
  console.log(JSON.stringify(results.at(-1)));
 }
}finally{
 await closeStorage();await writeFile(new URL('../artifacts/web-research-diagnostics.json',import.meta.url),JSON.stringify({checkedAt:new Date().toISOString(),configuration,results,notice:'未配置凭证时仅验证已知链接正文，不能代表搜索服务或模型真实端到端已验收'},null,2));
}
process.exitCode=results.some(result=>result.status==='failed')?1:configuration.configured?0:2;
