import assert from 'node:assert/strict';

const stageModels={input:'model-input',vision:'model-vision',researcher:'model-researcher',writer:'model-writer',evidenceVerifier:'model-verifier',auditor:'model-auditor',criticalReviewer:null,judge:null};
const stageLabels=['问题理解','原页读取','研究分析','报告整理','证据核验','交付复核','关键复核','分歧裁决'];

export function registerPlatformM10Scenarios({test,makeJob,detail,openProcess,textIncludes,noOverflow,screenshot}){
 for(const width of [320,1440]){
  test(`platform-m10-stage-visibility-${width}`,{viewport:{width,height:1100},configOverrides:{modelSelection:{mode:'pipeline',analysisModel:stageModels.researcher,visionModel:stageModels.vision,stageModels,stageRouting:true,optionalReviewEnabled:false,judgeEnabled:false}}},async({page,requests})=>{
   await page.goto('/');
   assert.equal(await page.locator('.fw-release-note,.fw-hero-note,.fw-quality-link').count(),0);
   await page.getByRole('button',{name:'平台运行说明',exact:true}).click();
   const panel=page.getByRole('dialog',{name:'平台说明',exact:true});
   await textIncludes(panel,'按问题研究');await textIncludes(panel,'先核对依据');await textIncludes(panel,'过程可回查');
   assert.doesNotMatch(await panel.innerText(),/M1\.1|V5\.2|Token|Input|Vision|Judge|model-/);
   await noOverflow(page,'M1.0 model stages '+width);await screenshot(page,`m10-model-stages-${width}`,'.platform-status-panel');
   assert.equal(requests('POST','/api/jobs').length,0);
  });

  const job=makeJob(7200+width);job.modelRouting={analysisModel:stageModels.researcher,visionModel:stageModels.vision,stageModels};
  test(`platform-m10-saved-stages-and-cost-${width}`,{jobs:[job],viewport:{width,height:1100}},async({page,requests})=>{
   await page.route('**/api/jobs/*/cost',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({version:1,calls:8,unknownBillingCalls:0,complete:true,billing:[{currency:'USD',knownEstimatedCost:0.08}],usage:{inputTokens:{knownTotal:8000,unknownCalls:0},outputTokens:{knownTotal:1600,unknownCalls:0},totalTokens:{knownTotal:9600,unknownCalls:0},cachedInputTokens:{knownTotal:800,unknownCalls:0}},byPurpose:Object.keys(stageModels).map(purpose=>({purpose:purpose==='evidenceVerifier'?'evidence-verifier':purpose==='criticalReviewer'?'critical-review':purpose,calls:1,usage:{inputTokens:{knownTotal:1000,unknownCalls:0},outputTokens:{knownTotal:200,unknownCalls:0},totalTokens:{knownTotal:1200,unknownCalls:0},cachedInputTokens:{knownTotal:100,unknownCalls:0}},billing:[{currency:'USD',knownEstimatedCost:0.01}],unknownBillingCalls:0})),cache:{cachedInputTokens:800,unknownCalls:0},notice:'合成费用记录，不是供应商账单。'})}));
   await detail(page,job);await openProcess(page);
   const advanced=page.locator('.rd-advanced-records');await advanced.locator(':scope > summary').click();const models=page.locator('.rd-model-assignment');await models.locator('summary').click();
   const saved=models.getByRole('definition');assert.equal(await saved.count(),8);
   for(const label of stageLabels)await textIncludes(models,label);
   for(const model of Object.values(stageModels).filter(Boolean))await textIncludes(models,model);
   assert.equal((await models.getByText('未启用',{exact:true}).all()).length,2);
   const cost=page.locator('.rd-cost-summary');await cost.locator('summary').click();
   for(const label of stageLabels)await textIncludes(cost,label);
   await textIncludes(cost,'服务调用与用量');await textIncludes(cost,'输入用量');await textIncludes(cost,'8,000');await textIncludes(cost,'输出 200');
   assert.doesNotMatch(await cost.innerText(),/其他调用|未识别环节|研究预算/);
   await noOverflow(page,'M1.0 saved stages and cost '+width);await screenshot(page,`m10-saved-stages-${width}`,'.rd-process-sheet');
   assert.equal(requests('POST','/api/jobs').length,0);
  });
 }

 test('platform-m10-guide-explains-v51-v52-boundaries',{viewport:{width:320,height:1100}},async({page,requests})=>{
  await page.goto('/handbook?tab=guide#usage-report');
  const guide=page.locator('#usage-report');
  await textIncludes(guide,'怎样查看研究过程');await textIncludes(guide,'普通阅读先看进展与资料覆盖即可');
 await textIncludes(guide,'什么时候会进行额外复核');await textIncludes(guide,'不会代替证据');
  assert.doesNotMatch(await guide.innerText(),/保证正确/);
  await noOverflow(page,'M1.0 guide');assert.equal(requests('POST','/api/jobs').length,0);
 });

test('platform-m10-review-copy-distinguishes-audit-and-conditional-review',{viewport:{width:320,height:1100}},async({page,requests})=>{
  await page.goto('/handbook?tab=guide#usage-report');
  const guide=page.locator('#usage-report');
  await textIncludes(guide,'什么时候会进行额外复核');
  await textIncludes(guide,'平台可能增加一次独立复核');
  await textIncludes(guide,'额外复核不会代替证据');
  assert.doesNotMatch(await guide.innerText(),/保证正确/);
  await noOverflow(page,'M1.0 review copy');assert.equal(requests('POST','/api/jobs').length,0);
 });
}
