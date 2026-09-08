// Conditional projection of CORE 8/10/11/13 and FULL 9/12/13/16, V4.2.
// Inspect the requested task, never commands embedded in collected evidence.
export function executionIntent(input={}){
 const question=typeof input.question==='string'?input.question:'';
 return {
  reduce:/减仓|(?:我|持仓|仓位|需要|应该|计划|是否|如何|准备|打算).{0,12}减持|再平衡|清仓|清空|清零|卖出|卖掉|卖光|\b(rebalance|reduce|liquidate)\b/i.test(question),
  repurchase:/重新买入|买回|接回|追回|追涨|回补仓位|\b(rebuy|re-entry|fomo)\b/i.test(question),
  retrospective:/交易复盘|卖飞|卖早|卖出后|卖了.*涨|减仓.*复盘|复盘.*(交易|卖出|减仓)/.test(question),
 };
}
export const executionChecks=[
 {id:'action-separation',title:'研究状态与组合动作分离',requirement:'分别记录减仓原因、Research Action、thesis 状态、Portfolio Action。组合再平衡不自动下调研究状态；Research Exit 沿用退出候选/淘汰，不新增研究动作枚举。'},
 {id:'staged-reduction',title:'分批减仓与适用情景',requirement:'组合超配、单股/风险因子集中或资金再分配且核心逻辑未证伪、未触发直接归零时，默认分2–3档。逻辑削弱不自动等于证伪，不固定比例或无条件继续卖出。'},
 {id:'stage-review',title:'首档目标与后续复评',requirement:'记录当前仓位、目标区间、首档目标和后续档位复评条件；先降到目标区间上沿或更可控仓位，目标达成停止机械减仓。'},
 {id:'observation-position',title:'观察仓与规模依据',requirement:'说明是否保留最小有意义观察仓；按账户规模、最小交易单位、流动性及用户约束确定，不硬编码百分比、股数或手数，不豁免风险约束。'},
 {id:'exit-basis',title:'直接归零的依据',requirement:'仅核心逻辑证伪、治理/财务重大恶化、退出条件触发或用户明确清空时允许直接归零；记录事实、条件或用户指令，单纯再平衡或高估不能替代退出依据。'},
 {id:'near-term-events',title:'近端事件与资料缺口',requirement:'当日/立即减仓前按相关市场交易日历核查未来约5个交易日的财报、分红登记/除息、回购、正式价格政策、行业供需/产量等；记录日期、来源、确定性和持仓关联，缺失写数据不足或未找到，不能写确定无事件。'},
 {id:'timing-boundary',title:'执行时点与长期估值边界',requirement:'近端催化仅影响执行时点、节奏和分批方式；改变长期估值须有基本面新证据，按旧假设→新假设→新证据→区间影响重算，不用催化拖延已触发退出。'},
 {id:'post-sale-rally',title:'卖出后上涨的判断边界',requirement:'卖出后1–3个交易日快速上涨或涨停不自动证明原减仓逻辑错误，不因后悔/FOMO立即追回。'},
 {id:'repurchase-basis',title:'重新买入的依据',requirement:'重新买入须有新事实支持，并通过原买入条件、现时安全边际和组合约束核验；单纯上涨或恢复原仓位不是新买入依据。'},
 {id:'retrospective',title:'交易复盘的四层归因',requirement:'按交易当时可得证据分别检查研究判断错、估值错、目标仓位错、执行过快；记录原动作/估值/目标仓位、实际档位、后来新事实及修正动作，允许多层错误或证据不足，不凭后续涨跌倒推。'},
];
export function executionPlan(input,output){
 const intent=executionIntent({question:[input.question,typeof input.portfolio==='string'?input.portfolio:''].filter(Boolean).join('\n')});
 if(output.schema==='Quick'||!Object.values(intent).some(Boolean))return null;
 return {version:'4.2',intent,checks:executionChecks.map(item=>({...item}))};
}
export const executionBoundary='研究状态与组合执行分别判断：组合减仓/再平衡不等于研究退出；无完整组合上下文只给条件式执行框架和缺失项，不编造具体权重或交易数量。';
export const executionTasks=[
 {id:'reduce',title:'减仓与再平衡',description:'先看集中风险，再定分批与复评条件。',question:'检查贵州茅台持仓的减仓与再平衡条件，区分公司判断与组合集中风险；资料不足时只给条件式框架。'},
 {id:'exit',title:'清空依据',description:'分清逻辑证伪、退出触发与个人约束。',question:'研究贵州茅台持仓是否具备清空依据，分别核查核心逻辑、退出条件与组合约束，不把单纯超配等同研究退出。'},
 {id:'review',title:'交易复盘',description:'回看当时依据，核验重新买入的条件。',question:'复盘贵州茅台卖出后的判断与执行，分别检查研究、估值、目标仓位与执行节奏；重新买入须核验新事实。'},
];
export const executionContextTemplate='本次调整原因：\n交易日期与当时依据：\n原目标区间与已执行档位：\n新事实与资料来源：\n执行期限、最小交易单位及其他约束：';
export const executionGuideCards=[
 {title:'研究判断与组合动作分开',text:'公司逻辑未被证伪，仍可能因集中风险需要减仓。个人要求清空，也不自动意味着研究退出。'},
 {title:'分批执行，每档重新核对',text:'适用的再平衡默认分 2–3 档，先降低风险，再根据最新事实与剩余集中度复评；目标达成就停止机械减仓。'},
 {title:'清空与观察仓都有依据',text:'清空须有证伪、重大恶化、退出触发或明确用户要求。观察仓按账户与交易约束判断，不设固定比例。'},
 {title:'近端事件影响执行节奏',text:'立即减仓前核查未来约 5 个交易日的相关事件，记录日期、来源与缺口；不凭催化抬高长期价值，也不拖延已触发的退出。'},
 {title:'重新买入需要新事实',text:'卖出后上涨不自动证明原判断错误。重新买入仍需核验新事实、现时安全边际和组合约束。'},
 {title:'按当时证据做四层复盘',text:'分别检查研究判断、估值、目标仓位、执行节奏，记录修正动作；证据不足时保留结论，不凭后来涨跌倒推。'},
];
