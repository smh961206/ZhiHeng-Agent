const storageKey='zhiheng:submission:v1';
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
function randomKey(){
 const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
 const hex=Array.from(bytes,value=>value.toString(16).padStart(2,'0')).join('');
 return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
export function createSubmissionTracker({storage,uuid=randomKey}={}){
 let current,loaded=false;
 const browserStorage=()=>storage??globalThis.sessionStorage;
 return {
  keyFor(input){
   const serialized=JSON.stringify(canonical(input));
   if(!loaded){
    loaded=true;
    try{
     const raw=browserStorage()?.getItem(storageKey);
     if(raw&&raw.length<=1_600_000){const saved=JSON.parse(raw);if(saved.version===1&&typeof saved.input==='string'&&/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(saved.key))current=saved;}
    }catch{/* The in-memory key still protects retries in the current page. */}
   }
   if(current?.input!==serialized)current={version:1,key:uuid(),input:serialized};
   try{browserStorage()?.setItem(storageKey,JSON.stringify(current));}catch{/* Draft storage already explains browser persistence limitations. */}
   return current.key;
  },
  clear(){current=undefined;loaded=true;try{browserStorage()?.removeItem(storageKey);}catch{/* Do not block successful submission or clearing inputs. */}},
 };
}
