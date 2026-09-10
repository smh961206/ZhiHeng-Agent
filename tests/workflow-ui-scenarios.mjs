import assert from 'node:assert/strict';

export function registerWorkflowScenarios({test,workbench,manualInput,enabled,textIncludes,count,collapsible,noOverflow,screenshot}){
 for(const width of [320,1440])test(`preparation-scope-and-validation-${width}`,{viewport:{width,height:1000}},async({page,requests})=>{
  await workbench(page);
  await count(page.locator('.workbench-scope-rail'),width>=1280?1:0);
  await count(page.locator('.workbench-composer .research-preparation'),width>=1280?0:1);
  await count(page.locator('.research-preparation'),1);
  await count(page.locator('.workbench-guide-card'),0);
  const preparation=page.getByRole('region',{name:'本次研究范围'}),submit=page.locator('button[type=submit]');
  if(width>=1280){const style=await preparation.evaluate(node=>({radius:getComputedStyle(node).borderRadius,background:getComputedStyle(node).backgroundColor}));assert.deepEqual(style,{radius:'16px',background:'rgb(255, 255, 255)'});}
  assert.deepEqual(await preparation.locator('.preparation-check-label').allTextContents(),['你想研究什么？','研究路径','行情与研究资料','补充资料','研究设置']);
  await preparation.getByRole('button',{name:/你想研究什么？：待处理/}).click();
  assert.equal(await page.locator('#question').evaluate(element=>element===document.activeElement),true);
  for(const [label,selector] of [['研究路径','#research-path'],['行情与研究资料','.workbench-securities'],['补充资料','.workbench-materials-target'],['研究设置','.workbench-settings']]){
   const link=preparation.getByRole('button',{name:new RegExp('^'+label+'：')});await link.focus();await page.keyboard.press('Enter');
   assert.equal(await page.locator(selector).evaluate(element=>element===document.activeElement),true,`${label} focuses its matching form block`);
  }
  await manualInput(page);await page.locator('#question').fill('分析长期现金流质量');
  const code=page.getByRole('textbox',{name:'标的1股票代码',exact:true});await code.fill('123');
  await enabled(submit,false);await textIncludes(page.locator('.composer-readiness'),'6位股票代码');
  await noOverflow(page,'pending footer '+width);await screenshot(page,'workbench-pending-footer-'+width,'.composer-footer');
  await page.locator('#question').press('Control+Enter');assert.equal(requests('POST','/api/jobs').length,0);
  await page.getByRole('button',{name:'定位待处理项',exact:true}).click();
  assert.equal(await page.locator('.workbench-securities').evaluate(element=>element===document.activeElement),true);
  await code.fill('600519');await enabled(submit,true);await textIncludes(preparation,'1 个标的');
  const deliveryTrigger=preparation.getByRole('button',{name:/^查看交付范围/});
  const delivery=page.getByRole('dialog',{name:/交付范围$/});
  assert.equal(await deliveryTrigger.getAttribute('aria-expanded'),'false');
  await count(delivery,0);
  await textIncludes(preparation.locator('.input-optional'),'选填');
  await screenshot(page,'workbench-scope-card-'+width);
  await textIncludes(preparation.locator('.preparation-facts'),'报告、复核与证据');
  await deliveryTrigger.click();await textIncludes(delivery,'验证计划 · 证据判断 · 估值区间与研究动作');await textIncludes(delivery,'实际资料缺口与限制会随报告列明');await count(delivery.locator('.preparation-sections'),0);
  await page.keyboard.press('Escape');await delivery.waitFor({state:'hidden'});
  assert.equal(await deliveryTrigger.evaluate(element=>element===document.activeElement),true);
  await noOverflow(page,'preparation '+width);await screenshot(page,'preparation-'+width,'.research-preparation');
  await page.getByRole('combobox',{name:'研究路径',exact:true}).click();await page.getByRole('option',{name:'股东回报',exact:true}).click();
  await textIncludes(preparation,'近 8 年 · 固定');
  await deliveryTrigger.focus();await page.keyboard.press('Enter');
  await textIncludes(delivery,'分红可持续性 · 收益率锚 · 交叉验证');
  await count(delivery.locator('.research-scene-deliverables>li'),8);
  await noOverflow(page,'delivery preview '+width);await screenshot(page,'preparation-delivery-'+width,'.preparation-delivery-sheet');
  await page.keyboard.press('Escape');await delivery.waitFor({state:'hidden'});
  assert.equal(requests('POST','/api/jobs').length,0,'Scope preview must not start research');
  await submit.click();await page.waitForURL(/\/research\//);
  assert.equal(requests('POST','/api/jobs')[0].body.historyYears,8);
 });

 test('preparation-service-unavailable',{configOverrides:{configured:false}},async({page,requests})=>{
  await workbench(page);await page.locator('#question').fill('研究贵州茅台');await textIncludes(page.locator('.security-chip'),'600519');
  await enabled(page.locator('button[type=submit]'),false);await textIncludes(page.locator('.composer-readiness'),'研究服务尚未配置');
  await page.locator('#question').press('Control+Enter');assert.equal(requests('POST','/api/jobs').length,0);
 });

 test('preparation-resolution-retry-and-stale-input',{failures:{'POST /api/securities/resolve':1}},async({page,requests,hold})=>{
  await workbench(page);await page.locator('#question').fill('研究贵州茅台');
  await page.getByRole('button',{name:'重新识别',exact:true}).click();await textIncludes(page.locator('.security-chip'),'600519');
  await enabled(page.locator('button[type=submit]'),true);
  const release=hold('POST /api/securities/resolve');await page.locator('#question').fill('研究苹果');
  await enabled(page.locator('button[type=submit]'),false);await count(page.locator('.security-chip'),0);
  await page.locator('#question').press('Control+Enter');assert.equal(requests('POST','/api/jobs').length,0);
  release();await textIncludes(page.locator('.security-chip'),'AAPL');await page.locator('button[type=submit]').click();
  await page.waitForURL(/\/research\//);assert.deepEqual(requests('POST','/api/jobs')[0].body.securities,[{market:'US',symbol:'AAPL'}]);
 });
}
