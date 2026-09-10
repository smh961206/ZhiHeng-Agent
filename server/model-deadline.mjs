const bounded=(value,fallback,min,max)=>Number.isFinite(Number(value))&&Number(value)>0?Math.min(max,Math.max(min,Number(value))):fallback;
export function modelTimeouts(env=process.env){
 return {idleMs:bounded(env.LLM_TIMEOUT_MS,300000,30000,600000),totalMs:bounded(env.LLM_MAX_DURATION_MS,1800000,30000,3600000)};
}
export function createModelDeadline({signal,idleMs,totalMs,setTimer=setTimeout,clearTimer=clearTimeout}){
 const control=new AbortController();let idleTimer,totalTimer,closed=false;
 const combined=signal?AbortSignal.any([signal,control.signal]):control.signal;
 function expire(kind,ms){
  const duration=ms>=60000?Math.round(ms/60000)+'分钟':Math.round(ms/1000)+'秒';
  const message=kind==='idle'?'模型服务连续'+duration+'未返回内容或保活信号，连接可能已中断，请稍后重试':'本次模型请求已达到'+duration+'总时限，请稍后重试';
  control.abort(Object.assign(new Error(message),{code:'model_timeout',timeoutKind:kind}));
 }
 function activity(){
  if(closed||combined.aborted)return;
  clearTimer(idleTimer);idleTimer=setTimer(()=>expire('idle',idleMs),idleMs);
 }
 if(!combined.aborted){activity();totalTimer=setTimer(()=>expire('total',totalMs),totalMs);}
 return {signal:combined,activity,dispose(){closed=true;clearTimer(idleTimer);clearTimer(totalTimer);}};
}
