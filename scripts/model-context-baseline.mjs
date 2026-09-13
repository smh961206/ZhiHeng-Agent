import {pathToFileURL} from 'node:url';
import {legacyToolsForMode,toolsForResearchState} from '../server/agent.mjs';

const size=value=>JSON.stringify(value).length;
export function modelContextBaseline(){
 const paths=['A','B','C','D','E','F'].map(mode=>{
  const before=legacyToolsForMode(mode),after=toolsForResearchState(mode,[]),beforeCharacters=size(before),afterCharacters=size(after);
  return {mode,beforeTools:before.length,afterTools:after.length,beforeCharacters,afterCharacters,
   characterReduction:beforeCharacters-afterCharacters,reductionRate:beforeCharacters?(beforeCharacters-afterCharacters)/beforeCharacters:null};
 });
 const beforeCharacters=paths.reduce((sum,item)=>sum+item.beforeCharacters,0),afterCharacters=paths.reduce((sum,item)=>sum+item.afterCharacters,0);
 return {version:1,method:'deterministic-serialized-tool-definitions',modelCalls:0,manualReviewRequired:false,unit:'characters',tokenEstimate:null,
  paths,total:{beforeCharacters,afterCharacters,characterReduction:beforeCharacters-afterCharacters,reductionRate:beforeCharacters?(beforeCharacters-afterCharacters)/beforeCharacters:null},
  notice:'这是固定工具定义的自动体积基线，不冒充供应商 Token；实际 Token 由正常研究的 ModelCall 用量统计。'};
}

if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)console.log(JSON.stringify(modelContextBaseline(),null,2));
