// Read-only replay of previously failed arithmetic against the saved evidence.
// No model calls, market refreshes, report edits or database writes.
import {MongoClient,GridFSBucket} from 'mongodb';
import {calculationBasis,dcf,dividend} from '../server/calculations.mjs';
import {quickScreenMetrics} from '../server/quick-screen.mjs';
import {normalizedEarnings} from '../server/normalized-earnings.mjs';
const ids=process.argv.slice(2);
if(!ids.length||ids.some(id=>!/^\w{8}-(?:\w{4}-){3}\w{12}$/.test(id)))throw new Error('请传入需要回放的研究ID');
const functions={calculate_dcf:dcf,calculate_dividend:dividend,calculate_screen_metrics:quickScreenMetrics,calculate_normalized_earnings:normalizedEarnings};
const client=new MongoClient(process.env.MONGODB_URI||'mongodb://127.0.0.1:27017');
try{
 await client.connect();const db=client.db(process.env.MONGODB_DATABASE||'zhiheng_agent'),bucket=new GridFSBucket(db,{bucketName:'job_payloads'}),results=[];
 for(const id of ids){
  const entry=await db.collection('jobs').findOne({_id:id});if(!entry)throw new Error('研究记录不存在');
  const chunks=[];for await(const chunk of bucket.openDownloadStream(entry.payloadId))chunks.push(chunk);
  const job=JSON.parse(Buffer.concat(chunks).toString('utf8')),calls=[];
  for(const event of job.events.filter(e=>e.type==='tool_result'&&e.result?.error&&functions[e.toolName])){
   const args=job.events.find(e=>e.type==='tool'&&e.toolCallId===event.toolCallId)?.arguments;
   let error;
   try{calculationBasis(args?.basis,job.input.sources);functions[event.toolName](args,{sources:job.input.sources});}catch(e){error=e.message;}
   calls.push({tool:event.toolName,callId:event.toolCallId,previousError:event.result.error,status:error?'still-blocked':'replayed',...(error?{error}:{})});
  }
  results.push({id,failedAttempts:calls.length,replayed:calls.filter(call=>call.status==='replayed').length,calls});
 }
 console.log(JSON.stringify({notice:'使用历史原始参数回放，未修改报告；通过仅表示引用及程序运算检查通过，不代表财务事实已核实。',results},null,2));
}finally{await client.close();}
