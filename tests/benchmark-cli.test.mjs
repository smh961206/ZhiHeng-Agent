import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {parseBenchmarkArgs,benchmarkCLI} from '../scripts/benchmark.mjs';

test('V5.0 benchmark CLI preserves explicit valid offline and paid execution choices',()=>{
 assert.deepEqual(parseBenchmarkArgs(['--out','result with spaces','--kind','vision','--repeats','2','--resume']),{'--out':'result with spaces','--kind':'vision','--repeats':'2','--resume':true});
 assert.equal(parseBenchmarkArgs(['--out','result','--live','--allow-paid','--limits','budget.json'])['--live'],true);
});

test('V5.0 benchmark CLI rejects ambiguous options before writing or dispatching',async t=>{
 const directory=path.join(os.tmpdir(),'zh-cli-'+crypto.randomUUID());
 t.after(()=>{assert.equal(fs.existsSync(directory),false,'invalid arguments must not create a run');});
 for(const args of [
  ['--unknown'],['--resume','--resume'],['--kind','text','--kind','vision'],['--out','another'],
  ['--repeats'],['--kind','--resume'],['--kind',''],['--kind','other'],['--repeats','0'],['--repeats','21'],['--repeats','1.5'],
  ['--live','false','--allow-paid','--limits','unused.json'],['--allow-paid'],['--limits','unused.json'],['--live'],['--live','--allow-paid'],['--live','--limits','unused.json'],
 ])await assert.rejects(benchmarkCLI(['--out',directory,...args]),/benchmark|require|Live|Paid/i);
});
