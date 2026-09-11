import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadVisionInventory,readSource,validateVisionInventory} from '../scripts/check-model-call-inventory.mjs';

test('V4.9.0 inventories four Vision paths under the existing single Gateway adapter',()=>{
 assert.deepEqual(validateVisionInventory(loadVisionInventory()),{visionCallers:4,visionWrapperConsumers:6,reviewedOwners:21});
});

test('Vision inventory rejects omitted callers and unmapped static or dynamic wrapper consumers',()=>{
 const inventory=loadVisionInventory(),missing=structuredClone(inventory);missing.callers.pop();
 assert.throws(()=>validateVisionInventory(missing),/semantic callers/);
 for(const extra of ["import {readVisionImages as read} from './vision-model.mjs';", "const module=await import('./vision-model.mjs');"]){
  const file='server/unmapped-vision.mjs';
  assert.throws(()=>validateVisionInventory(inventory,{files:[...inventory.wrapperConsumers,file],read:p=>p===file?extra:readSource(p)}),/unmapped Vision/);
 }
});

test('Vision inventory detects limit and trust-boundary source drift even when call counts stay fixed',()=>{
 for(const [file,before,after] of [
  ['server/model-gateway.mjs','images>12','images>13'],
  ['server/model-adapter.mjs','totalMs:60000','totalMs:120000'],
  ['server/visual-reading.mjs','needsReview:true','needsReview:false'],
  ['server/agent-page-reader.mjs','digest(bytes)!==originalHash','false'],
  ['server/model-config.mjs',"inputMode!=='off'","inputMode==='off'"],
 ])assert.throws(()=>validateVisionInventory(loadVisionInventory(),{read:p=>p===file?readSource(p).replace(before,after):readSource(p)}),/reviewed source changed/);
});

test('Updating a Vision source hash alone cannot hide stale limit, branch or evidence annotations',()=>{
 for(const group of ['limits','modelBranches','evidenceGuards']){
  const inventory=loadVisionInventory(),entry=inventory[group][0];
  const changed=readSource(entry.file).replace(entry.anchor,'inventory-drift');
  const owner=inventory.owners.find(owner=>owner.file===entry.file);
  owner[owner.currentSha256?'currentSha256':'sha256']=createHash('sha256').update(changed.replaceAll('\r\n','\n')).digest('hex');
  assert.throws(()=>validateVisionInventory(inventory,{read:p=>p===entry.file?changed:readSource(p)}),/anchor missing/);
 }
});

test('Vision inventory rejects unsafe owner paths and narrowed scan scope',()=>{
 for(const file of ['server/../server/vision-model.mjs','server//vision-model.mjs','../private.env']){
  const inventory=loadVisionInventory();inventory.owners[0].file=file;
  assert.throws(()=>validateVisionInventory(inventory,{read:p=>{assert.notEqual(p,file,'invalid path must not be read');return readSource(p);}}),/repository source path/);
 }
 const inventory=loadVisionInventory();inventory.scanRoots=['server'];
 assert.throws(()=>validateVisionInventory(inventory));
});

test('Vision review fingerprints normalize Windows line endings without changing historical inventory',()=>{
 assert.deepEqual(validateVisionInventory(loadVisionInventory(),{read:p=>readSource(p).replace(/\r?\n/g,'\r\n')}),{visionCallers:4,visionWrapperConsumers:6,reviewedOwners:21});
});
