import {evaluateResearchComplexity} from './research-complexity.mjs';

// Shadow recommendations only. Slots are not executable ModelProfiles.
export function evaluateModelPolicy(signals={}){
 const complexity=evaluateResearchComplexity(signals);
 const {score}=complexity;
 let candidate=null;
 const reasons=[];
 if(complexity.level==='unknown')reasons.push('complexity_unknown');
 else if(complexity.signals.mode==='A'){
  candidate={slot:'MAIN',reasoningEffort:'low'};reasons.push('mode_a_cap');
 }else{
  candidate=score<=3?{slot:'MAIN',reasoningEffort:'low'}:
   score<=7?{slot:'MAIN',reasoningEffort:'high'}:
   score<=10?{slot:'PRO',reasoningEffort:'high'}:{slot:'PRO',reasoningEffort:'max'};
  reasons.push(score<=3?'score_0_3':score<=7?'score_4_7':score<=10?'score_8_10':'score_11_plus');
 }
 return {policyVersion:1,complexity,candidate,reasons};
}

// No policy execution is supported. Unknown/empty configuration stays legacy.
export {modelRoutingMode} from './model-routing.mjs';

/** Best-effort server log; observation errors must never fail or replay a call. */
export function observeModelPolicy({purpose,profile,reasoningEffort,signals},sink){
 let policy={policyVersion:1,complexity:null,candidate:null,reasons:['purpose_not_scored']};
 if(['research','review','followup'].includes(purpose)){
  try{policy=evaluateModelPolicy(signals);}
  catch{policy={policyVersion:1,complexity:null,candidate:null,reasons:['invalid_complexity_input']};}
 }
 const decision={schemaVersion:1,event:'model_routing_decision',routingMode:'dry-run',
  executionMode:'legacy',purpose,executionProfile:profile.id,
  executionReasoningEffort:reasoningEffort??null,...policy};
 try{
  // A sink is observational, unlike mandatory preview/validation callbacks.
  // Consume asynchronous failures without waiting on a telemetry dependency.
  const result=sink(decision);
  if(result&&typeof result.then==='function')Promise.resolve(result).catch(()=>{});
 }catch{}
}
