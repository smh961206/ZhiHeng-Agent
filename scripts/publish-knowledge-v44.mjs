import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {backupKnowledge} from './backup-knowledge.mjs';

const root=fileURLToPath(new URL('../',import.meta.url)),release=join(root,'knowledge/versions/v4.4.0');
if(existsSync(join(release,'manifest.json')))throw new Error('V4.4 发布快照已存在，禁止覆盖');
const snapshot=backupKnowledge(root);
const saved=JSON.parse(readFileSync(join(snapshot.directory,'manifest.json'),'utf8'));
if(saved.version!=='4.4')throw new Error('当前知识库不是 V4.4');
const files=[];
for(const file of saved.files){
 const bytes=readFileSync(join(snapshot.directory,file.name)),target=join(release,file.name);
 mkdirSync(dirname(target),{recursive:true});writeFileSync(target,bytes,{flag:'wx'});
 if(!readFileSync(target).equals(bytes))throw new Error('发布文件写入校验失败');
 files.push({path:file.name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
}
const readme=readFileSync(join(release,'README.md'));
files.push({path:'README.md',bytes:readme.length,sha256:createHash('sha256').update(readme).digest('hex')});
writeFileSync(join(release,'manifest.json'),JSON.stringify({version:'4.4.0',createdAt:new Date().toISOString(),baseVersion:'4.3.0',contentChanged:false,snapshotId:snapshot.id,files},null,2)+'\n',{flag:'wx'});
console.log('V4.4.0 完整模块发布快照已保存并校验。');
