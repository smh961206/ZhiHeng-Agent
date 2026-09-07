import {ArrowDownRight,ArrowUpRight,ChevronDown,Clock3,Minus,RefreshCw} from 'lucide-react';
import {Button} from './ui/button';
import {isNumber,quoteAmount,quoteMovement,quoteNumber,securityIdentity} from '../lib/security-display.mjs';

const timestamp=value=>value&&Number.isFinite(Date.parse(value))?new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(value)):'时间未提供';
export default function MarketQuote({item,loading,onRetry}){
 const {security,quote:q,error}=item,identity=securityIdentity(security);
 if(error)return <article className="quote-card market-quote quote-failed"><strong>{identity.market} · {identity.code}</strong><p role="alert" className="data-error">{error}</p><Button type="button" size="sm" variant="outline" disabled={loading} onClick={onRetry}><RefreshCw size={14}/>重试行情</Button></article>;
 if(!q)return null;
 const {change,percent,direction}=quoteMovement(q),Trend=direction==='up'?ArrowUpRight:direction==='down'?ArrowDownRight:Minus;
 const currency={CNY:'人民币',HKD:'港元',USD:'美元'}[q.currency]||q.currency||'币种未提供';
 const rangeValid=isNumber(q.low)&&q.low>0&&isNumber(q.high)&&q.high>=q.low&&isNumber(q.price)&&q.price>=q.low&&q.price<=q.high;
 const position=rangeValid?(q.high===q.low?50:(q.price-q.low)/(q.high-q.low)*100):0;
 const metrics=[['今开',quoteNumber(q.open)],['昨收',quoteNumber(q.previousClose)],['最高',quoteNumber(q.high)],['最低',quoteNumber(q.low)],['成交量',quoteAmount(q.volume,'股')],['成交额',quoteAmount(q.turnover)]];
 return <article className={`quote-card market-quote quote-${direction}`} aria-label={`${q.name||security.symbol}行情`} aria-busy={loading}>
  <div className="market-quote-heading"><span>{q.name||security.symbol}<code>{identity.code}</code></span><span className={`quote-state ${q.stale?'quote-state-stale':''}`}>{loading?'更新中':q.stale?'缓存快照':'行情快照'}</span></div>
  <div className="quote-price-row"><div><span className="quote-eyebrow">最新价 <small>{currency} / 股</small></span><strong className="quote-price">{quoteNumber(q.price)}</strong><div className="quote-movement"><Trend size={17}/><span>{quoteNumber(change,{signed:true})}</span><span>{quoteNumber(percent,{signed:true})}{isNumber(percent)?'%':''}</span><small>{isNumber(percent)?'较昨收':'涨跌数据暂缺'}</small></div></div><div className="quote-asof"><Clock3 size={15}/><span>行情时间（北京时间）<time dateTime={q.asOf}>{timestamp(q.asOf)}</time></span></div></div>
  <dl className="quote-metrics">{metrics.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
  {rangeValid&&<div className="quote-range" aria-label={`日内价格区间 ${quoteNumber(q.low)} 至 ${quoteNumber(q.high)}，最新价 ${quoteNumber(q.price)}`}><div><span>日内价格区间</span><span>{quoteNumber(q.low)} — {quoteNumber(q.high)}</span></div><div className="quote-range-track"><i style={{left:`${position}%`}} title={`最新价 ${quoteNumber(q.price)}`}/></div><small>标记为最新价在当日高低价之间的位置</small></div>}
  {q.warning&&<p role="status" className="data-error">{q.warning}</p>}
  {q.fallbackReason&&!q.stale&&<p className="quote-notice">主行情源暂不可用，已切换备用来源。</p>}
  <details className="quote-details"><summary><span>{q.provider||'行情来源未提供'}<span className="quote-delay"> · 行情可能延迟</span></span><span><span className="quote-details-open">数据说明</span><span className="quote-details-close">收起说明</span><ChevronDown size={16}/></span></summary><div><p>抓取于 {timestamp(q.fetchedAt)}（北京时间）。刷新可能返回短时缓存，请以行情时间为准。</p><p>{q.notice||'显示最新可得行情快照，非实时交易报价。'} 缺失字段以“—”展示；成交额单位为{currency}。</p>{q.freshness&&<p>{q.freshness}</p>}{q.cacheWarning&&<p>{q.cacheWarning}</p>}{(isNumber(q.marketCap)||isNumber(q.pb))&&<p>总市值：{quoteAmount(q.marketCap)} {currency} · 市净率：{quoteNumber(q.pb)}</p>}</div></details>
 </article>;
}
