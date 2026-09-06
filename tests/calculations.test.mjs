import test from 'node:test';
import assert from 'node:assert/strict';
import {p2,correction,dcf,dividend} from '../server/calculations.mjs';
import {route,validateInput} from '../server/router.mjs';
const verified={qualityVerified:true,basisVerified:true};
test('V4.1三个原文算例及修正边界',()=>{
 assert.equal(p2({...verified,pe:12.5,roe:.25}).ordinary,.5);
 assert.ok(Math.abs(p2({...verified,formula:'F2',pb:.96,roe:.1588}).ordinary-.380687657)<=.00001);
 assert.ok(Math.abs(p2({...verified,formula:'F3',pe:14.4,pb:2.49}).ordinary-.832771084)<.00001);
 for(const [d,n] of [[0,2],[.25,2],[.3,5/3],[.4,1.25],[.5,1],[1.2,1]])assert.ok(Math.abs(correction(d)-n)<1e-12);
 for(const d of [null,undefined,-1,'0.5',NaN])assert.equal(correction(d),null);
});
test('P2缺失、负ROE、异常ROE及行业修正保护',()=>{
 assert.equal(p2({pe:12,roe:.2}).status,'Data Insufficient');
 for(const roe of [-.2,0,undefined,25])assert.equal(p2({...verified,formula:'F2',roe,pb:1}).status,'Not Applicable');
 for(const sector of ['cycle','growth','buyback','index'])assert.equal(p2({...verified,pe:12.5,roe:.25,payout:.4,correctionVerified:true,sector}).adjusted,null);
 assert.equal(p2({...verified,pe:12.5,roe:.25,payout:.4,correctionVerified:true}).adjusted,.625);
 assert.equal(p2({...verified,pe:12.5,roe:.25,payout:undefined,correctionVerified:true}).adjusted,null);
});
test('DCF同现金流FCFF/FCFE桥接及折现率约束',()=>{
 const x={cashFlow:100,growth:0,discount:.1,terminalGrowth:0,years:5,shares:10};
 assert.ok(Math.abs(dcf({...x,kind:'FCFE'}).perShare-100)<1e-8);
 assert.ok(Math.abs(dcf({...x,kind:'FCFF',debt:200,cash:50,minority:20,investments:30}).perShare-86)<1e-8);
 assert.throws(()=>dcf({...x,kind:'FCFF'}),/必须明确/);
 assert.throws(()=>dcf({...x,kind:'FCFE',terminalGrowth:.1}),/参数无效/);
 assert.throws(()=>dcf({...x,kind:'FCFE',sector:'bank'}),/金融企业/);
 assert.equal(dividend({dps:2,yields:[.04]}).anchors[0].price,50);
 assert.throws(()=>dividend({dps:2,yields:[0]}));
});
test('六模式路由和不可信输入校验',()=>{
 for(const [question,expected] of [['快速初筛','A'],['投资价值','B'],['财报更新','C'],['比较两家','D'],['我的持仓','E'],['分红分析','F']])assert.equal(route({question}),expected);
 assert.equal(route({question:'比较',mode:'B'}),'B');
 assert.throws(()=>validateInput({question:''}));
 assert.throws(()=>validateInput({question:'test',mode:'X'}));
 assert.throws(()=>validateInput({question:'test',sources:[{title:'t',text:'x',url:'javascript:alert(1)'}]}));
});
