import test from 'node:test';
import assert from 'node:assert/strict';
import {composerDraft,loadComposerDraft,saveComposerDraft,clearComposerDraft} from '../src/lib/composer-draft.mjs';
import {api} from '../src/lib/api.js';
const storage=()=>{const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key),data};};

test('composer restores inputs and pending material text, but never execution results or verified-source flags',()=>{
 const store=storage();const value={question:'合成研究',mode:'B',depth:'Deep',manual:true,securities:[{market:'HK',symbol:'00700'}],portfolioContext:{holdings:'合成持仓',riskTolerance:'合成期限'},materialDraft:'未加入的文字',referenceMaterials:[{title:'合成材料',text:'待核实资料',official:true}],sources:[{id:'S99'}],result:{report:'不应恢复为报告'}};
 assert.equal(saveComposerDraft(value,store),true);const restored=loadComposerDraft(store);
 assert.equal(restored.materialDraft,value.materialDraft);assert.deepEqual(restored.portfolioContext,value.portfolioContext);assert.equal(restored.referenceMaterials[0].official,undefined);
 assert.equal(restored.result,undefined);assert.equal(restored.sources,undefined);assert.equal(restored.manual,true);
 clearComposerDraft(store);assert.equal(loadComposerDraft(store),null);
});

test('empty, expired or malformed drafts do not restore, storage errors are contained',()=>{
 const store=storage();saveComposerDraft({question:'测试'},store);assert.equal(saveComposerDraft({},store),false);assert.equal(loadComposerDraft(store),null);
 store.setItem('zhiheng:composer:v1','{broken');assert.equal(loadComposerDraft(store),null);
 store.setItem('zhiheng:composer:v1',JSON.stringify({version:1,savedAt:Date.now()-2*86400000,input:{question:'过期'}}));assert.equal(loadComposerDraft(store),null);
 assert.equal(loadComposerDraft({getItem(){throw new Error('denied');}}),null);
 assert.throws(()=>composerDraft({materialDraft:'x'.repeat(20001)}),/超限/);
});

test('API errors are readable and never replay task creation after an ambiguous network failure',async()=>{
 const original=global.fetch;let count=0;
 try{
  global.fetch=async()=>{count++;throw new TypeError('fetch failed');};await assert.rejects(api('/api/jobs',{method:'POST'}),/研究记录确认状态/);assert.equal(count,1);
  global.fetch=async()=>new Response('<html>gateway error</html>',{status:502});await assert.rejects(api('/api/jobs'),error=>error.status===502&&/服务暂不可用/.test(error.message)&&!error.message.includes('html'));
  global.fetch=async()=>Response.json({error:'标的存在歧义'},{status:400});await assert.rejects(api('/api/jobs'),/标的存在歧义/);
  const control=new AbortController();control.abort();global.fetch=async()=>{throw control.signal.reason;};await assert.rejects(api('/api/jobs',{signal:control.signal}),error=>error.name==='AbortError');
 }finally{global.fetch=original;}
});

test('material titles and unsaved edits restore without overwriting the saved material',()=>{
 const store=storage(),referenceMaterials=[{title:'原始资料',text:'原始内容'}];
 const materialEditDraft={index:0,originalTitle:'原始资料',originalText:'原始内容',title:'修改的名称',text:'尚未保存的内容',official:true};
 saveComposerDraft({materialDraftTitle:'尚未粘贴正文的资料名',referenceMaterials,materialEditDraft},store);
 const restored=loadComposerDraft(store);
 assert.equal(restored.materialDraftTitle,'尚未粘贴正文的资料名');assert.equal(restored.materialEditDraft.text,'尚未保存的内容');assert.equal(restored.materialEditDraft.official,undefined);
 assert.equal(restored.referenceMaterials[0].text,'原始内容');assert.equal(restored.referenceMaterials[0].verified,false);
 assert.equal(composerDraft({referenceMaterials,materialEditDraft:{...materialEditDraft,originalText:'其他内容'}}).materialEditDraft,null);
 assert.equal(composerDraft({referenceMaterials,materialEditDraft:{...materialEditDraft,index:1}}).materialEditDraft,null);
 assert.equal(composerDraft({referenceMaterials,materialEditDraft:{...materialEditDraft,text:''}}).materialEditDraft.text,'');
 assert.throws(()=>composerDraft({referenceMaterials,materialEditDraft:{...materialEditDraft,text:'x'.repeat(60001)}}),/超限/);
 clearComposerDraft(store);assert.equal(loadComposerDraft(store),null);
});
