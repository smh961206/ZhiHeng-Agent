import {researchSecurityDisplay,securityDisplayParts,tickerKey} from './security-display.mjs';

export function reportSecurities(job) {
 return [job?.input?.securities,job?.plan?.securities,job?.securities,
  job?.result?.comparisonDecisions?.map(row=>row.security)].flatMap(items=>Array.isArray(items)?items:[]);
}
const identity=value=>{const stock=securityDisplayParts(value);return stock.market+':'+tickerKey(stock.symbol);};
const escapeName=value=>value.replace(/[\r\n]+/g,' ').replace(/[\\`*_\[\]<>]/g,'\\$&');

// Enrich identifier-only headings from this research's saved listing metadata.
// Body text, quotations, unknown listings and code examples stay verbatim.
export function reportSecurityHeadings(markdown,job,exchanges={}) {
 if(typeof markdown!=='string')return '';
 const known=new Set(reportSecurities(job).map(identity));
 const label=text=>{
  let code=text.trim().replace(/[ \t]+#+[ \t]*$/,'');
  for(const marker of ['**','__','`'])if(code.startsWith(marker)&&code.endsWith(marker))code=code.slice(marker.length,-marker.length);
  if(!/^(?:(?:CN|US|SH|SZ|BJ|HK|NASDAQ|NYSE|AMEX|NYSEARCA|CBOE|OTC):[A-Z0-9.-]+|[A-Z0-9.-]+\.(?:SH|SZ|BJ|HK|US))$/i.test(code)||!known.has(identity(code)))return null;
  const stock=researchSecurityDisplay(job,code,exchanges);
  return escapeName(stock.name)+'（'+stock.code+'）';
 };
 let fence=null;
 const lines=markdown.match(/[^\n]*\n|[^\n]+$/g)||[];
 return lines.map((raw,index)=>{
  const line=raw.replace(/\r?\n$/,''),ending=raw.slice(line.length);
  if(fence){const close=/^ {0,3}(`+|~+)[ \t]*$/.exec(line);if(close&&close[1][0]===fence[0]&&close[1].length>=fence.length)fence=null;return raw;}
  const opening=/^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
  if(opening&&!(opening[1][0]==='`'&&opening[2].includes('`'))){fence=opening[1];return raw;}
  const heading=/^( {0,3}#{1,6}[ \t]+)(.+)$/.exec(line);
  if(heading){const title=label(heading[2]);return title?heading[1]+title+ending:raw;}
  if((index===0||/^\s*$/.test(lines[index-1]))&&!/^ {4}|^\t/.test(line)&&/^ {0,3}(?:=+|-+)[ \t]*(?:\r?\n)?$/.test(lines[index+1]||'')){
   const title=label(line);if(title)return title+ending;
  }
  return raw;
 }).join('');
}
