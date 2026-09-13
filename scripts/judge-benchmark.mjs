import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {objectHash} from '../benchmark/fixtures.mjs';
import {compareJudgeSamples} from '../benchmark/statistics.mjs';
import {buildJudgeInput} from '../server/model-judge.mjs';
export function runJudgeBenchmark(){
 const fixture=JSON.parse(fs.readFileSync(new URL('../tests/fixtures/judge-v52.json',import.meta.url),'utf8'));
 const samples=fixture.cases.flatMap(c=>['baseline','candidate'].map(arm=>{
  let p;try{p=buildJudgeInput(c.input);}catch{}
  const outcome=arm==='baseline'?'insufficient_to_decide':c.expected;
  const output=p?{version:1,inputHash:p.inputHash,outcome,selectedId:outcome==='accept_l1'?p.l1.id:outcome==='accept_l2'?p.l2.id:null,reasonCode:outcome==='insufficient_to_decide'?'insufficient_evidence':'evidence_consistency',citations:p.evidence.map(e=>({sourceId:e.id,blockId:e.blockId,quote:e.text})),reviewedToolCallIds:p.tools.map(t=>t.toolCallId)}:null;
  return {caseId:c.id,arm,fixtureHash:objectHash(c),output,calls:[],evidenceKind:'simulation'};
 }));
 const comparison=compareJudgeSamples(fixture.cases,samples);
 return {version:1,kind:'judge-offline-verification',fixtureHash:objectHash(fixture),modelRequests:0,passed:comparison.candidate.passed===fixture.cases.length&&comparison.candidate.criticalErrors===0,comparison,samples,qualityAccepted:false,productionValueAccepted:false};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 try{const args=process.argv.slice(2);if(args.length!==2||args[0]!=='--out')throw Error('Use --out with a new output file');const report=runJudgeBenchmark();fs.writeFileSync(args[1],JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({passed:report.passed,cases:report.comparison.candidate.cases,modelRequests:0}));if(!report.passed)process.exitCode=1;}catch(error){console.error(error.message);process.exitCode=1;}
}
