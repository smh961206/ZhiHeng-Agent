import {modes} from '../../shared/research-framework.mjs';

export const modeLabels = {...Object.fromEntries(Object.entries(modes).map(([id, mode]) => [id, mode.name])), auto: '自动匹配', unknown: '未记录'};

export function modeOf(job) {
  const candidates = [job.mode, job.plan?.mode, job.input?.mode];
  return candidates.find(id => Object.hasOwn(modes, id)) || (candidates.includes('auto') ? 'auto' : 'unknown');
}

export const modeLabel = job => modeLabels[modeOf(job)];
