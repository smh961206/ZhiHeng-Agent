import assert from 'node:assert/strict';
import {platformVersion} from '../src/config/platform-release.mjs';

export async function registerPlatformV49Scenarios({test,makeJob,detail,openProcess,textIncludes,noOverflow,screenshot}){
 const historyModule=/\/(?:src\/components\/ResearchHistory\.jsx|assets\/ResearchHistory-[\w-]+\.js)(?:\?|$)/;
 const statusModule=/\/(?:src\/components\/PlatformStatusPanel\.jsx|assets\/PlatformStatusPanel-[\w-]+\.js)(?:\?|$)/;
 test('platform-v49-deferred-home-modules',{},async({page,requests})=>{
  let historyRequested=false,statusRequested=false,release;
  const gate=new Promise(resolve=>release=resolve);
  await page.route(historyModule,route=>{historyRequested=true;return route.continue();});
  await page.route(statusModule,async route=>{statusRequested=true;await gate;await route.continue();});
  await page.goto('/');await page.locator('.fw-hero').waitFor();
  assert.equal(historyRequested,false);assert.equal(statusRequested,false);
  const trigger=page.getByRole('button',{name:'平台与模型说明',exact:true}),requested=page.waitForRequest(statusModule);await trigger.click();
  await page.waitForFunction(()=>document.querySelector('.platform-status-trigger')?.getAttribute('aria-busy')==='true');
  await requested;
  assert.equal(statusRequested,true);assert.equal(await trigger.isDisabled(),true);
  release();await page.getByRole('dialog',{name:'知衡 · V'+platformVersion,exact:true}).waitFor();
  await page.keyboard.press('Escape');await trigger.evaluate(el=>el.focus());
  await page.goto('/history?q=retain&status=failed');await page.getByRole('searchbox',{name:'搜索研究问题、模式或标的',exact:true}).waitFor();
  assert.equal(historyRequested,true);assert.equal(new URL(page.url()).searchParams.get('q'),'retain');
  assert.equal(requests('POST','/api/jobs').length,0);
 });
 for(const [name,pattern] of [['history',historyModule],['status',statusModule]])test('platform-v49-deferred-'+name+'-failure',{},async({page,requests})=>{
  await page.route(pattern,route=>route.fulfill({contentType:'text/javascript',body:'throw new Error("synthetic-deferred-module-failure"); export default function Unavailable() {}'}));
  await page.goto(name==='history'?'/history?q=keep&status=failed':'/');
  if(name==='history')await page.getByRole('heading',{name:'暂时无法打开研究记录',exact:true}).waitFor();
  else {await page.getByRole('button',{name:'平台与模型说明',exact:true}).click();await page.getByRole('alert').filter({hasText:'说明暂时无法加载'}).waitFor();}
  await page.unroute(pattern);
  await page.getByRole('button',{name:name==='history'?'刷新重试':'平台与模型说明',exact:true}).click();
  if(name==='history'){await page.getByRole('searchbox',{name:'搜索研究问题、模式或标的',exact:true}).waitFor();assert.equal(new URL(page.url()).searchParams.get('q'),'keep');}
  else {await page.locator('.fw-hero').waitFor();await page.getByRole('button',{name:'平台与模型说明',exact:true}).click();await page.getByRole('dialog',{name:'知衡 · V'+platformVersion,exact:true}).waitFor();}
  assert.equal(requests('POST','/api/jobs').length,0);
 });
 const release='V'+platformVersion;
 for(const width of [320,1440,2560]){
  test('platform-v49-pages-'+width,{viewport:{width,height:1000}},async({page,requests})=>{
   for(const path of ['/','/workbench','/history','/handbook']){
    await page.goto(path);await page.locator('h1').waitFor();
    await textIncludes(page.locator('.platform-version'),release);
    assert.doesNotMatch(await page.locator('body').innerText(),/V4\.8/);
    await noOverflow(page,'V4.9 '+path+' '+width);
    if(path==='/')await screenshot(page,'platform-v49-home-'+width);
   }
   await page.getByRole('button',{name:'平台与模型说明',exact:true}).click();
   const panel=page.getByRole('dialog',{name:'知衡 · '+release,exact:true});
   await textIncludes(panel,'文档与图像');await textIncludes(panel,'当前研究规则 V4.7');
   await textIncludes(panel,'是否可读以本次处理结果为准');
   assert.equal(await panel.locator('details').count(),0,'Brief version explanation needs no extra disclosure');
   await noOverflow(page,'platform version '+width);await screenshot(page,'platform-v49-status-'+width);
   await page.keyboard.press('Escape');assert.equal(requests('POST','/api/jobs').length,0);
  });
  test('platform-v49-guide-navigation-'+width,{viewport:{width,height:1000}},async({page,requests})=>{
   await page.goto('/handbook?tab=guide');
   const nav=page.getByRole('navigation',{name:'使用指南快速定位',exact:true});
   const materials=page.locator('#usage-materials');
   await nav.getByRole('link',{name:'准备与上传资料',exact:true}).click();
   await page.waitForFunction(()=>document.activeElement?.id==='usage-materials');
   assert.equal(new URL(page.url()).hash,'#usage-materials');
   await textIncludes(materials,'负号、小数点');await textIncludes(materials,'重复提交同一张模糊图片不保证改善结果');
   await materials.locator('.usage-trigger').click();assert.equal(await materials.getAttribute('data-state'),'closed');
   await nav.getByRole('link',{name:'准备与上传资料',exact:true}).click();
   await textIncludes(materials,'截图和扫描件怎样准备');
   await nav.getByRole('link',{name:'阅读报告与审计记录',exact:true}).click();
   await page.waitForFunction(()=>document.activeElement?.id==='usage-report');
   await page.goBack();await page.waitForFunction(()=>document.activeElement?.id==='usage-materials');
   await page.reload();await textIncludes(materials,'截图和扫描件怎样准备');
   await page.waitForFunction(()=>document.activeElement?.id==='usage-materials');
   const [targetBox,tabsBox]=await Promise.all([materials.boundingBox(),page.getByRole('tablist',{name:'研究手册章节'}).boundingBox()]);
   assert.ok(targetBox.y>=tabsBox.y+tabsBox.height+8,'Section heading must remain below the sticky handbook tabs');
   if(width===320){
    const positions=await page.getByRole('tablist',{name:'研究手册章节'}).locator('button').evaluateAll(items=>items.map(el=>el.offsetTop));
    assert.equal(positions[0],positions[1]);assert.equal(positions[2],positions[3]);assert.notEqual(positions[0],positions[2]);
   }
   await noOverflow(page,'guide navigation '+width);await screenshot(page,'platform-v49-guide-'+width,'#usage-materials');
   assert.equal(requests('POST','/api/jobs').length,0);
  });
  test('platform-v49-guide-return-position-'+width,{viewport:{width,height:1000}},async({page,requests})=>{
   for(const [path,top] of [['/handbook',0],['/handbook?tab=guide',120]]){
    await page.goto(path);
    const link=page.getByRole('navigation',{name:'使用指南快速定位',exact:true}).getByRole('link',{name:'准备与上传资料',exact:true});
    await link.focus();
    await page.locator('.page-scroll').evaluate((node,top)=>node.scrollTo({top,behavior:'instant'}),top);
    await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.activeElement?.id==='usage-materials');
    for(let round=0;round<2;round++){
     await page.goBack();
     assert.equal(new URL(page.url()).hash,'');
     await page.waitForFunction(top=>Math.abs(document.querySelector('.page-scroll').scrollTop-top)<2,top,{timeout:3000});
     assert.ok(await link.evaluate(node=>node===document.activeElement),'Back should restore keyboard focus to the guide link');
     await page.goForward();
     await page.waitForFunction(()=>document.activeElement?.id==='usage-materials');
     await textIncludes(page.locator('#usage-materials'),'截图和扫描件怎样准备');
    }
   }
   await noOverflow(page,'guide return position '+width);
   assert.equal(requests('POST','/api/jobs').length,0);
  });
 }
 for(const state of ['missing','partial','rejected']){
  const job=makeJob(4901+['missing','partial','rejected'].indexOf(state));
  job.plan.version='4.3';job.modelRouting={analysisModel:'historical-analysis',visionModel:'historical-vision'};
  if(state!=='missing')job.visualAudit={delivery:state==='rejected'?'rejected':'delivered',included:[{id:'S1',pages:[1,3]}],omitted:[{id:'S2',reason:'合成：原页模糊，未完成复读'}]};
  test('platform-v49-saved-reading-'+state,{jobs:[job],viewport:{width:320,height:1000}},async({page,requests})=>{
   await detail(page,job);await textIncludes(page.getByLabel('报告版本',{exact:true}),'本报告规则 V4.3');
   await openProcess(page);const reading=page.locator('.rd-document-reading');await reading.locator('summary').click();
   await textIncludes(reading,'historical-vision');await textIncludes(reading,'读取完成不代表数据已经核实');
   await textIncludes(reading,'配置存在不表示已调用');assert.equal(await reading.getByLabel('资料核对顺序').locator('li').count(),3);
   if(state==='missing')await textIncludes(reading,'本次未保存原页复读范围');
   else {await textIncludes(reading,'第 1、3 页');await textIncludes(reading,'合成：原页模糊，未完成复读');}
   if(state==='rejected')await textIncludes(reading,'本次原页复核未完成');
   await noOverflow(page,'saved reading '+state);await screenshot(page,'platform-v49-reading-'+state,'.rd-document-reading');
   assert.equal(requests('POST','/api/jobs').length,0);
  });
 }
}
