export async function readCompletion(response,onDelta=()=>{}){
 if(!response.headers.get('content-type')?.includes('text/event-stream')){
  const data=await response.json();const choice=data.choices?.[0];
  if(!choice?.message)throw new Error('模型返回格式无效');
  checkFinish(choice.finish_reason);if(choice.message.content)onDelta(choice.message.content);
  return choice.message;
 }
 const message={role:'assistant',content:''},calls=new Map();
 const decoder=new TextDecoder();let buffer='',done=false,finished=false,size=0;
 function consume(frame){
  const data=frame.split(/\r?\n/).filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trimStart()).join('\n');
  if(!data)return;if(data==='[DONE]'){done=true;return;}
  const chunk=JSON.parse(data);if(chunk.error)throw new Error('模型流式接口返回错误');
  const choice=chunk.choices?.find(c=>c.index===0)||chunk.choices?.[0];if(!choice)return;
  if(choice.finish_reason){checkFinish(choice.finish_reason);finished=true;}
  const delta=choice.delta??{};
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
 return message;
}
function checkFinish(reason){
 if(reason==='length')throw Object.assign(new Error('模型输出被截断，请缩短资料或提高模型输出限额后重试'),{code:'model_output_truncated'});
 if(reason==='content_filter')throw Object.assign(new Error('模型未能完成报告，输出已被过滤'),{code:'model_refusal'});
}
