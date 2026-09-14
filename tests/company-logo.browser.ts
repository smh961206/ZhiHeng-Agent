import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from 'vite';

const entry='\0virtual:company-logo-test';
const server=await createServer({server:{host:'127.0.0.1',port:0},plugins:[{
 name:'company-logo-test-entry',
 resolveId(id){if(id===entry)return id;},
 load(id){if(id===entry)return `
  import React from 'react';
  import {createRoot} from 'react-dom/client';
  import CompanyLogo from '/src/components/CompanyLogo.tsx';
  const root=createRoot(document.getElementById('root'));
  window.renderLogo=security=>root.render(React.createElement(CompanyLogo,{security}));
 `;},
}]});
await server.listen();
const origin=server.resolvedUrls.local[0].replace(/\/$/,'');
let browser;
try{
 browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||'chrome',timeout:10000});
 const page=await browser.newPage();
 page.setDefaultTimeout(10000);
 page.on('pageerror',error=>console.error(error.message));
 page.on('console',message=>{if(message.type()==='error')console.error(message.text());});
 const logoRequests=[];
 await page.route('**/api/securities/**/logo',async route=>{
  logoRequests.push(route.request().url());
  if(route.request().url().includes('/UNKNOWN/'))return route.fulfill({status:404,body:''});
  return route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')});
 });
 await page.route(`${origin}/__company-logo-test`,route=>route.fulfill({contentType:'text/html',body:`<!doctype html><html lang="zh"><body><div id="root"></div><script type="module" src="/@id/__x00__virtual:company-logo-test"></script></body></html>`}));
 await page.goto(`${origin}/__company-logo-test`);
 await page.waitForFunction(()=>typeof window.renderLogo==='function');
 await page.evaluate(()=>window.renderLogo({market:'US',symbol:'AAPL',name:'Apple'}));
 await page.waitForFunction(()=>document.querySelector('img')?.naturalWidth===1);
 assert.match(await page.locator('.company-logo').getAttribute('title'),/Wikimedia Commons/);
 await page.evaluate(()=>window.renderLogo({market:'US',symbol:'UNKNOWN',name:'未知公司'}));
 await page.locator('[aria-label="公司图标"]').waitFor();
 assert.equal(await page.locator('img').count(),0);
 assert.equal(await page.locator('.company-logo').getAttribute('title'),'暂无公司 Logo');
 await page.evaluate(()=>window.renderLogo({market:'HK',symbol:'700',name:'腾讯'}));
 await page.waitForFunction(()=>document.querySelector('img')?.naturalWidth===1);
 assert.match(await page.locator('img').getAttribute('src'),/HK\/00700\/logo$/);
 await page.evaluate(()=>window.renderLogo({market:'US',symbol:'../invalid'}));
 await page.locator('[aria-label="公司图标"]').waitFor();
 assert.equal(logoRequests.length,3);
 assert.ok(logoRequests.every(url=>url.startsWith(origin+'/api/securities/')));
 console.log('CompanyLogo browser: load, missing fallback, listing switch, invalid identity, same-origin requests passed.');
}finally{
 await browser?.close();
 await server.close();
}
