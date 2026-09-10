import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {quickScreenMetrics} from '../server/quick-screen.mjs';


export function registerAgentCapabilityScenarios({test,makeJob,detail,detailActions,downloadReport,textIncludes,count,noOverflow,screenshot}){
 for(const width of [320,1440]){
  const job=makeJob(10400+width,'completed',{mode:'B'}),basis={currency:'CNY'};
  const pair=(name,id,result)=>[{type:'tool',toolName:name,toolCallId:id,arguments:{marker:'SYNTHETIC_DEEP_RETURN_INPUT'}},{type:'tool_result',toolName:name,toolCallId:id,result}];
  job.events=[...pair('calculate_dcf_sensitivity','grid-record',{status:'incomplete',baseToolCallId:'base-cash',growthRates:[.01,.03],discountRates:[.02,.09],cells:[{growth:.01,discount:.02,perShare:null,error:'折现率不大于永续增长率'},{growth:.01,discount:.09,perShare:100},{growth:.03,discount:.02,perShare:null,error:'折现率不大于永续增长率'},{growth:.03,discount:.09,perShare:120}],basis}),...pair('calculate_shareholder_return','ledger-record',{status:'incomplete',ttm:{dps:7,yield:.05},rollingThreeYears:{payout:.7},annual:[{year:2024,dps:null,payout:null,quickFcfCoverage:null},{year:2025,dps:7,payout:.7,quickFcfCoverage:1}],aggregateCheck:{status:'mismatch',cashDifference:10,profitDifference:-10},basis,notice:'合成记录，未确认年份不补零。'}),...pair('calculate_dividend_scenarios','failed-scenario',{error:'合成：基准调用缺失'})];
  test('deep-return-receipts-'+width,{jobs:[job],viewport:{width,height:1100}},async({page})=>{
   await detail(page,job);await page.getByRole('tab',{name:'审计记录',exact:true}).click();const panel=page.getByRole('region',{name:'分红与敏感性核对',exact:true});
   await textIncludes(panel,'基准调用缺失');await panel.getByLabel('选择计算记录').selectOption({label:'2. 复算分红事件与支付率 · ledger-record'});
   await textIncludes(panel,'官方汇总与逐年重算不一致');await textIncludes(panel,'70.00%');await textIncludes(panel,'未确认');await count(panel.locator('tbody tr'),2);
   await noOverflow(page,'deep dividend '+width);await screenshot(page,'deep-return-ledger-'+width,'.research-analysis-receipts');
   await panel.getByLabel('选择计算记录').selectOption({label:'1. 核算增长与折现率网格 · grid-record'});await textIncludes(panel,'不可计算');await textIncludes(panel,'120.00');await textIncludes(panel,'base-cash');
   await noOverflow(page,'deep matrix '+width);await screenshot(page,'deep-return-grid-'+width,'.research-analysis-receipts');
   await panel.getByRole('button',{name:'查看实际输入与返回',exact:true}).click();await textIncludes(page.getByRole('complementary',{name:'研究执行轨迹'}),'复算分红事件与支付率');
   await page.goto('/workbench');await page.locator('#question').fill('A股贵州茅台深度投资研究');const overview=page.locator('.deep-execution-overview');await overview.locator('summary').click();await textIncludes(overview,'逐笔复算股东回报');await noOverflow(page,'deep workbench '+width);
   await overview.getByRole('link').click();await page.getByRole('button',{name:/阅读报告与审计记录/}).click();await textIncludes(page.locator('.research-usage'),'最多5×5格');await noOverflow(page,'deep handbook '+width);
   await page.goto('/');const capabilities=page.getByRole('region',{name:'研究执行能力'});await textIncludes(capabilities,'复算分红与估值情景');await noOverflow(page,'deep home '+width);await screenshot(page,'deep-return-home-'+width,'.agent-capabilities');
  });
 }
 for(const status of ['completed','running']){
  const old=makeJob(status==='completed'?301:302,status,{mode:'B'});old.events=status==='completed'?[]:[{type:'tool',toolName:'calculate_shareholder_return',toolCallId:'pending-ledger',arguments:{events:[]}}];
  test('deep-return-'+status+'-missing-receipt',{jobs:[old],viewport:{width:390,height:900}},async({page})=>{
   await detail(page,old);await page.getByRole('tab',{name:'审计记录',exact:true}).click();const panel=page.getByRole('region',{name:'分红与敏感性核对',exact:true});
   await textIncludes(panel,status==='completed'?'不根据报告文字补造计算结果':'返回尚未保存');await count(panel.locator('table'),0);await noOverflow(page,'missing deep receipts');
  });
 }
 for(const width of [320,1440]){
  const screened=makeJob(7300+width,'completed',{mode:'A'});
  const coverage=quickScreenMetrics({sector:'non-financial',amountUnit:'元',roeBasis:'加权平均，小数',basis:{sourceIds:['S1']},periods:[{start:'2025-01-01',end:'2025-12-31',kind:'annual',sourceIds:['S1'],revenue:100,netIncome:10,ocf:20,capex:12,roe:.1}],balances:[]}).coverage;
  screened.events=[{type:'tool',toolName:'calculate_screen_metrics',toolCallId:'coverage-real',arguments:{marker:'ACTUAL_SCREEN_INPUT'}},{type:'tool_result',toolName:'calculate_screen_metrics',toolCallId:'coverage-real',result:{coverage}}];
  test('screen-capability-coverage-'+width,{jobs:[screened],viewport:{width,height:1000}},async({page})=>{
   await detail(page,screened);const checks=page.getByRole('region',{name:'本次查证记录'});
   await textIncludes(checks,'五年与季度数值');assert.doesNotMatch(await checks.innerText(),/估值模型对照/);
   const numbers=checks.locator('.financial-coverage');await count(checks.locator('details'),0);await textIncludes(numbers,'年度 1/5');await textIncludes(numbers,'季度 0/8');await textIncludes(numbers,'2024 Q1');await textIncludes(numbers,'缺少 收入');
   await noOverflow(page,'screen coverage '+width);await screenshot(page,'screen-coverage-'+width,'.research-execution-checks');
   const [download]=await Promise.all([page.waitForEvent('download'),checks.getByRole('button',{name:'导出已保存记录',exact:true}).click()]);
   const md=await readFile(await download.path(),'utf8');assert.match(md,/年度 1\/5/);assert.match(md,/2024 Q1/);assert.match(md,/ACTUAL_SCREEN_INPUT/);
   await checks.getByRole('button',{name:'查看实际输入与返回',exact:true}).click();const trace=page.getByRole('complementary',{name:'研究执行轨迹'});
   await trace.getByRole('combobox',{name:'事件筛选'}).click();await page.getByRole('option',{name:'异常与提示',exact:true}).click();await count(trace.locator('.rd-event'),1);
   await page.goto('/workbench');await page.locator('#question').fill('A股比亚迪值不值得研究');await textIncludes(page.locator('.composer-intro'),'核对五年与近期季度');await noOverflow(page,'screen workbench '+width);
   await page.goto('/handbook?tab=guide');await page.getByRole('button',{name:/阅读报告与审计记录/}).click();await textIncludes(page.locator('.research-usage'),'候选不代表问题已解决');await noOverflow(page,'screen guide '+width);
  });
 }
 for(const width of [320,1440]){
  const empty=makeJob(8400+width,'completed',{mode:'C'});empty.events=[];
  test('execution-checklist-empty-'+width,{jobs:[empty],viewport:{width,height:900}},async({page})=>{
   await detail(page,empty);const checks=page.getByRole('region',{name:'本次查证记录'});
   const heading=checks.locator('.execution-checks-heading');assert.equal(await heading.getAttribute('aria-expanded'),'true');
   await count(checks.locator('details'),0);await count(checks.locator('.execution-unrecorded-list > li'),6);
   await textIncludes(checks,'可能尚未执行或不适用');await textIncludes(checks,'财报原页');await textIncludes(checks,'尚无数值覆盖返回');
   const body=checks.locator('.execution-checks-body');assert.ok((await body.boundingBox()).height>50,'Checklist retains a usable content area');
   await noOverflow(page,'empty execution checklist '+width);await screenshot(page,'execution-checklist-empty-'+width,'.research-execution-checks');
   await heading.click();await count(checks.locator('.execution-checks-body:visible'),0);await count(checks.locator('.execution-record-download:visible'),0);await count(checks.locator('.execution-checks-trace:visible'),0);
  });
 }
 for(const width of [320,1440]){
  const failed=makeJob(6200+width,'failed',{mode:'B'});delete failed.result;
  failed.events=[{type:'tool',toolName:'read_official_disclosures',toolCallId:'official-partial',arguments:{topic:'sales',security:'CN:002594'}},{type:'tool_result',toolName:'read_official_disclosures',toolCallId:'official-partial',result:{status:'partial',failures:[{error:'合成公告读取失败'}],sourceIds:['S1']}},{type:'tool',toolName:'calculate_reinvestment',toolCallId:'rd-pending',arguments:{marker:'SAVED_RD_INPUT'}}];
  test('byd-capability-failed-record-'+width,{jobs:[failed],viewport:{width,height:1000}},async({page,requests})=>{
   await detail(page,failed);const checks=page.getByRole('region',{name:'本次查证记录'});
   await textIncludes(checks,'2 / 8 项有调用');await textIncludes(checks,'待回查');await textIncludes(checks,'返回未齐');
   await count(checks.locator('details'),0);await count(checks.locator('.execution-check-content:visible'),2);
   await textIncludes(checks.locator('.execution-recorded-list > li').first(),'专项官方公告');
   await count(checks.locator('.execution-unrecorded-list > li'),6);
   await textIncludes(checks,'有待回查记录');await textIncludes(checks,'1 次返回未齐');
   const body=checks.locator('.execution-checks-body');
   const scrollbar=await body.evaluate(node=>{const css=getComputedStyle(node);return {color:css.scrollbarColor,width:css.scrollbarWidth};});
   const traceScrollbar=await page.locator('.rd-events').evaluate(node=>{const css=getComputedStyle(node);return {color:css.scrollbarColor,width:css.scrollbarWidth};});
   assert.deepEqual(scrollbar,traceScrollbar,'Checklist uses the same native scrollbar as the execution trace');assert.equal(scrollbar.color,'auto');
   const downloadBefore=await checks.locator('.execution-record-download').boundingBox();
   await body.evaluate(node=>{node.scrollTop=node.scrollHeight;});
   const downloadAfter=await checks.locator('.execution-record-download').boundingBox();
   assert.equal(downloadAfter.y,downloadBefore.y,'Internal scroll must not move the export action');
   assert.ok((await body.boundingBox()).height<=Math.min(440,1000*.44)+1,'Checklist must have a bounded height');
   await body.evaluate(node=>{node.scrollTop=0;});
   assert.equal(await checks.getByText('已核实',{exact:true}).count(),0);
   await noOverflow(page,'BYD capability checks '+width);await screenshot(page,'byd-execution-checks-'+width,'.research-execution-checks');
   const [download]=await Promise.all([page.waitForEvent('download'),checks.getByRole('button',{name:'导出已保存记录',exact:true}).click()]);
   assert.match(download.suggestedFilename(),/execution\.md$/);const md=await readFile(await download.path(),'utf8');assert.match(md,/SAVED_RD_INPUT/);assert.match(md,/合成公告读取失败/);assert.match(md,/不是正式研究报告/);assert.doesNotMatch(md,/合成研究报告/);
   await checks.getByRole('button',{name:'查看实际输入与返回',exact:true}).click();
   const trace=page.getByRole('complementary',{name:'研究执行轨迹'});await trace.getByRole('combobox',{name:'事件筛选'}).click();await page.getByRole('option',{name:'异常与提示',exact:true}).click();await count(trace.locator('.rd-event'),1);await trace.getByRole('button',{name:'查看调用详情',exact:true}).click();await textIncludes(trace,'合成公告读取失败');
   assert.equal(requests('POST','/api/jobs').length,0);
  });
  test('byd-capability-workbench-guide-'+width,{viewport:{width,height:1000}},async({page,requests})=>{
   await page.goto('/workbench');await page.locator('#question').fill('比亚迪A股深度投资研究');
   await count(page.locator('.workbench-delivery-note'),0);await noOverflow(page,'BYD workbench '+width);await screenshot(page,'byd-workbench-'+width);
   await page.goto('/handbook?tab=guide');
   await page.getByRole('button',{name:/查看研究进度/}).click();await textIncludes(page.locator('.research-usage'),'每项研究最多6次');
   await page.getByRole('button',{name:/阅读报告与审计记录/}).click();await textIncludes(page.locator('.research-usage'),'不取平均掩盖冲突');await noOverflow(page,'BYD guide '+width);assert.equal(requests('POST','/api/jobs').length,0);
  });
 }
 const streaming=makeJob(5922,'running',{mode:'A'});
 streaming.events=[{type:'tool',toolName:'search_evidence',toolCallId:'live-call',arguments:{query:'动态取证输入'}}];
 test('agent-capabilities-live-trace',{jobs:[streaming]},async({page})=>{
  await page.addInitScript(()=>{window.EventSource=class extends EventTarget{constructor(){super();window.emitTrace=e=>this.dispatchEvent(new MessageEvent('trace',{data:JSON.stringify(e)}));}close(){}};});
  await detail(page,streaming);
  const trace=page.getByRole('complementary',{name:'研究执行轨迹'});
  await textIncludes(trace,'等待返回');await count(trace.locator('.rd-event'),1);
  await trace.getByRole('button',{name:'查看调用详情',exact:true}).click();await textIncludes(trace,'动态取证输入');
  await page.evaluate(()=>window.emitTrace({type:'tool_result',toolName:'search_evidence',toolCallId:'live-call',result:{note:'动态取证返回'}}));
  await textIncludes(trace,'动态取证返回');await count(trace.locator('.rd-event'),1);
  await textIncludes(trace,'动态取证输入');await textIncludes(trace.locator('.rd-call-status'),'已返回');
 });
 const paged=makeJob(5923,'completed',{mode:'A'});
 delete paged.plan.researchApproach;delete paged.agentPlan;
 paged.events=Array.from({length:45},(_,index)=>({type:'progress',message:'阶段记录 '+index}));
 for(const width of [320,1440])test('agent-capabilities-trace-pagination-'+width,{jobs:[paged],viewport:{width,height:1000}},async({page})=>{
  await detail(page,paged);const trace=page.getByRole('complementary',{name:'研究执行轨迹'});
  await count(trace.locator('.rd-event'),20);await textIncludes(trace.locator('.rd-event').first(),'阶段记录 44');
  await trace.getByRole('button',{name:'显示更多执行记录',exact:true}).click();await count(trace.locator('.rd-event'),40);
  await trace.getByRole('button',{name:'显示更多执行记录',exact:true}).click();await count(trace.locator('.rd-event'),45);
  await trace.getByRole('button',{name:'查看详细执行记录',exact:true}).click();
  assert.equal(await trace.getByRole('button',{name:'查看公开研究计划',exact:true}).count(),0);
  const scrolling=await trace.evaluate(element=>{
   const events=element.querySelector('.rd-events'),body=element.querySelector('.rd-trace-body'),rail=element.closest('.rd-right-rail');
   return {events:getComputedStyle(events).overflowY,body:getComputedStyle(body).overflowY,rail:getComputedStyle(rail).overflowY,scrolls:events.scrollHeight>events.clientHeight};
  });
  assert.equal(scrolling.events,'auto');assert.equal(scrolling.body,'visible');assert.equal(scrolling.rail,'visible');assert.ok(scrolling.scrolls);
  await trace.locator('.rd-events').evaluate(element=>{element.scrollTop=element.scrollHeight;});
  await trace.getByRole('textbox',{name:'搜索执行记录'}).fill('阶段记录 0');await count(trace.locator('.rd-event'),1);
  await textIncludes(trace,'阶段记录 0');assert.equal(await trace.locator('.rd-events').evaluate(element=>element.scrollTop),0);
  await trace.getByRole('button',{name:'清除执行记录搜索'}).click();await count(trace.locator('.rd-event'),20);
  assert.equal(await trace.getByRole('textbox',{name:'搜索执行记录'}).evaluate(element=>element===document.activeElement),true);
  await noOverflow(page,'trace pagination search');await screenshot(page,'trace-list-'+width,'.rd-trace');
 });
 const live=makeJob(5921,'running',{mode:'A'});
 test('agent-capabilities-live-plan',{jobs:[live]},async({page})=>{
  await page.addInitScript(()=>{window.EventSource=class extends EventTarget{constructor(){super();window.emitPlan=e=>this.dispatchEvent(new MessageEvent('trace',{data:JSON.stringify(e)}));}close(){}};});
  await detail(page,live);await page.getByRole('button',{name:'查看详细执行记录',exact:true}).click();
  await page.evaluate(()=>window.emitPlan({type:'tool_result',toolName:'update_research_plan',toolCallId:'plan-live',result:{revision:1,objective:'本次定向核对',hypotheses:['竞争性解释'],steps:[{id:'read',question:'核对选定原页',status:'in_progress',note:'准备原文',evidenceIds:[],toolCallIds:[]}],notice:'公开计划'}}));
  const trace=page.getByRole('complementary',{name:'研究执行轨迹'});
  await textIncludes(trace,'更新公开执行计划');
  assert.equal(await trace.getByRole('button',{name:'查看公开研究计划',exact:true}).count(),0);
  const update=trace.locator('.rd-event').filter({hasText:'更新公开执行计划'});
  await update.getByRole('button',{name:'查看调用详情',exact:true}).click();
  await textIncludes(update,'核对选定原页');await textIncludes(update,'准备原文');
 });
 for(const width of [320,1440]){
  test('agent-capabilities-pages-'+width,{viewport:{width,height:1000}},async({page,requests})=>{
   await page.goto('/');await textIncludes(page.getByRole('region',{name:'研究执行能力'}),'回到指定原页');
   assert.equal(await page.getByRole('link',{name:'阅读研究实例',exact:true}).count(),0);
   await noOverflow(page,'capabilities home '+width);await screenshot(page,'agent-home-'+width);
   await page.getByRole('region',{name:'研究执行能力'}).scrollIntoViewIfNeeded();await screenshot(page,'agent-capabilities-'+width,'.agent-capabilities');
   await page.getByRole('region',{name:'研究执行能力'}).getByRole('link',{name:'查看取证与复核说明',exact:true}).click();
   await page.locator('.research-usage').waitFor();
   assert.equal(await page.getByRole('tab',{name:'研究实例',exact:true}).count(),0);
   await noOverflow(page,'capabilities handbook '+width);
   assert.equal(requests('POST','/api/jobs').length,0);
  });
  const job=makeJob(5300+width,'completed',{mode:'A',question:'合成案例：研究记录与导出'});
  job.agentPlan={revision:2,objective:'核对本期资金流变化',hypotheses:['主营收现变化','财务往来变化'],steps:[{id:'cash',question:'解释现金流的同比变化',status:'blocked',evidenceIds:[],toolCallIds:[],note:'原始来源仍有缺口'}],notice:'公开计划，完成不等于事实核实'};
  job.events=[
   {type:'tool',toolName:'calculate_cashflow_bridge',toolCallId:'bridge-1',arguments:{marker:'UNIQUE_BRIDGE_INPUT'},time:'2026-09-08T00:00:00Z'},
   {type:'tool_result',toolName:'calculate_cashflow_bridge',toolCallId:'bridge-1',result:{error:'合成来源缺失'},time:'2026-09-08T00:00:01Z'},
   {type:'tool',toolName:'calculate_cashflow_bridge',toolCallId:'bridge-2',arguments:{marker:'RETRY_INPUT'}},
   {type:'tool_result',toolName:'calculate_cashflow_bridge',toolCallId:'bridge-2',result:{status:'calculated-needs-review'}},
   {type:'tool',toolName:'read_rules',toolCallId:'missing-return',arguments:{query:'未完成读取'}}
  ];
  test('agent-capabilities-record-export-'+width,{jobs:[job],viewport:{width,height:1000}},async({page})=>{
   await detail(page,job);await page.getByRole('button',{name:'研究过程',exact:true}).click();
   const process=page.getByRole('dialog',{name:'研究过程',exact:true});
   assert.equal(await process.getByRole('button',{name:'查看公开研究计划',exact:true}).count(),0);
   assert.equal(await process.getByRole('button',{name:'查看执行轨迹',exact:true}).count(),0);
   await page.keyboard.press('Escape');await process.waitFor({state:'hidden'});
   const record=page.getByRole('complementary',{name:'研究执行轨迹'});
   assert.equal(await record.getByRole('button',{name:'查看公开研究计划',exact:true}).count(),0);
   await count(record.locator('.rd-event'),3);assert.doesNotMatch(await record.innerText(),/bridge-1|missing-return/);
   assert.equal(await record.getByRole('textbox',{name:'搜索执行记录'}).count(),0);
   await record.getByRole('button',{name:'查看详细执行记录',exact:true}).click();
   assert.equal(await record.getByRole('button',{name:'查看公开研究计划',exact:true}).count(),0);
   await record.getByRole('combobox',{name:'事件筛选'}).click();await page.getByRole('option',{name:'异常与提示',exact:true}).click();
   await count(record.locator('.rd-event'),1);
   await record.getByRole('button',{name:'查看调用详情',exact:true}).click();
   await textIncludes(record,'UNIQUE_BRIDGE_INPUT');await textIncludes(record,'合成来源缺失');await textIncludes(record,'bridge-1');
   await noOverflow(page,'record failed '+width);await screenshot(page,'case-record-'+width,'.rd-trace');
   await record.getByRole('combobox',{name:'事件筛选'}).click();await page.getByRole('option',{name:'未保存返回',exact:true}).click();
   await textIncludes(record,'补读研究规则');await count(record.locator('.rd-event'),1);await record.getByRole('button',{name:'查看调用详情',exact:true}).click();await textIncludes(record,'missing-return');
   await record.getByRole('textbox',{name:'搜索执行记录'}).fill('nothing-matches');await textIncludes(record,'没有符合筛选条件的事件');
   let actions=await detailActions(page);
   const [full]=await Promise.all([page.waitForEvent('download'),downloadReport(page,actions)]);
   const fullContent=await readFile(await full.path(),'utf8');assert.match(fullContent,/UNIQUE_BRIDGE_INPUT/);assert.match(fullContent,/原始来源仍有缺口/);
   if(width<1024){await page.getByRole('dialog',{name:'研究操作',exact:true}).waitFor({state:'hidden'});actions=await detailActions(page);}
   const [short]=await Promise.all([page.waitForEvent('download'),downloadReport(page,actions,'报告、审计与来源')]);
   const content=await readFile(await short.path(),'utf8');
   assert.doesNotMatch(content,/UNIQUE_BRIDGE_INPUT/);assert.match(content,/合成研究报告/);
   if(width<1024){await page.getByRole('dialog',{name:'研究操作',exact:true}).waitFor({state:'hidden'});await detailActions(page);}
   await noOverflow(page,'export choice '+width);await screenshot(page,'case-export-'+width);
  });
 }
}
