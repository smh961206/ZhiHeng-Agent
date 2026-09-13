import assert from 'node:assert/strict';
export function registerPlatformV51Scenarios({test,makeJob,detail,openProcess,textIncludes,noOverflow,screenshot}){
 for(const width of [320,1440])for(const variant of ['known','unknown','error']){
  const job=makeJob(6100+width);
  test(`platform-v51-cost-${variant}-${width}`,{jobs:[job],viewport:{width,height:1100}},async({page})=>{
   await page.route('**/api/jobs/*/cost',route=>route.fulfill({status:variant==='error'?503:200,contentType:'application/json',body:JSON.stringify({version:1,calls:2,unknownBillingCalls:variant==='known'?0:2,complete:variant==='known',billing:variant==='known'?[{currency:'USD',knownEstimatedCost:0},{currency:'CNY',knownEstimatedCost:0.0000001}]:[],byPurpose:[],cache:{cachedInputTokens:null,unknownCalls:2},notice:'合成费用测试，无真实账单。'})}));
   await detail(page,job);await openProcess(page);const records=page.locator('.rd-service-records');await records.locator(':scope > .rd-process-disclosure-trigger').click();const panel=records.locator('.rd-cost-summary');await panel.getByRole('button',{name:'读取用量记录',exact:true}).click();
   await textIncludes(panel,variant==='known'?'小于 0.000001':variant==='unknown'?'记录不完整':'暂时无法加载');
   if(variant==='known'){await textIncludes(panel,'USD');await textIncludes(panel,'CNY');}
   if(variant==='unknown')await textIncludes(panel,'未知');
   assert.match(await panel.innerText(),/服务调用与用量/);assert.doesNotMatch(await panel.innerText(),/研究预算|预算限制|API_KEY|prefixFingerprint|reasoning_content/);assert.equal(await records.locator('details').count(),0);await noOverflow(page,'cost '+width);await screenshot(page,`v51-cost-${variant}-${width}`,'.rd-cost-summary');
   await panel.getByRole('button',{name:'刷新用量记录'}).click();await textIncludes(panel,variant==='error'?'暂时无法加载':'费用');
  });
 }
}
