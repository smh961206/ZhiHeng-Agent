import {createRequire} from 'node:module';
import {dirname,join} from 'node:path';
import {readFile} from 'node:fs/promises';

// Ship pinned OCR resources with the site. Images never need a third-party OCR service.
export function materialOCRAssets(){
 const require=createRequire(import.meta.url),tesseract= require.resolve('tesseract.js/package.json');
 const core=dirname(createRequire(tesseract).resolve('tesseract.js-core/package.json'));
 const assets=new Map([['worker.min.js',join(dirname(tesseract),'dist/worker.min.js')]]);
 assets.set('worker.min.js.LICENSE.txt',join(dirname(tesseract),'dist/worker.min.js.LICENSE.txt'));
 assets.set('tesseract.LICENSE.txt',join(dirname(tesseract),'LICENSE.md'));
 assets.set('core.LICENSE.txt',join(core,'LICENSE'));
 for(const variant of ['lstm','simd-lstm','relaxedsimd-lstm'])assets.set(`tesseract-core-${variant}.wasm.js`,join(core,`tesseract-core-${variant}.wasm.js`));
 for(const language of ['eng','chi_sim','chi_tra'])assets.set(`${language}.traineddata.gz`,join(dirname(require.resolve(`@tesseract.js-data/${language}/package.json`)),`4.0.0_best_int/${language}.traineddata.gz`));
 const prefix='material-ocr/v7/';
 return {
  name:'material-ocr-assets',
  configureServer(server){
   server.middlewares.use(async(req,res,next)=>{
    const path=new URL(req.url,'http://localhost').pathname;
    if(!path.startsWith(`/${prefix}`))return next();
    const name=path.slice(prefix.length+1),file=assets.get(name);
    if(!file||!['GET','HEAD'].includes(req.method)){res.statusCode=404;res.end();return;}
    try{const data=await readFile(file);res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':'application/octet-stream');res.setHeader('Cache-Control','public, max-age=3600');res.end(req.method==='HEAD'?undefined:data);}
    catch(error){next(error);}
   });
  },
  async generateBundle(){for(const [name,file] of assets)this.emitFile({type:'asset',fileName:prefix+name,source:await readFile(file)});},
 };
}
