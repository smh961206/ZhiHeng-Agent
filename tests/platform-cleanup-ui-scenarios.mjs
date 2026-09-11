import assert from 'node:assert/strict';
import {readyRules} from './fixtures/platform-status-ui.mjs';

export function registerPlatformCleanupScenarios({test,makeJob,detail,workbench,textIncludes,noOverflow,screenshot}){
 for(const width of [320,1440,2560]){
  test('platform-cleanup-pages-'+width,{viewport:{width,height:1000}},async({page,requests})=>{
   for(const [route,owner] of [['/','.research-home'],['/workbench','.research-workbench'],['/history','.history-page'],['/handbook?tab=method','.research-handbook']]){
    await page.goto(route);await page.locator(owner).waitFor();await readyRules(page);
    assert.doesNotMatch(await page.locator(owner).innerText(),/当前可用规则|本次更新优化|当前研究方法 · V4\.7/);
    await noOverflow(page,'cleaned page '+route+' '+width);
    await screenshot(page,'platform-cleanup-'+owner.slice(1)+'-'+width);
   }
   await page.getByText('研究规则版本与历史报告',{exact:true}).click();
   await textIncludes(page.locator('.method-version-note'),'当前研究规则为 V4.7');
   await textIncludes(page.locator('.method-version-note'),'历史报告保留原规则与快照');
   assert.equal(requests('POST','/api/jobs').length,0);
  });
  test('platform-cleanup-step-alignment-'+width,{viewport:{width,height:1000}},async({page})=>{
   await workbench(page);await readyRules(page);
   const steps=page.getByRole('navigation',{name:'新建研究步骤',exact:true});
   const geometry=await steps.evaluate(el=>{
    const style=getComputedStyle(el),buttons=[...el.querySelectorAll('button')];
    return {top:style.paddingTop,bottom:style.paddingBottom,centers:buttons.map(button=>{
     const b=button.getBoundingClientRect(),c=button.querySelector('span').getBoundingClientRect();return {y:b.y,height:b.height,delta:Math.abs(b.y+b.height/2-c.y-c.height/2)};
    })};
   });
   assert.equal(geometry.top,geometry.bottom);assert.equal(geometry.centers.length,4);
   assert.ok(geometry.centers.every(c=>c.delta<=1&&c.height>=44));
   assert.equal(geometry.centers[0].y,geometry.centers[1].y);
   if(width>=640)assert.equal(geometry.centers[0].y,geometry.centers[3].y);
   await noOverflow(page,'aligned steps '+width);await screenshot(page,'platform-cleanup-steps-'+width,'.workbench-composer');
  });
 }
 for(const version of ['4.3','4.7',null]){
  const job=makeJob(version==='4.3'?843:version==='4.7'?847:800);
  if(version)job.plan.version=version;else delete job.plan.version;
  test('platform-cleanup-saved-rule-version-'+(version||'missing'),{jobs:[job]},async({page})=>{
   await detail(page,job);
   const provenance=page.getByLabel('报告版本',{exact:true});
   await textIncludes(provenance,version?'本报告规则 V'+version:'本报告规则版本未记录');
   assert.doesNotMatch(await provenance.innerText(),/V4\.8/);
   await noOverflow(page,'saved rules '+version);
  });
 }
}
