# MakerFlow Full PRD Evidence Matrix

> Version: v0.1
> Date: 2026-08-28
> Purpose: 在写 Full PRD 前，逐章确认已有事实、证据强度、缺失项和必须由 Human 裁决的产品问题。

## 使用规则

- Confidence：`HIGH` 表示有实现、测试、运行报告或多份一致文档；`MEDIUM` 表示有研究/设计材料但验证有限；`LOW` 表示只有局部材料或早期假设；`NONE` 表示无可用证据。
- Section Status：`READY`、`PARTIAL`、`MISSING`、`HUMAN_DECISION_REQUIRED`。
- “Existing Evidence”描述仓库当前可证明的内容，不等于章节最终文案。
- 用户在本轮冻结的 Canonical 定位、四阶段路线与 DeepSeek 实验 Provider 状态可作为 Human Ruling；仍需尽量附仓库证据。

## Evidence Matrix

| PRD Section | Required Content | Existing Evidence | Source File | Confidence | Missing | Needs Human Decision | Section Status |
|---|---|---|---|---|---|---|---|
| 00 Executive Summary | 产品、用户、价值、MVP场景、状态与边界 | Canonical 定位、单一场景、七步 SVG-first 流程、当前实现与非目标均已有一致材料 | `prototype/README.md`; `docs/product/10_MakerFlow_AI_PRD_v0.1.md`; `docs/product/04_MVP_Scope_v0.2.md` | HIGH | 无关键事实缺口 | 否 | READY |
| 1.1 场景 / 行业背景 | 从真实 Maker 制作流程解释问题，不写泛行业研报 | 三名邻近样本、AS-IS Journey、问题优先级均支持约束不完整、跨工具交接、问题后置暴露与版本负担 | `docs/product/02_ASIS_Journey_v1.0.md`; `docs/product/03_Problem_Priority_v1.0.md`; `research/W2-D03/` | HIGH | xTool Studio 专项用户与真实 SVG 错误频率【待补证据】 | 否 | READY |
| 1.2 Target User | 初级 Maker / 设计学生画像、边界和证据 | 目标用户已经冻结；研究样本与样本边界有记录 | `docs/product/01_JTBD_v1.0.md`; `docs/product/04_MVP_Scope_v0.2.md`; `docs/product/05_Evidence_Matrix_v1.0.md` | HIGH | 专项目标用户验证【待补证据】 | 否 | READY |
| 1.3 JTBD | 主任务、功能任务、情绪任务、触发和期望结果 | 已有独立 JTBD 文档并与 AS-IS / MVP 对齐 | `docs/product/01_JTBD_v1.0.md`; `research/W2-D03/V3-W2-D04_三人访谈综合_JTBD_ASIS_MVP范围_v0.1 (1).md` | HIGH | 长期使用与付费相关 JTBD【待补证据】 | 否 | READY |
| 1.4 Pain Points | 约束、交接、版本、验证和责任问题 | Problem Priority 将约束混杂、问题后置、导入误读、责任边界列为 P0；设计交接错误风险未遗漏 | `docs/product/03_Problem_Priority_v1.0.md`; `docs/product/02_ASIS_Journey_v1.0.md`; `docs/product/05_Evidence_Matrix_v1.0.md` | HIGH | 痛点频率和规模化程度【待补证据】 | 否 | READY |
| 1.5 Why AI / Why not traditional tool | 区分语义任务与确定性任务；解释组合架构 | PRD、Task Graph、责任矩阵明确 Model / Tool / Rule / Human 分工；传统矢量工具仍要求用户自己整理约束 | `docs/product/10_MakerFlow_AI_PRD_v0.1.md`; `docs/07.agent/06_Agent_Task_Graph_v1.0.md`; `docs/product/09_Human_AI_Responsibility_Matrix_v1.0.md` | HIGH | AI 相比表单的用户价值仍需实验【待补证据】 | 否 | READY |
| 1.6 Product Positioning | 独立 Web Assistant 与明确非定位 | Canonical 定位、MVP 与 Non-goals 已冻结；Prototype 是独立静态 Web Assistant | `prototype/README.md`; `docs/product/04_MVP_Scope_v0.2.md`; Human Ruling 2026-08-28 | HIGH | 无 | 否 | READY |
| 2.1 Competitor Scope | 竞品 / 生态对象选择、比较维度与证据边界 | 已研究 AImake V2.0、Illustrator、xTool Studio、Cricut Design Space、Atomm Projects，并注明不都是直接竞品 | `evidence/D05/05_W2-D01_创作到制作工作流研究.md`; `competitor/W2-D01_2x2机会图与综合结论_v1.0.md` | HIGH | 部分对象实测不足 | 否 | READY |
| 2.2 Detailed Comparison | 按用户、输入、AI、可编辑性、检查、输出、失败恢复详细比较 | 已有统一研究维度、AImake 初稿、2×2 与 xTool 边界；Cricut / Atomm 完整卡证据不足 | `evidence/D05/05_W2-D01_创作到制作工作流研究.md`; `competitor/V3-W2-D02_xTool生态能力边界拆解_v0.1.md` | MEDIUM | AImake / Cricut / Atomm 完整实测、截图、失败路径【待补证据】 | 否 | PARTIAL |
| 2.3 Common Gap | 基于多对象证据归纳共同缺口 | 已有“约束显性化、Pre-import / Studio 两段检查、以记录而非自动互通连接工具”的机会判断 | `competitor/W2-D01_2x2机会图与综合结论_v1.0.md`; `docs/product/10_MakerFlow_AI_PRD_v0.1.md` | MEDIUM | 共同缺口尚未由全部竞品实测支持【待补证据】 | 否 | PARTIAL |
| 2.4 MakerFlow Differentiation | 说明差异与不替代范围 | 已冻结为结构化约束、Editable Artifact、确定性 Preflight、Issue Routing、Human Gate；不替代设计或机器软件 | `competitor/W2-D01_2x2机会图与综合结论_v1.0.md`; `docs/product/04_MVP_Scope_v0.2.md`; `prototype/README.md` | HIGH | 差异是否被用户感知【待补证据】 | 否 | READY |
| 3.1 Product Form | 独立 Web Assistant、运行方式、单一场景 | Custom Web Prototype 可本地运行并支持静态部署；不需要 Coze | `prototype/README.md`; `prototype/` | HIGH | 公开部署地址【待补证据】 | 否 | READY |
| 3.2 Core Product Experience | Canonical 七步体验 | Define → Editable Brief → Creative Plan → Create & Edit → Preflight → Resolve Issues → Export & Handoff 已实现/映射 | `docs/product/10_MakerFlow_AI_PRD_v0.1.md`; `prototype/README.md`; `prototype/app.js` | HIGH | 真实用户理解度【待补证据】 | 否 | READY |
| 3.3 Core Functional Modules | Brief、Plan、Design Spec、Renderer、Preflight、Router、Export | MVP Scope、Skill Registry、Prototype 与测试提供模块级证据 | `docs/product/04_MVP_Scope_v0.2.md`; `docs/skills/07_Skill_Registry_v1.1.md`; `prototype/README.md` | HIGH | Model 模块仍需正式 Eval | 否 | READY |
| 3.4 Non-goals | 明确排除生成器、完整编辑器、设备控制、安全保证等 | 多份文档和 Prototype README 一致记录边界 | `docs/product/04_MVP_Scope_v0.2.md`; `docs/product/10_MakerFlow_AI_PRD_v0.1.md`; `prototype/README.md` | HIGH | 无 | 否 | READY |
| 3.5 Core User Journey | 主链路、分支、恢复与交接 | Task Graph 三条流、MVP 主流程和七步体验完整 | `docs/07.agent/06_Agent_Task_Graph_v1.0.md`; `docs/product/04_MVP_Scope_v0.2.md`; `docs/07_updated_main_flow.md` | HIGH | 用户任务测试【待补证据】 | 否 | READY |
| 3.6 Ask / Act / Confirm / Block | 权限状态、触发条件和越权边界 | 已有唯一权限状态、策略表、状态流和责任矩阵 | `docs/product/08_Ask_vs_Act_Policy_v1.0.md`; `docs/product/09_Human_AI_Responsibility_Matrix_v1.0.md` | HIGH | 少量旧冲突需按最新裁决清理 | 否 | READY |
| 3.7 Core State Objects | Brief、Plan、Spec、Artifact、Preflight、Decision Log 等 | Data Model、Schema、Project State 与 Artifact Manager 已提供对象和版本证据 | `docs/architecture/12_Data_Model_v0.1.md`; `schemas/*.json`; `prototype/data/project_state.json`; `prototype/artifact-manager.js` | HIGH | Retrieved Knowledge / Memory 不得写成已实现 | 否 | READY |
| 3.8 Before / After | 真实旧流程与目标流程对照 | AS-IS 和 TO-BE 结构可组织；尚无同一用户的真实前后对照 | `docs/product/02_ASIS_Journey_v1.0.md`; `docs/product/04_MVP_Scope_v0.2.md`; `research/testing/` | MEDIUM | 真实任务 Before / After、时间和错误对照【待补证据】 | 否 | PARTIAL |
| 3.9 Key UI | 关键页面、状态、操作与错误恢复 | Prototype 已有完整页面和 QA 状态；低保真测试材料存在 | `prototype/`; `research/testing/01_Lowfi_Test_Script.md`; `MakerFlow_项目交接包_2026-08-16/05_Demo_UX_开发与真实性规则.md` | MEDIUM | 系统截图、线框索引、可用性结果【待补证据】 | 否 | PARTIAL |
| 04 Phase 1 产品假设验证 | 八项阶段字段 | 单一场景、低保真 Prototype、研究与测试脚本可支撑 Goal / Scope / Validation Question；指标尚未冻结 | `docs/product/04_MVP_Scope_v0.2.md`; `research/testing/`; `prototype/README.md`; Human Ruling 2026-08-28 | MEDIUM | 主指标与阶段退出标准【待补证据】 | 是：选择 Phase 1 主指标 | PARTIAL |
| 04 Phase 2 Model能力接入 | 八项阶段字段 | DeepSeek Adapter、smoke runner、测试与成功 artifact 证明实验 Provider 链路可运行 | `providers/deepseek-model-provider.js`; `providers/brief-extract-smoke.mjs`; `prototype/tests/deepseek-provider.test.mjs`; `evals/artifacts/deepseek/brief_extract_smoke_5f0c0ba6-c363-4591-9832-74e66759f13a.json` | MEDIUM | Model Eval Set、进入 / 退出标准、更多任务覆盖【待补证据】 | 是：确认 Phase 2 Gate | PARTIAL |
| 04 Phase 3 体验与Eval闭环 | 八项阶段字段 | Contract Eval、生命周期 Schema、可用性脚本和迭代报告提供基础 | `docs/evals/`; `evals/contract/cases.json`; `evals/reports/`; `research/testing/` | MEDIUM | Semantic / Workflow / UX Baseline 与阶段指标【待补证据】 | 是：评估对象优先级 | PARTIAL |
| 04 Phase 4 制作生态扩展 | 八项阶段字段 | 仅有文件交接边界、Studio Checklist 和 Future `studio.handoff` 候选；无原生集成依据 | `docs/skills/07_Skill_Registry_v1.1.md`; `prototype/README.md`; `competitor/V3-W2-D02_xTool生态能力边界拆解_v0.1.md` | LOW | Goal、Scope、Product Form、Metrics 和进入条件均未冻结 | 是：定义生态扩展边界 | HUMAN_DECISION_REQUIRED |
| 5.1 为什么需要Agent能力 | 多步骤依赖、状态、分支、工具和人工门禁 | Task Graph 展示缺失循环、编辑循环、Preflight 恢复与不同执行者；不是完全自治 | `docs/07.agent/06_Agent_Task_Graph_v1.0.md`; `docs/product/09_Human_AI_Responsibility_Matrix_v1.0.md` | HIGH | 无关键缺口 | 否 | READY |
| 5.2 Agent Task Graph | 节点、边、分支、不变量和当前实现 | T01—T17、三条任务流和实现状态完整；T14 明确为 Future | `docs/07.agent/06_Agent_Task_Graph_v1.0.md` | HIGH | 无 | 否 | READY |
| 5.3 Core Skill Architecture | Skill 选择原则、Registry、Contracts、非 Skill 节点 | Registry v1.1 与 11 个 Contract 已存在；Human Gate 与纯 UI 不登记为 Skill | `docs/skills/07_Skill_Registry_v1.1.md`; `docs/skills/Skill_Contract/` | HIGH | 个别 Contract 的待确认重试策略 | 否 | READY |
| 5.4 Prompt Contract | Prompt 输入、输出、边界、版本与 Eval 映射 | `brief.extract` Prompt v0.1、Changelog 和 Contract 已存在 | `prompts/brief.extract/v0.1.md`; `prompts/brief.extract/CHANGELOG.md`; `docs/skills/Skill_Contract/brief.extract.contract.md` | HIGH | 其他 Model Skill Prompt 版本【待补证据】 | 否 | READY |
| 5.5 Workflow / Orchestration | 执行顺序、路由、并行、门禁和副作用 | Task Graph、Node I/O 与 Prototype workflow state 已有证据 | `docs/07.agent/06_Agent_Task_Graph_v1.0.md`; `docs/07.agent/06_node_io_matrix.md`; `prototype/workflow-state.js` | HIGH | 不得称完全自治 | 否 | READY |
| 5.6 Task间信息传递 | 对象、I/O、版本引用和 trace | Node I/O Matrix、Data Model、Provider Adapter 与 trace metadata 提供证据 | `docs/07.agent/06_node_io_matrix_v1.0.md`; `docs/architecture/12_Data_Model_v0.1.md`; `prototype/provider-adapter.js` | HIGH | 跨会话远程传递未实现 | 否 | READY |
| 5.7 State Management | 生命周期、当前指针、历史、失效传播 | Brief lifecycle、Project State、Artifact history、Preflight stale 和 Decision Log 已设计并部分实现 | `docs/architecture/12_Data_Model_v0.1.md`; `schemas/brief_state.schema.json`; `prototype/artifact-manager.js`; `prototype/decision-log.js` | HIGH | PRD 目标状态与 Demo 少量一致性缺口需如实写 | 否 | READY |
| 5.8 Artifact Identity | 内容身份、revision、来源 Spec 与 trace 分离 | Artifact Revision Schema、Manager 与自动测试覆盖 identity 和 trace | `schemas/artifact_revision.schema.json`; `prototype/artifact-manager.js`; `prototype/tests/artifact-manager.test.mjs` | HIGH | External Artifact 的 identity / trust 规则仍不完整 | 否 | READY |
| 5.9 Human Authority | Human Gate、WARN、最终事实和加工权限 | Ask-vs-Act、责任矩阵、Decision Log、WARN Gate 测试和 Baseline 一致 | `docs/product/08_Ask_vs_Act_Policy_v1.0.md`; `docs/product/09_Human_AI_Responsibility_Matrix_v1.0.md`; `prototype/tests/warn-human-gate.test.mjs` | HIGH | 无关键缺口 | 否 | READY |
| 5.10 Failure / Recovery | 分类、重试、降级、回退、用户提示 | Task Graph 和 Skill Contracts 有节点级 failure / retry；Prototype 有 BLOCK / WARN 恢复 | `docs/07.agent/06_Agent_Task_Graph_v1.0.md`; `docs/skills/Skill_Contract/`; `prototype/data/preflight_*.json` | MEDIUM | 产品级 timeout、重试次数、backoff、rollback 深度和统一错误 Envelope【待补证据】 | 否 | PARTIAL |
| 6.1 Evaluation Object | 区分 Contract、Model、Workflow、State、Authority、UX | Audit 与 Manifest 已按对象分类，且不把 Contract Eval 当 Model Eval | `docs/evals/01_contract_eval_audit_v0.1.md`; `docs/evals/02_contract_eval_manifest_v0.1.md`; `docs/product/10_MakerFlow_AI_PRD_v0.1.md` | HIGH | LLM as Judge 只能列 Future Option | 否 | READY |
| 6.2 Metrics | 各评估对象指标和阈值 | Contract pass/fail/skip 已有；产品、语义、UX 指标仍多为目标 | `evals/reports/`; `docs/product/04_MVP_Scope_v0.2.md`; `research/testing/03_Acceptance_Criteria.md` | MEDIUM | Semantic / Workflow / UX 指标、权重和阈值【待补证据】 | 否 | PARTIAL |
| 6.3 Evaluation Method | deterministic assertion、Human Review、实验方法 | Audit 已区分自动化分类和 Human Review；测试脚本与观察模板存在 | `docs/evals/01_contract_eval_audit_v0.1.md`; `evals/runners/run_contract_evals.js`; `research/testing/` | HIGH | Future LLM as Judge 不实现 | 否 | READY |
| 6.4 Eval Dataset | 正式 Case、fixtures、边界与版本 | 12 项 Provider-neutral Contract Dataset、Manifest 和 candidate case 已存在 | `evals/contract/cases.json`; `docs/evals/02_contract_eval_manifest_v0.1.md`; `docs/evals/makerflow_eval_cases_v0.1.md` | HIGH | Model / UX 数据集需补 | 否 | READY |
| 6.5 Eval Lifecycle | definition、execution、latest run 分离 | Schema 与 PRD 架构裁决已存在 | `schemas/eval_lifecycle.schema.json`; `docs/product/10_MakerFlow_AI_PRD_v0.1.md` | HIGH | 生命周期 UI / 运营流程未验证 | 否 | READY |
| 6.6 Baseline | 当前真实运行结果、版本变化与边界 | Contract Baseline v0.1—v0.4；最新 v0.4 为 7 PASS / 0 FAIL / 5 provider-required SKIP | `evals/reports/contract_eval_baseline_mock_v0.1.md`; `evals/reports/contract_eval_baseline_canonical_state_v0.2.md`; `evals/reports/contract_eval_baseline_warn_human_gate_v0.3.md`; `evals/reports/contract_eval_baseline_brief_validate_v0.4.md` | HIGH | 无真实 Model Baseline【待后续Model Eval】 | 否 | READY |
| 6.7 Failure Taxonomy | Model、Schema、Tool、Rule、State、Authority、Artifact、UX 失败分类 | Contract Cases 覆盖多个类别，Provider Adapter 有配置 / HTTP / Response / Schema 错误；尚无统一产品 taxonomy | `evals/contract/cases.json`; `providers/deepseek-model-provider.js`; `providers/brief-extract-smoke.mjs`; `docs/product/10_MakerFlow_AI_PRD_v0.1.md` | MEDIUM | 统一 Failure Taxonomy、severity 和 recovery mapping【待补证据】 | 否 | PARTIAL |
| 6.8 Eval-driven Iteration | Baseline → failure → change → regression | v0.1—v0.4 报告显示 canonical state、WARN gate、contract owner 逐步修复 | `evals/reports/`; `evals/runners/run_contract_evals.test.js` | HIGH | Model / UX 迭代尚未运行 | 否 | READY |
| 7.1 MakerFlow中的Model Tasks | 列出 T02、T04、T06 与可能的 T07；明确 Rule 边界 | Task Graph、Skill Registry 与 PRD 已定义 Model / future_model 节点 | `docs/07.agent/06_Agent_Task_Graph_v1.0.md`; `docs/skills/07_Skill_Registry_v1.1.md`; `docs/product/10_MakerFlow_AI_PRD_v0.1.md` | HIGH | 当前成功 smoke 只覆盖 `brief.extract` | 否 | READY |
| 7.2 Business / Technical Constraints | 质量、结构化输出、中文、延迟、成本、隐私、供应商风险 | Provider-neutral Contract、Schema 与守门规则清楚；数值约束未定义 | `docs/skills/Skill_Contract/`; `schemas/`; `docs/product/10_MakerFlow_AI_PRD_v0.1.md` | MEDIUM | 预算、延迟、隐私与稳定性阈值【待定义】 | 否 | PARTIAL |
| 7.3 Current Experimental Provider | DeepSeek 当前可运行范围与证据边界 | DeepSeek Provider、Adapter、tests、smoke runner 与一次 parsed + schema-valid artifact 存在；只支持 `brief.extract` 实验 | `providers/deepseek-model-provider.js`; `providers/brief-extract-smoke.mjs`; `prototype/tests/deepseek-provider.test.mjs`; `evals/artifacts/deepseek/brief_extract_smoke_5f0c0ba6-c363-4591-9832-74e66759f13a.json`; Human Ruling 2026-08-28 | HIGH | 该 artifact 使用 `deepseek-v4-flash`；正式型号口径与更多重复运行【待补证据】 | 否 | READY |
| 7.4 Evaluation Dimensions | 语义质量、Schema、事实边界、延迟、成本、稳定性 | PRD 已列维度，Contract / smoke 可记录 parse、schema、latency；尚无权重与阈值 | `docs/product/10_MakerFlow_AI_PRD_v0.1.md`; `providers/brief-extract-smoke.mjs`; `evals/artifacts/deepseek/` | MEDIUM | 权重、阈值、任务集与成本数据【待后续Model Eval】 | 是：确认排序原则 | PARTIAL |
| 7.5 Candidate Model Comparison | 候选池、统一任务、结果、成本和取舍 | 当前仅 DeepSeek 实验实现，无正式候选池或跨模型对比 | `providers/`; `evals/artifacts/deepseek/` | NONE | 候选模型、统一 Eval Set、重复运行和比较报告【待后续Model Eval】 | 是：定义 Candidate Pool | MISSING |
| 7.6 Final Selection | 选型结论、权重、理由和复审条件 | 无 Final Selection 证据；现有文档明确禁止提前宣称 | `docs/product/10_MakerFlow_AI_PRD_v0.1.md`; Human Ruling 2026-08-28 | NONE | 正式 Model Eval 与比较结果【待后续Model Eval】 | 是：最终裁决 | HUMAN_DECISION_REQUIRED |
| 7.7 Fallback Strategy | fail closed、保留状态、重试、人工路径和 Provider fallback | Adapter / Provider 有错误分类；PRD 规划保留输入与状态，允许稍后重试或手动完成 | `prototype/provider-adapter.js`; `providers/deepseek-model-provider.js`; `docs/product/10_MakerFlow_AI_PRD_v0.1.md`; `docs/skills/Skill_Contract/` | MEDIUM | timeout、retry、backoff、切换条件和错误 Envelope【待定义】 | 是：确认自动切换权限 | PARTIAL |
| 8.1 Technology Stack | Custom Web 技术、静态运行、Provider / Eval 边界 | HTML / CSS / JS 静态 Prototype、Node tests、JSON Schema、Provider Adapter 与本地 Runner 可确认 | `prototype/README.md`; `prototype/`; `providers/`; `evals/runners/` | HIGH | 生产部署栈不在当前范围 | 否 | READY |
| 8.2 Demo Minimum Standard | 可运行、可演示、错误可见、证据可复现 | README、QA 模式、自动测试和当前七步流程提供基础；公开验收标准未冻结 | `prototype/README.md`; `research/testing/03_Acceptance_Criteria.md`; `prototype/tests/` | MEDIUM | 面试 Demo 最低稳定性、浏览器范围和数据重置规则【待补证据】 | 否 | PARTIAL |
| 8.3 E2E User Path | 从 Define 到 Export / Handoff 的完整路径 | 七步流程、Task Graph 与 Prototype 均可映射 | `prototype/README.md`; `docs/product/10_MakerFlow_AI_PRD_v0.1.md`; `docs/07.agent/06_Agent_Task_Graph_v1.0.md` | HIGH | 公开 E2E 录屏【待补证据】 | 否 | READY |
| 8.4 Key Prompt | 核心 Prompt、输入、输出、版本、边界 | `brief.extract` Prompt v0.1 与 Changelog 已存在；DeepSeek smoke 引用同版本 | `prompts/brief.extract/v0.1.md`; `prompts/brief.extract/CHANGELOG.md`; `providers/brief-extract-smoke.mjs` | HIGH | 其他 Model Skill Prompt | 否 | READY |
| 8.5 Key Workflow | Brief、Plan、Spec、Artifact、Preflight、Router、Export | Task Graph、Node I/O 与 Prototype 形成一致链路 | `docs/07.agent/06_Agent_Task_Graph_v1.0.md`; `docs/07.agent/06_node_io_matrix.md`; `prototype/README.md` | HIGH | 无关键缺口 | 否 | READY |
| 8.6 Demo Entry / Video | 公共入口、视频、二维码、版本和访问说明 | 仅有本地运行和静态部署教程，没有已验证公开 URL / Video | `prototype/README.md` | NONE | Demo URL、视频、二维码、版本说明【待补证据】 | 否 | MISSING |
| 8.7 Known Limitations | Mock、Provider、文件、Studio、安全与验证边界 | README、PRD Truth Boundary、Skill Contracts 完整记录 | `prototype/README.md`; `docs/product/10_MakerFlow_AI_PRD_v0.1.md`; `docs/skills/Skill_Contract/` | HIGH | 需同步 DeepSeek 已成为实验 Provider的新事实 | 否 | READY |
| 8.8 Demo Validation | 自动测试、Contract Eval、任务 / UX 测试 | Prototype tests、Contract Baseline 与低保真脚本存在；用户验证未完成 | `prototype/tests/`; `evals/reports/`; `research/testing/` | MEDIUM | E2E 用户测试、浏览器测试与公开部署检查【待补证据】 | 否 | PARTIAL |
| 9 Latency | 目标、测量点、基线和预算 | Provider Adapter 与 smoke artifact 记录 latency；产品阈值未定义 | `prototype/provider-adapter.js`; `providers/brief-extract-smoke.mjs`; `evals/artifacts/deepseek/` | LOW | 【待定义】端到端 / 节点目标与统计口径 | 是 | HUMAN_DECISION_REQUIRED |
| 9 Cost | 单次调用、任务、项目预算和告警 | 旧 PRD 明确为待确认；无真实成本基线 | `docs/product/10_MakerFlow_AI_PRD_v0.1.md` | NONE | 【待定义】预算、计量和降级策略 | 是 | HUMAN_DECISION_REQUIRED |
| 9 Reliability | timeout、retry、error rate、availability、rollback | 节点级错误和测试存在，但没有产品 SLA 或统一恢复策略 | `docs/skills/Skill_Contract/`; `prototype/tests/`; `docs/product/10_MakerFlow_AI_PRD_v0.1.md` | LOW | 【待定义】目标、重试、幂等、回滚和可用性口径 | 是 | HUMAN_DECISION_REQUIRED |
| 9 Privacy | 数据收集、存储、保留、删除、脱敏与供应商发送 | 用户研究有脱敏规则；产品数据政策未定义 | `research/W2-D03/模板/00_研究说明与招募标准.md`; `docs/architecture/14_Context_Memory_Architecture_v0.1.md`; `docs/product/10_MakerFlow_AI_PRD_v0.1.md` | LOW | 【待定义】产品级数据政策与 Provider 传输边界 | 是 | HUMAN_DECISION_REQUIRED |
| 9 Observability | Model、Rule、Tool、Eval、state、trace 事件 | Provider Adapter、Artifact Manager 与 Decision Log 有 trace；整体事件模型和保留策略未定义 | `prototype/provider-adapter.js`; `prototype/artifact-manager.js`; `prototype/decision-log.js`; `docs/architecture/14_Context_Memory_Architecture_v0.1.md` | LOW | 【待定义】事件、日志级别、敏感字段、保留与告警 | 是 | HUMAN_DECISION_REQUIRED |
| 10 Risks / Open Questions / Truth Boundary | 三种状态及六类指定风险 | 旧 PRD、Non-goals、External SVG 边界、Ask-vs-Act 与 Provider 错误提供大量材料 | `docs/product/10_MakerFlow_AI_PRD_v0.1.md`; `prototype/README.md`; `docs/product/08_Ask_vs_Act_Policy_v1.0.md`; `providers/deepseek-model-provider.js` | MEDIUM | External Artifact trust 等级、unsupported capability UX 和风险 owner【待补证据】 | 是：确认剩余 open questions | PARTIAL |
| 11 Appendix | 研究、竞品、Graph、Contracts、Prompt、Eval、Architecture、UI 索引 | 所有类别均有仓库目录和文件 | `research/`; `evidence/`; `competitor/`; `docs/07.agent/`; `docs/skills/`; `prompts/`; `evals/`; `docs/architecture/`; `prototype/` | HIGH | 需要在 Draft 阶段生成稳定链接索引 | 否 | READY |

## Status Summary

| Status | Count | Share |
|---|---:|---:|
| READY | 39 | 60.9% |
| PARTIAL | 16 | 25.0% |
| MISSING | 2 | 3.1% |
| HUMAN_DECISION_REQUIRED | 7 | 10.9% |
| Total | 64 | 100.0% |

已有内容覆盖率（READY + PARTIAL）：`55 / 64 = 85.9%`。

## Truth Boundary Notes

1. 当前 Contract Eval Baseline 与 DeepSeek smoke 是两条证据线；前者主要验证 Contract / State / Authority，后者只证明一个实验 Provider 请求可以得到 parsed、schema-valid 的 `brief.extract` 输出。
2. 现有 Context & Memory Architecture 是架构草案，不能据此声称 RAG / Memory 已实现。
3. `Studio Readiness Checklist` 读取项目状态，不等于调用或原生集成 xTool Studio。
4. 通过当前 Preflight 不等于生产就绪、材料兼容、制造成功或加工安全。
5. External SVG 只支持有限结构化编辑；不得承诺完整逆向恢复 Design Spec。
