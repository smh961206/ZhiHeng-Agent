import {createChampionPolicy,championConfiguration,championCodeHash,championIntentHash,championExecutionSettings} from '../../server/model-champion.mjs';
import {objectHash} from '../../benchmark/fixtures.mjs';
export const championTestEnv=()=>({LLM_API_KEY:'test-key',LLM_MAIN_API_KEY:'test-key',LLM_MAIN_BASE_URL:'https://main.invalid',LLM_PRO_API_KEY:'test-key',
 LLM_MAIN_CHALLENGER_MODEL:'test-model',LLM_MAIN_CHALLENGER_PROVIDER:'test-provider',LLM_MAIN_CHALLENGER_BASE_URL:'https://candidate.invalid',LLM_MAIN_CHALLENGER_API_KEY:'test-key',LLM_MAIN_CHALLENGER_THINKING:'enabled',
 LLM_MAIN_CHALLENGER_CAPABILITIES:JSON.stringify({textInput:true,imageInput:false,streaming:true,toolCalling:true,jsonObject:true,jsonSchema:true,reasoningControl:true})});
// Synthetic unit-test attestation only; never written to an enabled production registry.
export function championTestPolicy(env=championTestEnv(),changes={}){
 const taskClasses=changes.taskClasses??['financial_analysis'];
 const samples=taskClasses.flatMap(taskClass=>Array.from({length:50},(_,i)=>['main','main-challenger'].flatMap(profileId=>[0,1].map(repeat=>({caseId:taskClass+'-'+i,taskClass,fixtureHash:objectHash([taskClass,i]),profileId,repeat,passed:true,criticalErrors:0,evidenceKind:'live-model'})))).flat());
 const configuration=championConfiguration(env),codeHash=championCodeHash(),executionSettings=championExecutionSettings(env);
 const evidence={version:1,benchmarkVersion:'unit-fixture-only',suiteHash:objectHash('fixture'),runBindings:[objectHash('test-run')],completedAt:'2026-09-01T00:00:00Z',baselineId:'main',candidateId:'main-challenger',configurationHash:objectHash(configuration),codeHash,classifierVersion:'1.0.0',reasoningEffort:'low',executionScope:'research-pipeline',samples};
 evidence.executionSettingsHash=objectHash(executionSettings);
 evidence.runArtifacts=[{runId:'test-run',binding:evidence.runBindings[0],resultsHash:objectHash('test-results')}];
 const intent={id:'test-policy-1',stage:'ab',percent:50,reasoningEffort:'low',taskClasses,configuration,codeHash,executionSettings,...changes};
 return createChampionPolicy({...intent,evidence,review:{approvedBy:'unit-test-operator',approvedAt:'2026-09-02T00:00:00Z',evidenceHash:objectHash(evidence),intentHash:championIntentHash(intent),pipelineReviewPassed:true,dryRunVerified:true,rollbackVerified:true},...changes},env);
}
