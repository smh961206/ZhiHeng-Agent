import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

export function registerPlatformV48Scenarios({test,makeJob,detail,detailActions,openProcess,textIncludes,noOverflow,screenshot}){
 for(const width of [320,1440]){
  test('platform-v48-status-'+width,{viewport:{width,height:1000}},async({page,requests})=>{
   await page.goto('/');
   const trigger=page.getByRole('button',{name:'平台与模型说明',exact:true});
   await trigger.click();
   const panel=page.getByRole('dialog',{name:'知衡 · V4.8',exact:true});
   await textIncludes(panel,'模型已配置');await textIncludes(panel,'实际可用性以本次请求结果为准');
   await textIncludes(panel,'平台版本不表示已启用自动升级');
   assert.doesNotMatch(await panel.innerText(),/当前已启用自动升级|已连接|已通过质量验收/);
   await noOverflow(page,'platform status '+width);await screenshot(page,'platform-v48-status-'+width);
   await page.keyboard.press('Escape');await panel.waitFor({state:'hidden'});
   assert.equal(await trigger.evaluate(el=>el===document.activeElement),true);
   await page.route('**/api/config',route=>route.fulfill({status:503,json:{error:'fixture unavailable'}}));
   await trigger.click();await page.getByRole('button',{name:'重新检查服务',exact:true}).click();
   await textIncludes(panel,'状态待确认');assert.doesNotMatch(await panel.locator('.platform-connection').innerText(),/模型已配置/);
   await page.unroute('**/api/config');await page.getByRole('button',{name:'重新检查服务',exact:true}).click();await textIncludes(panel,'模型已配置');
   assert.equal(requests('POST','/api/jobs').length,0);
  });
  const job=makeJob(5480+width);job.modelRouting={analysisModel:'saved-analysis-only',visionModel:'saved-vision-only'};
  test('platform-v48-saved-model-'+width,{jobs:[job],viewport:{width,height:1000}},async({page})=>{
   await detail(page,job);await openProcess(page);
   const reading=page.locator('.rd-document-reading');await reading.locator('summary').click();
   await textIncludes(reading,'saved-analysis-only');await textIncludes(reading,'saved-vision-only');
   await textIncludes(reading,'配置存在不表示已调用');assert.doesNotMatch(await reading.innerText(),/交给 Pro|Pro 结合/);
   await noOverflow(page,'saved models '+width);await screenshot(page,'platform-v48-models-'+width);
  });
 }
 test('platform-v48-unconfigured',{configOverrides:{configured:false}},async({page,requests})=>{
  await page.goto('/workbench');await page.getByRole('button',{name:'平台与模型说明',exact:true}).click();
  await textIncludes(page.locator('.platform-connection'),'模型待配置');assert.equal(requests('POST','/api/jobs').length,0);
 });
 test('platform-v48-pause-rotation',{reducedMotion:'no-preference'},async({page})=>{
  await page.goto('/');
  const tabs=page.getByRole('tablist',{name:'研究场景',exact:true});
  await page.getByRole('button',{name:'暂停场景轮播',exact:true}).click();
  await tabs.scrollIntoViewIfNeeded();await page.mouse.move(0,0);await page.locator('h1').click();await tabs.scrollIntoViewIfNeeded();
  const selected=await tabs.locator('[aria-selected=true]').innerText();
  await page.waitForTimeout(4500);assert.equal(await tabs.locator('[aria-selected=true]').innerText(),selected);
  await page.getByRole('button',{name:'继续场景轮播',exact:true}).click();
  await page.getByRole('button',{name:'暂停场景轮播',exact:true}).waitFor();
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.getByRole('button',{name:'暂停场景轮播',exact:true}).waitFor({state:'hidden'});
 });
 for(const width of [320,1440])test('platform-v48-lazy-workbench-'+width,{viewport:{width,height:1000}},async({page,requests})=>{
  let release,requested=false;const loaded=new Promise(resolve=>release=resolve);
  await page.route('**/src/components/ResearchWorkbench.jsx*',async route=>{requested=true;await loaded;await route.continue();});
  await page.goto('/');await page.locator('.fw-hero').waitFor();
  assert.equal(requested,false,'Home must not load the workbench and its material editor');
  await page.getByRole('button',{name:'开始一项研究',exact:true}).click();
  await page.getByText('正在加载研究工作台…',{exact:true}).waitFor();
  assert.equal(requested,true);assert.equal(requests('POST','/api/jobs').length,0);
  release();const input=page.locator('#question');await input.waitFor();
  await page.waitForFunction(()=>document.activeElement?.id==='question');
  await input.fill('合成：保留公司的研究问题');await page.reload();
  assert.equal(await page.locator('#question').inputValue(),'合成：保留公司的研究问题');
  await noOverflow(page,'lazy workbench '+width);
 });
 test('platform-v48-workbench-load-recovery',{},async({page,requests})=>{
  await page.addInitScript(()=>{if(!sessionStorage.getItem('zhiheng:composer:v1'))sessionStorage.setItem('zhiheng:composer:v1',JSON.stringify({version:1,savedAt:Date.now(),input:{question:'合成：加载失败后保留的草稿'}}));});
  const pattern='**/src/components/ResearchWorkbench.jsx*';
  await page.route(pattern,route=>route.fulfill({contentType:'text/javascript',body:'throw new Error("synthetic-workbench-module-failure"); export default function Workbench() {}'}));
  await page.goto('/workbench');await page.getByRole('heading',{name:'暂时无法打开研究工作台',exact:true}).waitFor();
  assert.equal(requests('POST','/api/jobs').length,0);
  await page.unroute(pattern);await page.getByRole('button',{name:'刷新重试',exact:true}).click();
  await page.locator('#question').waitFor();assert.equal(await page.locator('#question').inputValue(),'合成：加载失败后保留的草稿');
 });

 for(const width of [320,1440]){
  const job=makeJob(8480+width);
  test('platform-v48-export-loading-'+width,{jobs:[job],viewport:{width,height:1000}},async({page,requests})=>{
   let release;const gate=new Promise(resolve=>release=resolve);
   await page.route('**/*research-export*',async route=>{await gate;await route.continue();});
   await detail(page,job);
   let downloads=0;page.on('download',()=>downloads++);
   const actions=await detailActions(page);
   await actions.locator('.rd-export').click();
   await page.getByRole('dialog',{name:'下载选项',exact:true}).getByRole('button',{name:'开始下载',exact:true}).click();
   try{
    await page.locator('.rd-export:visible[aria-busy="true"]').waitFor();
    assert.equal(await page.locator('.rd-export:visible').isDisabled(),true);
    assert.equal(await page.locator('.execution-record-download').isDisabled(),true);
    await page.locator('.rd-export:visible').evaluate(button=>{button.click();button.click();});
    assert.equal(downloads,0);
    await noOverflow(page,'export loading '+width);
    await screenshot(page,'platform-v48-export-loading-'+width);
   }finally{release();}
   const download=await page.waitForEvent('download');
   assert.match(await readFile(await download.path(),'utf8'),/合成研究报告/);
   await page.waitForFunction(()=>Array.from(document.querySelectorAll('.rd-export,.execution-record-download')).every(button=>!button.disabled));
   assert.equal(downloads,1);assert.equal(requests('POST','/api/jobs').length,0);
  });
 }

 const exportJob=makeJob(8481);
 test('platform-v48-export-failure-recovery',{jobs:[exportJob]},async({page,requests})=>{
  const pattern='**/*research-export*';
  await page.route(pattern,route=>route.fulfill({contentType:'text/javascript',body:'throw new Error("synthetic-export-load-failure");'}));
  await detail(page,exportJob);
  let downloads=0;page.on('download',()=>downloads++);
  await page.getByRole('button',{name:'导出已保存记录',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'导出失败，请刷新页面后重试。'}).waitFor();
  assert.equal(await page.locator('.execution-record-download').isDisabled(),false);
  assert.equal(await page.locator('.rd-export:visible').isDisabled(),false);
  assert.equal(downloads,0);
  await page.unroute(pattern);await page.reload();
  const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'导出已保存记录',exact:true}).click()]);
  assert.match(download.suggestedFilename(),/-execution\.md$/);
  const exported=await readFile(await download.path(),'utf8');
  assert.ok(exported.includes(exportJob.id));assert.match(exported,/已保存执行记录/);
  assert.match(exported,/贵州茅台 2025 年年度报告（合成资料）/);
  assert.doesNotMatch(exported,/# 合成研究报告/);
  assert.equal(downloads,1);assert.equal(requests('POST','/api/jobs').length,0);
 });

}
