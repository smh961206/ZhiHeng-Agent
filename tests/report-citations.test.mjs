import test from 'node:test';
import assert from 'node:assert/strict';
import {remarkReportCitations} from '../src/lib/report-citations.mjs';

const text=value=>({type:'text',value});
const flatten=node=>node.value??node.children?.map(flatten).join('')??'';
test('citations preserve original text and only navigate to existing evidence',()=>{
 const original='现金流[S1]；对照[S1, S2、Q1]。缺失[S999]，混合[S1；S999]。';
 const tree={type:'root',children:[{type:'paragraph',children:[text(original)]}]};
 remarkReportCitations({sourceIds:['S1','S2','Q1'],prefix:'job-report'})(tree);
 assert.equal(flatten(tree),original);
 const links=tree.children[0].children.filter(node=>node.type==='link');
 assert.deepEqual(links.map(node=>node.data.hProperties['data-evidence-id']),['S1','S1','S2','Q1','S1']);
 assert.equal(new Set(links.map(node=>node.data.hProperties.id)).size,5);
 assert.ok(links.every(node=>node.url==='#'+node.data.hProperties.id));
});
test('code and existing links retain their semantics; missing source lists leave text unchanged',()=>{
 const protectedNodes=[{type:'code',value:'[S1]'},{type:'inlineCode',value:'[S1]'},{type:'link',url:'https://example.invalid',children:[text('[S1]')]},{type:'linkReference',identifier:'S1',children:[text('[S1]')]}];
 const tree={type:'root',children:structuredClone(protectedNodes)};
 remarkReportCitations({sourceIds:['S1']})(tree);
 assert.deepEqual(tree.children,protectedNodes);
 const plain={type:'root',children:[text('尚未取得来源[S1]')]},before=structuredClone(plain);
 remarkReportCitations()(plain);assert.deepEqual(plain,before);
});
test('newly available sources do not change an existing citation return anchor',()=>{
 const original={type:'root',children:[{type:'paragraph',children:[{...text('补证[S2]，已读[S1]'),position:{start:{offset:25}}}]}]};
 const before=structuredClone(original),after=structuredClone(original);
 remarkReportCitations({sourceIds:['S1']})(before);
 remarkReportCitations({sourceIds:['S1','S2']})(after);
 const anchor=tree=>tree.children[0].children.find(node=>node.data?.hProperties['data-evidence-id']==='S1').data.hProperties.id;
 assert.equal(anchor(before),anchor(after));
});
