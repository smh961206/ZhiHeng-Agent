import {activateKnowledge} from './backup-knowledge.mjs';

try{
 const result=activateKnowledge();
 console.log(result.activated?`已激活 ${result.pointer.knowledgeVersion}：${result.pointer.snapshotId}`:`${result.pointer.knowledgeVersion} 已处于激活状态：${result.pointer.snapshotId}`);
}catch(error){console.error(error.message);process.exitCode=1;}
