import assert from 'node:assert/strict';
import {modelTrackVersion,platformVersion} from '../src/config/platform-release.mjs';

const stageModels={input:'model-input',vision:'model-vision',researcher:'model-researcher',writer:'model-writer',evidenceVerifier:'model-verifier',auditor:'model-auditor',criticalReviewer:null,judge:null};
const stageLabels=['Input · 输入理解','Vision · 原页读取','研究','写作','证据核验','审计','关键复核','Judge · 证据裁决'];

export function registerPlatformM10Scenarios({test,makeJob,detail,openProcess,textIncludes,noOverflow,screenshot}){
 for(const width of [320,1440]){
  test(`platform-m10-stage-visibility-${width}`,{viewport:{width,height:1100},configOverrides:{modelSelection:{mode:'pipeline',analysisModel:stageModels.researcher,visionModel:stageModels.vision,stageModels,stageRouting:true,optionalReviewEnabled:false,judgeEnabled:false}}},async({page,requests})=>{
   await page.goto('/');
   const release=page.locator('.fw-release-note');await textIncludes(release,'V'+platformVersion);await textIncludes(release,'模型配置 '+modelTrackVersion);
   await page.getByRole('button',{name:'平台与模型说明',exact:true}).click();
   const panel=page.getByRole('dialog',{name:'知衡 · V'+platformVersion,exact:true});
   await textIncludes(panel,'模型配置 '+modelTrackVersion);
   const stages=panel.getByRole('region',{name:'当前模型设置'}).getByRole('definition');
   assert.equal(await panel.getByRole('list').count(),0);
   for(const label of stageLabels)await textIncludes(panel,label);
   for(const model of Object.values(stageModels).filter(Boolean))await textIncludes(panel,model);
   assert.equal((await panel.getByText('未启用',{exact:true}).all()).length,2);
   assert.ok(await stages.count()>=9);
   await textIncludes(panel,'关键复核与裁决未启用时不会调用');
   if(width===320){
    const columns=await panel.locator('.platform-stage-models').evaluate(node=>getComputedStyle(node).gridTemplateColumns.split(' ').filter(Boolean).length);
    assert.equal(columns,2,'移动端模型列表应保持两列紧凑展示');
   }
   await noOverflow(page,'M1.0 model stages '+width);await screenshot(page,`m10-model-stages-${width}`,'.platform-status-panel');
   assert.equal(requests('POST','/api/jobs').length,0);
  });

  const job=makeJob(7200+width);job.modelRouting={analysisModel:stageModels.researcher,visionModel:stageModels.vision,stageModels};
  test(`platform-m10-saved-stages-and-cost-${width}`,{jobs:[job],viewport:{width,height:1100}},async({page,requests})=>{
   await page.route('**/api/jobs/*/cost',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({version:1,calls:8,unknownBillingCalls:0,complete:true,billing:[{currency:'USD',knownEstimatedCost:0.08}],byPurpose:Object.keys(stageModels).map(purpose=>({purpose:purpose==='evidenceVerifier'?'evidence-verifier':purpose==='criticalReviewer'?'critical-review':purpose,calls:1,billing:[{currency:'USD',knownEstimatedCost:0.01}],unknownBillingCalls:0})),cache:{cachedInputTokens:800,unknownCalls:0},notice:'合成费用记录，不是供应商账单。'})}));
   await detail(page,job);await openProcess(page);
   const reading=page.locator('.rd-document-reading');await reading.locator('summary').click();
   const saved=reading.getByRole('definition');assert.equal(await saved.count(),8);
   for(const label of stageLabels)await textIncludes(reading,label);
   for(const model of Object.values(stageModels).filter(Boolean))await textIncludes(reading,model);
   assert.equal((await reading.getByText('未启用',{exact:true}).all()).length,2);
   const cost=page.locator('.rd-cost-summary');await cost.locator('summary').click();
   for(const label of stageLabels)await textIncludes(cost,label);
   assert.doesNotMatch(await cost.innerText(),/其他调用|未识别环节|研究预算/);
   await noOverflow(page,'M1.0 saved stages and cost '+width);await screenshot(page,`m10-saved-stages-${width}`,'.rd-process-sheet');
   assert.equal(requests('POST','/api/jobs').length,0);
  });
 }

 test('platform-m10-guide-explains-v51-v52-boundaries',{viewport:{width:320,height:1100}},async({page,requests})=>{
  await page.goto('/handbook?tab=guide#usage-report');
  const guide=page.locator('#usage-report');
  await textIncludes(guide,'怎样查看模型费用与缓存');await textIncludes(guide,'未知，不会按零计算');
 await textIncludes(guide,'关键复核和证据裁决什么时候出现');await textIncludes(guide,'环节显示“已配置”仅表示可以调用');
  assert.doesNotMatch(await guide.innerText(),/保证正确/);
  await noOverflow(page,'M1.0 guide');assert.equal(requests('POST','/api/jobs').length,0);
 });

 test('platform-m10-review-copy-distinguishes-audit-and-conditional-review',{viewport:{width:320,height:1100}},async({page,requests})=>{
  await page.goto('/');
  const faq=page.locator('#fw-faq');
  await textIncludes(faq,'独立审计和程序检查意味着什么？');
  await faq.getByRole('button',{name:'独立审计和程序检查意味着什么？',exact:true}).click();
  await textIncludes(faq,'必要时才进入关键复核');
  assert.doesNotMatch(await faq.innerText(),/模型复核和程序检查/);
  await noOverflow(page,'M1.0 review copy');assert.equal(requests('POST','/api/jobs').length,0);
 });
}
