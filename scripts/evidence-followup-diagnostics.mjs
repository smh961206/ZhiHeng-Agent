// One real public search, at most one original document. Synthetic checkpoint;
// no model calls, research-job writes, or modification of existing reports.
import {mkdir,writeFile} from 'node:fs/promises';
import {createEvidenceFollowup} from '../server/evidence-followup.mjs';
import {createWebResearchSession} from '../server/web-research.mjs';
import {createWebEvidenceReader} from '../server/web-evidence.mjs';
import {searchEvidence} from '../server/evidence-search.mjs';
const job={input:{securities:[{market:'CN',symbol:'002594'}],sources:[]}},tools=[];
const emit=(type,_message,details)=>{if(type==='tool')tools.push(details.toolName);};
const web=createWebResearchSession({job,searchLocal:searchEvidence,archive:null,readDocument:createWebEvidenceReader({archive:null}),limits:{searches:1,documents:1,seconds:45},emit});
const flow=createEvidenceFollowup({job,web,limit:1,emit,assess:async checks=>checks.map(c=>({id:c.id,status:'search_needed'}))});
let error;
try{await flow.run(['2025年购建长期资产现金支出尚未核对。'],AbortSignal.timeout(55000));}catch(e){error=e.message;}
const result={checkedAt:new Date().toISOString(),kind:'真实联网补证烟测；合成缺口，不生成报告、不调用模型、不保存研究任务',
 configuration:{enabled:web.state.enabled,configured:web.state.configured,providers:web.state.providers},error,
 searchCount:web.state.searchCount,documentAttempts:web.state.documentAttempts,sourceCount:web.state.sourceIds.length,
 gaps:web.state.gaps.map(g=>({id:g.id,query:g.query,status:g.status,failures:g.failures,limitations:g.limitations})),
 checks:flow.state.checks,tools};
await mkdir(new URL('../artifacts/',import.meta.url),{recursive:true});
await writeFile(new URL('../artifacts/evidence-followup-live-check.json',import.meta.url),JSON.stringify(result,null,2));
console.log(JSON.stringify(result));
process.exitCode=error||!result.sourceCount?1:0;
