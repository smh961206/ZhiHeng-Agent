// Run against an existing Vite dev server or production preview; no backend is started.
// PLAYWRIGHT_MODULE may point to an installed Playwright entry module.
// Run: pnpm test:ui (or node tests/workspace-ui.integration.mjs).
// Optional: UI_BASE_URL (default http://127.0.0.1:5173), UI_TEST_FILTER (name regex).
// Exit codes: 0 = all checks passed, 1 = failed, 2 = UI integration/build not ready.
import assert from 'node:assert/strict';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createResearchPlan, frameworkVersion, modes, researchStages, resolveMode, portfolioFields} from '../shared/research-framework.mjs';
import {reviewFixture} from './fixtures/research-review.mjs';
import {validateReview} from '../server/research-output.mjs';
import {prepareResearchRetry} from '../server/research-retry.mjs';
import {materialDocx,materialXlsx,materialPptx,materialPdf} from './fixtures/material-files.mjs';
import {materialUploadResponse} from './fixtures/material-upload-response.mjs';

const baseURL = new URL(process.env.UI_BASE_URL || 'http://127.0.0.1:5173').origin;
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(baseURL).hostname), 'UI_BASE_URL must be loopback');
const artifacts = new URL('../artifacts/'+(process.env.UI_ARTIFACT_SUBDIR?process.env.UI_ARTIFACT_SUBDIR+'/':''), import.meta.url);
const timeout = 10_000;
const longToken = `fixture-${'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.repeat(5)}`;
const security = {market: 'CN', symbol: '600519', name: '贵州茅台'};
const sources = [
  {id: 'S1', title: '贵州茅台 2025 年年度报告（合成资料）', provider: 'UI测试披露中心', official: true,
    date: '2026-03-20', fetchedAt: '2026-08-01T08:00:00Z', fromCache: true,
    url: `https://evidence.example.invalid/annual/${longToken}.pdf`,
    text: `合成年度数据，用于检查来源展示。\n${longToken}\n经营现金流：100；分红：60。`},
  {id: 'S2', title: 'Apple 现金流补充资料（合成资料）', provider: 'Fixture SEC', official: true,
    date: '2026-02-01', url: 'https://evidence.example.invalid/apple/cash-flow',
    text: '合成现金流数据；仅用于界面验证。'},
  {id: 'Q1', title: '市场价格快照（合成资料）', provider: 'Fixture Quotes', official: false,
    date: '2026-08-01', url: 'https://evidence.example.invalid/quotes', text: '合成价格：123.45'},
];
const report = `# 合成研究报告

## 核心判断
这份报告仅供 UI 验证。现金流与分红数据均为测试夹具。[S1]

## 现金流质量
用于验证窄屏表格、长文本与来源引用。[S2]

| 指标 | 2021 | 2022 | 2023 | 2024 | 2025 | 说明 |
| --- | --- | --- | --- | --- | --- | --- |
| 经营现金流（合成值） | 100.00 | 110.00 | 120.00 | 130.00 | 140.00 | ${longToken} |

\`\`\`text
${longToken}
\`\`\`

## 风险与证伪条件
证据不足时保留判断，不以测试数字形成投资结论。[Q1]
`;

function makeJob(n, status = 'completed', overrides = {}) {
  const input = {question: `UI验证 ${String(n).padStart(2, '0')} · ${n % 2 ? '现金流质量' : '股东回报'} AAPL${n === 18 ? ` · ${longToken}` : ''}`,
    mode: 'B', depth: 'Standard', historyYears: 5, portfolio: '', securities: [security], sources: structuredClone(sources), ...overrides};
  const mode = input.mode === 'auto' ? resolveMode(input) : input.mode;
  const createdAt = new Date(Date.UTC(2026, 7, n, 8)).toISOString();
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`, status, mode, input, createdAt,
    plan: createResearchPlan(input, mode),
    workflow: {stages: researchStages.map((stage, index) => ({...stage,
      status: status === 'completed' || index < 2 ? 'completed' : index === 2 ? status === 'running' ? 'running' : 'pending' : 'pending'}))},
    events: [{type: 'progress', time: createdAt, message: '开始合成研究'},
      {type: 'tool_result', time: createdAt, message: '已读取合成资料', arguments: {symbol: security.symbol}, result: {sourceId: 'S1'}},
      {type: 'warning', time: createdAt, message: 'UI 测试夹具，不含真实研究数据'}],
    ...(status === 'running' ? {liveReport: {phase: 'research', text: '# 合成实时草稿\n\n正在核对测试证据。[S1]'}} : {}),
    ...(status === 'failed' ? {error: '合成的研究失败提示'} : {}),
    result: status === 'completed' ? {report, audit: '# 合成审计记录\n\n## 引用复核\n已核对 S1、S2、Q1 的测试引用。',
      warnings: ['合成资料，仅用于 UI 验证。'], validation: {checks: [{id: 'citations', label: '来源编号一致', passed: true}], scope: '合成报告校验'}} : null,
  };
}

function historyFixtures() {
  const states = ['queued', 'running', 'completed', 'failed', 'cancelled'];
  const jobs = Array.from({length: 18}, (_, i) => makeJob(i + 1, states[i % states.length]));
  // Deliberately unsorted: the UI must perform the sorting itself.
  return [...jobs.filter((_, i) => i % 2), ...jobs.filter((_, i) => !(i % 2))];
}
const summary = ({input, result, events, liveReport, ...job}) => ({...job, question: input.question, sourceCount: input.sources.length});
const scrollingJob = makeJob(18, 'completed', {question: 'UI滚动验证 · 现金流质量与长期股东回报'});
scrollingJob.result.report = `${report}\n${Array.from({length: 12}, (_, index) =>
  `## 滚动定位验证 ${String(index + 1).padStart(2, '0')}\n\n${Array.from({length: 5}, (_, paragraph) =>
    `第 ${index + 1} 节、第 ${paragraph + 1} 段：这是专门验证滚动和目录定位的合成正文。现金流、股东回报、来源编号均为测试内容，不访问真实模型或数据。`.repeat(3)).join('\n\n')}`
).join('\n\n')}`;

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return {promise, resolve};
}

async function eventually(check, message) {
  const deadline = Date.now() + timeout;
  do {
    if (await check()) return;
    await delay(40);
  } while (Date.now() < deadline);
  assert.fail(typeof message === 'function' ? message() : message);
}
async function count(locator, expected) {
  await eventually(async () => await locator.count() === expected, `Expected ${expected} matches: ${locator}`);
}
async function enabled(locator, expected = true) {
  await eventually(async () => await locator.isEnabled() === expected, `Expected enabled=${expected}: ${locator}`);
}
async function textIncludes(locator, expected) {
  await eventually(async () => (await locator.innerText()).includes(expected), `Missing text ${JSON.stringify(expected)}: ${locator}`);
}
async function shadcnButtons(locator, slot = 'button') {
  assert.ok(await locator.count() > 0, `Expected shadcn Buttons: ${locator}`);
  for (const button of await locator.all()) {
    // SheetTrigger's asChild composition replaces Button's slot. Button still
    // supplies its variant/size attributes; verify both layers explicitly.
    assert.equal(await button.getAttribute('data-slot'), slot, `Expected shadcn ${slot}: ${await button.textContent()}`);
    assert.ok(await button.getAttribute('data-variant'), 'shadcn Button must preserve its variant');
    assert.ok(await button.getAttribute('data-size'), 'shadcn Button must preserve its size');
  }
}
async function collapsible(root, open) {
  assert.equal(await root.getAttribute('data-slot'), 'collapsible', `Expected shadcn Collapsible: ${root}`);
  await count(root.locator('summary'), 0);
  const trigger = root.locator(':scope > button[aria-expanded]');
  await count(trigger, 1);
  assert.ok(['button', 'collapsible-trigger'].includes(await trigger.getAttribute('data-slot')), 'Collapsible trigger must use a shadcn slot');
  if (await trigger.getAttribute('aria-expanded') !== String(open)) await trigger.click();
  await eventually(async () => await trigger.getAttribute('aria-expanded') === String(open), `Collapsible must become open=${open}`);
  const content = root.locator(':scope > [data-slot="collapsible-content"]');
  if (open) {
    await content.waitFor();
    // Radix removes aria-controls while closed to avoid a dangling reference.
    const contentId = await trigger.getAttribute('aria-controls');
    assert.ok(contentId, 'Expanded Collapsible trigger must reference its content');
    assert.equal(await content.getAttribute('id'), contentId);
  } else await content.waitFor({state: 'hidden'});
}
async function openHistory(page) {
  if (page.viewportSize().width < 1024) {
    await page.getByRole('button', {name: '打开导航菜单', exact: true}).click();
    const sheet = page.getByRole('dialog', {name: '研究导航', exact: true});
    await sheet.getByRole('link', {name: /^研究记录/}).click();
    await sheet.waitFor({state: 'hidden'});
  } else await page.locator('.desktop-sidebar').getByRole('navigation', {name: '主导航'}).getByRole('link', {name: /^研究记录/}).click();
  await page.waitForURL('**/history');
}
async function detailActions(page) {
  if (page.viewportSize().width >= 1024) return page.locator('.rd-desktop-tools .rd-action-panel');
  const trigger = page.locator('.rd-header').getByRole('button', {name: '打开研究操作', exact: true});
  await shadcnButtons(trigger, 'sheet-trigger');
  await trigger.click();
  const sheet = page.getByRole('dialog', {name: '研究操作', exact: true});
  await sheet.waitFor();
  assert.equal(await sheet.getAttribute('data-slot'), 'sheet-content');
  return sheet.locator('.rd-action-panel');
}
async function openDirectory(page) {
  await revealDirectory(page);
  const trigger=page.getByRole('button',{name:'打开报告目录',exact:true});
  await enabled(trigger);
  await shadcnButtons(trigger,page.viewportSize().width<1024?'sheet-trigger':'popover-trigger');
  await trigger.click();
  const popup=page.getByRole('dialog',{name:'报告目录',exact:true});
  await popup.waitFor();
  return popup.locator('.rd-outline');
}
async function revealDirectory(page) {
  // Compact reading tools appear only after entering the report body.
  const trigger=page.getByRole('button',{name:'打开报告目录',exact:true});
  if(page.viewportSize().width<1024){
    await eventually(async()=>{
      if(await trigger.isVisible())return true;
      await page.locator('article.rd-markdown').evaluate(element=>{
        const toolbar=document.querySelector('.rd-content-toolbar');
        document.querySelector('.page-scroll').scrollTop+=element.getBoundingClientRect().top-toolbar.getBoundingClientRect().bottom+160;
      });
      // Tab/navigation effects may restore scroll; observe the settled reading tools.
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      return trigger.isVisible();
    },'Scrolling into the report must reveal the compact directory');
  }
  await enabled(trigger);
}
async function unavailableDirectory(page) {
  const trigger=page.getByRole('button',{name:'打开报告目录',exact:true});
  await count(trigger,page.viewportSize().width<1024?0:1);
  if(page.viewportSize().width>=1024)await enabled(trigger,false);
}
async function dismissDetailSheet(page) {
  const sheet = page.getByRole('dialog');
  if (await sheet.isVisible()) {
    await page.keyboard.press('Escape');
    await sheet.waitFor({state: 'hidden'});
  }
}
async function headingUncovered(page, heading) {
  let last;
  await eventually(async () => {
    last = await heading.evaluate(element => {
      const rect = element.getBoundingClientRect();
      const scroller = document.querySelector('.page-scroll').getBoundingClientRect();
      const header = document.querySelector('.rd-header').getBoundingClientRect();
      const topbar = document.querySelector('.topbar').getBoundingClientRect();
      const toolbar=document.querySelector('.rd-content-toolbar').getBoundingClientRect();
      const top = Math.max(scroller.top, header.bottom, topbar.bottom, toolbar.bottom);
      const x = Math.min(innerWidth - 2, rect.left + Math.min(40, rect.width / 2));
      const y = rect.top + Math.min(8, rect.height / 2);
      const hit = document.elementFromPoint(x, y);
      return {y: rect.top, bottom: rect.bottom, top, viewportBottom: Math.min(innerHeight, scroller.bottom), hit: element.contains(hit)};
    });
    return last.y >= last.top - 1 && last.bottom <= last.viewportBottom && last.hit;
  }, () => `TOC target must remain fully visible below sticky header: ${heading}; ${JSON.stringify(last)}`);
  return last;
}
async function jumpToHeading(page, nav, name) {
  const link = nav.getByRole('link', {name, exact: true});
  const href = await link.getAttribute('href');
  const fragment = new URL(href,page.url()).hash;
  assert.ok(fragment?.startsWith('#'), 'Outline link must use a heading fragment');
  await link.click();
  await eventually(() => new URL(page.url()).hash === fragment, 'Outline did not update URL fragment');
  await page.getByRole('dialog', {name: '报告目录', exact: true}).waitFor({state: 'hidden'});
  const heading = page.locator('.rd-markdown').getByRole('heading', {name, exact: true});
  assert.equal(await heading.getAttribute('id'), decodeURIComponent(fragment.slice(1)), 'Outline must resolve to the intended rendered heading');
  await headingUncovered(page, heading);
}
async function wheelReport(page, pixels) {
  const scroller = page.locator('.page-scroll');
  const before = await scroller.evaluate(element => element.scrollTop);
  const rect = await page.locator('.rd-report-card').boundingBox();
  const header = await page.locator('.rd-header').boundingBox();
  assert.ok(rect && header, 'Report and sticky header must be rendered');
  await page.mouse.move(rect.x + rect.width / 2, Math.min(page.viewportSize().height - 80, header.y + header.height + 100));
  await page.mouse.wheel(0, pixels);
  await eventually(async () => await scroller.evaluate(element => element.scrollTop) >= before + pixels * 0.8, 'Mouse wheel must actually scroll the report container');
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function stickyPositions(page, selectors) {
  return page.evaluate(selectors => Object.fromEntries(Object.entries(selectors).map(([name, selector]) => {
    const element = document.querySelector(selector);
    if (!element) throw new Error(`Missing sticky target: ${selector}`);
    const rect = element.getBoundingClientRect();
    return [name, {x: rect.x, y: rect.y, width: rect.width, height: rect.height}];
  })), selectors);
}
function positionsUnchanged(before, after, label) {
  for (const name of Object.keys(before)) for (const axis of ['x', 'y'])
    assert.ok(Math.abs(before[name][axis] - after[name][axis]) <= 2,
      `${label}: ${name}.${axis} must stay fixed after real scroll (${before[name][axis]} -> ${after[name][axis]})`);
}
async function actionLayout(panel, vertical = true) {
  const names = ['阅读模式', '复用研究输入', '导出报告'];
  await shadcnButtons(panel.getByRole('button').filter({hasNotText:'导出报告'}));
  await shadcnButtons(panel.getByRole('button',{name:'导出报告',exact:true}),'popover-trigger');
  const boxes = [];
  for (const name of names) {
    const button = panel.getByRole('button', {name, exact: true});
    await button.waitFor();
    const geometry = await button.evaluate(element => {
      const rect = element.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(element);
      const text = range.getBoundingClientRect();
      return {x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom, width: rect.width,
        clipped: element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1,
        textFits: text.left >= rect.left - 1 && text.right <= rect.right + 1 && text.top >= rect.top - 1 && text.bottom <= rect.bottom + 1};
    });
    assert.ok(!geometry.clipped && geometry.textFits, `${name}: complete action text must fit its button: ${JSON.stringify(geometry)}`);
    boxes.push(geometry);
  }
  for (let i = 1; i < boxes.length; i++) {
    if(vertical){
      assert.ok(boxes[i].y >= boxes[i - 1].bottom - 1, 'Mobile research actions must stack vertically');
      assert.ok(Math.abs(boxes[i].x - boxes[0].x) <= 2 && Math.abs(boxes[i].width - boxes[0].width) <= 2, 'Vertical actions must align and use the same width');
    }else{
      assert.ok(boxes[i].x >= boxes[i - 1].right - 1 && Math.abs(boxes[i].y-boxes[0].y)<=2, 'Desktop actions must share a horizontal toolbar');
    }
  }
}
async function traceChecks(page) {
  const trace = page.locator('.rd-trace-aside:visible');
  await count(trace, 1);
  const disclosure = trace.locator('.rd-trace > [data-slot="collapsible"]');
  assert.equal(await trace.locator('.rd-trace').getAttribute('data-slot'), 'card');
  await collapsible(disclosure, true);
  await count(trace.locator('.rd-event'), 3);
  const fonts = await trace.locator('.rd-event').evaluateAll(events => events.map(event => ({
    message: parseFloat(getComputedStyle(event.querySelector(':scope > p')).fontSize),
    metadata: [...event.querySelectorAll('.rd-event-meta, .rd-event-meta > span')].map(element => parseFloat(getComputedStyle(element).fontSize)),
  })));
  assert.ok(fonts.every(font => font.message >= 15 && font.metadata.every(size => size >= 13)), `Trace text must be >=15px and metadata >=13px: ${JSON.stringify(fonts)}`);
  const data = trace.locator('.rd-event-data');
  await collapsible(data, true);
  await textIncludes(data, '输入参数');
  await textIncludes(data, '600519');
  await textIncludes(data, '返回结果');
  await textIncludes(data, 'S1');
  await collapsible(data, false);
  await trace.getByRole('button',{name:'查看详细执行记录',exact:true}).click();
  await choose(page, '事件筛选', '工具调用');
  await count(trace.locator('.rd-event'), 1);
  await textIncludes(trace.locator('.rd-event'), '已读取合成资料');
  await choose(page, '事件筛选', '异常与提示');
  await count(trace.locator('.rd-event'), 1);
  await textIncludes(trace.locator('.rd-event'), 'UI 测试夹具');
  await choose(page, '事件筛选', '全部事件');
  await count(trace.locator('.rd-event'), 3);
  await collapsible(disclosure, false);
  await collapsible(disclosure, true);
}
async function choose(page, label, option) {
  await page.getByRole('combobox', {name: label, exact: true}).click();
  await page.getByRole('option', {name: option, exact: true}).click();
}
async function queryIs(page, expected) {
  await eventually(() => Object.entries(expected).every(([key, value]) => new URL(page.url()).searchParams.get(key) === value),
    `URL query mismatch: ${JSON.stringify(expected)}; ${page.url()}`);
}
async function screenshot(page, name, target) {
  if (target) await page.locator(target).first().evaluate(element => element.scrollIntoView({block: 'start', behavior: 'instant'}));
  else await page.evaluate(() => {
    window.scrollTo(0, 0);
    document.querySelector('.page-scroll')?.scrollTo(0, 0);
  });
  // The app scrolls inside .page-scroll; fullPage would include blank space
  // beyond the fixed shell rather than reveal the nested document's content.
  await page.screenshot({path: fileURLToPath(new URL(`ui-${name}.png`, artifacts)), animations: 'disabled'});
}

// All API requests (including SSE) terminate here. No route.fetch(), API fallback,
// backend imports, credentials, real model requests, or persistence are used.
async function fixtureContext(browser, {jobs = [], viewport = {width: 1440, height: 1100}, failures = {}, reducedMotion = 'reduce', createdStatus = 'completed', quoteOverrides = {},resolvedSecurities=null,quoteFailures=[],loseCreateResponse=false,configOverrides={},pathResponse=null,securityResponse=null} = {}) {
  const context = await browser.newContext({baseURL, viewport, serviceWorkers: 'block', locale: 'zh-CN', timezoneId: 'Asia/Shanghai', reducedMotion});
  const db = new Map(structuredClone(jobs).map(job => [job.id, job]));
  const calls = [], blocked = [], pageErrors = [], routeErrors = [], assetErrors = [], navigations = [];
  const holds = new Map(), gates = new Set(), streams = new Map();
  const remainingFailures = new Map(Object.entries(failures));
  const submissions=new Map(),pathDecisions=new Map();let createResponseLost=false;
  let closing = false;
  function hold(key) {
    const gate = deferred();
    holds.set(key, gate); gates.add(gate);
    return () => { if (holds.get(key) === gate) holds.delete(key); gate.resolve(); };
  }
  const requests = (method, path) => calls.filter(call => call.method === method && call.path === path);
  context.on('page', page => {
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations.push(frame.url()); });
    page.on('response', response => {
      const url = new URL(response.url());
      if (url.origin === baseURL && !url.pathname.startsWith('/api/') && response.status() >= 400)
        assetErrors.push(`${response.status()} ${url.pathname}`);
    });
  });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), method = request.method(), path = url.pathname;
    const reject = async reason => { blocked.push(`${method} ${url.href}: ${reason}`); await route.abort('blockedbyclient'); };
    const json = (value, status = 200) => route.fulfill({status, contentType: 'application/json; charset=utf-8', body: JSON.stringify(value)});
    try {
      if (url.origin !== baseURL) return await reject('external requests are forbidden');
      if (!/^\/api(?:\/|$)/i.test(path)) {
        if (method === 'GET') return await route.continue(); // Local document/Vite/assets only.
        return await reject('non-API writes are forbidden');
      }
      if(path==='/api/materials/read'&&method==='POST'){
        const name=decodeURIComponent(request.headers()['x-document-name']);
        calls.push({method,path,body:{name,bytes:request.postDataBuffer()?.length}});
        try{return await json(await materialUploadResponse(request.postDataBuffer(),name));}catch(error){return await json({error:error.message},422);}
      }
      const body = request.postData() ? request.postDataJSON() : null;
      calls.push({method, path, body,submissionKey:request.headers()['idempotency-key']});
      const key = `${method} ${path}`;
      if (holds.has(key)) await holds.get(key).promise;
      if (closing) return await route.abort();
      if ((remainingFailures.get(key) || 0) > 0) {
        remainingFailures.set(key, remainingFailures.get(key) - 1);
        return await json({error: 'UI测试：模拟加载失败，请重试'}, 503);
      }
      if (method === 'GET' && path === '/api/config') return await json({configured: true, model: 'fixture-only', modes,
        knowledgeVersion: frameworkVersion, researchStages, markets: ['CN', 'HK', 'US'], dataProvider: 'UI合成数据',...configOverrides});
      if (method === 'GET' && path === '/api/materials/capabilities') return await json({enabled:false});
      if (method === 'POST' && path === '/api/securities/resolve') return await json({
        securities: resolvedSecurities??(/苹果|AAPL/i.test(body.question) ? [{market: 'US', symbol: 'AAPL', name: '苹果'}]
          : /比亚迪|002594/.test(body.question) ? [{market:'CN',symbol:'002594',name:'比亚迪'}]
          : /茅台|600519/.test(body.question) ? [security] : []),
        ambiguities: [], unresolved: [], warnings: [], overflow: false,...(securityResponse?await securityResponse(body.question):{}),
      });
      if(method==='POST'&&path==='/api/research/path'){
        const value={mode:resolveMode({question:body.question}),source:'semantic',reason:'根据研究问题选择对应路径（合成判断）。',decisionId:`fixture-path-${pathDecisions.size+1}`,...(pathResponse?await pathResponse(body.question):{})};
        pathDecisions.set(value.decisionId,value);return await json(value);
      }
      if (method === 'POST' && path === '/api/research/plan') return await json(createResearchPlan(body));
      if (method === 'POST' && path === '/api/research/path') return await json({mode:resolveMode(body),source:'rules',reason:'合成测试按问题匹配路径',decisionId:'fixture-path'});
      if (method === 'POST' && path === '/api/quotes') return await json(body.securities.map(item => quoteFailures.includes(item.symbol)?{security:item,error:'测试：该公司行情暂不可用'}:({security: item,
        quote: {name: `合成行情 ${item.symbol}`, currency: item.market === 'US' ? 'USD' : 'CNY', price: 123.45,
          provider: 'UI Fixture', asOf: '2026-08-01T08:00:00Z', fetchedAt: '2026-08-01T08:01:00Z',...quoteOverrides}})));
      if (method === 'GET' && path === '/api/jobs') return await json([...db.values()].map(summary));
      if (method === 'POST' && path === '/api/securities/exchanges') return await json(body.symbols.map(symbol => ({symbol, exchange: ({AAPL:'NASDAQ','BRK-B':'NYSE'})[symbol] || null})));
      if (method === 'POST' && path === '/api/jobs') {
        const key=request.headers()['idempotency-key'],previous=submissions.get(key);
        if(key&&previous){assert.deepEqual(body,previous.body);return await json(db.get(previous.id));}
        const decision=body.mode==='auto'?pathDecisions.get(body.pathDecisionId):null;
        const job = makeJob(100 + requests('POST', '/api/jobs').length, createdStatus, decision?{...body,mode:decision.mode}:body);if(decision)job.input.mode=body.mode;
        db.set(job.id, job);
        if(key)submissions.set(key,{id:job.id,body:structuredClone(body)});
        if(loseCreateResponse&&!createResponseLost){createResponseLost=true;return await route.abort('connectionreset');}
        return await json(job, 201);
      }
      const match = path.match(/^\/api\/jobs\/([\da-f-]+)(?:\/(cancel|stream|retry|save))?$/);
      if (match) {
        const [, id, action] = match, job = db.get(id);
        if (!job) return await json({error: 'UI测试：研究不存在'}, 404);
        if(method==='POST'&&action==='save'){
          if(job.delivery?.status!=='failed'||(job.retryCount??0)!==body.expectedRetryCount)return await json({error:'保存状态已变化'},409);
          job.status='completed';job.delivery={status:'saved',recoverable:false};job.result=makeJob(100).result;delete job.error;
          return await json(job);
        }
        if(method==='POST'&&action==='retry'){
          if(!['failed','cancelled'].includes(job.status)||(job.retryCount??0)!==body.expectedRetryCount)return await json({error:'研究状态已变化，请刷新详情页'},409);
          const next=await prepareResearchRetry(job,id=>db.get(id));
          next.status=createdStatus;
          if(createdStatus==='completed')next.result=makeJob(100).result;
          if(createdStatus==='running')next.liveReport={phase:'research',text:'# 合成实时草稿\n\n本次重试正在重新核对证据。'};
          db.set(id,next);streams.delete(id);
          return await json(next);
        }
        if (method === 'GET' && !action) return await json(job);
        if (method === 'DELETE' && !action) {
          if (['queued', 'running'].includes(job.status)) return await json({error: '运行中的研究不可删除'}, 409);
          db.delete(id);
          return await json({ok: true});
        }
        if (method === 'POST' && action === 'cancel') {
          job.status = 'cancelled'; job.events.push({type: 'cancelled', time: job.createdAt, message: '合成任务已取消'});
          await json({ok: true});
          streams.get(id)?.resolve();
          return;
        }
        if (method === 'GET' && action === 'stream') {
          // Hold the response until cancellation, then deliver a real SSE done
          // event. This exercises the app's EventSource without a real job.
          if (['queued', 'running'].includes(job.status)) {
            const gate = streams.get(id) || deferred(); streams.set(id, gate); gates.add(gate);
            await gate.promise;
          }
          if (closing) return await route.abort();
          return await route.fulfill({status: 200, contentType: 'text/event-stream',
            body: `event: done\ndata: ${JSON.stringify(db.get(id))}\n\n`});
        }
      }
      await reject('unhandled API: add an explicit test fixture');
    } catch (error) {
      if (!closing) {
        routeErrors.push(`${method} ${path}: ${error.message}`);
        await route.abort().catch(() => {});
      }
    }
  });
  const page = await context.newPage();
  page.setDefaultTimeout(timeout);
  page.setDefaultNavigationTimeout(20_000);
  return {page, db, requests, hold, calls, blocked, pageErrors, routeErrors, assetErrors, navigations,
    finishJob(id,changes){Object.assign(db.get(id),changes);streams.get(id)?.resolve();},
    async close() {
      closing = true;
      for (const gate of gates) gate.resolve();
      await context.close();
    },
    assertClean() {
      assert.deepEqual(blocked, [], 'Unexpected/real network requests were blocked');
      assert.deepEqual(routeErrors, [], 'Fixture handler errors');
      assert.deepEqual(pageErrors, [], 'Browser pageerror');
      assert.deepEqual(assetErrors, [], 'Failed app assets (the dev server may be compiling)');
    },
  };
}

async function workbench(page) {
  await page.goto('/workbench');
  await page.locator('.research-workbench').waitFor();
}
async function detail(page, job) {
  await page.goto(`/research/${job.id}`);
  await page.locator('.research-detail').waitFor();
  await page.getByRole('heading', {name: job.input.question, exact: true}).waitFor();
}
async function openProcess(page){
 await page.getByRole('button',{name:'研究过程',exact:true}).click();
 await page.getByRole('dialog',{name:'研究过程',exact:true}).waitFor();
}
async function closeProcess(page){
 await page.keyboard.press('Escape');
 await page.getByRole('dialog',{name:'研究过程',exact:true}).waitFor({state:'hidden'});
}
async function manualInput(page) {
  await page.getByRole('button', {name: '手动调整', exact: true}).click();
  await page.getByRole('textbox', {name: '标的1股票代码', exact: true}).fill('600519');
  await page.locator('#question').fill('UI验证：分析贵州茅台的现金流质量');
  await enabled(page.getByRole('button', {name: /^开始(?:深度)?研究$/, exact: true}));
}
async function noOverflow(page, label) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  const result = await page.evaluate(() => {
    const roots = ['html', 'body', '.app-shell', '.main-shell', '.page-scroll', '.page-content', '[role="dialog"]', '[role="alertdialog"]'];
    const sizes = roots.flatMap(selector => {
      const element = document.querySelector(selector);
      return element ? [{selector, width: element.clientWidth, scroll: element.scrollWidth}] : [];
    });
    return {viewport: innerWidth, sizes, offenders: [...document.querySelectorAll('main *, [role="dialog"] *, [role="alertdialog"] *')].filter(element => {
      if (!element.getClientRects().length) return false;
      const rect = element.getBoundingClientRect();
      if (rect.left >= -1 && rect.right <= innerWidth + 1) return false;
      // Wide report tables/code are allowed inside their own scrolling regions.
      for (let parent = element.parentElement; parent && parent.tagName !== 'MAIN'; parent = parent.parentElement)
        if (['auto', 'scroll', 'hidden', 'clip'].includes(getComputedStyle(parent).overflowX) && parent.scrollWidth > parent.clientWidth) return false;
      return true;
    }).slice(0, 8).map(element => ({tag: element.tagName, class: element.className, text: element.textContent.slice(0, 60)}))};
  });
  assert.ok(result.sizes.every(item => item.scroll <= item.width + 1) && result.offenders.length === 0,
    `${label}: horizontal overflow ${JSON.stringify(result)}`);
}

const scenarios = [];
function test(name, options, run) { scenarios.push({name, options, run}); }

for(const width of [320,1440])test(`question-first-auto-path-${width}`,{viewport:{width,height:1100}},async({page,requests})=>{
 await workbench(page);
 const question=page.locator('#question'),picker=page.locator('.path-picker'),trigger=page.getByRole('combobox',{name:'研究路径',exact:true});
 await question.fill('');await textIncludes(picker,'等待输入');await textIncludes(trigger,'输入问题后自动匹配');
 for(const [input,path] of [['快速筛选贵州茅台','快速筛选'],['对比贵州茅台与比亚迪','多公司比较'],['分析贵州茅台最新财报','财报更新']]){
  await question.fill(input);await textIncludes(trigger,path);await textIncludes(picker,'语义识别');
 }
 assert.ok(await page.locator('.question-section').evaluate(root=>root.querySelector('#question').getBoundingClientRect().bottom<root.querySelector('.path-picker').getBoundingClientRect().top),'Question input precedes the detected research path');
 await choose(page,'研究路径','深度研究');await textIncludes(picker,'手动选择');
 await question.fill('研究贵州茅台的股息与分红');await textIncludes(trigger,'深度研究');
 await picker.getByRole('button',{name:'恢复自动识别',exact:true}).click();await textIncludes(trigger,'股东回报');await textIncludes(picker,'语义识别');
 await noOverflow(page,`automatic path ${width}`);await screenshot(page,`question-first-auto-path-${width}`,'.question-section');
 await trigger.click();await textIncludes(page.getByRole('option',{name:'股东回报',exact:true}),'根据问题推荐');await noOverflow(page,`path choices ${width}`);
 await page.screenshot({path:fileURLToPath(new URL(`ui-auto-path-menu-${width}.png`,artifacts)),animations:'disabled'});
 await page.keyboard.press('Escape');await question.fill('');await textIncludes(picker,'等待输入');assert.equal(requests('POST','/api/jobs').length,0);
});

const screenJob=makeJob(904,'completed',{question:'比亚迪快速筛选 · 界面合成验证',mode:'A'});

for(const width of [320,1440])test(`semantic-security-submit-${width}`,{viewport:{width,height:1100},securityResponse:async()=>({source:'semantic',securities:[security]})},async({page,requests})=>{
 await workbench(page);await page.locator('#question').fill('不要腾讯，苹果只是举例，只分析贵州茅台现金流');
 const section=page.locator('.data-connect');await textIncludes(section,'语义识别');await textIncludes(section.locator('.security-chip'),'600519');
 await eventually(()=>requests('POST','/api/quotes').length>0,'Resolved company loads quotes automatically');
 assert.deepEqual(requests('POST','/api/quotes').at(-1).body.securities.map(s=>s.symbol),['600519']);
 await enabled(page.locator('button[type=submit]'));await noOverflow(page,`semantic securities ${width}`);await screenshot(page,`semantic-securities-${width}`,'.data-connect');
 await page.locator('button[type=submit]').click();await page.waitForURL(/\/research\//);assert.deepEqual(requests('POST','/api/jobs')[0].body.securities.map(s=>s.symbol),['600519']);
});

test('semantic-security-fallback-visible',{securityResponse:async()=>({source:'rules',warnings:['语义识别暂不可用，已按名称与代码匹配，请核对研究对象或手动调整。']})},async({page})=>{
 await workbench(page);await page.locator('#question').fill('研究贵州茅台');const section=page.locator('.data-connect');await textIncludes(section,'名称匹配');await textIncludes(section,'语义识别暂不可用');
 await section.getByRole('button',{name:'手动调整',exact:true}).click();await textIncludes(section,'手动核对');
});

for(const width of [320,1440])test(`semantic-path-submit-${width}`,{viewport:{width,height:1100},pathResponse:async()=>({mode:'B',reason:'问题明确排除公司比较，重点核对单家公司现金流。'})},async({page,requests})=>{
 await workbench(page);const question=page.locator('#question'),picker=page.locator('.path-picker');
 await question.fill('不做公司比较，只分析贵州茅台现金流');
 await textIncludes(picker,'正在判断');await enabled(page.locator('button[type=submit]'),false);
 await textIncludes(picker,'语义识别');await textIncludes(page.getByRole('combobox',{name:'研究路径'}),'深度研究');await textIncludes(picker,'明确排除公司比较');
 await enabled(page.locator('button[type=submit]'));assert.equal(requests('POST','/api/research/path').length,1);
 await screenshot(page,`semantic-path-${width}`,'.question-section');await noOverflow(page,`semantic path ${width}`);
 await page.locator('button[type=submit]').click();await page.waitForURL(/\/research\//);
 const payload=requests('POST','/api/jobs')[0].body;assert.equal(payload.mode,'auto');assert.ok(payload.pathDecisionId);assert.equal(payload.securities.length,1);
});
test('semantic-path-manual-and-stale-responses',{},async({page,requests,hold})=>{
 await workbench(page);const question=page.locator('#question'),picker=page.locator('.path-picker');
 const release=hold('POST /api/research/path');await question.fill('比较贵州茅台和比亚迪');await eventually(()=>requests('POST','/api/research/path').length===1,'Path request begins after pause');
 await choose(page,'研究路径','股东回报');release();await textIncludes(picker,'手动选择');await textIncludes(page.getByRole('combobox',{name:'研究路径'}),'股东回报');
 await question.fill('快速筛选贵州茅台');await page.waitForTimeout(900);assert.equal(requests('POST','/api/research/path').length,1,'Manual path does not request automatic replacement');
 await picker.getByRole('button',{name:'恢复自动识别',exact:true}).click();await textIncludes(picker,'语义识别');await textIncludes(page.getByRole('combobox',{name:'研究路径'}),'快速筛选');
 await question.fill('最新财报');await question.fill('研究贵州茅台的分红');await textIncludes(picker,'语义识别');await textIncludes(page.getByRole('combobox',{name:'研究路径'}),'股东回报');
 assert.equal(requests('POST','/api/research/path').length,3,'Rapid edits produce one final classification');
});
test('semantic-path-network-fallback',{failures:{'POST /api/research/path':1}},async({page,requests})=>{
 await workbench(page);await page.locator('#question').fill('快速筛选贵州茅台');await textIncludes(page.locator('.path-picker'),'规则推荐');await textIncludes(page.locator('.path-picker'),'语义判断暂不可用');
 await enabled(page.locator('button[type=submit]'));await page.locator('button[type=submit]').click();await page.waitForURL(/\/research\//);
 const payload=requests('POST','/api/jobs')[0].body;assert.equal(payload.pathRuleFallback,true);assert.equal(payload.pathDecisionId,undefined);
});
screenJob.result.researchSummary=reviewFixture(screenJob.input).researchSummary;
screenJob.plan.knowledge=[{path:'knowledge/CORE.md',version:'4.1-core',sha256:'a'.repeat(64)},{path:'knowledge/FULL.md',version:'4.1',sha256:'b'.repeat(64)}];
for(const width of [320,1440])test(`quick-screen-fixed-scope-${width}`,{viewport:{width,height:1000}},async({page,requests,hold})=>{
 await workbench(page);await page.locator('#question').fill('研究贵州茅台的长期投资价值');await choose(page,'财报历史范围','近 8 年');await choose(page,'报告深度','完整展开');await page.locator('#question').fill('快速筛选贵州茅台');
 await textIncludes(page.locator('.security-chip'),'600519');
 await count(page.getByRole('combobox',{name:'报告深度'}),0);await count(page.getByRole('combobox',{name:'财报历史范围'}),0);
 await count(page.locator('.screen-scope,.research-plan'),0);
 assert.equal(requests('POST','/api/research/plan').length,0);
 await page.getByRole('textbox',{name:'筛选关注点'}).fill('优先核对现金流与存货（合成关注点）');
 await count(page.getByRole('button',{name:/持仓与风险约束/}),0);await noOverflow(page,`quick screen workbench ${width}`);await screenshot(page,`quick-screen-workbench-${width}`,'.research-workbench');
 assert.equal(requests('POST','/api/jobs').length,0);
 await page.getByRole('combobox',{name:'研究路径',exact:true}).click();await page.getByRole('option',{name:'深度研究',exact:true}).click();await enabled(page.getByRole('combobox',{name:'财报历史范围'}));
 await textIncludes(page.getByRole('combobox',{name:'财报历史范围'}),'近 8 年');await textIncludes(page.getByRole('combobox',{name:'报告深度'}),'完整展开');assert.equal(await page.locator('#question').inputValue(),'快速筛选贵州茅台');
 assert.equal(await page.getByRole('textbox',{name:'研究关注点'}).inputValue(),'优先核对现金流与存货（合成关注点）');
 await page.getByRole('combobox',{name:'研究路径',exact:true}).click();await page.getByRole('option',{name:'自动匹配',exact:true}).click();
 const release=hold('POST /api/jobs');await page.getByRole('button',{name:'开始快速筛选',exact:true}).click();await page.locator('#question').press('Control+Enter');
 await eventually(()=>requests('POST','/api/jobs').length===1,'Quick screen must submit once');const payload=requests('POST','/api/jobs')[0].body;
 assert.equal(payload.historyYears,5);assert.equal(payload.depth,'Quick');assert.equal(payload.mode,'auto');assert.equal(payload.portfolio,'优先核对现金流与存货（合成关注点）');release();
 await page.waitForURL(/\/research\//);await openProcess(page);await textIncludes(page.locator('.rd-meta'),'判断是否继续研究');
});
test('quick-screen-example-selection',{viewport:{width:320,height:1000}},async({page,requests})=>{
 await workbench(page);await page.getByRole('combobox',{name:'研究路径',exact:true}).click();await page.getByRole('option',{name:'快速筛选',exact:true}).click();
 await page.getByRole('button',{name:'比亚迪快速筛选',exact:false}).click();await textIncludes(page.locator('.security-chip'),'002594');
 await page.getByRole('heading',{name:'开启一项快速筛选',exact:true}).waitFor();await enabled(page.getByRole('button',{name:'开始快速筛选',exact:true}));assert.equal(requests('POST','/api/jobs').length,0);
 await page.locator('.page-scroll').evaluate(node=>node.scrollTop=0);await noOverflow(page,'quick screen question 320');
 await page.screenshot({path:fileURLToPath(new URL('ui-quick-screen-input-320.png',artifacts)),animations:'disabled'});
});

const screenDeepJob=makeJob(905,'completed',{mode:'A',question:'快速筛选比亚迪 · 界面合成验证',securities:[{market:'CN',symbol:'002594',name:'比亚迪'},{market:'HK',symbol:'01211',name:'比亚迪股份'}]});
screenDeepJob.result.decision={...reviewFixture(screenDeepJob.input).decision,action:'深度研究',missingData:['核对资本开支的实际用途（测试问题）']};
const screenWatchJob=structuredClone(screenDeepJob);screenWatchJob.id='00000000-0000-4000-8000-000000000906';screenWatchJob.result.decision.action='观察池';
for(const width of [320,1440])test(`quick-screen-follow-up-${width}`,{jobs:[screenDeepJob,screenWatchJob],viewport:{width,height:1000}},async({page,requests})=>{
 await detail(page,screenWatchJob);await page.locator('.rd-decision-disclosure').click();await textIncludes(page.locator('.rd-decision-evidence'),'先跟踪关键变化');await textIncludes(page.locator('.rd-decision-evidence'),'还有 1 项资料待核实');await count(page.getByRole('button',{name:'准备深度研究'}),0);
 await detail(page,screenDeepJob);await textIncludes(page.locator('.rd-decision-disclosure'),'1 项待核实');await page.locator('.rd-decision-disclosure').click();await textIncludes(page.locator('.rd-decision-evidence'),'值得进一步验证长期逻辑');
 await noOverflow(page,`quick screen decision ${width}`);await screenshot(page,`quick-screen-decision-${width}`,'.rd-decision-evidence');await page.keyboard.press('Escape');await page.getByRole('dialog',{name:'判断依据与验证条件',exact:true}).waitFor({state:'hidden'});
 await page.getByRole('button',{name:'准备深度研究',exact:true}).click();await page.locator('.research-workbench').waitFor();
 assert.equal(requests('POST','/api/jobs').length,0);await textIncludes(page.locator('.path-picker'),'深度研究');await textIncludes(page.getByRole('combobox',{name:'报告深度'}),'完整展开');
 assert.match(await page.locator('#question').inputValue(),/比亚迪/);await count(page.locator('.manual-securities .security-row'),2);
 assert.equal(await page.getByRole('textbox',{name:'标的1股票代码',exact:true}).inputValue(),'002594');
 assert.equal(await page.getByRole('textbox',{name:'标的2股票代码',exact:true}).inputValue(),'01211');
 assert.equal(requests('POST','/api/research/plan').length,0);
 assert.match(await page.getByRole('textbox',{name:'研究关注点'}).inputValue(),/上次快筛的待验证事项/);assert.match(await page.getByRole('textbox',{name:'研究关注点'}).inputValue(),/实际用途/);await noOverflow(page,`prepared deep ${width}`);
});
const screenPending=makeJob(907,'running',{mode:'A',question:'快速筛选合成标的'});delete screenPending.liveReport;
for(const width of [320,780,1440]){
 const jobs=['running','queued','completed','failed','cancelled'].map((status,index)=>makeJob(1100+index,status,{mode:'D'}));
 test(`progress-status-card-${width}`,{jobs,viewport:{width,height:1000}},async({page,requests})=>{
  for(const job of jobs){
   await detail(page,job);
   const card=page.getByLabel('研究进展',{exact:true});
   assert.equal(await card.getAttribute('data-progress-state'),job.status);
   const style=await card.evaluate(element=>({border:getComputedStyle(element).borderTopWidth,radius:getComputedStyle(element).borderRadius,font:getComputedStyle(element.querySelector('strong')).fontSize}));
   assert.equal(style.border,'1px');assert.equal(style.radius,'12px');assert.ok(parseFloat(style.font)>=14);
   await count(card.locator('.rd-spin'),job.status==='running'?1:0);
   await count(card.locator('.rd-progress-error'),job.status==='failed'?1:0);
   if(job.status==='failed')await textIncludes(card.locator('.rd-progress-error'),job.error);
   const trigger=card.getByRole('button',{name:'研究过程',exact:true});
   await trigger.focus();await page.keyboard.press('Enter');
   await page.getByRole('dialog',{name:'研究过程',exact:true}).waitFor();
   await closeProcess(page);
   await eventually(()=>trigger.evaluate(element=>element===document.activeElement),'Closing the process drawer restores keyboard focus');
   await noOverflow(page,`progress status ${job.status} ${width}`);
   if(job.status==='running')await screenshot(page,`progress-status-card-${width}`);
  }
  assert.equal(requests('POST','/api/jobs').length,0);
 });
}
screenPending.workflow.stages=screenPending.workflow.stages.map(stage=>({...stage,status:stage.id==='task'?'completed':stage.id==='evidence'?'running':'pending'}));
const screenFailed=makeJob(908,'failed',{mode:'A'}),screenCancelled=makeJob(909,'cancelled',{mode:'A'});
for(const width of [320,1440])test(`quick-screen-progress-${width}`,{jobs:[screenPending,screenFailed,screenCancelled],viewport:{width,height:1000}},async({page,requests})=>{
 await detail(page,screenPending);await textIncludes(page.locator('.rd-overview'),'正在读取研究资料');
 await count(page.getByRole('button',{name:'查看本次研究计划',exact:true}),0);
 await count(page.getByRole('tab',{name:'研究思路'}),0);await noOverflow(page,`quick progress ${width}`);
 for(const [job,title] of [[screenFailed,screenFailed.error],[screenCancelled,'快速筛选已取消']]){
  await detail(page,job);await textIncludes(page.locator('.rd-overview'),title);await count(page.getByRole('button',{name:'准备深度研究'}),0);await textIncludes(page.locator('.rd-empty'),'输入与执行记录');
  await count(page.getByRole('button',{name:'本次研究范围',exact:true}),0);
  await noOverflow(page,`quick screen detail ${width}`);
  if(job===screenFailed)await screenshot(page,`quick-screen-detail-${width}`,'.rd-main-column');
 }
 assert.equal(requests('POST','/api/jobs').length,0);
});
screenJob.events.push({type:'research_plan',message:'内部查证计划（不向读者显示）',approach:screenJob.plan.researchApproach},{type:'tool_result',toolName:'read_rules',message:'read_rules 已返回',result:{text:'internal-rule-fixture'}});
for(const width of [320,1440])test(`quick-screen-reader-export-${width}`,{jobs:[screenJob],viewport:{width,height:1000}},async({page})=>{
 await page.goto(`/research/${screenJob.id}?tab=approach`);
 await textIncludes(page.locator('.rd-panel:visible'),'合成研究报告');
 await eventually(()=>Promise.resolve(!new URL(page.url()).searchParams.has('tab')),'Removed approach URLs should return to the report');
 await count(page.locator('.rd-tab-list').getByRole('tab'),3);
 await count(page.getByRole('tab',{name:'研究思路'}),0);
 assert.doesNotMatch(await page.locator('.research-detail').innerText(),/internal-rule-fixture|内部查证计划|本次研究规则|knowledge\/(CORE|FULL)/);
 await noOverflow(page,`reader report ${width}`);await screenshot(page,`reader-report-${width}`,'.rd-report-card');
 const actions=await detailActions(page);
 const [download]=await Promise.all([page.waitForEvent('download'),downloadReport(page,actions,'报告、审计与来源')]);
 const exported=await readFile(await download.path(),'utf8');
 assert.match(exported,/合成研究报告/);assert.match(exported,/审计记录/);assert.match(exported,/来源目录/);
 assert.doesNotMatch(exported,/internal-rule-fixture|knowledge\/(CORE|FULL)|研究计划与证据判断|实际工具调用与资料获取/);
});

const auditCoverageJob=makeJob(903,'completed');
auditCoverageJob.result.validation.evidenceWindows=[
 {phase:'initial',evidenceIncluded:1,evidenceTotal:3,toolsIncluded:1,toolsTotal:2,citedSourcesWithoutExcerpt:['S2'],calculationEvidence:[{toolCallId:'synthetic',missingBlocks:[{sourceId:'S1',blockId:'p9'}]}]},
 {phase:'supplement',evidenceIncluded:3,evidenceTotal:3,toolsIncluded:2,toolsTotal:2,calculationEvidence:[]},
];
for(const width of [320,1440])test(`audit-coverage-${width}`,{jobs:[auditCoverageJob],viewport:{width,height:1000}},async({page,requests})=>{
 await page.goto(`/research/${auditCoverageJob.id}?tab=audit`);
 const coverage=page.getByLabel('复核资料范围',{exact:true});
 await textIncludes(coverage,'初次复核收到 1/3 段完整证据');
 await textIncludes(coverage,'补证复核收到 3/3 段完整证据');
 await textIncludes(coverage,'计算返回成功不代表参数已核实');
 await textIncludes(coverage,'重复片段不累加为新增证据');
 await noOverflow(page,`audit coverage ${width}`);await screenshot(page,`audit-coverage-${width}`,'.rd-validation');
 const actions=await detailActions(page),[download]=await Promise.all([page.waitForEvent('download'),downloadReport(page,actions)]);
 const text=await readFile(await download.path(),'utf8');
 assert.match(text,/补证复核收到 3\/3 段完整证据/);assert.match(text,/计算返回成功不代表参数已核实/);
 assert.equal(requests('POST','/api/jobs').length,0);
});

const vendorSourceJob=makeJob(900,'completed',{sources:[{id:'T1',title:'AAPL 利润表 · Tushare',provider:'Tushare Pro',official:false,type:'vendor-financials',date:'2025-12-31',dateBasis:'latest-report-period',url:'https://tushare.pro/document/2?doc_id=394',text:'合成结构化财务记录。币种、单位待官方原文核对。'}]});
const webSourceJob=makeJob(902,'completed',{sources:[
 {id:'S1',title:'行业统计原始正文（合成）',provider:'合成统计机构',type:'web-evidence',documentRead:true,authorityVerified:true,publishedAt:'2026-02-28',date:'2026-02-28',reportPeriod:'原文标题年度：2025（期间边界待核对）',fetchedAt:'2026-09-07T00:00:00Z',fromCache:true,url:'https://evidence.example.invalid/industry',text:'合成原文：用于核对来源类型、发布日期与统计期间。'},
 {id:'S2',title:'待核对网页正文（合成）',provider:'合成发布者',type:'web-evidence',documentRead:true,authorityVerified:false,publishedAt:null,reportPeriod:null,stale:true,fetchedAt:'2026-08-01T00:00:00Z',metadataWarnings:['原文未识别明确发布日期'],url:'https://evidence.example.invalid/policy',text:'合成原文：日期未知时不能用抓取日期代替。'},
]});
for(const width of [320,1440])test(`web-evidence-source-${width}`,{jobs:[webSourceJob],viewport:{width,height:1000}},async({page})=>{
 await page.goto(`/research/${webSourceJob.id}?tab=sources`);await page.getByRole('button',{name:'展开全部来源'}).click();
 const sources=page.locator('.rd-source');await count(sources,2);
 await textIncludes(sources.nth(0),'网页原文（补充）');await textIncludes(sources.nth(0),'发布日期：2026-02-28');await textIncludes(sources.nth(0),'2025');
 await textIncludes(sources.nth(1),'发布日期：原文未明确');await textIncludes(sources.nth(1),'发布者身份待核验');await textIncludes(sources.nth(1),'旧数据 · 待更新');
 await count(sources.getByText('行情数据',{exact:true}),0);await noOverflow(page,`web evidence ${width}`);await screenshot(page,`web-evidence-sources-${width}`,'.rd-sources');
});
const shareholderSourceJob=makeJob(901,'completed',{sources:[
 {id:'R1',title:'600519.SH 历史股本与变动快照',provider:'Tushare Pro',official:false,type:'shareholder-data',date:'2026-09-04',dateBasis:'latest-observation',url:'https://tushare.pro/document/2?doc_id=32',coverage:'2,106条交易日快照；股本单位为股',text:'合成记录。股本变动原因待公告核对。'},
 {id:'R2',title:'CN:600519 数据覆盖与口径检查',provider:'知衡数据检查',official:false,type:'data-check',date:'2026-09-06',coverage:'回购用途待核对；检查不代替原始证据',text:'合成检查。没有记录不等于零分红。'},
]});
for(const width of [320,1440])test(`shareholder-source-${width}`,{jobs:[shareholderSourceJob],viewport:{width,height:1000}},async({page})=>{
 await page.goto(`/research/${shareholderSourceJob.id}?tab=sources`);
 const sources=page.locator('.rd-source');await count(sources,2);
 await page.getByRole('button',{name:'展开全部来源'}).click();
 await textIncludes(sources.nth(0),'观测日 2026-09-04');await textIncludes(sources.nth(0),'股东回报（数据商）');
 await textIncludes(sources.nth(1),'数据覆盖检查');await count(sources.nth(1).getByRole('link'),0);
 await count(sources.getByText('官方披露',{exact:true}),0);await count(sources.getByText('行情数据',{exact:true}),0);
 await noOverflow(page,`shareholder sources ${width}`);await screenshot(page,`shareholder-sources-${width}`,'.rd-sources');
});
for(const width of [320,1440])test(`vendor-financial-source-${width}`,{jobs:[vendorSourceJob],viewport:{width,height:1000}},async({page})=>{
 await page.goto(`/research/${vendorSourceJob.id}?tab=sources`);
 const source=page.locator('.rd-source');await count(source,1);await textIncludes(source,'报告期 2025-12-31');
 await collapsible(source,true);await textIncludes(source,'结构化财务（数据商）');
 await count(source.getByText('官方披露',{exact:true}),0);await count(source.getByText('行情数据',{exact:true}),0);
 await source.getByRole('link',{name:'数据接口说明',exact:true}).waitFor();await noOverflow(page,`vendor source ${width}`);
});

for(const width of [320,1440])for(const stale of [false,true])test(`quote-outage-${stale?'cached':'backup'}-${width}`,{
 viewport:{width,height:1000},quoteOverrides:{provider:'腾讯财经公开行情（备用源）',fallbackReason:'模拟主源不可用',stale,
  ...(stale?{fromCache:true,warning:'行情源暂不可用，显示15分钟内成功获取的旧快照；请核对行情时间。'}:{})},
},async({page,requests})=>{
 await workbench(page);await page.locator('#question').fill('分析贵州茅台的现金流');
 await textIncludes(page.locator('.security-chip'),'600519');
 const card=page.locator('.quote-card');await textIncludes(card,'腾讯财经公开行情（备用源）');
 if(stale){await textIncludes(card.getByRole('status'),'旧快照');await count(card.getByText('主行情源暂不可用，已切换备用来源。',{exact:true}),0);}
 else await textIncludes(card,'主行情源暂不可用，已切换备用来源。');
 await textIncludes(card,'2026');await noOverflow(page,`quote outage ${width}`);
 assert.equal(requests('POST','/api/quotes').length,1);assert.equal(requests('POST','/api/jobs').length,0);
 await screenshot(page,`quote-outage-${stale?'cached':'backup'}-${width}`,'.data-connect');
});

for(const width of [320,1440])test(`quote-enriched-${width}`,{
 viewport:{width,height:1100},quoteOverrides:{previousClose:120,open:121.3,high:125.6,low:119.8,volume:25000000,turnover:3086250000},
},async({page,requests})=>{
 await workbench(page);await page.locator('#question').fill('分析贵州茅台的现金流');
 await textIncludes(page.locator('.security-chip'),'SH:600519');
 const logo=page.locator('.company-logo img');await logo.waitFor();assert.ok(await logo.evaluate(img=>img.complete&&img.naturalWidth>0));
 const card=page.locator('.market-quote');await textIncludes(card,'+2.875%');
 assert.equal(requests('POST','/api/quotes').length,1,'loads without a quote button click');
 assert.ok(await page.locator('.data-connect .section-title strong').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=16));
 assert.ok(await card.locator('.quote-metrics dd').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=17));
 await textIncludes(card,'2,500万股');await textIncludes(card,'30.86亿');
 await count(card.locator('.quote-range'),1);assert.equal(await card.locator('details').getAttribute('open'),null);
 await card.locator('summary').click();await textIncludes(card,'抓取于');
 await card.locator('summary').click();await page.getByRole('button',{name:'刷新行情',exact:true}).click();
 await page.getByRole('button',{name:'刷新行情',exact:true}).waitFor();assert.equal(requests('POST','/api/quotes').length,2);
 await noOverflow(page,`enriched quote ${width}`);await screenshot(page,`quote-enriched-${width}`,'.data-connect');
});

test('quote-refresh-failure-and-target-change',{quoteOverrides:{previousClose:130}},async({page})=>{
 await workbench(page);await page.locator('#question').fill('分析贵州茅台的现金流');
 const card=page.locator('.market-quote');await textIncludes(card,'123.45');
 assert.ok((await card.getAttribute('class')).includes('quote-down'));
 await count(card.locator('.quote-range'),0);await textIncludes(card.locator('.quote-metrics'),'—');
 await page.route('**/api/quotes',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'测试：行情服务暂不可用'})}));
 await page.getByRole('button',{name:'刷新行情',exact:true}).click();
 await textIncludes(page.getByRole('alert'),'行情服务暂不可用');await textIncludes(card,'123.45');
 await page.getByRole('button',{name:'手动调整',exact:true}).click();await page.getByRole('textbox',{name:'标的1股票代码',exact:true}).fill('601318');
 await count(page.locator('.market-quote'),0);await count(page.getByRole('alert'),0);
 await page.unroute('**/api/quotes');await textIncludes(page.locator('.market-quote'),'601318');
});

test('quote-auto-load-debounces-and-cancels-old-target',{},async({page,requests,hold})=>{
 await workbench(page);assert.equal(requests('POST','/api/quotes').length,0);
 await page.getByRole('button',{name:'手动调整',exact:true}).click();
 const input=page.getByRole('textbox',{name:'标的1股票代码',exact:true});
 await input.fill('60');await delay(500);assert.equal(requests('POST','/api/quotes').length,0,'invalid codes do not fetch');
 const release=hold('POST /api/quotes');
 const firstRequest=page.waitForRequest(r=>r.url().endsWith('/api/quotes'));
 await input.pressSequentially('0519',{delay:35});await firstRequest;
 await page.locator('.quote-loading').waitFor();await enabled(page.getByRole('button',{name:'加载中…',exact:true}),false);
 assert.equal(requests('POST','/api/quotes').length,1,'typing triggers only one stable request');
 const nextRequest=page.waitForRequest(r=>r.url().endsWith('/api/quotes')&&r.postDataJSON().securities[0].symbol==='601318');
 await input.fill('601318');await nextRequest;release();
 await textIncludes(page.locator('.market-quote'),'601318');await count(page.locator('.market-quote').getByText(/600519/),0);
 assert.equal(requests('POST','/api/quotes').length,2);
});

const comparisonSecurities=[{market:'CN',symbol:'002594',name:'比亚迪'},{market:'CN',symbol:'601633',name:'长城汽车'},{market:'CN',symbol:'601127',name:'赛力斯'}];
for(const width of [320,780,1440])test(`multi-company-quotes-${width}`,{
 viewport:{width,height:1100},resolvedSecurities:comparisonSecurities,quoteOverrides:{previousClose:120,open:121,high:125,low:119,volume:25000000,turnover:3086250000},
},async({page,requests})=>{
 await workbench(page);await page.locator('#question').fill('比较比亚迪（002594）、长城汽车（601633）和赛力斯（601127）的现金流');
 const list=page.getByRole('tablist',{name:'切换公司行情',exact:true});await list.waitFor();await count(list.getByRole('tab'),3);
 await textIncludes(page.locator('.market-quote'),'002594');await count(page.locator('.market-quote'),1);
 assert.equal(requests('POST','/api/quotes').length,1);assert.equal(requests('POST','/api/quotes')[0].body.securities.length,3);
 assert.ok(await list.locator('img').evaluateAll(images=>images.length===3&&images.every(img=>img.complete&&img.naturalWidth>0)));
 const tabPositions=await list.getByRole('tab').evaluateAll(tabs=>tabs.map(tab=>{const rect=tab.getBoundingClientRect();return {x:rect.x,y:rect.y};}));
 assert.ok(tabPositions.every(tab=>Math.abs(tab.x-tabPositions[0].x)<2),'Company cards share a vertical column');
 assert.ok(tabPositions[2].y>tabPositions[1].y&&tabPositions[1].y>tabPositions[0].y);
 await list.getByRole('tab').nth(0).focus();await page.keyboard.press('ArrowDown');await textIncludes(page.locator('.market-quote'),'601633');
 await list.getByRole('tab').nth(2).click();await textIncludes(page.locator('.market-quote'),'601127');await count(page.locator('.market-quote'),1);
 assert.ok(await list.evaluate(el=>{const tab=el.querySelector('[aria-selected=true]').getBoundingClientRect(),rect=el.getBoundingClientRect();return tab.left>=rect.left-1&&tab.right<=rect.right+1;}),'Company cards fit the available width');
 assert.equal(requests('POST','/api/quotes').length,1,'Switching companies reuses loaded quotes');
 await page.getByRole('button',{name:'刷新全部行情',exact:true}).click();await page.getByRole('button',{name:'刷新全部行情',exact:true}).waitFor();
 assert.equal(requests('POST','/api/quotes').length,2);assert.equal(await list.getByRole('tab').nth(2).getAttribute('aria-selected'),'true');
 await noOverflow(page,`multi company ${width}`);await screenshot(page,`multi-company-quotes-${width}`,'.data-connect');
});
test('multi-company-partial-quote-failure',{resolvedSecurities:comparisonSecurities,quoteFailures:['601633']},async({page,requests})=>{
 await workbench(page);await page.locator('#question').fill('比较比亚迪、长城汽车和赛力斯');
 const list=page.getByRole('tablist',{name:'切换公司行情',exact:true});await textIncludes(list,'行情暂不可用');
 await textIncludes(page.locator('.market-quote'),'002594');await list.getByRole('tab').nth(1).click();
 await page.locator('.quote-failed').waitFor();await textIncludes(page.getByRole('alert'),'该公司行情暂不可用');
 await list.getByRole('tab').nth(2).click();await textIncludes(page.locator('.market-quote'),'601127');
 assert.equal(requests('POST','/api/quotes').length,1);
});

test('empty-workbench', {}, async ({page, requests}) => {
  await workbench(page);
  await count(page.locator('.research-workbench').getByText('查看研究记录', {exact: true}), 0);
  await count(page.locator('.workspace-history-link'), 0);
  await shadcnButtons(page.getByRole('button', {name: /^开始(?:深度)?研究$/, exact: true}));
  assert.equal(await page.locator('#question').inputValue(), '');
  await count(page.locator('.security-chip'), 0);
  await count(page.locator('.recent-research'), 0);
  await enabled(page.getByRole('button', {name: /^开始(?:深度)?研究$/, exact: true}), false);
  await textIncludes(page.locator('.composer-readiness'), '先写下');
  await page.locator('#question').press('Control+Enter');
  await page.locator('#question').fill('   ');
  await page.locator('#question').press('Control+Enter');
  await enabled(page.getByRole('button', {name: /^开始(?:深度)?研究$/, exact: true}), false);
  await screenshot(page, 'empty-workbench-1440');
  await openHistory(page);
  await page.getByRole('heading', {name: '从第一项研究开始积累', exact: true}).waitFor();
  await page.getByRole('button', {name: '开始第一项研究'}).click();
  await page.locator('.research-workbench').waitFor();
  assert.equal(requests('POST', '/api/jobs').length, 0);
});

for(const width of [320,1440])test(`submission-recovery-${width}`,{viewport:{width,height:1000},loseCreateResponse:true},async({page,requests,db})=>{
 await workbench(page);await page.locator('#question').fill('研究贵州茅台');await textIncludes(page.locator('.security-chip'),'600519');
 await page.locator('button[type=submit]').click();await page.getByText(/暂时无法确认提交结果/).waitFor();
 assert.equal(db.size,1);const first=requests('POST','/api/jobs')[0],original=[...db.values()][0];assert.ok(first.submissionKey);
 await page.reload();await page.locator('.research-workbench').waitFor();assert.equal(await page.locator('#question').inputValue(),'研究贵州茅台');
 await textIncludes(page.locator('.security-chip'),'600519');await page.locator('button[type=submit]').click();await page.waitForURL('/research/'+original.id);
 assert.equal(db.size,1);assert.equal(requests('POST','/api/jobs')[1].submissionKey,first.submissionKey);
 assert.deepEqual(requests('POST','/api/jobs')[1].body,first.body);await noOverflow(page,`recovered submission ${width}`);
 await workbench(page);assert.equal(await page.locator('#question').inputValue(),'');
 await page.locator('#question').fill('研究贵州茅台');await textIncludes(page.locator('.security-chip'),'600519');await page.locator('button[type=submit]').click();await page.waitForURL(/\/research\//);
 assert.equal(db.size,2);assert.notEqual(requests('POST','/api/jobs')[2].submissionKey,first.submissionKey);
});

for (const trigger of ['button', 'ctrl-enter']) test(`submit-${trigger}`, {}, async ({page, requests, hold}) => {
  await workbench(page);
  if (trigger === 'button') {
    await manualInput(page);
    await choose(page, '标的1市场', '美股');
    await page.getByRole('textbox', {name: '标的1股票代码', exact: true}).fill('AAPL');
    await page.locator('#question').fill('UI验证：手动核对苹果公司的长期现金流');
    assert.equal(await page.getByRole('textbox', {name: '标的1股票代码', exact: true}).inputValue(), 'AAPL');
    await page.getByRole('combobox',{name:'研究路径',exact:true}).click();
    await page.getByRole('option',{name:'股东回报',exact:true}).click();
    await count(page.getByRole('combobox', {name: '财报历史范围'}), 0);
    await textIncludes(page.locator('.settings-fixed'), '近 8 年');
    await page.getByRole('combobox',{name:'研究路径',exact:true}).click();
    await page.getByRole('option',{name:'深度研究',exact:true}).click();
    await choose(page, '报告深度', '完整展开');
    await choose(page, '财报历史范围', '近 3 年');

    await page.getByRole('textbox', {name: '研究关注点'}).fill('UI合成背景：持有三年，关注现金回报。');
    await textIncludes(page.getByRole('combobox',{name:'财报历史范围'}),'近 3 年');
  } else {
    await page.locator('#question').fill('分析贵州茅台的现金流质量');
    await textIncludes(page.locator('.security-chip'), '600519');
    await enabled(page.getByRole('button', {name: /^开始(?:深度)?研究$/, exact: true}));
  }
  await screenshot(page, `configured-${trigger}-1440`);
  const release = hold('POST /api/jobs');
  if (trigger === 'button') await page.getByRole('button', {name: /^开始(?:深度)?研究$/, exact: true}).click();
  else await page.locator('#question').press('Control+Enter');
  await eventually(() => requests('POST', '/api/jobs').length === 1, 'Submission was not sent');
  const busyButton = page.locator('button[type="submit"]');
  await enabled(busyButton, false);
  for (let i = 0; i < 3; i++) await page.locator('#question').press('Control+Enter');
  // A physical second click on the disabled button must also be ignored.
  await busyButton.scrollIntoViewIfNeeded();
  const box = await busyButton.boundingBox();
  assert.ok(box, 'Submit button should remain visible while creating');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  assert.equal(requests('POST', '/api/jobs').length, 1, 'Duplicate submission while request is pending');
  const payload = requests('POST', '/api/jobs')[0].body;
  if (trigger === 'button') {
    assert.deepEqual(payload, {question: 'UI验证：手动核对苹果公司的长期现金流', mode: 'B', depth: 'Deep',
      historyYears: 3, portfolio: 'UI合成背景：持有三年，关注现金回报。', securities: [{market: 'US', symbol: 'AAPL'}]});
  } else {
    assert.equal(payload.question, '分析贵州茅台的现金流质量');
    assert.deepEqual(payload.securities, [{market: 'CN', symbol: '600519'}]);
    assert.equal(payload.mode, 'auto');
  }
  release();
  await page.waitForURL(/\/research\/[\da-f-]+$/);
  await page.locator('.research-detail').waitFor();
  await page.getByRole('heading', {name: payload.question, exact: true}).waitFor();
  assert.equal(requests('POST', '/api/jobs').length, 1, 'Duplicate submission after completion');
});

const exchangeJobs=[
 makeJob(981,'completed',{securities:[{market:'CN',symbol:'002594'},{market:'CN',symbol:'600519'},{market:'HK',symbol:'01211'}]}),
 makeJob(982,'completed',{securities:[{market:'US',symbol:'AAPL'},{market:'US',symbol:'BRK-B'},{market:'US',symbol:'UNKNOWN'}]}),
];
for(const width of [320,1440])test(`history-exchange-prefixes-${width}`,{jobs:exchangeJobs,viewport:{width,height:1000}},async({page,requests})=>{
 await page.goto('/history');await count(page.locator('.rh-row'),2);
 const codes=page.locator('.rh-security');
 await eventually(async()=> (await codes.allTextContents()).some(text=>text.includes('NASDAQ:AAPL')),'US exchange lookup should complete');
 for(const code of ['SZ:002594','SH:600519','HK:01211','NASDAQ:AAPL','NYSE:BRK-B','US:UNKNOWN'])await textIncludes(codes.filter({hasText:code}),code);
 await count(codes.filter({hasText:'UNKNOWN'}).filter({hasText:'NASDAQ'}),0);
 assert.match(await codes.filter({hasText:'UNKNOWN'}).getAttribute('title'),/待核实/);
 assert.equal(requests('POST','/api/securities/exchanges').length,1);
 await noOverflow(page,`history exchange prefixes ${width}`);await screenshot(page,`history-exchange-prefixes-${width}`);
 await page.getByRole('searchbox',{name:'搜索研究问题、模式或标的'}).fill('NYSE:BRK-B');await count(page.locator('.rh-row'),1);
 await count(page.locator('.rh-securities mark'),1);
});

function historyModeFixtures(){
 const jobs=Object.keys(modes).flatMap((mode,index)=>['completed','running','failed'].map((status,offset)=>makeJob(200+index*3+offset,status,{mode,question:`${modes[mode].name}验证 · ${status==='running'?'经营趋势':'现金流'} AAPL`})));
 jobs.push(...Array.from({length:7},(_,index)=>makeJob(230+index,'completed',{mode:'B',question:`补充现金流研究 ${index+1} AAPL`})));
 const resolved=makeJob(260,'completed',{mode:'C',question:'历史自动路由现金流更新 AAPL'});
 resolved.mode='auto';resolved.input.mode='auto';jobs.push(resolved);
 const unknown=makeJob(261,'completed',{question:'未记录模式的历史研究 AAPL'});
 delete unknown.mode;delete unknown.plan.mode;delete unknown.input.mode;jobs.push(unknown);
 const automatic=makeJob(262,'completed',{mode:'auto',question:'仅保留自动路由的历史研究 AAPL'});
 automatic.mode='auto';delete automatic.plan.mode;jobs.push(automatic);
 return jobs;
}

for(const width of [320,1440])test(`history-mode-filter-${width}`,{jobs:historyModeFixtures(),viewport:{width,height:1000}},async({page})=>{
 await page.goto('/history?sort=oldest&page=2');
 const rows=page.locator('.rh-row'),badges=page.locator('.rh-mode');
 const status=page.getByRole('group',{name:'按研究状态筛选',exact:true});
 await count(rows,8);
 await count(rows.locator('.rh-mode-row'),0);
 await count(rows.getByText('研究模式',{exact:true}),0);
 await count(rows.locator('.rh-meta .rh-mode'),8);
 for(const row of await rows.all()){
  const title=await row.locator('.rh-title').boundingBox(),tag=await row.locator('.rh-mode').boundingBox();
  assert.ok(tag.y>=title.y+title.height,'Research type belongs beneath the title and subject');
  await textIncludes(row.locator('.rh-row-state'),'执行状态');
 }
 let sidebar=page.locator('.desktop-sidebar');
 if(width<1024){
  await page.getByRole('button',{name:'打开导航菜单',exact:true}).click();
  sidebar=page.getByRole('dialog',{name:'研究导航',exact:true});
  await sidebar.waitFor();
 }
 const recentModes=sidebar.locator('.rr-mode');
 // The compact recent list shows status and outcome; mode labels and filters
 // belong to the full history list, verified above and below.
 await count(recentModes,0);
 await count(sidebar.locator('.rr-link'),4);
 await count(sidebar.locator('.rr-status'),4);
 await count(sidebar.locator('.rr-mode-row'),0);
 await count(sidebar.locator('.rr-list').getByText('研究模式',{exact:true}),0);
 await noOverflow(page,'recent mode labels '+width);
 await screenshot(page,'recent-mode-labels-'+width);
 if(width<1024){await page.keyboard.press('Escape');await sidebar.waitFor({state:'hidden'});}
 await choose(page,'按研究模式筛选',modes.B.name);
 await queryIs(page,{mode:'B',page:null,sort:'oldest'});
 await textIncludes(page.locator('.rh-page-number'),'1 / 2');
 await count(rows,8);
 assert.ok((await badges.evaluateAll(items=>items.map(item=>item.getAttribute('data-mode')))).every(mode=>mode==='B'));
 await textIncludes(status.getByRole('button',{name:/^全部/}).locator('.rh-filter-count'),'10');
 await page.getByRole('button',{name:'下一页研究记录'}).click();await count(rows,2);
 await status.getByRole('button',{name:/^已完成/}).click();
 await queryIs(page,{mode:'B',status:'completed',page:null});await count(rows,8);
 const search=page.getByRole('searchbox',{name:'搜索研究问题、模式或标的'});
 await search.fill('补充');await count(rows,7);
 await textIncludes(status.getByRole('button',{name:/^全部/}).locator('.rh-filter-count'),'7');
 await textIncludes(page.locator('.rh-results-note'),modes.B.name);
 await choose(page,'按研究模式筛选',modes.A.name);
 await count(rows,0);await page.getByRole('heading',{name:'没有找到匹配的研究',exact:true}).waitFor();
 await page.locator('.rh-results-heading').getByRole('button',{name:'清除筛选',exact:true}).click();
 await queryIs(page,{mode:null,status:null,q:null,page:null,sort:'oldest'});await count(rows,8);
 for(const [mode,expected] of [['A',3],['B',8],['C',4],['D',3],['E',3],['F',3]]){
  await choose(page,'按研究模式筛选',modes[mode].name);await queryIs(page,{mode});await count(rows,expected);
  await eventually(async()=> (await badges.evaluateAll(items=>items.map(item=>item.getAttribute('data-mode')))).every(value=>value===mode),`Rows should match selected mode ${mode}`);
  assert.deepEqual(await badges.allTextContents(),Array(expected).fill(modes[mode].name));
 }
 await choose(page,'按研究模式筛选','自动匹配');await count(rows,1);await textIncludes(badges,'自动匹配');
 await choose(page,'按研究模式筛选','未记录');await count(rows,1);await textIncludes(badges,'未记录');
 await choose(page,'按研究模式筛选',modes.C.name);await queryIs(page,{mode:'C'});await page.reload();
 await count(rows,4);await textIncludes(page.getByRole('combobox',{name:'按研究模式筛选'}),modes.C.name);
 await textIncludes(page.locator('.rh-results-note'),'4 项匹配研究');
 await noOverflow(page,'mode-filtered history '+width);await screenshot(page,'history-mode-filter-'+width);
 await choose(page,'按研究模式筛选','全部研究模式');await count(rows,8);await queryIs(page,{mode:null});
 await screenshot(page,'history-mode-labels-'+width);
 await page.getByRole('combobox',{name:'按研究模式筛选'}).click();await noOverflow(page,'mode choices '+width);
 await page.screenshot({path:fileURLToPath(new URL(`ui-history-mode-options-${width}.png`,artifacts)),animations:'disabled'});
 await page.keyboard.press('Escape');
 await page.goto('/history?mode=invalid&status=failed');await count(rows,6);
 await textIncludes(page.getByRole('combobox',{name:'按研究模式筛选'}),'全部研究模式');
});

for(const width of [320,1440])test(`history-follow-up-entries-${width}`,{jobs:historyFixtures(),viewport:{width,height:1000}},async({page,requests})=>{
 await page.goto('/history?sort=oldest&page=2');
 const follow=page.getByRole('region',{name:'继续跟进研究'}),rows=page.locator('.rh-row');
 await follow.waitFor();
 await follow.getByRole('button',{name:/8 项进行中/}).click();
 await queryIs(page,{status:'active',sort:'oldest',page:null});await count(rows,8);
 await eventually(async()=> (await rows.evaluateAll(items=>items.map(item=>item.dataset.status))).every(status=>['queued','running'].includes(status)),'Follow-up entry must show active research');
 await count(follow,0);
 await page.getByRole('button',{name:'清除筛选',exact:true}).click();await follow.waitFor();
 await follow.getByRole('button',{name:/3 项失败/}).click();
 await queryIs(page,{status:'failed',sort:'oldest',page:null});await count(rows,3);
 await eventually(async()=> (await rows.evaluateAll(items=>items.map(item=>item.dataset.status))).every(status=>status==='failed'),'Follow-up entry must show failed research');
 await noOverflow(page,'follow-up results '+width);
 assert.equal(requests('POST','/api/jobs').length,0);
});

test('history-search-sort-pagination', {jobs: historyFixtures()}, async ({page, db}) => {
  await page.goto('/history');
  const rows = page.locator('.rh-row'), links = page.locator('.rh-open');
  const ordered = [...db.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  await count(rows, 8);
  await count(page.locator('.research-history').getByText('研究档案', {exact: true}), 0);
  await count(page.locator('.rh-overview, .rh-summary'), 0);
  const filters = page.getByRole('group', {name: '按研究状态筛选', exact: true});
  await count(filters, 1);
  await count(filters.getByRole('button'), 5);
  await count(page.getByRole('group', {name: '研究统计概览，点击按状态筛选', exact: true}), 0);
  await shadcnButtons(filters.getByRole('button'));
  await textIncludes(page.locator('.rh-results-note'), '共 18 项研究');
  await eventually(async () => await links.first().getAttribute('href') === `/research/${ordered.at(-1).id}`, 'Newest job must sort first');
  await enabled(page.getByRole('button', {name: '上一页研究记录'}), false);
  await page.getByRole('button', {name: '下一页研究记录'}).click();
  await queryIs(page, {page: '2'});
  await textIncludes(page.locator('.rh-page-number'), '2 / 3');
  await eventually(async () => await links.first().getAttribute('href') === `/research/${ordered[9].id}`, 'Second page must begin with the ninth newest job');
  await page.getByRole('button', {name: '下一页研究记录'}).click();
  await count(rows, 2);
  await enabled(page.getByRole('button', {name: '下一页研究记录'}), false);
  await page.getByRole('button', {name: '上一页研究记录'}).click();
  await count(rows, 8);
  await choose(page, '研究排序', '最早创建优先');
  await queryIs(page, {sort: 'oldest', page: null});
  await eventually(async () => await links.first().getAttribute('href') === `/research/${ordered[0].id}`, 'Oldest job must sort first after the list commits');
  const search = page.getByRole('searchbox', {name: '搜索研究问题、模式或标的'});
  await search.fill('aapl');
  await queryIs(page, {q: 'aapl'});
  await textIncludes(page.locator('.rh-results-note'), '18 项匹配研究');
  await search.fill('现金流');
  await textIncludes(page.locator('.rh-results-note'), '9 项匹配研究');
  await count(page.locator('.rh-title mark'), 8);
  await textIncludes(filters.getByRole('button', {name: /^全部/}).locator('.rh-filter-count'), '9');
  await page.getByRole('group', {name: '按研究状态筛选'}).getByRole('button', {name: /^进行中/}).click();
  const active = ordered.filter(job => ['queued', 'running'].includes(job.status) && job.input.question.includes('现金流'));
  await count(rows, active.length);
  for (const row of await rows.all()) {
    assert.match(await row.innerText(), /现金流/);
    assert.match(await row.innerText(), /等待中|研究中/);
    await enabled(row.getByRole('button', {name: /^删除研究/}), false);
  }
  await queryIs(page, {status: 'active', page: null});
  await page.reload();
  await count(rows, active.length);
  assert.equal(await search.inputValue(), '现金流');
  assert.equal(await page.getByRole('group', {name: '按研究状态筛选'}).getByRole('button', {name: /^进行中/}).getAttribute('aria-pressed'), 'true');
  await search.fill('ui-no-such-research');
  await page.getByRole('heading', {name: '没有找到匹配的研究', exact: true}).waitFor();
  await count(rows, 0);
  await screenshot(page, 'history-no-results');
  await page.getByRole('button', {name: '清空搜索', exact: true}).click();
  await queryIs(page, {q: null, status: 'active'});
  await count(rows, 8);
  await search.fill('ui-no-such-research');
  await page.locator('.rh-empty').getByRole('button', {name: '清除筛选', exact: true}).click();
  await queryIs(page, {q: null, status: null, page: null, sort: 'oldest'});
  await count(rows, 8);
  await search.fill('AAPL');
  await search.press('Escape');
  await queryIs(page, {q: null});
  await count(page.locator('.rh-title mark'), 0);
  assert.equal(await search.evaluate(element=>document.activeElement===element), true);
  await screenshot(page, 'history-1440');
});

test('history-delete-confirmation', {jobs: historyFixtures()}, async ({page, db, requests, hold}) => {
  const job = [...db.values()].find(item => item.id === makeJob(18).id), path = `/api/jobs/${job.id}`;
  await page.goto('/history');
  const remove = page.getByRole('button', {name: `删除研究：${job.input.question}`, exact: true});
  await remove.click();
  const dialog = page.getByRole('alertdialog', {name: '删除这项研究？'});
  await dialog.waitFor();
  await textIncludes(dialog, job.input.question);
  assert.equal(requests('DELETE', path).length, 0, 'Opening confirmation must not delete');
  await page.keyboard.press('Escape');
  await dialog.waitFor({state: 'hidden'});
  await remove.click();
  await dialog.getByRole('button', {name: '保留研究'}).click();
  await dialog.waitFor({state: 'hidden'});
  assert.equal(requests('DELETE', path).length, 0, 'Dismissal must preserve research');
  await remove.click();
  await screenshot(page, 'delete-confirmation');
  const release = hold(`DELETE ${path}`);
  await dialog.getByRole('button', {name: '确认删除'}).click();
  await eventually(() => requests('DELETE', path).length === 1, 'Delete request missing');
  await enabled(dialog.getByRole('button', {name: '删除中…'}), false);
  await page.keyboard.press('Escape');
  assert.ok(await dialog.isVisible(), 'Pending deletion must keep its confirmation visible');
  release();
  await dialog.waitFor({state: 'hidden'});
  await count(remove, 0);
  await textIncludes(page.locator('.rh-results-note'), '共 17 项研究');
  assert.equal(db.has(job.id), false);
  assert.equal(requests('DELETE', path).length, 1);
  await page.reload();
  await textIncludes(page.locator('.rh-results-note'), '共 17 项研究');
});

test('recent-detail-tabs-reading-outline-sources', {jobs: historyFixtures()}, async ({page, db}) => {
  const job = db.get(makeJob(18).id);
  await workbench(page);
  const recent = page.locator('.desktop-sidebar .rr-link');
  await count(recent, 4);
  await recent.first().click();
  await page.waitForURL(`**/research/${job.id}`);
  await page.locator('.research-detail').waitFor();
  await count(recent.locator('.rr-status'), 4);
  await count(recent.locator('time[datetime]'), 4);
  assert.equal(await recent.first().locator('time').getAttribute('datetime'),new Date(job.createdAt).toISOString());
  assert.equal(await recent.first().locator('.rr-title').innerText(),job.input.question);
  assert.equal(await recent.first().getAttribute('data-slot'), 'button');
  assert.equal(await recent.first().getAttribute('aria-current'), 'page');
  await page.getByRole('heading', {name: job.input.question, exact: true}).waitFor();
  await enabled(page.getByRole('button', {name: '导出报告'}));
  await page.getByRole('button', {name: '阅读模式', exact: true}).click();
  assert.equal(await page.getByRole('button', {name: '退出阅读模式'}).getAttribute('aria-pressed'), 'true');
  await count(page.locator('.rd-trace-aside:visible'), 0);
  const outline = await openDirectory(page);
  assert.equal(await outline.getAttribute('data-slot'), 'card');
  await count(outline.locator('summary'), 0);
  await jumpToHeading(page, outline.getByRole('navigation', {name: '报告目录', exact: true}), '风险与证伪条件');
  const historyBeforeTab = await page.evaluate(() => history.length);
  await page.getByRole('tab', {name: '审计记录', exact: true}).click();
  await queryIs(page, {tab: 'audit'});
  await page.getByRole('heading', {name: '合成审计记录', exact: true}).waitFor();
  const historyAfterTab = await page.evaluate(() => history.length);
  assert.equal(historyAfterTab - historyBeforeTab, 1,
    `One audit-tab click must push exactly one history entry (before=${historyBeforeTab}, after=${historyAfterTab})`);
  await page.goBack();
  await queryIs(page, {tab: null});
  await page.getByRole('heading', {name: '合成研究报告', exact: true}).waitFor();
  await page.goForward();
  await queryIs(page, {tab: 'audit'});
  await page.getByRole('tab', {name: /^证据来源/}).click();
  await queryIs(page, {tab: 'sources'});
  await page.reload();
  await count(page.locator('.rd-source'), 3);
  assert.equal(await page.getByRole('tab', {name: /^证据来源/}).getAttribute('aria-selected'), 'true');
  const search = page.getByRole('searchbox', {name: '搜索证据来源'});
  for (const term of ['年度报告', 's1', 'UI测试披露中心']) {
    await search.fill(term);
    await count(page.locator('.rd-source'), 1);
    await textIncludes(page.locator('.rd-source'), 'S1');
  }
  await search.fill('ui-no-such-source');
  await page.getByRole('heading', {name: '没有匹配的证据来源', exact: true}).waitFor();
  await page.getByRole('button', {name: '清除搜索', exact: true}).click();
  await count(page.locator('.rd-source'), 3);
  assert.equal(await search.inputValue(), '');
  await collapsible(page.locator('.rd-source').first(), true);
  await page.getByRole('region', {name: 'S1 正文预览'}).waitFor();
  await collapsible(page.locator('.rd-source').first(), false);
  await page.getByRole('region', {name: 'S1 正文预览'}).waitFor({state: 'hidden'});
  await collapsible(page.locator('.rd-source').first(), true);
  await screenshot(page, 'detail-sources-1440', '.rd-tab-list');
  await page.getByRole('tab', {name: '研究报告', exact: true}).click();
  await queryIs(page, {tab: null});
  await page.getByRole('button', {name: '阅读模式', exact: true}).click();
  await screenshot(page, 'detail-reading-1440', '.rd-tab-list');
  await page.getByRole('button', {name: '退出阅读模式'}).click();
  await page.locator('.rd-trace-aside:visible').waitFor();
});

for (const width of [1024, 1440]) test(`detail-sticky-desktop-${width}`, {
  jobs: [scrollingJob], viewport: {width, height: 1000},
}, async ({page, requests}) => {
  await detail(page, scrollingJob);
  const header = page.locator('.rd-header');
  await count(header.getByText('研究详情', {exact: true}), 0);
  await count(header.locator('h1'), 1);
  await textIncludes(header.locator('h1'), scrollingJob.input.question);
  await count(header.locator('.rd-status'), 0);
  assert.equal(await page.locator('.rd-overview').getAttribute('data-progress-state'),'completed');
  assert.equal(await header.evaluate(element => getComputedStyle(element).position), 'sticky', 'Detail title header must be sticky');
  assert.equal(await page.locator('.rd-layout').evaluate(element => getComputedStyle(element).display), 'grid');
  const outline = await openDirectory(page);
  await outline.waitFor();
  assert.equal(await outline.getAttribute('data-slot'), 'card');
  await count(outline.locator('summary'), 0);
  const nav = outline.getByRole('navigation', {name: '报告目录', exact: true});
  await nav.waitFor();
  const actions = await detailActions(page);
  await actionLayout(actions, false);
  await dismissDetailSheet(page);
  const columns = await stickyPositions(page, {report: '.rd-report-card', right: '.rd-right-rail'});
  assert.ok(columns.report.x + columns.report.width <= columns.right.x + 1,
    `Detail layout must separate content and trace: ${JSON.stringify(columns)}`);
  await count(page.locator('.rd-directory-rail'),0);
  await count(page.locator('.rd-header').getByRole('button', {name: /^打开报告目录$|^打开研究操作$/}), 0);
  await noOverflow(page, `three-column detail ${width}`);

  // Move beyond each element's original position, then scroll a second time.
  // A position:sticky declaration alone cannot satisfy this check.
  await wheelReport(page, 1100);
  const selectors = {title: '.rd-header h1', outline: '.rd-content-toolbar', actions: '.rd-desktop-tools .rd-action-panel'};
  const before = await stickyPositions(page, selectors);
  const reportBefore = await page.locator('.rd-markdown').boundingBox();
  await wheelReport(page, 850);
  const after = await stickyPositions(page, selectors);
  positionsUnchanged(before, after, `desktop ${width}`);
  const reportAfter = await page.locator('.rd-markdown').boundingBox();
  assert.ok(reportAfter.y <= reportBefore.y - 650, 'Report body must move while title, directory and actions stay in place');
  const headerBox = await header.boundingBox();
  assert.ok(after.title.y >= 0 && after.title.y + after.title.height <= page.viewportSize().height, 'Research title must remain in the viewport');
  assert.ok(after.outline.y >= headerBox.y + headerBox.height - 1 && after.outline.y + after.outline.height <= page.viewportSize().height + 1, 'Outline must remain visible below the sticky header');
  assert.ok(Math.abs(after.actions.y+after.actions.height/2-after.title.y-after.title.height/2)<=2, 'Actions must share the title row');
  assert.ok(Math.abs(after.actions.x+after.actions.width-headerBox.x-headerBox.width)<=2, 'Actions must align to the right edge of the sticky header');
  assert.ok(after.title.x+after.title.width+12<=after.actions.x, 'Title must not overlap the action buttons');
  await page.screenshot({path: fileURLToPath(new URL(`ui-sticky-scrolled-${width}.png`, artifacts)), animations: 'disabled'});
  await openDirectory(page);
  await jumpToHeading(page, nav, '滚动定位验证 08');
  await openDirectory(page);
  await jumpToHeading(page, nav, '滚动定位验证 02');
  await traceChecks(page);
  assert.equal(requests('POST', '/api/jobs').length, 0, 'Reading and trace interactions must not create research');
});

for (const width of [320, 390, 768, 1023]) test(`detail-sticky-mobile-sheets-${width}`, {
  jobs: [scrollingJob], viewport: {width, height: 900},
}, async ({page, requests}) => {
  await detail(page, scrollingJob);
  const header = page.locator('.rd-header');
  await count(header.getByText('研究详情', {exact: true}), 0);
  await textIncludes(header.locator('h1'), scrollingJob.input.question);
  assert.equal(await header.evaluate(element => getComputedStyle(element).position), 'sticky');
  // The directory appears after entering the report body, not over the summary.
  await wheelReport(page,1100);
  const outlineTrigger = page.getByRole('button', {name: '打开报告目录', exact: true});
  await enabled(outlineTrigger);
  const actionTrigger = header.getByRole('button', {name: '打开研究操作', exact: true});
  await shadcnButtons(outlineTrigger, 'sheet-trigger');
  await shadcnButtons(actionTrigger, 'sheet-trigger');
  await count(page.locator('.rd-directory-rail .rd-outline:visible, .rd-desktop-tools .rd-action-panel:visible'), 0);
  const trace = page.locator('.rd-trace-aside:visible');
  await count(trace, 1);
  assert.equal(await trace.evaluate(element => Boolean(element.closest('[role="dialog"]'))), false, 'Mobile trace must remain available in the page');
  const reportBox = await page.locator('.rd-report-card').boundingBox(), traceBox = await trace.boundingBox();
  assert.ok(traceBox.y >= reportBox.y + reportBox.height - 1, 'Mobile trace must follow the report body');
  await noOverflow(page, `mobile detail ${width}`);
  await wheelReport(page, 1100);
  const selectors = {title: '.rd-header h1', outline: '.rd-reading-tools button[aria-label="打开报告目录"]', actions: '.rd-header button[aria-label="打开研究操作"]'};
  const before = await stickyPositions(page, selectors);
  await wheelReport(page, 850);
  const after = await stickyPositions(page, selectors);
  positionsUnchanged(before, after, `mobile ${width}`);
  for (const [name, box] of Object.entries(after))
    assert.ok(box.y >= 0 && box.y + box.height <= page.viewportSize().height, `${name} must remain in the mobile viewport after scrolling`);

  const actions = await detailActions(page);
  await actionLayout(actions);
  await noOverflow(page, `mobile action Sheet ${width}`);
  await page.screenshot({path: fileURLToPath(new URL(`ui-detail-actions-sheet-${width}.png`, artifacts)), animations: 'disabled'});
  await dismissDetailSheet(page);
  await eventually(() => actionTrigger.evaluate(element => document.activeElement === element), 'Escape must restore the research action trigger focus');
  for (const name of ['滚动定位验证 08', '滚动定位验证 02']) {
    await outlineTrigger.click();
    const sheet = page.getByRole('dialog', {name: '报告目录', exact: true});
    await sheet.waitFor();
    assert.equal(await sheet.getAttribute('data-slot'), 'sheet-content');
    await count(sheet.locator('summary'), 0);
    const nav = sheet.getByRole('navigation', {name: '报告目录', exact: true});
    await nav.waitFor();
    await noOverflow(page, `mobile directory Sheet ${width}`);
    await jumpToHeading(page, nav, name);
  }
  await page.screenshot({path: fileURLToPath(new URL(`ui-detail-toc-target-${width}.png`, artifacts)), animations: 'disabled'});
  await traceChecks(page);
  await noOverflow(page, `mobile trace ${width}`);
  await screenshot(page, `detail-trace-${width}`, '.rd-trace-aside:visible');
  assert.equal(requests('POST', '/api/jobs').length, 0, 'Mobile Sheets and TOC must not create research');
});

const contextualJob = makeJob(8, 'completed', {question: '现金流质量研究'});
const plainJob = makeJob(9, 'completed', {question: '没有分章的研究'});
plainJob.result.report = '这是一份没有标题的合成正文，用于检查无目录时的阅读布局。';
for (const width of [320, 768, 1440]) test(`detail-contextual-layout-${width}`, {
  jobs: [contextualJob, plainJob], viewport: {width, height: 960},
}, async ({page}) => {
  await detail(page, contextualJob);
  await revealDirectory(page);
  await count(page.locator('.rd-title-row .rd-status'),0);
  const original = await page.locator('.rd-report-card').boundingBox();
  for(const tab of ['审计记录','证据来源']){
    await page.getByRole('tab',{name:new RegExp('^'+tab)}).click();
    await count(page.locator('.rd-directory-rail'),0);
    await count(page.locator('.rd-outline-empty'),0);
    await count(page.getByRole('button',{name:'打开报告目录',exact:true}),width<1024?0:1);
    const content = await page.locator('.rd-report-card').boundingBox();
    assert.ok(Math.abs(content.width-original.width)<=1&&Math.abs(content.x-original.x)<=1, 'Every tab must keep the same content width and position');
    await noOverflow(page, `contextual ${tab} ${width}`);
    await screenshot(page, `contextual-${tab==='审计记录'?'audit':'sources'}-${width}`,'.rd-tab-list');
  }
  await page.reload();
  await count(page.locator('.rd-directory-rail'),0);
  await page.getByRole('tab',{name:'研究报告',exact:true}).click();
  const directory=await openDirectory(page);
  await page.screenshot({path:fileURLToPath(new URL(`ui-directory-popup-${width}.png`,artifacts)),animations:'disabled'});
  const expanded=await page.locator('.rd-report-card').boundingBox();
  assert.ok(Math.abs(expanded.width-original.width)<=1,'Opening the directory must not resize the content');
  await dismissDetailSheet(page);
  await eventually(()=>page.getByRole('button',{name:'打开报告目录',exact:true}).evaluate(element=>document.activeElement===element),'Escape must restore the directory trigger focus');
  await openDirectory(page);
  await jumpToHeading(page,directory.getByRole('navigation',{name:'报告目录',exact:true}),'现金流质量');
  await queryIs(page,{tab:null});
  await page.getByRole('tab',{name:'研究报告',exact:true}).click();
  await revealDirectory(page);
  const restored = await page.locator('.rd-report-card').boundingBox();
  assert.ok(Math.abs(restored.width-original.width)<=2, 'Returning to report must restore its layout');
  if(width<1024) await page.getByRole('button',{name:'打开报告目录',exact:true}).waitFor();
  await detail(page, plainJob);
  await page.getByRole('article',{name:'报告正文'}).waitFor();
  await count(page.locator('.rd-directory-rail'),0);
  await unavailableDirectory(page);
  const actions = await detailActions(page);
  await enabled(actions.getByRole('button',{name:'导出报告',exact:true}));
  await dismissDetailSheet(page);
  await noOverflow(page, `unsectioned report ${width}`);
});

const reusableJob = makeJob(8);
for (const width of [768, 1440]) test(`detail-export-reuse-${width}`, {jobs: [reusableJob], viewport: {width, height: 1000}}, async ({page, requests}) => {
  await detail(page, reusableJob);
  let actions = await detailActions(page);
  const downloaded = page.waitForEvent('download');
  await downloadReport(page,actions);
  const download = await downloaded;
  assert.match(download.suggestedFilename(), /\.md$/);
  assert.equal(await download.failure(), null, 'Fixture report export must succeed');
  const stream = await download.createReadStream();
  assert.ok(stream, 'Export must contain readable Markdown');
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const exported = Buffer.concat(chunks).toString('utf8');
  for (const expected of [reusableJob.result.report, reusableJob.result.audit, sources[0].url])
    assert.ok(exported.includes(expected), 'Export must preserve fixture report, audit and source references');
  await dismissDetailSheet(page);
  actions = await detailActions(page);
  await actions.getByRole('button', {name: '复用研究输入', exact: true}).click();
  await page.waitForURL('**/workbench');
  assert.equal(await page.locator('#question').inputValue(), reusableJob.input.question);
  await enabled(page.getByRole('button', {name: /^开始(?:深度)?研究$/, exact: true}));
  assert.equal(requests('POST', '/api/jobs').length, 0, 'Export and input reuse must not automatically submit research');
});

const runningJob = makeJob(2, 'running');
test('cancel-running-research', {jobs: [runningJob]}, async ({page, requests, hold}) => {
  await detail(page, runningJob);
  await page.getByRole('heading', {name: '合成实时草稿', exact: true}).waitFor();
  await enabled(page.getByRole('button', {name: '导出报告'}), false);
  const path = `/api/jobs/${runningJob.id}/cancel`, release = hold(`POST ${path}`);
  await page.getByRole('button', {name: '取消任务', exact: true}).click();
  await eventually(() => requests('POST', path).length === 1, 'Cancel request missing');
  await enabled(page.getByRole('button', {name: '正在取消…'}), false);
  release();
  await textIncludes(page.locator('.rd-overview'), '研究已取消');
  await count(page.getByRole('button', {name: '取消任务', exact: true}), 0);
  await enabled(page.getByRole('button', {name: '导出报告'}), false);
  await page.locator('.rd-action-panel').getByRole('button', {name: '重试研究'}).waitFor();
  assert.equal(requests('POST', path).length, 1);
  await screenshot(page, 'cancelled-research');
});

const previewPartial=makeJob(31,'running',{question:'合成格式验证：未完成的结构化草稿'});
previewPartial.liveReport.text='```json\n{"sections":[{"id":"conclusion","text":"尚未完成';
const previewStructured=makeJob(32,'running',{question:'合成格式验证：完整结构化草稿'});
previewStructured.liveReport={phase:'audit',text:JSON.stringify({
 sections:previewStructured.plan.output.sections.map(section=>({id:section.id,text:'可阅读的合成研究段落。引用[S1]。'})),
 audit:'INTERNAL_AUDIT_JSON',decision:{summary:'INTERNAL_DECISION_JSON'},
})};
const previewFenced=makeJob(33,'running',{question:'合成格式验证：被代码围栏包裹的报告'});
previewFenced.liveReport.text='```markdown\n# 合成可读草稿\n\n现金流仍需验证。[S1]\n\n| 指标 | 数值 |\n| --- | --- |\n| 合成现金流 | 100 |\n```';
for(const width of [320,1440])test(`detail-draft-format-${width}`,{jobs:[previewPartial,previewStructured,previewFenced],viewport:{width,height:1000}},async({page,requests,finishJob})=>{
 await detail(page,previewPartial);
 const content=page.getByRole('tabpanel',{name:'研究报告',exact:true});
 await content.getByRole('heading',{name:'正在整理研究报告',exact:true}).waitFor();
 await count(content.locator('pre'),0);
 assert.doesNotMatch(await content.innerText(),/sections|conclusion|```json/);
 await unavailableDirectory(page);
 await noOverflow(page,'pending structured draft '+width);
 await screenshot(page,'draft-format-waiting-'+width,'.rd-report-card');
 await detail(page,previewStructured);
 await content.getByRole('heading',{name:previewStructured.plan.output.sections[0].title,exact:true}).waitFor();
 await textIncludes(content,'可阅读的合成研究段落。引用[S1]。');
 await textIncludes(content,'草稿已生成，正在审计');
 await count(content.locator('pre'),0);
 assert.doesNotMatch(await content.innerText(),/INTERNAL_|"sections"|"decision"|\\n/);
 await revealDirectory(page);
 let actions=await detailActions(page);
 await enabled(actions.getByRole('button',{name:'导出报告',exact:true}),false);
 await dismissDetailSheet(page);
 await noOverflow(page,'readable structured draft '+width);
 await screenshot(page,'draft-format-structured-'+width,'.rd-report-card');
 await detail(page,previewFenced);
 await content.getByRole('heading',{name:'合成可读草稿',exact:true}).waitFor();
 await count(content.getByRole('table'),1);
 await count(content.locator('pre'),0);
 await textIncludes(content,'实时草稿 · 尚未审计');
 assert.doesNotMatch(await content.innerText(),/```|markdown/);
 await revealDirectory(page);
 await noOverflow(page,'readable fenced draft '+width);
 await screenshot(page,'draft-format-markdown-'+width,'.rd-report-card');
 await eventually(()=>requests('GET',`/api/jobs/${previewFenced.id}/stream`).length===1,'Draft stream missing');
 finishJob(previewFenced.id,{status:'failed',error:'合成的审计未通过'});
 await content.getByRole('heading',{name:'深度研究未完成',exact:true}).waitFor();
 await count(content.getByRole('heading',{name:'合成可读草稿',exact:true}),0);
 await unavailableDirectory(page);
 actions=await detailActions(page);
 await enabled(actions.getByRole('button',{name:'导出报告',exact:true}),false);
 assert.equal(requests('POST','/api/jobs').length,0,'Preview formatting must not start research or publish a draft');
});

const savingDelivery=makeJob(904,'running');savingDelivery.delivery={status:'saving',targetStatus:'completed'};
const failedDelivery=makeJob(905,'failed');failedDelivery.delivery={status:'failed',recoverable:true,targetStatus:'completed'};failedDelivery.retryCount=2;
for(const job of [savingDelivery,failedDelivery])job.workflow.stages.forEach(stage=>stage.status='completed');
failedDelivery.error='合成的保存失败，结果仍在当前服务暂存。';
for(const width of [320,1440]){
 test(`delivery-saving-${width}`,{jobs:[savingDelivery],viewport:{width,height:1000}},async({page,requests,finishJob})=>{
  await detail(page,savingDelivery);assert.equal(await page.locator('.rd-overview').getAttribute('data-progress-state'),'saving');
  await page.getByRole('heading',{name:'正在保存研究结果',exact:true}).waitFor();
  await count(page.getByRole('heading',{name:'合成实时草稿',exact:true}),0);
  const actions=await detailActions(page);await enabled(actions.getByRole('button',{name:'导出报告',exact:true}),false);await enabled(actions.getByRole('button',{name:'正在保存',exact:true}),false);
  await dismissDetailSheet(page);await noOverflow(page,`saving delivery ${width}`);
  finishJob(savingDelivery.id,{status:'completed',delivery:{status:'saved'},result:makeJob(100).result});
  await page.getByRole('heading',{name:'合成研究报告',exact:true}).waitFor();
  assert.equal(requests('POST','/api/jobs').length,0);
 });
 test(`delivery-save-retry-${width}`,{jobs:[failedDelivery],viewport:{width,height:1000},failures:{[`POST /api/jobs/${failedDelivery.id}/save`]:1}},async({page,requests,db,hold})=>{
  await detail(page,failedDelivery);assert.equal(await page.locator('.rd-overview').getAttribute('data-progress-state'),'save-pending');
  await page.getByRole('heading',{name:'研究已复核，结果待保存',exact:true}).waitFor();
  await count(page.getByRole('button',{name:'重试研究',exact:true}),0);
  const action=page.locator('.rd-empty').getByRole('button',{name:'重试保存',exact:true});await action.click();
  await page.getByText('结果仍未保存',{exact:true}).waitFor();
  const path='/api/jobs/'+failedDelivery.id+'/save',release=hold('POST '+path);
  await action.evaluate(element=>{element.click();element.click();});
  await page.getByRole('status').filter({hasText:'正在重新保存结果'}).waitFor();
  await enabled(page.locator('.rd-empty').getByRole('button',{name:'正在保存…',exact:true}),false);
  await noOverflow(page,`save retry ${width}`);await screenshot(page,`delivery-retry-${width}`);
  release();await page.getByRole('heading',{name:'合成研究报告',exact:true}).waitFor();
  assert.equal(db.size,1);assert.equal(db.get(failedDelivery.id).retryCount,2);assert.equal(db.get(failedDelivery.id).createdAt,failedDelivery.createdAt);
  assert.deepEqual(requests('POST',path).map(call=>call.body),[{expectedRetryCount:2},{expectedRetryCount:2}]);
  assert.equal(requests('POST','/api/jobs').length,0);assert.equal(requests('POST','/api/jobs/'+failedDelivery.id+'/retry').length,0);
 });
}

const retryBaseline=makeJob(24,'completed',{question:'合成的历史研究对照'});
const failedUpdate=makeJob(25,'failed',{question:'更新贵州茅台的最新财报，检查原有现金流判断是否改变',mode:'C',depth:'Deep',historyYears:8,
 baselineJobId:retryBaseline.id,previousResearch:'原有判断：核查经营现金流与分红覆盖。'});
failedUpdate.input.mode='auto'; // The resolved mode, not a new routing guess, must be retained.
const failedPortfolio=makeJob(26,'failed',{mode:'E',historyYears:3,portfolio:'合成组合备注',
 portfolioContext:Object.fromEntries(portfolioFields.map(field=>[field.id,'合成'+field.label]))});
const cancelledRetry=makeJob(27,'cancelled',{mode:'F',historyYears:8});
for(const {width,job,entry} of [{width:320,job:failedUpdate,entry:'empty'},{width:390,job:cancelledRetry,entry:'toolbar'},{width:1440,job:failedPortfolio,entry:'toolbar'}]){
 test(`detail-direct-retry-${width}`,{jobs:[retryBaseline,job],viewport:{width,height:1000},createdStatus:'running'},async({page,db,requests,hold,finishJob,navigations})=>{
  await detail(page,job);
  const oldJob=structuredClone(db.get(job.id));
  const retryPath=`/api/jobs/${job.id}/retry`,release=hold('POST '+retryPath);
  if(entry==='toolbar')await page.getByRole('tab',{name:/^证据来源/}).click();
  const actionRoot=entry==='toolbar'?await detailActions(page):page.locator('.rd-empty');
  const retry=actionRoot.getByRole('button',{name:'重试研究',exact:true});
  // Both clicks occur before React can disable the control, exercising the request lock.
  await retry.evaluate(element=>{element.click();element.click();});
  await eventually(()=>requests('POST',retryPath).length===1,'Direct retry should submit once');
  assert.equal(new URL(page.url()).pathname,'/research/'+job.id,'Keep the failed detail visible while submitting');
  await count(page.locator('.research-workbench'),0);
  await page.getByRole('status').filter({hasText:'正在重新提交研究'}).waitFor();
  if(entry==='toolbar'&&width<1024)await page.getByRole('dialog',{name:'研究操作',exact:true}).waitFor({state:'hidden'});
  if(width>=1024){
   await page.getByRole('tab',{name:'研究报告',exact:true}).click();
   for(const button of await page.getByRole('button',{name:'正在重试…',exact:true}).all())await enabled(button,false);
   await page.locator('.rd-empty').getByRole('button',{name:'正在重试…',exact:true}).evaluate(element=>element.click());
  }
  assert.deepEqual(requests('POST',retryPath)[0].body,{expectedRetryCount:0});
  assert.equal(requests('POST','/api/jobs').length,0,'Retry must never call the create-job endpoint');
  await noOverflow(page,'retry pending '+width);
  await screenshot(page,'retry-pending-'+width);
  const previousURL=page.url();
  release();
  await eventually(async()=>await page.locator('.rd-overview').getAttribute('data-progress-state')==='running','Retry response must reach the running view');
  assert.equal(await page.locator('.rd-overview').getAttribute('data-progress-state'),'running');
  assert.equal(page.url(),previousURL,'Retry must retain the URL, including the selected tab');
  assert.equal(db.size,2,'Retry must not add a history record');
  assert.equal(db.get(job.id).id,oldJob.id);assert.equal(db.get(job.id).createdAt,oldJob.createdAt);
  assert.equal(db.get(job.id).retryCount,1);assert.equal(db.get(job.id).error,undefined);assert.deepEqual(db.get(job.id).input.sources,oldJob.input.sources);assert.equal(db.get(job.id).resume.available,true);
  assert.equal(db.get(job.id).mode,oldJob.mode);
  assert.deepEqual(db.get(job.id).input.securities,oldJob.input.securities);
  for(const key of ['question','depth','historyYears','portfolio','previousResearch','baselineJobId','portfolioContext'])assert.deepEqual(db.get(job.id).input[key]??null,oldJob.input[key]??null);
  await page.getByRole('tab',{name:'研究报告',exact:true}).click();
  await page.getByRole('heading',{name:'合成实时草稿',exact:true}).waitFor();
  await eventually(()=>requests('GET',`/api/jobs/${job.id}/stream`).length===1,'Retry must reconnect the same record progress stream');
  assert.equal(requests('POST',retryPath).length,1);
  assert.ok(navigations.every(url=>!new URL(url).pathname.startsWith('/workbench')),'Direct retry must never visit the workbench');
  if(width===320){
   finishJob(job.id,{status:'failed',error:'合成的重试失败'});
   await eventually(async()=>await page.locator('.rd-overview').getAttribute('data-progress-state')==='failed','Failure event must reach the detail view');
   assert.equal(await page.locator('.rd-overview').getAttribute('data-progress-state'),'failed');
   await page.locator('.rd-empty').getByRole('button',{name:'重试研究',exact:true}).click();
   await eventually(async()=>await page.locator('.rd-overview').getAttribute('data-progress-state')==='running','Second retry response must reach the running view');
   assert.equal(await page.locator('.rd-overview').getAttribute('data-progress-state'),'running');
   assert.equal(db.get(job.id).retryCount,2);assert.equal(db.size,2);
   assert.deepEqual(requests('POST',retryPath).at(-1).body,{expectedRetryCount:1});
   await eventually(()=>requests('GET',`/api/jobs/${job.id}/stream`).length===2,'Repeated retries must reconnect again');
  }
  finishJob(job.id,{status:'completed',result:makeJob(28).result});
  await page.getByRole('heading',{name:'合成研究报告',exact:true}).waitFor();
  assert.equal(await page.locator('.rd-overview').getAttribute('data-progress-state'),'completed');
  await count(page.getByRole('button',{name:'重试研究',exact:true}),0);
  await noOverflow(page,'retry completed '+width);
 });
}

for(const width of [320,1440])test(`detail-direct-retry-error-${width}`,{jobs:[failedUpdate,retryBaseline],viewport:{width,height:1000},failures:{[`POST /api/jobs/${failedUpdate.id}/retry`]:1}},async({page,db,requests})=>{
 const retryPath=`/api/jobs/${failedUpdate.id}/retry`;
 await detail(page,failedUpdate);
 await page.locator('.rd-empty').getByRole('button',{name:'重试研究',exact:true}).click();
 const alert=page.getByRole('alert').filter({hasText:'重试未能启动'});
 await alert.waitFor();
 await textIncludes(alert,'UI测试：模拟加载失败，请重试');
 await eventually(()=>alert.evaluate(element=>document.activeElement===element),'Move focus to the retry error');
 assert.ok((await alert.boundingBox()).y>=(await page.locator('.rd-header').boundingBox()).y+(await page.locator('.rd-header').boundingBox()).height-1,'Error must be visible below the sticky title');
 assert.equal(new URL(page.url()).pathname,'/research/'+failedUpdate.id);
 assert.equal(db.size,2,'A failed submission must not add a job');
 assert.equal(db.get(failedUpdate.id).status,'failed');
 for(const button of await page.getByRole('button',{name:'重试研究',exact:true}).all())await enabled(button);
 await noOverflow(page,'retry error '+width);
 await screenshot(page,'retry-error-'+width);
 await alert.getByRole('button',{name:'修改研究输入',exact:true}).click();
 await page.waitForURL('**/workbench');
 assert.equal(await page.locator('#question').inputValue(),failedUpdate.input.question);
 assert.equal(requests('POST',retryPath).length,1,'Editing inputs must not submit a retry');
 await detail(page,failedUpdate);
 await page.locator('.rd-empty').getByRole('button',{name:'重试研究',exact:true}).click();
 await page.getByRole('heading',{name:'合成研究报告',exact:true}).waitFor();
 assert.equal(new URL(page.url()).pathname,'/research/'+failedUpdate.id);assert.equal(db.size,2);
 await count(page.locator('.rd-retry-error'),0);
 assert.equal(requests('POST',retryPath).length,2,'Retry must be available again after an error');
 assert.equal(requests('POST','/api/jobs').length,0,'Retry must not create a new record');
});

test('detail-direct-retry-navigation',{jobs:[failedPortfolio]},async({page,hold,requests})=>{
 await detail(page,failedPortfolio);
 const retryPath=`/api/jobs/${failedPortfolio.id}/retry`,release=hold('POST '+retryPath);
 await page.locator('.rd-empty').getByRole('button',{name:'重试研究',exact:true}).click();
 await eventually(()=>requests('POST',retryPath).length===1,'Retry request missing');
 await page.getByRole('navigation',{name:'面包屑导航'}).getByRole('link',{name:'研究记录',exact:true}).click();
 await page.waitForURL('**/history');
 const response=page.waitForResponse(response=>response.url().endsWith(retryPath)&&response.request().method()==='POST');
 release();await response;await delay(150);
 assert.equal(new URL(page.url()).pathname,'/history','Finishing a retry must not hijack later navigation');
});

const retryJob = makeJob(3);
test('detail-load-failure-retry', {jobs: [retryJob], failures: {[`GET /api/jobs/${retryJob.id}`]: 1}}, async ({page, requests}) => {
  await page.goto(`/research/${retryJob.id}?tab=audit`);
  await page.getByRole('heading', {name: '暂时无法打开研究', exact: true}).waitFor();
  await page.getByText('UI测试：模拟加载失败，请重试', {exact: true}).waitFor();
  await screenshot(page, 'load-error');
  await page.getByRole('button', {name: '重新加载', exact: true}).click();
  await page.locator('.research-detail').waitFor();
  await page.getByRole('heading', {name: '合成审计记录', exact: true}).waitFor();
  await queryIs(page, {tab: 'audit'});
  assert.equal(requests('GET', `/api/jobs/${retryJob.id}`).length, 2);
  assert.equal(requests('POST', '/api/jobs').length, 0);
});

test('history-load-failure-retry', {jobs: historyFixtures(), failures: {'GET /api/jobs': 1}}, async ({page, requests}) => {
  await page.goto('/history');
  await page.getByRole('alert').getByText('研究记录加载失败', {exact: true}).waitFor();
  await count(page.locator('.rh-row'), 0);
  await count(page.getByRole('heading', {name: '从第一项研究开始积累', exact: true}), 0);
  await screenshot(page, 'history-load-error');
  await page.getByRole('button', {name: '重试', exact: true}).click();
  await count(page.locator('.rh-row'), 8);
  await textIncludes(page.locator('.rh-results-note'), '共 18 项研究');
  await count(page.locator('.rh-error'), 0);
  assert.equal(requests('GET', '/api/jobs').length, 2);
  assert.equal(requests('POST', '/api/jobs').length, 0);
});

for (const width of [320, 390, 768, 1440]) test(`responsive-${width}`, {jobs: historyFixtures(), viewport: {width, height: width === 1440 ? 1100 : 844}}, async ({page}) => {
  await workbench(page);
  await noOverflow(page, `empty workbench ${width}`);
  await manualInput(page);
  await page.getByRole('button', {name: '添加标的', exact: true}).click();
  await page.getByRole('textbox', {name: '标的2股票代码'}).fill('000001');
  await page.getByRole('combobox',{name:'研究路径',exact:true}).focus();
  await noOverflow(page, `expanded workbench ${width}`);
  await screenshot(page, `workbench-${width}`);
  await screenshot(page, `workbench-settings-${width}`, '.workbench-securities');
  if (width < 1024) {
    const menu = page.getByRole('button', {name: '打开导航菜单'});
    await menu.click();
    const dialog = page.getByRole('dialog', {name: '研究导航'});
    await dialog.waitFor();
    await noOverflow(page, `mobile navigation ${width}`);
    await screenshot(page, `navigation-${width}`);
    await dialog.getByRole('link', {name: /^研究记录/}).click();
    await page.waitForURL('**/history');
    await dialog.waitFor({state: 'hidden'});
    await menu.click();
    await dialog.waitFor();
    await page.keyboard.press('Escape');
    await dialog.waitFor({state: 'hidden'});
    await eventually(() => menu.evaluate(element => document.activeElement === element), 'Escape should restore navigation trigger focus');
  } else {
    await openHistory(page);
  }
  await count(page.locator('.rh-row'), 8);
  await noOverflow(page, `history ${width}`);
  await screenshot(page, `history-${width}`);
  await page.locator('.rh-row').first().getByRole('button', {name: /^删除研究/}).click();
  await page.getByRole('alertdialog').waitFor();
  await noOverflow(page, `delete dialog ${width}`);
  await screenshot(page, `delete-${width}`);
  await page.getByRole('button', {name: '保留研究', exact: true}).click();
  await page.locator('.rh-open').first().click();
  await page.locator('.research-detail').waitFor();
  await page.getByRole('heading', {name: '合成研究报告', exact: true}).waitFor();
  await noOverflow(page, `detail report ${width}`);
  await screenshot(page, `detail-${width}`, '.rd-tab-list');
  const actions = await detailActions(page);
  await shadcnButtons(actions.getByRole('button').filter({hasNotText:'导出报告'}));
  await shadcnButtons(actions.getByRole('button',{name:'导出报告',exact:true}),'popover-trigger');
  await actions.getByRole('button', {name: '阅读模式', exact: true}).click();
  await dismissDetailSheet(page);
  await noOverflow(page, `reading mode ${width}`);
  await page.getByRole('tab', {name: /^证据来源/}).click();
  await collapsible(page.locator('.rd-source').first(), true);
  await page.getByRole('region', {name: 'S1 正文预览'}).waitFor();
  await noOverflow(page, `expanded long source ${width}`);
  await screenshot(page, `sources-${width}`, '.rd-tab-list');
});

for(const width of [320,1440]) test(`homepage-onboarding-${width}`,{viewport:{width,height:1000}},async({page,requests})=>{
 await page.goto('/');
 await page.getByRole('heading',{name:/让每一次研究/,level:1}).waitFor();
 assert.equal(new URL(page.url()).pathname,'/');
 const navigation=page.getByRole('navigation',{name:'主导航'});
 if(width<1024)await page.getByRole('button',{name:'打开导航菜单',exact:true}).click();
 assert.equal(await navigation.getByRole('link').first().innerText(),'首页');
 assert.equal(await navigation.getByRole('link',{name:'首页',exact:true}).getAttribute('aria-current'),'page');
 await count(navigation.getByRole('group'),0);
 assert.deepEqual(await navigation.getByRole('link').evaluateAll(links=>links.map(link=>link.getAttribute('href'))),['/','/workbench','/history','/handbook']);
 await count(page.locator('.research-home .fw-heading'),0);
 if(width<1024){await page.keyboard.press('Escape');await page.getByRole('dialog',{name:'研究导航'}).waitFor({state:'hidden'});}
 await noOverflow(page,'homepage '+width);
 await screenshot(page,'homepage-hero-'+width);
 await page.getByRole('link',{name:'了解研究流程',exact:true}).click();
 await page.waitForURL('**/handbook?tab=guide');
 await page.locator('.research-usage').waitFor();await page.getByRole('navigation',{name:'面包屑导航'}).getByRole('link',{name:'首页',exact:true}).click();
 await page.getByRole('navigation',{name:'首页内容导航',exact:true}).getByRole('link',{name:'服务方案',exact:true}).click();
 const plans=page.locator('#fw-plans');
 await textIncludes(plans,'价格待公布');
 await plans.getByRole('button',{name:'查看开通说明',exact:true}).click();
 const opening=page.getByRole('dialog',{name:'研究服务开通说明',exact:true});
 await opening.waitFor();
 await textIncludes(opening,'当前暂未开放在线购买');
 await count(opening.getByRole('button',{name:/支付|购买/}),0);
 await noOverflow(page,'service opening '+width);
 await screenshot(page,'homepage-opening-'+width);
 await page.keyboard.press('Escape');await opening.waitFor({state:'hidden'});
 assert.equal(await plans.getByRole('button',{name:'查看开通说明'}).evaluate(el=>el===document.activeElement),true);
 await screenshot(page,'homepage-plans-'+width,'#fw-plans');
 await page.getByRole('button',{name:'使用这个问题',exact:true}).click();
 await page.waitForURL('**/workbench');
 assert.match(await page.getByLabel('你想研究什么？',{exact:true}).inputValue(),/贵州茅台.*值不值得研究/);
 await textIncludes(page.locator('.path-picker'),'快速筛选');
 assert.equal(requests('POST','/api/jobs').length,0,'The guide must prepare the question without starting a paid research task');
 if(width<1024)await page.getByRole('button',{name:'打开导航菜单',exact:true}).click();
 await page.getByRole('link',{name:/知衡研究服务.*了解方案与开通方式/}).click();
 await page.waitForURL('**/#fw-plans');
 await eventually(async()=>{const box=await page.locator('#fw-plans').boundingBox();return box.y>=0&&box.y<300;},'Sidebar service link must navigate and scroll to the plans');
 await page.goto('/framework?from=legacy#fw-plans');
 await eventually(()=>Promise.resolve(new URL(page.url()).pathname==='/'),'Legacy framework URL must redirect home');
 assert.equal(new URL(page.url()).hash,'#fw-plans');assert.equal(new URL(page.url()).search,'?from=legacy');
 await page.getByRole('heading',{name:/让每一次研究/,level:1}).waitFor();
 assert.equal(requests('POST','/api/jobs').length,0);
});

for(const [width,reducedMotion] of [[320,'no-preference'],[1440,'no-preference'],[320,'reduce']])test(`homepage-section-nav-${width}-${reducedMotion}`,{viewport:{width,height:1000},reducedMotion},async({page})=>{
 await page.goto('/');
 const navigation=page.getByRole('navigation',{name:'首页内容导航',exact:true});
 const scroller=page.locator('.page-scroll');
 const links=[['fw-guide','如何使用'],['fw-paths','研究场景'],['fw-plans','服务方案'],['fw-flow','研究流程'],['fw-faq','常见问题']];
 const current=id=>eventually(async()=>await navigation.locator('a[aria-current="location"]').count()===1&&await navigation.locator('a[aria-current="location"]').getAttribute('href')==='#'+id,'Scroll position must select '+id);
 const arrived=async id=>{
  await current(id);
  await eventually(()=>page.evaluate(id=>{
   const section=document.getElementById(id).getBoundingClientRect(),bar=document.querySelector('.fw-section-nav').getBoundingClientRect(),scroll=document.querySelector('.page-scroll');
   return section.top>=bar.bottom-1&&(Math.abs(section.top-bar.bottom-18)<3||scroll.scrollTop+scroll.clientHeight>=scroll.scrollHeight-2);
  },id),'Section heading must settle below the sticky navigation: '+id);
 };
 await navigation.waitFor();await current('fw-guide');
 await navigation.scrollIntoViewIfNeeded();
 // Sample rendered positions: a long navigation should animate instead of jumping.
 const samples=page.evaluate(()=>new Promise(resolve=>{
  const scroll=document.querySelector('.page-scroll'),positions=[];
  const sample=()=>{positions.push(Math.round(scroll.scrollTop));if(positions.length<60)requestAnimationFrame(sample);else resolve(positions);};
  requestAnimationFrame(sample);
 }));
 await navigation.getByRole('link',{name:'常见问题',exact:true}).click();
 const positions=await samples;await arrived('fw-faq');
 const unique=new Set(positions).size;
 assert.ok(reducedMotion==='reduce'?unique<=2:unique>3,`Expected ${reducedMotion==='reduce'?'instant':'animated'} scrolling; saw ${unique} positions`);
 for(const [id] of [...links,...links.slice(0,4).reverse()]){
  await page.evaluate(id=>{const section=document.getElementById(id),scroll=document.querySelector('.page-scroll');scroll.scrollTo({top:scroll.scrollTop+section.getBoundingClientRect().top-scroll.getBoundingClientRect().top+70,behavior:'instant'});},id);
  await current(id);
  const before=await scroller.evaluate(el=>el.scrollTop);
  await eventually(()=>navigation.locator('a[aria-current="location"]').evaluate(el=>{const item=el.getBoundingClientRect(),bar=el.closest('nav').getBoundingClientRect();return item.left>=bar.left-1&&item.right<=bar.right+1;}),'Active item must stay visible in the narrow navigation');
  assert.ok(Math.abs(await scroller.evaluate(el=>el.scrollTop)-before)<2,'Revealing an active navigation item must not move the page vertically');
  assert.equal(new URL(page.url()).hash,'#fw-faq','Manual scrolling must not rewrite browser history');
 }
 await navigation.getByRole('link',{name:'服务方案',exact:true}).press('Enter');await arrived('fw-plans');
 await scroller.evaluate(el=>el.scrollTo({top:0,behavior:'instant'}));await current('fw-guide');
 await navigation.getByRole('link',{name:'服务方案',exact:true}).click();await arrived('fw-plans');
 await page.screenshot({path:fileURLToPath(new URL(`ui-homepage-section-nav-${width}-${reducedMotion}.png`,artifacts)),animations:'disabled'});
 await page.goto('/framework#fw-flow');await arrived('fw-flow');
 await noOverflow(page,'scrolling navigation '+width+' '+reducedMotion);
});

for(const width of [320,768,1440]) test(`framework-${width}`,{viewport:{width,height:1000}},async({page,requests})=>{
 await page.goto('/framework');
 await page.getByRole('heading',{name:/让每一次研究/,level:1}).waitFor();
 await count(page.locator('.page-content footer'),0);
 await noOverflow(page,'framework hero '+width);
 await screenshot(page,'framework-hero-'+width);
 const scenes=page.getByRole('tablist',{name:'研究场景'});
 await count(scenes.getByRole('tab'),6);
 for(const [id,mode] of Object.entries(modes)){
  await scenes.getByRole('tab',{name:new RegExp(mode.name)}).click();
  await page.getByRole('heading',{name:mode.question,exact:true}).waitFor();
  await noOverflow(page,'framework '+id+' '+width);
  const scenePanel=page.locator('.fw-scene-panel[data-state=active]');
  await count(scenePanel.locator('[data-slot=collapsible]'),0);
  await count(scenePanel.locator('.research-scene-deliverables li'),createResearchPlan({mode:id}).output.sections.length);
  if(id==='A')await screenshot(page,'framework-quick-screen-'+width,'#fw-paths');
 }
 await screenshot(page,'framework-paths-'+width,'#fw-paths');
 await scenes.getByRole('tab',{name:/深度研究/}).focus();
 await page.keyboard.press(width<640?'ArrowRight':'ArrowDown');
 await page.getByRole('heading',{name:modes.C.question,exact:true}).waitFor();
 const flow=page.getByRole('tablist',{name:'研究流程步骤'});
 for(const stage of researchStages){await flow.getByRole('tab',{name:new RegExp(stage.label)}).click();await noOverflow(page,'flow '+stage.id+' '+width);}
 await screenshot(page,'framework-flow-'+width,'#fw-flow');
 await page.getByRole('link',{name:'查看研究标准与纪律',exact:true}).click();
 await page.waitForURL('**/handbook?tab=discipline');
 await count(page.locator('#fw-scoring .fw-score-list > div'),6);
 await noOverflow(page,'research standards '+width);
 await screenshot(page,'framework-discipline-'+width,'#fw-standards');
 await count(page.locator('.research-framework details'),0);
 await page.goBack();
 await page.waitForURL('**/');
 await scenes.getByRole('tab',{name:/快速筛选/}).click();
 await page.getByRole('button',{name:'开始快速筛选',exact:true}).click();
 await page.locator('.research-workbench').waitFor();
 await textIncludes(page.locator('.path-picker'),'快速筛选');
 await count(page.getByRole('combobox',{name:'报告深度'}),0);
 await count(page.locator('.screen-scope,.research-plan'),0);
 assert.equal(requests('POST','/api/jobs').length,0);
});

for(const width of [320,1440])test(`framework-autoplay-${width}`,{viewport:{width,height:1000},reducedMotion:'no-preference'},async({page,requests})=>{
 await page.clock.install();
 await page.goto('/framework');
 await page.getByRole('heading',{name:/让每一次研究/,level:1}).waitFor();
 const scroller=page.locator('.page-scroll');
 const groups=[
  {id:'fw-paths',label:'研究场景',ids:Object.keys(modes),initial:0},
  {id:'fw-flow',label:'研究流程',ids:researchStages.map(item=>item.id),initial:0},
 ];
 for(const group of groups){
  const section=page.locator('#'+group.id),tabs=section.getByRole('tab');
  await count(section.getByRole('button',{name:/暂停.*轮播/}),1);
  const leaveContent=async()=>{await section.locator('.fw-section-heading').click();await page.mouse.move(1,1);};
  const selected=index=>eventually(()=>tabs.nth(index).getAttribute('aria-selected').then(value=>value==='true'),`${group.label}: expected tab ${index}`);
  // Timers do not advance unseen groups while the reader is at the page introduction.
  await page.clock.fastForward(24_000);
  await selected(group.initial);
  await section.evaluate(element=>element.scrollIntoView({block:'start',behavior:'instant'}));
  await page.mouse.move(1,1);
  await delay(100);
  const height=(await section.boundingBox()).height,scrollTop=await scroller.evaluate(element=>element.scrollTop);
  for(let n=1;n<=group.ids.length;n++){
   await page.clock.fastForward(4100);
   await selected((group.initial+n)%group.ids.length);
   if(group.id==='fw-paths'&&width<640){
    const inactiveHeights=await section.locator('.fw-scene-panel[data-state=inactive]').evaluateAll(panels=>panels.map(panel=>panel.getBoundingClientRect().height));
    assert.ok(inactiveHeights.every(height=>height===0),'Inactive mobile scenes must not reserve layout space');
   }else assert.ok(Math.abs((await section.boundingBox()).height-height)<1,'Rotating panels must retain their height');
   assert.ok(Math.abs(await scroller.evaluate(element=>element.scrollTop)-scrollTop)<1,'Autoplay must not scroll the page');
   await count(section.getByRole('tabpanel'),1);
   const tabVisible=await section.getByRole('tab',{selected:true}).evaluate(element=>{
    const tab=element.getBoundingClientRect(),list=element.closest('[role="tablist"]').getBoundingClientRect();
    return tab.left>=list.left-1&&tab.right<=list.right+1;
   });
   assert.ok(tabVisible,'The active tab must remain visible in the horizontal strip');
  }
  // Resume from the manually selected panel, rather than restarting the sequence.
  await tabs.last().click();
  await page.mouse.move(1,1);
  await page.clock.fastForward(24_000);
  await selected(group.ids.length-1);
  await leaveContent();
  await page.clock.fastForward(3000);
  await selected(group.ids.length-1);
  await page.clock.fastForward(1100);
  await selected(0);
  // A manual change gets a full reading interval after focus leaves the content.
  await page.clock.fastForward(2000);
  await tabs.nth(1).click();
  await leaveContent();
  await page.clock.fastForward(3000);
  await selected(1);
  await page.clock.fastForward(1100);
  await selected(2);
  await tabs.nth(2).focus();
  await page.keyboard.press(group.id==='fw-paths'&&width>=640?'ArrowDown':'ArrowRight');
  await selected(3);
  await page.mouse.move(1,1);
  await page.clock.fastForward(24_000);
  await selected(3);
  assert.ok(await tabs.nth(3).evaluate(element=>document.activeElement===element),'Autoplay must not move keyboard focus');
  await leaveContent();
  await section.getByRole('tabpanel').getByRole('heading',{level:3}).hover();
  await page.clock.fastForward(24_000);
  await selected(3);
  await page.mouse.move(1,1);
  await page.clock.fastForward(4100);
  await selected(4);
  // Simulate the browser visibility event without relying on headless window focus.
  await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));});
  await delay(40);
  await page.clock.fastForward(24_000);
  await selected(4);
  await page.evaluate(()=>{delete document.visibilityState;document.dispatchEvent(new Event('visibilitychange'));});
  await delay(40);
  await page.clock.fastForward(4100);
  await selected(5%group.ids.length);
  await noOverflow(page,`autoplay ${group.label} ${width}`);
  await screenshot(page,`framework-autoplay-${group.id}-${width}`,'#'+group.id);
  // Scroll out of view before testing the second group.
  await scroller.evaluate(element=>element.scrollTo({top:0,behavior:'instant'}));
  await page.mouse.move(1,1);
  await delay(100);
  await page.clock.fastForward(24_000);
  await selected(5%group.ids.length);
 }
 assert.equal(requests('POST','/api/jobs').length,0);
});

test('framework-autoplay-reduced-motion',{},async({page})=>{
 await page.clock.install();
 await page.goto('/framework');
 const section=page.locator('#fw-paths');
 await section.evaluate(element=>element.scrollIntoView({block:'start',behavior:'instant'}));
 await count(page.getByRole('button',{name:/轮播/}),0);
 await page.clock.fastForward(24_000);
 assert.equal(await section.getByRole('tab',{name:/快速筛选/}).getAttribute('aria-selected'),'true');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.mouse.move(1,1);
 await delay(100);
 await page.clock.fastForward(4100);
 await eventually(()=>section.getByRole('tab',{name:/深度研究/}).getAttribute('aria-selected').then(value=>value==='true'),'Autoplay should resume when reduced motion is disabled');
 await page.emulateMedia({reducedMotion:'reduce'});
 await delay(100);
 await page.clock.fastForward(24_000);
 assert.equal(await section.getByRole('tab',{name:/深度研究/}).getAttribute('aria-selected'),'true');
 await section.getByRole('tab',{name:/多公司比较/}).click();
 assert.equal(await section.getByRole('tab',{name:/多公司比较/}).getAttribute('aria-selected'),'true','Manual selection should still work with reduced motion');
});

const decisionJob=makeJob(23,'completed',{question:'合成研究判断 · 贵州茅台现金流'});
decisionJob.result.decision=reviewFixture(decisionJob.input).decision;
decisionJob.result.decision.scores=['业务质量','盈利能力','现金转化','资本配置','股东回报','估值适配'].map((label,index)=>({id:`test-${index}`,label,score:null,max:10,reason:'合成资料不足，待核实。'}));
decisionJob.result.decision.summary='当前合成证据不足以支持明确的投资结论。需先补齐财务原件、核对估值假设，并持续跟踪现金流与股东回报的变化。';
decisionJob.result.decision.gates.forEach((gate,index)=>{gate.reason=[
 '部分财务数字来自合成资料摘录，尚未与报告原页逐一核对。附注与历史数据仍有缺口，当前不能确认所有数值的准确性。',
 '现有资料能够支持初步讨论，但业务质量与长期回报仍缺少完整证据。需结合分部经营数据和现金流记录进一步验证。',
 '估值方法可作为分析参考，但合理区间依赖尚未核实的增长与回报假设。当前不据此形成确定的目标价格。',
 '已识别经营波动和资本回报风险；部分影响已体现在情景分析中，仍需核对是否存在重复计入。',
][index];});
decisionJob.researchOutcome={action:decisionJob.result.decision.action,confidence:decisionJob.result.decision.confidence,summary:decisionJob.result.decision.summary};
const scorePriorityJob=structuredClone(decisionJob);
scorePriorityJob.id=makeJob(9099).id;
scorePriorityJob.result.decision.action='深度研究';scorePriorityJob.result.decision.confidence='中';
scorePriorityJob.result.decision.scores=[['公司质量',20,25],['成长与战略',10,15],['财务质量',18,25],['估值与安全边际',null,20],['股东回报',0,5],['风险',6,10]].map(([label,score,max],index)=>({id:`score-${index}`,label,score,max,reason:score===null?'合成资料不足，保留缺口。':'合成评分，仅用于验证呈现与交互。'}));
for(const width of [320,1440])test(`decision-score-priority-${width}`,{jobs:[scorePriorityJob],viewport:{width,height:1000}},async({page})=>{
 await detail(page,scorePriorityJob);
 await textIncludes(page.locator('.rd-action-tag'),'深度研究');await textIncludes(page.locator('.rd-confidence-tag'),'置信度 · 中');
 await noOverflow(page,`digest tags ${width}`);await screenshot(page,`decision-card-${width}`);
 await page.locator('.rd-decision-disclosure').click();
 const scores=page.locator('.rd-summary-scores');await count(scores.locator('summary,button,details'),0);
 await textIncludes(scores.locator('.rd-score-total'),'待核实');
 assert.equal(await scores.evaluate(el=>el.parentElement.firstElementChild===el),true);
 await count(scores.locator('.rd-score-dimension:visible'),6);
 const missing=scores.locator('.rd-score-dimension').nth(3),zero=scores.locator('.rd-score-dimension').nth(4);
 await textIncludes(missing,'待核实');await count(missing.locator('.rd-score-meter'),0);
 await textIncludes(zero,'0 / 5');await count(zero.locator('.rd-score-meter'),1);
 assert.doesNotMatch(await scores.textContent(),/undefined|NaN/);
 await noOverflow(page,`score priority ${width}`);
 await page.screenshot({path:fileURLToPath(new URL(`ui-decision-scores-${width}.png`,artifacts)),animations:'disabled'});
 await page.keyboard.press('Escape');await page.getByRole('dialog',{name:'判断依据与验证条件',exact:true}).waitFor({state:'hidden'});
 await page.locator('.rd-decision-disclosure').click();await count(scores.locator('.rd-score-dimension:visible'),6);
});
const completeScoreJob=structuredClone(scorePriorityJob);
completeScoreJob.id=makeJob(9100).id;
completeScoreJob.result.decision.scores[3].score=13;
completeScoreJob.result.decision.scores[3].reason='合成评分，仅用于验证总分展示。';
completeScoreJob.result.decision.scores[4].score=4;
for(const width of [320,1440])test(`decision-score-total-${width}`,{jobs:[completeScoreJob],viewport:{width,height:1000}},async({page,db})=>{
 await detail(page,completeScoreJob);await page.locator('.rd-decision-disclosure').click();
 const scores=page.getByRole('region',{name:'六维评分',exact:true});
 await textIncludes(scores.locator('.rd-score-total'),'71 / 100');
 await count(scores.locator('.rd-score-dimension:visible'),6);
 await count(scores.locator('summary,button,details'),0);
 await noOverflow(page,`complete total ${width}`);
 await page.screenshot({path:fileURLToPath(new URL(`ui-decision-total-${width}.png`,artifacts)),animations:'disabled'});
 const zeroJob=structuredClone(completeScoreJob);zeroJob.result.decision.scores.forEach(item=>item.score=0);
 db.set(zeroJob.id,zeroJob);await page.reload();await page.locator('.rd-decision-disclosure').click();
 await textIncludes(scores.locator('.rd-score-total'),'0 / 100');
});
for(const width of [320,1440])test(`framework-context-${width}`,{jobs:[decisionJob],viewport:{width,height:1000}},async({page,requests})=>{
 await detail(page,decisionJob);
 await page.locator('.rd-decision').waitFor();
 await count(page.locator('.page-content footer'),0);
 await page.locator('.rd-decision-disclosure').click();
 await textIncludes(page.locator('.rd-decision-evidence'),'什么发生时，需要重审判断');
 await count(page.locator('.rd-decision-evidence ol li'),3);
 const gates=page.locator('.rd-summary-gate');await count(gates,4);
 assert.ok(await gates.locator('p').first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=16));
 const firstGate=await gates.nth(0).boundingBox(),secondGate=await gates.nth(1).boundingBox();
 assert.ok(secondGate.y>=firstGate.y+firstGate.height,'Decision reasons are read in one vertical column');
 await count(page.locator('.rd-summary-section'),4);
 const scores=page.locator('.rd-summary-scores');await count(scores.locator('summary,button,details'),0);
 await count(scores.locator('.rd-score-breakdown>div:visible'),6);
 assert.equal(await scores.evaluate(el=>el.parentElement.firstElementChild===el),true,'Scores lead the side panel');
 await textIncludes(scores.locator('.rd-score-total'),'待核实');
 await noOverflow(page,'decision '+width);
 await screenshot(page,'framework-decision-'+width,'.rd-decision-evidence');await page.keyboard.press('Escape');await page.getByRole('dialog',{name:'判断依据与验证条件',exact:true}).waitFor({state:'hidden'});
 await page.getByRole('button',{name:'以本报告更新财报',exact:true}).click();
 await page.locator('.research-workbench').waitFor();
 await textIncludes(page.locator('.path-picker'),'财报更新');
 await textIncludes(page.getByRole('combobox',{name:'对照研究'}),decisionJob.input.question);
 await page.getByRole('textbox',{name:'上次研究结论'}).fill('关注原有现金流假设是否改变（仅合成测试）');
 await noOverflow(page,'baseline context '+width);
 const clipped=await page.locator('.research-context-fields').evaluate(root=>{
  const boundary=root.getBoundingClientRect();
  return [...root.querySelectorAll('textarea,[data-slot=select-trigger],p')].filter(element=>element.getBoundingClientRect().right>boundary.right+1).map(element=>element.tagName);
 });
 assert.deepEqual(clipped,[],'Baseline fields must fit within the visible context card');
 await screenshot(page,'framework-baseline-'+width,'.workbench-context');
 await page.getByRole('button',{name:'开始财报更新',exact:true}).click();
 await page.locator('.research-detail').waitFor();
 const update=requests('POST','/api/jobs').at(-1).body;
 assert.equal(update.mode,'C');assert.equal(update.baselineJobId,decisionJob.id);assert.match(update.previousResearch,/原有现金流/);
 await workbench(page);
 await page.locator('#question').fill('分析我的持仓组合中的贵州茅台');
 await page.getByRole('combobox',{name:'研究路径',exact:true}).click();
 await page.getByRole('option',{name:'组合分析',exact:true}).click();
 await page.getByLabel('当前持仓',{exact:true}).waitFor();
 for(const field of portfolioFields)await page.getByLabel(field.label,{exact:true}).fill('合成'+field.label);
 await textIncludes(page.locator('.portfolio-context .context-readiness'),'组合信息已齐');
 await noOverflow(page,'portfolio context '+width);
 await screenshot(page,'framework-portfolio-'+width,'.workbench-context');
 await page.getByRole('button',{name:'开始组合分析',exact:true}).click();
 await page.locator('.research-detail').waitFor();
 const portfolio=requests('POST','/api/jobs').at(-1).body;
 assert.equal(portfolio.mode,'E');assert.equal(Object.keys(portfolio.portfolioContext).length,6);assert.equal(portfolio.baselineJobId,undefined);
 await page.goto('/history');
 await page.locator('.rh-outcome').waitFor();await textIncludes(page.locator('.rh-outcome'),'观察');
 await count(page.locator('.page-content footer'),0);
});

// Research settings stay usable while backend plans and rules have no frontend entry.
for(const width of [320,1440])test(`mode-reader-interface-${width}`,{viewport:{width,height:1000},jobs:Object.keys(modes).map((mode,index)=>makeJob(930+index,'completed',{mode,question:modes[mode].example}))},async({page,requests})=>{
 for(const [index,mode] of Object.keys(modes).entries()){
  const job=makeJob(930+index,'completed',{mode,question:modes[mode].example});
  await page.goto(`/research/${job.id}?tab=approach`);
  await textIncludes(page.locator('.rd-panel:visible'),'合成研究报告');
  await count(page.locator('.rd-tab-list').getByRole('tab'),3);
  await count(page.locator('.research-scope,.rd-approach'),0);
  await page.getByRole('tab',{name:/证据来源/}).click();
  await page.waitForURL(/[?&]tab=sources/);
  await page.goBack();await textIncludes(page.locator('.rd-panel:visible'),'合成研究报告');
  await noOverflow(page,`mode ${mode} detail ${width}`);
 }
 await workbench(page);await page.locator('#question').fill('研究贵州茅台的长期投资价值');
 await textIncludes(page.locator('.security-chip'),'600519');
 for(const mode of Object.keys(modes)){
  await page.getByRole('combobox',{name:'研究路径',exact:true}).click();
  await page.getByRole('option',{name:modes[mode].name,exact:true}).click();
  await textIncludes(page.locator('.path-picker'),modes[mode].name);
  await count(page.locator('.screen-scope,.research-plan'),0);
  await count(page.getByRole('button',{name:'交付内容与研究约束'}),0);
  if(mode==='A')await count(page.getByRole('combobox',{name:'报告深度'}),0);
  else await page.getByRole('combobox',{name:'报告深度'}).waitFor();
  await noOverflow(page,`mode ${mode} workbench ${width}`);
  if(mode==='B'){
   await screenshot(page,`workbench-reader-${width}`,'.research-workbench');
   await page.getByRole('textbox',{name:'研究关注点',exact:true}).waitFor();
   await count(page.locator('.workbench-context>.research-context-content'),0);
   await page.getByRole('button',{name:'补充持仓与配置约束',exact:true}).click();
   for(const field of portfolioFields)assert.ok(await page.getByLabel(field.label,{exact:true}).isVisible(),'Portfolio fields remain directly available');
   await screenshot(page,`workbench-flat-settings-${width}`,'.workbench-settings');
   await screenshot(page,`workbench-flat-materials-${width}`,'.research-materials');
  }
 }
 assert.equal(requests('POST','/api/research/plan').length,0);
 assert.equal(requests('POST','/api/jobs').length,0);
});

for(const width of [320,390,1440])test(`material-warnings-${width}`,{jobs:[],viewport:{width,height:1000}},async({page,db})=>{
 const job=makeJob(958,'completed',{mode:'B',question:'资料提示跳转验证（合成测试）'});
 const reportTitles=['2026年中期报告','2026年第一季度报告','2025年年度报告','2025年第三季度报告','2025年中期报告','2025年第一季度报告','2024年年度报告','2024年第三季度报告','2023年年度报告','2022年年度报告','2021年年度报告'].map(title=>'中国平安'+title);
 job.input.sources=reportTitles.slice(0,10).map((title,index)=>({id:'S'+(index+1),title,text:'合成财报原文 '+title,official:true})).reverse();
 job.result.warnings=[...reportTitles.flatMap((title,index)=>[`${title}：${index%2+1} 页使用 OCR，识别内容待原件核对，不能单独作为计算依据`,`${title}：PDF 仍有待核对页：1、${170+index}`]),'合成公告按预算选取，尚不代表所有分红、回购或注销事件已齐全。','合成财务数据尚需核对币种、单位与财务口径。','行情可能延迟；模型复核不等于人工审计'];
 db.set(job.id,job);await detail(page,job);
 const trigger=page.locator('.rd-warning-strip'),warnings=page.getByRole('dialog',{name:'阅读提示',exact:true}),details=warnings.getByRole('region',{name:'财报解析提示'});
 await count(warnings,0);assert.ok((await trigger.boundingBox()).height<=44,'Notice occupies only one compact line');
 await screenshot(page,'material-warnings-compact-'+width);
 await trigger.focus();await page.keyboard.press('Enter');await warnings.waitFor({state:'visible'});
 await count(details.locator('.rd-parsing-report:visible'),4);await count(warnings.locator('details'),0);
 await warnings.getByRole('tab',{name:/^数据说明/}).click();await textIncludes(warnings.getByRole('region',{name:'数据说明'}),'行情可能延迟');
 await count(warnings.locator('.rd-general-warnings li'),3);await noOverflow(page,'warning data notes '+width);
 await page.keyboard.press('ArrowLeft');await count(details.locator('.rd-parsing-report:visible'),4);
 await count(details.locator('.rd-ocr-label'),4);await count(details.locator('.rd-page-numbers'),4);
 assert.ok(await details.locator('.rd-parsing-report-name strong').first().evaluate(node=>parseFloat(getComputedStyle(node).fontSize)>=15));
 await screenshot(page,'material-warnings-drawer-'+width);
 await details.getByRole('button',{name:'显示更多报告（7）',exact:true}).click();await count(details.locator('.rd-parsing-report'),8);
 await details.getByRole('button',{name:'显示更多报告（3）',exact:true}).click();await count(details.locator('.rd-parsing-report'),11);
 assert.deepEqual(await details.locator('.rd-parsing-report-name strong').allTextContents(),reportTitles);
 await textIncludes(details.locator('.rd-parsing-report').last(),'暂无关联原文');
 assert.equal(await details.getByRole('button',{name:'已显示全部',exact:true}).isEnabled(),false);
 await page.keyboard.press('Escape');await warnings.waitFor({state:'hidden'});
 assert.equal(await trigger.evaluate(node=>node===document.activeElement),true,'Closing restores focus to notice');
 assert.ok((await trigger.boundingBox()).height<=44,'Reading layout remains compact after opening details');
 await trigger.click();await count(details.locator('.rd-parsing-report:visible'),11);
 await warnings.getByRole('button',{name:'关闭',exact:true}).click();await warnings.waitFor({state:'hidden'});
 await page.getByRole('tab',{name:/证据来源/}).click();await page.getByRole('searchbox',{name:'搜索证据来源'}).fill('不存在的来源');
 await page.getByRole('tab',{name:'研究报告',exact:true}).click();await trigger.click();
 const shortcut=details.getByRole('button',{name:'查看证据 S3：中国平安2025年年度报告',exact:true});
 await shortcut.focus();await page.keyboard.press('Enter');await queryIs(page,{tab:'sources'});await warnings.waitFor({state:'hidden'});
 const target=page.locator('.rd-source-list .rd-source').filter({has:page.locator('.rd-source-id',{hasText:'[S3]'})});
 await target.getByRole('region',{name:'S3 正文预览'}).waitFor({state:'visible'});
 assert.equal(await page.getByRole('searchbox',{name:'搜索证据来源'}).inputValue(),'');
 assert.equal(await target.locator('.rd-source-trigger').evaluate(node=>node===document.activeElement),true);
 const box=await target.locator('.rd-source-trigger').boundingBox();assert.ok(box.y>=0&&box.y+box.height<1000);
 await noOverflow(page,'warning source shortcut '+width);

});

for(const width of [320,1440])test(`calculation-partial-${width}`,{jobs:[],viewport:{width,height:1000}},async({page,db})=>{
 const mixedJob=makeJob(959,'completed',{mode:'B',depth:'Deep',question:'计算部分完成（合成测试）'});
 mixedJob.workflow.stages.find(stage=>stage.id==='calculation').status='failed';
 mixedJob.events.push(...Array.from({length:5},(_,index)=>({type:'tool_result',toolName:'calculate_p2',toolCallId:`ok-${index}`,result:{ordinary:.5}})),
  {type:'tool_result',toolName:'calculate_normalized_earnings',toolCallId:'bad-block',result:{error:'计算引用的原文证据块不存在或不属于所选资料'}},
  {type:'tool_result',toolName:'calculate_screen_metrics',toolCallId:'ocr',result:{error:'OCR识别数字仍待核对，须关联非OCR的官方XBRL/原文'}});
 db.set(mixedJob.id,mixedJob);
 await detail(page,mixedJob);
 await textIncludes(page.locator('.rd-overview'),'深度研究报告已生成，计算部分完成');await openProcess(page);
 await textIncludes(page.locator('.research-progress .stage-partial'),'估值与敏感性计算');
 await textIncludes(page.locator('.research-progress .stage-partial'),'部分完成');
 await page.locator('.calculation-issues summary').click();
 await textIncludes(page.locator('.calculation-issues'),'5 次返回结果，2 次调用失败');
 await textIncludes(page.locator('.calculation-issues'),'OCR识别数字仍待核对');
 await count(page.locator('.calculation-issues li'),2);
 await noOverflow(page,`calculation partial ${width}`);
 await screenshot(page,`calculation-partial-${width}`,'.research-progress');
});

const deepProcessJob=makeJob(960,'completed',{mode:'B',depth:'Deep',question:'比亚迪深度投资研究（交互测试，非真实报告）'});
deepProcessJob.result.researchSummary=reviewFixture(deepProcessJob.input).researchSummary;
deepProcessJob.events.push({type:'tool_result',toolName:'calculate_normalized_earnings',toolCallId:'synthetic-normalized',message:'正常化盈利计算已返回（合成）',result:{value:[10,40],notice:'合成数据'}});
const auditInteractionJob=structuredClone(deepProcessJob);
auditInteractionJob.id=makeJob(9060).id;
auditInteractionJob.input.question='研究审计 · 分区与阅读交互（合成测试）';
auditInteractionJob.result.audit='## 复核过程\n\n重新核对引用与可见证据。未获得原始披露支持的数字保留为资料缺口，研究判断应结合数据时点与适用限制阅读。\n\n## 修正记录\n\n- 统一比较期间，区分已披露数据和假设。\n- 对未确认的增长口径补充待核实条件。\n\n以上内容为界面测试资料，不代表真实投资研究。';
auditInteractionJob.result.decision=reviewFixture(auditInteractionJob.input).decision;
auditInteractionJob.result.decision.missingData=['需补充完整财报附注，核对投资收益的期间与统计口径。','需取得可比期间的业务原始披露，验证增长是否可持续。','需要关联原文及报告页码，补充尚未确认的关键计算依据。'];
auditInteractionJob.result.researchSummary.checks=Array.from({length:5},(_,index)=>({
 topic:['当前估值是否充分反映经营风险？','核心业务的增长是否具有可持续性？','盈利质量是否得到经营现金流支持？','股东回报假设是否具有充分证据？','关键情景变化会如何影响研究判断？'][index],
 assessment:'合成判断：已有资料提供了初步线索，但比较期间与统计口径尚未完全一致。需要结合原始披露与证据时点，进一步核对这一判断的适用边界。',
 sourceIds:['S1','S2'],unresolved:index===4?'':'合成待核实条件：补充完整原文，核对可比期间与计算假设。',
}));
auditInteractionJob.evidenceFollowup={checks:[
 {id:'F1',status:'unresolved',reason:auditInteractionJob.result.researchSummary.checks[0].unresolved},
 {id:'F2',status:'unresolved',reason:'统一比较期间，区分已披露数据和假设。'},
 {id:'F3',status:'unresolved',reason:'部分附注原文读取失败，尚无法核对相关披露。'},
 {id:'F4',status:'unresolved',reason:'部分附注原文读取失败，尚无法核对相关披露。'},
]};
for(const width of [320,768,1440,1920])test(`audit-reading-hierarchy-${width}`,{jobs:[auditInteractionJob],viewport:{width,height:1000}},async({page,requests})=>{
 await page.goto(`/research/${auditInteractionJob.id}?tab=audit`);
 await textIncludes(page.locator('.rd-audit-review-body'),'修正记录');
 await count(page.locator('.rd-audit-content nav,.rd-audit-content [aria-expanded]'),0);
 await count(page.locator('.rd-audit-question dd:visible'),5);
 await count(page.getByRole('heading',{name:'待核实事项',exact:true}),0);
 await count(page.locator('.rd-audit-missing li'),1);
 await textIncludes(page.locator('.rd-audit-missing'),'F3');
 assert.doesNotMatch(await page.locator('.rd-audit-missing').textContent(),/F1|F2|F4/,'Already explained and repeated gaps are omitted');
 assert.ok(!(await page.locator('.rd-audit-content').textContent()).includes(auditInteractionJob.result.decision.missingData[0]),'General research follow-ups remain in the report');
 await noOverflow(page,`audit reading ${width}`);
 await screenshot(page,`audit-overview-${width}`);
 await screenshot(page,`audit-questions-${width}`,'.rd-audit-basis');
 const sourceLink=page.locator('.rd-audit-evidence-link').first();
 await sourceLink.focus();await page.keyboard.press('Enter');
 await queryIs(page,{tab:'sources'});await textIncludes(page.locator('.rd-sources'),'S1');
 assert.equal(requests('POST','/api/jobs').length,0,'Reading interactions never create research');
});
for(const width of [320,1440]){
test(`audit-evidence-hierarchy-${width}`,{jobs:[deepProcessJob],viewport:{width,height:1000}},async({page,requests})=>{
 await detail(page,deepProcessJob);
 await textIncludes(page.locator('.rd-overview'),'深度研究已完成');await openProcess(page);
 await count(page.locator('.rd-deep-process,.rd-web-status'),0);await closeProcess(page);
 await page.getByRole('tab',{name:'审计记录',exact:true}).click();
 await textIncludes(page.locator('.rd-audit-research-notes'),'合成资料不足');
 await page.locator('.rd-audit-review-body').getByRole('heading',{name:'合成审计记录',exact:true}).waitFor();
 await count(page.locator('.rd-audit-question'),deepProcessJob.result.researchSummary.checks.length);
 await page.getByRole('heading',{name:'判断依据',exact:true}).click();
 await noOverflow(page,`deep process expanded ${width}`);
 await screenshot(page,`deep-process-${width}`,'.rd-report-card');
 await page.locator('.rd-audit-research-notes').getByRole('button',{name:/查看依据/}).first().click();
 await queryIs(page,{tab:'sources'});await textIncludes(page.locator('.rd-sources'),'S1');
 await page.getByRole('tab',{name:'研究报告',exact:true}).click();
 const actions=await detailActions(page),[download]=await Promise.all([page.waitForEvent('download'),downloadReport(page,actions)]);
 const exported=await readFile(await download.path(),'utf8');
 assert.match(exported,/# 一、研究计划与证据判断[\s\S]*# 二、实际工具调用与资料获取[\s\S]*# 三、完整研究结果/);
 assert.match(exported,/synthetic-normalized/);assert.match(exported,/合成资料不足/);
 assert.equal(requests('POST','/api/jobs').length,0);
});
test(`deep-process-${width}`,{jobs:[deepProcessJob],viewport:{width,height:1000}},async({page,requests})=>{
 await workbench(page);
 await page.getByRole('combobox',{name:'研究路径',exact:true}).click();
 await page.getByRole('option',{name:'深度研究',exact:true}).click();
 await page.getByRole('button',{name:'比亚迪深度投资研究',exact:true}).click();
 assert.match(await page.locator('#question').inputValue(),/比亚迪A股深度投资研究.*资本回报.*普通股权益.*估值假设与安全边际/);
 await textIncludes(page.locator('.path-picker'),'深度研究');
 await textIncludes(page.getByRole('combobox',{name:'报告深度',exact:true}),'完整展开');
 await textIncludes(page.locator('.options-row .choice-field').first(),'完整展开包含三情景、敏感性分析与研究评分。');
 await noOverflow(page,`deep workbench ${width}`);
 await screenshot(page,`deep-workbench-${width}`,'.research-workbench');
 assert.equal(requests('POST','/api/jobs').length,0,'Selecting an example must not silently start paid research');
 await enabled(page.getByRole('button',{name:'开始深度研究',exact:true}));
 await page.getByRole('button',{name:'开始深度研究',exact:true}).click();
 await page.locator('.research-detail').waitFor();
 const submitted=requests('POST','/api/jobs')[0].body;
 assert.equal(submitted.mode,'B');assert.equal(submitted.depth,'Deep');assert.equal(submitted.historyYears,5);
 assert.match(submitted.question,/比亚迪A股深度投资研究/);assert.equal(submitted.securities[0].symbol,'002594');assert.equal(submitted.securities[0].market,'CN');
});
}

const duplicateHeadingJob=makeJob(970,'completed',{mode:'B',question:'重复章节标题回归测试'});
duplicateHeadingJob.result.report='# 合成报告\n\n## 行业与竞争\n\n## 行业与竞争\n\n行业正文[S1]\n\n### 竞争格局\n\n保留下级标题。\n\n## 后续验证与判断升级条件\n\n---\n\n## 后续验证与判断升级条件\n\n| 指标 | 期间 |\n|---|---|\n| 利润 | 半年 |\n';
for(const width of [320,1440])test(`report-heading-dedup-${width}`,{jobs:[duplicateHeadingJob],viewport:{width,height:1000}},async({page})=>{
 await detail(page,duplicateHeadingJob);
 const report=page.locator('.rd-markdown[aria-label="报告正文"]');
 for(const title of ['行业与竞争','后续验证与判断升级条件','竞争格局'])await count(report.getByRole('heading',{name:title,exact:true}),1);
 await openDirectory(page);
 const directory=page.getByRole('navigation',{name:'报告目录',exact:true});
 for(const title of ['行业与竞争','后续验证与判断升级条件'])await count(directory.getByRole('link',{name:title,exact:true}),1);
 // Capture without scrolling the report card: scrolling dismisses the compact directory.
 await page.screenshot({path:fileURLToPath(new URL(`ui-report-heading-dedup-${width}.png`,artifacts)),animations:'disabled'});
 await directory.getByRole('link',{name:'后续验证与判断升级条件',exact:true}).click();
 await eventually(()=>report.getByRole('heading',{name:'后续验证与判断升级条件',exact:true}).evaluate(el=>document.activeElement===el),'Directory must focus the retained heading');
 await textIncludes(report.locator('table'),'利润');await noOverflow(page,`deduplicated report ${width}`);
 const actions=await detailActions(page),[download]=await Promise.all([page.waitForEvent('download'),downloadReport(page,actions)]);
 const exported=await readFile(await download.path(),'utf8');
 assert.equal((exported.match(/^## 行业与竞争$/gm)||[]).length,1);
 assert.equal((exported.match(/^## 后续验证与判断升级条件$/gm)||[]).length,1);
});

const followedJob=makeJob(980,'completed',{question:'网页补证界面回归（合成）'});
followedJob.webResearch={enabled:true,configured:true,searchCount:2,sourceIds:['S2']};
followedJob.evidenceFollowup={status:'completed',checks:[{id:'F1',status:'unresolved',reason:'合成缺口待核对'}]};
const followupRunning=makeJob(981,'running',{question:'正在补查关键证据（合成）'});
followupRunning.webResearch={enabled:true,configured:true,searchCount:0,sourceIds:[]};followupRunning.evidenceFollowup={status:'running',checks:[]};
const noWebJob=makeJob(982,'completed',{question:'未发起网页搜索的历史报告（合成）'});
noWebJob.webResearch={enabled:true,configured:true,searchCount:0,sourceIds:[]};
const reusedWebJob=makeJob(989,'completed',{question:'复用原文与独立缺口（合成）'});
reusedWebJob.webResearch={enabled:true,configured:true,searchCount:1,sourceIds:['S2'],reusedSearches:2,duplicateCandidates:3,gaps:[{id:'G1',status:'evidence-located'},{id:'G2',status:'body-read-needs-review'},{id:'G3',status:'failed'}]};
reusedWebJob.evidenceFollowup={status:'completed',checks:[{id:'F1',webGapId:'G2',status:'unresolved'},{id:'F2',status:'not-searchable'}]};
for(const width of [320,1440])test(`web-followup-status-${width}`,{jobs:[followedJob,followupRunning,noWebJob,reusedWebJob],viewport:{width,height:1000}},async({page})=>{
 await detail(page,followedJob);await openProcess(page);await count(page.locator('.rd-web-status,.rd-deep-process'),0);await closeProcess(page);
 await page.getByRole('tab',{name:/证据来源/}).click();
 await textIncludes(page.locator('.rd-web-source-note'),'已搜索 2 次');await textIncludes(page.locator('.rd-web-source-note'),'新增 1 份');
 await noOverflow(page,`web followup ${width}`);await screenshot(page,`web-followup-${width}`,'.rd-sources');
 await page.getByRole('tab',{name:'审计记录',exact:true}).click();await textIncludes(page.locator('.rd-audit-research-notes'),'合成缺口待核对');
 await detail(page,followupRunning);await openProcess(page);await count(page.locator('.rd-web-status'),0);await closeProcess(page);
 await detail(page,noWebJob);await page.getByRole('tab',{name:/证据来源/}).click();await count(page.locator('.rd-web-source-note'),0);
 await detail(page,reusedWebJob);await page.getByRole('tab',{name:'审计记录',exact:true}).click();
 const notes=page.locator('.rd-audit-research-notes');await count(notes.locator('li'),3);
 await textIncludes(notes,'F1');await textIncludes(notes,'F2');await textIncludes(notes,'G3');assert.doesNotMatch(await notes.textContent(),/G1|G2/);
 await noOverflow(page,`web reuse ${width}`);await screenshot(page,`web-reuse-${width}`,'.rd-audit-research-notes');
});

const auditRepairJob=makeJob(983,'failed',{question:'审计修正原因展示（合成）'});
auditRepairJob.events.push({type:'audit_validation',time:auditRepairJob.createdAt,message:'交付检查未通过',category:'validation',retryable:false,
 issues:[{path:'decision.action',message:'研究动作不符合当前模式'},{path:'decision.dataAsOf',message:'数据截止日期无效'}],stopReason:'相同问题修正后仍存在，已停止重复尝试'});
for(const width of [320,1440])test(`audit-repair-details-${width}`,{jobs:[auditRepairJob],viewport:{width,height:1000}},async({page})=>{
 await detail(page,auditRepairJob);
 const trace=page.getByRole('complementary',{name:'研究执行轨迹'});
 await trace.scrollIntoViewIfNeeded();
 await textIncludes(trace,'研究动作不符合当前模式');await textIncludes(trace,'数据截止日期无效');await textIncludes(trace,'自动修正已停止');
 await trace.getByRole('button',{name:'查看详细执行记录',exact:true}).click();await trace.getByRole('combobox',{name:'事件筛选'}).click();await page.getByRole('option',{name:'异常与提示',exact:true}).click();
 await textIncludes(trace,'相同问题修正后仍存在');await noOverflow(page,`audit repairs ${width}`);
 await screenshot(page,`audit-repairs-${width}`,'.rd-audit-issues');
});

const evidenceWindowJob=makeJob(984,'completed',{question:'复核资料范围（合成）'});
evidenceWindowJob.result.validation.initialEvidenceWindow={evidenceTotal:5,evidenceIncluded:3,toolsTotal:4,toolsIncluded:2,omittedEvidence:[{sourceId:'S1',blockId:'p7'}],omittedTools:[{toolCallId:'large'}]};
for(const width of [320,1440])test(`audit-evidence-window-${width}`,{jobs:[evidenceWindowJob],viewport:{width,height:1000}},async({page})=>{
 await detail(page,evidenceWindowJob);await page.getByRole('tab',{name:'审计记录',exact:true}).click();
 const window=page.locator('.rd-audit-window');await textIncludes(window,'3/5 段完整证据');await textIncludes(window,'2/4 条完整工具记录');
 await textIncludes(window,'资料已送审不等于事实已核实');
 await textIncludes(window,'部分记录超出本轮容量');await noOverflow(page,`audit evidence ${width}`);
 await window.evaluate(element=>element.scrollIntoView({block:'center',behavior:'instant'}));
 await page.screenshot({path:fileURLToPath(new URL(`ui-audit-evidence-${width}.png`,artifacts)),animations:'disabled'});
});

const materialJob=makeJob(985,'completed',{question:'用户材料保存与复用（合成）',referenceMaterials:[{id:'M1',title:'测试笔记.md',text:'这是需重新核对的研究线索，不是官方事实。',type:'user-reference',verified:false}]});
for(const width of [320,1440])test(`reference-materials-${width}`,{jobs:[materialJob],viewport:{width,height:1000}},async({page,requests})=>{
 await workbench(page);await page.locator('#question').fill('研究贵州茅台');await textIncludes(page.locator('.security-chip'),'600519');
 const area=page.getByRole('region',{name:'用户补充资料'}),start=page.locator('button[type=submit]');
 await area.getByRole('tab',{name:/粘贴文字/}).click();
 if(await area.getByRole('tab',{name:/^粘贴文字/}).count())await area.getByRole('tab',{name:/^粘贴文字/}).click();
 await area.getByRole('textbox',{name:'补充资料正文'}).fill('合成现金流研究线索');await enabled(start,false);
 await area.getByRole('button',{name:'加入资料',exact:true}).click();await textIncludes(area,'补充资料 1');await enabled(start);
 await area.getByRole('tab',{name:'导入文件',exact:true}).click();
 if(await area.getByRole('tab',{name:'导入文件',exact:true}).count())await area.getByRole('tab',{name:'导入文件',exact:true}).click();
 await page.locator('input[type=file]').setInputFiles({name:'额外材料.md',mimeType:'text/markdown',buffer:Buffer.from('需核对资本开支的合成笔记')});
 await textIncludes(area,'额外材料.md');await enabled(start);
 await noOverflow(page,`reference materials ${width}`);
 await area.evaluate(element=>element.scrollIntoView({block:'center',behavior:'instant'}));
 await page.screenshot({path:fileURLToPath(new URL(`ui-reference-materials-${width}.png`,artifacts)),animations:'disabled'});
 await start.click();await page.waitForURL(/\/research\//);
 const body=requests('POST','/api/jobs').at(-1).body;assert.equal(body.referenceMaterials.length,2);assert.equal(body.referenceMaterials[0].text,'合成现金流研究线索');assert.equal(body.referenceMaterials[1].verified,false);
 await detail(page,materialJob);await page.getByRole('tab',{name:/^证据来源/}).click();
 const saved=page.getByRole('region',{name:'已保存的用户补充资料'});await saved.getByRole('button',{name:/测试笔记/}).click();await textIncludes(saved,'不是官方事实');
 const actions=await detailActions(page);await actions.getByRole('button',{name:'复用研究输入',exact:true}).click();await page.locator('.research-workbench').waitFor();
 await textIncludes(page.getByRole('region',{name:'用户补充资料'}),'测试笔记.md');assert.equal(requests('POST','/api/jobs').length,1);
});

for(const width of [320,1440])test(`composer-refresh-${width}`,{viewport:{width,height:1000}},async({page,requests})=>{
 await workbench(page);await page.locator('#question').fill('研究贵州茅台的现金流');await textIncludes(page.locator('.security-chip'),'600519');
 await page.getByRole('button',{name:'手动调整',exact:true}).click();await page.getByRole('textbox',{name:'标的1股票代码',exact:true}).fill('000001');
 if(await page.getByRole('tab',{name:/^粘贴文字/}).count())await page.getByRole('tab',{name:/^粘贴文字/}).click();
 await page.getByRole('textbox',{name:'补充资料正文'}).fill('尚未加入资料的合成笔记');
 await textIncludes(page.locator('.composer-draft-status'),'当前标签页暂存');
 await page.reload();await page.locator('.research-workbench').waitFor();
 assert.equal(await page.locator('#question').inputValue(),'研究贵州茅台的现金流');
 assert.equal(await page.getByRole('textbox',{name:'标的1股票代码',exact:true}).inputValue(),'000001');
 assert.equal(await page.getByRole('textbox',{name:'补充资料正文'}).inputValue(),'尚未加入资料的合成笔记');
 await enabled(page.locator('button[type=submit]'),false);assert.equal(requests('POST','/api/jobs').length,0);
 await noOverflow(page,`composer draft ${width}`);
 await page.getByRole('button',{name:'清空输入',exact:true}).click();await page.reload();await page.locator('.research-workbench').waitFor();
 if(await page.getByRole('tab',{name:/^粘贴文字/}).count())await page.getByRole('tab',{name:/^粘贴文字/}).click();
 assert.equal(await page.locator('#question').inputValue(),'');assert.equal(await page.getByRole('textbox',{name:'补充资料正文'}).inputValue(),'');
 await page.locator('#question').fill('研究贵州茅台');await textIncludes(page.locator('.security-chip'),'600519');await page.locator('button[type=submit]').click();await page.waitForURL(/\/research\//);
 await workbench(page);assert.equal(await page.locator('#question').inputValue(),'');assert.equal(requests('POST','/api/jobs').length,1);
});

const syncJob=makeJob(986,'running',{question:'连接恢复测试（合成）'});
test('job-stream-recovery',{jobs:[syncJob],viewport:{width:1440,height:1000}},async({page,db,hold,requests})=>{
 await page.addInitScript(()=>{
  window.__streams=[];window.__timeOffset=0;const now=Date.now;Date.now=()=>now()+window.__timeOffset;
  window.EventSource=class{
   constructor(){this.handlers={};window.__streams.push(this);}
   addEventListener(type,fn){this.handlers[type]=fn;}
   close(){this.closed=true;}
   emit(type,value){this.handlers[type]?.({data:JSON.stringify(value)});}
  };
 });
 await detail(page,syncJob);await openProcess(page);const job=db.get(syncJob.id);
 job.events.push({type:'progress',message:'断线期间仍在处理合成资料',time:job.createdAt});
 await page.evaluate(()=>window.__streams.at(-1).onerror());
 await textIncludes(page.locator('.rd-events'),'断线期间仍在处理合成资料');
 const path='/api/jobs/'+job.id,prior=requests('GET',path).length,release=hold('GET '+path);
 await page.evaluate(()=>{window.__timeOffset+=6000;window.dispatchEvent(new Event('focus'));});
 await eventually(()=>requests('GET',path).length>prior,'Fallback status read must start');
 await page.evaluate(()=>window.__streams.at(-1).emit('trace',{type:'progress',message:'比状态请求更新的实时事件'}));
 const response=page.waitForResponse(response=>new URL(response.url()).pathname===path);
 release();await (await response).finished();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await textIncludes(page.locator('.rd-events'),'比状态请求更新的实时事件');await closeProcess(page);
 await page.evaluate(()=>{window.__streams.at(-1).emit('report_delta',{delta:''});});
 job.status='completed';job.result=makeJob(986).result;
 await page.evaluate(()=>{window.__timeOffset+=6000;window.dispatchEvent(new Event('focus'));});
 await page.getByRole('heading',{name:'合成研究报告',exact:true}).waitFor();
 assert.equal(requests('POST','/api/jobs').length,0);assert.equal(await page.evaluate(()=>window.__streams.at(-1).closed),true);
});

for(const width of [320,1440])test(`reference-formats-${width}`,{viewport:{width,height:1100}},async({page,requests})=>{
 await workbench(page);await page.locator('#question').fill('研究贵州茅台');await textIncludes(page.locator('.security-chip'),'600519');
 const area=page.getByRole('region',{name:'用户补充资料'}),input=area.locator('input[type=file]'),start=page.locator('button[type=submit]');
 await input.setInputFiles([
  {name:'年报笔记.docx',mimeType:'application/octet-stream',buffer:Buffer.from(materialDocx)},
  {name:'不支持.exe',mimeType:'application/octet-stream',buffer:Buffer.from('invalid')},
  {name:'财务数据.xlsx',mimeType:'application/octet-stream',buffer:Buffer.from(materialXlsx)},
  {name:'研究汇报.pptx',mimeType:'application/octet-stream',buffer:Buffer.from(materialPptx)},
  {name:'annual.pdf',mimeType:'application/pdf',buffer:materialPdf()},
 ]);
 await textIncludes(area.locator('.materials-live-status'),'已加入 4 份资料，1 个文件未导入');await enabled(start);
 await textIncludes(area.locator('.materials-import-error'),'不支持此格式');
 for(const [name,expected] of [['年报笔记.docx','现金流研究笔记'],['财务数据.xlsx','"value": "100"'],['研究汇报.pptx','第一页：研究结论'],['annual.pdf','Annual cash flow: 100']]){
  const preview=area.locator('details').filter({hasText:name});await preview.locator('summary').click();await textIncludes(preview.locator('pre'),expected);await preview.locator('summary').click();
 }
 await input.setInputFiles({name:'重复笔记.docx',mimeType:'application/octet-stream',buffer:Buffer.from(materialDocx)});await textIncludes(area.locator('.materials-import-error'),'相同内容已加入');await count(area.locator('.materials-saved li'),4);
 const transfer=await page.evaluateHandle(()=>{const data=new DataTransfer();data.items.add(new File(['拖拽加入的现金流假设'],'拖拽笔记.csv',{type:'text/csv'}));return data;});
 await area.locator('.materials-dropzone').dispatchEvent('drop',{dataTransfer:transfer});await textIncludes(area.locator('.materials-saved'),'拖拽笔记.csv');
 await area.getByRole('tab',{name:/粘贴文字/}).click();await area.getByRole('textbox',{name:'补充资料名称',exact:true}).fill('核查假设');await area.getByRole('textbox',{name:'补充资料正文'}).fill('需要核对营运资本变化');await enabled(start,false);
 await area.getByRole('tab',{name:'导入文件',exact:true}).click();await area.getByRole('button',{name:'继续编辑'}).click();await area.getByRole('button',{name:'加入资料',exact:true}).click();
 await area.getByRole('tab',{name:'导入文件',exact:true}).click();await enabled(area.getByRole('button',{name:'选择文件',exact:true}),false);await textIncludes(area,'资料名额已满');
 await area.getByRole('button',{name:'移除资料：拖拽笔记.csv',exact:true}).click();await enabled(area.getByRole('button',{name:'选择文件',exact:true}));await count(area.locator('.materials-saved li'),5);
 await noOverflow(page,`material formats ${width}`);await area.evaluate(element=>element.scrollIntoView({block:'start',behavior:'instant'}));
 await area.screenshot({path:fileURLToPath(new URL(`ui-material-formats-${width}.png`,artifacts)),animations:'disabled'});
 await start.click();await page.waitForURL(/\/research\//);const body=requests('POST','/api/jobs').at(-1).body;assert.equal(body.referenceMaterials.length,5);assert.ok(body.referenceMaterials.every(item=>item.verified===false&&item.type==='user-reference'));assert.match(body.referenceMaterials[3].text,/Annual cash flow/);
});

test('reference-import-errors-and-cancel',{},async({page})=>{
 await workbench(page);await page.locator('#question').fill('研究贵州茅台');await textIncludes(page.locator('.security-chip'),'600519');
 const area=page.getByRole('region',{name:'用户补充资料'}),input=area.locator('input[type=file]'),start=page.locator('button[type=submit]');
 await input.setInputFiles([
  {name:'empty.txt',mimeType:'text/plain',buffer:Buffer.alloc(0)},
  {name:'too-long.txt',mimeType:'text/plain',buffer:Buffer.from('字'.repeat(20001))},
  {name:'image-only.pdf',mimeType:'application/pdf',buffer:materialPdf('')},
  {name:'damaged.docx',mimeType:'application/octet-stream',buffer:Buffer.from('not a zip')},
  {name:'good.json',mimeType:'application/json',buffer:Buffer.from('{"现金流":100}')},
 ]);
 await textIncludes(area.locator('.materials-live-status'),'已加入 1 份资料，4 个文件未导入');await textIncludes(area.locator('.materials-import-results'),'文件为空');await textIncludes(area.locator('.materials-import-results'),'20,000');await textIncludes(area.locator('.materials-import-results'),'OCR');await textIncludes(area.locator('.materials-import-results'),'文档无法打开');await enabled(start);
 await area.getByRole('tab',{name:/粘贴文字/}).click();await area.getByRole('textbox',{name:'补充资料正文'}).fill('字'.repeat(20001));await enabled(area.getByRole('button',{name:'加入资料',exact:true}),false);await enabled(start,false);await area.getByRole('button',{name:'清空文字'}).click();await enabled(start);
 await area.getByRole('tab',{name:'导入文件',exact:true}).click();
 const gate=deferred();await page.route('**/api/materials/read',async route=>{await gate.promise;await route.fulfill({json:{text:'不应加入的取消文件'}}).catch(()=>{});});
 try{await input.setInputFiles({name:'slow.txt',mimeType:'text/plain',buffer:Buffer.from('不应加入的取消文件')});await enabled(start,false);await area.getByRole('button',{name:'取消导入'}).click();await textIncludes(area.locator('.materials-import-results'),'导入已取消');await enabled(start);await count(area.locator('.materials-saved li'),1);}finally{gate.resolve();}
});

for(const width of [320,1440])test(`reference-edit-undo-${width}`,{viewport:{width,height:1100}},async({page,requests})=>{
 await workbench(page);await page.locator('#question').fill('研究贵州茅台');await textIncludes(page.locator('.security-chip'),'600519');
 const area=page.getByRole('region',{name:'用户补充资料'}),start=page.locator('button[type=submit]');
 await area.locator('input[type=file]').setInputFiles([
  {name:'原始笔记.txt',mimeType:'text/plain',buffer:Buffer.from('原始现金流假设')},
  {name:'对照笔记.txt',mimeType:'text/plain',buffer:Buffer.from('对照收入假设')},
 ]);await count(area.locator('.materials-saved li'),2);
 await area.getByRole('button',{name:'移除资料：原始笔记.txt',exact:true}).click();await count(area.locator('.materials-saved li'),1);
 await area.getByRole('button',{name:'撤销移除',exact:true}).click();await count(area.locator('.materials-saved li'),2);await textIncludes(area.locator('.materials-saved li').first(),'原始笔记.txt');
 const original=area.locator('details.material-preview').filter({hasText:'原始笔记.txt'});
 await original.locator('summary').click();await original.getByRole('button',{name:'编辑资料',exact:true}).click();
 const editor=area.getByRole('group',{name:'编辑资料：原始笔记.txt',exact:true});
 await enabled(start,false);await enabled(area.getByRole('button',{name:'选择文件',exact:true}),false);
 await editor.getByRole('textbox',{name:'资料正文',exact:true}).fill('对照收入假设');await editor.getByRole('button',{name:'保存修改'}).click();await textIncludes(editor.getByRole('alert'),'相同内容已存在');await enabled(start,false);
 await editor.getByRole('textbox',{name:'资料正文',exact:true}).fill('字'.repeat(20001));await enabled(editor.getByRole('button',{name:'保存修改'}),false);await textIncludes(editor,'还需精简 1 字');
 await editor.getByRole('button',{name:'取消编辑'}).click();await enabled(start);await textIncludes(original,'原始现金流假设');
 await original.getByRole('button',{name:'编辑资料',exact:true}).click();
 await editor.getByRole('textbox',{name:'资料名称',exact:true}).fill('修订后的现金流笔记');await editor.getByRole('textbox',{name:'资料正文',exact:true}).fill('修订假设：重点核对资本开支与现金流的差异。');
 await noOverflow(page,`material editing ${width}`);await editor.screenshot({path:fileURLToPath(new URL(`ui-material-editor-${width}.png`,artifacts)),animations:'disabled'});
 await editor.getByRole('textbox',{name:'资料正文',exact:true}).press('Control+Enter');await count(editor,0);await enabled(start);assert.equal(requests('POST','/api/jobs').length,0);
 const saved=area.locator('details.material-preview').filter({hasText:'修订后的现金流笔记'});await textIncludes(saved.locator('pre'),'重点核对资本开支');
 await area.screenshot({path:fileURLToPath(new URL(`ui-material-refined-${width}.png`,artifacts)),animations:'disabled'});
 await start.click();await page.waitForURL(/\/research\//);const items=requests('POST','/api/jobs').at(-1).body.referenceMaterials;
 assert.equal(items[0].title,'修订后的现金流笔记');assert.equal(items[1].title,'对照笔记.txt');assert.equal(items[0].verified,false);
});

test('reference-batch-slots-and-retry',{},async({page})=>{
 await workbench(page);const area=page.getByRole('region',{name:'用户补充资料'}),input=area.locator('input[type=file]');
 await input.setInputFiles(Array.from({length:5},(_,i)=>({name:`现有${i}.txt`,mimeType:'text/plain',buffer:Buffer.from(`已加入的材料 ${i}`)})));await count(area.locator('.materials-saved li'),5);
 await input.setInputFiles([
  {name:'invalid.doc',mimeType:'application/octet-stream',buffer:Buffer.from('unsupported')},
  {name:'有效文件.txt',mimeType:'text/plain',buffer:Buffer.from('前面失败后仍应导入')},
  {name:'剩余文件.txt',mimeType:'text/plain',buffer:Buffer.from('释放名额后直接重试')},
 ]);
 await textIncludes(area.locator('.materials-live-status'),'已加入 1 份资料，2 个文件未导入');await textIncludes(area.locator('.materials-saved'),'有效文件.txt');await enabled(area.getByRole('button',{name:'重试未完成'}),false);
 await area.getByRole('button',{name:'移除资料：现有0.txt',exact:true}).click();await area.getByRole('button',{name:'重试未完成'}).click();await textIncludes(area.locator('.materials-saved'),'剩余文件.txt');await count(area.locator('.materials-saved li'),6);await count(area.getByRole('button',{name:'撤销移除'}),0);
});

test('reference-timeout-continues-and-retries',{},async({page})=>{
 await workbench(page);const area=page.getByRole('region',{name:'用户补充资料'});
 const gate=deferred();let attempts=0;
 await page.route('**/api/materials/read',async route=>{if(decodeURIComponent(route.request().headers()['x-document-name'])!=='timeout.txt')return route.fallback();if(attempts++===0)await gate.promise;await route.fulfill({json:{text:'超时后重新读取的材料'}}).catch(()=>{});});
 await page.evaluate(()=>{const originalTimer=window.setTimeout;window.setTimeout=(fn,ms,...args)=>originalTimer(fn,ms===150000?300:ms,...args);});
 try{
 await area.locator('input[type=file]').setInputFiles([
  {name:'timeout.txt',mimeType:'text/plain',buffer:Buffer.from('超时后重新读取的材料')},
  {name:'next.txt',mimeType:'text/plain',buffer:Buffer.from('后续正常文件')},
 ]);
 await textIncludes(area.locator('.materials-live-status'),'已加入 1 份资料，1 个文件未导入');await textIncludes(area.locator('.materials-import-error'),'处理超时');await textIncludes(area.locator('.materials-saved'),'next.txt');
 gate.resolve();await count(area.locator('.materials-saved li'),1);
 await area.getByRole('button',{name:'重试未完成'}).click();await count(area.locator('.materials-saved li'),2);await textIncludes(area.locator('.materials-saved'),'timeout.txt');
 }finally{gate.resolve();}
});

test('reference-total-capacity',{},async({page})=>{
 await workbench(page);const area=page.getByRole('region',{name:'用户补充资料'});
 await area.locator('input[type=file]').setInputFiles([15000,15000,15000,14900].map((length,index)=>({name:`容量${index}.txt`,mimeType:'text/plain',buffer:Buffer.from(String(index).repeat(length))})));
 await textIncludes(area.locator('.materials-capacity-help'),'剩余 100 字');
 await area.getByRole('tab',{name:/粘贴文字/}).click();await area.getByRole('textbox',{name:'补充资料正文'}).fill('新'.repeat(101));await enabled(area.getByRole('button',{name:'加入资料',exact:true}),false);await textIncludes(area.getByRole('alert'),'还需精简 1 字');await area.getByRole('button',{name:'清空文字'}).click();
 const original=area.locator('details.material-preview').filter({hasText:'容量0.txt'});await original.locator('summary').click();await original.getByRole('button',{name:'编辑资料'}).click();
 const editor=area.getByRole('group',{name:'编辑资料：容量0.txt'});await editor.getByRole('textbox',{name:'资料正文',exact:true}).fill('替'.repeat(15101));await enabled(editor.getByRole('button',{name:'保存修改'}),false);await textIncludes(editor.getByRole('alert'),'还需精简 1 字');
 await editor.getByRole('textbox',{name:'资料正文',exact:true}).fill('替'.repeat(15100));await editor.getByRole('button',{name:'保存修改'}).click();await textIncludes(area.locator('.materials-capacity-help'),'剩余 0 字');
 await area.getByRole('button',{name:'移除资料：容量1.txt',exact:true}).click();await textIncludes(area.locator('.materials-capacity-help'),'剩余 15,000 字');await area.getByRole('button',{name:'撤销移除'}).click();await textIncludes(area.locator('.materials-capacity-help'),'剩余 0 字');
});

for(const width of [320,1440])test(`reference-search-copy-${width}`,{viewport:{width,height:1100}},async({page,requests})=>{
 await workbench(page);await page.locator('#question').fill('研究贵州茅台');await textIncludes(page.locator('.security-chip'),'600519');
 const content='现金流：第一处\n'+Array.from({length:30},(_,i)=>`第${i+1}行：核对资本开支与盈利假设。`).join('\n')+'\n现金流：第二处\nA+B 计算记录\n现金流：第三处';
 const area=page.getByRole('region',{name:'用户补充资料'});
 await area.locator('input[type=file]').setInputFiles({name:'研究笔记.txt',mimeType:'text/plain',buffer:Buffer.from(content)});await count(area.locator('.materials-saved li'),1);
 const preview=area.locator('details.material-preview');await preview.locator('summary').click();const search=preview.getByRole('textbox',{name:'在研究笔记.txt中查找'});
 await search.fill('现金流');await count(preview.locator('mark'),3);await textIncludes(preview.locator('.material-search-navigation'),'1 / 3');
 await preview.getByRole('button',{name:'下一处匹配'}).click();await textIncludes(preview.locator('.material-search-navigation'),'2 / 3');assert.ok(await preview.locator('pre').evaluate(element=>element.scrollTop>0));
 await search.press('Shift+Enter');await textIncludes(preview.locator('.material-search-navigation'),'1 / 3');await preview.getByRole('button',{name:'上一处匹配'}).click();await textIncludes(preview.locator('.material-search-navigation'),'3 / 3');
 await search.fill('A+B');await count(preview.locator('mark'),1);await search.press('Control+Enter');assert.equal(requests('POST','/api/jobs').length,0);
 await search.fill('不存在');await textIncludes(preview.locator('.material-search-navigation'),'无匹配');await enabled(preview.getByRole('button',{name:'下一处匹配'}),false);await search.press('Escape');await count(preview.locator('mark'),0);
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copiedMaterial=text;}}}));
 await preview.getByRole('button',{name:'复制正文',exact:true}).click();await textIncludes(preview.locator('.material-copy-status'),'已复制正文');assert.equal(await page.evaluate(()=>window.copiedMaterial),content);
 await page.evaluate(()=>{navigator.clipboard.writeText=async()=>{throw new Error('clipboard unavailable');};});await preview.getByRole('button',{name:'复制正文',exact:true}).click();await textIncludes(preview.locator('.material-copy-status'),'未能复制');
 await search.fill('现金流');await noOverflow(page,`material search ${width}`);assert.equal(await preview.locator('pre').textContent(),content);
 await preview.evaluate(element=>element.scrollIntoView({block:'center',behavior:'instant'}));
 await preview.screenshot({path:fileURLToPath(new URL(`ui-material-search-${width}.png`,artifacts)),animations:'disabled'});
});

for(const width of [320,1440])test(`reference-edit-refresh-${width}`,{viewport:{width,height:1100}},async({page,requests})=>{
 await workbench(page);await page.locator('#question').fill('研究贵州茅台');await textIncludes(page.locator('.security-chip'),'600519');
 const area=page.getByRole('region',{name:'用户补充资料'}),start=page.locator('button[type=submit]');
 await area.getByRole('tab',{name:/粘贴文字/}).click();await area.getByRole('textbox',{name:'补充资料名称',exact:true}).fill('刷新后保留的资料名');await area.getByRole('textbox',{name:'补充资料正文',exact:true}).fill('尚未加入的研究笔记');
 await page.waitForFunction(()=>JSON.parse(sessionStorage.getItem('zhiheng:composer:v1'))?.input.materialDraftTitle==='刷新后保留的资料名');
 await page.reload();await area.waitFor();assert.equal(await area.getByRole('textbox',{name:'补充资料名称',exact:true}).inputValue(),'刷新后保留的资料名');await enabled(start,false);
 await area.getByRole('button',{name:'加入资料',exact:true}).click();const preview=area.locator('details.material-preview');await preview.locator('summary').click();await preview.getByRole('button',{name:'编辑资料'}).click();
 const editor=area.getByRole('group',{name:'编辑资料：刷新后保留的资料名'});await editor.getByRole('textbox',{name:'资料名称',exact:true}).fill('编辑中的新名称');await editor.getByRole('textbox',{name:'资料正文',exact:true}).fill('尚未保存的修订内容');
 await page.waitForFunction(()=>JSON.parse(sessionStorage.getItem('zhiheng:composer:v1'))?.input.materialEditDraft?.text==='尚未保存的修订内容');
 await page.reload();await editor.waitFor();await enabled(start,false);assert.equal(await editor.getByRole('textbox',{name:'资料名称',exact:true}).inputValue(),'编辑中的新名称');assert.equal(await editor.getByRole('textbox',{name:'资料正文',exact:true}).inputValue(),'尚未保存的修订内容');
 await editor.getByRole('button',{name:'取消编辑'}).click();await enabled(start);await textIncludes(preview.locator('pre'),'尚未加入的研究笔记');
 await preview.getByRole('button',{name:'编辑资料'}).click();await editor.getByRole('textbox',{name:'资料正文',exact:true}).fill('已确认的新正文');await editor.getByRole('button',{name:'保存修改'}).click();
 await page.waitForFunction(()=>{const input=JSON.parse(sessionStorage.getItem('zhiheng:composer:v1'))?.input;return !input.materialEditDraft&&input.referenceMaterials[0].text==='已确认的新正文';});
 await page.reload();await area.waitFor();await count(area.getByRole('group',{name:/编辑资料：/}),0);await enabled(start);await preview.locator('summary').click();await textIncludes(preview.locator('pre'),'已确认的新正文');assert.equal(requests('POST','/api/jobs').length,0);
 await preview.getByRole('button',{name:'编辑资料'}).click();await page.getByRole('button',{name:'清空输入',exact:true}).click();await count(area.getByRole('group',{name:/编辑资料：/}),0);await count(area.locator('.materials-saved li'),0);
});

for(const width of [320,1440])test(`earnings-update-workbench-${width}`,{jobs:[decisionJob],viewport:{width,height:1000}},async({page,requests})=>{
 await workbench(page);await manualInput(page);
 await page.getByRole('combobox',{name:'研究路径',exact:true}).click();
 await page.getByRole('option',{name:'财报更新',exact:true}).click();
 await textIncludes(page.locator('.composer-intro'),'开启一项财报更新');
 await page.getByRole('textbox',{name:'上次研究结论'}).waitFor();
 await textIncludes(page.locator('.context-readiness'),'建立基线');
 await page.getByRole('combobox',{name:'对照研究'}).click();
 await page.getByRole('option',{name:'建立本期基线（无旧报告）',exact:true}).click();
 await noOverflow(page,'update workbench '+width);await screenshot(page,'earnings-update-workbench-'+width,'.workbench-context');
 await page.getByRole('button',{name:'开始财报更新',exact:true}).click();await page.locator('.research-detail').waitFor();
 const submitted=requests('POST','/api/jobs').at(-1).body;assert.equal(submitted.mode,'C');assert.ok(!submitted.baselineJobId);assert.ok(!submitted.previousResearch);
});

for(const width of [320,1440]){
 const job=makeJob(28,'completed',{mode:'C',question:'财报更新界面验证 · 合成资料'});
 const review=reviewFixture(job.input);job.result={...job.result,decision:{...review.decision,baselineStatus:'new_baseline'},researchSummary:review.researchSummary};
 test(`earnings-update-detail-${width}`,{jobs:[job],viewport:{width,height:1000}},async({page})=>{
  await detail(page,job);await textIncludes(page.locator('.rd-overview'),'本期财报基线已建立');
  await openProcess(page);
  await textIncludes(page.locator('.research-progress'),'核算单季与参数变化');
  await textIncludes(page.locator('.rd-decision'),'建立基线');
  await count(page.locator('.rd-deep-process'),0);await closeProcess(page);
  await page.getByRole('tab',{name:'审计记录',exact:true}).click();
  await textIncludes(page.locator('.rd-audit-research-notes'),'合成资料不足');
  await noOverflow(page,'update detail '+width);await screenshot(page,'earnings-update-detail-'+width,'.rd-audit-research-notes');
 });
}

for(const width of [320,1440])test(`reference-image-backend-${width}`,{viewport:{width,height:1100}},async({page,requests})=>{
 await workbench(page);await page.locator('#question').fill('研究贵州茅台');await textIncludes(page.locator('.security-chip'),'600519');
 const area=page.getByRole('region',{name:'用户补充资料'}),start=page.locator('button[type=submit]');
 assert.equal(await area.locator('..').evaluate(element=>{
  const securities=document.querySelector('.workbench-securities');
  return element.classList.contains('workbench-materials-target')&&element.parentElement===securities.parentElement&&Boolean(securities.compareDocumentPosition(element)&Node.DOCUMENT_POSITION_FOLLOWING)&&element.nextElementSibling.classList.contains('workbench-settings');
 }),true,'Materials stay after securities (including an optional deep overview) and immediately before settings');
 await page.locator('.workbench-securities').evaluate(element=>element.scrollIntoView({block:'start',behavior:'instant'}));
 await page.screenshot({path:fileURLToPath(new URL(`ui-materials-placement-${width}.png`,artifacts)),animations:'disabled'});
 const remote=[];page.on('request',request=>{const url=new URL(request.url());if(['http:','https:'].includes(url.protocol)&&url.origin!==baseURL)remote.push(url.href);});
 const encoded=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=350;const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,1000,350);ctx.fillStyle='black';ctx.font='40px "Microsoft YaHei", sans-serif';ctx.fillText('现金流研究笔记',40,70);ctx.font='40px Arial';ctx.fillText('Cash flow 2025',40,140);ctx.fillText('Revenue 1000',40,210);ctx.font='36px "Microsoft YaHei", sans-serif';ctx.fillText('请核对原始报告',40,285);return canvas.toDataURL('image/png').split(',')[1];});
 await area.locator('input[type=file]').setInputFiles({name:'现金流截图.png',mimeType:'image/png',buffer:Buffer.from(encoded,'base64')});
 await area.locator('.materials-saved li').waitFor({timeout:60000});await enabled(start);
 const preview=area.locator('details.material-preview');await preview.locator(':scope > summary').click();await textIncludes(preview.locator('pre'),'Revenue 1000');assert.match((await preview.locator('pre').textContent()).replace(/\s+/g,''),/现金流研究笔记/);
 await preview.locator('details.material-image-original>summary').click();await count(preview.getByRole('img',{name:'补充资料原图：现金流截图.png'}),1);await eventually(()=>preview.getByRole('img',{name:'补充资料原图：现金流截图.png'}).evaluate(image=>image.complete&&image.naturalWidth===1000),'Original image should load');
 await noOverflow(page,`image ocr ${width}`);await area.evaluate(element=>element.scrollIntoView({block:'center',behavior:'instant'}));
 await area.screenshot({path:fileURLToPath(new URL(`ui-material-image-${width}.png`,artifacts)),animations:'disabled'});assert.deepEqual(remote,[],'Uploads must use the platform backend');assert.equal(page.workers().length,0,'Browser must not launch OCR workers');assert.equal(requests('POST','/api/materials/read').length,1);
 await start.click();await page.waitForURL(/\/research\//);const material=requests('POST','/api/jobs').at(-1).body.referenceMaterials[0];assert.equal(material.title,'现金流截图.png');assert.match(material.text,/Revenue 1000/);assert.equal(material.verified,false);assert.equal(material.imageFile,undefined);
});

test('reference-image-paste-and-recovery',{},async({page})=>{
 await workbench(page);const area=page.getByRole('region',{name:'用户补充资料'}),zone=area.getByRole('group',{name:'导入文件或粘贴图片'});
 const transfer=await page.evaluateHandle(async()=>{
  const canvas=document.createElement('canvas');canvas.width=900;canvas.height=220;const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,900,220);ctx.fillStyle='black';ctx.font='45px Arial';ctx.fillText('Clipboard cash flow 2026',30,100);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));const data=new DataTransfer();data.items.add(new File([blob],'image',{type:'image/png'}));return data;
 });
 await zone.evaluate((element,clipboardData)=>element.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData})),transfer);await area.locator('.materials-saved li').waitFor({timeout:60000});await textIncludes(area.locator('.materials-saved'),'粘贴截图 1.png');
 let preview=area.locator('details.material-preview');await preview.locator(':scope > summary').click();await textIncludes(preview.locator('pre'),'Clipboard cash flow 2026');
 await preview.getByRole('button',{name:'编辑资料'}).click();const editor=area.getByRole('group',{name:'编辑资料：粘贴截图 1.png'});await editor.getByRole('textbox',{name:'资料名称',exact:true}).fill('截图核对笔记');await editor.getByRole('button',{name:'保存修改'}).click();await count(area.locator('.material-image-original'),1);
 await area.getByRole('button',{name:'移除资料：截图核对笔记'}).click();await area.getByRole('button',{name:'撤销移除'}).click();await count(area.locator('.material-image-original'),1);
 await page.waitForFunction(()=>JSON.parse(sessionStorage.getItem('zhiheng:composer:v1'))?.input.referenceMaterials[0]?.title==='截图核对笔记');
 await page.reload();await area.waitFor();await count(area.locator('.material-image-original'),0);preview=area.locator('details.material-preview');await preview.locator(':scope > summary').click();await textIncludes(preview.locator('pre'),'Clipboard cash flow 2026');
});

test('reference-image-errors-and-cancel',{},async({page})=>{
 await workbench(page);const area=page.getByRole('region',{name:'用户补充资料'});
 const blank=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=100;c.height=100;const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,100,100);return c.toDataURL('image/png').split(',')[1];});
 await area.locator('input[type=file]').setInputFiles([
  {name:'blank.png',mimeType:'image/png',buffer:Buffer.from(blank,'base64')},
  {name:'damaged.png',mimeType:'image/png',buffer:Buffer.from('not an image')},
  {name:'valid.txt',mimeType:'text/plain',buffer:Buffer.from('图片失败不影响后续材料')},
 ]);
 await area.locator('.materials-saved li').waitFor({timeout:60000});await textIncludes(area.locator('.materials-import-results'),'未识别到可用文字');await textIncludes(area.locator('.materials-import-results'),'图片格式无法识别');await count(area.locator('.materials-saved li'),1);
 const gate=deferred();const pattern='**/api/materials/read';let uploading=false;
 await page.route(pattern,async route=>{uploading=true;await gate.promise;await route.fulfill({json:{text:'late image'}}).catch(()=>{});});
 try{
  await area.locator('input[type=file]').setInputFiles({name:'cancel.png',mimeType:'image/png',buffer:Buffer.from(blank,'base64')});
  await eventually(()=>uploading,'The image should be sent to the backend');assert.equal(page.workers().length,0);
  await area.getByRole('button',{name:'取消导入'}).click();await textIncludes(area.locator('.materials-import-results'),'导入已取消');
  assert.equal(page.workers().length,0);await count(area.locator('.materials-saved li'),1);await enabled(area.getByRole('button',{name:'重试未完成'}));
 }finally{gate.resolve();await page.unroute(pattern);}
});

test('reference-image-raster-formats',{},async({page})=>{
 await workbench(page);const area=page.getByRole('region',{name:'用户补充资料'});
 const images=await page.evaluate(()=>['jpeg','webp','bmp'].map((format,index)=>{
  const canvas=document.createElement('canvas');canvas.width=900;canvas.height=180;const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,900,180);ctx.fillStyle='black';ctx.font='42px Arial';ctx.fillText(`Revenue ${1000+index}`,30,100);
  if(format!=='bmp')return {format,base64:canvas.toDataURL(`image/${format}`,.95).split(',')[1]};
  const {width,height}=canvas,stride=Math.ceil(width*3/4)*4,bytes=new Uint8Array(54+stride*height),view=new DataView(bytes.buffer),pixels=ctx.getImageData(0,0,width,height).data;
  bytes[0]=66;bytes[1]=77;view.setUint32(2,bytes.length,true);view.setUint32(10,54,true);view.setUint32(14,40,true);view.setInt32(18,width,true);view.setInt32(22,height,true);view.setUint16(26,1,true);view.setUint16(28,24,true);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const p=(y*width+x)*4,q=54+(height-y-1)*stride+x*3;bytes[q]=pixels[p+2];bytes[q+1]=pixels[p+1];bytes[q+2]=pixels[p];}
  let binary='';for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));return {format,base64:btoa(binary)};
 }));
 await area.locator('input[type=file]').setInputFiles(images.map(({format,base64})=>({name:`财务截图.${format}`,mimeType:`image/${format}`,buffer:Buffer.from(base64,'base64')})));
 await area.locator('.materials-saved li').nth(2).waitFor({timeout:60000});
 for(let i=0;i<images.length;i++){const preview=area.locator('details.material-preview').filter({hasText:`财务截图.${images[i].format}`});await preview.locator(':scope > summary').click();await textIncludes(preview.locator('pre'),`Revenue ${1000+i}`);}
});

for(const width of [320,1440])test(`company-comparison-workbench-${width}`,{viewport:{width,height:1000}},async({page,requests})=>{
 await workbench(page);await manualInput(page);await page.getByRole('combobox',{name:'研究路径',exact:true}).click();
 await page.getByRole('option',{name:'多公司比较',exact:true}).click();
 await textIncludes(page.locator('.composer-intro'),'开启一项多公司比较');
 const start=page.getByRole('button',{name:'开始多公司比较',exact:true});await enabled(start,false);
 await textIncludes(page.locator('.workbench-securities'),'至少核对 2 个不同标的');
 await page.getByRole('button',{name:'添加标的',exact:true}).click();await page.getByRole('textbox',{name:'标的2股票代码',exact:true}).fill('600519');await enabled(start,false);
 await page.getByRole('textbox',{name:'标的2股票代码',exact:true}).fill('601633');await enabled(start);
 await page.getByRole('button',{name:'添加标的',exact:true}).click();await page.getByRole('textbox',{name:'标的3股票代码',exact:true}).fill('601127');await enabled(start);
 await noOverflow(page,'comparison workbench '+width);await screenshot(page,'company-comparison-workbench-'+width,'.workbench-securities');
 await start.click();await page.locator('.research-detail').waitFor();const submitted=requests('POST','/api/jobs').at(-1).body;assert.equal(submitted.mode,'D');assert.equal(submitted.securities.length,3);
});

for(const width of [320,1440,1920]){
 const job=makeJob(29,'completed',{mode:'D',question:'多公司比较界面验证 · 合成资料',securities:[{market:'CN',symbol:'002594',name:'合成公司甲'},{market:'CN',symbol:'601633',name:'合成公司乙'},{market:'CN',symbol:'601127',name:'合成公司丙'}]});
 job.marketData={snapshots:structuredClone(job.input.securities)};job.input.securities=job.input.securities.map(({market,symbol})=>({market,symbol}));job.plan.securities=structuredClone(job.input.securities);
 const review=reviewFixture(job.input);job.result={...job.result,decision:review.decision,researchSummary:review.researchSummary,comparisonDecisions:review.comparisonDecisions.map((row,index)=>({...row,action:index===1?'深度研究':'观察',sourceIds:Array.from({length:12},(_,i)=>'S'+(index*12+i+1))}))};
 job.input.sources=Array.from({length:36},(_,index)=>({...sources[0],id:'S'+(index+1),title:'合成比较来源 '+(index+1)}));
 job.events.push({type:'tool_result',toolName:'calculate_comparison',toolCallId:'comparison-ui',time:job.createdAt,result:{checks:[{id:'period',comparable:true,reason:'合成记录的期间一致。'},{id:'roeHistory',comparable:false,reason:'历史窗口不同，不能直接比较ROE稳定性。'}]}});
 job.result.report += '\n\n## 逐家公司研究判断\n\n'+job.result.comparisonDecisions.map(row=>'### '+row.security+'\n\n'+row.summary+'\n\n依据：[S1]。').join('\n\n');
 test(`company-comparison-detail-${width}`,{jobs:[job],viewport:{width,height:1000}},async({page})=>{
  await detail(page,job);await textIncludes(page.locator('.rd-overview'),'多公司比较已完成');
  const comparison=page.getByRole('region',{name:'多公司比较结果'});await count(comparison.locator('article'),3);await textIncludes(comparison.locator('article').nth(1),'深度研究');
  for(const [i,name,code] of [[0,'合成公司甲','SZ:002594'],[1,'合成公司乙','SH:601633'],[2,'合成公司丙','SH:601127']]){await textIncludes(comparison.locator('article').nth(i).locator('h4'),name);await textIncludes(comparison.locator('article').nth(i).locator(':scope > small'),code);}
  for(const title of ['合成公司甲（SZ:002594）','合成公司乙（SH:601633）','合成公司丙（SH:601127）'])await count(page.locator('.rd-markdown').getByRole('heading',{name:title,exact:true}),1);
  await comparison.locator('summary').click();await textIncludes(comparison,'历史窗口不同');
  await openProcess(page);await count(page.locator('.rd-deep-process'),0);await closeProcess(page);
  await page.getByRole('tab',{name:'审计记录',exact:true}).click();await textIncludes(page.locator('.rd-audit-research-notes'),'合成资料不足');
  await page.getByRole('tab',{name:'研究报告',exact:true}).click();await noOverflow(page,'comparison detail '+width);await screenshot(page,'company-comparison-detail-'+width,'.rd-comparison');
  for(const card of await comparison.locator('article').all()){
   const link=card.locator('.rd-comparison-sources');
   assert.equal(await link.evaluate(node=>node.scrollWidth<=node.clientWidth),true,'Long source lists must wrap inside their button');
   const outer=await card.boundingBox(),inner=await link.boundingBox();
   assert.ok(inner.x>=outer.x&&inner.x+inner.width<=outer.x+outer.width+1,'Source buttons stay inside their company card');
   const refs=await link.innerText();assert.ok(refs.includes('、'),'Exercise multiple source identifiers');
  }
  await comparison.locator('.rd-comparison-sources').first().click();await eventually(async()=>await page.getByRole('tab',{name:/证据来源/}).getAttribute('aria-selected')==='true','Company evidence should open the sources tab');
 });
}

for(const width of [320,1440]){
 const listings=[{market:'HK',symbol:'700'},{market:'US',symbol:'AAPL'},{market:'US',symbol:'BRK-B'}];
 const job=makeJob(31,'completed',{mode:'D',securities:listings});
 job.marketData={snapshots:listings.map((stock,index)=>({...stock,name:['合成港股公司','合成纳斯达克公司','合成纽交所公司'][index]}))};
 job.result.comparisonDecisions=listings.map(stock=>({security:stock.market+':'+stock.symbol,action:'观察',confidence:'低',summary:'合成显示验证',unresolved:'合成资料',falsifiers:[],sourceIds:[]}));
 job.result.report+='\n\n## 逐家公司研究判断\n\n'+job.result.comparisonDecisions.map(row=>'### '+row.security+'\n\n合成判断正文。').join('\n\n');
 test('comparison-listing-labels-'+width,{jobs:[job],viewport:{width,height:1000}},async({page,requests})=>{
  await detail(page,job);const cards=page.locator('.rd-comparison-grid article');await count(cards,3);
  for(const [index,name,code] of [[0,'合成港股公司','HK:00700'],[1,'合成纳斯达克公司','NASDAQ:AAPL'],[2,'合成纽交所公司','NYSE:BRK-B']]){
   await textIncludes(cards.nth(index).locator('h4'),name);await textIncludes(cards.nth(index).locator(':scope > small'),code);
   await count(page.locator('.rd-markdown').getByRole('heading',{name:name+'（'+code+'）',exact:true}),1);
  }
  if(width<1024)await wheelReport(page,700);
  const directory=await openDirectory(page);await textIncludes(directory,'合成纳斯达克公司（NASDAQ:AAPL）');
  await jumpToHeading(page,directory.getByRole('navigation',{name:'报告目录',exact:true}),'合成纳斯达克公司（NASDAQ:AAPL）');
  await screenshot(page,'company-report-headings-'+width,'.rd-markdown h3');
  const actions=await detailActions(page);const [download]=await Promise.all([page.waitForEvent('download'),downloadReport(page,actions,'报告、审计与来源')]);
  const exported=await readFile(await download.path(),'utf8');assert.match(exported,/### 合成纳斯达克公司（NASDAQ:AAPL）/);assert.match(exported,/### 合成纽交所公司（NYSE:BRK-B）/);
  assert.equal(requests('POST','/api/securities/exchanges').length,1);await noOverflow(page,'comparison listing labels '+width);
 });
}

for(const width of [320,1440])test(`reference-model-vision-${width}`,{viewport:{width,height:1100}},async({page,requests})=>{
 let uploads=0;
 await page.route('**/api/materials/capabilities',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({enabled:true,model:'deepseek-flash'})}));
 await page.route('**/api/materials/read',async route=>{
  uploads++;assert.equal(route.request().headers()['content-type'],'application/octet-stream');assert.ok(route.request().postDataBuffer().subarray(0,5).toString().includes('%PDF'));
  await route.fulfill({contentType:'application/json',body:JSON.stringify({text:'【PDF第1页 · 模型视觉读取，待核实】\n营业收入：100 万元，2025 年。',visualAttachment:'a'.repeat(64),processing:{method:'vision',notice:'已读取第 1 页，其余页面未视觉核对'}})});
 });
 await workbench(page);await page.locator('#question').fill('研究贵州茅台');await textIncludes(page.locator('.security-chip'),'600519');
 const area=page.getByRole('region',{name:'用户补充资料'});
 await textIncludes(area.locator('.materials-import-help'),'格式与限制');
 await area.locator('input[type=file]').setInputFiles({name:'原件.pdf',mimeType:'application/pdf',buffer:materialPdf()});
 await textIncludes(area.locator('.materials-saved'),'原件.pdf');assert.equal(uploads,1);
 await area.getByRole('button',{name:'查看处理结果',exact:true}).click();await textIncludes(area.getByRole('list',{name:'文件处理结果'}),'其余页面未视觉核对');
 await area.getByRole('button',{name:'收起',exact:true}).click();assert.equal(await area.getByRole('list',{name:'文件处理结果'}).isVisible(),false);
 await area.locator('.materials-format-help>summary').click();await textIncludes(area.locator('.materials-format-help'),'支持格式');
 await noOverflow(page,'expanded format help '+width);await area.locator('.materials-format-help>summary').click();
 await area.locator('details.material-preview > summary').click();await textIncludes(area.locator('pre'),'模型视觉读取');
 await noOverflow(page,'vision import '+width);await screenshot(page,'reference-model-vision-'+width,'.research-materials');
 await page.reload();await textIncludes(area.locator('.materials-saved'),'原件.pdf');
 await page.locator('button[type=submit]').click();await page.waitForURL(/\/research\//);
 const material=requests('POST','/api/jobs').at(-1).body.referenceMaterials[0];assert.equal(material.visualAttachment,'a'.repeat(64));assert.equal(material.verified,false);assert.ok(!JSON.stringify(material).includes('base64'));
});
test('reference-backend-failure-retry-no-local-fallback',{},async({page})=>{
 await page.route('**/api/materials/capabilities',route=>route.fulfill({contentType:'application/json',body:'{"enabled":true}'}));
 let attempts=0;const original=materialPdf();
 await page.route('**/api/materials/read',route=>{attempts++;assert.deepEqual(route.request().postDataBuffer(),original);return attempts===1?route.fulfill({status:503,json:{error:'模型暂不可用'}}):route.fulfill({json:{text:'后端重试成功的文字'}});});
 await workbench(page);const area=page.getByRole('region',{name:'用户补充资料'});
 await area.locator('input[type=file]').setInputFiles({name:'重试.pdf',mimeType:'application/pdf',buffer:original});
 await textIncludes(area.locator('.materials-import-error'),'模型暂不可用');await count(area.locator('.materials-saved li'),0);assert.equal(page.workers().length,0);
 await area.getByRole('button',{name:'重试未完成'}).click();await textIncludes(area.locator('.materials-saved'),'重试.pdf');await area.locator('details.material-preview > summary').click();
 await textIncludes(area.locator('pre'),'后端重试成功的文字');assert.equal(attempts,2);
});
for(const width of [320,1440]){
 const job=makeJob(972);job.visualAudit={included:[{id:'S1',pages:[2,3]}],omitted:[{id:'M1',reason:'原页缺失'}],notice:'仅指定原页提供给模型'};
 job.input.sources[0].visualReading={status:'read',pages:[2,3],notice:'模型已读取第 2、3 页原图；其余页面仅按程序提取情况提供。'};
 test(`visual-audit-detail-${width}`,{jobs:[job],viewport:{width,height:1000}},async({page})=>{
  await detail(page,job);await openProcess(page);await textIncludes(page.getByRole('dialog',{name:'研究过程',exact:true}),'视觉模型已复读 1 份资料原页，1 份未纳入');
  const reading=page.locator('.rd-document-reading');await reading.locator('summary').focus();await page.keyboard.press('Enter');
  await textIncludes(reading.getByRole('region',{name:'已复读原页'}),'第 2、3 页');await textIncludes(reading.getByRole('region',{name:'未纳入原页复核'}),'原页缺失');
  await noOverflow(page,'expanded reading coverage '+width);await screenshot(page,'reading-coverage-'+width,'.rd-document-reading');
  await reading.getByRole('button',{name:'查看证据来源',exact:true}).click();await page.locator('.rd-source-trigger').first().click();
  await textIncludes(page.locator('.rd-source-body').first(),'模型已读取第 2、3 页原图');await noOverflow(page,'visual audit '+width);
  await screenshot(page,'visual-audit-detail-'+width,'.research-detail');
 });
}

for(const width of [320,1440])test(`reference-individual-retry-${width}`,{viewport:{width,height:1100}},async({page})=>{
 const attempts={};let finishRetry;
 await page.route('**/api/materials/read',async route=>{
  const name=decodeURIComponent(route.request().headers()['x-document-name']);attempts[name]=(attempts[name]||0)+1;
  if(name==='可用.txt')return route.fulfill({json:{text:'已成功加入的资料'}});
  if(name==='重试.txt'&&attempts[name]>1){await new Promise(resolve=>{finishRetry=resolve;});return route.fulfill({json:{text:'单文件重试成功'}}).catch(()=>{});}
  return route.fulfill({status:503,json:{error:'读取服务繁忙，请稍后重试'}});
 });
 await workbench(page);const area=page.getByRole('region',{name:'用户补充资料'});
 await area.locator('input[type=file]').setInputFiles(['可用.txt','重试.txt','稍后再处理.txt'].map(name=>({name,mimeType:'text/plain',buffer:Buffer.from(name)})));
 await textIncludes(area.locator('.materials-live-status'),'已加入 1 份资料，2 个文件未导入');await textIncludes(area.locator('.materials-queue-note'),'刷新后需重新选择');
 await noOverflow(page,'individual retry errors '+width);await screenshot(page,'individual-retry-errors-'+width,'.materials-import-results');
 await area.getByRole('button',{name:'重试：重试.txt',exact:true}).click();
 try{
  await eventually(()=>Boolean(finishRetry),'Selected file should be reuploaded');await textIncludes(area.locator('.materials-import-reading'),'重试.txt');await textIncludes(area.locator('.materials-queue-note'),'进度按已处理文件数统计');
  await textIncludes(page.locator('.composer-footer'),'资料导入期间请保持当前页面');
  await noOverflow(page,'individual retry loading '+width);await screenshot(page,'individual-retry-loading-'+width,'.materials-import-results');
 }finally{finishRetry?.();}
 await textIncludes(area.locator('.materials-live-status'),'已加入 1 份资料，1 个文件未导入');await count(area.locator('.materials-saved li'),2);await textIncludes(area.locator('.materials-import-error'),'稍后再处理.txt');
 assert.deepEqual(attempts,{'可用.txt':1,'重试.txt':2,'稍后再处理.txt':1});
 await area.getByRole('button',{name:'移除待处理文件：稍后再处理.txt',exact:true}).click();await count(area.locator('.materials-import-error'),0);await count(area.locator('.materials-saved li'),2);
 await area.locator('details.material-preview').first().locator('summary').click();const preview=area.locator('details.material-preview').first();
 assert.equal(await preview.locator('.material-search-navigation').isVisible(),false);await preview.getByRole('textbox',{name:/中查找/}).fill('资料');assert.equal(await preview.locator('.material-search-navigation').isVisible(),true);
});

test('reference-visual-edit-binding',{},async({page,requests})=>{
 await page.route('**/api/materials/capabilities',route=>route.fulfill({contentType:'application/json',body:'{"enabled":true,"documentPipeline":true}'}));
 await page.route('**/api/materials/read',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({text:'原页识别：收入 100 万元。',visualAttachment:'a'.repeat(64)})}));
 await workbench(page);await page.locator('#question').fill('研究贵州茅台');await textIncludes(page.locator('.security-chip'),'600519');
 const area=page.getByRole('region',{name:'用户补充资料'});
 await area.locator('input[type=file]').setInputFiles({name:'原页.pdf',mimeType:'application/pdf',buffer:materialPdf()});
 const preview=area.locator('details.material-preview');await preview.locator(':scope > summary').click();await preview.getByRole('button',{name:'编辑资料',exact:true}).click();
 let editor=area.getByRole('group',{name:'编辑资料：原页.pdf',exact:true});
 await textIncludes(editor,'仅修改名称会保留原页关联');await editor.getByRole('textbox',{name:'资料名称',exact:true}).fill('已重命名.pdf');await editor.getByRole('button',{name:'保存修改'}).click();
 await textIncludes(area.locator('.material-summary'),'原页已关联');
 await page.reload();await textIncludes(area.locator('.material-summary'),'原页已关联');await preview.locator(':scope > summary').click();
 await preview.getByRole('button',{name:'编辑资料',exact:true}).click();editor=area.getByRole('group',{name:'编辑资料：已重命名.pdf',exact:true});
 await editor.getByRole('textbox',{name:'资料正文',exact:true}).fill('修改后笔记：待核对收入。');await editor.getByRole('button',{name:'取消编辑'}).click();await textIncludes(area.locator('.material-summary'),'原页已关联');
 await preview.getByRole('button',{name:'编辑资料',exact:true}).click();await editor.getByRole('textbox',{name:'资料正文',exact:true}).fill('修改后笔记：待核对收入。');await editor.getByRole('button',{name:'保存修改'}).click();
 await textIncludes(area.locator('.material-summary'),'正文已整理');assert.equal(await area.locator('.material-reading-note').count(),0);
 await page.locator('button[type=submit]').click();await page.waitForURL(/\/research\//);const material=requests('POST','/api/jobs').at(-1).body.referenceMaterials[0];
 assert.equal(material.visualAttachment,undefined);assert.equal(material.text,'修改后笔记：待核对收入。');
});

{
 const job=makeJob(973);job.modelRouting={analysisModel:'deepseek-flash',visionModel:'deepseek-flash'};job.visualAudit={delivery:'rejected',included:[],omitted:[],notice:'原页复核请求超时，已有文字仍保留。'};
 test('visual-audit-rejected-copy',{jobs:[job],viewport:{width:320,height:1000}},async({page})=>{
  await detail(page,job);await openProcess(page);const panel=page.locator('.rd-document-reading');await textIncludes(panel.locator('summary'),'本次原页复核未完成');await panel.locator('summary').click();
  await textIncludes(panel,'原页复核请求超时');await textIncludes(panel,'读取完成不代表数据已经核实');await noOverflow(page,'rejected reading');
 });
}

test('unified-document-upload-routes',{},async({page,requests})=>{
 const names=[];
 await page.route('**/api/materials/capabilities',route=>route.fulfill({status:503,json:{error:'能力信息暂不可用'}}));
 await page.route('**/api/materials/read',async route=>{
  const name=decodeURIComponent(route.request().headers()['x-document-name']);names.push(name);
  await route.fulfill({contentType:'application/json',body:JSON.stringify({text:name.endsWith('.xlsx')?' {"worksheets":[{"name":"表1","cells":[{"address":"A1","value":"100"}]}]}':`后端统一提取：${name}`,processing:{method:name.endsWith('.xlsx')?'spreadsheet-json':'text'}})});
 });
 await workbench(page);await page.locator('#question').fill('研究贵州茅台');await textIncludes(page.locator('.security-chip'),'600519');
 await page.evaluate(()=>{File.prototype.arrayBuffer=()=>{throw new Error('Browser must not read the file contents');};File.prototype.text=()=>{throw new Error('Browser must not extract document text');};});
 const area=page.getByRole('region',{name:'用户补充资料'});
 await area.locator('input[type=file]').setInputFiles([{name:'笔记.md',mimeType:'text/plain',buffer:Buffer.from('text')},{name:'年报.pdf',mimeType:'application/pdf',buffer:materialPdf()},{name:'财务.xlsx',mimeType:'application/octet-stream',buffer:Buffer.from(materialXlsx)},{name:'说明.docx',mimeType:'application/octet-stream',buffer:Buffer.from(materialDocx)}]);
 await textIncludes(area.locator('.materials-live-status'),'已加入 4 份资料');assert.deepEqual(names,['笔记.md','年报.pdf','财务.xlsx','说明.docx']);
 await page.locator('button[type=submit]').click();await page.waitForURL(/\/research\//);const inputs=requests('POST','/api/jobs').at(-1).body.referenceMaterials;
 assert.equal(inputs.length,4);assert.equal(JSON.parse(inputs[2].text).worksheets[0].cells[0].value,'100');
});

for(const width of [320,1440])test(`handbook-current-features-${width}`,{viewport:{width,height:1000}},async({page,requests})=>{
 await page.goto('/');
 await page.locator('.fw-guide-steps>li').first().waitFor();
 const guideCards=await page.locator('.fw-guide-steps>li').evaluateAll(nodes=>nodes.map(node=>{const style=getComputedStyle(node);return {radius:style.borderTopLeftRadius,border:style.borderTopWidth,background:style.backgroundColor};}));
 assert.equal(guideCards.length,3);
 for(const card of guideCards){assert.equal(card.radius,'14px');assert.equal(card.border,'3px');assert.equal(card.background,'rgb(255, 255, 255)');}
 const guideEntry=page.locator('.fw-handbook-link').getByRole('link',{name:'查看使用指南'});
 await guideEntry.scrollIntoViewIfNeeded();await noOverflow(page,'home guide entry '+width);
 await page.screenshot({path:fileURLToPath(new URL(`ui-home-guide-entry-${width}.png`,artifacts)),animations:'disabled'});
 await guideEntry.focus();await page.keyboard.press('Enter');await page.waitForURL('**/handbook?tab=guide');
 const chapters=page.getByRole('tablist',{name:'研究手册章节'});await count(chapters.getByRole('tab'),4);await count(chapters.getByRole('tab',{name:'研究实例',exact:true}),0);assert.equal(await chapters.getByRole('tab',{name:'使用指南',exact:true}).getAttribute('aria-selected'),'true');
 const topics=page.locator('.usage-topic');await count(topics,6);
 assert.equal(await topics.nth(0).getByRole('button').getAttribute('aria-expanded'),'true');await textIncludes(topics.nth(0),'研究类型和报告深度有什么区别');await topics.nth(1).getByRole('button').click();await textIncludes(topics.nth(1),'最多 6 份');
 await noOverflow(page,'handbook upload '+width);await screenshot(page,'handbook-upload-'+width,'.research-handbook');
 await topics.nth(5).getByRole('button').focus();await page.keyboard.press('Enter');await textIncludes(topics.nth(5),'无需重新取数或调用模型');
 await noOverflow(page,'handbook recovery '+width);await screenshot(page,'handbook-recovery-'+width,'.usage-topic:last-child');
 await page.reload();await page.getByRole('heading',{name:'使用指南',exact:true}).waitFor();
 await chapters.getByRole('tab',{name:'术语速查',exact:true}).click();await page.waitForURL('**/handbook?tab=glossary');await page.goBack();await page.waitForURL('**/handbook?tab=guide');
 await chapters.getByRole('tab',{name:'研究纪律',exact:true}).click();await page.waitForURL('**/handbook?tab=discipline');await textIncludes(page.locator('#fw-data-sources'),'用户补充资料');
 await page.getByRole('heading',{name:'33 条禁止事项',exact:true}).waitFor();
 const execution=page.locator('section[aria-labelledby="execution-discipline-title"]');
 await count(execution.locator('li'),6);await textIncludes(execution,'未来约 5 个交易日');
 await noOverflow(page,'execution discipline '+width);await screenshot(page,'execution-discipline-'+width,'section[aria-labelledby="execution-discipline-title"]');
 await chapters.getByRole('tab',{name:'使用指南',exact:true}).click();assert.equal(requests('POST','/api/jobs').length,0);
});

const executionUiJob=makeJob(1191,'completed',{mode:'E',question:'复盘贵州茅台卖出后上涨，核对重新买入条件'});
const executionReview=reviewFixture(executionUiJob.input);
executionReview.executionAudit[0]={id:'action-separation',status:'passed',reason:'合成公司判断与组合约束分别记录[S1]。'};
executionReview.executionAudit[5]={id:'near-term-events',status:'not_applicable',reason:'仅复盘历史交易，未要求立即减仓。'};
executionUiJob.result=validateReview(executionReview,{input:executionUiJob.input,plan:executionUiJob.plan,sources:executionUiJob.input.sources});
for(const width of [320,1440]){
 test(`execution-home-workbench-${width}`,{viewport:{width,height:1000},resolvedSecurities:[security]},async({page,requests})=>{
  await page.goto('/');
  await page.getByRole('tablist',{name:'研究场景',exact:true}).getByRole('tab',{name:/组合分析/}).click();
  const tasks=page.getByLabel('组合执行研究场景');await count(tasks.getByRole('button'),3);
  await tasks.evaluate(element=>element.scrollIntoView({block:'center',behavior:'instant'}));
  await page.screenshot({path:fileURLToPath(new URL(`ui-execution-home-${width}.png`,artifacts)),animations:'disabled'});
  await tasks.getByRole('button',{name:/减仓与再平衡/}).click();
  await page.waitForURL('**/workbench');
  await textIncludes(page.locator('.preparation-execution'),'本次包含组合执行复核');
  const background=page.getByRole('textbox',{name:'组合上下文',exact:true});
  await page.getByRole('button',{name:'补充执行背景',exact:true}).click();
  await eventually(()=>background.evaluate(element=>element===document.activeElement),'Execution background link focuses the matching input');
  await background.fill('原有背景：合成持仓集中风险，需要核对。');
  await page.getByRole('button',{name:'加入填写提纲',exact:true}).click();
  assert.match(await background.inputValue(),/^原有背景/);
  assert.match(await background.inputValue(),/交易日期与当时依据/);
  await enabled(page.getByRole('button',{name:'填写提纲已加入',exact:true}),false);
  const saved=await background.inputValue();
  await page.getByRole('link',{name:'查看执行纪律',exact:true}).click();
  await page.waitForURL('**/handbook?tab=discipline#execution-discipline-title');
  await eventually(()=>page.locator('#execution-discipline-title').evaluate(element=>element===document.activeElement),'Handbook deep link focuses the execution heading');
  await page.goBack();await background.waitFor();assert.equal(await background.inputValue(),saved);
  await page.reload();await background.waitFor();assert.equal(await background.inputValue(),saved);
  await noOverflow(page,'execution form '+width);await screenshot(page,'execution-workbench-'+width,'.execution-input-guide');
  await enabled(page.locator('.start-button'));await page.locator('.start-button').click();
  await page.waitForURL('**/research/*');
  assert.equal(requests('POST','/api/jobs').length,1);assert.equal(requests('POST','/api/jobs')[0].body.portfolio,saved);
 });
 test(`execution-detail-evidence-${width}`,{jobs:[executionUiJob],viewport:{width,height:1000}},async({page,requests})=>{
  await page.goto(`/research/${executionUiJob.id}`);await page.locator('.rd-header h1').waitFor();
  await textIncludes(page.getByLabel('组合执行结论'),'条件式框架');
  await page.getByRole('button',{name:/查看执行复核/}).click();
  const review=page.getByLabel('执行纪律复核',{exact:true});await review.waitFor();
  await eventually(()=>review.evaluate(element=>element===document.activeElement),'Summary link focuses execution review');
  await count(review.locator('.execution-review-item'),10);
  await textIncludes(review.locator('.execution-review-overview'),'8 项需要关注');
  assert.equal(await review.locator('.execution-review-item').first().getAttribute('data-status'),'limited');
  assert.equal(await review.locator('.execution-review-item').last().getAttribute('data-status'),'not_applicable');
  await review.getByRole('button',{name:'不适用 1',exact:true}).click();
  await count(review.locator('.execution-review-item'),1);
  await textIncludes(review.locator('.execution-review-item'),'仅复盘历史交易');
  await review.getByRole('button',{name:'全部 10',exact:true}).click();
  await count(review.locator('.execution-review-item'),10);
  assert.doesNotMatch(await page.locator('.rd-audit-review').innerText(),/执行纪律复核/);
  await review.getByRole('button',{name:'存在限制 8',exact:true}).click();await count(review.locator('.execution-review-item'),8);
  await noOverflow(page,'execution review '+width);await screenshot(page,'execution-detail-'+width,'.rd-execution-review');
  await review.getByRole('button',{name:'已检查 1',exact:true}).click();await count(review.locator('.execution-review-item'),1);
  await review.getByRole('button',{name:'查看执行复核证据 S1',exact:true}).focus();await page.keyboard.press('Enter');
  await eventually(async()=>await page.getByRole('tab',{name:/证据来源/}).getAttribute('aria-selected')==='true','Execution evidence opens sources');
  const source=page.locator('.rd-source').filter({has:page.locator('.rd-source-title',{hasText:executionUiJob.input.sources[0].title})});
  await eventually(()=>page.locator('.rd-source-trigger:focus').evaluateAll(nodes=>nodes.some(node=>node.textContent.includes('S1'))),'Evidence jump focuses the selected source');
  await noOverflow(page,'execution source '+width);
  const actions=await detailActions(page),[download]=await Promise.all([page.waitForEvent('download'),downloadReport(page,actions)]);
  const exported=await readFile(await download.path(),'utf8');assert.match(exported,/执行纪律复核/);
  assert.equal(requests('POST','/api/jobs').length,0);
 });
}

for(const width of [320,1440]){
 const historical=makeJob(1430,'completed',{mode:'B',question:'旧版研究记录（合成）'});
 historical.plan.version='4.2';historical.result.report+='\n\n历史市赚率记录：0.50（仅合成旧记录）。';
 test(`framework-v43-${width}`,{jobs:[historical],viewport:{width,height:1000}},async({page,requests})=>{
  await detail(page,historical);await textIncludes(page.getByLabel('报告正文',{exact:true}),'历史市赚率记录：0.50');
  await page.goto(baseURL+'/handbook?tab=glossary');
  await textIncludes(page.locator('#fw-glossary'),'13 个术语');
  const groups=page.getByRole('tablist',{name:'术语分类'});
  for(const label of ['估值指标','财务现金流','研究与组合']){
   await groups.getByRole('tab',{name:new RegExp(label)}).click();
   assert.doesNotMatch(await page.locator('#fw-glossary').innerText(),/市赚率|P2|修正式|行业龙头锚|第二公式|第三公式/);
  }
  await groups.getByRole('tab',{name:/估值指标/}).click();
  await page.getByRole('button',{name:'收益率锚',exact:true}).click();await textIncludes(page.locator('#fw-glossary'),'不等于内在价值');
  await noOverflow(page,`V4.3 glossary ${width}`);await screenshot(page,`framework-v43-${width}`);
  await page.getByRole('tab',{name:'研究纪律',exact:true}).click();await textIncludes(page.locator('#execution-discipline-title'),'组合执行与交易复盘');
  assert.equal(requests('POST','/api/jobs').length,0);
 });
}

for(const width of [320,1440]){
 const current=makeJob(1431,'completed',{question:'当前研究判断（合成）'});
 current.result.decision=reviewFixture(current.input).decision;
 current.result.decision.valuation={status:'limited',methods:['DCF','正常化盈利估值'],explanation:'关键参数仍待核实，保留估值限制。'};
 test(`platform-current-${width}`,{jobs:[current],viewport:{width,height:1000}},async({page,requests})=>{
  await page.goto(baseURL+'/');
  await count(page.getByRole('list',{name:'研究判断顺序'}).getByRole('listitem'),4);
  await screenshot(page,`platform-current-home-${width}`);
  await page.getByRole('link',{name:'了解当前研究方法'}).click();
  await textIncludes(page.locator('.research-method'),'证据优先的研究方法');
  await count(page.getByRole('heading',{name:'研究方法',level:2,exact:true}),1);
  const methodSteps=page.getByRole('button',{name:'查看研究判断的四个步骤',exact:true});
  assert.equal(await methodSteps.getAttribute('aria-expanded'),'false');
  await methodSteps.focus();await page.keyboard.press('Enter');
  await count(page.getByRole('list',{name:'研究判断顺序'}).getByRole('listitem'),4);
  await methodSteps.press('Space');
  await eventually(async()=>await methodSteps.getAttribute('aria-expanded')==='false','Research steps collapse with keyboard');
  for(const title of ['查看估值使用说明','查看证据核对与结果阅读']){
   const trigger=page.getByRole('button',{name:new RegExp(title)});
   await trigger.click();assert.equal(await trigger.getAttribute('aria-expanded'),'true');
  }
  await textIncludes(page.locator('.research-method'),'同一模型的情景变化不算第二种方法');
  await textIncludes(page.locator('.research-method'),'单季与累计、币种、股类和报告期分别核对');
  await noOverflow(page,'expanded methodology '+width);
  const openMethodDetails=page.locator('.research-method button[aria-expanded="true"]');
  while(await openMethodDetails.count())await openMethodDetails.first().click();
  await noOverflow(page,'current methodology '+width);await screenshot(page,`platform-current-method-${width}`);
  await page.getByRole('link',{name:'带着问题开始'}).click();
  await page.getByLabel('你想研究什么？',{exact:true}).fill('分析苹果公司的长期投资价值');
  await textIncludes(page.getByLabel('当前路径交付'),'验证计划');
  await page.getByRole('combobox',{name:'研究路径',exact:true}).click();
  await page.getByRole('option',{name:'股东回报',exact:true}).click();
  await textIncludes(page.getByLabel('当前路径交付'),'八年现金回报');
  const delivery=page.getByRole('button',{name:/查看交付范围/});await delivery.click();
  await textIncludes(page.getByRole('dialog'),'股东回报 · 交付范围');
  await noOverflow(page,'delivery drawer '+width);await page.keyboard.press('Escape');await count(page.getByRole('dialog'),0);
  assert.ok(await delivery.evaluate(element=>element===document.activeElement));
  await page.locator('.path-picker').scrollIntoViewIfNeeded();await screenshot(page,`platform-current-workbench-${width}`);
  await page.getByRole('combobox',{name:'研究路径',exact:true}).click();await page.getByRole('option',{name:'财报更新',exact:true}).click();
  await textIncludes(page.getByLabel('当前路径交付'),'本期基线');
  await detail(page,current);await textIncludes(page.getByLabel('报告版本'),'V'+frameworkVersion);
  await textIncludes(page.getByLabel('估值适用性'),'估值：存在限制');
  await page.getByRole('button',{name:'核对估值依据',exact:true}).click();
  const boundary=page.getByLabel('估值与使用边界详情');await textIncludes(boundary,'关键参数仍待核实');
  assert.ok(await boundary.evaluate(element=>element===document.activeElement));
  await noOverflow(page,'valuation drawer '+width);await page.keyboard.press('Escape');
  await eventually(()=>page.getByRole('button',{name:'核对估值依据',exact:true}).evaluate(element=>element===document.activeElement),'Restore valuation trigger focus');
  await noOverflow(page,'report '+width);await screenshot(page,`platform-current-detail-${width}`);
  assert.equal(requests('POST','/api/jobs').length,0);
 });
}

for(const width of [320,1440]){
 test(`workbench-route-progress-${width}`,{viewport:{width,height:1000}},async({page,requests,hold})=>{
  await workbench(page);const steps=page.getByRole('navigation',{name:'新建研究步骤'});await count(steps.getByRole('button'),4);
  const release=hold('POST /api/research/path');await page.locator('#question').fill('分析苹果公司的长期投资价值');
  await eventually(()=>requests('POST','/api/research/path').length>0,'Path request starts');
  await textIncludes(steps.locator('[aria-current=step]'),'研究路径');
  await textIncludes(page.getByLabel('本次研究范围'),'正在确认研究路径');
  await enabled(page.getByRole('button',{name:/查看交付范围/}),false);
  await steps.getByRole('button',{name:/研究路径/}).click();
  assert.ok(await page.getByRole('combobox',{name:'研究路径',exact:true}).evaluate(el=>el===document.activeElement));
  await choose(page,'研究路径','股东回报');release();
  await textIncludes(page.locator('.composer-intro'),'开启一项股东回报研究');
  await textIncludes(page.getByLabel('当前路径交付'),'八年');
  await noOverflow(page,'four step workbench '+width);
  const positions=await steps.getByRole('button').evaluateAll(items=>items.map(el=>({x:el.offsetLeft,y:el.offsetTop})));
  if(width===320)assert.equal(new Set(positions.map(p=>p.y)).size,2);else assert.equal(new Set(positions.map(p=>p.y)).size,1);
  await screenshot(page,`workbench-route-progress-${width}`);
  assert.equal(requests('POST','/api/jobs').length,0);
 });
 const prior=makeJob(3401,'completed',{mode:'B',question:'可恢复的旧报告（合成）',securities:[security]});
 test(`workbench-baseline-recovery-${width}`,{viewport:{width,height:1000}},async({page,db,hold,requests})=>{
  await page.addInitScript(input=>sessionStorage.setItem('zhiheng:composer:v1',JSON.stringify({version:1,savedAt:Date.now(),input})),{mode:'C',question:'更新苹果最新财报',manual:true,securities:[security],baselineJobId:prior.id});
  const release=hold('GET /api/jobs');await workbench(page);
  await textIncludes(page.getByLabel('对照研究核对'),'正在核对');await enabled(page.locator('button[type=submit]'),false);
  release();await textIncludes(page.getByLabel('对照研究核对'),'已不在可用记录');
  await enabled(page.locator('button[type=submit]'),false);
  db.set(prior.id,structuredClone(prior));await page.getByRole('button',{name:'刷新可用记录',exact:true}).click();
  await textIncludes(page.locator('.workbench-context .context-readiness'),'将对照旧结论');await enabled(page.locator('button[type=submit]'));
  db.delete(prior.id);await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await textIncludes(page.getByLabel('对照研究核对'),'已不在可用记录');
  const notes=page.getByRole('textbox',{name:'上次研究结论'});await notes.fill('保留外部旧结论与利润假设');
  await noOverflow(page,'baseline correction '+width);await screenshot(page,`workbench-baseline-recovery-${width}`,'.workbench-context');
  await page.getByRole('button',{name:'取消所选对照',exact:true}).click();
  assert.equal(await notes.inputValue(),'保留外部旧结论与利润假设');
  await textIncludes(page.getByRole('combobox',{name:'对照研究',exact:true}),'使用填写的外部旧结论');await enabled(page.locator('button[type=submit]'));
  assert.equal(requests('POST','/api/jobs').length,0);
 });
 const changed=makeJob(3402,'failed',{question:'旧规则任务（合成）'});changed.plan.version='4.2';changed.resume={available:false,reason:'framework_changed',fromVersion:'4.2',toVersion:'4.3'};
 test(`recovery-rule-change-${width}`,{jobs:[changed],viewport:{width,height:1000}},async({page,requests})=>{
  await detail(page,changed);await page.getByRole('heading',{name:'按当前规则重新研究',exact:true}).waitFor();
  await textIncludes(page.locator('.rd-empty'),'重新采集、分析和复核');await textIncludes(page.getByLabel('恢复说明'),'V4.2 更新为 V4.3');
  await enabled(page.locator('.rd-empty').getByRole('button',{name:'重试研究',exact:true}));
  await noOverflow(page,'restart explanation '+width);await screenshot(page,`recovery-rule-change-${width}`);
  assert.equal(requests('POST',`/api/jobs/${changed.id}/retry`).length,0);
 });
}

for(const width of [320,768,1024,1440]){
 const cited=structuredClone(scrollingJob);
 cited.result.report=cited.result.report.replaceAll('第 6 节、第 3 段：','第 6 节、第 3 段：[S2] ')+ '\n\n缺失引用[S999]，组合引用[S1、S2]。\n\n`代码[S1]`\n\n[外部资料](https://evidence.example.invalid/original)';
 cited.result.audit+='\n\n'+Array.from({length:20},()=> '核对合成的财报期间和原始证据，保留数据缺口。'.repeat(8)).join('\n\n')+'\n\n审计依据[S1]。';
 test(`report-citation-return-${width}`,{jobs:[cited],viewport:{width,height:900}},async({page,requests})=>{
  await detail(page,cited);
  const article=page.getByRole('article',{name:'报告正文',exact:true}).first();
  await count(article.locator('code button'),0);await count(article.getByRole('button',{name:'查看证据 S999',exact:true}),0);
  assert.equal(await article.getByRole('link',{name:'外部资料'}).getAttribute('target'),'_blank');
  await page.getByRole('tab',{name:/证据来源/}).click();
  await page.getByRole('searchbox',{name:'搜索证据来源'}).fill('不存在的资料');
  await page.getByRole('tab',{name:'研究报告',exact:true}).click();
  const cite=article.getByRole('button',{name:'查看证据 S2',exact:true}).nth(2);
  await cite.evaluate(node=>node.scrollIntoView({block:'center',behavior:'instant'}));
  const originalY=(await cite.boundingBox()).y;
  await cite.focus();await page.keyboard.press('Enter');
  const source=page.locator('.rd-source-trigger').filter({hasText:'[S2]'});
  await eventually(()=>source.getAttribute('aria-expanded').then(value=>value==='true'),'Citation must expand the matching source despite an earlier search');
  await eventually(()=>source.evaluate(node=>node===document.activeElement),'Evidence must receive keyboard focus');
  assert.equal(await page.getByRole('searchbox',{name:'搜索证据来源'}).inputValue(),'');
  await noOverflow(page,'citation evidence '+width);await screenshot(page,`citation-evidence-${width}`);
  await page.getByRole('button',{name:'返回报告原文',exact:true}).click();
  await eventually(()=>cite.evaluate(node=>node===document.activeElement),'Return must focus the original citation');
  assert.ok(Math.abs((await cite.boundingBox()).y-originalY)<4,'Return must preserve the reading position');
  await page.screenshot({path:fileURLToPath(new URL(`ui-citation-return-${width}.png`,artifacts)),animations:'disabled'});
  await page.getByRole('tab',{name:'审计记录',exact:true}).click();
  const auditCite=page.locator('.rd-audit-review').getByRole('button',{name:'查看证据 S1',exact:true});
  await auditCite.evaluate(node=>node.scrollIntoView({block:'center',behavior:'instant'}));
  const auditY=(await auditCite.boundingBox()).y;await auditCite.click();
  await page.getByRole('button',{name:'返回审计原文',exact:true}).click();
  await eventually(()=>auditCite.evaluate(node=>node===document.activeElement),'Audit citation must receive focus after remount');
  assert.ok(Math.abs((await auditCite.boundingBox()).y-auditY)<4,'Audit reading position must survive remount');
  await noOverflow(page,'citation return '+width);assert.equal(requests('POST','/api/jobs').length,0);
 });
}

async function main() {
  await mkdir(artifacts, {recursive: true});
  const indexResponse=await fetch(baseURL);
  assert.ok(indexResponse.ok,'UI server must serve the application entry');
  const assetMode=(await indexResponse.text()).includes('/@vite/client')?'development':'production';
  // Concurrent agents may have created the components before wiring up App.
  // Report this as pending, never as a passing test or an old-UI regression.
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  const missing = [['ResearchWorkbench', /<ResearchWorkbench(?:Page)?\b/], ['ResearchDetailPage', /<ResearchDetailPage\b/]].filter(([,pattern])=>!pattern.test(app)).map(([name])=>name);
  if (missing.length) {
    console.error(`NOT READY: App has not integrated ${missing.join(', ')}. Script is ready; rerun after UI integration.`);
    process.exitCode = 2;
    await writeFile(new URL('ui-results.json', artifacts), JSON.stringify({status: 'not-ready', missing, baseURL}, null, 2));
    return;
  }
  const modulePath = process.env.PLAYWRIGHT_MODULE || 'playwright';
  const {chromium} = await import(/^(?:[A-Za-z]:[\\/]|\/)/.test(modulePath) ? pathToFileURL(modulePath).href : modulePath);
  const selectedScenarios = scenarios.filter(scenario => !process.env.UI_TEST_FILTER || new RegExp(process.env.UI_TEST_FILTER).test(scenario.name));
  assert.ok(selectedScenarios.length, 'UI_TEST_FILTER did not match any scenario');
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  const results = [];
  try {
    for (const scenario of selectedScenarios) {
      const fixture = await fixtureContext(browser, scenario.options), started = Date.now();
      let failure;
      try {
        await scenario.run(fixture);
      } catch (error) {
        failure = error;
        // Preserve the failing scroll position, including sticky/TOC failures.
        await fixture.page.screenshot({path: fileURLToPath(new URL(`ui-failure-${scenario.name}.png`, artifacts)), animations: 'disabled'}).catch(() => {});
      } finally {
        await fixture.close();
      }
      try { fixture.assertClean(); } catch (error) { failure = failure ? new Error(`${failure.stack}\n${error.message}`) : error; }
      const result = {name: scenario.name, status: failure ? 'failed' : 'passed', durationMs: Date.now() - started,
        apiRequests: fixture.calls.length, blockedRequests: fixture.blocked, pageErrors: fixture.pageErrors,
        assetErrors: fixture.assetErrors, ...(failure ? {error: failure.stack || failure.message, navigations: fixture.navigations} : {})};
      results.push(result);
      console.log(`${failure ? 'FAIL' : 'PASS'} ${scenario.name} (${result.durationMs}ms)`);
      if (failure) console.error(result.error);
      // A Vite compilation failure affects every scenario; don't repeat timeouts.
      if (fixture.assetErrors.some(error => /\.(jsx?|mjs|css)(?:$|\?)/.test(error))) {
        console.error('NOT READY: dev-server assets failed; rerun once compilation finishes.');
        process.exitCode = 2;
        break;
      }
    }
  } finally {
    await browser.close();
    if (results.some(result => result.status === 'failed') && !process.exitCode) process.exitCode = 1;
    await writeFile(new URL('ui-results.json', artifacts), JSON.stringify({baseURL, assetMode, status: process.exitCode === 2 ? 'not-ready' : process.exitCode ? 'failed' : 'passed', results}, null, 2));
  }
  console.log(`${results.filter(result => result.status === 'passed').length}/${selectedScenarios.length} scenarios passed. API traffic used in-memory fixtures only. Screenshots: artifacts/ui-*.png`);
}

for(const width of [320,1440])test('export-options-popup-'+width,{jobs:[makeJob(5200)],viewport:{width,height:1000}},async({page,requests})=>{
 let downloads=0;page.on('download',()=>downloads++);
 await detail(page,makeJob(5200));const actions=await detailActions(page),trigger=actions.getByRole('button',{name:'导出报告',exact:true});
 assert.equal(await page.getByRole('combobox',{name:'导出内容'}).count(),0);
 await trigger.focus();await page.keyboard.press('Enter');const choices=page.getByRole('dialog',{name:'下载选项',exact:true});await choices.waitFor();
 assert.equal(await choices.getByRole('radio').count(),2);assert.equal(downloads,0);
 await page.keyboard.press('Escape');await choices.waitFor({state:'hidden'});assert.equal(await trigger.evaluate(node=>node===document.activeElement),true);assert.equal(downloads,0);
 await trigger.click();await choices.getByRole('radio',{name:/^报告、审计与来源/}).check();
 await noOverflow(page,'export popup '+width);await screenshot(page,'export-options-'+width);
 const [download]=await Promise.all([page.waitForEvent('download'),choices.getByRole('button',{name:'开始下载',exact:true}).click()]);
 assert.match(await readFile(await download.path(),'utf8'),/合成研究报告/);assert.equal(downloads,1);assert.equal(requests('POST','/api/jobs').length,0);
 await choices.waitFor({state:'hidden'});
});

const {registerRightRailScenarios}=await import('./right-rail-ui-scenarios.mjs');
registerRightRailScenarios({test,makeJob,detail,noOverflow,screenshot});
const {registerSidebarScenarios}=await import('./sidebar-ui-scenarios.mjs');
registerSidebarScenarios({test,makeJob,count,noOverflow,screenshot});
const {registerWorkflowScenarios}=await import('./workflow-ui-scenarios.mjs');
registerWorkflowScenarios({test,workbench,manualInput,enabled,textIncludes,count,collapsible,noOverflow,screenshot});
const {registerRecoveryScenarios}=await import('./recovery-ui-scenarios.mjs');
registerRecoveryScenarios({test,makeJob,detail,detailActions,textIncludes,count,enabled,noOverflow,screenshot});
const {registerReportFirstScenarios}=await import('./report-first-ui-scenarios.mjs');
registerReportFirstScenarios({test,makeJob,detail,textIncludes,count,enabled,noOverflow,screenshot});
const {registerKnowledgePlatformScenarios}=await import('./knowledge-platform-ui-scenarios.mjs');
registerKnowledgePlatformScenarios({test,makeJob,detail,workbench,manualInput,textIncludes,noOverflow,screenshot});
const {registerPlatformRecoveryScenarios}=await import('./platform-recovery-ui-scenarios.mjs');
registerPlatformRecoveryScenarios({test,makeJob,detail,workbench,textIncludes});
const {registerAgentCapabilityScenarios}=await import('./agent-capabilities-ui-scenarios.mjs');
registerAgentCapabilityScenarios({test,makeJob,detail,detailActions,downloadReport,textIncludes,count,noOverflow,screenshot});
for(const width of [320,1440])test('path-settings-switch-'+width,{viewport:{width,height:1000}},async({page,requests})=>{
 await workbench(page);await page.locator('#question').fill('研究贵州茅台的长期投资价值');
 await textIncludes(page.locator('.path-picker'),'语义识别');
 const setting=page.getByRole('region',{name:'研究设置',exact:true});
 const labels={A:'快速筛选',B:'深度研究',C:'财报更新',D:'多公司比较',E:'组合分析',F:'股东回报研究'};
 const options={B:'完整展开',C:'详细展开',D:'详细比较',E:'详细分析',F:'详细研究'};
 for(const mode of Object.keys(labels)){
  await choose(page,'研究路径',modes[mode].name);
  await textIncludes(setting.locator('.settings-path-label'),modes[mode].name);
  await textIncludes(page.locator('button[type=submit]'),'开始'+labels[mode]);
  if(mode==='A'){await count(setting.getByRole('combobox'),0);await textIncludes(setting,'近 5 年');}
  else {await choose(page,'报告深度',options[mode]);await textIncludes(setting.getByRole('combobox',{name:'报告深度'}),options[mode]);}
  if(mode==='F'){await count(setting.getByRole('combobox',{name:'财报历史范围'}),0);await textIncludes(setting,'近 8 年');}
  if(mode==='B')await choose(page,'财报历史范围','近 3 年');
  await noOverflow(page,'path settings '+mode+' '+width);
 }
 await choose(page,'研究路径','深度研究');await textIncludes(setting.getByRole('combobox',{name:'财报历史范围'}),'近 3 年');
 await page.getByRole('button',{name:'恢复自动识别',exact:true}).click();await textIncludes(page.locator('.path-picker'),'语义识别');
 await textIncludes(page.locator('button[type=submit]'),'开始深度研究');
 await screenshot(page,'path-settings-'+width,'.workbench-settings');assert.equal(requests('POST','/api/jobs').length,0);
});
for(const [mode,label] of Object.entries({A:'快速筛选',B:'深度研究',C:'财报更新',D:'多公司比较',E:'组合分析',F:'股东回报研究'}))test('path-settings-auto-submit-'+mode,{pathResponse:async()=>({mode}),resolvedSecurities:[{symbol:'600519',market:'CN',name:'贵州茅台'},{symbol:'002594',market:'CN',name:'比亚迪'}]},async({page,requests})=>{
 await workbench(page);await page.locator('#question').fill('研究贵州茅台和比亚迪');
 await textIncludes(page.locator('.path-picker'),'语义识别');
 const start=page.getByRole('button',{name:'开始'+label,exact:true});await enabled(start);await start.click();await page.waitForURL(/\/research\//);
 const request=requests('POST','/api/jobs').at(-1).body;assert.equal(request.mode,'auto');assert.ok(request.pathDecisionId);
 if(mode==='A'){assert.equal(request.depth,'Quick');assert.equal(request.historyYears,5);}
 if(mode==='F')assert.equal(request.historyYears,8);
});
const {registerContextSettingsScenarios}=await import('./context-settings-ui-scenarios.mjs');
registerContextSettingsScenarios({test,workbench,choose,textIncludes,count,noOverflow,screenshot,enabled});
const {registerPlatformV48Scenarios}=await import('./platform-v48-ui-scenarios.mjs');
registerPlatformV48Scenarios({test,makeJob,detail,detailActions,openProcess,textIncludes,noOverflow,screenshot});

const {registerPlatformCleanupScenarios}=await import('./platform-cleanup-ui-scenarios.mjs');
registerPlatformCleanupScenarios({test,makeJob,detail,workbench,textIncludes,noOverflow,screenshot});

const {registerPlatformV49Scenarios}=await import('./platform-v49-ui-scenarios.mjs');
await registerPlatformV49Scenarios({test,makeJob,detail,openProcess,textIncludes,noOverflow,screenshot});

const {registerPlatformV50Scenarios}=await import('./platform-v50-ui-scenarios.mjs');
registerPlatformV50Scenarios({test,makeJob,detail,openProcess,textIncludes,noOverflow,screenshot});

await main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });

async function downloadReport(page,actions,scope='完整研究记录'){
 await actions.getByRole('button',{name:'导出报告',exact:true}).click();
 const choices=page.getByRole('dialog',{name:'下载选项',exact:true});await choices.getByRole('radio',{name:new RegExp('^'+scope)}).check();
 await choices.getByRole('button',{name:'开始下载',exact:true}).click();
}
