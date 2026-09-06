import {createRequire} from 'node:module';
import {dirname,join} from 'node:path';
const require=createRequire(import.meta.url),root=dirname(require.resolve('pdfjs-dist/package.json'));
export const pdfDocumentOptions={useSystemFonts:true,isEvalSupported:false,verbosity:0,useWorkerFetch:false,
 cMapUrl:join(root,'cmaps').replaceAll('\\','/')+'/',cMapPacked:true,standardFontDataUrl:join(root,'standard_fonts').replaceAll('\\','/')+'/',wasmUrl:join(root,'wasm').replaceAll('\\','/')+'/'};
