# MakerFlow Full AI Product PRD v0.2 — Change Log

> Date：2026-08-28  
> From：`01_makerflow_full_prd_v0.1.md`  
> To：`02_makerflow_full_prd_v0.2.md`  
> Change Type：从“总结型 PRD”重构为“产品决策型 PRD”  
> Truth Boundary：只使用仓库已有事实、可克制归纳的 Product Interpretation 与显式待确认项；未修改 Demo、Provider、Prompt、Eval Runner 或产品代码。

## 1. 重构原则

v0.2 没有改变 MakerFlow 的 Canonical 定位，也没有通过增加篇幅制造产品成熟度。重构的核心是让关键章节能够被追问：

```text
What / Problem
→ Why
→ Evidence
→ Product Decision
→ Why this decision
→ MakerFlow Case
→ Boundary / Bad Case
→ Acceptance / Evaluation
```

不是每个小节机械重复八个标题；表格、Case、Callout 和验收条件共同覆盖以上判断链。

## 2. 从“总结型”升级为“决策型”的章节

| Chapter | v0.1 主要形态 | v0.2 升级 | 决策颗粒度提升 |
|---|---|---|---|
| 00 Executive Summary | 定位与范围总结 | 加入问题链、产品定义、状态词汇与接受标准 | 明确“可制作作品助手”与 OS / Platform / Generator 的边界 |
| 01 业务背景 | 背景、用户、JTBD、痛点概述 | 用 Idea → Design → File → Handoff 拆解失效点；加入具体场景与 Evidence Level | 区分适合 AI 的语义任务和必须由 Rule / Tool / Human 承担的任务 |
| 02 竞品分析 | 竞品研究摘要 | 对 AImake V2.0、Cricut Design Space、Atomm 分别回答用户、任务、AI 介入、Artifact、制作断点、可学与不可学 | 从功能对照形成 Common Gap → Opportunity → Differentiation |
| 03 产品方案 | 7 步流程说明 | 每一步补齐 Goal、Trigger、Input、System、Human、Output、State、Failure、Gate、Acceptance | 用 MomoRay 说明卡贯穿 E2E，而不是把步骤写成导航名 |
| 04 版本迭代 | 四阶段路线 | 每阶段显式记录 Goal、Scope、Form、User、Validation、Metrics、Order、Risk | 不虚构周数；用验证问题决定阶段顺序 |
| 05 Agent 能力与执行机制 | 架构对象和机制总结 | 增加 Agent / Workflow 关系、T01–T17、11 Skills、Contract、State 传递及 D1–D9 | 将核心架构选择写成可比较、可反驳、可评估的 Decision Case |
| 05.6 Prompt Contract | Prompt 原则 | 以真实 `brief.extract` v0.1 展开 objective、I/O schema、约束、禁止项、不确定性、few-shot 状态、edge case、已知问题和迭代规则 | 明确没有真实 Prompt v0.2，也不把一次 smoke test 当作 prompt quality 结论 |
| 06 AI 产品评估体系 | Eval 分类与 baseline 汇总 | 加入评价对象、四类 Eval、E01–E12 分类、lifecycle、failure taxonomy、regression 和 bad case 格式 | 明确 skipped ≠ pass；LLM-as-Judge 仅为 Future Option |
| 07 大模型选型 | Provider 状态说明 | 深化 DeepSeek 先跑通的理由、当前任务范围、未证明事项、selection criteria 和 fallback | DeepSeek 仅为 Experimental Provider；没有 Final Selection |
| 08 Demo 搭建 | 技术栈与路径摘要 | 增加 minimum standard、E2E gate、已知限制和 Demo validation | Custom Web Prototype 是当前形态；删除 Coze 路线 |
| 09 NFR | NFR 条目 | 每项增加 Why、Decision、Measurement 和 Boundary | 不编造 latency、cost、reliability SLA |
| 10 Risks / Truth Boundary | 风险清单 | 增加 status vocabulary、risk owner / mitigation / evidence 和禁止声明 | Implemented、Planned、Hypothesis 不再混写 |

## 3. 新增的 MakerFlow Cases

### 3.1 场景与失败 Case（14 个）

| ID | Case | 主要验证点 |
|---|---|---|
| Case 01 | MomoRay 说明卡从一句话开始 | 模糊输入如何进入结构化 Brief |
| Case 02 | 修改标题位置后仍导出旧 PASS | Artifact Revision 与 Preflight stale |
| Case 03 | “主动建议”不是产品差异本身 | 竞品能力与 MakerFlow 机会边界 |
| Case 04 | MomoRay 说明卡完整 E2E | Canonical 7 步状态与 Gate |
| Case 05 | 缺少尺寸时不是继续生成 | Ask / Act / Confirm / Block |
| Case 06 | E01：用户未给出卡片尺寸 | missing 与追问行为 |
| Case 07 | E06：Provider 返回非法 JSON | fail closed 与状态保护 |
| Case 08 | E10：编辑后直接导出 | stale 阻断 |
| Case 09 | E11：只有 WARN | Human Authority |
| Case 10 | 如何阅读 Contract Baseline 7 / 12 | skipped 不计为通过 |
| Case 11 | DeepSeek 成功 smoke | 可运行不等于质量已验证 |
| Case 12 | DeepSeek 缺少 API key | Provider 配置失败边界 |
| Case 13 | 编辑后的重新验证 | Revision → stale → rerun |
| Case 14 | required PDF 但 unsupported | partial export 与 handoff completion 分离 |

### 3.2 Decision Cases（9 个）

| ID | Product Decision |
|---|---|
| D1 | Brief 与 Creative Plan 分离；Plan 不静默写回 confirmed facts |
| D2 | Design Spec 与 Artifact 分离；交付事实以实际 Artifact 为准 |
| D3 | Renderer 保持 pure function；不拥有 revision、Preflight 或 Human Gate |
| D4 | Artifact Identity 基于作品内容，不基于保存动作或易变 trace |
| D5 | Artifact Revision 与 Trace Event 分离 |
| D6 | Preflight stale 是硬状态，绑定 checked artifact revision |
| D7 | BLOCK 不可确认绕过；WARN 才能进入 Human Authority |
| D8 | required PDF unsupported 时，不能把 SVG partial export 伪装为 handoff complete |
| D9 | External SVG 可检查但不自动成为完整 MakerFlow-native Design Spec |

每个 D1–D9 都补充了 Problem、Alternatives、Decision、Why、Risk 与 Eval，不把架构偏好写成无条件真理。

## 4. 新增或显式化的 Product Decisions

v0.2 通过 `> Product Decision` 视觉锚点显式化 25 处决策，核心包括：

1. MakerFlow 坚持“可制作作品助手”定位，不升级为 OS、通用 Agent Platform 或 Multi-Agent System。
2. AI 负责语义抽取与建议，Tool / Rule 负责确定性验证，Human 保留确认与风险接受权。
3. Canonical 7 步是有状态产品流程，不是七个松散功能入口。
4. 未通过当前 revision 的 Preflight 不允许导出；旧 PASS 不能沿用。
5. Skill Contract 固化 I/O、禁止行为、错误和 owner，降低模型或实现替换对产品语义的破坏。
6. Prompt 输出失败必须 fail closed，不把不合法结构写入 Canonical State。
7. Eval 先覆盖 Contract、State、Authority 和 Boundary，再逐步补 Model 与用户任务证据。
8. DeepSeek 仅作为 Experimental Provider，用于验证 Provider 接入和结构化输出链路。
9. Demo 采用 Custom Web Prototype；不引入 Coze，也不声称 native 制作设备集成。

## 5. 仍然缺少的真实证据

以下内容在 v0.2 中继续使用 `【待补证据】`，没有用推测补齐：

- 首轮目标用户的正式招募优先级、样本量与代表性。
- 用户能否在观察测试中理解 Brief / Creative Plan / Preflight / WARN。
- MomoRay 说明卡的真实制作、交付和长期使用结果。
- AImake V2.0、Cricut Design Space、Atomm 的最新完整实测路径与可引用截图。
- Demo 对外入口、视频、二维码与完整 E2E 录屏。
- 真实 workload 下的 latency、cost、error distribution 与恢复表现。
- 隐私、数据保留和外部 Provider 条款的正式产品政策。
- 跨设备 / 制作软件兼容性和制造成功率证据。

## 6. 仍需 Human Decision 的内容

- MVP 首要成功标准：完成可验证交付，还是理解并修复问题。
- 初级 Maker 与设计学生的首轮招募优先级。
- WARN 的可接受范围、责任文案与批准权。
- External SVG 在 MVP 的编辑深度。
- PDF 是否为 MVP required output，或延期到后续阶段。
- Model Eval 候选池、评价权重和成本上限。
- latency、cost、retry、retention 等 NFR target。

这些问题不会由 PRD 作者根据“文档完整性”代替产品负责人裁决。

## 7. 仍不能写入 PRD 的内容

在出现可验证证据前，以下表述继续禁止：

- 已完成 Final Model Selection 或 DeepSeek 已通过正式效果验证。
- 已实现 LLM-as-Judge、RAG、Memory 或 Multi-Agent。
- 已实现 AImake、xTool、Cricut Native Integration 或设备控制。
- 已实现可靠 PDF 导出。
- 已验证制造成功率、效率提升百分比、用户增长或商业收益。
- Contract Eval 的 skipped cases 被算作 pass。
- External SVG 已被完整逆向重建为可信 Design Spec。
- 当前 Preflight 等同于制造安全认证。

## 8. 量化差异与统计口径

以下统计针对 `02_makerflow_full_prd_v0.2.md`，用于 review，不代表产品成熟度：

| Metric | Count | Counting Rule |
|---|---:|---|
| Total lines | 1,291 | 文件文本行数 |
| Tables | 54 | Markdown table separator rows |
| Cases | 23 | 14 个场景 / 失败 Case + 9 个 Decision Case |
| Product Decisions | 25 | `> Product Decision` 锚点数量 |
| `【待补证据】` | 27 | 全文出现次数，不等于 27 个互斥事项 |
| `【待Human Decision】` | 19 | 全文出现次数，不等于 19 个互斥问题 |
| `【待后续Model Eval】` | 12 | 全文出现次数，不等于 12 次独立实验 |

> Review Note
> 数量只用于检查文档是否具有足够的判断载体。v0.2 的验收仍以事实可追溯、决策可解释、边界可执行和评估可复现为准。

