import {useState} from 'react';
import {Building2} from 'lucide-react';
import {companyLogo} from '../lib/security-display.mjs';

export default function CompanyLogo({security}){
 const src=companyLogo(security),[failed,setFailed]=useState(null);
 return <span className="security-logo company-logo" title={src&&failed!==src?`${security.name||security.symbol} Logo`:'暂无公司 Logo'}>
  {src&&failed!==src?<img src={src} alt={`${security.name||security.symbol} Logo`} width="32" height="32" onError={()=>setFailed(src)}/>:<Building2 size={21} aria-label="公司图标"/>}
 </span>;
}
