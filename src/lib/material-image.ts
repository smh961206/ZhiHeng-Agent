export const materialImageExtensions=['png','jpg','jpeg','webp','bmp'];
export const isMaterialImage=name=>materialImageExtensions.includes(name.split('.').at(-1).toLowerCase());

export function imageFormat(bytes){
 if(bytes.length>=24&&bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71&&bytes[4]===13&&bytes[5]===10&&bytes[6]===26&&bytes[7]===10)return 'png';
 if(bytes.length>=4&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'jpeg';
 if(bytes.length>=16&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')return 'webp';
 if(bytes.length>=26&&bytes[0]===66&&bytes[1]===77)return 'bmp';
 throw new Error('图片格式无法识别，请重新保存为 PNG、JPG、WebP 或 BMP');
}
