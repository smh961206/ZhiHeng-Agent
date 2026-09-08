import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {backupKnowledge,watchKnowledge} from '../scripts/backup-knowledge.mjs';

const document=(version,body='原始内容')=>Buffer.from(`---\r\nmetadata:\r\n  version: "${version}"\r\n---\r\n${body}\r\n`);
function fixture(t){
 const root=mkdtempSync(join(tmpdir(),'zhiheng-knowledge-backup-'));
 mkdirSync(join(root,'knowledge'));
 writeFileSync(join(root,'knowledge','CORE.md'),document('4.2-core'));
 writeFileSync(join(root,'knowledge','FULL.md'),document('4.2'));
 t.after(()=>rmSync(root,{recursive:true,force:true}));
 return root;
}

test('snapshots retain exact bytes, deduplicate pairs and preserve same-version revisions',t=>{
 const root=fixture(t),first=backupKnowledge(root);
 assert.equal(first.created,true);assert.equal(backupKnowledge(root).created,false);
 const manifest=JSON.parse(readFileSync(join(first.directory,'manifest.json')));
 assert.equal(manifest.version,'4.2');assert.equal(manifest.files.length,2);
 assert.deepEqual(readFileSync(join(first.directory,'CORE.md')),document('4.2-core'));
 writeFileSync(join(root,'knowledge','FULL.md'),document('4.2','同版本修订'));
 const next=backupKnowledge(root);assert.notEqual(next.directory,first.directory);
 assert.deepEqual(readFileSync(join(first.directory,'FULL.md')),document('4.2'));
 writeFileSync(join(root,'knowledge','CORE.md'),document('4.3-core'));
 assert.equal(JSON.parse(readFileSync(join(backupKnowledge(root).directory,'manifest.json'))).version,'mixed');
 writeFileSync(join(root,'knowledge','FULL.md'),document('4.3'));
 assert.equal(JSON.parse(readFileSync(join(backupKnowledge(root).directory,'manifest.json'))).version,'4.3');
});

test('corrupted existing archives and incomplete input fail without overwriting retained files',t=>{
 const root=fixture(t),first=backupKnowledge(root);
 writeFileSync(join(first.directory,'CORE.md'),'corrupted');
 assert.throws(()=>backupKnowledge(root),/校验失败/);
 assert.equal(readFileSync(join(first.directory,'CORE.md'),'utf8'),'corrupted');
 writeFileSync(join(root,'knowledge','FULL.md'),'');
 assert.throws(()=>backupKnowledge(root),/为空/);
 assert.equal(readdirSync(join(root,'knowledge','versions','auto','4.2')).length,1);
});

test('watching archives edits and retries a temporarily empty file without publishing it',async t=>{
 const root=fixture(t);backupKnowledge(root);
 const backups=[],errors=[];
 const stop=watchKnowledge(root,{delay:30,onBackup:value=>backups.push(value),onError:error=>errors.push(error)});
 t.after(stop);
 const until=async predicate=>{const deadline=Date.now()+6000;while(!predicate()){if(Date.now()>deadline)assert.fail('Watcher did not settle');await new Promise(resolve=>setTimeout(resolve,50));}};
 writeFileSync(join(root,'knowledge','CORE.md'),'');
 await until(()=>errors.length>0);assert.equal(backups.length,0);
 writeFileSync(join(root,'knowledge','CORE.md'),document('4.2-core','自动检测的新内容'));
 await until(()=>backups.some(value=>value.created));
 const saved=backups.find(value=>value.created);
 assert.deepEqual(readFileSync(join(saved.directory,'CORE.md')),document('4.2-core','自动检测的新内容'));
 assert.deepEqual(readFileSync(join(saved.directory,'FULL.md')),document('4.2'));
 stop();
});

test('modular snapshots cover every module, detect edits and recover interrupted publication',t=>{
 const root=fixture(t),directory=join(root,'knowledge'),modulePath='modules/full/07-valuation.md';
 writeFileSync(join(directory,'CORE.md'),document('4.4-core'));
 writeFileSync(join(directory,'FULL.md'),document('4.4'));
 mkdirSync(join(directory,'modules/full'),{recursive:true});
 let text='原文估值规则\r\n';
 const update=()=>{
  writeFileSync(join(directory,modulePath),text);
  writeFileSync(join(directory,'modules.json'),JSON.stringify({version:'4.4',modules:[{path:'knowledge/'+modulePath,sha256:createHash('sha256').update(text).digest('hex')}]}));
 };
 update();const first=backupKnowledge(root);
 assert.equal(JSON.parse(readFileSync(join(first.directory,'manifest.json'))).files.length,4);
 assert.equal(readFileSync(join(first.directory,modulePath),'utf8'),text);
 assert.equal(backupKnowledge(root).created,false);
 writeFileSync(join(directory,modulePath),'未更新目录');assert.throws(()=>backupKnowledge(root),/目录校验不一致/);
 text='新的同版本模块内容';update();const second=backupKnowledge(root);
 assert.notEqual(first.id,second.id);
 assert.equal(readFileSync(join(first.directory,modulePath),'utf8'),'原文估值规则\r\n');
 // A missing commit marker models a crash before publication, not an archive.
 rmSync(join(second.directory,'manifest.json'));
 assert.equal(backupKnowledge(root).created,true);
 assert.equal(backupKnowledge(root).created,false);
});

test('single-entry snapshots need no CORE/FULL files and include all canonical modules',t=>{
 const root=fixture(t),dir=join(root,'knowledge');
 for(const name of ['CORE.md','FULL.md'])rmSync(join(dir,name));
 writeFileSync(join(dir,'ENTRY.md'),document('4.5'));
 mkdirSync(join(dir,'modules/rules'),{recursive:true});
 const path='modules/rules/07-valuation.md',text='唯一估值规则';
 writeFileSync(join(dir,path),text);
 writeFileSync(join(dir,'modules.json'),JSON.stringify({schemaVersion:2,entry:'knowledge/ENTRY.md',version:'4.5',modules:[{path:'knowledge/'+path,sha256:createHash('sha256').update(text).digest('hex')}]}));
 const saved=backupKnowledge(root),manifest=JSON.parse(readFileSync(join(saved.directory,'manifest.json')));
 assert.equal(manifest.version,'4.5');assert.deepEqual(manifest.files.map(f=>f.name),['ENTRY.md','modules.json',path]);
 assert.equal(readFileSync(join(saved.directory,path),'utf8'),text);assert.equal(backupKnowledge(root).created,false);
});
