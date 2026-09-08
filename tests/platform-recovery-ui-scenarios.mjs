import assert from 'node:assert/strict';

export function registerPlatformRecoveryScenarios({test,makeJob,detail,workbench,textIncludes}){
 const running=makeJob(5100,'running',{question:'进度请求超时恢复（合成）'});
 test('platform-progress-timeout-recovery',{jobs:[running]},async({page,db,requests})=>{
  await page.addInitScript(()=>{
   const now=Date.now;window.clockOffset=0;Date.now=()=>now()+window.clockOffset;
   window.EventSource=class extends EventTarget{
    constructor(){super();window.progressStream=this;}
    close(){this.closed=true;}
   };
  });
  await detail(page,running);
  const path='/api/jobs/'+running.id;
  let held;
  await page.route('**'+path,route=>{held=route;});
  await page.evaluate(()=>{
   const original=window.setTimeout;
   window.setTimeout=(callback,delay,...args)=>{
    if(delay===10000){window.expireProgress=()=>callback(...args);return original(()=>{},60000);}
    return original(callback,delay,...args);
   };
  });
  await Promise.all([page.waitForRequest(request=>new URL(request.url()).pathname===path),page.evaluate(()=>window.progressStream.onerror())]);
  await page.evaluate(()=>window.expireProgress());
  await textIncludes(page.locator('.rd-connection'),'暂时无法同步进度');
  const stale={...running,status:'completed',result:{report:'# 不应覆盖当前任务的过期结果'}};
  await held.fulfill({json:stale}).catch(()=>{});
  await page.route('**'+path,route=>route.fulfill({json:{id:running.id,status:'running'}}));
  const sync=()=>Promise.all([page.waitForResponse(response=>new URL(response.url()).pathname===path),page.evaluate(()=>{window.clockOffset+=6000;window.dispatchEvent(new Event('focus'));})]);
  await sync();await textIncludes(page.locator('.rd-connection'),'暂时无法同步进度');
  await page.unroute('**'+path);await sync();await page.locator('.rd-connection').waitFor({state:'hidden'});
  assert.doesNotMatch(await page.locator('.research-detail').innerText(),/不应覆盖当前任务/);
  Object.assign(db.get(running.id),{status:'completed',result:makeJob(5100).result});
  await sync();await page.getByRole('heading',{name:'合成研究报告',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.progressStream.closed),true);
  assert.equal(requests('POST','/api/jobs').length,0);
 });

 test('platform-service-blocks-path-requests',{},async({page,requests})=>{
  await page.route('**/api/config',route=>route.fulfill({json:{configured:true,knowledgeVersion:'0.0'}}));
  await workbench(page);await page.locator('#question').fill('分析贵州茅台的现金流质量');
  await textIncludes(page.getByRole('region',{name:'研究规则状态'}),'页面与服务版本不一致');
  await page.waitForTimeout(1000);assert.equal(requests('POST','/api/research/path').length,0);
  await page.unroute('**/api/config');await page.getByRole('button',{name:'重新检查',exact:true}).click();
  await page.waitForResponse(response=>new URL(response.url()).pathname==='/api/research/path');
  assert.equal(requests('POST','/api/research/path').length,1);
  await page.route('**/api/config',route=>route.fulfill({status:503,json:{error:'合成连接中断'}}));
  await page.getByRole('button',{name:'重新检查',exact:true}).click();await textIncludes(page.getByRole('region',{name:'研究规则状态'}),'暂未确认服务状态');
  await page.locator('#question').fill('比较贵州茅台与苹果');await page.waitForTimeout(1000);
  assert.equal(requests('POST','/api/research/path').length,1);assert.equal(requests('POST','/api/jobs').length,0);
 });
}
