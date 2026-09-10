import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,statSync,utimesSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {sourceFingerprint,watchDevelopmentSources} from '../scripts/dev-source-watch.mjs';

function fixture(t){
 const base=resolve(tmpdir()),root=mkdtempSync(join(base,'zhiheng-dev-watch-'));
 for(const directory of ['server','shared','node_modules','src'])mkdirSync(join(root,directory));
 writeFileSync(join(root,'server','index.mjs'),'export default 1;');
 t.after(()=>{assert.equal(dirname(root),base);rmSync(root,{recursive:true,force:true});});
 return root;
}

test('only backend source content changes invalidate the development fingerprint',t=>{
 const root=fixture(t),file=join(root,'server','index.mjs'),original=sourceFingerprint(root);
 for(const directory of ['node_modules','src'])writeFileSync(join(root,directory,'changed.js'),'changed');
 const stat=statSync(file);
 utimesSync(file,new Date(),new Date());
 assert.equal(sourceFingerprint(root),original,'dependencies, frontend and timestamps must not restart the API');
 writeFileSync(file,'export default 2;');
 utimesSync(file,stat.atime,stat.mtime);
 assert.notEqual(sourceFingerprint(root),original,'same-size changes with restored timestamps must be detected');
 const changed=sourceFingerprint(root);
 writeFileSync(join(root,'shared','new.mjs'),'export default true;');
 assert.notEqual(sourceFingerprint(root),changed,'new shared modules must be detected');
 rmSync(join(root,'shared','new.mjs'));
 assert.equal(sourceFingerprint(root),changed,'removed shared modules must be detected');
});

test('watcher ignores dependency writes, coalesces source saves and stops cleanly',async t=>{
 const root=fixture(t);let changes=0;
 const stop=watchDevelopmentSources(root,()=>changes++,{interval:20});t.after(stop);
 writeFileSync(join(root,'node_modules','dependency.mjs'),'export default 1;');
 await delay(100);assert.equal(changes,0);
 writeFileSync(join(root,'server','index.mjs'),'export default 2;');
 writeFileSync(join(root,'shared','rule.mjs'),'export default 3;');
 const deadline=Date.now()+3000;
 while(changes===0&&Date.now()<deadline)await delay(20);
 assert.equal(changes,1);
 await delay(100);assert.equal(changes,1);
 stop();writeFileSync(join(root,'server','index.mjs'),'export default 4;');
 await delay(100);assert.equal(changes,1);
});
