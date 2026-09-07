import test from 'node:test';
import assert from 'node:assert/strict';
import {findMaterialMatches,materialSearchLimit} from '../src/lib/material-search.mjs';

test('search treats punctuation literally and keeps offsets in the original Unicode text',()=>{
 const text='现金流 A+B 🧾 a+b [现金流]';
 assert.deepEqual(findMaterialMatches(text,'a+b').matches.map(match=>text.slice(match.start,match.end)),['A+B','a+b']);
 assert.equal(findMaterialMatches(text,'[现金流]').matches.length,1);
 assert.equal(findMaterialMatches(text,'🧾').matches[0].end-findMaterialMatches(text,'🧾').matches[0].start,2);
 assert.equal(findMaterialMatches('KKk','k').matches.length,3);
 assert.deepEqual(findMaterialMatches(text,'  '),{matches:[],truncated:false});
 assert.deepEqual(findMaterialMatches(text,'未出现'),{matches:[],truncated:false});
});
test('search bounds highlighting without truncating or modifying the source',()=>{
 const text='现金流 '.repeat(materialSearchLimit+1),result=findMaterialMatches(text,'现金流');
 assert.equal(result.matches.length,500);assert.equal(result.truncated,true);assert.equal(text.length,2004);
 assert.equal(findMaterialMatches('x'.repeat(500),'x').truncated,false);
});
