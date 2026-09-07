import {Check,ChevronRight} from 'lucide-react';
import {TabsTrigger} from './ui/tabs';
import CompanyLogo from './CompanyLogo';
import CompanyQuotePreview from './CompanyQuotePreview';
import {securityIdentity} from '../lib/security-display.mjs';

export default function CompanySecurityCard({security,item,loading,blocked,error,selectable=false}){
 const identity=securityIdentity(security),Card=selectable?TabsTrigger:'div';
 return <Card className={`security-chip single-security-chip company-security-card${selectable?' multi-company-option':''}`} {...(selectable?{value:identity.code}:{})}>
  <CompanyLogo security={security}/>
  <div className="company-security-name"><strong>{security.name||item?.quote?.name||security.symbol}</strong><span className="security-identity">{identity.market}<i aria-hidden="true">·</i><code>{identity.code}</code></span></div>
  <CompanyQuotePreview className="company-option-price" item={item} loading={loading} blocked={blocked} error={error}/>
  {selectable&&<span className="company-option-state" aria-hidden="true"><span className="company-option-current"><Check size={14}/><small>当前</small></span><ChevronRight size={16} className="company-option-next"/></span>}
 </Card>;
}
