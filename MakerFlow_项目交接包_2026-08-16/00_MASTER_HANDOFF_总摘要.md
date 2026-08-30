# 00｜MASTER HANDOFF 总摘要

## 1. 问题背景

用户正在从工业设计 / AIGC设计方向，系统转向 **AI产品实习 / AI Product / Agent / AIGC方向**，项目属于“2027秋招｜JD简历面试系统”。

核心求职策略不是做一个“看起来像AI”的作品，而是用可解释、可运行、可评测的MakerFlow项目向面试官映射：

- AI产品拆解能力；
- 用户研究与MVP收敛；
- Agent工作流设计；
- Model / Tool / Rule / Human分工；
- Skill / Contract设计；
- Prompt迭代；
- AI PRD迭代；
- Eval评测；
- AI-native PRD；
- 事实证据与面试可追问性；
- 与工业设计/制作背景结合的复合优势。

目标岗位重点偏：
- AI产品实习生 / AI产品经理实习生；
- Agent/AIGC产品；
- 创作者工具 / 创意生产 / 制作工具；
- xTool类“AI如何成为创作者助手”的岗位尤其匹配。

---

# 2. 最终项目组合

长期作品集组合已确认：

1. **MakerFlow AI**：P0旗舰Agent项目。
2. **MomoRay AI Content OS**：P1真实商业项目AI化重构。
3. **Lingo Creator Copilot**：P1 AI交互/视觉证明。
4. **Laser-ready SVG Checker**：MakerFlow内部Tool，不单独作为第四主案例。

真实性边界：
- MomoRay模块化枕头是零动医疗初创团队真实0→1商业项目，已经开售。
- MomoRay AI Content OS是后续新建系统，不能冒充历史真实流程。
- Lingo原竞赛项目与2026 AI化重构必须分开叙述。
- MakerFlow、Checker等没有真实上线/使用/商业效果时，绝不能写“已上线、已采用、已提升xx%”。

---

# 3. MakerFlow最终定位

## 当前定位

> MakerFlow 是面向初级Maker/设计学生的可制作作品助手：把模糊想法转成结构化设计约束，生成/形成可编辑矢量作品，并在导出前完成确定性预检与问题路由。

更短表达：

> **从模糊想法到可编辑、可核验制作交接的Agent。**

关键价值不是“再做一个AI图片生成器”，而是：

- **Explicit**：关键约束显式化；
- **Editable**：作品可编辑；
- **Verifiable**：文件和约束可检查；
- **Traceable**：知道哪些是用户事实、AI建议、人工确认、哪个revision被检查。

---

# 4. 核心用户与单一MVP场景

目标用户：

> 有基础设计能力，但缺少完整制作交接经验的设计学生或初级Maker。

当前单一验证场景：

> **MomoRay模块化枕头包装内高度调节说明卡。**

这一场景是自证物，用于把“模糊需求 → 可编辑设计 → Preflight → Handoff”的闭环真实跑通。

---

# 5. 研究证据

已完成3名受访者研究：
- P01：设计学生/邻近用户，有CAD、SketchUp、3D打印等真实跨工具经历；
- P02：低经验平面/设计用户，部分为情境回答；
- P03：3D打印公司从业者，制作侧邻近用户。

三人不是xTool Studio专项用户，因此只能支持：
- 需求约束逐步暴露；
- 多工具切换；
- 上游问题可能到下游才发现；
- 文件问题与制作参数问题应分阶段处理；
- AI可以建议，但高影响信息要人确认；
- 需要明确人工确认和问题恢复路径。

不能据此证明：
- 具体SVG规则的市场频率；
- xTool Studio专项痛点；
- MakerFlow已经有效；
- 减少返工/时间；
- 用户付费意愿；
- 与xTool Studio原生集成是必要的。

---

# 6. 当前七步体验主流程

```text
1 Define
→ 2 Editable Brief
→ 3 Creative Plan
→ 4 Create & Edit
→ 5 Preflight
→ 6 Resolve Issues
→ 7 Export & Handoff
```

核心链路：

```text
User Input
→ Brief Candidate
→ Human Confirmed Brief
→ Creative Plan Candidate
→ Accepted Plan
→ Design Spec
→ SVG Renderer
→ Editable SVG
→ Preflight
→ Issue Routing
→ Human Gate / Fix / Recheck
→ Export + Studio Checklist
```

---

# 7. Model / Tool / Rule / Human的最终理解

- **Model**：处理模糊、开放、语义性的任务，如提取Brief、生成必要追问、生成Creative Plan。
- **Tool**：对明确输入做确定性操作，如SVG Renderer、SVG解析与导出。
- **Rule**：用确定性政策判断状态与路由，如Brief Validation、Issue Routing。
- **Human**：在高影响、责任归属、主观偏好、不可逆或真实世界风险处拍板。

核心原则：

> **概率性任务给Model；确定性执行/校验给Tool和Rule；高影响决策保留Human Gate。**

---

# 8. Brief / Plan / Design Spec / Artifact的职责

```text
Brief
= 我要什么 / 哪些是真实事实 / 哪些还未确认

Creative Plan
= 系统对尚未确定事项给出的候选建议、理由、优缺点和限制

Design Spec
= 已被接受、可用于实际渲染作品的结构化设计状态

Artifact / SVG
= 真正被用户看到、编辑、检查和导出的作品
```

重要：
- Step 2记录“是否需要视觉辅助、目的是什么”；
- Step 3推荐“具体使用图标/结构示意/简单插画等哪种方向”；
- Step 2/3不直接生成图片；
- Step 4才将已接受的建议固化到Design Spec并渲染SVG。

---

# 9. 当前最重要的状态模型

字段级Brief状态：
- `confirmed`
- `assumed`
- `missing`
- `needs_confirmation`

Brief整体生命周期：
- `draft`
- `ready_for_confirmation`
- `confirmed`
- `superseded`

`confirmed Brief` = 满足关键Gate且经过Human确认的某个Brief revision；不代表所有非关键字段都必须confirmed。

权限策略：
- `ACT`
- `ASK`
- `CONFIRM`
- `BLOCK`

注意：
- Recommendation不是第五种权限；
- AI可以ACT生成candidate，但candidate进入confirmed必须Human决定。

---

# 10. Revision最新决策

必须分开：

- `design_spec_revision`：设计意图/结构状态的版本；
- `artifact_revision`：实际SVG/PDF Artifact的版本。

Artifact记录：
- `source_design_spec_revision`

Preflight绑定：
- `checked_artifact_revision`

原则：

> **Design Spec revision跟踪设计意图变化；Artifact revision跟踪真实交付物变化。**

用户编辑后：
- Design Spec变化；
- Renderer生成新的Artifact revision；
- 旧Preflight先变为 `stale`；
- 重新Preflight后才能判断新的PASS/WARN/BLOCK。

---

# 11. External SVG最新决策

Design Spec不是所有路径永久Single Source of Truth。

新增：

```text
authoring_source:
- makerflow_spec
- external_artifact

design_spec_status:
- native
- derived_partial
- none
```

MakerFlow原生路径：
- Design Spec = authoring source of truth。

外部SVG路径：
- 外部SVG Artifact保持权威；
- 仅对可可靠解析部分建立derived partial spec；
- 禁止声称任何SVG都能100%恢复成完整Design Spec。

---

# 12. Output / PDF最新决策

Output Requirement增加：

```text
r+equirement_level:
- required
- preferred
- optional
```

如果Brief要求PDF为required，而当前Demo只生成SVG：
- SVG可以partial export；
- 整体handoff状态必须 `incomplete / blocked`；
- 不得偷偷把Brief从PDF要求改成SVG；
- 只有Human明确取消PDF要求后，创建新Brief revision，再重新计算Export Readiness。

如果PDF只是preferred：
- 可WARN，不必阻塞完整SVG导出。

---

# 13. 当前Skill体系

核心Skill目标为11个：

```text
brief.extract
brief.validate
brief.ask_missing

plan.generate

design_spec.build

svg.render
svg.file_check

brief.consistency_check
studio.readiness_check

issue.route

artifact.export
```

`issue.safe_fix` 已被用户否定进入当前MVP，应移至Future/Backlog，不属于Core Registry。

Skill定义：

> Agent可调用、具有稳定职责、明确输入输出和责任边界的能力单元。

区别：

```text
Task = 当前流程什么时候做
Skill = 系统会做什么
Contract = 这个能力怎么被调用
Tool/Model/Rule = Skill内部的实现或责任类型
```

---

# 14. Eval最新理解

Eval = AI产品的“考试题 + 判卷标准 + 可重复运行机制”。

四类：

1. Contract Eval：结构/硬规则是否符合Contract。
2. Semantic/Quality Eval：AI建议/理解质量是否符合Rubric。
3. Workflow/Agent Eval：Agent是否走对路径、调用对能力、遵守Human Gate。
4. UX Eval：真实用户是否理解状态、BLOCK、Next Step和PASS边界。

Eval资产链路：

```text
人工定义Case
→ Audit
→ 标准化Schema
→ cases.json
→ Runner
→ Baseline Report
→ Provider/Prompt变化后重复跑
→ Regression
```

文件类比：
- `cases.json` = 正式考试题库；
- `run_contract_evals.js` = 自动监考/判卷；
- `contract_eval_baseline_mock_v0.1.md` = 当前基线成绩；
- `README.md` = 这套考试怎么维护和运行。

Eval Case生命周期最新决策必须拆成：

```text
definition_status:
- draft
- reviewed
- approved

execution_status:
- manual_only
- runnable_local
- provider_required
- blocked

latest_run_status:
- not_run
- pass
- fail
- skipped
- error
```

不能只用一个`ready/status`。

---

# 15. AI PRD最新定位

PRD不是被Eval取代。

```text
PRD
= 产品应该怎样工作

Prototype
= 用户实际怎么操作

Task Graph / Contract / Schema
= 系统必须怎样协作

Eval
= 怎么证明AI/Agent真的按预期工作
```

MakerFlow要做 **AI-native PRD**，核心章节：

- Problem & Opportunity
- Target User & JTBD
- Evidence / Competitive Landscape
- Why AI / Why not traditional
- Goals：User/Product/Model/Eval
- Scope & Non-goals
- Product Experience / Prototype
- Task Graph / Skill Registry
- Data / State / Memory
- Model Strategy
- Prompt Strategy & Versioning
- Authority & Guardrails
- Eval Strategy
- Reliability / Recovery
- Functional Requirements
- NFR：Latency/Cost/Privacy/Observability
- Acceptance Criteria
- Risks / Open Questions
- Truth Boundary

当前没有fine-tuning：
- Training Dataset = N/A
- Eval Dataset必须单独建设。

---

# 16. Memory / Context最终学习深度

用户不需要成为后端基础设施工程师，但必须理解：

```text
Structured Project State
= 当前明确事实

Session Context
= 当前任务临时需要的信息

Decision Log / History
= 用户曾接受/拒绝什么、为什么

RAG / Retrieval
= 从外部资料检索知识

Artifact / Trace
= 哪个版本、哪个Prompt、哪个检查被实际运行
```

记忆架构核心不是“全存”，而是：
- 什么时候STORE；
- 什么时候RETRIEVE；
- 哪些信息逻辑EXPIRE；
- 哪种信息优先级最高。

推荐可信优先级：

```text
Human Confirmed State
>
Current Artifact / Latest Human Decision
>
Retrieved Knowledge
>
Past AI Suggestions
```

RAG不是Memory本身，不能拿向量库代替Structured State。

---

# 17. 当前最重要的学习重心

学习深度：

- Design Spec / Memory Architecture：★★★☆☆
- Skill / Contract：★★★★☆
- Eval：★★★★★
- AI PRD：★★★★★

目标不是成为Agent基础设施工程师，而是能：
- 理解系统结构；
- 定义产品行为；
- 判断AI/人/规则的权限；
- 组织Codex实现；
- 用Eval证明迭代；
- 用PRD统一所有决策。

---

# 18. 后续回答固定方法

每次出现新理论/任务，应使用：

1. 概念是什么？
2. MakerFlow里的具体例子？
3. 用户作为AI PM/开发者要懂到什么程度？
4. 必须亲自判断什么？
5. 具体应该怎么做？
6. Codex能替做什么？给直接可复制Prompt。
7. 验收标准是什么？

不要只讲抽象理论。