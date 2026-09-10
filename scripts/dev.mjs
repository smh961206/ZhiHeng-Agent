import { spawn } from 'node:child_process';
import {watchKnowledge} from './backup-knowledge.mjs';
import {snapshotManager} from '../server/knowledge-snapshots.mjs';
import {watchDevelopmentSources} from './dev-source-watch.mjs';
const reportBackup=result=>{if(result.created)console.log(`[SKILL] 已备份知识库：${result.directory}`);};
snapshotManager.current();
if(snapshotManager.status().updatePending)console.warn('[知识库] 当前修订尚未通过校验，使用最近一份有效快照启动。');
let backupError='';
const stopBackup=watchKnowledge(undefined,{onBackup:result=>{backupError='';reportBackup(result);},onError:error=>{if(error.message!==backupError)console.error('[SKILL] '+error.message);backupError=error.message;}});
let closing=false,restarting=false,backend;
const frontend=spawn(process.execPath,['node_modules/vite/bin/vite.js'],{stdio:'inherit'});
function startBackend(){
 backend=spawn(process.execPath,['--env-file-if-exists=.env','server/index.mjs'],{stdio:'inherit'});
 backend.on('error',()=>stop(1));
 backend.on('exit',code=>{
  if(closing)return;
  if(restarting){restarting=false;startBackend();}else stop(code??1);
 });
}
const stopSourceWatch=watchDevelopmentSources(process.cwd(),()=>{
 if(closing||restarting)return;
 console.log('[调试] 后端源码已更新，正在重启服务。');
 restarting=true;backend.kill();
},{onError:error=>console.error('[调试] 源码检查失败：'+error.message)});
function stop(code=0){if(closing)return;closing=true;stopSourceWatch();stopBackup();backend?.kill();frontend.kill();process.exit(code);}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
frontend.on('error',()=>stop(1));frontend.on('exit',code=>stop(code??1));
startBackend();
