import {createCanvas} from '@napi-rs/canvas';

// Only long, intersecting table rules are removed from an OCR-only copy. Short
// strokes (minus signs, decimal points and character parts) are never selected.
export function prepareOCRCanvas(original){
 const {width,height}=original;
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>6_000_000)throw new Error('OCR 图片尺寸超出处理范围');
 const canvas=createCanvas(width,height),context=canvas.getContext('2d');
 context.fillStyle='white';context.fillRect(0,0,width,height);context.drawImage(original,0,0);
 const pixels=context.getImageData(0,0,width,height),data=pixels.data,mask=new Uint8Array(width*height);
 let blank=true;
 for(let i=0;i<mask.length;i++){
  const p=i*4;mask[i]=Math.max(data[p],data[p+1],data[p+2])<250?1:0;
  if(Math.min(data[p],data[p+1],data[p+2])<255)blank=false;
 }
 const horizontal=[],vertical=[];
 const scan=(outer,inner,at,target,min)=>{
  for(let axis=0;axis<outer;axis++){
   let start=-1;
   for(let pos=0;pos<=inner;pos++){
    if(pos<inner&&mask[at(axis,pos)]){if(start<0)start=pos;}
    else if(start>=0){if(pos-start>=min)target.push({axis,start,end:pos-1});start=-1;}
   }
  }
 };
 scan(height,width,(y,x)=>y*width+x,horizontal,Math.max(100,width*.35));
 scan(width,height,(x,y)=>y*width+x,vertical,Math.max(100,height*.25));
 const groups=lines=>lines.map(line=>line.axis).filter((axis,index,all)=>index===0||axis-all[index-1]>3).length;
 const intersects=(a,b)=>b.axis>=a.start&&b.axis<=a.end&&a.axis>=b.start&&a.axis<=b.end;
 const hs=horizontal.filter(h=>groups(vertical.filter(v=>intersects(h,v)))>=2);
 const vs=vertical.filter(v=>groups(horizontal.filter(h=>intersects(v,h)))>=3);
 let removedPixels=0;
 if(groups(hs)>=3&&groups(vs)>=2){
  const clear=index=>{const p=index*4;if(data[p]!==255||data[p+1]!==255||data[p+2]!==255)removedPixels++;data[p]=data[p+1]=data[p+2]=255;};
  for(const {axis,start,end} of hs)for(let x=start;x<=end;x++)clear(axis*width+x);
  for(const {axis,start,end} of vs)for(let y=start;y<=end;y++)clear(y*width+axis);
  context.putImageData(pixels,0,0);
 }
 return {canvas,blank,processing:{tableRulesRemoved:removedPixels>0,removedPixels,width,height}};
}
