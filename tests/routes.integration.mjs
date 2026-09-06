import {createServer} from 'vite';
import assert from 'node:assert/strict';
const vite=await createServer({server:{middlewareMode:true},appType:'custom'});
try{
 const {renderRoute}=await vite.ssrLoadModule('/tests/routes.fixture.jsx');
 for(const [url,path,page,expected] of [['/workbench','/workbench','work','你想研究什么'],['/history?q=abc&status=failed','/history','history','value="abc"'],['/framework','/framework','rules','看清判断的依据'],['/research/test-id?tab=sources','/research/:jobId','work','正在加载研究记录'],['/missing','*','missing','页面不存在']]){
  assert.ok(renderRoute(url,path,page).includes(expected),url);console.log('route render OK',url);
 }
}finally{await vite.close();}
