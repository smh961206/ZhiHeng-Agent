import { spawn } from 'node:child_process';
import {watchKnowledge} from './backup-knowledge.mjs';
import {snapshotManager} from '../server/knowledge-snapshots.mjs';
const reportBackup=result=>{if(result.created)console.log(`[SKILL] 已备份知识库：${result.directory}`);};
snapshotManager.current();
if(snapshotManager.status().updatePending)console.warn('[知识库] 当前修订尚未通过校验，使用最近一份有效快照启动。');
let backupError='';
const stopBackup=watchKnowledge(undefined,{onBackup:result=>{backupError='';reportBackup(result);},onError:error=>{if(error.message!==backupError)console.error('[SKILL] '+error.message);backupError=error.message;}});
const processes = [spawn(process.execPath, ['--env-file-if-exists=.env', '--watch', 'server/index.mjs'], {stdio:'inherit'}), spawn(process.execPath, ['node_modules/vite/bin/vite.js'], {stdio:'inherit'})];
let closing=false;
function stop(code=0){if(closing)return;closing=true;stopBackup();for(const p of processes)p.kill();process.exit(code);}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
for(const p of processes){p.on('error',()=>stop(1));p.on('exit',code=>stop(code??1));}
