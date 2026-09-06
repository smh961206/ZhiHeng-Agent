import { spawn } from 'node:child_process';
const processes = [spawn(process.execPath, ['--env-file-if-exists=.env', '--watch', 'server/index.mjs'], {stdio:'inherit'}), spawn(process.execPath, ['node_modules/vite/bin/vite.js'], {stdio:'inherit'})];
let closing=false;
function stop(code=0){if(closing)return;closing=true;for(const p of processes)p.kill();process.exit(code);}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
for(const p of processes){p.on('error',()=>stop(1));p.on('exit',code=>stop(code??1));}
