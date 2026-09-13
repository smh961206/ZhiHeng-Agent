import {fileURLToPath} from 'node:url';
import {modelDefinitionKeys} from '../../server/model-config.mjs';

const currentModelFile=fileURLToPath(new URL('../../config/models.example.json',import.meta.url));
const retiredControls=['MODEL_ROUTING_MODE','FEATURE_VISION_ROUTING','MODEL_CHAMPION_ENABLED','MODEL_AB_ENABLED','MODEL_CHAMPION_REGISTRY_FILE','MODEL_CHAMPION_POLICY_VERSION','MODEL_CHAMPION_INVALIDATION_FILE','MODEL_POLICY_ACCEPTANCE_FILE','VISION_ACCEPTANCE_FILE','FLAGSHIP_REVIEW_ACCEPTANCE_FILE','JUDGE_ACCEPTANCE_FILE'];

export function pipelineApiEnv(overrides={}){
 const env={...process.env};
 for(const key of [...modelDefinitionKeys,...retiredControls])delete env[key];
 return {...env,MODEL_CONFIG_FILE:currentModelFile,LLM_API_KEY:'fixture-only',LLM_MAIN_API_KEY:'fixture-only',MODEL_TELEMETRY_ENABLED:'false',...overrides};
}
