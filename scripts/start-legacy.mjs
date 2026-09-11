import {modelRolloutStatus} from '../server/model-rollout.mjs';
// Override even an inherited policy env; no file or historical record is rewritten.
process.env.MODEL_ROUTING_MODE='legacy';
if(process.argv.includes('--check'))console.log(JSON.stringify(modelRolloutStatus()));
else await import('../server/index.mjs');
