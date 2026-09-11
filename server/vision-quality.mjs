// Deterministic extraction grading only: these scores never create financial facts.
export const visionGradeVersion=1;
export const visionMetrics=Object.freeze(['numeric','unit','date','header','sign','parentheses','footnote','relationship','missing']);
const keys=(value,expected)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join('|')===[...expected].sort().join('|');
const label=value=>typeof value==='string'&&value.trim().length>0&&value.length<=500;
const coordinate=cell=>JSON.stringify([cell.row,cell.column]);
function decimal(value){
 if(typeof value!=='string'||value.length>100)return null;
 let token=value.trim().replaceAll('−','-'),parentheses=token.startsWith('(')&&token.endsWith(')');
 if(parentheses)token=token.slice(1,-1);
 const match=token.match(/^([+-]?)(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?(%)?$/);
 if(!match||parentheses&&match[1])return null;
 const whole=BigInt(match[2].replaceAll(',','')).toString(),fraction=(match[3]??'').replace(/0+$/,'');
 return {magnitude:whole+(fraction?'.'+fraction:''),negative:parentheses||match[1]==='-',percent:!!match[4],parentheses};
}
function validTable(table){
 return keys(table,['headers','cells','footnotes'])&&Array.isArray(table.headers)&&table.headers.length>0&&table.headers.length<=30&&table.headers.every(label)&&
  Array.isArray(table.footnotes)&&table.footnotes.length<=30&&table.footnotes.every(label)&&
  Array.isArray(table.cells)&&table.cells.length>0&&table.cells.length<=200&&table.cells.every(cell=>keys(cell,['row','column','value','unit','date','footnote'])&&
   label(cell.row)&&label(cell.column)&&label(cell.unit)&&label(cell.date)&&(cell.footnote===null||label(cell.footnote))&&(cell.value===null||decimal(cell.value)!==null))&&
  new Set(table.cells.map(coordinate)).size===table.cells.length;
}
export function gradeVisionTable(expected,observed){
 if(!validTable(expected))throw new TypeError('Invalid Vision grading reference');
 let output=observed;
 if(typeof observed==='string')try{output=JSON.parse(observed.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));}catch{output=null;}
 const valid=validTable(output),metrics=Object.fromEntries(visionMetrics.map(name=>[name,{correct:0,total:expected.cells.length}]));
 let criticalErrors=0;
 const actual=new Map(valid?output.cells.map(cell=>[coordinate(cell),cell]):[]);
 const header=valid&&JSON.stringify(output.headers)===JSON.stringify(expected.headers);
 const footnotes=valid&&JSON.stringify(output.footnotes)===JSON.stringify(expected.footnotes);
 for(const cell of expected.cells){
  const found=actual.get(coordinate(cell)),want=decimal(cell.value),got=decimal(found?.value);
  const missing=!!found&&(cell.value===null)===(found.value===null);
  const numeric=!!found&&(cell.value===null?found.value===null:!!got&&got.magnitude===want.magnitude&&got.percent===want.percent);
  const sign=!!found&&(cell.value===null?found.value===null:!!got&&got.negative===want.negative);
  const parentheses=!!found&&(cell.value===null?found.value===null:!!got&&got.parentheses===want.parentheses);
  const unit=!!found&&found.unit===cell.unit,date=!!found&&found.date===cell.date,footnote=footnotes&&!!found&&found.footnote===cell.footnote;
  const relationship=numeric&&sign&&unit&&date&&footnote;
  const checks={numeric,unit,date,header,sign,parentheses,footnote,relationship,missing};
  for(const name of visionMetrics)if(checks[name])metrics[name].correct++;
  if(!Object.values(checks).every(Boolean))criticalErrors++;
 }
 if(valid)criticalErrors+=output.cells.filter(cell=>!expected.cells.some(want=>coordinate(want)===coordinate(cell))).length;
 for(const metric of Object.values(metrics))metric.score=metric.correct/metric.total;
 return {version:visionGradeVersion,formatValid:Boolean(valid),passed:Boolean(valid&&criticalErrors===0),criticalErrors,metrics,trust:'benchmark-only'};
}
