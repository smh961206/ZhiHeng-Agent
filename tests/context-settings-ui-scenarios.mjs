import assert from 'node:assert/strict';
export function registerContextSettingsScenarios({test,workbench,choose,textIncludes,count,noOverflow,screenshot,enabled}){
 for(const width of [320,1440])test('context-paths-'+width,{viewport:{width,height:1100}},async({page,requests})=>{
  await workbench(page);await page.locator('#question').fill('研究贵州茅台的长期投资价值');await textIncludes(page.locator('.path-picker'),'语义识别');
  const context=page.locator('.workbench-context');
  for(const [mode,label,input] of [['A','快速筛选','筛选关注点'],['C','财报更新','上次研究结论'],['D','多公司比较','比较重点'],['F','股东回报','股东回报关注点'],['B','深度研究','研究关注点']]){
   await choose(page,'研究路径',label);await context.getByRole('textbox',{name:input,exact:true}).waitFor();
   await count(page.getByLabel('当前持仓',{exact:true}),0);
   if(mode==='F'||mode==='B')assert.equal(await page.getByRole('button',{name:'补充持仓与配置约束',exact:true}).getAttribute('aria-expanded'),'false');
   else await count(page.getByRole('button',{name:'补充持仓与配置约束',exact:true}),0);
   if(mode==='C')await textIncludes(context,'建立基线');
   await noOverflow(page,'context '+mode+' '+width);await screenshot(page,'context-'+mode+'-'+width,'.workbench-context');
  }
  const background=page.getByRole('textbox',{name:'研究关注点',exact:true});await background.fill('保留我原有的研究问题。');
  await page.getByRole('button',{name:'盈利与现金流',exact:true}).click();assert.match(await background.inputValue(),/^保留我原有/);assert.match(await background.inputValue(),/盈利与现金流差异/);
  await enabled(page.getByRole('button',{name:'盈利与现金流',exact:true}),false);
  await page.getByRole('button',{name:'补充持仓与配置约束',exact:true}).click();await page.getByLabel('当前持仓',{exact:true}).fill('合成持仓：贵州茅台');
  await page.getByRole('button',{name:'补充持仓与配置约束',exact:true}).click();await count(page.getByLabel('当前持仓',{exact:true}),0);
  await choose(page,'研究路径','组合分析');await textIncludes(context,'持仓构成');await textIncludes(context,'风险与资金需求');
  assert.equal(await page.getByLabel('当前持仓',{exact:true}).inputValue(),'合成持仓：贵州茅台');await textIncludes(context,'仅能分析已提供的持仓');
  await noOverflow(page,'context E '+width);await screenshot(page,'context-E-'+width,'.workbench-context');
  await choose(page,'研究路径','股东回报');assert.equal(await page.getByRole('button',{name:'补充持仓与配置约束',exact:true}).getAttribute('aria-expanded'),'true');
  assert.equal(await page.getByLabel('当前持仓',{exact:true}).inputValue(),'合成持仓：贵州茅台');
  await page.reload();await page.getByLabel('当前持仓',{exact:true}).waitFor();assert.equal(await page.getByLabel('当前持仓',{exact:true}).inputValue(),'合成持仓：贵州茅台');
  assert.equal(requests('POST','/api/jobs').length,0);
 });
 for(const [mode,label,input] of [['B','深度研究','研究关注点'],['F','股东回报','股东回报关注点']])test('context-submit-'+mode,{},async({page,requests})=>{
  await workbench(page);await page.locator('#question').fill('研究贵州茅台');await choose(page,'研究路径',label);
  const background=page.getByRole('textbox',{name:input,exact:true});await background.fill(mode==='F'?'请核对目标股息率 5% 对应价格。':'请查证资本开支与现金回报的关系。');
  const saved=await background.inputValue();await page.getByRole('button',{name:'补充持仓与配置约束',exact:true}).click();await page.getByLabel('持仓权重',{exact:true}).fill('合成权重 10%');
  await page.getByRole('button',{name:'补充持仓与配置约束',exact:true}).click();await enabled(page.locator('button[type=submit]'));await page.locator('button[type=submit]').click();await page.waitForURL(/\/research\//);
  const body=requests('POST','/api/jobs').at(-1).body;assert.equal(body.mode,mode);assert.equal(body.portfolio,saved);assert.equal(body.portfolioContext.weights,'合成权重 10%');if(mode==='F')assert.equal(body.historyYears,8);
 });
 test('context-execution-auto-expand',{},async({page})=>{
  await workbench(page);await page.locator('#question').fill('研究贵州茅台');await choose(page,'研究路径','深度研究');
  assert.equal(await page.getByRole('button',{name:'补充持仓与配置约束',exact:true}).getAttribute('aria-expanded'),'false');
  await page.locator('#question').fill('研究贵州茅台是否需要减仓');await page.getByLabel('当前持仓',{exact:true}).waitFor();
  await textIncludes(page.locator('.portfolio-optional'),'本次涉及个人执行');
 });
}
