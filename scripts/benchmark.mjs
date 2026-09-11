import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {runChallenger} from '../benchmark/executor.mjs';
export function parseBenchmarkArgs(args){
 const values=new Set(['--out','--suite','--kind','--limits','--repeats']),flags=new Set(['--live','--allow-paid','--resume']),options={};
 if(!Array.isArray(args)||args.some(arg=>typeof arg!=='string'))throw Error('Invalid benchmark arguments');
 for(let i=0;i<args.length;i++){
  const key=args[i];
  if(!values.has(key)&&!flags.has(key))throw Error('Unknown benchmark argument');
  if(Object.hasOwn(options,key))throw Error('Duplicate benchmark argument');
  if(flags.has(key)){options[key]=true;continue;}
  const value=args[++i];if(!value?.trim()||value.startsWith('--'))throw Error('Missing benchmark argument value');options[key]=value;
 }
 if(!options['--out'])throw Error('--out is required; existing runs require --resume');
 if(options['--kind']&&!['text','vision'].includes(options['--kind']))throw Error('Invalid benchmark kind');
 if(options['--repeats']&&(!/^\d+$/.test(options['--repeats'])||Number(options['--repeats'])<1||Number(options['--repeats'])>20))throw Error('Invalid benchmark repeats');
 if(!options['--live']&&(options['--allow-paid']||options['--limits']))throw Error('Paid options require explicit --live');
 if(options['--live']&&(!options['--allow-paid']||!options['--limits']))throw Error('Live execution requires --allow-paid and --limits');
 return options;
}
export async function benchmarkCLI(args){
 const options=parseBenchmarkArgs(args),value=flag=>options[flag];
 const live=options['--live']===true,directory=value('--out');
 const limitsFile=value('--limits');const result=await runChallenger({suiteDirectory:value('--suite')??fileURLToPath(new URL('../benchmark/fixtures/bootstrap-v1',import.meta.url)),directory,
  kind:value('--kind')??'text',live,allowPaid:options['--allow-paid']===true,limits:limitsFile?JSON.parse(fs.readFileSync(limitsFile,'utf8')):undefined,repeats:Number(value('--repeats')??2),resume:options['--resume']===true});
 console.log(JSON.stringify(result.summary,null,2));return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)benchmarkCLI(process.argv.slice(2)).catch(()=>{console.error('Benchmark did not complete; inspect durable progress/configuration. Unknown requests are not replayed.');process.exitCode=1;});
