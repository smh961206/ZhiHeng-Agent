# 6. VALUATION ENGINE

## 6.1 方法匹配

- 稳定消费/成熟龙头：PE + DCF + FCF Yield
- 高成长：DCF + Forward PE + PS/盈利路径
- 银行：PB + ROE + DDM/股息
- 保险：P/EV + ROE + 新业务价值 + 分红
- 公用事业：DCF + DDM + 股息率
- 周期股：PB + 中周期利润 + EV/EBITDA + 资产价值
- 资源股：商品周期 + 成本曲线 + 储量 + FCF + NAV/EV EBITDA
- 科技平台：增长 + 利润率 + FCF + 用户/ARPU + DCF/PE-FCF
- 多元集团：SOTP

深度研究原则上至少两种估值方法交叉验证。

## 6.2 DCF Protocol

### ① 现金流口径

FCFF → Enterprise Value。

FCFE → Equity Value。

禁止混用。

### ② 基准现金流

使用正常化现金流，不机械使用周期高点。

### ③ 显性期

通常 5–10 年，根据可预测性决定。

解释：收入增长、利润率、税率、Capex、营运资金、现金转化。

### ④ 折现率

FCFF 使用 WACC：

```text
WACC = E/(D+E)×Ke + D/(D+E)×Kd×(1-T)
```

```text
Ke = Rf + Beta×ERP
```

必要时说明国家风险。

禁止为目标价任意调折现率。

### ⑤ 终值

优先永续增长法；退出倍数仅作辅助校验。

永续增长率必须符合长期经济常识。

### ⑥ EV → Equity

若使用 FCFF：

```text
Equity Value
= EV
- Interest-bearing Debt
- Minority Interest (if applicable)
+ Cash / Excess Cash
+ Non-operating Investments (if applicable)
```

租赁负债、养老金等必须与 EV 口径一致。

### ⑦ 每股价值

```text
Per Share = Equity Value ÷ Diluted Share Count
```

处理 ADS/A/H 股换算。

## 6.3 相对估值

统一：期间、盈利口径、一次性项目、净债务、成长性、会计差异。

至少看：
- 当前 PE/PB/PS/EV EBITDA/股息率（按适用）
- 3年历史分位
- 5年历史分位
- 更长周期（可得）
- 同行业
- 同类优质公司

历史低估 ≠ 当前一定便宜。

## 6.4 三情景

必须至少：悲观 / 基准 / 乐观。

参数可包括：
- 收入增速
- 利润/FCF增速
- 长期利润率
- ROE/ROIC
- 折现率
- 终值

输出价值区间，不输出单点“神奇目标价”。

## 6.5 敏感性

至少测试：增长率 + 折现率。

若参数变化 1–2pct 即导致估值大幅变化：
【估值敏感度高】。

## 6.6 股息锚冲突

若收益率锚与主估值明显冲突，解释：
- 周期
- 支付率
- Capex
- 增长
- 杠杆
- 利率/风险溢价
- 特别分红

禁止挑选最有利的模型。

