import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

test('manifest generation retains added files before and after staging and commit',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zhiheng-manifest-'));
 const git=(...args)=>execFileSync('git',args,{cwd:root,stdio:'pipe'});
 const entry=name=>{const bytes=fs.readFileSync(path.join(root,name));return {path:name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};};
 try{
  git('init');
  fs.mkdirSync(path.join(root,'scripts'));
  fs.copyFileSync(new URL('../scripts/update-manifest.mjs',import.meta.url),path.join(root,'scripts/update-manifest.mjs'));
  fs.writeFileSync(path.join(root,'baseline.txt'),'baseline\n');
  fs.writeFileSync(path.join(root,'MANIFEST.json'),JSON.stringify({fileCount:1,files:[entry('baseline.txt')]}));
  git('add','.');
  const commit=()=>git('-c','user.name=Manifest Test','-c','user.email=manifest@example.invalid','commit','-m','fixture','--no-gpg-sign');
  commit();
  const added='new file.txt';fs.writeFileSync(path.join(root,added),'new\n');
  const generate=()=>{execFileSync(process.execPath,['scripts/update-manifest.mjs'],{cwd:root,stdio:'pipe'});return JSON.parse(fs.readFileSync(path.join(root,'MANIFEST.json')));};
  const expected=generate();
  assert.deepEqual(expected.files,[entry('baseline.txt'),entry(added)]);
  assert.equal(expected.fileCount,2);
  git('add',added);
  assert.deepEqual(generate(),expected,'staging must not drop the added file');
  git('add','MANIFEST.json');commit();
  assert.deepEqual(generate(),expected,'committing must preserve the same manifest');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
