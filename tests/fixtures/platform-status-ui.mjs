import assert from 'node:assert/strict';

export async function readyRules(page){
 await page.locator('.platform-status-label').getByText('研究服务已就绪',{exact:true}).waitFor({state:'attached'});
 assert.equal(await page.locator('.page-content .knowledge-status').count(),0);
}

export async function platformStatus(page){
 const panel=page.locator('.platform-status-panel');
 const trigger=page.getByRole('button',{name:'平台运行说明',exact:true});
 // A closing popover remains visible during its exit animation. Wait for that
 // instance to detach before reopening instead of clicking its stale contents.
 if(await trigger.getAttribute('aria-expanded')!=='true'){
  await panel.waitFor({state:'hidden'});
  await trigger.click();
 }
 await page.locator('.platform-status-panel[data-state=open]').waitFor();
 return panel;
}

export async function refreshRules(page){
 const panel=await platformStatus(page);
 await panel.getByRole('button',{name:'重新检查服务',exact:true}).click();
}
