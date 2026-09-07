import {comparisonReadiness} from '../shared/company-comparison.mjs';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Plus,X,RefreshCw,Globe,ShieldCheck,LoaderCircle,PencilLine,Sparkles} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Input} from '@/components/ui/input';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {Skeleton} from '@/components/ui/skeleton';
import {Tabs,TabsContent} from '@/components/ui/tabs';
import {api,post} from '@/lib/api';
import {researchDataCopy} from '../shared/research-data-copy.mjs';
import CompanySecurityCard from './components/CompanySecurityCard';

import MarketQuote from './components/MarketQuote';
import MultiCompanySelector from './components/MultiCompanySelector';
import {securityIdentity} from './lib/security-display.mjs';
import './components/market-quote.css';
const labels={CN:'A股',HK:'港股',US:'美股'};
export default function DataConnect({resolution,comparison=false}){
 const {securities,status,manual,ambiguities,unresolved,warnings,overflow,error}=resolution;
 const [quotes,setQuotes]=useState([]),[loading,setLoading]=useState(false),[quoteError,setQuoteError]=useState('');
 const [selectedCompany,setSelectedCompany]=useState('');
 const multiple=securities.length>1;
 const activeCompany=securities.some(s=>securityIdentity(s).code===selectedCompany)?selectedCompany:securities[0]?securityIdentity(securities[0]).code:'';
 const controller=useRef(null),signature=JSON.stringify(securities.map(({market,symbol})=>({market,symbol})));
 const change=(i,key,value)=>resolution.edit(securities.map((s,j)=>j===i?{...s,[key]:value,name:undefined}:s));
 const blocked=resolution.blocked;
 const preview=useCallback(async()=>{
  if(blocked)return;
  controller.current?.abort();const abort=new AbortController();controller.current=abort;setLoading(true);setQuoteError('');
  try{const values=await api('/api/quotes',{...post({securities:JSON.parse(signature)}),signal:abort.signal});if(!abort.signal.aborted)setQuotes(values);}
  catch(e){if(!abort.signal.aborted)setQuoteError(e.message);}
  finally{if(!abort.signal.aborted)setLoading(false);}
 },[signature,blocked]);
 useEffect(()=>{
  controller.current?.abort();setQuotes([]);setQuoteError('');setLoading(!blocked);
  // Debounce manual edits and cancel the previous target's request before loading.
  const timer=blocked?null:setTimeout(()=>void preview(),400);
  return()=>{clearTimeout(timer);controller.current?.abort();};
 },[preview,blocked]);
 return <Tabs orientation="vertical" className="flex-col" value={activeCompany} onValueChange={setSelectedCompany}><section className={`data-connect${multiple?' data-connect-multiple':''}`} aria-label={researchDataCopy.title}><div className="section-title"><span><Globe size={17}/><strong>{researchDataCopy.title}</strong></span><Badge variant="secondary">{manual?'手动核对':resolution.source==='semantic'?'语义识别':resolution.source==='rules'?'名称匹配':'自动识别'}</Badge></div><p className="muted small">{comparison?"选择 2–3 家公司进行比较。行情分别保留币种和时间，研究时会核对财报口径。":researchDataCopy.introduction}</p>{comparison&&<p className="small muted" role="status">{blocked&&securities.length?'请先处理下方标的提示，确认后将自动加载行情。':comparisonReadiness(securities).message}</p>}
 <div aria-live="polite" className="resolution-status">
 {status==='loading'?<><span className="inline-flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle size={15} className="animate-spin"/>正在识别研究对象并核对证券目录…</span><Skeleton className="mt-3 h-14 w-full rounded-lg"/></>:null}
 {multiple&&status!=='loading'&&(!manual||!blocked)&&<MultiCompanySelector securities={securities} quotes={quotes} loading={loading} blocked={blocked} error={quoteError}/>}
 {!multiple&&!manual&&status!=='loading'&&securities.map(s=><CompanySecurityCard key={`${s.market}:${s.symbol}`} security={s} item={quotes.find(item=>securityIdentity(item.security).code===securityIdentity(s).code)} loading={loading} blocked={blocked} error={quoteError}/>)}
 {!manual&&status!=='loading'&&!securities.length&&!ambiguities.length&&<div className="detect-empty"><Sparkles size={21}/><span>{status==='idle'?'在问题中写下公司名称或股票代码，即可自动填入。':'未匹配到明确标的，请补充名称、代码或手动选择。'}</span></div>}
 {ambiguities.map(group=><div className="ambiguity" key={group.mention}><strong>“{group.mention}”对应多个证券，请选择市场或股类</strong><div className="flex flex-wrap gap-2 mt-3">{group.candidates.map(s=><Button type="button" size="sm" variant="outline" key={`${s.market}:${s.symbol}`} onClick={()=>resolution.choose(group.mention,s)}>{labels[s.market]} · {s.name} <code>{s.symbol}</code></Button>)}</div></div>)}
 {unresolved.length>0&&<p className="data-error">尚未确认：{unresolved.join('、')}。请修改问题或手动核对。</p>}
 {overflow&&<p className="data-error">识别范围超过单次3个标的，请精简问题或手动选择。</p>}
 {error&&<p role="alert" className="data-error">{error}</p>}
 {warnings.map(w=><p className="small muted" key={w}>{w}</p>)}
 </div>
 {manual&&<div className="manual-securities">{securities.map((s,i)=><div key={i} className="security-row"><Select value={s.market} onValueChange={v=>change(i,'market',v)}><SelectTrigger aria-label={`标的${i+1}市场`} className="w-24 shrink-0"><SelectValue/></SelectTrigger><SelectContent>{Object.entries(labels).map(([key,text])=><SelectItem value={key} key={key}>{text}</SelectItem>)}</SelectContent></Select><Input aria-label={`标的${i+1}股票代码`} maxLength={12} placeholder={s.market==='CN'?'6位股票代码':s.market==='HK'?'港股代码':'美股代码'} value={s.symbol} onChange={e=>change(i,'symbol',e.target.value.toUpperCase())}/><Button size="icon" variant="ghost" type="button" aria-label={`移除标的${i+1}`} onClick={()=>resolution.edit(securities.filter((_,j)=>i!==j))}><X size={16}/></Button></div>)}<Button type="button" variant="ghost" size="sm" disabled={securities.length>=3} onClick={()=>resolution.edit([...securities,{market:'CN',symbol:''}])}><Plus size={15}/>添加标的</Button></div>}
 <div className="data-actions">{status==='error'&&!manual&&<Button variant="outline" size="sm" type="button" onClick={resolution.auto}><RefreshCw size={16}/>重新识别</Button>}<Button variant="ghost" size="sm" type="button" onClick={()=>manual?resolution.auto():resolution.edit(securities.length?securities:[{market:'CN',symbol:''}])}>{manual?<Sparkles size={16}/>:<PencilLine size={16}/>} {manual?'恢复自动识别':'手动调整'}</Button><span className="quote-auto-hint">识别后自动加载</span><Button variant="outline" size="sm" type="button" disabled={loading||blocked} onClick={preview}>{loading?<LoaderCircle size={16} className="animate-spin"/>:<RefreshCw size={16}/>}{loading?(quotes.length?'刷新中…':'加载中…'):quoteError?'重试行情':multiple?'刷新全部行情':'刷新行情'}</Button></div>
 {quoteError&&<p role="alert" className="data-error quote-request-error">{quoteError}{quotes.some(item=>item.quote)&&<span>刷新未成功，保留上次行情。请核对行情时间后重试。</span>}</p>}
 <div className="quote-results" aria-busy={loading}>
 {loading&&!quotes.length&&<div className="quote-loading" role="status"><span><LoaderCircle size={16} className="animate-spin"/>正在加载行情…</span><Skeleton className="h-14 w-36"/><div><Skeleton className="h-20 w-full"/><Skeleton className="h-20 w-full"/><Skeleton className="h-20 w-full"/></div></div>}
 {quotes.map(item=>multiple?<TabsContent key={securityIdentity(item.security).code} value={securityIdentity(item.security).code}><MarketQuote item={item} loading={loading} onRetry={preview}/></TabsContent>:<MarketQuote key={`${item.security.market}:${item.security.symbol}`} item={item} loading={loading} onRetry={preview}/>)}
 <span className="sr-only" role="status">{loading?'正在获取行情':quotes.length?`已显示 ${quotes.length} 个标的的行情结果`:''}</span>
 </div>
 <div className="data-footnote"><ShieldCheck size={14}/><span>{researchDataCopy.footnote}</span></div></section></Tabs>;
}

