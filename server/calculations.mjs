const finite = x => typeof x === 'number' && Number.isFinite(x);
const positive = x => finite(x) && x > 0;
export function correction(d) {
  if (!finite(d) || d < 0) return null;
  return d >= .5 ? 1 : d > .25 ? .5/d : 2;
}
export function p2(x) {
  const { formula='F1', pe, pb, roe, payout, sector='mature', qualityVerified=false, basisVerified=false, correctionVerified=false }=x;
  if(!['F1','F2','F3'].includes(formula)) throw new Error('未知 P2 公式');
  if(!qualityVerified || !basisVerified) return {status:'Data Insufficient', reason:'需要验证正利润、正且非极小权益、ROE质量及期间/权益/股类口径'};
  if((formula!=='F3' && (!positive(roe) || roe>1)) || (formula!=='F2' && !positive(pe)) || (formula!=='F1' && !positive(pb))) return {status:'Not Applicable',reason:'盈利、权益或ROE无效/异常，需要人工复核'};
  const value=formula==='F1'?pe/(100*roe):formula==='F2'?pb/(100*roe**2):pe**2/(100*pb);
  const n=correctionVerified && !['cycle','growth','buyback','index'].includes(sector)?correction(payout):null;
  return {status:'Conditional',formula,ordinary:value,n,adjusted:n===null?null:value*n,notice:'用户/模型声明口径已核实；P2为作者经验指标，价格锚不等于内在价值。行业适配仍需证据。',anchors:positive(x.price)?[.5,.7,1,1.5].map(target=>({target,ordinary:x.price*target/value,adjusted:n===null?null:x.price*target/(value*n)})):[],sensitivity:formula==='F3'?[]:[-.02,0,.02].filter(delta=>roe+delta>0).map(delta=>({roe:roe+delta,p2:formula==='F1'?pe/(100*(roe+delta)):pb/(100*(roe+delta)**2)}))};
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
