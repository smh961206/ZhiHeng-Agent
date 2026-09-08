// Concise homepage copy. Detailed execution rules remain in the backend knowledge files.
export const researchPresentation = {
  "A": {
    "intro": "从业务、财务和估值快照入手，判断是否值得深入研究。",
    "result": "淘汰 / 观察池 / 深度研究",
    "sceneNote": "适合初次了解一家公司，不涉及具体仓位建议。"
  },
  "B": {
    "intro": "先明确核心矛盾，再用证据和计算验证长期投资逻辑。",
    "result": "验证计划 · 证据判断 · 估值区间与研究动作",
    "sceneNote": "先理解公司，再判断价格；具体仓位需要完整持仓信息。"
  },
  "C": {
    "intro": "对照新旧披露，找出变化及其对原有判断的影响。",
    "result": "升级 / 维持 / 降级 / 剔除",
    "sceneNote": "建议提供旧报告或上次结论，便于对照变化。"
  },
  "D": {
    "intro": "用统一口径比较公司质量、现金回报与估值。",
    "result": "统一对比表 · 同组排序 · 候选理由",
    "sceneNote": "至少选择两家公司，统一期间与估值口径。"
  },
  "E": {
    "intro": "从整体持仓出发，检视现金回报与集中风险；涉及调整时，分开判断公司逻辑与组合执行。",
    "result": "经营与现金回报 · 集中风险 · 条件动作",
    "sceneNote": "减仓、清空或交易复盘会补充执行条件与专项复核。持仓信息不足时，只给条件式框架。"
  },
  "F": {
    "intro": "验证分红与回购的现金来源，评估长期回报是否可持续。",
    "result": "分红可持续性 · 收益率锚 · 交叉验证",
    "sceneNote": "核对八年现金回报；收益率锚不等于内在价值。"
  }
};

export function researchOutcomeCopy(plan){
 if(plan?.execution)return '研究判断 · 组合执行条件 · 执行纪律复核';
 if(plan?.mode==='C'&&plan.baseline?.provided===false)return '本期基线 · 关键变化 · 下期验证';
 return researchPresentation[plan?.mode]?.result||'以本次研究范围为准';
}
