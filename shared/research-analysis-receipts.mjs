import {researchToolCalls} from './research-record.mjs';
export const analysisToolNames=['calculate_shareholder_return','calculate_dcf_sensitivity','calculate_dividend_scenarios'];
export function researchAnalysisReceipts(job={}){
 return researchToolCalls(job.events,job.status).filter(call=>analysisToolNames.includes(call.toolName));
}
export const deepExecutionOverview=[
 {title:'核对经营与现金',text:'读取五年及近期季度，检查现金流的组成、受限资金与再投资。'},
 {title:'逐笔复算股东回报',text:'按实施事件去重分红，区分派息日、利润归属年和规划期限。'},
 {title:'检验估值是否稳健',text:'对照实际模型结果，复算增长与折现率网格，解释冲突与缺口。'},
];
