import {readFileSync} from 'node:fs';
import {assertPublishableKnowledge,knowledgeInventory} from '../shared/knowledge-engineering.mjs';
const catalog=JSON.parse(readFileSync(new URL('../knowledge/modules.json',import.meta.url),'utf8'));
const result=assertPublishableKnowledge(catalog);
console.log(JSON.stringify({...result.summary,inventory:knowledgeInventory(catalog)},null,2));
