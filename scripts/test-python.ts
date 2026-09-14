import {spawnPython} from './python-runtime.ts';
import type {ChildProcess} from 'node:child_process';

let child:ChildProcess;
try{child=spawnPython(['-m','pytest','-p','no:cacheprovider','python_tests'],{stdio:'inherit',env:process.env});}
catch(error){console.error(error instanceof Error?error.message:String(error));process.exit(1);}
child.on('exit',code=>{process.exitCode=code??1;});
