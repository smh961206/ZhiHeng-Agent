import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyModelTask,benchmarkTaskClass,modelTaskClasses} from '../server/model-task-class.mjs';
test('V5.0.9 classifies explicit task signals, preserves unknown and quick-screen cap',()=>{
 const inputs=[{mode:'A'},{mode:'B'},{mode:'B',documentPages:50},{mode:'E'},{purpose:'review'},{purpose:'vision'}];assert.deepEqual(inputs.map(classifyModelTask),modelTaskClasses);
 assert.equal(classifyModelTask({}),null);assert.equal(classifyModelTask({mode:'unknown'}),null);assert.equal(classifyModelTask({mode:'A',documentPages:900,toolWorkflow:true}),'quick_screen');
 assert.equal(classifyModelTask({mode:'B',missingData:999,providerFailures:999}),'financial_analysis');assert.equal(benchmarkTaskClass({category:'future'}),null);
});
