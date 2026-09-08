import test from 'node:test';
import assert from 'node:assert/strict';
import {dcf,dividend} from '../server/calculations.mjs';
import {route,validateInput} from '../server/router.mjs';
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
