import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {sha256} from '../../benchmark/fixtures.mjs';
export function temporaryBenchmark(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zh-benchmark-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const directory=path.join(root,'suite');fs.mkdirSync(directory);
 const fact={id:'revenue',value:null,period:'FY2024',currency:'USD',unit:'million',shareBasis:null,accountingScope:'consolidated',valuationBasis:null,sourceId:'S1',blockId:'B1',kind:'observation'};
 const citation={sourceId:'S1',blockId:'B1',quote:'not reported'};
 const c={version:1,id:'C1',category:'missing_conflict',fixture:'F1',fixtureVersion:'v1',cutoff:'2025-01-01T00:00:00Z',qualityCriticality:'critical',requiredCapabilities:['textInput'],expectedFacts:[fact],expectedCitations:[citation],expectedToolBehavior:[],requiredValidations:['delivery'],forbiddenBehaviors:['missing_as_zero']};
 const fixture={version:1,id:'F1',fixtureVersion:'v1',sources:[{id:'S1',publishedAt:'2024-12-01T00:00:00Z',blocks:[{id:'B1',text:'Revenue: not reported'}]}],market:[],assets:[]};
 const files=[['cases.json',[c],'cases'],['fixture.json',fixture,'fixture']].map(([name,data,kind])=>{const bytes=JSON.stringify(data);fs.writeFileSync(path.join(directory,name),bytes);return {path:name,kind,sha256:sha256(bytes)};});
 fs.writeFileSync(path.join(directory,'manifest.json'),JSON.stringify({version:1,id:'test',benchmarkVersion:'v1',frozenAt:'2025-01-02T00:00:00Z',files}));
 return {root,suiteDirectory:directory,directory:path.join(root,'run'),case:c,fixture,output:{facts:[fact],citations:[citation],tools:[],validations:[{id:'delivery',passed:true}],counterEvidence:[],violations:[],delivered:true}};
}
