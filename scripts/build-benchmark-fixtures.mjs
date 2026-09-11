// Explicit deterministic bootstrap importer. Existing V4.9 originals remain unchanged.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {loadVisionCorpus} from './vision-benchmark.mjs';
import {sha256,loadFrozenSuite} from '../benchmark/fixtures.mjs';
export function buildBenchmarkFixtures(directory){
 if(fs.existsSync(directory))throw Error('Choose a new versioned fixture directory; frozen files are not overwritten');
 fs.mkdirSync(directory,{recursive:true});const files=[],cases=[];
 const put=(relative,data,kind)=>{const bytes=Buffer.isBuffer(data)?data:Buffer.from(JSON.stringify(data,null,2)+'\n');fs.mkdirSync(path.dirname(path.join(directory,relative)),{recursive:true});fs.writeFileSync(path.join(directory,relative),bytes,{flag:'wx'});files.push({path:relative,kind,sha256:sha256(bytes)});return sha256(bytes);};
 const cutoff='2026-09-06T23:59:59Z';
 const base=(id,category,requiredCapabilities)=>({version:1,id,category,fixture:id,fixtureVersion:'v1',cutoff,qualityCriticality:'critical',requiredCapabilities,expectedFacts:[],expectedCitations:[],expectedToolBehavior:[],requiredValidations:['extraction_contract'],forbiddenBehaviors:['invented_fact','wrong_basis','future_evidence','missing_as_zero','hidden_reasoning','forecast_as_fact','dropped_counter_evidence']});
 const empty=()=>({facts:[],citations:[],tools:[],validations:[{id:'extraction_contract',passed:true}],counterEvidence:[],violations:[],delivered:true});
 const tasks=[['A','quick_screen','Revenue'],['B','deep_research','Operating cash flow'],['C','earnings_update','Quarterly revenue'],['D','company_comparison','Comparable profit'],['E','execution_review','Position valuation'],['F','shareholder_return','Dividend'],['B','missing_conflict','Restated earnings'],['B','complex_valuation','FCFF']];
 for(const [i,[mode,category,metric]] of tasks.entries()){
  const id='TEXT-'+String(i+1).padStart(3,'0'),c=base(id,category,['textInput']);
  const fact={id:'metric',value:null,period:'FY2025',currency:'USD',unit:'million',shareBasis:null,accountingScope:'consolidated',valuationBasis:null,sourceId:'S1',blockId:'B1',kind:'observation'};
  const text=`Synthetic component fixture, not a company disclosure. ${metric}: not reported. Period FY2025; currency USD; unit million; scope consolidated. Share basis and valuation basis are unavailable. Missing is not zero.`;
  const citation={sourceId:'S1',blockId:'B1',quote:metric+': not reported'};c.expectedFacts=[fact];c.expectedCitations=[citation];
  const output={...empty(),facts:[fact],citations:[citation]};
  put('fixtures/'+id+'.json',{version:1,id,fixtureVersion:'v1',synthetic:true,scope:'component-extraction',mode,prompt:`Extract the one requested metric (${metric}) as id metric with its explicit basis and one exact source quote. Preserve unavailable values as null.`,sources:[{id:'S1',publishedAt:'2026-09-01T00:00:00Z',blocks:[{id:'B1',text}]}],market:[],assets:[],referenceOutput:output},'fixture');cases.push(c);
 }
 const vision=loadVisionCorpus();
 for(const item of vision.manifest.cases){
  const c=base(item.id,'vision_table',['textInput','imageInput']),asset='assets/'+item.file;
  const digest=put(asset,fs.readFileSync(new URL(item.file,vision.root)),'asset');
  put('fixtures/'+item.id+'.json',{version:1,id:item.id,fixtureVersion:'v1',synthetic:true,scope:'component-extraction',prompt:'Extract the supplied table without inventing missing cells.',sources:[],market:[],assets:[{path:asset,sha256:digest,page:item.page}],expectedTable:item.expected,referenceOutput:{...empty(),table:item.expected},origin:{manifestHash:vision.hash,originalSha256:item.sha256}},'fixture');cases.push(c);
 }
 put('cases.json',cases,'cases');
 fs.writeFileSync(path.join(directory,'manifest.json'),JSON.stringify({version:1,id:'zhiheng-bootstrap',benchmarkVersion:'v5.0-bootstrap-1',frozenAt:'2026-09-11T00:00:00Z',files},null,2)+'\n',{flag:'wx'});
 return loadFrozenSuite(directory);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const target=process.argv[2]??fileURLToPath(new URL('../benchmark/fixtures/bootstrap-v1',import.meta.url));const suite=buildBenchmarkFixtures(target);console.log(JSON.stringify({cases:suite.cases.length,hash:suite.hash,qualityAccepted:false}));}
