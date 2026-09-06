// Arithmetic only. Provenance is checked by calculationBasis in the dispatcher.
export function normalizedEarnings({equity,shares,roeLow,roeHigh,peLow,peHigh,price}) {
 const positive=x=>typeof x==='number'&&Number.isFinite(x)&&x>0;
 if(![equity,shares,roeLow,roeHigh,peLow,peHigh].every(positive)||roeHigh>1||roeLow>roeHigh||peLow>peHigh)
  throw new Error('正常化估值参数无效：权益与股本须同数量单位，ROE使用小数，区间下限不得高于上限');
 if(price!==undefined&&!positive(price))throw new Error('价格须为同币种正数；汇率未核实时请省略价格');
 const profit=[equity*roeLow,equity*roeHigh],eps=profit.map(value=>value/shares);
 const value=[eps[0]*peLow,eps[1]*peHigh];
 if(![...profit,...eps,...value].every(positive))throw new Error('计算超出有效数值范围，请复核金额与股本单位');
 const margin=price===undefined?null:value.map(v=>1-price/v);
 if(margin?.some(v=>!Number.isFinite(v)))throw new Error('安全边际超出有效数值范围，请复核价格与价值单位');
 return {status:'Conditional',profit,eps,value,margin,
  formula:'正常化利润 = 普通股权益 × 正常化ROE；EPS = 利润 / 同权益股本；每股价值 = EPS × PE；安全边际 = 1 − 同币种价格 / 每股价值',
  notice:'结果取决于声明的正常化假设；期末权益代理不同于平均权益ROE，须说明调整，不能将历史均值自动作为预测。'};
}
