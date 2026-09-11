import assert from 'node:assert/strict';

export async function readyRules(page){
 await page.locator('.platform-status-label').getByText('模型已配置',{exact:true}).waitFor({state:'attached'});
 await page.getByRole('region',{name:'研究规则状态',exact:true}).waitFor({state:'hidden'});
 assert.equal(await page.locator('.page-content .knowledge-status').count(),0);
}

export async function refreshRules(page){
 const inline=page.getByRole('button',{name:'重新检查',exact:true});
 if(await inline.count())return inline.click();
 await page.getByRole('button',{name:'平台与模型说明',exact:true}).click();
 await page.getByRole('button',{name:'重新检查服务',exact:true}).click();
 await page.keyboard.press('Escape');
}
