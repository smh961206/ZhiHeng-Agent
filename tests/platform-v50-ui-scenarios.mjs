import assert from 'node:assert/strict';
import {platformVersion} from '../src/config/platform-release.mjs';

export function registerPlatformV50Scenarios({test,makeJob,detail,openProcess,textIncludes,noOverflow,screenshot}){
 for(const width of [320,1440])for(const state of ['legacy','champion','missing']){
  const selection=state==='legacy'?{mode:'legacy',analysisModel:'configured-analysis-'.repeat(8),visionModel:'configured-vision',candidatesEnabled:false}:state==='champion'?{mode:'champion',analysisModel:null,visionModel:'approved-vision',candidatesEnabled:true}:undefined;
  test('platform-v50-model-settings-'+state+'-'+width,{viewport:{width,height:1000},configOverrides:{modelSelection:selection}},async({page,requests})=>{
   await page.goto('/');await page.getByRole('button',{name:'平台与模型说明',exact:true}).click();
   const panel=page.getByRole('dialog',{name:'知衡 · V'+platformVersion,exact:true}),settings=panel.getByRole('region',{name:'当前模型设置'});
   await textIncludes(settings,state==='legacy'?'候选未启用':state==='champion'?'已采用验收策略':'状态待确认');
   await textIncludes(settings,state==='legacy'?'固定模型':state==='champion'?'按任务选择，见研究记录':'未确认');
   if(state==='missing')assert.doesNotMatch(await settings.innerText(),/候选未启用|固定模型|fixture-only/);
   assert.doesNotMatch(await settings.innerText(),/REGISTRY|API_KEY|CHALLENGER/);
   await noOverflow(page,'model settings '+state+' '+width);await screenshot(page,'v50-settings-'+state+'-'+width,'.platform-status-panel');
   assert.equal(requests('POST','/api/jobs').length,0);
  });
 }
 async function qualityVisible(page){
  await page.waitForFunction(()=>document.activeElement?.id==='method-quality');
  const section=page.locator('#method-quality');
  await textIncludes(section,'测试通过不等于已用于你的研究');
  assert.equal(await section.locator('details,[data-slot="collapsible"]').count(),0);
  // History restoration and sticky layout may settle after focus is restored.
  // Measure both elements in one frame before keeping the exact geometry checks.
  await page.waitForFunction(()=>{
   const section=document.getElementById('method-quality'),tabs=document.querySelector('[role="tablist"][aria-label="研究手册章节"]');
   if(!section||!tabs)return false;
   const target=section.getBoundingClientRect(),bar=tabs.getBoundingClientRect();
   return target.top>=bar.bottom+8&&target.top<1000;
  });
  const target=await section.boundingBox(),tabs=await page.getByRole('tablist',{name:'研究手册章节'}).boundingBox();
  assert.ok(target.y>=tabs.y+tabs.height+8,'Quality heading must be below sticky tabs');
  assert.ok(target.y<1000,'Quality heading should be visible');
 }
 for(const width of [320,1440,2560]){
  test('platform-v50-quality-navigation-'+width,{viewport:{width,height:1000}},async({page,requests})=>{
   await page.goto('/');await textIncludes(page.locator('.fw-release-note'),'V'+platformVersion);
   await textIncludes(page.locator('.fw-release-note'),'模型评估 · 质量优先');
   await screenshot(page,'v50-home-'+width);
   await page.getByRole('link',{name:'模型如何评估与使用',exact:true}).click();
   await qualityVisible(page);await noOverflow(page,'quality handbook '+width);
   await screenshot(page,'v50-quality-'+width,'#method-quality');
   await page.getByRole('link',{name:'查看报告核对指南',exact:true}).click();
   await page.waitForFunction(()=>document.activeElement?.id==='usage-report');
   await textIncludes(page.locator('#usage-report'),'怎样确认本次模型与规则');
   await page.goBack();await qualityVisible(page);
   await page.reload();await qualityVisible(page);
   assert.equal(requests('POST','/api/jobs').length,0);
  });
  test('platform-v50-help-preserves-input-'+width,{viewport:{width,height:1000}},async({page,requests})=>{
   await page.goto('/workbench');const question=page.locator('textarea').first();
   await question.fill('核对公司的盈利质量，保留我的研究问题');
   await page.getByRole('button',{name:'平台与模型说明',exact:true}).click();
   const panel=page.getByRole('dialog',{name:'知衡 · V'+platformVersion,exact:true});
   await textIncludes(panel,'质量优先');await textIncludes(panel,'完成验收后才可启用');
   assert.doesNotMatch(await panel.innerText(),/已通过质量验收|当前已启用|实验组|API|Champion/);
   await screenshot(page,'v50-platform-'+width);
   const [help]=await Promise.all([page.waitForEvent('popup'),panel.getByRole('link',{name:'了解模型评估',exact:true}).click()]);
   await qualityVisible(help);await help.close();
   assert.equal(new URL(page.url()).pathname,'/workbench');
   assert.equal(await question.inputValue(),'核对公司的盈利质量，保留我的研究问题');
   await noOverflow(page,'workbench help '+width);
   assert.equal(requests('POST','/api/jobs').length,0);
  });
 }
 for(const width of [320,1440]){
  const job=makeJob(5200+width);job.modelRouting={analysisModel:'saved-analysis',visionModel:'saved-vision'};
  job.events=[{type:'tool',toolName:'search_evidence',toolCallId:'guide-call',arguments:{query:'GUIDE_SAVED_INPUT'}},{type:'tool_result',toolName:'search_evidence',toolCallId:'guide-call',result:{marker:'GUIDE_SAVED_RETURN'}}];
  test('platform-v50-call-record-guide-'+width,{jobs:[job],viewport:{width,height:1000}},async({page,requests})=>{
   await page.goto('/handbook?tab=method#method-quality');await qualityVisible(page);
   await textIncludes(page.locator('.method-quality-record'),'在“本次查证记录”点击“查看调用”');
   await page.getByRole('link',{name:'查看报告核对指南',exact:true}).click();
   const guide=page.locator('#usage-report');await textIncludes(guide,'进入“执行轨迹”并展开“查看调用详情”');
   assert.doesNotMatch(await guide.innerText(),/打开“研究过程”，按调用编号/);
   await detail(page,job);await openProcess(page);
   const process=page.getByRole('dialog',{name:'研究过程',exact:true});
   await process.locator('.rd-document-reading summary').click();await textIncludes(process,'saved-analysis');
   await page.keyboard.press('Escape');
   await page.getByRole('region',{name:'本次查证记录',exact:true}).getByRole('button',{name:'查看实际输入与返回',exact:true}).click();
   const trace=page.getByRole('complementary',{name:'研究执行轨迹'});
   await trace.getByRole('button',{name:'查看调用详情',exact:true}).click();
   await textIncludes(trace,'GUIDE_SAVED_INPUT');await textIncludes(trace,'GUIDE_SAVED_RETURN');
   await noOverflow(page,'guide call location '+width);assert.equal(requests('POST','/api/jobs').length,0);
  });
 }
 for(const width of [320,1440]){
  const job=makeJob(5400+width);
  // Older saved events may have data without a tool name or call ID.
  job.events=[{type:'tool_result',message:'已读取历史资料',arguments:{query:'LEGACY_SAVED_INPUT'},result:{marker:'LEGACY_SAVED_RETURN'}}];
  test('platform-v50-legacy-call-record-guide-'+width,{jobs:[job],viewport:{width,height:1000}},async({page,requests})=>{
   await page.goto('/handbook?tab=method#method-quality');await qualityVisible(page);
   await textIncludes(page.locator('.method-quality-record'),'在“本次查证记录”点击“查看调用”');
   await page.getByRole('link',{name:'查看报告核对指南',exact:true}).click();
   await textIncludes(page.locator('#usage-report'),'没有保存的编号、输入或返回不会补齐');
   await detail(page,job);
   await page.getByRole('region',{name:'本次查证记录',exact:true}).getByRole('button',{name:'查看实际输入与返回',exact:true}).click();
   const trace=page.getByRole('complementary',{name:'研究执行轨迹'});
   await trace.getByRole('button',{name:'查看调用详情',exact:true}).click();
   await textIncludes(trace,'LEGACY_SAVED_INPUT');await textIncludes(trace,'LEGACY_SAVED_RETURN');
   await textIncludes(trace,'调用编号：未记录');
   await noOverflow(page,'legacy guide call location '+width);
   assert.equal(requests('POST','/api/jobs').length,0);
  });
 }
 for(const state of ['historical','missing-model','long-model']){
  const job=makeJob(5001+['historical','missing-model','long-model'].indexOf(state));job.plan.version='4.3';
  job.modelRouting={analysisModel:state==='historical'?'saved-analysis':state==='long-model'?'historical-analysis-'.repeat(12):null,visionModel:'saved-vision'};
  test('platform-v50-saved-config-'+state,{jobs:[job],viewport:{width:320,height:1000}},async({page,requests})=>{
   await detail(page,job);await openProcess(page);const reading=page.locator('.rd-document-reading');await reading.locator('summary').click();
   assert.deepEqual(await reading.locator('.rd-model-records dd').allTextContents(),[job.modelRouting.analysisModel||'未记录','saved-vision']);
   await textIncludes(reading,'平台更新不会补写历史模型配置或评估结果');
   await textIncludes(reading,'本次未保存原页复读范围');
   await noOverflow(page,'saved model '+state);await screenshot(page,'v50-reading-'+state,'.rd-document-reading');
   assert.equal(requests('POST','/api/jobs').length,0);
  });
 }
}
