export const taskClassifierVersion='1.0.0';
export const modelTaskClasses=Object.freeze(['quick_screen','financial_analysis','long_document','agent_tooling','review','vision_table']);
// Pure known-signal classification. A job stores the result at creation, not per turn.
export function classifyModelTask({purpose='research',mode,documentPages,toolWorkflow}={}){
 if(purpose==='vision')return 'vision_table';
 if(purpose==='review')return 'review';
 if(!['research','followup'].includes(purpose)||!['A','B','C','D','E','F'].includes(mode))return null;
 if(mode==='A')return 'quick_screen';
 if(Number.isSafeInteger(documentPages)&&documentPages>=50)return 'long_document';
 if(toolWorkflow===true||mode==='E')return 'agent_tooling';
 return 'financial_analysis';
}
export function benchmarkTaskClass({category,taskSignals}){
 if(taskSignals)return classifyModelTask(taskSignals);
 return ({quick_screen:'quick_screen',earnings_update:'financial_analysis',deep_research:'financial_analysis',company_comparison:'financial_analysis',
  complex_valuation:'financial_analysis',missing_conflict:'financial_analysis',execution_review:'agent_tooling',shareholder_return:'financial_analysis',vision_table:'vision_table'})[category]??null;
}
