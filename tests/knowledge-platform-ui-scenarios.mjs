import assert from 'node:assert/strict';
import {frameworkVersion} from '../shared/research-framework.mjs';
import {depthGuidance} from '../shared/research-knowledge.mjs';

export function registerKnowledgePlatformScenarios({test,makeJob,detail,workbench,manualInput,textIncludes,noOverflow,screenshot}){
 const ref={id:'a'.repeat(64),version:frameworkVersion},current={id:'b'.repeat(64),version:frameworkVersion};
 const configOverrides={knowledgeSnapshot:current,knowledgeStatus:{updatePending:false}};
 for(const width of [320,1440]){
  test('knowledge-v47-home-handbook-'+width,{viewport:{width,height:1000},configOverrides},async({page,requests})=>{
   await page.goto('/');await textIncludes(page.getByRole('region',{name:'研究规则状态'}),'当前可用规则');
   assert.equal(await page.locator('.knowledge-highlights article').count(),3);await noOverflow(page,'knowledge home');await screenshot(page,'knowledge-home-'+width);
   await page.goto('/handbook?tab=method#method-loading');await textIncludes(page.locator('#method-loading'),depthGuidance.Standard);
   assert.equal(await page.locator('#method-loading').evaluate(node=>document.activeElement===node),true);
   await noOverflow(page,'knowledge handbook');await screenshot(page,'knowledge-handbook-'+width);
   assert.equal(requests('POST','/api/jobs').length,0);
  });
  test('knowledge-v47-workbench-status-depth-'+width,{viewport:{width,height:1000},configOverrides:{...configOverrides,knowledgeStatus:{updatePending:true}}},async({page})=>{
   await workbench(page);await manualInput(page);
   await textIncludes(page.getByRole('region',{name:'研究规则状态'}),'继续使用已校验规则');
   await page.getByRole('combobox',{name:'研究路径',exact:true}).click();await page.getByRole('option',{name:'深度研究',exact:true}).click();
   await page.getByRole('combobox',{name:'报告深度',exact:true}).click();await page.getByRole('option',{name:'简明研究',exact:true}).click();
   await textIncludes(page.locator('.knowledge-depth'),depthGuidance.Quick);const question=await page.locator('#question').inputValue();
   let status=503,version=frameworkVersion;
   await page.route('**/api/config',route=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(status===200?{configured:true,knowledgeVersion:version,...configOverrides}:{error:'合成连接失败'})}));
   await page.getByRole('button',{name:'重新检查',exact:true}).click();await textIncludes(page.getByRole('region',{name:'研究规则状态'}),'暂未确认服务状态');
   assert.equal(await page.locator('button[type=submit]').isDisabled(),true);assert.equal(await page.locator('#question').inputValue(),question);
   status=200;version='0.0';await page.getByRole('button',{name:'重新检查',exact:true}).click();await textIncludes(page.getByRole('region',{name:'研究规则状态'}),'页面与服务版本不一致');
   version=frameworkVersion;await page.getByRole('button',{name:'重新检查',exact:true}).click();await textIncludes(page.getByRole('region',{name:'研究规则状态'}),'当前可用规则');
   assert.equal(await page.locator('button[type=submit]').isDisabled(),false);await noOverflow(page,'knowledge workbench');await screenshot(page,'knowledge-workbench-'+width);
  });
  const job=makeJob(4700+width,'completed',{mode:'B',question:'规则依据与原文核对（合成）'});
  const records=[{key:'c'.repeat(64),snapshotId:ref.id,kind:'context',moduleId:'07-valuation',heading:'7.3 DCF 计算协议',path:'knowledge/modules/rules/07-valuation.md',line:1,endLine:3,reason:'规则补读：DCF',sha256:'d'.repeat(64),contentSha256:'e'.repeat(64)},
   {key:'f'.repeat(64),snapshotId:ref.id,kind:'context',moduleId:'16-audit',heading:'正式输出前审计',path:'knowledge/modules/rules/16-audit.md',line:1,endLine:5,reason:'正式输出前审计',sha256:'1'.repeat(64),contentSha256:'2'.repeat(64)}];
  job.plan.knowledgeSnapshot=ref;job.knowledgeUsage={snapshotId:ref.id,records};job.result.framework={version:frameworkVersion,snapshot:ref,usage:job.knowledgeUsage};
  test('knowledge-v47-detail-excerpt-'+width,{jobs:[job],viewport:{width,height:1000},configOverrides},async({page})=>{
   let attempts=0;
   await page.route('**/api/jobs/*/rules?*',route=>{attempts++;return route.fulfill({status:attempts===1?409:200,contentType:'application/json',body:JSON.stringify(attempts===1?{error:'原规则快照暂不可读取，已保留读取记录'}:{content:'当时读取的规则正文。\n仅用于界面测试。'})});});
   await detail(page,job);await page.getByRole('button',{name:'研究过程',exact:true}).click();
   const panel=page.getByRole('dialog',{name:'研究过程'}).locator('.knowledge-usage');
   await panel.locator('.knowledge-usage-trigger').click();await textIncludes(panel,'2 项规则 · 2 条使用记录');await textIncludes(panel,'当前已有更新');
   await panel.getByRole('button',{name:'按需补读',exact:true}).click();assert.equal(await panel.locator('.knowledge-read-list>li').count(),1);
   await panel.getByRole('button',{name:'查看当时读取的原文'}).click();await textIncludes(panel,'原规则快照暂不可读取');
   await panel.getByRole('button',{name:'重试读取原文'}).click();await textIncludes(panel,'当时读取的规则正文');
   const toggle=panel.getByRole('button',{name:'收起原文',exact:true});
   assert.equal(await toggle.evaluate(node=>node===document.activeElement),true);
   await toggle.click();assert.equal(await panel.locator('.knowledge-excerpt pre:visible').count(),0);
   await panel.getByRole('button',{name:'查看当时读取的原文'}).click();await textIncludes(panel,'当时读取的规则正文');assert.equal(attempts,2);
   await noOverflow(page,'knowledge excerpt');await screenshot(page,'knowledge-detail-'+width);
   await panel.getByRole('button',{name:'审计',exact:true}).click();await textIncludes(panel,'正式输出前审计');
   assert.equal(attempts,2);
  });
 }
 const legacy=makeJob(4799,'completed');legacy.plan.version='4.3';
 const running=makeJob(4798,'running');running.plan.knowledgeSnapshot=ref;running.knowledgeUsage={snapshotId:ref.id,records:[]};
 test('knowledge-v47-live-receipts',{jobs:[running],configOverrides},async({page})=>{
  await page.addInitScript(()=>{
   window.EventSource=class extends EventTarget{
    constructor(){super();window.emitRule=value=>this.dispatchEvent(new MessageEvent('trace',{data:JSON.stringify(value)}));}
    close(){}
   };
  });
  await detail(page,running);await page.getByRole('button',{name:'研究过程',exact:true}).click();
  const panel=page.locator('.knowledge-usage');await panel.locator('.knowledge-usage-trigger').click();await textIncludes(panel,'0 项规则');
  const event={type:'knowledge_read',message:'已加载规则',ruleRead:{key:'c'.repeat(64),kind:'context',snapshotId:ref.id,moduleId:'07-valuation',path:'knowledge/modules/rules/07-valuation.md',heading:'DCF 实时记录',line:1,endLine:3,reason:'规则补读：DCF'}};
  await page.evaluate(event=>window.emitRule(event),{...event,ruleRead:{...event.ruleRead,snapshotId:current.id}});await textIncludes(panel,'0 项规则');
  await page.evaluate(event=>{window.emitRule(event);window.emitRule(event);},event);await textIncludes(panel,'1 项规则 · 1 条使用记录');
 });
 test('knowledge-v47-legacy-report',{jobs:[legacy],configOverrides},async({page})=>{
  await detail(page,legacy);await page.getByRole('button',{name:'研究过程',exact:true}).click();const panel=page.locator('.knowledge-usage');
  await panel.locator('.knowledge-usage-trigger').click();await textIncludes(panel,'V4.3');await textIncludes(panel,'未保存实际读取明细');
  assert.equal(await panel.getByRole('button',{name:'查看当时读取的原文'}).count(),0);
 });

 for(const width of [320,1440]){
  const many=makeJob(4900+width,'completed');many.plan.knowledgeSnapshot=ref;
  many.knowledgeUsage={snapshotId:ref.id,records:Array.from({length:45},(_,index)=>({key:'rule-'+index,snapshotId:ref.id,kind:'context',moduleId:'07-valuation',heading:index===44?'DCF 最终核对':'估值规则 '+index,path:'knowledge/modules/rules/07-valuation.md',line:1,endLine:3,reason:index%2?'正式输出前审计':'规则补读：估值'}))};
  test('knowledge-v47-record-search-'+width,{jobs:[many],viewport:{width,height:1000},configOverrides},async({page})=>{
   await detail(page,many);await page.getByRole('button',{name:'研究过程',exact:true}).click();const panel=page.locator('.knowledge-usage');await panel.locator('.knowledge-usage-trigger').click();
   assert.equal(await panel.locator('.knowledge-read-list>li').count(),20);
   await panel.getByRole('button',{name:/显示更多记录/}).click();assert.equal(await panel.locator('.knowledge-read-list>li').count(),40);
   await panel.getByRole('button',{name:/显示更多记录/}).click();assert.equal(await panel.locator('.knowledge-read-list>li').count(),45);
   const search=panel.getByRole('textbox',{name:'搜索规则记录'});await search.fill('dcf 最终');await textIncludes(panel,'显示 1 / 1 条记录');await textIncludes(panel,'DCF 最终核对');
   await panel.getByRole('button',{name:'审计',exact:true}).click();await textIncludes(panel,'没有匹配的记录');
   await panel.getByRole('button',{name:'清除搜索'}).click();assert.equal(await search.evaluate(node=>node===document.activeElement),true);await textIncludes(panel,'显示 20 / 22 条记录');
   await noOverflow(page,'rule search '+width);await screenshot(page,'knowledge-search-'+width);
  });
 }
 test('knowledge-v47-config-recovery',{configOverrides},async({page,requests})=>{
  await workbench(page);await manualInput(page);const question=await page.locator('#question').inputValue(),status=page.getByRole('region',{name:'研究规则状态'});
  let response={configured:false,knowledgeVersion:frameworkVersion};
  await page.route('**/api/config',route=>route.fulfill({contentType:'application/json',body:JSON.stringify(response)}));
  const refresh=()=>page.getByRole('button',{name:'重新检查',exact:true}).click();
  await refresh();await textIncludes(status,'研究服务尚未就绪');assert.equal(await page.locator('button[type=submit]').isDisabled(),true);
  response={};await refresh();await textIncludes(status,'暂未确认服务状态');assert.equal(await page.locator('button[type=submit]').isDisabled(),true);
  let held;await page.route('**/api/config',route=>{held=route;});
  await page.evaluate(()=>{const original=window.setTimeout;window.setTimeout=(callback,delay,...args)=>{if(delay===10000){window.expireConfig=()=>callback(...args);return original(()=>{},60000);}return original(callback,delay,...args);};});
  await Promise.all([page.waitForRequest(request=>request.url().endsWith('/api/config')),refresh()]);
  await page.evaluate(()=>window.expireConfig());await textIncludes(status,'暂未确认服务状态');assert.equal(await page.getByRole('button',{name:'重新检查',exact:true}).isEnabled(),true);
  await held.fulfill({contentType:'application/json',body:JSON.stringify({configured:true,knowledgeVersion:'0.0'})}).catch(()=>{});
  await page.unroute('**/api/config');await refresh();await textIncludes(status,'当前可用规则');assert.equal(await page.locator('#question').inputValue(),question);
  assert.equal(requests('POST','/api/jobs').length,0);
 });
 test('knowledge-v47-lazy-pages',{configOverrides},async({page})=>{
  const modules=[];page.on('request',request=>modules.push(new URL(request.url()).pathname));
  await page.goto('/');await textIncludes(page.getByRole('region',{name:'研究规则状态'}),'当前可用规则');
  assert.equal(modules.some(path=>/\/Research(Detail|Handbook)(?:-[\w-]+)?\.jsx?$/.test(path)),false);
  await page.getByRole('link',{name:'研究手册',exact:true}).click();await page.locator('.research-handbook').waitFor();
  assert.ok(modules.some(path=>/\/ResearchHandbook(?:-[\w-]+)?\.jsx?$/.test(path)));assert.equal(modules.some(path=>/\/ResearchDetail(?:-[\w-]+)?\.jsx?$/.test(path)),false);
 });

 test('knowledge-v47-lazy-page-recovery',{configOverrides},async({page})=>{
  await page.route('**/ResearchHandbook*.js*',route=>route.fulfill({contentType:'text/javascript',body:"throw new Error('合成页面资源失败');"}));
  await page.goto('/handbook');await textIncludes(page.getByRole('alert'),'暂时无法打开研究手册');
  assert.equal(await page.getByRole('link',{name:'返回首页',exact:true}).getAttribute('href'),'/');
  await page.unroute('**/ResearchHandbook*.js*');await page.getByRole('button',{name:'刷新重试',exact:true}).click();
  await page.locator('.research-handbook').waitFor();await textIncludes(page.getByRole('region',{name:'研究规则状态'}),'当前可用规则');
 });
 const slow=makeJob(4990,'completed');slow.plan.knowledgeSnapshot=ref;slow.knowledgeUsage={snapshotId:ref.id,records:[{key:'slow',kind:'context',snapshotId:ref.id,moduleId:'07-valuation',heading:'超时核对规则',path:'knowledge/modules/rules/07-valuation.md',line:1,endLine:3,reason:'规则补读：估值'}]};
 test('knowledge-v47-excerpt-timeout',{jobs:[slow],configOverrides},async({page})=>{
  await detail(page,slow);await page.getByRole('button',{name:'研究过程',exact:true}).click();const panel=page.locator('.knowledge-usage');await panel.locator('.knowledge-usage-trigger').click();
  let held;await page.route('**/api/jobs/*/rules?*',route=>{held=route;});
  await page.evaluate(()=>{const original=window.setTimeout;window.setTimeout=(callback,delay,...args)=>{if(delay===10000){window.expireExcerpt=()=>callback(...args);return original(()=>{},60000);}return original(callback,delay,...args);};});
  await Promise.all([page.waitForRequest(request=>request.url().includes('/rules?')),panel.getByRole('button',{name:'查看当时读取的原文'}).click()]);
  await page.evaluate(()=>window.expireExcerpt());await textIncludes(panel,'原文读取超时');
  await held.fulfill({json:{content:'不应展示的过期正文'}}).catch(()=>{});
  await page.route('**/api/jobs/*/rules?*',route=>route.fulfill({json:{content:'重试读取的固定快照正文'}}));
  await panel.getByRole('button',{name:'重试读取原文'}).click();await textIncludes(panel,'重试读取的固定快照正文');
  assert.doesNotMatch(await panel.innerText(),/不应展示的过期正文/);
 });
}
