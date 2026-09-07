import Tesseract from 'tesseract.js/dist/tesseract.esm.min.js';
const {createWorker}=Tesseract;

self.onmessage=async({data:{image,assetPath}})=>{
 let worker;
 try{
  worker=await createWorker('chi_sim+chi_tra+eng',1,{
   workerPath:assetPath+'worker.min.js',corePath:assetPath,langPath:assetPath,
   workerBlobURL:false,cacheMethod:'none',
   logger:event=>{
    const message=event.status==='recognizing text'?`正在识别图片文字 · ${Math.round(event.progress*100)}%`:event.status==='loading language traineddata'?'正在准备中文和英文识别…':'正在启动图片识别…';
    self.postMessage({type:'progress',message});
   },
   errorHandler:error=>self.postMessage({type:'error',message:String(error)}),
  });
  await worker.setParameters({preserve_interword_spaces:'1',tessedit_pageseg_mode:'3'});
  const {data}=await worker.recognize(image,{}, {text:true});
  self.postMessage({type:'result',text:data.text,confidence:data.confidence});
 }catch(error){self.postMessage({type:'error',message:error.message??String(error)});}
 finally{await worker?.terminate();}
};
