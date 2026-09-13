import {readyRules,refreshRules,platformStatus} from './fixtures/platform-status-ui.mjs';
import assert from 'node:assert/strict';
import {depthGuidance} from '../shared/research-knowledge.mjs';

export function registerKnowledgePlatformScenarios({test,makeJob,detail,workbench,manualInput,textIncludes,noOverflow,screenshot}){
 const knowledgeVersion='K1.0.0',ref={id:'a'.repeat(64),version:knowledgeVersion},current={id:'b'.repeat(64),version:knowledgeVersion};
 const configOverrides={knowledgeSnapshot:current,knowledgeStatus:{snapshot:current,updatePending:false}};
 for(const width of [320,1440]){
  test('knowledge-k1-home-handbook-'+width,{viewport:{width,height:1000},configOverrides},async({page,requests})=>{
   await page.goto('/');await readyRules(page);
   assert.equal(await page.locator('.knowledge-highlights article').count(),3);await noOverflow(page,'knowledge home');await screenshot(page,'knowledge-home-'+width);
   await page.goto('/handbook?tab=method#method-loading');await textIncludes(page.locator('#method-loading'),depthGuidance.Standard);
   assert.equal(await page.locator('#method-loading').evaluate(node=>document.activeElement===node),true);
   await page.locator('.method-version-note summary').click();
   await textIncludes(page.locator('.method-version-note'),'Knowledge 版本记录研究规则的更新');
   await textIncludes(page.locator('#method-loading'),'重试保存只处理暂存结果，不重新研究');
   await noOverflow(page,'knowledge handbook');await screenshot(page,'knowledge-handbook-'+width);
   assert.equal(requests('POST','/api/jobs').length,0);
  });
  test('knowledge-k1-workbench-status-depth-'+width,{viewport:{width,height:1000},configOverrides:{...configOverrides,knowledgeStatus:{snapshot:current,updatePending:true}}},async({page})=>{
   await workbench(page);await manualInput(page);
   let panel=await platformStatus(page);await textIncludes(panel,'继续使用已校验规则');await page.keyboard.press('Escape');await panel.waitFor({state:'hidden'});
   await page.getByRole('combobox',{name:'研究路径',exact:true}).click();await page.getByRole('option',{name:'深度研究',exact:true}).click();
   await page.getByRole('combobox',{name:'报告深度',exact:true}).click();await page.getByRole('option',{name:'简明研究',exact:true}).click();
   await textIncludes(page.locator('.knowledge-depth'),depthGuidance.Quick);const question=await page.locator('#question').inputValue();
   let status=503,version=knowledgeVersion;
   await page.route('**/api/config',route=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(status===200?{configured:true,knowledgeVersion:version,...configOverrides}:{error:'合成连接失败'})}));
   await refreshRules(page);panel=await platformStatus(page);await textIncludes(panel,'暂未确认服务状态');await page.keyboard.press('Escape');await panel.waitFor({state:'hidden'});
   assert.equal(await page.locator('button[type=submit]').isDisabled(),true);assert.equal(await page.locator('#question').inputValue(),question);
   status=200;version='K0.0.0';await refreshRules(page);panel=await platformStatus(page);await textIncludes(panel,'Knowledge 版本状态不一致');await page.keyboard.press('Escape');await panel.waitFor({state:'hidden'});
   version=knowledgeVersion;await refreshRules(page);await readyRules(page);await page.keyboard.press('Escape');
   assert.equal(await page.locator('button[type=submit]').isDisabled(),false);await noOverflow(page,'knowledge workbench');await screenshot(page,'knowledge-workbench-'+width);
  });
  const job=makeJob(4700+width,'completed',{mode:'B',question:'规则依据与原文核对（合成）'});
  const records=[{key:'c'.repeat(64),snapshotId:ref.id,kind:'context',moduleId:'07-valuation',heading:'7.3 DCF 计算协议',path:'knowledge/modules/rules/07-valuation.md',line:1,endLine:3,reason:'规则补读：DCF',sha256:'d'.repeat(64),contentSha256:'e'.repeat(64)},
   {key:'f'.repeat(64),snapshotId:ref.id,kind:'context',moduleId:'16-audit',heading:'正式输出前审计',path:'knowledge/modules/rules/16-audit.md',line:1,endLine:5,reason:'正式输出前审计',sha256:'1'.repeat(64),contentSha256:'2'.repeat(64)}];
  job.plan.knowledgeVersion=knowledgeVersion;job.plan.knowledgeSnapshot=ref;job.knowledgeUsage={snapshotId:ref.id,records};job.result.framework={knowledgeVersion,snapshot:ref,usage:job.knowledgeUsage};
  test('knowledge-k1-detail-excerpt-'+width,{jobs:[job],viewport:{width,height:1000},configOverrides},async({page})=>{
   let attempts=0;
   await page.route('**/api/jobs/*/rules?*',route=>{attempts++;return route.fulfill({status:attempts===1?409:200,contentType:'application/json',body:JSON.stringify(attempts===1?{error:'原规则快照暂不可读取，已保留读取记录'}:{content:'当时读取的规则正文。\n仅用于界面测试。'})});});
   await detail(page,job);await page.getByRole('button',{name:'研究过程',exact:true}).click();
   const panel=page.getByRole('dialog',{name:'研究过程'}).locator('.knowledge-usage');
   await panel.locator('.knowledge-usage-trigger').click();await textIncludes(panel,'2 类依据 · 2 条引用记录');await textIncludes(panel,'当前已有更新');
   await textIncludes(panel.getByLabel('本次规则版本'),knowledgeVersion);
   await textIncludes(panel.getByLabel('本次规则版本'),'已固定本次依据');
   const filters=panel.getByRole('radiogroup',{name:'依据记录筛选',exact:true});assert.equal(await filters.getAttribute('data-slot'),'toggle-group');assert.equal(await filters.locator('[data-slot=toggle-group-item]').count(),3);
   await panel.getByRole('radio',{name:'研究补充',exact:true}).click();assert.equal(await panel.locator('.knowledge-read-list>li').count(),1);
   await panel.getByRole('button',{name:'查看当时读取的原文'}).click();await textIncludes(panel,'原规则快照暂不可读取');
   await panel.getByRole('button',{name:'重试读取原文'}).click();await textIncludes(panel,'当时读取的规则正文');
   const toggle=panel.getByRole('button',{name:'收起原文',exact:true});
   assert.equal(await toggle.evaluate(node=>node===document.activeElement),true);
   await toggle.click();assert.equal(await panel.locator('.knowledge-excerpt pre:visible').count(),0);
   await panel.getByRole('button',{name:'查看当时读取的原文'}).click();await textIncludes(panel,'当时读取的规则正文');assert.equal(attempts,2);
   await noOverflow(page,'knowledge excerpt');await screenshot(page,'knowledge-detail-'+width);
   await panel.getByRole('radio',{name:'交付复核',exact:true}).click();await textIncludes(panel,'正式输出前审计');
   assert.equal(attempts,2);
  });
 }
 const legacy=makeJob(4799,'completed');legacy.plan.version='4.3';
 delete legacy.plan.knowledgeVersion;delete legacy.plan.knowledgeSnapshot;
 const running=makeJob(4798,'running');running.plan.knowledgeSnapshot=ref;running.knowledgeUsage={snapshotId:ref.id,records:[]};
 test('knowledge-k1-live-receipts',{jobs:[running],configOverrides},async({page})=>{
  await page.addInitScript(()=>{
   window.EventSource=class extends EventTarget{
    constructor(){super();window.emitRule=value=>this.dispatchEvent(new MessageEvent('trace',{data:JSON.stringify(value)}));}
    close(){}
   };
  });
  await detail(page,running);await page.getByRole('button',{name:'研究过程',exact:true}).click();
  const panel=page.locator('.knowledge-usage');await panel.locator('.knowledge-usage-trigger').click();await textIncludes(panel,'0 类依据');
  const event={type:'knowledge_read',message:'已加载规则',ruleRead:{key:'c'.repeat(64),kind:'context',snapshotId:ref.id,moduleId:'07-valuation',path:'knowledge/modules/rules/07-valuation.md',heading:'DCF 实时记录',line:1,endLine:3,reason:'规则补读：DCF'}};
  await page.evaluate(event=>window.emitRule(event),{...event,ruleRead:{...event.ruleRead,snapshotId:current.id}});await textIncludes(panel,'0 类依据');
  await page.evaluate(event=>{window.emitRule(event);window.emitRule(event);},event);await textIncludes(panel,'1 类依据 · 1 条引用记录');
 });
 test('knowledge-k1-legacy-report',{jobs:[legacy],configOverrides},async({page})=>{
  await detail(page,legacy);await page.getByRole('button',{name:'研究过程',exact:true}).click();const panel=page.locator('.knowledge-usage');
  await panel.locator('.knowledge-usage-trigger').click();await textIncludes(panel,'此记录未保存依据明细');await textIncludes(panel,'此记录未保存固定规则快照');
  await textIncludes(panel.getByLabel('本次规则版本'),'V4.3');
  assert.equal(await panel.getByRole('button',{name:'查看当时读取的原文'}).count(),0);
 });

 for(const width of [320,1440]){
  for(const historical of [true,false]){
   const job=makeJob(5800+width+(historical?1:2),'completed');
   job.plan={executionCompatibilityVersion:1,contractVersion:7};
   if(historical){
    const snapshot={id:'legacy-snapshot',version:'4.7'};
    job.result.framework={snapshot,usage:{snapshotId:snapshot.id,records:[{key:'legacy-record',snapshotId:snapshot.id,kind:'context',moduleId:'07-valuation',heading:'历史估值依据',path:'legacy/rules.md',line:1,endLine:3,reason:'规则补读：估值'}]}};
   }
   test(`knowledge-version-${historical?'historical':'unrecorded'}-${width}`,{jobs:[job],viewport:{width,height:1000},configOverrides},async({page,requests,db})=>{
    const original=structuredClone(db.get(job.id));
    await detail(page,job);await textIncludes(page.getByRole('article',{name:'报告正文',exact:true}).first(),'合成研究报告');
    await page.getByRole('button',{name:'研究过程',exact:true}).click();
    const panel=page.locator('.knowledge-usage');await panel.locator('.knowledge-usage-trigger').click();
    await textIncludes(panel.getByLabel('本次规则版本'),historical?'V4.7':'未记录');
    assert.doesNotMatch(await panel.getByLabel('本次规则版本').innerText(),/K1\.0\.0|执行兼容|contractVersion/);
    if(historical){await textIncludes(panel,'历史估值依据');await textIncludes(panel,'当前服务不再提供 V4.x 规则原文读取');assert.doesNotMatch(await panel.innerText(),/固定创建时的规则/);}
    assert.equal(await panel.getByRole('button',{name:'查看当时读取的原文'}).count(),0);
    assert.equal(requests('GET',`/api/jobs/${job.id}/rules`).length,0);
    assert.deepEqual(db.get(job.id),original);await noOverflow(page,'saved knowledge version '+width);
    await panel.getByLabel('本次规则版本').scrollIntoViewIfNeeded();
    await screenshot(page,`knowledge-version-${historical?'historical':'unrecorded'}-${width}`);
   });
  }
  const many=makeJob(4900+width,'completed');many.plan.knowledgeSnapshot=ref;
  many.knowledgeUsage={snapshotId:ref.id,records:Array.from({length:45},(_,index)=>({key:'rule-'+index,snapshotId:ref.id,kind:'context',moduleId:'07-valuation',heading:index===44?'DCF 最终核对':'估值规则 '+index,path:'knowledge/modules/rules/07-valuation.md',line:1,endLine:3,reason:index%2?'正式输出前审计':'规则补读：估值'}))};
  test('knowledge-k1-record-search-'+width,{jobs:[many],viewport:{width,height:1000},configOverrides},async({page})=>{
   await detail(page,many);await page.getByRole('button',{name:'研究过程',exact:true}).click();const panel=page.locator('.knowledge-usage');await panel.locator('.knowledge-usage-trigger').click();
   assert.equal(await panel.locator('.knowledge-read-list>li').count(),20);
   await panel.getByRole('button',{name:/显示更多记录/}).click();assert.equal(await panel.locator('.knowledge-read-list>li').count(),40);
   await panel.getByRole('button',{name:/显示更多记录/}).click();assert.equal(await panel.locator('.knowledge-read-list>li').count(),45);
   const search=panel.getByRole('textbox',{name:'搜索研究依据'});await search.fill('dcf 最终');await textIncludes(panel,'显示 1 / 1 条记录');await textIncludes(panel,'DCF 最终核对');
   await panel.getByRole('radio',{name:'交付复核',exact:true}).click();await textIncludes(panel,'没有匹配的记录');
   await panel.getByRole('button',{name:'清除搜索'}).click();assert.equal(await search.evaluate(node=>node===document.activeElement),true);await textIncludes(panel,'显示 20 / 22 条记录');
   await noOverflow(page,'rule search '+width);await screenshot(page,'knowledge-search-'+width);
  });
 }
 test('knowledge-k1-config-recovery',{configOverrides},async({page,requests})=>{
  await workbench(page);await manualInput(page);const question=await page.locator('#question').inputValue();
  let response={configured:false,knowledgeVersion};
  await page.route('**/api/config',route=>route.fulfill({contentType:'application/json',body:JSON.stringify(response)}));
  const refresh=()=>refreshRules(page);
  await refresh();let panel=await platformStatus(page);await textIncludes(panel,'研究服务尚未就绪');await page.keyboard.press('Escape');assert.equal(await page.locator('button[type=submit]').isDisabled(),true);
  response={};await refresh();panel=await platformStatus(page);await textIncludes(panel,'暂未确认服务状态');await page.keyboard.press('Escape');assert.equal(await page.locator('button[type=submit]').isDisabled(),true);
  let held;await page.route('**/api/config',route=>{held=route;});
  await page.evaluate(()=>{const original=window.setTimeout;window.setTimeout=(callback,delay,...args)=>{if(delay===10000){window.expireConfig=()=>callback(...args);return original(()=>{},60000);}return original(callback,delay,...args);};});
  await Promise.all([page.waitForRequest(request=>request.url().endsWith('/api/config')),refresh()]);
  await page.evaluate(()=>window.expireConfig());panel=await platformStatus(page);await textIncludes(panel,'暂未确认服务状态');assert.equal(await panel.getByRole('button',{name:'重新检查服务',exact:true}).isEnabled(),true);await page.keyboard.press('Escape');
  await held.fulfill({contentType:'application/json',body:JSON.stringify({configured:true,knowledgeVersion:'K0.0.0',knowledgeStatus:{snapshot:current}})}).catch(()=>{});
  await page.unroute('**/api/config');await refresh();await readyRules(page);await page.keyboard.press('Escape');assert.equal(await page.locator('#question').inputValue(),question);
  assert.equal(requests('POST','/api/jobs').length,0);
 });
 test('knowledge-k1-lazy-pages',{configOverrides},async({page})=>{
  const modules=[];page.on('request',request=>modules.push(new URL(request.url()).pathname));
  await page.goto('/');await readyRules(page);
  assert.equal(modules.some(path=>/\/Research(Detail|Handbook)(?:-[\w-]+)?\.jsx?$/.test(path)),false);
  await page.getByRole('link',{name:'研究手册',exact:true}).click();await page.locator('.research-handbook').waitFor();
  assert.ok(modules.some(path=>/\/ResearchHandbook(?:-[\w-]+)?\.jsx?$/.test(path)));assert.equal(modules.some(path=>/\/ResearchDetail(?:-[\w-]+)?\.jsx?$/.test(path)),false);
 });

 test('knowledge-k1-lazy-page-recovery',{configOverrides},async({page})=>{
  await page.route('**/ResearchHandbook*.js*',route=>route.fulfill({contentType:'text/javascript',body:"throw new Error('合成页面资源失败');"}));
  await page.goto('/handbook');await textIncludes(page.getByRole('alert'),'暂时无法打开研究手册');
  assert.equal(await page.getByRole('link',{name:'返回首页',exact:true}).getAttribute('href'),'/');
  await page.unroute('**/ResearchHandbook*.js*');await page.getByRole('button',{name:'刷新重试',exact:true}).click();
  await page.locator('.research-handbook').waitFor();await readyRules(page);
 });
 const slow=makeJob(4990,'completed');slow.plan.knowledgeSnapshot=ref;slow.knowledgeUsage={snapshotId:ref.id,records:[{key:'slow',kind:'context',snapshotId:ref.id,moduleId:'07-valuation',heading:'超时核对规则',path:'knowledge/modules/rules/07-valuation.md',line:1,endLine:3,reason:'规则补读：估值'}]};
 test('knowledge-k1-excerpt-timeout',{jobs:[slow],configOverrides},async({page})=>{
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
