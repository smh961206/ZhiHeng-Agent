import {TabsList} from './ui/tabs';
import CompanySecurityCard from './CompanySecurityCard';
import {securityIdentity} from '../lib/security-display.mjs';

export default function MultiCompanySelector({securities,quotes,loading,blocked,error}){
 return <div className="multi-company-selector">
  <div className="multi-company-heading"><strong>公司行情 <span>{securities.length} 家</span></strong><span>选择公司，查看下方行情</span></div>
  <TabsList className="multi-company-list" aria-label="切换公司行情">
   {securities.map(security=>{
    const identity=securityIdentity(security),item=quotes.find(item=>securityIdentity(item.security).code===identity.code);
    return <CompanySecurityCard key={identity.code} security={security} item={item} loading={loading} blocked={blocked} error={error} selectable/>;
   })}
  </TabsList>
 </div>;
}
