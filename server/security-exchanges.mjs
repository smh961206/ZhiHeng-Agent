import {remote} from './market-request.mjs';
import {createMarketCache} from './market-cache.mjs';
import {normalizedExchange, tickerKey} from '../shared/security-display.mjs';

export const secExchangeSource = 'https://www.sec.gov/files/company_tickers_exchange.json';

export function createExchangeLookup({request = remote} = {}) {
 const read = createMarketCache();
 return async (symbols, signal) => {
  if (!Array.isArray(symbols) || symbols.length > 100 || symbols.some(symbol => typeof symbol !== 'string' || !/^[A-Z][A-Z0-9.-]{0,11}$/.test(symbol))) throw new Error('交易所查询须提供最多100个有效美股代码');
  const unique = [...new Set(symbols)];
  if (!unique.length) return [];
  try {
   const directory = await read('sec-exchanges', async shared => {
    const data = JSON.parse((await request(secExchangeSource, {signal: shared, totalTimeoutMs: 10000, timeoutMs: 5000, retries: 1})).toString('utf8'));
    if (!Array.isArray(data.fields) || !Array.isArray(data.data) || !data.data.length) throw new Error('SEC交易所目录格式无效');
    const ticker = data.fields.indexOf('ticker'), exchange = data.fields.indexOf('exchange');
    if (ticker < 0 || exchange < 0) throw new Error('SEC交易所目录缺少代码或交易所');
    const directory = {};
    for (const row of data.data) {
     if (!Array.isArray(row) || typeof row[ticker] !== 'string') throw new Error('SEC交易所目录代码无效');
     const key = tickerKey(row[ticker]), venue = normalizedExchange(row[exchange]);
     // An ambiguous association stays unresolved instead of picking an exchange.
     directory[key] = Object.hasOwn(directory, key) && directory[key] !== venue ? null : venue;
    }
    return {values: directory, fetchedAt: new Date().toISOString()};
   }, {signal, ttlMs: 86400000});
   return unique.map(symbol => ({symbol, exchange: directory.values[tickerKey(symbol)] || null, source: secExchangeSource, fetchedAt: directory.fetchedAt}));
  } catch (error) {
   signal?.throwIfAborted();
   return unique.map(symbol => ({symbol, exchange: null, error: '交易所信息暂不可用'}));
  }
 };
}
export const lookupSecurityExchanges = createExchangeLookup();
