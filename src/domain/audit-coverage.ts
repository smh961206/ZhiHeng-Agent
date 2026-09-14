// Counts describe packets sent to the reviewer, not independent verification.
// Historical jobs may have only the original single-window field.
export function auditCoverage(validation){
 const windows=Array.isArray(validation?.evidenceWindows)&&validation.evidenceWindows.length
  ?validation.evidenceWindows:validation?.initialEvidenceWindow?[{phase:'initial',...validation.initialEvidenceWindow}]:[];
 const count=value=>Number.isInteger(value)&&value>=0?String(value):'未记录';
 return windows.filter(window=>window&&typeof window==='object').map((window,index)=>{
  const title=window.phase==='initial'?'初次复核':`补证复核${windows.filter(item=>item?.phase==='supplement').length>1?' '+index:''}`;
  const summary=`${title}收到 ${count(window.evidenceIncluded)}/${count(window.evidenceTotal)} 段完整证据、${count(window.toolsIncluded)}/${count(window.toolsTotal)} 条完整工具记录。`;
  const omitted=(window.omittedEvidence?.length??Math.max(0,(window.evidenceTotal??0)-(window.evidenceIncluded??0)))+(window.omittedTools?.length??Math.max(0,(window.toolsTotal??0)-(window.toolsIncluded??0)));
  const missingSources=window.citedSourcesWithoutExcerpt??[];
  const missingCalculations=(window.calculationEvidence??[]).filter(item=>item.sourceIdsWithoutExcerpt?.length||item.missingBlocks?.length);
  return {title,summary,limitations:[
   ...(omitted?['部分记录超出本轮容量，未纳入的内容不能视为已核验。']:[]),
   ...(missingSources.length?[`报告引用的 ${missingSources.length} 份资料在本轮未附原文片段，须补查或保留限制。`]:[]),
   ...(missingCalculations.length?[`${missingCalculations.length} 次计算在本轮缺少所引用的原文依据，计算返回成功不代表参数已核实。`]:[]),
  ]};
 });
}
export const auditCoverageNotice='以上按轮次记录送审资料，重复片段不累加为新增证据；后续直接调用工具的返回另见执行记录。资料已送审不等于事实已核实。';
