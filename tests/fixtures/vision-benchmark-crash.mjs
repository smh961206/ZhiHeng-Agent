// Crash only after the parent's own synthetic progress file has been renamed.
import fs from 'node:fs';
import path from 'node:path';
import {runVisionBenchmark} from '../../scripts/vision-benchmark.mjs';
const file=path.resolve(process.argv[2]),rename=fs.renameSync;
fs.renameSync=function(from,to){rename.call(this,from,to);if(to===file&&JSON.parse(fs.readFileSync(file)).progress.ledger.at(-1)?.status==='reserved')process.exit(73);};
await runVisionBenchmark({outputFile:file,render:async()=>[{page:1,dataUrl:'data:image/png;base64,AA=='}]});
