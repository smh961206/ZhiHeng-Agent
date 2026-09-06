// Real directory and quote checks; no model calls or saved research tasks.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1100}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:3001');
 await page.getByRole('heading',{name:'好投资，始于好问题。'}).waitFor();
 assert.equal(await page.getByRole('button',{name:'模型配置'}).count(),0);
 assert.equal(await page.locator('input[type=file]').count(),0);
 assert.equal(await page.locator('.security-chip').count(),0);
 await page.locator('#question').fill('比较贵州茅台、腾讯和苹果的现金流');
 await page.waitForFunction(()=>document.querySelectorAll('.security-chip').length===3,{},{timeout:60000});
 const stocks=await page.locator('.resolution-status').innerText();
 for(const code of ['600519','00700','AAPL'])assert.ok(stocks.includes(code),stocks);
 await page.getByRole('button',{name:'查看行情',exact:true}).click();
 await page.locator('.quote-card').nth(2).waitFor({timeout:60000});
 assert.equal(await page.locator('.quote-card .data-error').count(),0);
 await mkdir('artifacts',{recursive:true});
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'artifacts/workspace.png',fullPage:true});
 for(const width of [390,320]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${width}`);}
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'artifacts/mobile.png',fullPage:true});
 await page.getByRole('button',{name:'打开导航菜单'}).click();
 await page.getByRole('dialog').getByRole('button',{name:'研究框架',exact:true}).click();
 await page.getByRole('heading',{name:'把研究纪律，变成执行机制。'}).waitFor();
 assert.equal(await page.locator('.rule-grid>[data-slot=card]').count(),6);
 await page.getByRole('button',{name:'打开导航菜单'}).click();await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'打开导航菜单'}).click();
 await page.getByRole('dialog').getByRole('button',{name:'研究工作台',exact:true}).click();
 await page.locator('#question').fill('分析比亚迪');
 await page.locator('.ambiguity').waitFor({timeout:60000});
 assert.ok(await page.getByRole('button',{name:'开始研究',exact:true}).isDisabled());
 await page.locator('.ambiguity').getByRole('button',{name:/A 股/}).click();
 assert.match(await page.locator('.security-chip').innerText(),/002594/);
 await page.getByRole('button',{name:'手动调整'}).click();
 await page.getByRole('textbox',{name:'标的1股票代码'}).fill('600519');
 await page.locator('#question').fill('分析腾讯');
 assert.equal(await page.getByRole('textbox',{name:'标的1股票代码'}).inputValue(),'600519');
 await page.getByRole('button',{name:'恢复自动识别'}).click();
 await page.locator('.security-chip').waitFor({timeout:60000});
 assert.match(await page.locator('.security-chip').innerText(),/00700/);
 await page.locator('#question').fill('');
 await page.waitForFunction(()=>document.querySelectorAll('.security-chip').length===0);
 assert.ok(await page.getByRole('button',{name:'开始研究',exact:true}).isDisabled());
 assert.deepEqual(errors,[]);
 console.log('PASS: real CN/HK/US automatic matching and quotes, ambiguity selection, manual override, clearing, responsive 320/390/1440, Sheet navigation, no model configuration or browser errors.');
}finally{await browser.close();}
