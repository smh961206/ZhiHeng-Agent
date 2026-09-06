// Run against the existing Vite server; this script never starts a backend.
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
import {prepareResearchRetry} from '../server/research-retry.mjs';

const baseURL = new URL(process.env.UI_BASE_URL || 'http://127.0.0.1:5173').origin;
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(baseURL).hostname), 'UI_BASE_URL must be loopback');
const artifacts = new URL('../artifacts/', import.meta.url);
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
  const trigger=page.getByRole('button',{name:'打开报告目录',exact:true});
  await enabled(trigger);
  await shadcnButtons(trigger,page.viewportSize().width<1024?'sheet-trigger':'popover-trigger');
  await trigger.click();
  const popup=page.getByRole('dialog',{name:'报告目录',exact:true});
  await popup.waitFor();
  return popup.locator('.rd-outline');
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
  await shadcnButtons(panel.getByRole('button'));
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
async function fixtureContext(browser, {jobs = [], viewport = {width: 1440, height: 1100}, failures = {}, reducedMotion = 'reduce', createdStatus = 'completed', quoteOverrides = {}} = {}) {
  const context = await browser.newContext({baseURL, viewport, serviceWorkers: 'block', locale: 'zh-CN', timezoneId: 'Asia/Shanghai', reducedMotion});
  const db = new Map(structuredClone(jobs).map(job => [job.id, job]));
  const calls = [], blocked = [], pageErrors = [], routeErrors = [], assetErrors = [], navigations = [];
  const holds = new Map(), gates = new Set(), streams = new Map();
  const remainingFailures = new Map(Object.entries(failures));
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
      const body = request.postData() ? request.postDataJSON() : null;
      calls.push({method, path, body});
      const key = `${method} ${path}`;
      if (holds.has(key)) await holds.get(key).promise;
      if (closing) return await route.abort();
      if ((remainingFailures.get(key) || 0) > 0) {
        remainingFailures.set(key, remainingFailures.get(key) - 1);
        return await json({error: 'UI测试：模拟加载失败，请重试'}, 503);
      }
      if (method === 'GET' && path === '/api/config') return await json({configured: true, model: 'fixture-only', modes,
        knowledgeVersion: frameworkVersion, researchStages, markets: ['CN', 'HK', 'US'], dataProvider: 'UI合成数据'});
      if (method === 'POST' && path === '/api/securities/resolve') return await json({
        securities: /苹果|AAPL/i.test(body.question) ? [{market: 'US', symbol: 'AAPL', name: '苹果'}]
          : /比亚迪|002594/.test(body.question) ? [{market:'CN',symbol:'002594',name:'比亚迪'}]
          : /茅台|600519/.test(body.question) ? [security] : [],
        ambiguities: [], unresolved: [], warnings: [], overflow: false,
      });
      if (method === 'POST' && path === '/api/research/plan') return await json(createResearchPlan(body));
      if (method === 'POST' && path === '/api/quotes') return await json(body.securities.map(item => ({security: item,
        quote: {name: `合成行情 ${item.symbol}`, currency: item.market === 'US' ? 'USD' : 'CNY', price: 123.45,
          provider: 'UI Fixture', asOf: '2026-08-01T08:00:00Z', fetchedAt: '2026-08-01T08:01:00Z',...quoteOverrides}})));
      if (method === 'GET' && path === '/api/jobs') return await json([...db.values()].map(summary));
      if (method === 'POST' && path === '/api/jobs') {
        const job = makeJob(100 + requests('POST', '/api/jobs').length, createdStatus, body);
        db.set(job.id, job);
        return await json(job, 201);
      }
      const match = path.match(/^\/api\/jobs\/([\da-f-]+)(?:\/(cancel|stream|retry))?$/);
      if (match) {
        const [, id, action] = match, job = db.get(id);
        if (!job) return await json({error: 'UI测试：研究不存在'}, 404);
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
async function manualInput(page) {
  await page.getByRole('button', {name: '手动调整', exact: true}).click();
  await page.getByRole('textbox', {name: '标的1股票代码', exact: true}).fill('600519');
  await page.locator('#question').fill('UI验证：分析贵州茅台的现金流质量');
  await enabled(page.getByRole('button', {name: '开始研究', exact: true}));
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

const screenJob=makeJob(904,'completed',{question:'比亚迪快速筛选 · 界面合成验证',mode:'A'});
screenJob.result.researchSummary=reviewFixture(screenJob.input).researchSummary;
screenJob.plan.knowledge=[{path:'knowledge/CORE.md',version:'4.1-core',sha256:'a'.repeat(64)},{path:'knowledge/FULL.md',version:'4.1',sha256:'b'.repeat(64)}];
for(const width of [320,1440])test(`quick-screen-fixed-scope-${width}`,{viewport:{width,height:1000}},async({page,requests,hold})=>{
 await workbench(page);await choose(page,'财报历史范围','近 8 年');await choose(page,'报告深度','深入研究');await page.locator('#question').fill('快速筛选贵州茅台');
 await textIncludes(page.locator('.security-chip'),'600519');
 await count(page.getByRole('combobox',{name:'报告深度'}),0);await count(page.getByRole('combobox',{name:'财报历史范围'}),0);
 await textIncludes(page.getByRole('region',{name:'快速筛选范围'}),'五个完整年度 + 最新一期');await textIncludes(page.locator('.research-plan .plan-meta'),'近 5 年');
 await page.getByRole('button',{name:'交付内容与研究约束'}).click();await textIncludes(page.locator('.research-plan'),'红旗与反证');await textIncludes(page.locator('.research-plan'),'单季变化');
 await textIncludes(page.locator('.screen-plan-questions'),'公司如何赚钱');await page.getByRole('button',{name:'交付内容与研究约束'}).click();
 await page.getByRole('button',{name:/补充筛选关注点/}).click();await page.getByRole('textbox',{name:'筛选关注点'}).fill('优先核对现金流与存货（合成关注点）');
 await count(page.getByRole('button',{name:/持仓与风险约束/}),0);await noOverflow(page,`quick screen workbench ${width}`);await screenshot(page,`quick-screen-workbench-${width}`,'.screen-scope');
 assert.equal(requests('POST','/api/jobs').length,0);
 await page.getByRole('button',{name:'切换深度研究',exact:true}).click();await enabled(page.getByRole('combobox',{name:'财报历史范围'}));
 await textIncludes(page.getByRole('combobox',{name:'财报历史范围'}),'近 8 年');await textIncludes(page.getByRole('combobox',{name:'报告深度'}),'深入研究');assert.equal(await page.locator('#question').inputValue(),'快速筛选贵州茅台');
 assert.equal(await page.getByRole('textbox',{name:'组合上下文'}).inputValue(),'优先核对现金流与存货（合成关注点）');
 await collapsible(page.locator('.path-picker'),true);await page.locator('.workbench-mode-option').filter({hasText:'智能路由'}).click();
 const release=hold('POST /api/jobs');await page.getByRole('button',{name:'开始快速筛选',exact:true}).click();await page.locator('#question').press('Control+Enter');
 await eventually(()=>requests('POST','/api/jobs').length===1,'Quick screen must submit once');const payload=requests('POST','/api/jobs')[0].body;
 assert.equal(payload.historyYears,5);assert.equal(payload.depth,'Quick');assert.equal(payload.mode,'auto');assert.equal(payload.portfolio,'优先核对现金流与存货（合成关注点）');release();
 await page.waitForURL(/\/research\//);await textIncludes(page.locator('.rd-meta'),'判断是否继续研究');
});
test('quick-screen-example-selection',{viewport:{width:320,height:1000}},async({page,requests})=>{
 await workbench(page);await collapsible(page.locator('.path-picker'),true);await page.locator('.workbench-mode-option').filter({hasText:'快速筛选'}).click();
 await page.getByRole('button',{name:'比亚迪快速筛选',exact:false}).click();await textIncludes(page.locator('.security-chip'),'002594');
 await page.getByRole('heading',{name:'开启一项快速筛选',exact:true}).waitFor();await enabled(page.getByRole('button',{name:'开始快速筛选',exact:true}));assert.equal(requests('POST','/api/jobs').length,0);
 await page.locator('.page-scroll').evaluate(node=>node.scrollTop=0);await noOverflow(page,'quick screen question 320');
 await page.screenshot({path:fileURLToPath(new URL('ui-quick-screen-input-320.png',artifacts)),animations:'disabled'});
});

const screenDeepJob=makeJob(905,'completed',{mode:'A',question:'快速筛选比亚迪 · 界面合成验证',securities:[{market:'CN',symbol:'002594',name:'比亚迪'},{market:'HK',symbol:'01211',name:'比亚迪股份'}]});
screenDeepJob.result.decision={...reviewFixture(screenDeepJob.input).decision,action:'深度研究',missingData:['核对资本开支的实际用途（测试问题）']};
const screenWatchJob=structuredClone(screenDeepJob);screenWatchJob.id='00000000-0000-4000-8000-000000000906';screenWatchJob.result.decision.action='观察池';
for(const width of [320,1440])test(`quick-screen-follow-up-${width}`,{jobs:[screenDeepJob,screenWatchJob],viewport:{width,height:1000}},async({page,requests})=>{
 await detail(page,screenWatchJob);await textIncludes(page.locator('.rd-decision'),'先跟踪关键变化');await textIncludes(page.locator('.rd-decision'),'还有 1 项资料待核实');await count(page.getByRole('button',{name:'准备深度研究'}),0);
 await detail(page,screenDeepJob);await textIncludes(page.locator('.rd-overview'),'仍有 1 项资料待核实');await textIncludes(page.locator('.rd-decision'),'值得进一步验证长期逻辑');
 await noOverflow(page,`quick screen decision ${width}`);await screenshot(page,`quick-screen-decision-${width}`,'.rd-decision');
 await page.getByRole('button',{name:'准备深度研究',exact:true}).click();await page.locator('.research-workbench').waitFor();
 assert.equal(requests('POST','/api/jobs').length,0);await textIncludes(page.locator('.path-picker'),'深度研究');await textIncludes(page.getByRole('combobox',{name:'报告深度'}),'深入研究');
 assert.match(await page.locator('#question').inputValue(),/比亚迪/);await textIncludes(page.locator('.research-plan .plan-meta'),'2 个标的');
 const plan=requests('POST','/api/research/plan').at(-1).body;assert.equal(plan.mode,'B');assert.equal(plan.depth,'Deep');assert.deepEqual(plan.securities,[{market:'CN',symbol:'002594'},{market:'HK',symbol:'01211'}]);
 assert.match(await page.getByRole('textbox',{name:'组合上下文'}).inputValue(),/上次快筛的待验证事项/);assert.match(plan.portfolio,/实际用途/);assert.ok(!plan.baselineJobId);await noOverflow(page,`prepared deep ${width}`);
});
const screenPending=makeJob(907,'running',{mode:'A',question:'快速筛选合成标的'});delete screenPending.liveReport;
screenPending.workflow.stages=screenPending.workflow.stages.map(stage=>({...stage,status:stage.id==='task'?'completed':stage.id==='evidence'?'running':'pending'}));
const screenFailed=makeJob(908,'failed',{mode:'A'}),screenCancelled=makeJob(909,'cancelled',{mode:'A'});
for(const width of [320,1440])test(`quick-screen-progress-${width}`,{jobs:[screenPending,screenFailed,screenCancelled],viewport:{width,height:1000}},async({page,requests})=>{
 await detail(page,screenPending);await textIncludes(page.locator('.rd-overview'),'正在读取研究资料');await page.getByRole('button',{name:'查看本次研究计划',exact:true}).click();await page.getByRole('heading',{name:'研究计划',exact:true}).waitFor();
 assert.equal(await page.getByRole('tab',{name:'研究思路'}).getAttribute('aria-selected'),'true');await noOverflow(page,`quick progress ${width}`);
 for(const [job,title] of [[screenFailed,'快速筛选未完成'],[screenCancelled,'快速筛选已取消']]){
  await detail(page,job);await textIncludes(page.locator('.rd-overview'),title);await count(page.getByRole('button',{name:'准备深度研究'}),0);await textIncludes(page.locator('.rd-empty'),'输入与执行记录');
 }
 assert.equal(requests('POST','/api/jobs').length,0);
});
for(const width of [320,1440])test(`quick-screen-approach-${width}`,{jobs:[screenJob],viewport:{width,height:1000}},async({page})=>{
 await page.goto(`/research/${screenJob.id}?tab=approach`);
 await page.getByRole('heading',{name:'研究计划',exact:true}).waitFor();
 const panel=page.getByRole('tabpanel',{name:'研究思路',exact:true});
 await textIncludes(panel,'五年营收');await textIncludes(panel,'合成资料不足');
 const rules=panel.getByRole('button',{name:/本次研究规则/});await rules.click();await textIncludes(panel,'knowledge/CORE.md');await textIncludes(panel,'knowledge/FULL.md');await rules.click();
 assert.equal(await page.getByRole('tab',{name:'研究思路',exact:true}).getAttribute('aria-selected'),'true');
 await noOverflow(page,`quick screen approach ${width}`);await screenshot(page,`quick-screen-approach-${width}`,'.rd-report-card');
 await page.getByRole('tab',{name:'研究报告',exact:true}).click();await textIncludes(page.locator('.rd-panel:visible'),'合成研究报告');
 const actions=await detailActions(page),[download]=await Promise.all([page.waitForEvent('download'),actions.getByRole('button',{name:'导出报告',exact:true}).click()]);
 const exported=await readFile(await download.path(),'utf8');assert.ok(exported.indexOf('# 一、')<exported.indexOf('# 二、'));assert.ok(exported.indexOf('# 二、')<exported.indexOf('# 三、'));assert.match(exported,/合成资料不足/);assert.match(exported,/实际工具调用/);assert.match(exported,/已读取合成资料/);
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
 await page.getByRole('button',{name:'查看行情',exact:true}).click();
 const card=page.locator('.quote-card');await textIncludes(card,'腾讯财经公开行情（备用源）');
 if(stale){await textIncludes(card.getByRole('status'),'旧快照');await count(card.getByText('主行情源暂不可用，已切换备用来源。',{exact:true}),0);}
 else await textIncludes(card,'主行情源暂不可用，已切换备用来源。');
 await textIncludes(card,'2026');await noOverflow(page,`quote outage ${width}`);
 assert.equal(requests('POST','/api/quotes').length,1);assert.equal(requests('POST','/api/jobs').length,0);
 await screenshot(page,`quote-outage-${stale?'cached':'backup'}-${width}`,'.data-connect');
});

test('empty-workbench', {}, async ({page, requests}) => {
  await workbench(page);
  await count(page.locator('.research-workbench').getByText('查看研究记录', {exact: true}), 0);
  await count(page.locator('.workspace-history-link'), 0);
  await shadcnButtons(page.getByRole('button', {name: '开始研究', exact: true}));
  assert.equal(await page.locator('#question').inputValue(), '');
  await count(page.locator('.security-chip'), 0);
  await count(page.locator('.recent-research'), 0);
  await enabled(page.getByRole('button', {name: '开始研究', exact: true}), false);
  await textIncludes(page.locator('.composer-readiness'), '先写下');
  await page.locator('#question').press('Control+Enter');
  await page.locator('#question').fill('   ');
  await page.locator('#question').press('Control+Enter');
  await enabled(page.getByRole('button', {name: '开始研究', exact: true}), false);
  await screenshot(page, 'empty-workbench-1440');
  await openHistory(page);
  await page.getByRole('heading', {name: '从第一项研究开始积累', exact: true}).waitFor();
  await page.getByRole('button', {name: '开始第一项研究'}).click();
  await page.locator('.research-workbench').waitFor();
  assert.equal(requests('POST', '/api/jobs').length, 0);
});

for (const trigger of ['button', 'ctrl-enter']) test(`submit-${trigger}`, {}, async ({page, requests, hold}) => {
  await workbench(page);
  if (trigger === 'button') {
    await manualInput(page);
    await choose(page, '标的1市场', '美股');
    await page.getByRole('textbox', {name: '标的1股票代码', exact: true}).fill('AAPL');
    await page.locator('#question').fill('UI验证：手动核对苹果公司的长期现金流');
    assert.equal(await page.getByRole('textbox', {name: '标的1股票代码', exact: true}).inputValue(), 'AAPL');
    await collapsible(page.locator('.path-picker'), true);
    await page.getByRole('button', {name: /股东回报.*关注分红/}).click();
    await enabled(page.getByRole('combobox', {name: '财报历史范围'}), false);
    await textIncludes(page.getByRole('combobox', {name: '财报历史范围'}), '近 8 年');
    await collapsible(page.locator('.path-picker'), true);
    await page.getByRole('button', {name: /深度研究.*验证长期/}).click();
    await choose(page, '报告深度', '深入研究');
    await choose(page, '财报历史范围', '近 3 年');
    await page.getByRole('button', {name: /补充组合与研究背景/}).click();
    await page.getByRole('textbox', {name: '组合上下文'}).fill('UI合成背景：持有三年，关注现金回报。');
    await textIncludes(page.locator('.research-plan .plan-meta'), '近 3 年');
  } else {
    await page.getByRole('button', {name: '现金流质量', exact: false}).click();
    await textIncludes(page.locator('.security-chip'), '600519');
    await enabled(page.getByRole('button', {name: '开始研究', exact: true}));
  }
  await screenshot(page, `configured-${trigger}-1440`);
  const release = hold('POST /api/jobs');
  if (trigger === 'button') await page.getByRole('button', {name: '开始研究', exact: true}).click();
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
 await count(rows.locator('.rh-mode-row'),8);
 await textIncludes(rows.first().locator('.rh-mode-row'),'研究模式');
 let sidebar=page.locator('.desktop-sidebar');
 if(width<1024){
  await page.getByRole('button',{name:'打开导航菜单',exact:true}).click();
  sidebar=page.getByRole('dialog',{name:'研究导航',exact:true});
  await sidebar.waitFor();
 }
 const recentModes=sidebar.locator('.rr-mode');
 await count(recentModes,4);
 assert.deepEqual(await recentModes.allTextContents(),['智能路由','未记录',modes.C.name,modes.B.name]);
 for(const badge of await recentModes.all())assert.ok(await badge.isVisible(),'Recent research mode label must be visible');
 await textIncludes(sidebar.locator('.rr-mode-row').first(),'研究模式');
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
 await choose(page,'按研究模式筛选','智能路由');await count(rows,1);await textIncludes(badges,'智能路由');
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
  await count(recent.locator('.rr-mode'), 4);
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
  await textIncludes(header.locator('.rd-status'), '已完成');
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
  const selectors = {title: '.rd-header h1', status: '.rd-header .rd-status', outline: '.rd-content-toolbar', actions: '.rd-desktop-tools .rd-action-panel'};
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
  assert.ok(after.status.x+after.status.width+12<=after.actions.x, 'Title and status must not overlap the action buttons');
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
  const outlineTrigger = page.getByRole('button', {name: '打开报告目录', exact: true});
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
  const selectors = {title: '.rd-header h1', status: '.rd-header .rd-status', outline: '.rd-content-toolbar button[aria-label="打开报告目录"]', actions: '.rd-header button[aria-label="打开研究操作"]'};
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
  await enabled(page.getByRole('button',{name:'打开报告目录',exact:true}));
  const title = await page.locator('.rd-title-row h1').boundingBox();
  const status = await page.locator('.rd-title-row .rd-status').boundingBox();
  assert.ok(status.x >= title.x+title.width && status.x-title.x-title.width <= 14, 'Status must follow a short title instead of aligning to the page edge');
  const original = await page.locator('.rd-report-card').boundingBox();
  for(const tab of ['审计记录','证据来源']){
    await page.getByRole('tab',{name:new RegExp('^'+tab)}).click();
    await count(page.locator('.rd-directory-rail'),0);
    await count(page.locator('.rd-outline-empty'),0);
    await count(page.getByRole('button',{name:'打开报告目录',exact:true}),1);
    const content = await page.locator('.rd-report-card').boundingBox();
    assert.ok(Math.abs(content.width-original.width)<=1&&Math.abs(content.x-original.x)<=1, 'Every tab must keep the same content width and position');
    await noOverflow(page, `contextual ${tab} ${width}`);
    await screenshot(page, `contextual-${tab==='审计记录'?'audit':'sources'}-${width}`,'.rd-tab-list');
  }
  await page.reload();
  await count(page.locator('.rd-directory-rail'),0);
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
  await enabled(page.getByRole('button',{name:'打开报告目录',exact:true}));
  const restored = await page.locator('.rd-report-card').boundingBox();
  assert.ok(Math.abs(restored.width-original.width)<=2, 'Returning to report must restore its layout');
  if(width<1024) await page.getByRole('button',{name:'打开报告目录',exact:true}).waitFor();
  await detail(page, plainJob);
  await page.getByRole('article',{name:'报告正文'}).waitFor();
  await count(page.locator('.rd-directory-rail'),0);
  await count(page.getByRole('button',{name:'打开报告目录',exact:true}),1);
  await enabled(page.getByRole('button',{name:'打开报告目录',exact:true}),false);
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
  await actions.getByRole('button', {name: '导出报告', exact: true}).click();
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
  await enabled(page.getByRole('button', {name: '开始研究', exact: true}));
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
 await enabled(page.getByRole('button',{name:'打开报告目录',exact:true}),false);
 await noOverflow(page,'pending structured draft '+width);
 await screenshot(page,'draft-format-waiting-'+width,'.rd-report-card');
 await detail(page,previewStructured);
 await content.getByRole('heading',{name:previewStructured.plan.output.sections[0].title,exact:true}).waitFor();
 await textIncludes(content,'可阅读的合成研究段落。引用[S1]。');
 await textIncludes(content,'草稿已生成，正在审计');
 await count(content.locator('pre'),0);
 assert.doesNotMatch(await content.innerText(),/INTERNAL_|"sections"|"decision"|\\n/);
 await enabled(page.getByRole('button',{name:'打开报告目录',exact:true}));
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
 await enabled(page.getByRole('button',{name:'打开报告目录',exact:true}));
 await noOverflow(page,'readable fenced draft '+width);
 await screenshot(page,'draft-format-markdown-'+width,'.rd-report-card');
 await eventually(()=>requests('GET',`/api/jobs/${previewFenced.id}/stream`).length===1,'Draft stream missing');
 finishJob(previewFenced.id,{status:'failed',error:'合成的审计未通过'});
 await content.getByRole('heading',{name:'本次研究未完成',exact:true}).waitFor();
 await count(content.getByRole('heading',{name:'合成可读草稿',exact:true}),0);
 await enabled(page.getByRole('button',{name:'打开报告目录',exact:true}),false);
 actions=await detailActions(page);
 await enabled(actions.getByRole('button',{name:'导出报告',exact:true}),false);
 assert.equal(requests('POST','/api/jobs').length,0,'Preview formatting must not start research or publish a draft');
});

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
  await textIncludes(page.locator('.rd-header .rd-status'),'研究中');
  assert.equal(page.url(),previousURL,'Retry must retain the URL, including the selected tab');
  assert.equal(db.size,2,'Retry must not add a history record');
  assert.equal(db.get(job.id).id,oldJob.id);assert.equal(db.get(job.id).createdAt,oldJob.createdAt);
  assert.equal(db.get(job.id).retryCount,1);assert.equal(db.get(job.id).error,undefined);assert.deepEqual(db.get(job.id).input.sources,[]);
  assert.equal(db.get(job.id).mode,oldJob.mode);
  assert.deepEqual(db.get(job.id).input.securities,oldJob.input.securities.map(({market,symbol})=>({market,symbol})));
  for(const key of ['question','depth','historyYears','portfolio','previousResearch','baselineJobId','portfolioContext'])assert.deepEqual(db.get(job.id).input[key]??null,oldJob.input[key]??({previousResearch:'',baselineJobId:null,portfolioContext:{}}[key]??null));
  await page.getByRole('tab',{name:'研究报告',exact:true}).click();
  await page.getByRole('heading',{name:'合成实时草稿',exact:true}).waitFor();
  await eventually(()=>requests('GET',`/api/jobs/${job.id}/stream`).length===1,'Retry must reconnect the same record progress stream');
  assert.equal(requests('POST',retryPath).length,1);
  assert.ok(navigations.every(url=>!new URL(url).pathname.startsWith('/workbench')),'Direct retry must never visit the workbench');
  if(width===320){
   finishJob(job.id,{status:'failed',error:'合成的重试失败'});
   await textIncludes(page.locator('.rd-header .rd-status'),'失败');
   await page.locator('.rd-empty').getByRole('button',{name:'重试研究',exact:true}).click();
   await textIncludes(page.locator('.rd-header .rd-status'),'研究中');
   assert.equal(db.get(job.id).retryCount,2);assert.equal(db.size,2);
   assert.deepEqual(requests('POST',retryPath).at(-1).body,{expectedRetryCount:1});
   await eventually(()=>requests('GET',`/api/jobs/${job.id}/stream`).length===2,'Repeated retries must reconnect again');
  }
  finishJob(job.id,{status:'completed',result:makeJob(28).result});
  await page.getByRole('heading',{name:'合成研究报告',exact:true}).waitFor();
  await textIncludes(page.locator('.rd-header .rd-status'),'已完成');
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
  await collapsible(page.locator('.path-picker'), true);
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
  await shadcnButtons(actions.getByRole('button'));
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
 await page.getByRole('link',{name:'了解付费方案',exact:true}).click();
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
 assert.match(await page.getByLabel('你想研究什么？',{exact:true}).inputValue(),/贵州茅台.*现金流质量/);
 await textIncludes(page.locator('.path-picker'),'深度研究');
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
 await page.waitForURL('**/handbook');
 await count(page.locator('#fw-standards .fw-score-list > div'),6);
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
 await textIncludes(page.getByRole('region',{name:'快速筛选范围'}),'五个完整年度 + 最新一期');
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
  await count(section.getByRole('button',{name:/轮播/}),0);
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
 await section.getByRole('tab',{name:/标的对比/}).click();
 assert.equal(await section.getByRole('tab',{name:/标的对比/}).getAttribute('aria-selected'),'true','Manual selection should still work with reduced motion');
});

const decisionJob=makeJob(23,'completed',{question:'合成研究判断 · 贵州茅台现金流'});
decisionJob.result.decision=reviewFixture(decisionJob.input).decision;
decisionJob.researchOutcome={action:decisionJob.result.decision.action,confidence:decisionJob.result.decision.confidence,summary:decisionJob.result.decision.summary};
for(const width of [320,1440])test(`framework-context-${width}`,{jobs:[decisionJob],viewport:{width,height:1000}},async({page,requests})=>{
 await detail(page,decisionJob);
 await page.locator('.rd-decision').waitFor();
 await count(page.locator('.page-content footer'),0);
 await page.getByRole('button',{name:'判断依据与验证条件'}).click();
 await textIncludes(page.locator('.rd-decision'),'什么发生时，需要重审判断');
 await count(page.locator('.rd-decision ol li'),3);
 await noOverflow(page,'decision '+width);
 await screenshot(page,'framework-decision-'+width,'.rd-decision');
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
 await page.getByRole('button',{name:'开始研究',exact:true}).click();
 await page.locator('.research-detail').waitFor();
 const update=requests('POST','/api/jobs').at(-1).body;
 assert.equal(update.mode,'C');assert.equal(update.baselineJobId,decisionJob.id);assert.match(update.previousResearch,/原有现金流/);
 await workbench(page);
 await page.locator('#question').fill('分析我的持仓组合中的贵州茅台');
 await collapsible(page.locator('.path-picker'),true);
 await page.getByRole('button',{name:/组合分析.*审视配置/}).click();
 await page.getByLabel('当前持仓',{exact:true}).waitFor();
 for(const field of portfolioFields)await page.getByLabel(field.label,{exact:true}).fill('合成'+field.label);
 await textIncludes(page.locator('.portfolio-context .context-readiness'),'组合信息已齐');
 await noOverflow(page,'portfolio context '+width);
 await screenshot(page,'framework-portfolio-'+width,'.workbench-context');
 await page.getByRole('button',{name:'开始研究',exact:true}).click();
 await page.locator('.research-detail').waitFor();
 const portfolio=requests('POST','/api/jobs').at(-1).body;
 assert.equal(portfolio.mode,'E');assert.equal(Object.keys(portfolio.portfolioContext).length,6);assert.equal(portfolio.baselineJobId,undefined);
 await page.goto('/history');
 await page.locator('.rh-outcome').waitFor();await textIncludes(page.locator('.rh-outcome'),'观察');
 await count(page.locator('.page-content footer'),0);
});

async function main() {
  await mkdir(artifacts, {recursive: true});
  // Concurrent agents may have created the components before wiring up App.
  // Report this as pending, never as a passing test or an old-UI regression.
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  const missing = ['ResearchWorkbench', 'ResearchDetail'].filter(name => !new RegExp(`<${name}\\b`).test(app));
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
    await writeFile(new URL('ui-results.json', artifacts), JSON.stringify({baseURL, status: process.exitCode === 2 ? 'not-ready' : process.exitCode ? 'failed' : 'passed', results}, null, 2));
  }
  console.log(`${results.filter(result => result.status === 'passed').length}/${selectedScenarios.length} scenarios passed. API traffic used in-memory fixtures only. Screenshots: artifacts/ui-*.png`);
}

await main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
