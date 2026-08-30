# MakerFlow｜Full AI Product PRD Track

> 文档线状态：Full PRD Draft v0.1 Human Review
> Evidence Matrix 已确认；当前已生成 Full PRD Draft v0.1，但未冻结 Human Decision 项。
> Canonical 产品形态：独立 Web Assistant。

## Canonical 产品定位

MakerFlow 是面向初级 Maker / 设计学生的可制作作品助手：把模糊想法转成结构化设计约束，形成可编辑矢量作品，并在导出前完成确定性预检与问题路由。

MVP Validation Scenario：MomoRay 模块化枕头高度调节说明卡。

MakerFlow 不是 AI Native OS、Multi-Agent Platform、单纯 Workflow Tool 或 Prompt-to-image Generator。Agent、Workflow、Tool、Rule、Human 与 Eval 是产品执行机制，不是新的产品定位。Multi-Agent 不属于当前能力。

## 文档状态语言

- `Implemented`：仓库中有可运行实现、测试、输出文件或运行报告。
- `Planned`：已有设计或冻结路线，但尚无完整运行证据。
- `Hypothesis`：需要用户研究、实验或市场证据验证。
- `【待补证据】`：PRD 需要该事实，但仓库没有足够证据。
- `【待Human Decision】`：不能由仓库事实自动推出，必须由产品负责人裁决。
- `【待后续Model Eval】`：已有实验 Provider 或候选方向，但尚未完成正式模型比较或选型。

## Full PRD 目录

### 00 Executive Summary

### 01 业务背景

- 1.1 场景 / 行业背景
- 1.2 Target User
- 1.3 JTBD
- 1.4 Pain Points
- 1.5 Why AI / Why not traditional tool
- 1.6 Product Positioning

### 02 竞品分析

- 2.1 Competitor Scope
- 2.2 Detailed Comparison
- 2.3 Common Gap
- 2.4 MakerFlow Differentiation

优先沿用已有 AImake V2.0、Cricut Design Space、Atomm、Illustrator / Inkscape 与 xTool Studio 研究，不另造竞品集合。

### 03 产品方案

- 3.1 Product Form
- 3.2 Core Product Experience
- 3.3 Core Functional Modules
- 3.4 Non-goals
- 3.5 Core User Journey
- 3.6 Ask / Act / Confirm / Block
- 3.7 Core State Objects
- 3.8 Before / After
- 3.9 Key UI

### 04 版本迭代

冻结路线：Phase 1 产品假设验证 → Phase 2 Model 能力接入 → Phase 3 体验与 Eval 闭环 → Phase 4 制作生态扩展。

每个 Phase 必须包含 Goal、Core Scope、Product Form、Target User、Validation Question、Metrics、Why this order、Risks。没有依据时不写交付周数。

### 05 AI Agent 能力与执行机制

- 5.1 为什么需要 Agent 能力
- 5.2 Agent Task Graph
- 5.3 Core Skill Architecture
- 5.4 Prompt Contract
- 5.5 Workflow / Orchestration
- 5.6 Task 间信息传递
- 5.7 State Management
- 5.8 Artifact Identity
- 5.9 Human Authority
- 5.10 Failure / Recovery

不得声称完全自治 Agent 或 Multi-Agent System。

### 06 AI 产品评估体系

- 6.1 Evaluation Object
- 6.2 Metrics
- 6.3 Evaluation Method
- 6.4 Eval Dataset
- 6.5 Eval Lifecycle
- 6.6 Baseline
- 6.7 Failure Taxonomy
- 6.8 Eval-driven Iteration

LLM as Judge 当前不实现，只能列入 Future Evaluation Options。

### 07 大模型选型

- 7.1 MakerFlow 中的 Model Tasks
- 7.2 Business / Technical Constraints
- 7.3 Current Experimental Provider
- 7.4 Evaluation Dimensions
- 7.5 Candidate Model Comparison
- 7.6 Final Selection
- 7.7 Fallback Strategy

DeepSeek 已有 `brief.extract` 实验 Provider、Adapter、测试与一次成功 smoke artifact；这证明实验链路可运行，不证明已完成正式 Model Eval 或 Final Selection。

### 08 Demo 搭建

- 8.1 Technology Stack
- 8.2 Demo Minimum Standard
- 8.3 E2E User Path
- 8.4 Key Prompt
- 8.5 Key Workflow
- 8.6 Demo Entry / Video
- 8.7 Known Limitations
- 8.8 Demo Validation

当前采用 Custom Web Prototype；不加入 Coze 搭建教程。

### 09 NFR

- Latency
- Cost
- Reliability
- Privacy
- Observability

没有经确认的阈值时统一使用 `【待定义】`，不虚构 SLA。

### 10 Risks / Open Questions / Truth Boundary

明确区分 Implemented、Planned、Hypothesis，并覆盖 Model hallucination、structured output instability、false manufacturing confidence、over-automation、unsupported capabilities 与 External Artifact trust boundary。

### 11 Appendix

- Research evidence
- Competitor material
- Full Task Graph
- Skill Contracts
- Prompt Versions
- Eval Cases
- Baselines
- Architecture
- UI / Wireframes

## Evidence Review Summary

统计口径：以 64 个 PRD 二级内容单元为分母；Phase 1—4 分别计为一个单元；NFR 五项分别计数。

| Status | Count | Share | Meaning |
|---|---:|---:|---|
| READY | 39 | 60.9% | 有足够来源，可在 Draft v0.1 中直接组织成文 |
| PARTIAL | 16 | 25.0% | 有基础证据，但必须保留限制或补证据 |
| MISSING | 2 | 3.1% | 当前无足够材料，不能写实质结论 |
| HUMAN_DECISION_REQUIRED | 7 | 10.9% | 必须由产品负责人定义或裁决 |

- 已有内容覆盖率（READY + PARTIAL）：`55 / 64 = 85.9%`。
- 强证据可直接起草率（READY）：`39 / 64 = 60.9%`。
- 覆盖率只表示“存在可用材料”，不表示对应能力已实现或验证。

## 必须补的内容

以下内容会阻断相关章节形成可签字版本：

1. Phase 4 制作生态扩展的授权边界、目标与进入条件（Human Decision）。
2. 正式模型候选池、比较方案与 Final Selection（Model Eval + Human Decision）。
3. Latency、Cost、Reliability、Privacy、Observability 的最低目标或明确的“本阶段不设 SLA”裁决。
4. 公开 Demo Entry / Video。
5. External Artifact 的接受范围、信任等级和无法逆向恢复时的产品行为。

## 可后补内容

这些内容不阻断 Draft v0.1，但必须在相应段落标注限制：

- AImake V2.0、Cricut Design Space、Atomm 的完整实测与截图。
- Before / After 的真实任务对照与可用性证据。
- Key UI 的系统化截图、线框与状态覆盖。
- Semantic Eval、Workflow Eval、UX Eval。
- 完整 Failure Taxonomy 与产品级恢复策略。
- Demo 可用性测试、xTool Studio 文件层验证和真实制作验证。

## 当前不能写的内容

- 上线、用户增长、商业收益或效率提升百分比。
- 制造成功率、生产就绪或加工安全保证。
- xTool / Cricut / AImake 原生集成。
- 完全自治 Agent、Multi-Agent System、RAG / Memory 已实现。
- LLM as Judge 已实现。
- 已完成跨模型比较或 Final Model Selection。
- DeepSeek smoke 运行等于真实模型效果已验证。
- 未运行的 Model Eval、Semantic Eval、Workflow Eval 或 UX Eval 结果。

## Human Review Questions（最多 10 个）

1. Phase 1 的首要成功标准是什么：七步流程可理解、任务可完成，还是用户愿意继续使用？请只选一个主指标。
2. Phase 2 进入条件是否定义为“Contract Eval 可运行 + 最小 Semantic Eval Set 就绪”，还是还有必须满足的前置条件？
3. Phase 3 的核心评估对象优先级如何排序：Model 输出、Workflow 路径、Artifact 正确性、UX 任务成功？
4. Phase 4 的“制作生态扩展”具体允许扩展到哪里：文件导出兼容、Studio 操作指引，还是第三方集成探索？
5. External SVG 进入 MakerFlow 后，产品应承诺到什么编辑深度：只检查、有限结构化编辑，还是人工重建为 MakerFlow-native Artifact？
6. 正式 Model Candidate Pool 希望包含哪些候选；是否保留“只评 DeepSeek 是否足够”的精简方案？
7. Final Model Selection 的决策权重应如何排序：中文语义质量、结构化输出、延迟、成本、稳定性、供应商风险？
8. MVP 阶段是否需要设定数值型 NFR，还是先采用“记录实际值、完成基线后再定阈值”？
9. 用户项目数据默认是仅本地、会话级临时，还是允许项目级持久化？保留和删除政策由谁控制？
10. Full PRD v0.1 是否将“个人作品集 Demo”作为当前产品状态写入正文，还是仅放在 Truth Boundary 与 Appendix？

## Review Gate

Evidence Matrix 已于 2026-08-28 获得 Human 确认。

- [Full PRD Draft v0.1](01_makerflow_full_prd_v0.1.md)

在 Human 回答上述产品问题并审阅 Draft 前，不将 v0.1 标记为冻结版本。
