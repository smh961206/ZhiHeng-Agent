import assert from 'node:assert/strict';
import {readyRules} from './fixtures/platform-status-ui.mjs';

export function registerPlatformExperienceScenarios({test,makeJob,workbench,choose,textIncludes,count,noOverflow,screenshot}){
 for(const width of [320,768,1440]){
  const older=makeJob(701,'completed',{question:'较早研究（合成）'}),latest=makeJob(702,'failed',{question:'最近一次研究与待处理问题（合成）'});
  latest.delivery={status:'failed',recoverable:true,targetStatus:'completed'};
  test('experience-home-shortcuts-'+width,{jobs:[older,latest],viewport:{width,height:1000}},async({page,requests})=>{
   await page.goto('/');await readyRules(page);const links=page.getByRole('region',{name:'研究快捷入口'});
   await textIncludes(links,latest.input.question);await textIncludes(links,'待保存');
   assert.equal(await links.getByRole('link',{name:/打开最近研究/}).getAttribute('href'),'/research/'+latest.id);
   await noOverflow(page,'home shortcuts '+width);await screenshot(page,'experience-home-'+width,'.home-workspace');
   await links.getByRole('link',{name:/打开最近研究/}).click();await page.waitForURL('**/research/'+latest.id);
   assert.equal(requests('POST','/api/jobs').length,0);assert.equal(requests('POST','/api/jobs/'+latest.id+'/retry').length,0);
  });
  test('experience-guide-search-'+width,{viewport:{width,height:1000}},async({page,requests})=>{
   await page.goto('/handbook?tab=guide');await readyRules(page);
   const search=page.getByRole('searchbox',{name:'搜索使用指南'}),start=page.locator('#usage-start .usage-trigger');
   assert.equal(await start.getAttribute('aria-expanded'),'true');
   await search.fill('保存 失败');await textIncludes(page.locator('.usage-search-status'),'找到');
   const entries=await page.locator('.usage-body dl>div:visible').allTextContents();assert.ok(entries.length>0);
   assert.ok(entries.every(text=>text.includes('保存')&&text.includes('失败')));
   await noOverflow(page,'guide results '+width);await screenshot(page,'experience-guide-search-'+width);
   await search.fill('完全不存在的词条zzzz');await textIncludes(page.locator('.usage-search-status'),'没有找到');await count(page.locator('.usage-topic'),0);
   await page.getByRole('button',{name:'清除搜索，查看全部说明'}).click();assert.equal(await search.inputValue(),'');
   assert.equal(await search.evaluate(el=>el===document.activeElement),true);await count(page.locator('.usage-topic'),6);
   assert.equal(await start.getAttribute('aria-expanded'),'true');
   assert.equal(await page.locator('#usage-materials .usage-trigger').getAttribute('aria-expanded'),'false');
   await search.fill('找不到的词');await page.getByRole('navigation',{name:'按阶段查找说明'}).getByRole('button',{name:'处理中断与失败'}).click();
   assert.equal(await search.inputValue(),'');assert.equal(await page.locator('#usage-recovery .usage-trigger').getAttribute('aria-expanded'),'true');
   await page.waitForFunction(()=>document.activeElement?.id==='usage-recovery');
   assert.equal(await page.locator('#usage-recovery').evaluate(el=>el===document.activeElement),true);
   await noOverflow(page,'guide jump '+width);assert.equal(requests('POST','/api/jobs').length,0);
  });
  test('experience-workbench-disclosure-'+width,{viewport:{width,height:1000}},async({page,requests})=>{
   await workbench(page);await page.locator('#question').fill('研究贵州茅台的现金流');await choose(page,'研究路径','深度研究');
   const steps=page.getByRole('button',{name:'查看研究步骤',exact:true});
   assert.equal(await steps.getAttribute('aria-expanded'),'false');
   await steps.click();assert.ok(await page.locator('.settings-execution-preview ol li:visible').count()>0);
   if(width===320)assert.equal(new Set(await page.locator('.settings-execution-preview ol li').evaluateAll(items=>items.map(el=>Math.round(el.getBoundingClientRect().left)))).size,1,'Mobile research steps must stack for readable lines');
   await screenshot(page,'experience-workbench-'+width,'.workbench-settings');await noOverflow(page,'workbench details '+width);
   await steps.click();await count(page.locator('.settings-execution-preview ol li:visible'),0);
   assert.equal(await page.locator('#question').inputValue(),'研究贵州茅台的现金流');
   const guide=page.getByRole('link',{name:'创建研究指南（新标签页打开）'});assert.equal(await guide.getAttribute('target'),'_blank');
   assert.equal(await guide.getAttribute('href'),'/handbook?tab=guide#usage-start');
   assert.equal(await page.locator('#question').inputValue(),'研究贵州茅台的现金流');assert.equal(requests('POST','/api/jobs').length,0);
   if(width===320)assert.ok(await page.locator('#question').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=16));
  });
  test('experience-history-filter-chips-'+width,{jobs:[older],viewport:{width,height:1000}},async({page,requests})=>{
   await page.goto('/history?status=completed&mode=B&q=较早&sort=oldest&page=3');await readyRules(page);await count(page.locator('.rh-row'),1);
   await page.getByRole('button',{name:'移除状态筛选'}).click();assert.equal(new URL(page.url()).searchParams.get('status'),null);
   assert.equal(await page.getByRole('radiogroup',{name:'按研究状态筛选'}).getByRole('radio').first().evaluate(el=>el===document.activeElement),true);
   assert.equal(new URL(page.url()).searchParams.get('mode'),'B');assert.equal(new URL(page.url()).searchParams.get('sort'),'oldest');
   await page.getByRole('button',{name:'移除路径筛选'}).click();assert.equal(new URL(page.url()).searchParams.get('q'),'较早');
   assert.equal(await page.getByRole('combobox',{name:'按研究路径筛选'}).evaluate(el=>el===document.activeElement),true);
   await noOverflow(page,'filter chips '+width);await screenshot(page,'experience-history-'+width);
   await page.getByRole('button',{name:'移除关键词筛选'}).click();assert.equal(new URL(page.url()).searchParams.get('q'),null);
   assert.equal(await page.getByRole('searchbox',{name:'搜索研究问题、路径或标的'}).evaluate(el=>el===document.activeElement),true);
   assert.equal(new URL(page.url()).searchParams.get('sort'),'oldest');assert.equal(new URL(page.url()).searchParams.get('page'),null);
   assert.equal(requests('POST','/api/jobs').length,0);
  });
 }
 test('experience-home-loading-error',{},async({page,hold})=>{
  const release=hold('GET /api/jobs');await page.goto('/');await textIncludes(page.locator('.home-workspace'),'正在读取研究记录');
  release();await textIncludes(page.locator('.home-workspace'),'查看研究记录');
  await page.route('**/api/jobs',route=>route.fulfill({status:503,json:{error:'合成列表失败'}}));await page.reload();
  await textIncludes(page.locator('.home-workspace'),'研究记录暂未更新');
 });
 test('experience-history-missing-count',{jobs:[]},async({page})=>{
  const job=makeJob(703,'completed');
  await page.route('**/api/jobs',route=>route.fulfill({json:[{id:job.id,status:'completed',plan:job.plan,question:job.input.question,createdAt:job.createdAt}]}));
  await page.goto('/history');await textIncludes(page.locator('.rh-row'),'资料数未记录');assert.doesNotMatch(await page.locator('.rh-row').innerText(),/0 份资料/);
 });
 for(const width of [320,1440])test('experience-unavailable-page-'+width,{viewport:{width,height:1000}},async({page,requests})=>{
  await page.goto('/unknown-experience-page');await page.getByRole('heading',{name:'页面不存在',exact:true}).waitFor();
  await noOverflow(page,'missing page '+width);await screenshot(page,'experience-missing-page-'+width);
  await page.locator('.empty-state').getByRole('button',{name:'研究工作台',exact:true}).click();await page.locator('#question').waitFor();
  await page.route('**/ResearchHandbook*.js*',route=>route.fulfill({contentType:'text/javascript',body:'throw new Error("synthetic-handbook-load-error");'}));
  await page.goto('/handbook');await page.getByRole('heading',{name:'暂时无法打开研究手册',exact:true}).waitFor();
  assert.ok(await page.locator('.empty-state h2').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=20));
  await noOverflow(page,'load error '+width);await screenshot(page,'experience-load-error-'+width);
  assert.equal(requests('POST','/api/jobs').length,0);
 });
}
