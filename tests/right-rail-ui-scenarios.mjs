import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

export function registerRightRailScenarios({test,makeJob,detail,noOverflow,screenshot}) {
 const job=makeJob(903,'completed',{mode:'C'});
 job.result.report='# 滚动验证\n\n'+Array.from({length:35},(_,i)=>`## 研究段落 ${i+1}\n\n${'用于验证报告滚动到底时，两张记录卡片仍然可见。'.repeat(12)}`).join('\n\n');
 job.events=Array.from({length:45},(_,i)=>({type:'tool',toolName:'search_evidence',toolCallId:'lookup-'+i,arguments:{query:'合成执行记录 '+i}}));
 for(const [width,height] of [[1440,1000],[1440,800],[1024,640],[320,900]]) {
  test(`right-rail-fixed-${width}-${height}`,{jobs:[job],viewport:{width,height}},async({page})=>{
   await detail(page,job);
   const checks=page.locator('.execution-checks-heading'),trace=page.locator('.rd-trace-trigger');
   for(const trigger of [checks,trace])assert.equal(await trigger.getAttribute('aria-expanded'),'true');
   if(width>=1024) {
    await page.locator('.page-scroll').evaluate(n=>{n.scrollTop=n.scrollHeight;});
    const snapshot=()=>page.evaluate(()=>{
     const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height};};
     return {checks:rect('.execution-checks-heading'),trace:rect('.rd-trace-trigger'),rail:rect('.rd-right-rail'),header:rect('.rd-header'),scroll:document.querySelector('.page-scroll').scrollTop};
    });
    const before=await snapshot();assert.ok(before.scroll>5000,'Fixture must reach the bottom of a long report');
    assert.ok(before.checks.top>=before.header.bottom-1,'Top card remains below sticky report heading at page bottom');
    assert.ok(before.rail.bottom<=height,'Both cards fit inside viewport at page bottom');
    assert.ok(before.trace.top>before.checks.bottom,'Both headers remain visible');
    assert.equal(before.checks.height,before.trace.height,'Headers have the same height');
    for(const selector of height<=740?['.execution-checks-content','.rd-trace-body']:['.execution-checks-body','.rd-events']) {
     const body=page.locator(selector);
     await body.evaluate(n=>{n.scrollTop=n.scrollHeight;});
     await body.hover();await page.mouse.wheel(0,600);
     assert.deepEqual(await snapshot(),before,'Internal scrolling must not move either card or main report');
    }
    await page.screenshot({path:fileURLToPath(new URL(`../artifacts/${process.env.UI_ARTIFACT_SUBDIR}/ui-right-rail-bottom-${width}-${height}.png`,import.meta.url))});
    const traceBefore=await page.locator('.rd-trace').boundingBox();
    await checks.click();assert.equal(await checks.getAttribute('aria-expanded'),'false');
    assert.ok((await page.locator('.rd-trace').boundingBox()).height>traceBefore.height,'Trace gains space when checks are collapsed');
    await trace.focus();await page.keyboard.press('Enter');
    assert.equal(await trace.getAttribute('aria-expanded'),'false');
    assert.ok((await page.locator('.rd-right-rail').boundingBox()).height<140,'Both collapsed cards consume only header height');
    await checks.focus();await page.keyboard.press('Space');
    assert.equal(await checks.getAttribute('aria-expanded'),'true');
    await trace.click();
    const after=await snapshot();assert.ok(after.checks.top>=after.header.bottom-1&&after.rail.bottom<=height);
    const scroll=after.scroll;
    await page.getByRole('button',{name:'查看实际输入与返回',exact:true}).click();
    assert.equal(await page.locator('.page-scroll').evaluate(n=>n.scrollTop),scroll,'Opening trace filter must not jump the report');
    await page.screenshot({path:fileURLToPath(new URL(`../artifacts/${process.env.UI_ARTIFACT_SUBDIR}/ui-right-rail-filters-${width}-${height}.png`,import.meta.url))});
   } else {
    await checks.click();assert.equal(await checks.getAttribute('aria-expanded'),'false');
    await checks.click();await trace.click();assert.equal(await trace.getAttribute('aria-expanded'),'false');await trace.click();
   }
   await noOverflow(page,`right rail ${width} ${height}`);
  });
 }
}
