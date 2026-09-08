import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {bodyFilter} from '../shared/knowledge-search.mjs';
import {indexRules} from '../shared/knowledge-index.mjs';

const path=new URL('../knowledge/modules.json',import.meta.url);
const catalog=JSON.parse(readFileSync(path,'utf8'));
const originalLines={core:1,full:1,rules:1};
for(const module of catalog.modules){
 if(!/^knowledge\/modules\/(core|full|rules)\/[a-z0-9-]+\.md$/.test(module.path))throw new Error('非法规则模块路径');
 const text=readFileSync(new URL('../'+module.path,import.meta.url),'utf8');
 module.bytes=Buffer.byteLength(text);
 module.sha256=createHash('sha256').update(text).digest('hex');
 module.originalLine=originalLines[module.source];
 originalLines[module.source]+=(text.match(/\n/g)||[]).length;
 module.sections=indexRules(text,module.path).map(({content,source,...section})=>section);
 module.bodyFilter=bodyFilter(text);
}
writeFileSync(path,JSON.stringify(catalog,null,2)+'\n');
console.log(`已更新 ${catalog.modules.length} 个模块的目录、校验值与检索索引。`);
