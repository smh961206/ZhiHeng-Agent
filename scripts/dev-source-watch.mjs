import {createHash} from 'node:crypto';
import {readdirSync,readFileSync} from 'node:fs';
import {join,extname} from 'node:path';

// Compare source contents instead of native watch events: dependency/cache events
// on Windows can otherwise restart the API in the middle of a research job.
export function sourceFingerprint(root){
 const hash=createHash('sha256');
 function visit(directory){
  let entries;
  try{entries=readdirSync(join(root,directory),{withFileTypes:true});}
  catch(error){if(error.code==='ENOENT')return;throw error;}
  for(const entry of entries.sort((a,b)=>a.name.localeCompare(b.name))){
   if(entry.name==='node_modules'||entry.name.startsWith('.'))continue;
   const relative=join(directory,entry.name);
   if(entry.isDirectory())visit(relative);
   else if(entry.isFile()&&['.js','.mjs','.cjs','.json'].includes(extname(entry.name))){
    hash.update(relative);hash.update('\0');hash.update(readFileSync(join(root,relative)));hash.update('\0');
   }
  }
 }
 for(const directory of ['server','shared'])visit(directory);
 return hash.digest('hex');
}

export function watchDevelopmentSources(root,onChange,{interval=1000,onError=()=>{}}={}){
 let previous=sourceFingerprint(root),pending=previous;
 const timer=setInterval(()=>{
  try{
   const current=sourceFingerprint(root);
   // Wait for two matching scans so a multi-file save causes one restart.
   if(current!==previous&&current===pending){previous=current;onChange();}
   pending=current;
  }catch(error){onError(error);}
 },interval);
 return ()=>clearInterval(timer);
}
