// Bloom metadata selects possible files without loading their bodies. False
// positives are checked against the original text; there are no false negatives.
const size=8192;
function keys(text){
 const chars=Array.from(text.toLocaleLowerCase()),result=[...chars];
 for(let i=1;i<chars.length;i++)result.push(chars[i-1]+chars[i]);
 return result;
}
function slots(key){
 let value=2166136261;for(const char of key)value=Math.imul(value^char.codePointAt(0),16777619);
 return [value>>>0,(Math.imul(value,0x5bd1e995)>>>0)].map(n=>n%size);
}
export function bodyFilter(text){
 const bytes=new Uint8Array(size/8);
 for(const key of keys(text))for(const bit of slots(key))bytes[bit>>3]|=1<<(bit&7);
 return Array.from(bytes,n=>n.toString(16).padStart(2,'0')).join('');
}
export function mayContain(filter,term){
 if(!filter)return true;
 const bytes=filter.match(/../g).map(n=>parseInt(n,16));
 return keys(term).every(key=>slots(key).every(bit=>bytes[bit>>3]&(1<<(bit&7))));
}
