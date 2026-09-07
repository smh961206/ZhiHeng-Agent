import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

export function registerReportFirstScenarios({test,makeJob,detail,textIncludes,count,enabled,noOverflow,screenshot}){
 for(const width of [390,1440]){
  const job=makeJob(3103,'completed',{question:'报告目录随正文滚动（合成）'});
  job.result.report=Array.from({length:35},(_,index)=>`## 目录联动章节 ${index+1}\n\n${Array.from({length:6},()=>`用于验证目录跟随正文的合成段落。`.repeat(12)).join('\n\n')}`).join('\n\n');
  test(`report-directory-follow-scroll-${width}`,{jobs:[job],viewport:{width,height:900}},async({page,requests})=>{
   await detail(page,job);
   const trigger=page.getByRole('button',{name:'打开报告目录',exact:true});
   const nav=page.getByRole('navigation',{name:'报告目录',exact:true});
   const scroller=page.locator('.page-scroll');
   const url=page.url();
   await count(trigger,0);
   async function visibleCurrent(index){
    await page.waitForFunction(label=>{
     const nav=document.querySelector('nav[aria-label="报告目录"]'),link=nav?.querySelector('[aria-current="location"]');
     if(!link||link.textContent!==label)return false;
     const viewport=nav.getBoundingClientRect(),item=link.getBoundingClientRect();
     return item.top>=viewport.top-1&&item.bottom<=viewport.bottom+1;
    },`目录联动章节 ${index+1}`);
   }
   async function scrollToSection(index){
    return await page.getByRole('article',{name:'报告正文'}).getByRole('heading',{name:`目录联动章节 ${index+1}`,exact:true}).evaluate(element=>{
     const root=document.querySelector('.page-scroll'),toolbar=document.querySelector('.rd-content-toolbar');
     root.scrollTo({top:500,behavior:'instant'});
     root.scrollTo({top:root.scrollTop+element.getBoundingClientRect().top-toolbar.getBoundingClientRect().bottom-(element.textContent==='目录联动章节 1'?-140:20),behavior:'instant'});
     return root.scrollTop;
    });
   }
   if(width>=1024){
    await scrollToSection(0);
    await trigger.click();await visibleCurrent(0);
    for(const index of [27,34,12,0]){
     const position=await scrollToSection(index);await visibleCurrent(index);
     assert.ok(Math.abs(await scroller.evaluate(element=>element.scrollTop)-position)<1,'Directory tracking must not move the report');
     assert.equal(page.url(),url,'Manual scrolling must not rewrite the URL');
    }
    await page.keyboard.press('Escape');await nav.waitFor({state:'hidden'});
    await page.getByRole('button',{name:'阅读模式',exact:true}).click();
   }
   const position=await scrollToSection(30);
   await trigger.click();await visibleCurrent(30);
   assert.ok(await nav.evaluate(element=>element.scrollTop)>0,'Reopening the directory must reveal a later chapter');
   assert.ok(Math.abs(await scroller.evaluate(element=>element.scrollTop)-position)<1,'Opening the directory must preserve the report position');
   await page.screenshot({path:fileURLToPath(new URL(`../artifacts/ui-report-directory-follow-scroll-${width}.png`,import.meta.url)),animations:'disabled'});
   await noOverflow(page,`report directory follow ${width}`);
   await page.keyboard.press('Escape');await nav.waitFor({state:'hidden'});
   for(const name of ['审计记录','证据来源']){
    await page.getByRole('tab',{name:new RegExp(name)}).click();
    await count(trigger,0);await nav.waitFor({state:'hidden'});
   }
   await page.getByRole('tab',{name:'研究报告',exact:true}).click();
   await scrollToSection(12);await trigger.click();await visibleCurrent(12);
   if(width<1024){await page.keyboard.press('Escape');await nav.waitFor({state:'hidden'});}
   await scroller.evaluate(element=>element.scrollTo({top:0,behavior:'instant'}));
   await trigger.waitFor({state:'hidden'});await nav.waitFor({state:'hidden'});
   assert.equal(requests('POST','/api/jobs').length,0);
  });
 }
 for(const width of [320,390,1440]){
  const job=makeJob(3101,'completed',{mode:'B',question:'现金流质量与长期价值研究（合成）'});
  job.result.decision={action:'观察',confidence:'中',summary:'这是优先展示的研究判断。',missingData:['一项合成资料缺口']};
  job.result.warnings=['行情时点为合成数据。','部分资料尚待核对。','模型复核不能替代原件核对。','OCR 仍有未读页。'];
  job.visualAudit={included:[{id:'S1',pages:[2]}],omitted:[{id:'S2',reason:'合成的未覆盖页'}]};
  job.webResearch={enabled:true,configured:true,searchCount:0,sourceIds:[]};
  test(`report-first-layout-${width}`,{jobs:[job],viewport:{width,height:900}},async({page,requests})=>{
   await detail(page,job);
   const article=page.getByRole('article',{name:'报告正文'}),body=await article.boundingBox();
   assert.ok(body.y<(width<640?740:610),`Report should begin in first viewport: y=${body.y}`);
   assert.ok(await article.getByRole('heading',{name:'合成研究报告',exact:true}).isVisible());
   assert.equal(await page.locator('.rd-warning-summary').getAttribute('open'),null);
   await count(page.locator('.rd-main-column .research-progress,.rd-main-column .rd-meta,.rd-main-column .rd-deep-process,.rd-main-column .rd-document-reading'),0);
   const intro=await page.locator('.rd-report-intro').boundingBox();assert.ok(intro.y+intro.height<=body.y);
   await count(page.locator('.rd-decision'),1);await count(page.locator('.rd-aftercare'),0);
   await textIncludes(page.locator('.rd-decision-disclosure'),'判断依据与验证条件');
   await textIncludes(page.locator('.rd-disclosure-count'),'1 项待核实');
   await textIncludes(page.locator('.rd-disclosure-state'),'展开');
   await count(page.getByRole('button',{name:'打开报告目录',exact:true}),0);
   const notice=await page.locator('.rd-warning-summary').boundingBox(),content=await page.locator('.rd-reading-body').boundingBox();
   assert.ok(Math.abs(notice.x-content.x)<1&&Math.abs(notice.width-content.width)<1,'Reading notice must span the entire content width');
   assert.equal(await page.locator('.rd-decision-disclosure').getAttribute('aria-expanded'),'false');
   await noOverflow(page,`report first ${width}`);await screenshot(page,`report-first-${width}`);
   const trigger=page.getByRole('button',{name:'研究过程',exact:true});await trigger.click();
   const drawer=page.getByRole('dialog',{name:'研究过程',exact:true});await drawer.waitFor();
   await textIncludes(drawer.locator('.rd-meta'),'近 5 年');await textIncludes(drawer.locator('.research-progress'),'阶段记录');
   await textIncludes(drawer,'资料读取与原页复核');await count(drawer.locator('.rd-web-status,.rd-deep-process'),0);
   await noOverflow(page,`process drawer ${width}`);await screenshot(page,`report-process-${width}`);
   await page.keyboard.press('Escape');await drawer.waitFor({state:'hidden'});
   assert.equal(await trigger.evaluate(element=>element===document.activeElement),true);
   await page.locator('.rd-warning-summary>summary').click();await textIncludes(page.locator('.rd-warning-summary'),'部分资料尚待核对');
   await trigger.click();await drawer.locator('.rd-document-reading>summary').click();
   await drawer.locator('.rd-document-footer').getByRole('button',{name:'查看证据来源'}).click();
   await drawer.waitFor({state:'hidden'});await page.waitForURL('**?tab=sources');
   await page.waitForFunction(()=>document.activeElement?.getAttribute('role')==='tab'&&document.activeElement.textContent.includes('证据来源'));
   await count(page.locator('.rd-web-source-note'),0);
   await page.getByRole('tab',{name:'审计记录',exact:true}).click();
   await textIncludes(page.locator('.rd-audit-research-notes'),'一项合成资料缺口');
   assert.equal(requests('POST','/api/jobs').length,0);
  });
 }
 for(const width of [320,1440,2560]){
  const job=makeJob(3103,'completed',{mode:'A',question:'长报告阅读导航（合成）'});
  job.result.report='# 长报告\n\n'+Array.from({length:35},(_,i)=>`## 第 ${i+1} 节\n\n合成研究正文，仅验证长文滚动与阅读导航。[S1]\n\n`).join('');
  job.result.decision={action:'观察池',confidence:'中',summary:'判断摘要必须能够完整展开。'.repeat(30)+'摘要末尾验证标记',missingData:['不可遗漏的合成资料缺口']};
  test(`report-first-reading-navigation-${width}`,{jobs:[job],viewport:{width,height:900},reducedMotion:'no-preference'},async({page,requests})=>{
   await detail(page,job);
   const scroll=page.locator('.page-scroll'),top=page.getByRole('button',{name:'回到顶部',exact:true});
   await count(top,0);
   const summary=page.locator('.rd-decision-summary');assert.ok(await summary.evaluate(el=>el.scrollHeight>el.clientHeight));
   const originalBody=await page.getByRole('article',{name:'报告正文'}).boundingBox();
   await page.locator('.rd-decision-disclosure').click();
   const evidence=page.getByRole('dialog',{name:'判断依据与验证条件',exact:true});await evidence.waitFor();
   await textIncludes(evidence,'摘要末尾验证标记');
   await textIncludes(evidence,'不可遗漏的合成资料缺口');
   await page.keyboard.press('Escape');await evidence.waitFor({state:'hidden'});
   assert.ok(await summary.evaluate(el=>el.scrollHeight>el.clientHeight),'Inline digest remains compact');
   const restoredBody=await page.getByRole('article',{name:'报告正文'}).boundingBox();assert.ok(Math.abs(restoredBody.y-originalBody.y)<2,'Reading evidence does not move the report');
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   await scroll.evaluate(el=>el.scrollTo({top:1400,behavior:'instant'}));await top.waitFor();
   async function checkFloatingControls(){
    await page.waitForFunction(()=>{
     const body=document.querySelector('.rd-reading-body').getBoundingClientRect(),toolbar=document.querySelector('.rd-content-toolbar').getBoundingClientRect();
     const directory=document.querySelector('.rd-reading-tools .rd-directory-trigger').getBoundingClientRect(),top=document.querySelector('.rd-back-to-top').getBoundingClientRect();
     const viewport=document.querySelector('.page-scroll').getBoundingClientRect();
     return directory.left>=body.left&&directory.right<=body.right&&Math.abs(directory.top-toolbar.bottom-12)<2&&top.left>=body.left&&top.right<=body.right&&top.bottom<=viewport.bottom&&top.bottom>viewport.bottom-40;
    });
    assert.equal(await page.locator('.rd-content-toolbar .rd-directory-trigger').count(),0,'Directory remains floating beside the report');
    const backToTop=await top.boundingBox();
    const text=await page.getByRole('article',{name:'报告正文'}).boundingBox();
    assert.ok(text.x+text.width<=backToTop.x,'Back-to-top must not cover the report text');
   }
   await checkFloatingControls();
   const initial=await top.boundingBox();
   await scroll.evaluate(el=>el.scrollTo({top:2100,behavior:'instant'}));await checkFloatingControls();
   assert.ok(Math.abs((await top.boundingBox()).y-initial.y)<2,'Back-to-top should remain at the bottom while reading');
   if(width>=1024){
    await page.getByRole('button',{name:'阅读模式',exact:true}).click();await checkFloatingControls();
    await page.getByRole('button',{name:'退出阅读模式',exact:true}).click();await checkFloatingControls();
   }
   await noOverflow(page,`reading navigation ${width}`);await page.screenshot({path:fileURLToPath(new URL(`../artifacts/ui-reading-navigation-${width}.png`,import.meta.url)),animations:'disabled'});
   await top.focus();await page.keyboard.press('Enter');
   await page.waitForFunction(()=>document.querySelector('.page-scroll').scrollTop===0);
   assert.equal(await page.locator('.rd-title-row h1').evaluate(el=>el===document.activeElement),true);await count(top,0);
   await page.emulateMedia({reducedMotion:'reduce'});
   if(width<1024)await page.getByRole('button',{name:'打开研究操作',exact:true}).click();
   await page.getByRole('button',{name:'阅读模式',exact:true}).click();await page.locator('.rd-reading').waitFor();
   await scroll.evaluate(el=>el.scrollTo({top:1400,behavior:'instant'}));
   await page.getByRole('button',{name:'打开报告目录',exact:true}).click();
   await page.getByRole('navigation',{name:'报告目录',exact:true}).getByRole('link',{name:'第 20 节',exact:true}).click();
   await page.waitForFunction(()=>Boolean(location.hash)&&document.querySelector('.page-scroll').scrollTop>1000);
   await top.waitFor();await top.click();
   await page.waitForFunction(()=>document.querySelector('.page-scroll').scrollTop===0);
   assert.equal(new URL(page.url()).hash,'');
   await page.getByRole('tab',{name:'审计记录',exact:true}).click();await count(top,0);
   assert.equal(requests('POST','/api/jobs').length,0);
  });
 }
 const running=makeJob(3102,'running',{mode:'B',question:'正在形成的研究报告（合成）'});
 test('report-first-live-draft',{jobs:[running],viewport:{width:390,height:900}},async({page})=>{
  await detail(page,running);await page.locator('.rd-draft').waitFor();
  const box=await page.locator('.rd-draft').boundingBox();assert.ok(box.y<580);
  await page.getByRole('button',{name:'研究过程',exact:true}).click();
  await textIncludes(page.getByRole('dialog',{name:'研究过程'}),'正在验证逻辑与反证');
  await noOverflow(page,'running report drawer');
 });
}
