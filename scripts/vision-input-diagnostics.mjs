// Explicit live diagnostic: sends only the synthetic PDF fixture, never user files.
import {mkdir,writeFile} from 'node:fs/promises';
import {readVisualMaterial} from '../server/material-vision.mjs';
import {enhancePDFWithVision,visualAuditContext} from '../server/visual-reading.mjs';
import {visualDigest} from '../server/visual-assets.mjs';
import {visionStatus} from '../server/vision-model.mjs';
import {materialPdf} from '../tests/fixtures/material-files.mjs';
const assets=new Map(),save=async value=>{const id=visualDigest(JSON.stringify(value));assets.set(id,value);return id;},load=async id=>{if(!assets.has(id))throw new Error('missing');return assets.get(id);};
const startedAt=new Date().toISOString();let result;
try{
 const material=await readVisualMaterial(materialPdf('Annual cash flows: 100; review original evidence.'),{signal:AbortSignal.timeout(100000),enhance:(bytes,parsed,signal)=>enhancePDFWithVision(bytes,parsed,signal,{save}),save,load});
 const audit=await visualAuditContext({referenceMaterials:[{...material,id:'M1'}]},{load});
 const asset=assets.get(material.visualAttachment);
 result={ok:material.processing.method==='vision'&&/100/.test(asset?.text||'')&&audit.coverage.included.length===1,capability:visionStatus(),syntheticOnly:true,startedAt,finishedAt:new Date().toISOString(),processing:material.processing,
  readPages:asset?.pages,originalImages:asset?.images.length,modelTranscript:asset?.text,auditCoverage:audit.coverage};
}catch(error){result={ok:false,syntheticOnly:true,startedAt,error:error.message};}
await mkdir(new URL('../artifacts/',import.meta.url),{recursive:true});
await writeFile(new URL('../artifacts/vision-live-check.json',import.meta.url),JSON.stringify(result,null,2));
console.log(JSON.stringify(result));if(!result.ok)process.exitCode=1;
