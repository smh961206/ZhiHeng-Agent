import assert from 'node:assert/strict';
import {platformVersion} from '../src/config/platform-release.mjs';

export function registerPlatformV50Scenarios({test,makeJob,detail,openProcess,textIncludes,noOverflow,screenshot}){
 for(const width of [320,1440])for(const state of ['pipeline','historical','missing']){
  const selection=state==='pipeline'?{mode:'pipeline',analysisModel:'configured-researcher',visionModel:'configured-vision',stageModels:{input:'configured-input',writer:'configured-writer',auditor:'configured-auditor',criticalReviewer:null,judge:null}}:state==='historical'?{mode:'champion',analysisModel:null,visionModel:'saved-vision'}:undefined;
  test('platform-v50-model-settings-'+state+'-'+width,{viewport:{width,height:1000},configOverrides:{modelSelection:selection}},async({page,requests})=>{
   await page.goto('/');await page.getByRole('button',{name:'平台与模型说明',exact:true}).click();
   const panel=page.getByRole('dialog',{name:'知衡 · V'+platformVersion,exact:true}),settings=panel.getByRole('region',{name:'当前模型设置'});
   await textIncludes(settings,state==='pipeline'?'环节模型已就绪':state==='historical'?'仅供历史任务兼容':'状态待确认');
   await textIncludes(settings,state==='pipeline'?'按研究环节配置':state==='historical'?'兼容历史模型配置':'未确认');
   if(state==='pipeline'){await textIncludes(settings,'configured-input');await textIncludes(settings,'未启用');}
   if(state==='missing')assert.doesNotMatch(await settings.innerText(),/fixture-only|configured-/);
   assert.doesNotMatch(await settings.innerText(),/REGISTRY|API_KEY|CHALLENGER|Champion|A\/B|验收策略|候选/);
   await noOverflow(page,'model settings '+state+' '+width);await screenshot(page,'v50-settings-'+state+'-'+width,'.platform-status-panel');
   assert.equal(requests('POST','/api/jobs').length,0);
  });
 }
 async function qualityVisible(page){
  await page.waitForFunction(()=>document.activeElement?.id==='method-quality');
  const section=page.locator('#method-quality');
  await textIncludes(section,'配置成功不表示结论已经核实');
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
   await textIncludes(page.locator('.fw-release-note'),'环节分工 · 证据优先');
   await screenshot(page,'v50-home-'+width);
   await page.getByRole('link',{name:'模型怎样分工与记录',exact:true}).click();
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
   await textIncludes(panel,'按环节分工');await textIncludes(panel,'配置模型不代表事实已经核验');
   assert.doesNotMatch(await panel.innerText(),/质量验收|实验组|API|Champion|Challenger|A\/B/);
   await screenshot(page,'v50-platform-'+width);
   const [help]=await Promise.all([page.waitForEvent('popup'),panel.getByRole('link',{name:'了解研究质量',exact:true}).click()]);
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
