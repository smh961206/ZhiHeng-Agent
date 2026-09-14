import {createServer} from 'vite';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
// A single SSR pass does not need file watching or hot reload. Avoid scanning
// archived artifacts and creating thousands of Windows filesystem watchers.
const root=fileURLToPath(new URL('..',import.meta.url));
const vite=await createServer({
 root,configFile:false,server:{middlewareMode:true,watch:null},appType:'custom',
 esbuild:{jsx:'automatic'},resolve:{alias:{'@':fileURLToPath(new URL('../src',import.meta.url))}}
});
try{
 const {renderRoute}=await vite.ssrLoadModule('/tests/routes.fixture.tsx');
 for(const [url,path,page,expected] of [['/','/','rules','把分散资料'],['/workbench','/workbench','work','你想研究什么'],['/history?q=abc&status=failed','/history','history','value="abc"'],['/research/test-id?tab=sources','/research/:jobId','work','正在加载研究记录'],['/missing','*','missing','页面不存在']]){
  assert.ok((await renderRoute(url,path,page)).includes(expected),url);console.log('route render OK',url);
 }
}finally{await vite.close();}
