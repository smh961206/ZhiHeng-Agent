import {Parser} from 'htmlparser2';
const local=name=>name.split(':').at(-1).toLowerCase();
const content=node=>node.parts.map(part=>typeof part==='string'?part:content(part)).join('').trim();
const all=(node,name)=>[...(local(node.name)===name?[node]:[]),...node.children.flatMap(child=>all(child,name))];
export function validFactDate(value){
 return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
}
export function inlineNumber(raw,attributes,namespace){
 if(['true','1'].includes(attributes['xsi:nil']))throw new Error('nil不是零');
 let value=raw.trim(),format=attributes.format?.split(':').at(-1);
 if(format){
  if(!/^https?:\/\/www\.xbrl\.org\/inlineXBRL\/transformation\/(?:2010-04-20|2011-07-31|2015-02-26|2020-02-12|2022-02-16)$/.test(namespace||''))throw new Error('转换命名空间不支持');
  if(['zerodash','numdash'].includes(format)){
   if(!/^[-\u2010-\u2015\u2212]+$/.test(value))throw new Error('零占位格式无效');value='0';
  }else if(format==='fixed-zero')value='0';
  else if(['num-dot-decimal','numdotdecimal'].includes(format)){
   if(!/^(?:\d{1,3}(?:[, \u00a0]\d{3})+|\d+)(?:\.\d+)?$/.test(value))throw new Error('小数或千位格式无效');value=value.replace(/[, \u00a0]/g,'');
  }else if(['num-comma-decimal','numcommadecimal'].includes(format)){
   if(!/^(?:\d{1,3}(?:[. \u00a0]\d{3})+|\d+)(?:,\d+)?$/.test(value))throw new Error('小数或千位格式无效');value=value.replace(/[. \u00a0]/g,'').replace(',','.');
  }else throw new Error('转换格式不支持');
 }
 if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value))throw new Error('数字格式无法确定');
 const scale=attributes.scale??'0';
 if(!/^-?\d+$/.test(scale)||Math.abs(Number(scale))>18)throw new Error('数量级无效');
 if(attributes.sign!==undefined&&attributes.sign!=='-')throw new Error('符号无效');
 if(attributes.sign&&Number(value)<0)throw new Error('原值与sign重复负号');
 const number=Number(value)*10**Number(scale)*(attributes.sign==='-'?-1:1);
 if(!Number.isFinite(number)||Number.isInteger(number)&&!Number.isSafeInteger(number))throw new Error('数值超过安全精度');
 return number;
}
export function extractInlineXBRL(html,{maxFacts=20000}={}){
 const stack=[],contexts=new Map(),units=new Map(),rawFacts=[],errors=[];let total=0;
 const duplicates=new Set();
 const save=(map,id,value)=>{if(!id)return;if(map.has(id)&&JSON.stringify(map.get(id))!==JSON.stringify(value))duplicates.add(id);else map.set(id,value);};
 const parser=new Parser({
  onopentag(name,attrs){
   const parent=stack.at(-1),inherited=parent?.ns||{};
   const declared=Object.entries(attrs).filter(([k])=>k.startsWith('xmlns:'));
   const ns=declared.length?{...inherited,...Object.fromEntries(declared.map(([k,v])=>[k.slice(6),v]))}:inherited;
   const leaf=local(name),uri=ns[name.split(':')[0]];
   const root=(leaf==='context'||leaf==='unit')&&uri==='http://www.xbrl.org/2003/instance'||leaf==='nonfraction'&&uri==='http://www.xbrl.org/2013/inlineXBRL';
   const node={name,attrs,ns,parts:[],children:[],capture:!!(root||parent?.capture),root};
   if(parent?.capture){parent.children.push(node);parent.parts.push(node);}stack.push(node);
  },
  ontext(value){const node=stack.at(-1);if(node?.capture)node.parts.push(value);},
  onclosetag(){
   const node=stack.pop();if(!node?.root)return;
   if(local(node.name)==='context'){
    const get=name=>all(node,name).map(content);const identifier=all(node,'identifier')[0];
    const dimensions=[...all(node,'explicitmember'),...all(node,'typedmember')].map(n=>({axis:n.attrs.dimension,value:content(n),typed:local(n.name)==='typedmember'})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
    const instant=get('instant'),starts=get('startdate'),ends=get('enddate');
    save(contexts,node.attrs.id,{entity:identifier?content(identifier):null,entityScheme:identifier?.attrs.scheme,dimensions,
     start:instant.length?null:starts[0],end:instant[0]||ends[0],valid:!!identifier&&(instant.length===1&&!starts.length&&!ends.length||!instant.length&&starts.length===1&&ends.length===1)});
   }else if(local(node.name)==='unit'){
    const numerator=all(node,'unitnumerator')[0],denominator=all(node,'unitdenominator')[0];
    const measures=n=>all(n,'measure').map(m=>{const value=content(m),[prefix,label]=value.split(':');const uri=m.ns[prefix];return uri==='http://www.xbrl.org/2003/iso4217'&&/^[A-Z]{3}$/.test(label)?label:uri==='http://www.xbrl.org/2003/instance'&&['shares','pure'].includes(label)?label:null;});
    const nums=measures(numerator||node),dens=denominator?measures(denominator):[];
    save(units,node.attrs.id,nums.length===1&&nums[0]&&(!denominator||dens.length===1&&dens[0])?nums[0]+(denominator?'/'+dens[0]:''):null);
   }else{total++;if(rawFacts.length<maxFacts)rawFacts.push(node);}
  }
 },{decodeEntities:true});parser.write(html);parser.end();
 const facts=[];
 for(const node of rawFacts){
  const a=node.attrs,tag=a.name;
  try{
   const context=contexts.get(a.contextref),unit=units.get(a.unitref);
   if(!context?.valid||!context.entity||!unit||duplicates.has(a.contextref)||duplicates.has(a.unitref))throw new Error('上下文、单位缺失或冲突');
   if(!validFactDate(context.end)||context.start&&(!validFactDate(context.start)||context.start>context.end))throw new Error('实际期间无效');
   if(!tag||a.continuedat||a.target||all(node,'exclude').length)throw new Error('字段需跨文档或额外转换');
   const value=inlineNumber(content(node),a,node.ns[a.format?.split(':')[0]]);
   const taxonomyNamespace=node.ns[tag.split(':')[0]];
   if(!taxonomyNamespace)throw new Error('概念命名空间缺失');
   const standard=/^https?:\/\/(?:fasb\.org\/us-gaap\/|xbrl\.fasb\.org\/us-gaap\/|xbrl\.ifrs\.org\/taxonomy\/|xbrl\.sec\.gov\/dei\/)/.test(taxonomyNamespace);
   const {valid,...period}=context;
   facts.push({tag,taxonomyNamespace,standardConcept:standard,unit,value,...period,contextRef:a.contextref,unitRef:a.unitref,scale:Number(a.scale||0),decimals:a.decimals??null,
    originalText:content(node),factId:a.id??null,origin:'inline-xbrl',needsReview:!standard||context.dimensions.length>0});
  }catch(error){if(errors.length<40)errors.push({tag,contextRef:a.contextref,reason:error.message});}
 }
 return {financialFacts:facts,inlineXbrl:{totalFacts:total,acceptedFacts:facts.length,rejectedFacts:rawFacts.length-facts.length,omittedFacts:Math.max(0,total-maxFacts),errors,
  notice:'保留实际上下文、维度、单位和scale；自定义标签不自动映射，unsupported/nil不当作零；本解析器不替代完整XBRL校验器。'}};
}
