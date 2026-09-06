export function createAccessPolicy(value=''){
 const origins=new Set(['http://localhost:3001','http://127.0.0.1:3001','http://localhost:5173','http://127.0.0.1:5173']);
 for(const item of value.split(',').map(x=>x.trim()).filter(Boolean)){
  const url=new URL(item);
  if(!['http:','https:'].includes(url.protocol)||url.origin!==item)throw new Error('PUBLIC_ORIGINS 必须为完整 origin，例如 https://research.example.com');
  origins.add(url.origin);
 }
 const hosts=new Set(['localhost','127.0.0.1',...Array.from(origins,x=>new URL(x).hostname)]);
 return (req)=>{
  let host;try{host=new URL('http://'+req.headers.host).hostname;}catch{return false;}
  if(!hosts.has(host))return false;
  if(!['GET','HEAD','OPTIONS'].includes(req.method)&&req.headers.origin&&!origins.has(req.headers.origin))return false;
  return true;
 };
}
