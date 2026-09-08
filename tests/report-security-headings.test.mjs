import test from 'node:test';
import assert from 'node:assert/strict';
import {reportSecurityHeadings} from '../shared/report-security-headings.mjs';
import {exportResearchMarkdown} from '../shared/research-export.mjs';
const job={input:{question:'比较研究',securities:[{market:'CN',symbol:'002594'},{market:'CN',symbol:'601633'},{market:'HK',symbol:'700'},{market:'US',symbol:'AAPL'}]},marketData:{snapshots:[{market:'CN',symbol:'601633',name:'长城汽车'},{market:'HK',symbol:'00700',name:'腾讯控股'},{market:'CN',symbol:'002594',name:'比亚迪'},{market:'US',symbol:'AAPL',name:'Apple'}]}};
test('historical report headings match listing metadata without changing body or saved report',()=>{
 const raw='## 逐家公司研究判断\n\n### CN:002594\n\n正文 CN:002594，依据 [S1]。\n\n### **CN:601633**\n\n### HK:700\n\n### US:AAPL\n';
 const before=structuredClone(job),formatted=reportSecurityHeadings(raw,job,{AAPL:{exchange:'NASDAQ'}});
 assert.match(formatted,/### 比亚迪（SZ:002594）/);assert.match(formatted,/### 长城汽车（SH:601633）/);assert.match(formatted,/### 腾讯控股（HK:00700）/);assert.match(formatted,/### Apple（NASDAQ:AAPL）/);
 assert.match(formatted,/正文 CN:002594，依据 \[S1\]。/);assert.deepEqual(job,before);assert.equal(reportSecurityHeadings(formatted,job),formatted);
});
test('preserves examples, quotations, unrelated headings and missing identities',()=>{
 const raw='```md\n### CN:002594\n```\n\n> ### CN:002594\n\n    ### CN:002594\n\n### CN:600000\n\n### CN:002594 估值方法\n';
 assert.equal(reportSecurityHeadings(raw,job),raw);
 assert.equal(reportSecurityHeadings('### US:AAPL',job),'### Apple（US:AAPL）');
 assert.equal(reportSecurityHeadings('### CN:002594',{input:job.input}),'### 名称未记录（SZ:002594）');
});
test('supports Setext, CRLF and escaped names',()=>{
 assert.equal(reportSecurityHeadings('CN:002594\r\n---\r\n',job),'比亚迪（SZ:002594）\r\n---\r\n');
 const unusual={input:{securities:[{market:'CN',symbol:'002594',name:'公司*甲\n### 意外标题'}]}};
 assert.equal(reportSecurityHeadings('### CN:002594',unusual),'### 公司\\*甲 ### 意外标题（SZ:002594）');
});
test('download uses the same names and exchange labels',()=>{
 const record={...job,result:{report:'### CN:002594\n\n结论不变。\n\n### US:AAPL',audit:''}};
 const md=exportResearchMarkdown(record,{includeResearchProcess:false,usExchanges:{AAPL:{exchange:'NASDAQ'}}});
 assert.match(md,/### 比亚迪（SZ:002594）/);assert.match(md,/### Apple（NASDAQ:AAPL）/);assert.match(md,/结论不变。/);assert.equal(record.result.report,'### CN:002594\n\n结论不变。\n\n### US:AAPL');
});
