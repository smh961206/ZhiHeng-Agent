import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {runAgent} from './agent.mjs';
import {modes,route,validateInput} from './router.mjs';
import {validateSecurities,fetchQuote} from './market-data.mjs';
import {resolveSecurities} from './security-resolver.mjs';
import {getStorage} from './storage.mjs';
import {migrateLegacy} from './migrate.mjs';
import {createAccessPolicy} from './access.mjs';
const allowRequest=createAccessPolicy(process.env.PUBLIC_ORIGINS);
const root=fileURLToPath(new URL('../',import.meta.url));
const storage=await getStorage();
console.log('MongoDB 已连接；旧数据迁移：',await migrateLegacy(storage));
await storage.recoverInterrupted();
const jobs=new Map(),controllers=new Map();
const save=job=>storage.saveJob(job);
function send(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));}
async function body(req){let str='',size=0;for await(const chunk of req){size+=chunk.length;if(size>1500000)throw new Error('请求超过1.5MB');str+=chunk;}return JSON.parse(str);}
async function execute(job){
 const control=new AbortController();controllers.set(job.id,control);job.status='running';
 const emit=(type,message,details)=>job.events.push({time:new Date().toISOString(),type,message,...details});
 try{await save(job);job.result=await runAgent(job,emit,control.signal);job.status='completed';emit('complete','研究完成');}
 catch(e){job.status=control.signal.aborted?'cancelled':'failed';job.error=control.signal.aborted?'任务已取消':e.message;emit('error',job.error);}
 finally{job.finishedAt=new Date().toISOString();controllers.delete(job.id);try{await save(job);jobs.delete(job.id);}catch(e){job.status='failed';job.error='任务持久化失败，请检查 MongoDB 连接';console.error(job.error,e.message);}}
}
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(!allowRequest(req))return send(res,403,{error:'访问地址或请求来源未获允许'});
  if(url.pathname==='/api/config')return send(res,200,{configured:!!(process.env.LLM_API_KEY&&process.env.LLM_MODEL),model:process.env.LLM_MODEL||null,modes,knowledgeVersion:'4.1',dataProvider:'A股/港股：东方财富+巨潮；美股：Yahoo/腾讯+SEC',markets:['CN','HK','US'],secUserAgentConfigured:!!process.env.SEC_USER_AGENT});
  if(url.pathname==='/api/securities/resolve'&&req.method==='POST'){
   const {question}=await body(req);const control=new AbortController();
   res.on('close',()=>{if(!res.writableEnded)control.abort();});
   return send(res,200,await resolveSecurities(question,{signal:control.signal}));
  }
  if(url.pathname==='/api/quotes'&&req.method==='POST'){
   const securities=validateSecurities((await body(req)).securities);if(!securities.length)throw new Error('请先添加标的');
   const control=new AbortController();res.on('close',()=>{if(!res.writableEnded)control.abort();});
   const result=await Promise.allSettled(securities.map(s=>fetchQuote(s,control.signal)));
   return send(res,200,result.map((r,i)=>r.status==='fulfilled'?{security:securities[i],quote:r.value}:{security:securities[i],error:r.reason.message}));
  }
  if(url.pathname==='/api/health'&&req.method==='GET'){try{await storage.ping();return send(res,200,{ok:true,storage:'mongodb'});}catch{return send(res,503,{ok:false,storage:'mongodb'});}}
  if(url.pathname==='/api/jobs'&&req.method==='GET'){
   const summaries=new Map((await storage.listJobs()).map(j=>[j.id,j]));
   for(const {input,result,events,...j} of jobs.values())summaries.set(j.id,{...j,question:input.question,sourceCount:input.sources.length});
   return send(res,200,[...summaries.values()].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)));
  }
  if(url.pathname==='/api/jobs'&&req.method==='POST'){
   if(controllers.size>=3)return send(res,429,{error:'已有3个任务运行，请稍后再试'});
   const payload=await body(req);
   if(Array.isArray(payload?.securities)&&payload.securities.length===0||payload?.securities===undefined){
    const resolved=await resolveSecurities(payload?.question);
    if(resolved.ambiguities.length||resolved.unresolved.length||resolved.overflow)throw new Error('问题中的标的存在歧义或未识别，请先核对标的');
    payload.securities=resolved.securities;
   }
   const input=validateInput(payload);
   if(!(process.env.LLM_API_KEY&&process.env.LLM_MODEL))return send(res,400,{error:'请先在.env配置LLM_API_KEY和LLM_MODEL'});
   const job={id:randomUUID(),input,mode:route(input),status:'queued',createdAt:new Date().toISOString(),events:[]};
   await save(job);jobs.set(job.id,job);void execute(job);return send(res,201,job);
  }
  const match=url.pathname.match(/^\/api\/jobs\/([\da-f-]+)(\/cancel)?$/);
  if(match){const job=jobs.get(match[1])??await storage.getJob(match[1]);if(!job)return send(res,404,{error:'任务不存在'});if(match[2]&&req.method==='POST'){controllers.get(job.id)?.abort();return send(res,200,{ok:true});}if(req.method==='GET')return send(res,200,{...job,input:{...job.input,sources:job.input.sources.map(s=>({...s,text:s.text.slice(0,12000),previewTruncated:s.text.length>12000}))}});}
  if(url.pathname.startsWith('/api/'))return send(res,404,{error:'接口不存在'});
  if(req.method!=='GET')return send(res,405,{error:'不支持的方法'});
  const dist=path.join(root,'dist');let file=path.resolve(dist,'.'+decodeURIComponent(url.pathname));
  if(file!==dist&&!file.startsWith(dist+path.sep))return send(res,403,{error:'路径无效'});
  let content;try{content=await readFile(file);}catch{if(path.extname(file))return send(res,404,{error:'文件不存在'});file=path.join(dist,'index.html');try{content=await readFile(file);}catch{return send(res,404,{error:'请先运行 pnpm build，或用 pnpm dev 启动开发模式'});}}
  const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(content);
 }catch(e){send(res,400,{error:e instanceof SyntaxError?'JSON格式错误':e.message});}
});
server.listen(Number(process.env.PORT)||3001,process.env.HOST||'127.0.0.1',()=>console.log(`知衡 Agent: http://${process.env.HOST||'127.0.0.1'}:${process.env.PORT||3001}`));
