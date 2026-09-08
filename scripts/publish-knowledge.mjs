// Publish the current single-entry ruleset without replacing any prior release.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {backupKnowledge} from './backup-knowledge.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const catalog=JSON.parse(readFileSync(join(root,'knowledge/modules.json'),'utf8'));
if(catalog.schemaVersion!==2||!/^\d+\.\d+$/.test(catalog.version))throw new Error('发布需要单一规则目录与主次版本号');
const version=catalog.version+'.0',release=join(root,'knowledge/versions/v'+version);
if(existsSync(join(release,'manifest.json')))throw new Error('发布快照已存在，禁止覆盖');
const readme=readFileSync(join(release,'README.md'));
const snapshot=backupKnowledge(root),saved=JSON.parse(readFileSync(join(snapshot.directory,'manifest.json'),'utf8'));
if(saved.version!==catalog.version)throw new Error('当前快照版本不一致');
const files=[];
function save(name,bytes){
 const target=join(release,name);mkdirSync(dirname(target),{recursive:true});
 writeFileSync(target,bytes,{flag:'wx'});
 if(!readFileSync(target).equals(bytes))throw new Error('发布写入校验失败');
 files.push({path:name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
}
for(const file of saved.files)save(file.name,readFileSync(join(snapshot.directory,file.name)));
if(catalog.version==='4.5')save('deduplication-v45.json',readFileSync(join(root,'knowledge/deduplication-v45.json')));
files.push({path:'README.md',bytes:readme.length,sha256:createHash('sha256').update(readme).digest('hex')});
writeFileSync(join(release,'manifest.json'),JSON.stringify({version,createdAt:new Date().toISOString(),baseVersion:catalog.baseVersion,businessMethodsChanged:false,editorialDeduplication:catalog.version==='4.5',snapshotId:snapshot.id,files},null,2)+'\n',{flag:'wx'});
console.log('已保存并校验 V'+version+' 单一规则发布快照。');
