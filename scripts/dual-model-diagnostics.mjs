// Explicit live check: synthetic image only, no user documents or research jobs.
import {createCanvas} from '@napi-rs/canvas';
import {writeFile,mkdir} from 'node:fs/promises';
import {readImageMaterial} from '../server/visual-reading.mjs';
import {publicModelRouting,modelRouting} from '../server/model-routing.mjs';
const canvas=createCanvas(1000,400),context=canvas.getContext('2d');context.fillStyle='white';context.fillRect(0,0,1000,400);context.fillStyle='black';context.font='40px sans-serif';context.fillText('SYNTHETIC TEST: ZH42',40,90);context.fillText('Revenue: 100 USD',40,180);context.fillText('Cost: 60 USD',40,270);
const signal=AbortSignal.timeout(90000);let result,phase='vision';
try{
 const material=await readImageMaterial(canvas.toBuffer('image/png'),signal,{save:async()=> 'a'.repeat(64)});
 phase='pro';const config=modelRouting();
 const response=await fetch(config.analysisBase.replace(/\/$/,'')+'/chat/completions',{method:'POST',signal,headers:{'Content-Type':'application/json',Authorization:`Bearer ${config.analysisKey}`},body:JSON.stringify({model:config.analysisModel,thinking:{type:'disabled'},max_tokens:256,response_format:{type:'json_object'},messages:[{role:'user',content:'合成接口测试，仅根据以下 Vision 转写返回 JSON，字段 code（原图编号）、revenue、cost、subtraction（revenue 减 cost）。\n'+material.text}]})});
 if(!response.ok)throw new Error('Pro HTTP '+response.status);const answer=await response.json();const parsed=JSON.parse(answer.choices[0].message.content);
 result={ok:parsed.code==='ZH42'&&Number(parsed.subtraction)===40,syntheticOnly:true,diagnosticOnly:'Pro 关闭思考的小规模连接测试；正式研究保持默认思考模式',models:publicModelRouting(),visionText:material.text,proOutput:parsed};
}catch(error){result={ok:false,phase,syntheticOnly:true,models:publicModelRouting(),error:error.message};}
await mkdir(new URL('../artifacts/',import.meta.url),{recursive:true});await writeFile(new URL('../artifacts/dual-model-live.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result));if(!result.ok)process.exitCode=1;
