import {createHash} from 'node:crypto';
import {evidenceBlocks} from './evidence-search.mjs';
import {usableEvidenceBlock} from './document-layout.mjs';
export const verificationProperties={items:{type:'array',minItems:1,maxItems:60,items:{type:'object',properties:{key:{type:'string'},sourceId:{type:'string'},blockId:{type:'string'},quote:{type:'string'},label:{type:'string'},period:{type:'string'},unit:{type:'string'},value:{type:'number'},scale:{type:'number',enum:[1,1000,10000,1000000,100000000]}},required:['key','sourceId','blockId','quote','label','period','unit','value','scale'],additionalProperties:false}}};
const normalize=text=>String(text).normalize('NFKC').replace(/[−–]/g,'-').replace(/\s/g,'');
export function verifyFinancialInputs({items},{sources},discoverAlternatives=true){
 if(!Array.isArray(items)||!items.length||items.length>60)throw new Error('原数核对每次须提交1至60项');
 const keys=new Set();
 const checks=items.map(item=>{
  if(!item||['key','sourceId','blockId','quote','label','period','unit'].some(k=>typeof item[k]!=='string'||!item[k].trim()||item[k].length>(k==='quote'?5000:300))||keys.has(item.key)||!Number.isFinite(item.value)||![1,1000,10000,1000000,100000000].includes(item.scale))throw new Error('原数核对字段无效、重复或单位缩放未声明');keys.add(item.key);
  const candidates=sources.filter(s=>s.id===item.sourceId),source=candidates[0],blocks=source?evidenceBlocks(source).filter(b=>b.id===item.blockId):[],block=blocks[0];
  let status='matched-needs-review',reason='数值与标签在指定原文摘录中出现；期间、单位与行列关系仍需人工或模型核对。';
  if(candidates.length!==1||blocks.length!==1||!usableEvidenceBlock(source,block)){status='unusable';reason='来源或证据块缺失、重复、截断或尚不适合作为数值证据。';}
  else if(!normalize([block.context,block.text].filter(Boolean).join('\n')).includes(normalize(item.quote))||!normalize(item.quote).includes(normalize(item.label))){status='mismatch';reason='摘录不是指定证据块的连续原文，或摘录内缺少所声明的指标标签。';}
  else{
   // Do not remove signs, percentage marks or parentheses when matching tokens.
   const tokens=item.quote.normalize('NFKC').replace(/[−–]/g,'-').match(/(?<![\d.,])\(?[-+]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?%?\)?(?![\d.,])/g)||[];
   const values=tokens.map(token=>{const negative=token.startsWith('(')&&token.endsWith(')'),percent=token.includes('%'),raw=Number(token.replace(/[(),%]/g,''));const value=negative?-Math.abs(raw):raw;return percent?value/100:value*item.scale;});
   if(!values.some(value=>Number.isFinite(value)&&Math.abs(value-item.value)<=Number.EPSILON*Math.max(1,Math.abs(value),Math.abs(item.value))*2)){status='mismatch';reason='摘录中没有与所声明符号及缩放一致的完整数字；不以子串或绝对值代替。';}
  }
  return {...item,page:block?.page,status,reason,quoteSha256:createHash('sha256').update(item.quote).digest('hex')};
 });
 const recovery=discoverAlternatives?checks.filter(c=>c.status!=='matched-needs-review').slice(0,12).map(item=>{
  const source=sources.filter(s=>s.id===item.sourceId),alternatives=[];
  if(source.length===1)for(const block of evidenceBlocks(source[0])){
   if(alternatives.length>=3)break;
   if(block.id===item.blockId||!usableEvidenceBlock(source[0],block))continue;
   const body=[block.context,block.text].filter(Boolean).join('\n');
   if(body.length>5000||!normalize(body).includes(normalize(item.label)))continue;
   for(const scale of [...new Set([item.scale,1,1000,10000,1000000,100000000])]){
    const candidate={...item,blockId:block.id,quote:body,scale};
    const checked=verifyFinancialInputs({items:[candidate]},{sources},false).checks[0];
    if(checked.status==='matched-needs-review'){
     alternatives.push({sourceId:item.sourceId,blockId:block.id,page:block.page,quote:body,suggestedScale:scale,value:item.value,status:'candidate-needs-review',scaleNotice:'缩放仅为数值定位假设，必须从该表单位核对后才可提交，不能沿用摘要页单位。'});break;
    }
   }
  }
  return {key:item.key,failedBlockId:item.blockId,status:alternatives.length?'candidates-found':'not-found',alternatives,
   instruction:'候选仅说明同一来源的其他可用片段含标签及可按候选缩放对应的原数，未解决期间、单位或列归属。先按实际页码补读表头，核对单位后再以新的连续摘录及scale重做verify_financial_inputs；不得解除旧页质量标记。'};
 }):[];
 return {checks,recovery,recoveryLimited:discoverAlternatives&&checks.filter(c=>c.status!=='matched-needs-review').length>12,matched:checks.filter(c=>c.status==='matched-needs-review').length,unresolved:checks.filter(c=>c.status!=='matched-needs-review').length,notice:'匹配不等于数字已独立验证；多个比较列可能含同值，仍须核对所属列、期间、币种、合并范围与来源真实性。替代定位最多处理12个失败项，每项3个、每段5000字；无候选时继续定向读页或保留缺口。'};
}
