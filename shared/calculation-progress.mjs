// Count tool attempts, not verified financial conclusions. A later result must
// never erase failures from a different calculation or scenario.
export function summarizeCalculations(events = []) {
 const calls = new Map();
 for (const [index, event] of events.entries()) {
  if (event.type !== 'tool_result' || !event.toolName?.startsWith('calculate_') || !event.result || typeof event.result !== 'object') continue;
  calls.set(event.toolCallId || `event-${index}`, event);
 }
 const results = [...calls.values()];
 const failures = results.filter(event => event.result.error).map(event => ({toolName:event.toolName,toolCallId:event.toolCallId,error:String(event.result.error)}));
 const succeeded = results.length - failures.length;
 return {total:results.length,succeeded,failed:failures.length,failures,
  status:failures.length ? (succeeded ? 'partial' : 'failed') : results.length ? 'completed' : 'skipped'};
}

export function calculationProgress(job) {
 const summary = summarizeCalculations(Array.isArray(job?.events) ? job.events : []);
 const stage = job?.workflow?.stages?.find(stage => stage.id === 'calculation');
 const active = ['queued','running'].includes(job?.status);
 // Preserve in-flight and interrupted work; derive historical finished stages
 // from their recorded attempts without rewriting stored reports or evidence.
 const preserve = stage && (['cancelled','stopped'].includes(stage.status) || stage.status === 'running');
 return {...summary,status:preserve ? stage.status : summary.total ? summary.status : stage?.status || (active ? 'pending' : 'skipped')};
}
