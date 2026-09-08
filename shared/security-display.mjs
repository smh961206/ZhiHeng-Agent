const exchanges = {
 SH: 'SH', SSE: 'SH', XSHG: 'SH', SZ: 'SZ', SZSE: 'SZ', XSHE: 'SZ',
 BJ: 'BJ', BSE: 'BJ', HK: 'HK', HKEX: 'HK', SEHK: 'HK', XHKG: 'HK',
 NASDAQ: 'NASDAQ', XNAS: 'NASDAQ', NYSE: 'NYSE', XNYS: 'NYSE',
 AMEX: 'AMEX', 'NYSE AMERICAN': 'AMEX', 'NYSE ARCA': 'NYSEARCA', NYSEARCA: 'NYSEARCA',
 CBOE: 'CBOE', BATS: 'CBOE', OTC: 'OTC',
};
export const normalizedExchange = value => exchanges[String(value || '').trim().toUpperCase()] || null;
export const tickerKey = value => String(value || '').toUpperCase().replaceAll('.', '-');

export function securityDisplayParts(value) {
 const item = typeof value === 'string' ? {symbol: value} : value || {};
 let symbol = String(item.symbol || item.ticker || '').trim().toUpperCase();
 let market = typeof item.market === 'string' ? item.market.toUpperCase() : undefined, exchange = normalizedExchange(item.exchange);
 const prefix = symbol.match(/^([A-Z]+):(.+)$/), suffix = symbol.match(/^(.+)\.(SH|SZ|BJ|HK|US)$/);
 if (prefix && (normalizedExchange(prefix[1]) || ['CN', 'US'].includes(prefix[1]))) {
  exchange ||= normalizedExchange(prefix[1]); market ||= prefix[1]; symbol = prefix[2];
 } else if (suffix) { exchange ||= normalizedExchange(suffix[2]); market ||= suffix[2]; symbol = suffix[1]; }
 if (['SH', 'SZ', 'BJ'].includes(market)) { exchange ||= market; market = 'CN'; }
 if (market === 'HK' || exchange === 'HK') { market = 'HK'; exchange = 'HK'; if (/^\d{1,5}$/.test(symbol)) symbol = symbol.padStart(5, '0'); }
 if (market === 'CN' || !market && /^\d{6}$/.test(symbol)) {
  market = 'CN';
  if (/^\d{6}$/.test(symbol)) exchange ||= /^6/.test(symbol) ? 'SH' : /^[03]/.test(symbol) ? 'SZ' : /^[489]/.test(symbol) ? 'BJ' : null;
 }
 if (market === 'US' || exchange && !['SH', 'SZ', 'BJ', 'HK'].includes(exchange)) market = 'US';
 return {market, symbol, exchange, name: item.name};
}

export function securityDisplayLabel(value, usExchanges = {}) {
 const item = securityDisplayParts(value);
 if (!item.symbol) return item.name || '';
 const exchange = item.exchange || (item.market === 'US' ? normalizedExchange(usExchanges[tickerKey(item.symbol)]?.exchange) : null);
 return `${exchange || item.market ? (exchange || item.market) + ':' : ''}${item.symbol}`;
}

// Research input validation keeps identifiers only. Recover display metadata from
// the same saved research, matching listing identities rather than array order.
export function researchSecurityDisplay(job, value, usExchanges = {}) {
 const identity = securityDisplayParts(value);
 const records = [job?.input?.securities, job?.plan?.securities, job?.securities, job?.marketData?.snapshots, job?.marketData?.coverage]
  .flatMap(items => Array.isArray(items) ? items : [])
  .map(item => {
   const listing = securityDisplayParts(item?.security || item);
   return {...listing, name: item?.name || listing.name, exchange: normalizedExchange(item?.exchange) || listing.exchange};
  })
  .filter(item => item.market === identity.market && tickerKey(item.symbol) === tickerKey(identity.symbol));
 const candidates = [identity, ...records];
 const name = candidates.map(item => typeof item.name === 'string' ? item.name.trim() : '')
  .find(name => name && ![identity.symbol, `${identity.market}:${identity.symbol}`, securityDisplayLabel(identity)].includes(name.toUpperCase()));
 const stock = {...identity, name: name || '名称未记录', exchange: identity.exchange || records.find(item => item.exchange)?.exchange};
 return {...stock, code: securityDisplayLabel(stock, usExchanges)};
}
