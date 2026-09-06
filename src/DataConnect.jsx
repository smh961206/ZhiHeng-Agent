import {useEffect,useRef,useState} from 'react';
import {Plus,X,RefreshCw,Globe,ShieldCheck,LoaderCircle,PencilLine,Sparkles,Check,ArrowUpRight} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {Input} from '@/components/ui/input';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {Skeleton} from '@/components/ui/skeleton';
import {api,post} from '@/lib/api';
import {researchDataCopy} from '../shared/research-data-copy.mjs';
const labels={CN:'A 股',HK:'港股',US:'美股'};
export default function DataConnect({resolution}){
 const {securities,status,manual,ambiguities,unresolved,warnings,overflow,error}=resolution;
 const [quotes,setQuotes]=useState([]),[loading,setLoading]=useState(false),[quoteError,setQuoteError]=useState('');
 const controller=useRef(null),signature=JSON.stringify(securities.map(({market,symbol})=>({market,symbol})));
 useEffect(()=>{controller.current?.abort();setQuotes([]);setQuoteError('');setLoading(false);return()=>controller.current?.abort();},[signature]);
 const change=(i,key,value)=>resolution.edit(securities.map((s,j)=>j===i?{...s,[key]:value,name:undefined}:s));
 async function preview(){
  const abort=new AbortController();controller.current=abort;setLoading(true);setQuoteError('');
  try{const values=await api('/api/quotes',{...post({securities:securities.map(({market,symbol})=>({market,symbol}))}),signal:abort.signal});if(!abort.signal.aborted)setQuotes(values);}
  catch(e){if(!abort.signal.aborted)setQuoteError(e.message);}
  finally{if(!abort.signal.aborted)setLoading(false);}
 }
 return <section className="data-connect" aria-label={researchDataCopy.title}><div className="section-title"><span><Globe size={17}/><strong>{researchDataCopy.title}</strong></span><Badge variant="secondary">{manual?'手动核对':'自动识别'}</Badge></div><p className="muted small">{researchDataCopy.introduction}</p>
 <div aria-live="polite" className="resolution-status">
 {status==='loading'?<><span className="inline-flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle size={15} className="animate-spin"/>正在核对证券目录…</span><Skeleton className="mt-3 h-14 w-full rounded-lg"/></>:null}
 {!manual&&status!=='loading'&&securities.map(s=><div className="security-chip" key={`${s.market}:${s.symbol}`}><span className="security-logo">{(s.name||s.symbol).slice(0,1)}</span><div><strong>{s.name||s.symbol}</strong><span>{labels[s.market]} <code>{s.symbol}</code></span></div><Check size={17} className="ml-auto text-primary"/><Badge variant="outline">已匹配</Badge></div>)}
 {!manual&&status!=='loading'&&!securities.length&&!ambiguities.length&&<div className="detect-empty"><Sparkles size={21}/><span>{status==='idle'?'在问题中写下公司名称或股票代码，即可自动填入。':'未匹配到明确标的，请补充名称、代码或手动选择。'}</span></div>}
 {ambiguities.map(group=><div className="ambiguity" key={group.mention}><strong>“{group.mention}”对应多个证券，请选择市场或股类</strong><div className="flex flex-wrap gap-2 mt-3">{group.candidates.map(s=><Button type="button" size="sm" variant="outline" key={`${s.market}:${s.symbol}`} onClick={()=>resolution.choose(group.mention,s)}>{labels[s.market]} · {s.name} <code>{s.symbol}</code></Button>)}</div></div>)}
 {unresolved.length>0&&<p className="data-error">尚未确认：{unresolved.join('、')}。请修改问题或手动核对。</p>}
 {overflow&&<p className="data-error">识别范围超过单次3个标的，请精简问题或手动选择。</p>}
 {(error||quoteError)&&<p role="alert" className="data-error">{error||quoteError}</p>}
 {warnings.map(w=><p className="small muted" key={w}>{w}</p>)}
 </div>
 {manual&&<div className="manual-securities">{securities.map((s,i)=><div key={i} className="security-row"><Select value={s.market} onValueChange={v=>change(i,'market',v)}><SelectTrigger aria-label={`标的${i+1}市场`} className="w-24 shrink-0"><SelectValue/></SelectTrigger><SelectContent>{Object.entries(labels).map(([key,text])=><SelectItem value={key} key={key}>{text}</SelectItem>)}</SelectContent></Select><Input aria-label={`标的${i+1}股票代码`} maxLength={12} placeholder={s.market==='CN'?'6位股票代码':s.market==='HK'?'港股代码':'美股代码'} value={s.symbol} onChange={e=>change(i,'symbol',e.target.value.toUpperCase())}/><Button size="icon" variant="ghost" type="button" aria-label={`移除标的${i+1}`} onClick={()=>resolution.edit(securities.filter((_,j)=>i!==j))}><X size={16}/></Button></div>)}<Button type="button" variant="ghost" size="sm" disabled={securities.length>=3} onClick={()=>resolution.edit([...securities,{market:'CN',symbol:''}])}><Plus size={15}/>添加标的</Button></div>}
 <div className="data-actions"><Button variant="ghost" size="sm" type="button" onClick={()=>manual?resolution.auto():resolution.edit(securities.length?securities:[{market:'CN',symbol:''}])}>{manual?<Sparkles size={15}/>:<PencilLine size={15}/>} {manual?'恢复自动识别':'手动调整'}</Button><Button variant="outline" size="sm" type="button" disabled={loading||resolution.blocked} onClick={preview}>{loading?<LoaderCircle size={15} className="animate-spin"/>:<RefreshCw size={15}/>}查看行情</Button></div>
 {quotes.map((item,i)=><div key={i} className="quote-card">{item.error?<p className="data-error">{labels[item.security.market]} {item.security.symbol} · {item.error}</p>:<><div className="quote-top"><strong>{item.quote.name}</strong><span className="tabular-nums font-semibold">{({CNY:'人民币',HKD:'港元',USD:'美元'})[item.quote.currency]||item.quote.currency} {item.quote.price.toLocaleString('zh-CN',{maximumFractionDigits:4})}</span></div><p>{item.quote.provider} · {new Date(item.quote.asOf).toLocaleString('zh-CN')}</p><p>抓取于 {new Date(item.quote.fetchedAt).toLocaleString('zh-CN')} · 行情可能延迟</p>{item.quote.warning&&<p role="status" className="data-error">{item.quote.warning}</p>}{item.quote.fallbackReason&&!item.quote.stale&&<p>主行情源暂不可用，已切换备用来源。</p>}</>}</div>)}
 <div className="data-footnote"><ShieldCheck size={14}/><span>{researchDataCopy.footnote}</span></div></section>;
}

