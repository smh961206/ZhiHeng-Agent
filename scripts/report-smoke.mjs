import assert from 'node:assert/strict';
import {setTimeout as pause} from 'node:timers/promises';
const id=process.env.RESEARCH_JOB_ID;
if(!id)throw new Error('Set RESEARCH_JOB_ID to a real research task ID');
let job;
for(let i=0;i<36;i++){
 const r=await fetch('http://127.0.0.1:3001/api/jobs/'+id);if(!r.ok)throw new Error('Task not found');job=await r.json();
 if(!['queued','running'].includes(job.status))break;
 await pause(5000);
}
assert.equal(job.status,'completed',job.error||'Research still running');
assert.ok(job.input.sources.some(s=>s.official&&s.type==='official-report'));
assert.ok(job.result.report.includes('[S'));
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1050}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:3001');
 await page.getByRole('navigation',{name:'主导航'}).getByRole('button',{name:/研究记录/}).click();
 await page.getByRole('textbox',{name:'搜索研究'}).fill(job.input.question);
 await page.locator('.history-list>button').first().click();
 await page.locator('.markdown').waitFor();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'导出报告'}).click();assert.match((await download).suggestedFilename(),/\.md$/);
 await page.getByRole('tab',{name:'审计记录',exact:true}).click();assert.ok((await page.locator('.markdown').innerText()).length>20);
 await page.getByRole('tab',{name:'证据来源',exact:true}).click();assert.ok(await page.locator('.evidence-list details').count()>=4);
 await page.getByRole('tab',{name:'研究报告',exact:true}).click();
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'artifacts/report.png',fullPage:true});
 assert.deepEqual(errors,[]);
 console.log('PASS: real task completed; report, official evidence, audit, history, Markdown export; no browser exceptions.');
}finally{await browser.close();}

