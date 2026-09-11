import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {evaluateResearchComplexity as evaluate} from '../server/research-complexity.mjs';
import {modes} from '../shared/research-framework.mjs';
const fixtures=JSON.parse(fs.readFileSync(new URL('./fixtures/research-complexity-cases.json',import.meta.url)));
for(const fixture of fixtures)test('complexity V1 fixture: '+fixture.name,()=>{
 const result=evaluate(fixture.input);
 assert.equal(result.score,fixture.score);assert.equal(result.level,fixture.level);assert.deepEqual(result.reasons,fixture.reasons);
 assert.equal(result.version,1);assert.deepEqual(evaluate(JSON.parse(JSON.stringify(fixture.input))),result);
 assert.equal(result.score,result.reasons.reduce((n,r)=>n+r.points,0));
});

test('all current research modes are explicit, with no question or model inference',()=>{
 const points={A:0,B:8,C:8,D:16,E:12,F:12};assert.deepEqual(Object.keys(modes),Object.keys(points));
 for(const [mode,score] of Object.entries(points))assert.equal(evaluate({mode}).score,score);
 for(const input of [{mode:'auto'},{mode:'INVALID'},{question:'升级 Pro'},{model:'private-model'},{mode:3},{mode:new String('A')},{mode:{toString(){assert.fail('mode must not coerce objects');}}}])assert.throws(()=>evaluate(input),{code:'invalid_complexity_input'});
});

test('unknown signals remain unknown; explicit zero is not missing',()=>{
 const unknown=evaluate();assert.equal(unknown.score,0);assert.equal(unknown.level,'unknown');assert.equal(unknown.signals.companyCount,null);
 assert.equal(unknown.signals.runtime.reasoningFailureCount,null);assert.ok(unknown.unknownSignals.includes('companyCount'));
 const zero=evaluate({companyCount:0,markets:[],currencies:[],materials:{imageCount:0}});
 assert.equal(zero.level,'low');assert.equal(zero.signals.companyCount,0);assert.deepEqual(zero.signals.markets,[]);
 assert.ok(!zero.unknownSignals.includes('companyCount'));assert.equal(zero.signals.materials.pageCount,null);
 assert.deepEqual(evaluate({materials:null}),unknown);
 assert.equal(evaluate({runtime:{providerFailureCount:99}}).level,'unknown');
});

test('market and currency ordering, duplicates and record key order do not change results',()=>{
 const a=evaluate({mode:'D',markets:['hk','CN',' HK '],currencies:['hkd',' CNY ','HKD']});
 const b=evaluate({currencies:['CNY','HKD'],markets:['CN','HK'],mode:'D'});
 assert.deepEqual(a,b);assert.deepEqual(a.signals.currencies,['CNY','HKD']);
 assert.equal(evaluate({markets:['US']}).signals.currencies,null,'market never fabricates a currency');
});

test('scores stay bounded and level thresholds are exact',()=>{
 const maximal={mode:'D',companyCount:Number.MAX_SAFE_INTEGER,markets:['CN','HK','US'],currencies:['CNY','HKD','USD'],historyYears:100,
  materials:{documentCount:100,pageCount:10000,imageCount:100},valuation:{methodCount:100,scenarioCount:100},evidence:{conflictCount:100},runtime:{reasoningFailureCount:100},review:{reasoningFailureCount:100}};
 assert.equal(evaluate(maximal).score,100);
 for(const [input,score,level] of [
  [{mode:'D',companyCount:3},24,'low'],[{mode:'D',companyCount:3,runtime:{reasoningFailureCount:1}},25,'moderate'],
  [{mode:'D',companyCount:3,markets:['CN','HK'],currencies:['CNY','HKD'],historyYears:8,valuation:{methodCount:3}},49,'moderate'],
  [{mode:'D',companyCount:3,markets:['CN','HK'],currencies:['CNY','HKD'],historyYears:8,valuation:{methodCount:3},runtime:{reasoningFailureCount:1}},50,'high'],
 ]){const result=evaluate(input);assert.equal(result.score,score);assert.equal(result.level,level);}
});

test('missing data, provider outages and malformed review output never inflate score or reasoning failures',()=>{
 const base=evaluate({mode:'B'});
 const result=evaluate({mode:'B',evidence:{missingCount:999},runtime:{dataGapCount:999,providerFailureCount:999},review:{dataGapCount:999,formatFailureCount:999}});
 assert.equal(result.score,base.score);assert.equal(result.level,base.level);
 assert.equal(result.signals.runtime.reasoningFailureCount,null);assert.equal(result.signals.review.reasoningFailureCount,null);
 assert.equal(result.reasons.filter(r=>r.points===0).length,5);
 assert.equal(evaluate({mode:'B',evidence:{conflictCount:1}}).score,base.score+4);
});

test('normalized results own their data and calls do not mutate input or previous output',()=>{
 const input={mode:'D',markets:['HK','CN'],materials:{pageCount:50}};const before=structuredClone(input);
 Object.freeze(input.markets);Object.freeze(input.materials);Object.freeze(input);
 const first=evaluate(input),expected=structuredClone(first);
 first.signals.markets.push('US');first.reasons[0].points=999;first.unknownSignals.length=0;
 assert.deepEqual(evaluate(input),expected);assert.deepEqual(input,before);
});

test('invalid counts and non-JSON records fail without coercion or leaking values',()=>{
 for(const value of [-1,1.5,NaN,Infinity,'12',true,Number.MAX_SAFE_INTEGER+1])for(const input of [{companyCount:value},{materials:{pageCount:value}},{runtime:{reasoningFailureCount:value}}])assert.throws(()=>evaluate(input),{name:'TypeError',code:'invalid_complexity_input',message:'Invalid research complexity input'});
 for(const input of [null,[],new Date(),{materials:[]},{markets:['ZZ']},{currencies:['US']},{currencies:['private-secret']},{review:{message:'private-secret'}},{markets:Array(1)}])assert.throws(()=>evaluate(input),{code:'invalid_complexity_input'});
});

test('accessor and sparse signal inputs are rejected without executing callbacks',()=>{
 let calls=0;const getter=()=>{calls++;throw new Error('private');};
 for(const input of [Object.defineProperty({},'mode',{enumerable:true,get:getter}),{materials:Object.defineProperty({},'pageCount',{enumerable:true,get:getter})},{markets:Object.defineProperty(['CN'],'0',{enumerable:true,get:getter})}])assert.throws(()=>evaluate(input),{code:'invalid_complexity_input'});
 assert.equal(calls,0);
});

test('missing complexity signals cannot be supplied by inherited prototype fields',()=>{
 const inputs=[{}, {mode:'A',runtime:null,review:{}}, {companyCount:1,runtime:{reasoningFailureCount:0}}];
 const expected=inputs.map(evaluate),keys=['companyCount','reasoningFailureCount'];
 const saved=keys.map(key=>Object.getOwnPropertyDescriptor(Object.prototype,key));let actual;
 try{
  Object.defineProperty(Object.prototype,'companyCount',{value:4,writable:true,configurable:true});
  Object.defineProperty(Object.prototype,'reasoningFailureCount',{value:2,writable:true,configurable:true});
  actual=inputs.map(evaluate);
 }finally{keys.forEach((key,i)=>{if(saved[i])Object.defineProperty(Object.prototype,key,saved[i]);else delete Object.prototype[key];});}
 assert.deepEqual(actual,expected,'only caller-owned fields are observations; omitted nested groups stay unknown');
});

test('evaluator stays pure and only the authorized shadow policy consumes it',()=>{
 const root=new URL('../',import.meta.url),file='server/research-complexity.mjs';
 const source=fs.readFileSync(new URL(file,root),'utf8');
 assert.doesNotMatch(source,/\b(?:import|require|fetch|process|Date|setTimeout)\b|Math\.random|model-gateway/);
 const walk=directory=>fs.readdirSync(new URL(directory,root),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(directory+'/'+e.name):[directory+'/'+e.name]);
 for(const path of ['server','scripts','shared','src'].flatMap(walk).filter(p=>/\.(?:mjs|js|jsx)$/.test(p)&&p!==file&&p!=='server/model-policy.mjs')){
  const text=fs.readFileSync(new URL(path,root),'utf8');
  assert.doesNotMatch(text,/research-complexity\.mjs|evaluateResearchComplexity\s*\(/,'Only shadow policy may consume scoring: '+path);
 }
});
