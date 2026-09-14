import {spawn,spawnSync,type ChildProcess,type SpawnOptions} from 'node:child_process';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';

export function pythonCommand():string{
 const configured=process.env.PYTHON_EXECUTABLE?.trim();
 const local=process.platform==='win32'?resolve('.venv','Scripts','python.exe'):resolve('.venv','bin','python');
 const candidates=configured?[configured]:[...(existsSync(local)?[local]:[]),...(process.platform==='win32'?['python','py']:['python3','python'])];
 for(const command of candidates){
  const result=spawnSync(command,['--version'],{stdio:'ignore'});
  if(!result.error&&result.status===0)return command;
 }
 throw new Error('未找到 Python 3.11+；请安装 Python 并设置 PYTHON_EXECUTABLE');
}

export function spawnPython(args:string[],options:SpawnOptions={}):ChildProcess{
 return spawn(pythonCommand(),args,options);
}
