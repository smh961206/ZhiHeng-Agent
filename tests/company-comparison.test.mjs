import test from 'node:test';
import assert from 'node:assert/strict';
import {compareCompanies} from '../server/company-comparison.mjs';
import {createResearchPlan,resolveMode} from '../shared/research-framework.mjs';
import {comparisonReadiness,comparisonProgress} from '../shared/company-comparison.mjs';
import {validateInput} from '../server/router.mjs';
import {reviewFixture} from './fixtures/research-review.mjs';
import {validateReview} from '../server/research-output.mjs';
import {runAgent,toolsForMode} from '../server/agent.mjs';
const securities=['002594','601633','601127'].map(symbol=>({market:'CN',symbol}));
const sources=securities.flatMap((company,i)=>[{id:'S'+(i+1),security:'CN:'+company.symbol,type:'official-report',official:true,text:'合成财务比较测试，营业收入和现金流仅作调用验证。'},
 {id:'Q'+(i+1),security:'CN:'+company.symbol,type:'quote',currency:'CNY',asOf:'2026-09-04',text:'合成价格，非真实行情'}]);
const period={start:'2026-01-01',end:'2026-06-30',kind:'cumulative'};
function fixture(){return {period,companies:securities.map((s,i)=>({security:'CN:'+s.symbol,group:'合成汽车制造组',sector:'non-financial',amountUnit:'人民币亿元',roeBasis:'加权平均归母ROE',
 basis:{currency:'CNY',period:'2026 H1及共同历史年度',shareBasis:'A股普通股',assumptions:'合成数据，仅作测试',sourceIds:['S'+(i+1),'Q'+(i+1)]},
 periods:[...Array.from({length:5},(_,j)=>({start:(2021+j)+'-01-01',end:(2021+j)+'-12-31',kind:'annual',roe:.1+j*.01,sourceIds:['S'+(i+1)]})),
 {...period,sourceIds:['S'+(i+1)],revenue:100*(i+1),netIncome:i===2?-10:10,grossProfit:20,ocf:i===2?-30:30,capex:20,roe:.04}],balances:[],
 quote:{currency:'CNY',asOf:'2026-09-04',price:10+i,sourceIds:['Q'+(i+1)]}}))};}
const options={sources,securities};
const input={question:'比亚迪 长城汽车 赛力斯比较',mode:'D',securities,sources};

test('comparison routing and submission require distinct companies while explicit modes prevail',()=>{
 assert.equal(resolveMode({question:input.question}),'D');assert.equal(resolveMode({question:'比较三家最新财报'}),'D');assert.equal(resolveMode({question:'BYD vs GWM'}),'D');assert.equal(resolveMode({question:input.question,mode:'B'}),'B');
 assert.throws(()=>validateInput({...input,securities:securities.slice(0,1)}),/至少需要2/);
 assert.equal(comparisonReadiness([securities[0],securities[0]]).ready,false);assert.equal(comparisonReadiness(securities).ready,true);
 const plan=createResearchPlan(input);assert.equal(plan.output.sections.length,7);assert.match(plan.constraints.join(' '),/三年与五年不能直接比较/);
 assert.ok(toolsForMode('D').some(t=>t.function.name==='calculate_comparison'));assert.ok(!toolsForMode('B').some(t=>t.function.name==='calculate_comparison'));
});
test('each company is calculated independently and comparable fields retain negative values',()=>{
 const result=compareCompanies(fixture(),options);assert.equal(result.companies.length,3);assert.ok(result.checks.every(c=>c.comparable));
 assert.equal(result.matrix.find(r=>r.metric==='netIncome').values[2].value,-10);assert.equal(result.companies[2].current.ocfToNetIncome,null);
 assert.equal(result.companies[0].roe.count,5);assert.equal(result.rankings,undefined);assert.equal(result.companies[0].basis.sourceIds.includes('S2'),false);
 assert.deepEqual(result.basis.sourceIds,['S1','Q1','S2','Q2','S3','Q3']);
});
test('wrong periods, missing fields, currencies, units and ROE windows block only relevant comparisons',()=>{
 let args=fixture();args.companies[2].periods.pop();let result=compareCompanies(args,options);
 assert.equal(result.companies[2].current,null);assert.equal(result.checks.find(c=>c.id==='period').comparable,false);assert.ok(result.matrix.every(r=>!r.comparable));
 args=fixture();args.companies[1].periods.at(-1).netIncome=null;result=compareCompanies(args,options);assert.equal(result.matrix.find(r=>r.metric==='netIncome').comparable,false);assert.equal(result.matrix.find(r=>r.metric==='revenue').comparable,true);
 args=fixture();args.companies[2].amountUnit='人民币元';result=compareCompanies(args,options);assert.equal(result.checks.find(c=>c.id==='amounts').comparable,false);assert.equal(result.checks.find(c=>c.id==='ratios').comparable,true);
 args=fixture();args.companies[2].periods.splice(0,2);result=compareCompanies(args,options);assert.equal(result.companies[2].roe.count,3);assert.equal(result.checks.find(c=>c.id==='roeHistory').comparable,false);
 args=fixture();args.companies[1].basis.currency='USD';args.companies[1].basis.sourceIds=['S2'];delete args.companies[1].quote;result=compareCompanies(args,options);assert.equal(result.checks.find(c=>c.id==='amounts').comparable,false);assert.equal(result.checks.find(c=>c.id==='prices').comparable,false);
});
test('company provenance, quote dates and duplicated identities cannot be relabelled for comparison',()=>{
 for(const mutate of [a=>a.companies[0].basis.sourceIds.push('S2'),a=>a.companies[0].security=a.companies[1].security,a=>a.companies.pop(),a=>a.companies[0].quote.asOf='2026-09-03',a=>a.companies[0].quote.sourceIds=['Q2']]){
  const args=fixture();mutate(args);assert.throws(()=>compareCompanies(args,options));
 }
 const ocrSources=structuredClone(sources);ocrSources[0].documentBlocks=[{id:'p1-b1',method:'ocr',needsReview:true,text:'识别数字'}];
 const args=fixture();args.companies[0].basis.evidenceBlocks=[{sourceId:'S1',blockId:'p1-b1'}];assert.throws(()=>compareCompanies(args,{...options,sources:ocrSources}),/OCR/);
});
test('review preserves distinct company decisions and rejects missing companies and swapped evidence',()=>{
 const plan=createResearchPlan(input),review=reviewFixture(input);
 review.comparisonDecisions.forEach((row,i)=>{row.sourceIds=['S'+(i+1)];row.summary='合成依据，仅作比较验证。';});
 review.comparisonDecisions[1].action='深度研究';
 const result=validateReview(review,{input,plan,sources});assert.equal(result.comparisonDecisions[1].action,'深度研究');assert.match(result.report,/逐家公司研究判断/);
 for(const mutate of [r=>r.comparisonDecisions.pop(),r=>r.comparisonDecisions[0].sourceIds=['S2'],r=>r.comparisonDecisions[1].security=r.comparisonDecisions[0].security,r=>r.comparisonDecisions[0].falsifiers=[]]){
  const bad=structuredClone(review);mutate(bad);assert.throws(()=>validateReview(bad,{input,plan,sources}));
 }
 const legacy={...plan,contractVersion:5},old=structuredClone(review);delete old.comparisonDecisions;delete old.researchSummary;
 assert.equal(validateReview(old,{input,plan:legacy,sources}).comparisonDecisions,undefined);
});
test('MODE D executes comparison tools and audits per-company conclusions with synthetic model responses',async()=>{
 const old=global.fetch,events=[];let count=0;
 global.fetch=async(_url,options)=>{
  const payload=JSON.parse(options.body);assert.match(payload.messages[0].content,/MODE D 多公司比较/);
  const step=count++;
  if(step<2){const calls=step===0?sources.filter(s=>s.type==='official-report').map((s,i)=>({id:'s'+i,type:'function',function:{name:'search_evidence',arguments:JSON.stringify({sourceId:s.id,query:'合成财务'})}})):[{id:'compare',type:'function',function:{name:'calculate_comparison',arguments:JSON.stringify(fixture())}}];return Response.json({choices:[{message:{role:'assistant',tool_calls:calls}}]});}
  return Response.json({choices:[{message:{role:'assistant',content:step===2?'合成比较草稿，资料不足。[S1] [S2] [S3]':JSON.stringify(reviewFixture(input))}}]});
 };
 try{
  const job={mode:'D',input:structuredClone(input)},result=await runAgent(job,(type,message,data)=>events.push({type,message,...data}),new AbortController().signal,{collectData:async()=>({sources:structuredClone(sources),coverage:securities.map(s=>({security:'CN:'+s.symbol,read:1})),warnings:[]})});
  const returned=events.find(e=>e.type==='tool_result'&&e.toolName==='calculate_comparison');assert.equal(returned.result.error,undefined);assert.equal(returned.result.companies.length,3);assert.equal(result.comparisonDecisions.length,3);assert.equal(result.researchSummary.checks.length,3);
  assert.equal(comparisonProgress({...job,status:'completed'},true).title,'多公司比较已完成');
 }finally{global.fetch=old;}
});
