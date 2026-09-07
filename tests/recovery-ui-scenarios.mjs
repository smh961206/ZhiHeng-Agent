import assert from 'node:assert/strict';

// Register with the existing local-fixture runner; this module never creates a
// server or contacts a real research API.
export function registerRecoveryScenarios({test,makeJob,detail,detailActions,textIncludes,count,enabled,noOverflow,screenshot}) {
  for (const width of [320,1440]) {
    const supplement=makeJob(2501,'running',{mode:'A',question:'补证与再次复核（合成）'});
    supplement.liveReport={phase:'supplement',text:'# 补证草稿\n\n合成待核对内容。'};
    test(`recovery-supplement-${width}`,{jobs:[supplement],viewport:{width,height:1000}},async({page,db,requests})=>{
      await detail(page,supplement);
      await textIncludes(page.locator('.rd-draft-notice'),'初轮复核已发现缺口，正在补证');
      assert.doesNotMatch(await page.locator('.rd-draft').getAttribute('aria-label'),/尚未审计/);
      await page.getByRole('tab',{name:'审计记录',exact:true}).click();
      await page.getByRole('heading',{name:'正在补证，等待再次复核',exact:true}).waitFor();
      await noOverflow(page,`supplement audit ${width}`);
      const next=db.get(supplement.id);next.liveReport={phase:'audit',text:'# 补证草稿'};next.evidenceFollowup={status:'completed',checks:[]};
      await page.reload();
      await page.getByRole('heading',{name:'正在复核补证后的研究内容',exact:true}).waitFor();
      await page.getByRole('tab',{name:'研究报告',exact:true}).click();
      await textIncludes(page.locator('.rd-draft-notice'),'补证已结束，正在再次复核');
      await noOverflow(page,`supplement review ${width}`);await screenshot(page,`recovery-supplement-${width}`,'.rd-report-card');
      next.liveReport={phase:'supplement',text:''};await page.reload();
      await page.getByRole('heading',{name:'初轮复核已发现缺口，正在补证',exact:true}).waitFor();
      assert.equal(requests('POST','/api/jobs').length,0);
    });

    const failed=makeJob(2502,'failed',{mode:'C',question:'失败后的恢复与轨迹定位（合成）'});
    test(`recovery-diagnostics-${width}`,{jobs:[failed],viewport:{width,height:1000}},async({page,requests})=>{
      await detail(page,failed);
      await textIncludes(page.locator('.rd-recovery-body'),'不会从中断处续跑');
      await textIncludes(page.locator('.rd-recovery-body'),failed.error);
      await (await detailActions(page)).getByRole('button',{name:'阅读模式',exact:true}).click();
      await page.locator('.rd-recovery-links').getByRole('button',{name:'查看执行轨迹',exact:true}).click();
      await page.waitForFunction(()=>document.activeElement?.classList.contains('rd-trace-trigger'));
      assert.equal(await page.locator('.rd-trace-trigger').getAttribute('aria-expanded'),'true');
      await textIncludes(page.getByRole('combobox',{name:'事件筛选',exact:true}),'异常与提示');
      await page.locator('.rd-recovery-links').getByRole('button',{name:'查看证据来源',exact:true}).click();
      await page.waitForURL('**/research/*?tab=sources');
      await page.waitForFunction(()=>document.activeElement?.getAttribute('role')==='tab'&&document.activeElement.textContent.includes('证据来源'));
      await noOverflow(page,`recovery diagnostics ${width}`);await screenshot(page,`recovery-diagnostics-${width}`,'.rd-report-card');
      assert.equal(requests('POST','/api/jobs').length,0);
      assert.equal(requests('POST',`/api/jobs/${failed.id}/retry`).length,0);
    });

    const unsaved=makeJob(2503,'failed');
    unsaved.delivery={status:'failed',recoverable:true,targetStatus:'cancelled',executionError:'原执行已取消'};
    test(`recovery-execution-save-${width}`,{jobs:[unsaved],viewport:{width,height:1000}},async({page,db,requests})=>{
      await detail(page,unsaved);
      await textIncludes(page.locator('.rd-empty'),'保存成功不代表研究完成');
      await textIncludes(page.locator('.rd-recovery-body'),'不重新采集资料、不调用模型');
      await textIncludes(page.locator('.rd-recovery-body'),'原执行已取消');
      await count(page.getByRole('button',{name:'重试研究',exact:true}),0);
      await enabled(page.locator('.rd-empty').getByRole('button',{name:'重试保存',exact:true}));
      await noOverflow(page,`execution save ${width}`);await screenshot(page,`recovery-execution-save-${width}`,'.rd-empty');
      db.get(unsaved.id).delivery={status:'failed',recoverable:false};await page.reload();
      await page.getByRole('heading',{name:'待保存内容暂不可恢复',exact:true}).waitFor();
      await count(page.getByRole('button',{name:/^重试研究$|^重试保存$/}),0);
      await enabled((await detailActions(page)).getByRole('button',{name:'导出报告',exact:true}),false);
      assert.equal(requests('POST','/api/jobs').length,0);
    });

    const completed=makeJob(2504,'completed',{mode:'A'});
    completed.result.decision={action:'深度研究',confidence:'低',summary:'合成判断',missingData:['合成缺口']};
    test(`recovery-aftercare-${width}`,{jobs:[completed],viewport:{width,height:1000}},async({page,requests})=>{
      await detail(page,completed);
      await count(page.getByRole('region',{name:'交付后阅读与后续研究'}),0);
      await textIncludes(page.locator('.rd-decision-disclosure'),'1 项待核实');
      await page.locator('.rd-decision-disclosure').click();await textIncludes(page.locator('.rd-decision-evidence'),'合成缺口');
      await page.keyboard.press('Escape');await page.getByRole('dialog',{name:'判断依据与验证条件',exact:true}).waitFor({state:'hidden'});
      await count(page.getByRole('button',{name:'准备深度研究',exact:true}),1);
      await count(page.getByRole('button',{name:'以本报告更新财报',exact:true}),1);
      await page.getByRole('tab',{name:/证据来源/}).click();
      await page.waitForURL('**/research/*?tab=sources');
      await page.waitForFunction(()=>document.activeElement?.getAttribute('role')==='tab'&&document.activeElement.textContent.includes('证据来源'));
      await page.getByRole('tab',{name:'研究报告',exact:true}).click();
      await page.getByRole('tab',{name:'审计记录',exact:true}).click();
      await page.getByRole('heading',{name:'合成审计记录',exact:true}).waitFor();
      await page.getByRole('tab',{name:'研究报告',exact:true}).click();
      await noOverflow(page,`aftercare ${width}`);await screenshot(page,`recovery-aftercare-${width}`,'.rd-report-intro');
      await page.getByRole('button',{name:'准备深度研究',exact:true}).click();
      await page.waitForURL('**/workbench');
      assert.equal(requests('POST','/api/jobs').length,0,'Preparation must not start research');
    });
  }
}
