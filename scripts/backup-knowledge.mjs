import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,renameSync,rmSync,existsSync,statSync,watchFile,unwatchFile} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const projectRoot=fileURLToPath(new URL('../',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const names=['CORE.md','FULL.md'];
function sourceNames(sourceDir){
  const catalogPath=join(sourceDir,'modules.json');
  if(!existsSync(catalogPath))return names;
  const catalog=JSON.parse(readFileSync(catalogPath,'utf8'));
  const modules=catalog.modules.map(module=>{
    if(!/^knowledge\/modules\/(core|full|rules)\/[a-z0-9-]+\.md$/.test(module.path))throw new Error('非法规则模块路径');
    return module.path.slice('knowledge/'.length);
  });
  if(new Set(modules).size!==modules.length)throw new Error('模块目录包含重复文件');
  if(catalog.schemaVersion===2&&catalog.entry!=='knowledge/ENTRY.md')throw new Error('非法知识入口路径');
  return [...(catalog.schemaVersion===2?['ENTRY.md']:names),'modules.json',...modules];
}
const versionOf=bytes=>bytes.toString('utf8').match(/^\s+version:\s*"([^"]+)"/m)?.[1]??'unknown';
const baseVersion=version=>version.replace(/-core$/,'');

export function backupKnowledge(root=projectRoot){
  const sourceDir=join(root,'knowledge');
  const selectedNames=sourceNames(sourceDir);
  const originals=selectedNames.map(name=>{
    const path=join(sourceDir,name),before=statSync(path,{bigint:true}),bytes=readFileSync(path),after=statSync(path,{bigint:true});
    if(before.mtimeNs!==after.mtimeNs||before.size!==after.size||bytes.length===0)throw new Error(`${name} 正在写入或为空，稍后重试备份`);
    return {name,bytes,version:versionOf(bytes),sha256:hash(bytes)};
  });
  // Recheck the entire set so edits during reads cannot create a torn snapshot.
  if(JSON.stringify(sourceNames(sourceDir))!==JSON.stringify(selectedNames))throw new Error('模块目录正在更新，稍后重试备份');
  for(const file of originals)if(!readFileSync(join(sourceDir,file.name)).equals(file.bytes))throw new Error('知识文件正在更新，稍后重试备份');
  const id=hash(JSON.stringify(originals.map(({name,sha256})=>({name,sha256}))));
  const entryNames=selectedNames.includes('ENTRY.md')?['ENTRY.md']:names;
  const versions=originals.filter(file=>entryNames.includes(file.name)).map(file=>baseVersion(file.version));
  const version=versions.every(v=>v===versions[0])?versions[0]:'mixed';
  const catalogFile=originals.find(file=>file.name==='modules.json');
  if(catalogFile){
    const catalog=JSON.parse(catalogFile.bytes.toString('utf8'));
    if(version!=='mixed'&&catalog.version!==version)throw new Error('模块目录与执行入口版本不一致');
    for(const module of catalog.modules){
      const file=originals.find(file=>file.name===module.path.slice('knowledge/'.length));
      if(file.sha256!==module.sha256)throw new Error(`${module.path} 与目录校验不一致，请先更新模块索引`);
    }
    for(const file of originals)if(!entryNames.includes(file.name))file.version=catalog.version;
  }
  const safeVersion=version.replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,48)||'unknown';
  const parent=join(sourceDir,'versions','auto',safeVersion),directory=join(parent,id);
  const files=originals.map(({name,bytes,version,sha256})=>({name,bytes:bytes.length,version,sha256}));
  function verifyExisting(){
    for(const file of originals)if(!readFileSync(join(directory,file.name)).equals(file.bytes))throw new Error(`备份内容校验失败，未覆盖原文件：${directory}`);
    const saved=JSON.parse(readFileSync(join(directory,'manifest.json'),'utf8'));
    if(saved.id!==id||JSON.stringify(saved.files)!==JSON.stringify(files))throw new Error(`备份清单校验失败：${directory}`);
    return {created:false,directory,id};
  }
  if(existsSync(directory)&&(!catalogFile||existsSync(join(directory,'manifest.json'))))return verifyExisting();
  mkdirSync(parent,{recursive:true});
  const manifest={schemaVersion:1,id,createdAt:new Date().toISOString(),version,files};
  if(catalogFile){
    // The manifest is the commit marker. Recover an interrupted unpublished
    // directory only by verifying existing bytes and adding missing files.
    mkdirSync(directory,{recursive:true});
    for(const file of originals){
      const path=join(directory,file.name);mkdirSync(resolve(path,'..'),{recursive:true});
      if(!existsSync(path))try{writeFileSync(path,file.bytes,{flag:'wx'});}catch(error){if(error.code!=='EEXIST')throw error;}
      if(!readFileSync(path).equals(file.bytes))throw new Error(`备份内容校验失败，未覆盖原文件：${path}`);
    }
    const marker=join(directory,'manifest.pending.json');
    // An interrupted marker is not a published snapshot; retain and verify it.
    if(existsSync(marker)){
      const saved=JSON.parse(readFileSync(marker,'utf8'));
      if(saved.id!==id||JSON.stringify(saved.files)!==JSON.stringify(files))throw new Error('未完成备份清单不一致');
    }else try{writeFileSync(marker,JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});}catch(error){if(error.code!=='EEXIST')throw error;}
    try{renameSync(marker,join(directory,'manifest.json'));}catch(error){if(!existsSync(join(directory,'manifest.json')))throw error;}
    verifyExisting();return {created:true,directory,id};
  }
  // Publish the complete pair atomically; a killed process can only leave an
  // unpublished .pending-* folder. Existing snapshots are never overwritten.
  const temporary=mkdtempSync(join(parent,'.pending-'));
  const inParent=path=>resolve(path).startsWith(resolve(parent)+sep);
  if(!inParent(temporary)||!inParent(directory))throw new Error('备份路径超出归档目录');
  try{
    for(const file of originals){const path=join(temporary,file.name);mkdirSync(resolve(path,'..'),{recursive:true});writeFileSync(path,file.bytes,{flag:'wx'});if(!readFileSync(path).equals(file.bytes))throw new Error(`备份写入校验失败：${path}`);}
    writeFileSync(join(temporary,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
    try{renameSync(temporary,directory);}
    catch(error){if(!existsSync(directory))throw error;return verifyExisting();}
    return {created:true,directory,id};
  }finally{
    // This path is created exclusively by mkdtempSync under the archive parent.
    if(existsSync(temporary))rmSync(temporary,{recursive:true});
  }
}

export function watchKnowledge(root=projectRoot,{delay=750,onBackup=()=>{},onError=()=>{}}={}){
  let timer,closed=false;
  const paths=new Set();
  function syncPaths(){
    for(const name of new Set([...sourceNames(join(root,'knowledge')),'modules.json'])){
      const path=join(root,'knowledge',name);if(paths.has(path))continue;
      paths.add(path);watchFile(path,{interval:1000},schedule);
    }
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(()=>{if(closed)return;try{syncPaths();onBackup(backupKnowledge(root));}catch(error){onError(error);schedule();}},delay);}
  syncPaths();
  // watchFile establishes its initial stat asynchronously. Check once after
  // registering so an edit during startup cannot become an unnoticed baseline.
  schedule();
  return ()=>{closed=true;clearTimeout(timer);for(const path of paths)unwatchFile(path,schedule);};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const report=result=>{if(result.created)console.log(`[SKILL] 已备份知识库：${result.directory}`);};
  try{
    report(backupKnowledge());
    if(process.argv.includes('--watch')){
      let previousError='';
      const stop=watchKnowledge(projectRoot,{onBackup:result=>{previousError='';report(result);},onError:error=>{if(error.message!==previousError)console.error('[SKILL] '+error.message);previousError=error.message;}});
      for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{stop();process.exit(0);});
    }
  }catch(error){console.error('[SKILL] '+error.message);process.exitCode=1;}
}
