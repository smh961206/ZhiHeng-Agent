import {usableEvidenceBlock} from './document-layout.mjs';
import {evidenceBlocks} from './evidence-search.mjs';

export function calculationRecovery(error,sources,seenEvidence){
 if(error.code!=='calculation_evidence')return undefined;
 const sourceIds=[...new Set(error.sourceIds||[])];
 const candidates=seenEvidence.filter(match=>{
  if(!sourceIds.includes(match.id))return false;
  const currentSources=sources.filter(source=>source.id===match.id);
  if(currentSources.length!==1)return false;
  const source=currentSources[0],blocks=evidenceBlocks(source).filter(block=>block.id===match.blockId);
  return blocks.length===1&&usableEvidenceBlock(source,match)&&usableEvidenceBlock(source,blocks[0])
   &&typeof blocks[0].text==='string'&&!!blocks[0].text.trim()&&typeof match.text==='string'&&match.text.includes(blocks[0].text);
 });
 return {sourceIds,candidates:candidates.slice(-8).map(match=>({sourceId:match.id,blockId:match.blockId,page:match.page,text:match.text.slice(0,1000)})),
  instruction:'这些是本次已检索的可读官方片段，仅供定位，不代表支持当前参数。核对数值、单位和期间后再填写basis.evidenceBlocks；片段不够时按sourceId重新检索，禁止猜测编号或原样重复失败调用。无可靠证据则保留缺口。'};
}
