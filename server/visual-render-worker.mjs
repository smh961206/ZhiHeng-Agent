import {parentPort,workerData} from 'node:worker_threads';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {pdfDocumentOptions} from './pdf-options.mjs';
// Keep both the page overview and overlapping full-width strips. Provider image
// downscaling otherwise makes dense financial tables unreadable.
function views(canvas,page){
 const images=[{page,region:'整页',dataUrl:canvas.toDataURL('image/jpeg',.88)}];
 if(canvas.height>950){
  const height=Math.ceil(canvas.height*.4);
  for(const [index,y] of [0,Math.round((canvas.height-height)/2),canvas.height-height].entries()){
   const crop=createCanvas(canvas.width,height);crop.getContext('2d').drawImage(canvas,0,y,canvas.width,height,0,0,canvas.width,height);
   images.push({page,region:`纵向局部 ${index+1}/3（与相邻局部重叠，请勿重复计数）`,dataUrl:crop.toDataURL('image/jpeg',.88)});
  }
 }
 return images;
}
let loading;
try{
 const bytes=new Uint8Array(workerData.bytes),images=[];
 if(workerData.kind==='pdf'){
  const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');loading=getDocument({data:bytes,...pdfDocumentOptions});loading.onPassword=()=>{void loading.destroy();};
  const doc=await loading.promise;
  for(const number of workerData.pages){
   if(number<1||number>doc.numPages)throw new Error('原页超出范围');
   const page=await doc.getPage(number),base=page.getViewport({scale:1});
   if(![base.width,base.height].every(v=>Number.isFinite(v)&&v>0))throw new Error('页面尺寸无效');
   const scale=Math.min(2.5,2000/Math.max(base.width,base.height));
   const viewport=page.getViewport({scale}),canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
   await page.render({canvasContext:canvas.getContext('2d'),viewport,background:'rgb(255,255,255)'}).promise;
   images.push(...views(canvas,number));page.cleanup();
  }
 }else{
  const image=await loadImage(Buffer.from(bytes));
  if(!image.width||!image.height||image.width*image.height>40_000_000)throw new Error('图片尺寸超过限制');
  const scale=Math.min(1,2000/Math.max(image.width,image.height)),canvas=createCanvas(Math.ceil(image.width*scale),Math.ceil(image.height*scale));
  const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);images.push(...views(canvas,1));
 }
 parentPort.postMessage({type:'visual:result',images});
}catch{parentPort.postMessage({type:'visual:error',error:'原件无法转换为可读图片，请检查文件或解除 PDF 密码'});}
finally{await loading?.destroy().catch(()=>{});}
