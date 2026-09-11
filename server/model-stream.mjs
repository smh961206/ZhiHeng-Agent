export async function readCompletion(response,onDelta=()=>{},{onActivity=()=>{},onHeartbeat=()=>{},onUsage=()=>{},onFinish=()=>{},strict=false,allowMissingJsonFinish=false,allowMissingJsonRole=false}={}){
 if(!response.headers.get('content-type')?.includes('text/event-stream')){
  const data=await response.json();const choice=strict?singleChoice(data.choices):data.choices?.[0];
  if(!choice?.message)throw new Error('模型返回格式无效');
  checkFinish(choice.finish_reason);
  // Some existing compatible JSON responses omit finish_reason. The legacy
  // text migration permits omission only; metadata remains unknown, not stop.
  if(strict)validateCompletion(allowMissingJsonRole&&choice.message.role===undefined?{...choice.message,role:'assistant'}:choice.message,allowMissingJsonFinish&&choice.finish_reason==null?(choice.message.tool_calls?.length?'tool_calls':'stop'):choice.finish_reason);
  onFinish(choice.finish_reason);if(data.usage!==undefined)onUsage(data.usage);
  if(strict&&(choice.message.content||choice.message.reasoning_content||choice.message.tool_calls?.length))onActivity();
  if(choice.message.content)onDelta(choice.message.content);
  return choice.message;
 }
 const message={role:'assistant',content:''},calls=new Map();
 const decoder=new TextDecoder();let buffer='',done=false,finished=false,size=0,finishReason;
 function consume(frame){
  if(frame.split(/\r?\n/).some(line=>/^:\s*keep-alive\s*$/i.test(line)))onHeartbeat();
  const data=frame.split(/\r?\n/).filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trimStart()).join('\n');
  if(!data)return;if(data==='[DONE]'){done=true;return;}
  const chunk=JSON.parse(data);if(chunk.error)throw new Error('模型流式接口返回错误');
  if(chunk.usage!==undefined)onUsage(chunk.usage);
  const choice=strict?singleChoice(chunk.choices):chunk.choices?.find(c=>c.index===0)||chunk.choices?.[0];if(!choice)return;
  if(strict&&finished&&(choice.finish_reason||Object.keys(choice.delta??{}).length))throw new Error('模型完成后返回了额外内容');
  if(choice.finish_reason){checkFinish(choice.finish_reason);finished=true;finishReason=choice.finish_reason;onFinish(finishReason);}
  const delta=choice.delta??{};
  if(strict){
   if(delta.refusal)throw Object.assign(new Error('模型拒绝了请求'),{code:'model_refusal'});
   if(delta.content!=null&&typeof delta.content!=='string'||delta.reasoning_content!=null&&typeof delta.reasoning_content!=='string'||delta.tool_calls!=null&&!Array.isArray(delta.tool_calls))throw new Error('模型增量格式无效');
   if(delta.role!==undefined&&delta.role!=='assistant'||delta.tool_calls?.some(t=>!t||t.type!==undefined&&t.type!=='function'||t.id!==undefined&&typeof t.id!=='string'||t.function?.name!==undefined&&typeof t.function.name!=='string'||t.function?.arguments!==undefined&&typeof t.function.arguments!=='string'))throw new Error('模型工具增量格式无效');
  }
  if(delta.content||delta.reasoning_content||delta.tool_calls?.some(tool=>tool.id||tool.function?.name||tool.function?.arguments))onActivity();
  // Required when DeepSeek thinking-mode tool calls continue. Keep this only
  // inside model messages; never emit it as report text or trace events.
  if(typeof delta.reasoning_content==='string')message.reasoning_content=(message.reasoning_content||'')+delta.reasoning_content;
  if(typeof delta.content==='string'){message.content+=delta.content;onDelta(delta.content);}
  for(const tool of delta.tool_calls??[]){
   const index=tool.index;if(!Number.isInteger(index)||index<0||index>=12)throw new Error('模型工具分片索引无效');
   const call=calls.get(index)??{id:'',type:'function',function:{name:'',arguments:''}};
   if(tool.id)call.id+=tool.id;if(tool.function?.name)call.function.name+=tool.function.name;
   if(tool.function?.arguments)call.function.arguments+=tool.function.arguments;calls.set(index,call);
  }
 }
 for await(const bytes of response.body){
  size+=bytes.length;if(size>8_000_000)throw new Error('模型流式响应超过大小上限');
  buffer+=decoder.decode(bytes,{stream:true});let match;
  while((match=/\r?\n\r?\n/.exec(buffer))){consume(buffer.slice(0,match.index));buffer=buffer.slice(match.index+match[0].length);if(done)break;}
  if(done)break;
 }
 if(!done){buffer+=decoder.decode();if(buffer.trim())consume(buffer);}
 if(!done||!finished)throw Object.assign(new Error('模型流式响应中断，请重试'),{code:'model_stream_incomplete'});
 if(calls.size){message.tool_calls=[...calls.entries()].sort((a,b)=>a[0]-b[0]).map(([,call])=>call);if(message.tool_calls.some(c=>!c.id||!c.function.name))throw new Error('模型工具调用不完整');}
 if(strict)validateCompletion(message,finishReason);
 return message;
}
function singleChoice(choices){
 if(choices==null)return undefined;
 if(!Array.isArray(choices)||choices.length>1||choices[0]?.index!==undefined&&choices[0].index!==0)throw new Error('模型返回了非预期的候选结果');
 return choices[0];
}
function validateCompletion(message,finish){
 if(message.refusal)throw Object.assign(new Error('模型拒绝了请求'),{code:'model_refusal'});
 if(!['stop','tool_calls'].includes(finish)||message.role!=='assistant'||message.content!=null&&typeof message.content!=='string'||message.reasoning_content!=null&&typeof message.reasoning_content!=='string')throw new Error('模型消息格式无效');
 const calls=message.tool_calls;
 if(calls!=null&&(!Array.isArray(calls)||!calls.length||calls.length>12||new Set(calls.map(c=>c?.id)).size!==calls.length||calls.some(c=>typeof c?.id!=='string'||!c.id||c.type!=='function'||typeof c.function?.name!=='string'||!c.function.name||typeof c.function?.arguments!=='string')))throw new Error('模型工具调用格式无效');
 if(finish==='tool_calls'&&!calls?.length||finish==='stop'&&calls?.length||!calls?.length&&!message.content?.trim())throw new Error('模型未返回完整内容');
}
function checkFinish(reason){
 if(reason==='length')throw Object.assign(new Error('模型输出被截断，请缩短资料或提高模型输出限额后重试'),{code:'model_output_truncated'});
 if(reason==='content_filter')throw Object.assign(new Error('模型未能完成报告，输出已被过滤'),{code:'model_refusal'});
}
