import fs from 'node:fs';
import {evaluateFlagshipUsage} from '../server/model-drift.mjs';
try{
 const args=process.argv.slice(2);if(args.length!==4||args[0]!=='--input'||args[2]!=='--out')throw Error('Use --input cohort.json --out new-report.json');
 if(fs.statSync(args[1]).size>16*1024*1024)throw Error('Cohort exceeds size limit');
 const result=evaluateFlagshipUsage(JSON.parse(fs.readFileSync(args[1],'utf8')));
 fs.writeFileSync(args[3],JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:result.status,reasons:result.reasons}));
}catch(error){console.error(error.message);process.exitCode=1;}
