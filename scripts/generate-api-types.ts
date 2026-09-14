import {spawnSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {pythonCommand} from './python-runtime.ts';

const root=fileURLToPath(new URL('../',import.meta.url));
const target=resolve(root,'src/generated/api-schema.ts');
const temporary=mkdtempSync(join(tmpdir(),'zhiheng-openapi-'));
const schema=join(temporary,'openapi.json');
const generated=join(temporary,'api-schema.ts');

function run(command:string,args:string[]):void{
 const result=spawnSync(command,args,{cwd:root,stdio:'inherit'});
 if(result.error)throw result.error;
 if(result.status!==0)throw new Error(`${command} exited with status ${result.status??'unknown'}`);
}

try{
 run(pythonCommand(),['-m','python_backend.cli','openapi-export','--output',schema]);
 run(process.execPath,[resolve(root,'node_modules/openapi-typescript/bin/cli.js'),schema,'--output',generated,'--alphabetize']);
 const next=readFileSync(generated,'utf8').replaceAll('\r\n','\n');
 if(process.argv.includes('--check')){
  const current=readFileSync(target,'utf8').replaceAll('\r\n','\n');
  if(current!==next)throw new Error('FastAPI OpenAPI 类型已过期；请运行 pnpm api:types 并提交生成结果');
  console.log('FastAPI OpenAPI 类型与前端生成文件一致');
 }else{
  mkdirSync(dirname(target),{recursive:true});
  writeFileSync(target,next,'utf8');
  console.log(`已生成 ${target}`);
 }
}finally{
 rmSync(temporary,{recursive:true,force:true});
}
