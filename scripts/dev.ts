import {spawn,type ChildProcess} from 'node:child_process';
import {spawnPython} from './python-runtime.ts';
let closing=false;
let backend:ChildProcess|undefined;
const frontend=spawn(process.execPath,['node_modules/vite/bin/vite.js'],{stdio:'inherit'});
function startBackend(){
 try{backend=spawnPython(['-m','uvicorn','python_backend.app:app','--host','127.0.0.1','--port','3001','--reload','--reload-dir','python_backend'],{stdio:'inherit',env:process.env});}
 catch(error){console.error(error instanceof Error?error.message:String(error));stop(1);return;}
 backend.on('error',()=>stop(1));
 backend.on('exit',code=>{if(!closing)stop(code??1);});
}
function stop(code=0){if(closing)return;closing=true;backend?.kill();frontend.kill();process.exit(code);}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
frontend.on('error',()=>stop(1));frontend.on('exit',code=>stop(code??1));
startBackend();
