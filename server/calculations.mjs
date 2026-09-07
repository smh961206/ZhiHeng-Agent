import {evidenceBlocks} from './evidence-search.mjs';
import {usableEvidenceBlock} from './document-layout.mjs';
const finite = x => typeof x === 'number' && Number.isFinite(x);
const positive = x => finite(x) && x > 0;
export function correction(d) {
  if (!finite(d) || d < 0) return null;
  return d >= .5 ? 1 : d > .25 ? .5/d : 2;
}
export function p2(x) {
  const { formula='F1', pe, pb, roe, payout, sector='mature', qualityVerified=false, basisVerified=false, correctionVerified=false }=x;
  if(!['F1','F2','F3'].includes(formula)) throw new Error('未知市赚率公式');
  if(!['mature','cycle','growth','buyback','index','bank','insurance'].includes(sector))throw new Error('未知市赚率行业适配类型');
  if(!qualityVerified || !basisVerified) return {status:'Data Insufficient', reason:'需要验证正利润、正且非极小权益、ROE质量及期间/权益/股类口径'};
  if((formula!=='F3' && (!positive(roe) || roe>1)) || (formula!=='F2' && !positive(pe)) || (formula!=='F1' && !positive(pb))) return {status:'Not Applicable',reason:'盈利、权益或ROE无效/异常，需要人工复核'};
  const value=formula==='F1'?pe/(100*roe):formula==='F2'?pb/(100*roe**2):pe**2/(100*pb);
  if(!positive(value))return {status:'Not Applicable',reason:'计算超出有效数值范围，须复核输入单位与正常化ROE'};
  const cycleException=sector==='cycle'&&x.cycleCorrection===true&&typeof x.correctionReason==='string'&&x.correctionReason.trim().length>0;
  const n=correctionVerified && (!['cycle','growth','buyback','index'].includes(sector)||cycleException)?correction(payout):null;
  const payoutSensitivity=n===null?[]:[-.1,0,.1].filter(delta=>payout+delta>=0).map(delta=>({payout:payout+delta,n:correction(payout+delta),adjusted:value*correction(payout+delta)}));
  return {status:'Conditional',formula,ordinary:value,n,adjusted:n===null?null:value*n,correctionReason:cycleException?x.correctionReason:n===null?'未启用修正或不满足支付率/行业适配条件':'支付率及适配性由调用方声明核实',notice:'用户/模型声明口径已核实；市赚率为作者经验指标，价格锚不等于内在价值。行业适配仍需证据。',anchors:positive(x.price)?[.4,.5,.7,1,1.5].map(target=>({target,ordinary:x.price*target/value,adjusted:n===null?null:x.price*target/(value*n)})):[],payoutSensitivity,sensitivity:formula==='F3'?[]:[-.02,0,.02].filter(delta=>roe+delta>0).map(delta=>({roe:roe+delta,p2:formula==='F1'?pe/(100*(roe+delta)):pb/(100*(roe+delta)**2)}))};
}
export function dcf(x) {
  const {cashFlow,growth,discount,terminalGrowth,years=5,shares,kind,sector='industrial'}=x;
  if(!['FCFF','FCFE'].includes(kind))throw new Error('必须选择FCFF或FCFE');
  if(['bank','insurance'].includes(sector))throw new Error('金融企业须使用适配模型，不支持本工业企业DCF工具');
  if(!positive(cashFlow)||!positive(shares)||!finite(growth)||growth<=-1||!positive(discount)||!finite(terminalGrowth)||terminalGrowth<=-1||discount<=terminalGrowth||!Number.isInteger(years)||years<1||years>20)throw new Error('DCF参数无效：折现率须大于永续增长率，现金流和稀释股本须为正');
  if(kind==='FCFF' && !['debt','cash','minority','investments'].every(k=>finite(x[k])&&x[k]>=0))throw new Error('FCFF必须明确债务、现金、少数股东权益、非经营投资（不适用须显式0）');
  let pv=0,cf=cashFlow;
  for(let i=1;i<=years;i++){cf*=1+growth;pv+=cf/(1+discount)**i;}
  const terminal=cf*(1+terminalGrowth)/(discount-terminalGrowth)/(1+discount)**years;
  const total=pv+terminal,equity=kind==='FCFF'?total-x.debt-x.minority+x.cash+x.investments:total;
  if(!Number.isFinite(equity))throw new Error('DCF数值超出范围');
  return {kind,value:total,equity,perShare:equity/shares,terminalShare:terminal/total,margin:positive(x.price)&&equity>0?1-x.price/(equity/shares):null};
}
export function dividend({dps,yields=[.03,.04,.05,.06,.07]}){
  if(!finite(dps)||dps<0||!Array.isArray(yields)||!yields.length||yields.length>20||!yields.every(positive))throw new Error('DPS和目标收益率无效');
  return {notice:'收益率锚 ≠ 内在价值；DPS须为可持续口径',anchors:yields.map(yieldRate=>({yield:yieldRate,price:dps/yieldRate}))};
}

export function calculationBasis(basis,sources){
 if(!basis||typeof basis!=='object')throw new Error('计算前须记录币种、期间、股本口径和参数来源');
 for(const [key,label] of [['currency','币种'],['period','期间'],['shareBasis','股本口径'],['assumptions','假设与正常化依据']]){
  if(typeof basis[key]!=='string'||!basis[key].trim()||basis[key].length>4000)throw new Error('计算缺少有效的'+label);
 }
 if(!Array.isArray(basis.sourceIds)||!basis.sourceIds.length||basis.sourceIds.some(id=>!sources.some(source=>source.id===id&&!['filing-index','data-check','search-result','search-summary'].includes(source.type))))throw new Error('计算参数须关联实际资料ID，搜索摘要、披露目录与覆盖检查不能代替正文证据');
 const evidence=sources.filter(source=>basis.sourceIds.includes(source.id));
 const duplicateIds=[...new Set(evidence.map(source=>source.id))].filter(id=>evidence.filter(source=>source.id===id).length>1);
 if(duplicateIds.length)throw Object.assign(new Error('计算引用的资料编号重复，无法唯一定位：'+duplicateIds.join('、')),{code:'calculation_evidence',sourceIds:duplicateIds});
 const missingBlocks=evidence.filter(source=>['official-report','web-evidence'].includes(source.type)&&Array.isArray(source.documentBlocks)&&!source.documentBlocks.length&&!source.financialFacts?.length);
 if(missingBlocks.length)throw Object.assign(new Error('所选已解析资料没有可引用的正文证据块，须重新读取或补充原件'),{code:'calculation_evidence',sourceIds:missingBlocks.map(source=>source.id)});
 const references=basis.evidenceBlocks||[];
 if(!Array.isArray(references)||references.length>30)throw new Error('计算证据块清单格式无效');
 const referencedBlocks=references.map(reference=>{
  const candidates=evidence.filter(source=>source.id===reference?.sourceId),source=candidates[0];
  const blocks=source?evidenceBlocks(source).filter(block=>block.id===reference?.blockId):[];
  if(candidates.length>1||blocks.length>1)throw Object.assign(new Error('计算引用的资料或证据块编号重复，无法唯一定位：'+String(reference?.sourceId)+' / '+String(reference?.blockId)),{code:'calculation_evidence',sourceIds:[reference?.sourceId].filter(Boolean)});
  const block=blocks[0];
  if(!block)throw Object.assign(new Error('计算引用的原文证据块不存在或不属于所选资料：'+String(reference?.sourceId)+' / '+String(reference?.blockId)),{code:'calculation_evidence',sourceIds:[reference?.sourceId].filter(Boolean)});
  return {source,block};
 });
 const unsafe=referencedBlocks.filter(({source,block})=>block.method==='ocr'||block.truncated||['official-report','official-xbrl','web-evidence'].includes(source.type)&&(block.needsReview||block.symbolReview));
 if(unsafe.length)throw Object.assign(new Error('计算引用的OCR或待核对正文块不能作为数值依据；请改用已检索且可核对的非OCR官方正文'),{code:'calculation_evidence',sourceIds:[...new Set(unsafe.map(({source})=>source.id))]});
 const nativeReference=referencedBlocks.some(({source,block})=>usableEvidenceBlock(source,block));
 if(evidence.some(source=>source.qualitySummary?.ocrPages)&&!nativeReference&&!evidence.some(source=>source.official===true&&(source.type==='official-xbrl'&&source.factsCount>0||source.type==='official-report'&&!source.qualitySummary?.ocrPages&&!source.truncated&&!source.emptyPages&&!source.legacyParser)))throw Object.assign(new Error('OCR识别数字仍待核对，须关联非OCR的官方XBRL/原文；混合PDF请用evidenceBlocks明确引用已检索的非OCR正文块'),{code:'calculation_evidence',sourceIds:evidence.filter(source=>source.qualitySummary?.ocrPages).map(source=>source.id)});
 if(new Set(evidence.map(source=>source.security).filter(Boolean)).size>1)throw new Error('单标的估值不能混用不同证券或不同股类的资料');
 if(evidence.some(source=>source.type==='web-evidence'&&(!source.documentRead||!source.authorityVerified||!source.publishedAt)))throw new Error('网页财务数值须已读取正文、确认来源机构并取得原文发布日期；未知身份、日期或摘要不能用于计算');
 if(evidence.some(source=>['vendor-financials','shareholder-data','valuation-history','web-evidence'].includes(source.type))&&!evidence.some(source=>source.official===true&&['official-report','official-xbrl'].includes(source.type)))throw new Error('补充财务及股东回报数据须关联已读取的官方披露，核对币种、单位、期间和股本后计算');
 if(evidence.some(source=>source.stale)&&!/历史|过期|旧|截至|stale|historical|as.of/i.test(basis.assumptions+' '+basis.period))throw new Error('来源含旧数据，须在期间或假设中明确其截止日期和历史性质，不能声称是当前估值');
 if(evidence.some(source=>source.type==='quote'&&source.currency&&source.currency!==basis.currency.trim()))throw new Error('估值币种与引用行情币种不一致，须先核对换算和股类口径');
 return {currency:basis.currency,period:basis.period,shareBasis:basis.shareBasis,assumptions:basis.assumptions,sourceIds:[...new Set(basis.sourceIds)],...(references.length?{evidenceBlocks:references}:{})};
}
