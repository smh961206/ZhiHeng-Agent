import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {setImmediate as nextTick} from 'node:timers/promises';
import {runAgent} from '../server/agent.mjs';
import {createPathResolver} from '../server/research-path.mjs';
import {createSecurityIntentExtractor} from '../server/security-intent.mjs';
import {readVisionImages} from '../server/vision-model.mjs';
import {configureModelTelemetry,withModelCallContext} from '../server/model-telemetry.mjs';
import {migrationScenario} from './fixtures/model-migration-scenario.mjs';
import {routerVisionScenario} from './fixtures/router-vision-migration-scenario.mjs';

const read=name=>JSON.parse(fs.readFileSync(new URL('./fixtures/'+name,import.meta.url))).cases;
async function recorded(jobId,run){
 const records=[];
 configureModelTelemetry(async record=>{await nextTick();records.push(record);});
 try{
  const result=await withModelCallContext(jobId,run);
  assert.ok(records.length>0);assert.equal(records.length%2,0);
  for(let i=0;i<records.length;i+=2){
   assert.equal(records[i].status,'started');assert.equal(records[i+1].status,'succeeded');
   assert.equal(records[i].id,records[i+1].id);assert.equal(records[i+1].jobId,jobId);
   assert.ok(records[i+1].purpose);assert.ok(records[i+1].profile);
  }
  assert.doesNotMatch(JSON.stringify(records),/golden-private-reasoning|golden-synthetic-key|messages|reasoning_content/);
  return result;
 }finally{configureModelTelemetry(undefined);}
}
for(const expected of read('model-migration-baseline.json'))test('async telemetry preserves pinned research wire/delivery/events/checkpoints: '+expected.mode,async()=>{
 assert.deepEqual(await recorded('gateway-golden-'+expected.mode,()=>migrationScenario(runAgent,expected.mode)),expected);
});
for(const expected of read('router-vision-migration-baseline.json'))test('async telemetry preserves pinned router/Vision wire/results/cache: '+expected.name,async()=>{
 assert.deepEqual(await recorded(null,()=>routerVisionScenario({createPathResolver,createSecurityIntentExtractor,readVisionImages},expected.name)),expected);
});
