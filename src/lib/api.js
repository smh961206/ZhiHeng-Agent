export async function api(url,options){const res=await fetch(url,options);const data=await res.json();if(!res.ok)throw new Error(data.error||'请求失败');return data;}
export const post=value=>({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});
