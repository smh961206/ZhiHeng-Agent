export function providerConfig(env=process.env){
 return {
  tushare:{token:env.TUSHARE_TOKEN?.trim()||''},
  longbridge:{appKey:env.LONGBRIDGE_APP_KEY?.trim()||'',appSecret:env.LONGBRIDGE_APP_SECRET?.trim()||'',accessToken:env.LONGBRIDGE_ACCESS_TOKEN?.trim()||''},
 };
}
export function providerStatus(env=process.env){
 const config=providerConfig(env),values=Object.values(config.longbridge);
 return {tushare:{configured:!!config.tushare.token},longbridge:{configured:values.every(Boolean),partial:values.some(Boolean)&&!values.every(Boolean)}};
}
export function redactProviderError(error,secrets=[]){
 let message=String(error?.message||error||'数据源请求失败');
 for(const secret of secrets.filter(Boolean))message=message.split(secret).join('[已隐藏]');
 return message.replace(/(Bearer\s+)[^\s"']+/gi,'$1[已隐藏]').slice(0,500);
}
