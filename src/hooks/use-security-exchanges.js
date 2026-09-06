import {useEffect, useState} from 'react';
import {api, post} from '../lib/api';
import {securityDisplayParts, tickerKey} from '../../shared/security-display.mjs';

export function useSecurityExchanges(jobs) {
 const [exchanges, setExchanges] = useState({});
 useEffect(() => {
  const symbols = [...new Set((Array.isArray(jobs) ? jobs : []).flatMap(job => {
   const securities = job?.plan?.securities ?? job?.securities ?? job?.input?.securities;
   return Array.isArray(securities) ? securities.map(securityDisplayParts).filter(item => item.market === 'US' && !item.exchange && /^[A-Z][A-Z0-9.-]{0,11}$/.test(item.symbol)).map(item => item.symbol) : [];
  }))];
  if (!symbols.length) return;
  const control = new AbortController();
  void (async () => {
   for (let i = 0; i < symbols.length; i += 100) {
    try {
     const result = await api('/api/securities/exchanges', {...post({symbols: symbols.slice(i, i + 100)}), signal: control.signal});
     if (control.signal.aborted) return;
     setExchanges(previous => ({...previous, ...Object.fromEntries(result.map(item => [tickerKey(item.symbol), item]))}));
    } catch { if (control.signal.aborted) return; }
   }
  })();
  return () => control.abort();
 }, [jobs]);
 return exchanges;
}
