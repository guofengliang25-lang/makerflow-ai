# MakerFlow Full AI Product PRD v0.2

> Status：Decision-granularity Draft，等待 Human Review
> Date：2026-08-28
> Product Form：独立 Web Assistant
> MVP Validation Scenario：MomoRay 模块化枕头高度调节说明卡

## 文档状态与阅读方式

本文不是作品集摘要。每项核心设计尽量回答：问题是什么、为什么重要、证据在哪里、产品如何决策、为什么不选其他方案、具体 Case、错误实现和验收方法。

| Tag | Meaning |
|---|---|
| Implemented | 有可运行实现、测试、输出文件或运行报告 |
| Planned | 已形成设计或冻结路线，但没有完整运行证据 |
| Hypothesis | 仍需用户研究、实验或市场证据验证 |
| 【待补证据】 | PRD 需要该事实，但仓库证据不足 |
| 【待Human Decision】 | 必须由产品负责人裁决 |
| 【待后续Model Eval】 | 已有实验能力，但尚无正式模型评估 |

> Product Decision
> MakerFlow 的产品定位固定为“可制作作品助手”，不因文档出现 Agent、Workflow、Skill、Eval 或 Provider 而升级为 OS、平台或 Multi-Agent 产品。

---

## 00 Executive Summary

### What

MakerFlow 是面向初级 Maker / 设计学生的可制作作品助手：把模糊想法转成结构化设计约束，形成可编辑矢量作品，并在导出前完成确定性预检与问题路由。

```text
Idea
→ Structured Constraints
→ Editable SVG Artifact
→ Deterministic Preflight
→ Issue Routing
→ Human-controlled Handoff
```

### Why

初级 Maker 的问题并非只缺一张视觉图。他们需要把用途、尺寸、内容、材料方向、文件角色和制作路径组织成一致状态，并确保检查报告对应当前作品版本。直接生成视觉结果无法证明作品可编辑、可交接或满足制作前约束。

### Evidence

- 三名邻近样本支持约束不完整、跨工具负担、问题后置和人工确认需求；样本不是 xTool Studio 专项用户。
- Prototype v0.2 已实现本地 SVG-first 七步流程中的 Rule / Tool / UI 主体。
- Contract Eval v0.1—v0.4 记录了 Canonical State、WARN Authority 和 Contract Owner 的修复演进。
- DeepSeek 仅有 `brief.extract` 实验 Provider 与 smoke artifact，不构成模型选型结论。

### Product Definition

| Item | Decision |
|---|---|
| Target User | 有基础设计意识、缺少完整制作交接经验的设计学生 / 初级 Maker |
| MVP Case | MomoRay 模块化枕头高度调节说明卡 |
| Main Artifact | 可编辑 SVG；不是一次性图片 |
| System Boundary | 本地导出文件，不控制机器，不原生连接 xTool / Cricut / AImake |
| AI Boundary | Model 做语义候选；Rule / Tool 做确定性执行；Human 掌握事实和风险权限 |
| Validation Goal | 先验证链路是否可理解、可操作、可恢复，再扩大 Model 和制作生态 |

### Acceptance

MVP 只有在以下条件同时成立时，才能被描述为“产品链路成立”：

1. 用户能从模糊输入形成可编辑 Brief；
2. Artifact 修改后产生新 revision；
3. 旧 Preflight 自动 stale；
4. BLOCK 无法绕过；
5. WARN 只可由 Human 对当前 revision 确认；
6. 导出对象与 checked Artifact 相同；
7. 页面明确提示“通过当前规则不等于生产就绪或加工安全”。

---

## 01 业务背景

### 1.1 初级 Maker 的真实设计制作链

#### What

目标任务不是“生成一张图”，而是完成 Idea → Design → File → Handoff：

| Stage | User needs to decide | Typical artifact | Failure consequence |
|---|---|---|---|
| Idea | 为谁、做什么、必须表达什么 | 零散描述 / 参考 | 目标含混，系统凭假设继续 |
| Design | 形式、尺寸、层级、风格、内容 | Brief / 设计稿 | 事实和视觉方向混杂 |
| File | SVG / PDF 角色、文字、尺寸、刀线 | 可编辑文件 | 文件能看但无法正确交接 |
| Handoff | 版本、检查、材料、设备与人工确认 | 文件 + 检查 + Checklist | 旧文件、旧报告或错误安全感进入下游 |

#### Why

初级 Maker 可以会设计软件，却未必具备完整交接知识。真正困难的是让每个决策在下游仍保持一致：尺寸不能在 Brief 是 A6、SVG 却是另一个尺寸；作品修改后，旧报告不能仍显示 PASS。

#### Evidence

现有 AS-IS Journey 与问题优先级支持：初始约束不完整、状态混杂、工具切换、问题后置暴露、导入状态误读和人工责任不清。Evidence Level 为 MEDIUM：研究来自三名邻近样本，其中部分经验来自 3D 制作，不能外推 SVG 问题频率。

#### Case 01｜MomoRay 说明卡从一句话开始

用户输入：“帮我做一张 MomoRay 枕头高度调节说明卡。”

此时系统并不知道：成品 / 展开尺寸、单页或折页、必须文案、模块数量是否已确认、是否需要刀线、印刷 PDF 是否 required。错误实现会直接给出视觉稿，把缺失信息伪装成设计决定。

> Product Decision
> MakerFlow 先建立 Brief State，再进入 Creative Plan 和 Artifact；不能从 Idea 直接跳到最终文件。

#### Acceptance

- 输入缺少关键字段时进入 ASK；
- 未提供事实保持 missing / needs_confirmation；
- 不自动填 A6、材料、文案或机器参数；
- 每个字段保留来源证据。

### 1.2 AI 生成与可制作作品之间的断层

#### What / Why

AI 生成结果通常回答“看起来像什么”，而可制作作品还要回答：是否可编辑、尺寸和单位是否明确、文字如何处理、是否含位图、刀线是否闭合、文件是否对应最新设计意图、未确认项由谁负责。

#### Scenario Table

| Generated result | Missing production evidence | Product risk |
|---|---|---|
| 一张视觉效果图 | 无 SVG path / text / unit evidence | 用户误以为能直接制作 |
| 一个 SVG | 未必符合 Brief 或当前尺寸 | “有文件”被理解为“文件正确” |
| 一份 PASS 报告 | 若绑定旧 revision 则已失效 | stale verification |
| 文件成功导入 | 未确认材料、设备、参数和 Framing | false manufacturing confidence |

> Product Decision
> SVG 必须作为从一开始即可编辑、可版本化、可检查的主 Artifact；PNG / JPG 只作为素材或参考，不采用“生成位图 → 自动转 SVG”主链路。

> Why
> 该方案能让 Design Spec、Artifact Revision 和 Preflight 形成可追溯关系。位图转 SVG 会引入新的不可控推断，并掩盖真实编辑结构。

#### Boundary / Bad Case

- 复杂外部 SVG 不承诺完整逆向恢复 Design Spec；
- “能解析”不等于“符合 Brief”；
- “通过 Preflight”不等于“安全加工”。

#### Acceptance

- 当前作品能被用户看到和有限编辑；
- Artifact 记录 `source_design_spec_revision`；
- Preflight 记录 `checked_artifact_revision`；
- UI 显示文件检查与 Studio 人工事项的区别。

### 1.3 设计交接为什么容易失败

#### What

设计交接是多个事实对象的同步问题，不只是发送文件。

```text
Confirmed Brief
        ↓
Design Spec → Artifact Revision → Preflight Report
        ↓              ↓                ↓
 output requirements  file identity   checked revision
        └──────────── Handoff Completion ────────────┘
```

#### Case 02｜修改标题位置后仍导出旧 PASS

用户在通过检查后拖动标题。若系统只保存页面状态、不生成新 Artifact Revision，旧 PASS 仍可能允许导出。实际导出的作品已经不是被检查对象。

> Product Decision
> Artifact 内容变化必须产生新 revision；旧 Preflight 与旧 WARN confirmation 立即 stale。

> Risk
> 如果只用“最后保存时间”判断，Trace Event、重复保存和真实内容变化会被混为一谈。

#### Acceptance

- 内容未变的重复 persist 不增加 revision；
- 内容变化增加 revision；
- Trace Event 可增加但不影响 Artifact identity；
- stale report 禁止 Export。

### 1.4 为什么值得解决

该问题值得解决，不是因为已证明商业规模，而是因为它同时具备：

1. 明确用户任务：从不完整想法到可交接矢量文件；
2. 可观察失败：缺失约束、冲突、stale、BLOCK、WARN；
3. 适合组合 AI：语义理解与确定性校验边界清楚；
4. 可构建验证闭环：Prototype、Artifact、Preflight 和 Eval 都能留下证据；
5. 高风险误解：制造信心不能由“生成成功”替代。

当前不能声称 MakerFlow 已降低返工、提升效率或具有付费价值。这些仍是 Hypothesis。

### 1.5 Why AI，以及哪些环节坚决不用 AI

| Task | Use Model? | Why | Final authority |
|---|---:|---|---|
| 从自然语言提取 Brief 候选 | Yes | 输入表达多样，需语义归纳 | Human confirms |
| 把缺失字段转成中性追问 | Yes | 语言表达需上下文 | Rule supplies missing set |
| 生成 Creative Plan 候选 | Yes | 需要开放式候选与取舍 | Human accepts / edits |
| Schema / enum / required field | No | 必须可重复、可测试 | Rule |
| SVG Renderer | No | 同一 Spec 应得到相同 Artifact | Tool |
| SVG parse / size / duplicate ID | No | 确定性文件事实 | Tool / Rule |
| BLOCK / WARN route | No | 不能被概率输出改写 | Rule |
| 接受 WARN | No | 风险权限不可代理 | Human |
| 材料 / 功率 / 速度 / 安全参数 | No | 高风险且依赖真实环境 | Human / operator |

> Product Decision
> MakerFlow 的 AI 价值是把开放语义转成候选结构，不是替代确定性系统和 Human Authority。

#### Bad Case

让 LLM 判断 SVG 是否有重复 ID、是否允许导出，或者自动接受 WARN，会把可测试规则变成概率判断，并模糊责任。

#### Evaluation

- Model 输出必须通过 Schema；
- confirmed 事实不能被覆盖；
- Rule 结论不随 Provider 改变；
- E12 用于验证 Provider 替换不改变 Contract / Graph / Human Gate。

### 1.6 Product Positioning

> Product Decision
> MakerFlow 是独立 Web Assistant，不是 AI Native OS、通用 Agent Platform、Multi-Agent System、单纯 Workflow Tool 或 AI Image Generator。

| In scope | Out of scope |
|---|---|
| 单一制作场景的结构化约束 | 通用创意平台 |
| 可编辑 SVG Artifact | 完整矢量编辑器 |
| 导出前确定性 Preflight | 专业 CAM / 材料测试 |
| Issue Routing 与 Human Gate | 设备控制和安全保证 |
| 本地文件 Handoff | xTool / Cricut / AImake 原生集成 |

---

## 02 竞品分析

### 2.1 Competitor Scope 与研究边界

研究对象按工作流角色选取，而非按“AI”标签选取。AImake V2.0 代表 AI 创作到制作相关入口，Cricut Design Space 代表设计到纸张裁切闭环，Atomm 代表项目发现与复用。Illustrator / Inkscape 和 xTool Studio 作为编辑与制作软件参照。

Evidence Level：AImake 有官方资料与研究初稿；Cricut、Atomm 有研究对象和维度，但完整实测不足。以下结论不得写成市场普遍事实。

### 2.2 AImake V2.0

| Question | Current finding |
|---|---|
| 用户是谁 | 面向激光雕刻、切割和打印相关创作者【基于官方资料】 |
| 核心任务 | 从文字 / 图片创意获得更接近制作的设计结果 |
| AI 在哪介入 | 生成、主动建议下一步、矢量化 / 轮廓 / 优化相关动作【具体行为待实测】 |
| 最终 Artifact | 文件 / 项目类型与可编辑深度【待补证据】 |
| 到制作环节停在哪里 | 官方面向制作场景；导出、检查、Studio 交接细节【待补证据】 |
| MakerFlow 能学习什么 | 主动建议下一步、把制作语境前置 |
| MakerFlow 不应该学什么 | 不能只靠“主动建议”形成差异，不能把官方 claim 当真实效果 |
| 可能遗漏 | Editable Brief、责任边界、revision-bound verification 是否存在【待补证据】 |

#### Case 03｜“主动建议”不是产品差异本身

如果 AImake 已会建议矢量化或轮廓优化，MakerFlow 不能把“AI 会告诉你下一步”作为核心差异。差异应落在：建议依据是否可见、关键约束是否已确认、执行结果是否可编辑、检查证据是否绑定当前 Artifact。

### 2.3 Cricut Design Space

| Question | Current finding |
|---|---|
| 用户是谁 | 使用 Cricut 进行设计与制作的创作者【待实际体验】 |
| 核心任务 | 设计、Print Then Cut、校准和机器制作流程【待实际体验】 |
| AI 在哪介入 | 【待补证据】 |
| 最终 Artifact | Cricut 项目 / 打印裁切输出【待补证据】 |
| 到制作环节停在哪里 | 可进入 Cricut 设备流程，但具体 Gate 与恢复路径【待补证据】 |
| MakerFlow 能学习什么 | 设计到机器流程的阶段化、校准与明确操作反馈 |
| MakerFlow 不应该学什么 | 不复制封闭设备生态，也不假装拥有设备状态 |
| 可能遗漏 | 模糊需求到结构化 Brief、跨工具 Artifact truth【待补证据】 |

#### Boundary

当前不能写 Cricut 的 AI 能力、错误频率或用户效果。完整体验、截图和官方帮助证据为【待补证据】。

### 2.4 Atomm / AImake Projects

| Question | Current finding |
|---|---|
| 用户是谁 | 从 Maker 项目和案例寻找灵感 / 复用路径的用户【待实测】 |
| 核心任务 | 发现、查看、复用和进入制作项目 |
| AI 在哪介入 | 【待补证据】 |
| 最终 Artifact | 项目、素材、步骤或可制作文件的具体组合【待补证据】 |
| 到制作环节停在哪里 | 材料、步骤、文件与设备衔接【待补证据】 |
| MakerFlow 能学习什么 | 从真实案例启动任务，减少空白页负担 |
| MakerFlow 不应该学什么 | 不把社区内容直接升级为用户产品事实 |
| 可能遗漏 | 用户自己的约束状态、版本、Preflight 与 Human Authority【待补证据】 |

### 2.5 Comparison Table

| Dimension | AImake | Cricut Design Space | Atomm | MakerFlow Decision |
|---|---|---|---|---|
| Start point | Text / image idea | Design / machine project | Existing project / inspiration | Ambiguous task + facts + references |
| Editable intermediate | 【待验证】 | 【待验证】 | 【待验证】 | Brief + Plan + SVG Artifact |
| Deterministic validation | 【待验证】 | Calibration / machine checks【待验证】 | 【待验证】 | File + Brief consistency + readiness |
| Revision truth | 【待验证】 | 【待验证】 | 【待验证】 | Artifact identity + checked revision |
| Human authority | 【待验证】 | Machine operation requires human | 【待验证】 | Explicit Confirm / WARN / Export gates |
| Ecosystem | xTool / Atomm context | Cricut closed loop | Maker community | Local file handoff; no native integration |

### 2.6 Common Gap → Opportunity → Differentiation

```text
Common Gap
约束、Artifact、检查证据和风险权限常分散在不同阶段
        ↓
Opportunity
在最终导出前建立一条可追溯、可编辑、可复检的作品链
        ↓
MakerFlow Differentiation
Structured Constraints
+ Editable SVG Artifact
+ Revision-bound Preflight
+ Issue Routing
+ Human Authority
```

> Product Decision
> MakerFlow 不竞争完整生成、完整编辑或完整设备控制；它验证的是这些环节之间的 truth continuity。

#### Acceptance

竞品章节只有在每条判断都区分“官方信息 / 实际体验 / Product Interpretation / 待验证”时才通过审查。

---

## 03 产品方案

### 3.1 Product Form

Custom Web Prototype，原生 HTML / CSS / JavaScript，主 Artifact 为 SVG。当前可本地运行并适合静态部署；不采用 Coze。

> Product Decision
> 选择 Custom Web 是为了直接控制 Artifact、revision、Preflight 和 UI 状态，而不是为了证明工程栈复杂度。

### 3.2 Canonical 7-Step Scenario

#### Case 04｜MomoRay 说明卡 E2E

```text
“做一张枕头高度调节说明卡”
→ 发现尺寸 / 形式 / required outputs 缺失
→ 用户确认 Brief r1
→ 选择 Creative Plan
→ Design Spec ds-r1
→ Render Artifact a-r1
→ 用户移动标题 → Artifact a-r2
→ 旧 Preflight stale
→ 对 a-r2 重新检查
→ Resolve BLOCK / WARN
→ Human 对 a-r2 确认 WARN
→ 导出 a-r2 SVG + handoff completion
```

#### Step 1｜Define

| Field | Definition |
|---|---|
| User Goal | 把零散需求交给系统整理，而不是自己先填完整专业表单 |
| Trigger | 新任务、补充回答、参考或已有文件进入 |
| Input | 自然语言、产品事实、参考、附件 |
| System Action | 建立 `task_input`；区分来源；不补造事实 |
| Human Action | 提供已知信息，决定是否提供敏感内容 |
| Output | Versioned task input / source evidence |
| State Change | 创建或更新任务上下文，不产生 confirmed Brief |
| Failure | 来源丢失、参考被当成事实、输入无法解析 |
| Gate | 无事实确认权；进入 T02 前保留原始输入 |
| Acceptance | 明确数字和来源可追溯；缺失不被默认填充 |

#### Step 2｜Editable Brief

| Field | Definition |
|---|---|
| User Goal | 看清已知、未知、假设和冲突 |
| Trigger | `task_input` 可用或用户补充回答 |
| Input | task input、schema、existing confirmed context |
| System Action | 提取候选；Rule 校验；显示字段状态 |
| Human Action | 编辑字段并确认关键约束 |
| Output | `brief_revision` with lifecycle |
| State Change | draft → ready_for_confirmation → confirmed / superseded |
| Failure | Model 改数字、默认 A6、把 assumed 升级 confirmed |
| Gate | T03 deterministic validation + T05 Human confirm |
| Acceptance | E01 / E02 / E03 / E04 相关约束满足 |

#### Step 3｜Creative Plan

| Field | Definition |
|---|---|
| User Goal | 对尚未确定的设计方向获得有依据的候选 |
| Trigger | Brief 达到确认 Gate |
| Input | confirmed Brief + unresolved non-critical constraints |
| System Action | 生成 recommendation、basis、benefit、tradeoff、confidence |
| Human Action | 接受、修改或拒绝候选 |
| Output | selected / edited Creative Plan |
| State Change | AI suggestion 不能自动成为 confirmed fact |
| Failure | 重复建议已确认尺寸；生成产品事实；跳到图片 |
| Gate | 只处理未确定约束；Human accepts |
| Acceptance | E05；所有建议有依据和取舍 |

#### Step 4｜Create & Edit

| Field | Definition |
|---|---|
| User Goal | 获得可见、可编辑的真实 SVG 作品 |
| Trigger | confirmed Brief + accepted Plan |
| Input | Brief、Plan、Design Spec rules |
| System Action | Build Design Spec；pure Renderer 输出 SVG |
| Human Action | 使用控件 / 拖动修改作品 |
| Output | Artifact Revision + source Design Spec Revision |
| State Change | 修改 Design Spec 或 SVG 产生新 Artifact identity |
| Failure | 让用户编辑 JSON；把 trace 当内容变化；错误逆向外部 SVG |
| Gate | Design Spec Schema / Renderer contract |
| Acceptance | 同一 Spec 同一 Renderer version 产生相同 SVG；identity tests 通过 |

#### Step 5｜Preflight

| Field | Definition |
|---|---|
| User Goal | 在导出前知道确定性问题和仍需人工确认的事项 |
| Trigger | 当前 Artifact 可解析，用户发起检查 |
| Input | current Artifact、confirmed Brief、Project State、rule version |
| System Action | File Check + Consistency Check + Readiness Checklist |
| Human Action | 阅读结果，不把 PASS 理解为加工安全 |
| Output | Preflight Report bound to checked Artifact Revision |
| State Change | current report becomes fresh for checked revision |
| Failure | 检查旧文件；用 LLM 替代规则；从 SVG 猜材料参数 |
| Gate | checked revision 必须等于 current revision |
| Acceptance | E07 / E08 / E09；报告含 evidence 与 boundary |

#### Step 6｜Resolve Issues

| Field | Definition |
|---|---|
| User Goal | 知道在哪修、谁负责、修完怎么继续 |
| Trigger | Preflight 返回 BLOCK / WARN / INFO |
| Input | issues + current state + authority policy |
| System Action | 生成 resolution stage、owner、next step、route |
| Human Action | 去对应阶段修复或明确确认 WARN |
| Output | 修复路径 / Decision Log / recheck request |
| State Change | 修复产生新 Artifact；旧报告和确认 stale |
| Failure | 所有问题都只说 retry；让 WARN confirmation 跨 revision 复用 |
| Gate | BLOCK 不可确认绕过；WARN 需 current-revision Human decision |
| Acceptance | E10 / E11；恢复后可重新检查 |

#### Step 7｜Export & Handoff

| Field | Definition |
|---|---|
| User Goal | 导出与刚刚检查、确认的同一份作品 |
| Trigger | Human 发出导出请求 |
| Input | current Artifact、current Preflight、WARN records、output requirements |
| System Action | 验证门禁；生成本地 SVG 与摘要 / completion |
| Human Action | 触发下载；进入 Studio 后完成 Checklist |
| Output | SVG export + check summary + handoff status |
| State Change | 记录导出事件，不改变 Artifact identity |
| Failure | 导出旧 revision；required PDF 缺失却显示 complete |
| Gate | 无 BLOCK、无未确认 WARN、checked=current |
| Acceptance | 导出内容摘要与当前 Artifact identity 一致 |

### 3.3 Core Modules and Ownership

| Module | Model | Tool | Rule | Human |
|---|---:|---:|---:|---:|
| Brief candidate | Primary | — | Validate | Confirm |
| Creative Plan | Primary | — | Filter confirmed fields | Accept / edit |
| Design Spec | Future semantic assist | — | Schema / hard constraints | Approve through artifact editing |
| SVG Artifact | — | Render / export | Identity / gate | Edit / trigger export |
| Preflight | — | Parse / inspect | Compare / route | Resolve / confirm WARN |
| Studio readiness | — | — | Read explicit state | Set real environment facts |

### 3.4 Non-goals and Bad Cases

| Non-goal | Bad implementation | Product consequence |
|---|---|---|
| 通用图片生成 | 从 Prompt 直接出视觉终稿 | 跳过 constraint / artifact truth |
| 完整矢量编辑器 | 在 MVP 复制 Illustrator | 范围失控，无法验证核心判断 |
| 自动安全参数 | LLM 推荐功率 / 速度 | false manufacturing confidence |
| 原生 Studio 集成 | UI 显示“已同步 Studio” | 虚构能力和责任 |
| 自动修复全部问题 | 系统静默修改文件 | 用户失去 Artifact control |
| Multi-Agent | 把每个 Skill 包装成 Agent | 架构名词替代真实执行边界 |

### 3.5 Key UI and Acceptance

| UI | Critical state | Acceptance |
|---|---|---|
| Define | source / missing | 原始输入和来源可追溯 |
| Brief Editor | confirmed / assumed / missing / needs_confirmation | 状态不可被 Model 静默升级 |
| Plan Decision | basis / tradeoff | 用户能拒绝建议 |
| Canvas | current artifact revision | 编辑后 revision 可见变化 |
| Preflight | checked revision / stale | stale 时不能 Export |
| Issue Panel | owner / stage / next step | 用户知道去哪修 |
| Export | completion / unsupported output | required PDF 缺失不显示 complete |

---

## 04 版本迭代

| Phase | Goal | Core scope | Validation question | Metrics | Why this order | Risk |
|---|---|---|---|---|---|---|
| 1 产品假设验证 | 验证七步链路可理解、可完成、可恢复 | 单一 Case + Mock Model + deterministic core | 用户能否从模糊输入完成已验证 SVG？ | 【待Human Decision：唯一主指标】 | 先验证问题和体验，避免过早做 Model / integration | Mock 被误认为真实 AI |
| 2 Model 能力接入 | 验证真实 Provider 不破坏 Contract | 优先 `brief.extract`，再扩展 T04 / T06 | 输出是否忠实、合法、不过权？ | Schema、fact、semantic、latency、cost【阈值待定义】 | Contract 先于模型，控制不可重复性 | Hallucination / structured output failure |
| 3 体验与 Eval 闭环 | 建立 failure → change → regression | Contract / Semantic / Workflow / UX | 改进是否提升任务且不破坏 Authority？ | 分对象指标 | 有真实输出后才能评语义和体验 | 为过测试修改 Expected |
| 4 制作生态扩展 | 【待Human Decision】 | 文件兼容 / Studio guidance 边界待定 | 【待Human Decision】 | 【待Human Decision】 | 核心链路稳定后再扩展 | 虚构集成、制造信心越界 |

> Product Decision
> 阶段顺序由“先验证产品问题，再引入概率能力，再建立评估闭环，最后扩大外部边界”决定，不按功能数量或日历周数排序。

## 05 AI Agent能力与执行机制

### 5.1 Agent 与固定 Workflow 的关系

#### What

MakerFlow 需要 Agent 能力，是因为任务包含缺失循环、工具调用、状态变化、Human Gate 和失败恢复；但主路径和权限边界是固定的。

```text
Agent capability = context-aware choice inside bounded Task Graph
Fixed Workflow   = allowed nodes, dependencies, gates and recovery routes
```

#### Why

如果只做线性 Workflow，系统无法根据 missing / BLOCK / WARN / stale 返回正确节点；如果做完全自治 Agent，Model 可能自行改变流程、越过 Rule 或替用户接受风险。

> Product Decision
> MakerFlow 采用“固定 Task Graph + 有限 Agent 决策”：Graph 冻结允许的任务和权限，Agent 能力只在候选提取、追问表达、Recommendation 与合法路由中发挥作用。

#### Case 05｜缺少尺寸时不是继续生成

T02 可提取“尺寸未知”，T03 确定性判断 critical missing，T04 生成中性追问，T05 等待 Human。Agent 不能因为目标是“尽快完成”而跳过 T05。

#### Boundary / Acceptance

- Provider 变化不改变 T01—T17；
- Human Gate 不变成 Skill；
- Rule 节点不由 Model 覆盖；
- E12 验证替换 Provider 时 Graph / Contract / Authority 不变。

### 5.2 Agent Task Graph

```text
T01 Intake
 ↓
T02 Extract Brief ─→ T03 Validate ─missing→ T04 Ask Missing ─→ T01/T02
                              └ready→ T05 Confirm Brief
                                         ↓
T06 Generate Plan → T07 Build Spec → T08 Render SVG
                                         ↓
                                  T09 Human Edit ─┐
                                         ↓       │ new revision
T10 File Check + T11 Consistency + T12 Readiness │
                    ↓                            │
               T13 Route Issues                 │
        BLOCK ───────────────→ Fix / T09 ───────┘
        WARN  ─→ T15 Human Confirm
        PASS / confirmed WARN
                    ↓
              T16 Export → T17 Studio Checklist
```

| Flow | Core question | State invariant | Recovery |
|---|---|---|---|
| A Brief loop | 信息是否足够且已确认？ | Model candidate ≠ confirmed Brief | 回到补充输入 |
| B Artifact loop | 当前作品是否对应当前意图？ | Artifact records source Spec revision | 编辑后新 revision |
| C Preflight loop | 当前作品能否进入导出？ | checked revision = current revision | Route → fix → recheck |

### 5.3 11 Core Skills

| Skill | Input | Output | Owner form | Deterministic | Main gate / boundary |
|---|---|---|---|---:|---|
| `brief.extract` | task_input + schema + confirmed context | brief_candidate | Model | No | 不确认、不补造、不生成 Plan |
| `brief.validate` | brief_candidate + rules | validation result | Rule | Yes | 唯一硬校验 owner |
| `brief.ask_missing` | missing / conflict set | questions | Model | No | 问法可变，缺口集合不可变 |
| `plan.generate` | confirmed Brief + unresolved fields | recommendations | Model | No | 不重复 confirmed、不决定事实 |
| `design_spec.build` | Brief + Plan + schema | design_spec | Current Rule | Yes now | 未来 Model 只可语义映射 |
| `svg.render` | design_spec | SVG | Tool | Yes | pure render，不管理 revision |
| `svg.file_check` | SVG + purpose rules | file issues | Tool / Rule | Yes | 不判断审美 / 材料安全 |
| `brief.consistency_check` | Artifact + confirmed Brief | mismatch issues | Rule | Yes | 不验证产品事实真实性 |
| `studio.readiness_check` | explicit project state | checklist issues | Rule | Yes | 不从 SVG 猜设备状态 |
| `issue.route` | issues + authority policy | route / owner / next steps | Rule | Yes | 不替 Human 生成确认 |
| `artifact.export` | current Artifact + fresh report + decisions | SVG + summary + completion | Tool | Yes | BLOCK / WARN / stale gate |

#### Why Skill Contract exists

Prompt、Provider、Rule 实现和 UI 都会变化。没有 Contract，模型升级可能偷偷改变字段、权限和错误行为，使 Eval 失去稳定对象。

> Product Decision
> Skill Contract 固定单一职责、I/O、前置 / 后置条件、failure、retry、Human approval 和 Non-goals；Provider 和 Prompt 只能在 Contract 内迭代。

#### Bad Case

把“确认 Brief”登记成 Skill，会让系统看起来可以调用一个自动确认能力；把“Preflight”做成一个模糊万能 Skill，会丢失三种检查的不同 truth source。

#### Acceptance

- 11 个 Skill ID 稳定；
- 非 Skill 节点明确；
- 每个 Skill 有可追溯 Contract；
- Registry、Task Graph、Node I/O 与实现状态不矛盾。

### 5.4 Model / Tool / Rule / Human职责

| Actor | Owns | Must not own | Why |
|---|---|---|---|
| Model | 候选提取、追问表达、开放式 Recommendation | confirmed facts、hard validation、risk acceptance | 概率能力不适合最终事实和硬门禁 |
| Tool | 文件解析、Renderer、检查执行、本地导出 | 材料推断、业务事实、Human decision | 执行应忠实于输入和权限 |
| Rule | Schema、状态、冲突、severity、route、gate | 创意表达、主观审美 | 确定性边界可复现和回归 |
| Human | 事实、Brief、Plan、WARN、Export、加工 | 不应被系统默认代签 | 高影响决策必须有责任主体 |

### 5.5 Task间传递的State

| From → To | Object | Required identity | Forbidden mutation |
|---|---|---|---|
| T01 → T02 | task_input | source + raw intent | 丢失原始数字 / 来源 |
| T02 → T03 | brief_candidate | prompt / provider / run metadata | 自动变 confirmed |
| T03 → T05 | validated candidate | rule version + critical status | Model 覆盖 validation |
| T05 → T06 | confirmed brief_revision | actor + decision record | 后续建议改写事实 |
| T06 → T07 | Creative Plan | basis + tradeoff + selected state | 未接受建议进入 Spec |
| T07 → T08 | design_spec_revision | schema / rule version | Renderer 修改 Spec |
| T08 → T09/T10 | artifact_revision | content identity + source spec | Trace 改变 identity |
| T10–T12 → T13 | issues / report | checked_artifact_revision | 检查对象不明 |
| T15 → T16 | decision record | issue + current artifact revision | 跨 revision 复用 |

### 5.6 Prompt Contract Case：`brief.extract` v0.1

#### Prompt objective

从 `task_input` 中提取结构化 `brief_candidate` 事实候选。它不确认 Brief、不补全缺失事实、不生成 Plan / Design Spec / Artifact。

#### Input / Output

```json
{
  "task_input": {
    "user_text": "MomoRay说明卡，产品由3个模块组成，尺寸还不知道"
  },
  "brief_candidate_schema": "<runtime JSON Schema>",
  "existing_confirmed_context": []
}
```

期望语义示例（字段名以 runtime schema 为准）：

```json
{
  "brief_revision": 1,
  "lifecycle": "draft",
  "fields": [
    {
      "id": "module_count",
      "value": 3,
      "status": "needs_confirmation",
      "source": "user_input"
    },
    {
      "id": "finished_size",
      "value": null,
      "status": "missing",
      "source": "not_provided"
    }
  ]
}
```

#### Constraints

- 原样保留用户数字、数量、尺寸和单位；
- 区分 user input、reference、attachment、supplement；
- existing confirmed context 只读；
- 字段状态只能使用 Schema 允许值；
- 输出只包含严格 JSON；
- Model candidate 后续仍需 T03 / T05。

#### Forbidden

- 把未知尺寸补为 A6；
- 把 3 个模块改成其他数量；
- 补造产品结构、枕高、材料、颜色或文案；
- 把参考自动升级为产品事实；
- 生成 Creative Plan、SVG、PDF 或图片；
- 决定机器参数；
- 替 `brief.validate` 或 Human Gate 工作。

#### Uncertainty handling

| Condition | Expected status |
|---|---|
| 用户未提供 | missing |
| 合理推测但无直接证据 | assumed + basis |
| 有冲突 / 歧义 / 需选择 | needs_confirmation + evidence |
| 既有 confirmed 与新输入冲突 | 保留 confirmed，记录 conflict candidate |
| 用户明确给出业务值 | 保留值，但不自动变 confirmed |

#### Few-shot status

Prompt v0.1 当前没有正式 few-shot examples。不能虚构示例优化效果。后续是否加入 few-shot 必须由具体 Eval Failure 触发，例如 E01 默认尺寸、E03 数字保持或 E04 业务值 / 状态混淆。

#### Edge cases

| Edge case | Expected behavior | Related Eval |
|---|---|---|
| “尺寸不知道” | missing；不得 A6 | E01 |
| “产品由3个模块组成” | 保留 3 + user_input；不得 confirmed | E03 |
| “需要示意图” | 业务值可 required；具体形式未决定 | E04 |
| Provider 返回 malformed JSON | parsed_output=null；fail closed | E06 |

#### Current known issues

- v0.1 是 baseline，`optimized=false`；
- Prompt 文档建立时没有真实 Provider Baseline；
- 当前已有一次 DeepSeek smoke，但不足以评价 Prompt 质量；
- schema validator / orchestrator gate 的完整产品接入仍需核对；
- 没有 Prompt v0.2，不得写优化结果。

#### Iteration rule

```text
real eval failure or approved contract decision
→ identify one prompt variable
→ create versioned candidate
→ run target eval
→ run E01/E03/E04 + contract regression
→ compare improvement and regression
→ keep or rollback
```

> Product Decision
> Prompt 版本只能由 Failure、Contract、Schema 或 Human Authority 裁决触发；不能为了“看起来更好”无证据改写。

### 5.7 Decision Cases D1–D9

#### D1｜Brief vs Creative Plan

| Item | Detail |
|---|---|
| Problem | 产品事实与设计建议混在同一对象，AI 建议可能被误当事实 |
| Alternatives | A 一个综合“设计方案”；B Brief 与 Plan 分离 |
| Decision | Brief 管事实 / 约束状态；Plan 只管理未确定约束的候选 |
| Why | 两者 truth source、authority 和生命周期不同 |
| Risk | UI 看起来步骤更多；用户可能不理解差异 |
| Eval | E05 不重复 confirmed；用户测试能否区分事实与建议 |

> Product Decision
> D1 采用分离对象，不允许 Plan 静默写回 confirmed Brief。

#### D2｜Design Spec vs Artifact

| Item | Detail |
|---|---|
| Problem | 内部结构化意图与真实交付文件被当成同一个对象 |
| Alternatives | A 只存 Spec；B 只存 SVG；C Spec + Artifact 分离 |
| Decision | Design Spec 表示创作意图；Artifact 表示真实可见 / 可交付内容 |
| Why | 外部 SVG、手工编辑、Renderer version 都会让两者不再等价 |
| Risk | 需要维护 source revision 和映射 |
| Eval | Artifact 必须记录 source Spec；Preflight 检查 Artifact 而非只检查 Spec |

> Product Decision
> D2 采用双对象，最终交付 truth 以 Artifact 为准。

#### D3｜Renderer pure function

| Item | Detail |
|---|---|
| Problem | Renderer 同时改状态、生成文件和管理 revision，结果不可复现 |
| Alternatives | A 有副作用 Renderer；B pure Renderer + Artifact Manager |
| Decision | Renderer 只执行 Design Spec → SVG；持久化 / identity 由 Artifact Manager 负责 |
| Why | 分离后可测试、可替换、可判断内容是否真正变化 |
| Risk | 调用方必须正确持久化结果 |
| Eval | 相同 Spec + Renderer version 产生相同 SVG；Renderer 不写 Project State |

> Product Decision
> D3 Renderer 不拥有 revision、Preflight 或 Human Gate。

#### D4｜Artifact Identity

| Item | Detail |
|---|---|
| Problem | 用时间戳或 UI 操作次数判断作品版本会产生假 revision |
| Alternatives | A timestamp；B every save；C canonical content identity |
| Decision | 使用稳定内容与来源信息计算 identity，排除易变 trace 字段 |
| Why | 只有真实内容变化才应使检查失效 |
| Risk | canonicalization 不完整可能产生 false same / false change |
| Eval | `artifact-manager.test.mjs` 覆盖 identity 与 trace 分离 |

> Product Decision
> D4 Artifact identity 由作品内容定义，不由保存动作定义。

#### D5｜Revision vs Trace Event

| Item | Detail |
|---|---|
| Problem | 重复保存、查看或导出被误算成新作品版本 |
| Alternatives | A 每事件增 revision；B revision 与 trace 分离 |
| Decision | 内容变化增 revision；所有可观测动作可增 Trace Event |
| Why | Revision 回答“作品是什么”，Trace 回答“发生了什么” |
| Risk | 两条时间线在 UI / debug 中需正确关联 |
| Eval | 同 identity persist：revision 不变，trace count 增加 |

> Product Decision
> D5 Trace 不能触发 Preflight stale，除非 Artifact 内容变化。

#### D6｜Preflight stale

| Item | Detail |
|---|---|
| Problem | 旧报告被用于新 Artifact |
| Alternatives | A 用户手动重检提醒；B revision-bound automatic stale |
| Decision | Report 绑定 checked revision；current revision 改变即 stale |
| Why | 验证证据只能证明被检查对象 |
| Risk | 频繁编辑带来重复检查成本 |
| Eval | E10：编辑后 export=false，必须 recheck |

> Product Decision
> D6 stale 是硬状态，不是普通提示。
> 
#### D7｜WARN Human Authority

| Item | Detail |
|---|---|
| Problem | WARN 可继续，但系统无权替用户接受风险 |
| Alternatives | A 自动继续；B 一次项目级确认；C revision-bound Human confirmation |
| Decision | Human 对 issue + current Artifact Revision 明确确认 |
| Why | 风险对象改变后旧接受无效 |
| Risk | 用户产生 confirmation fatigue |
| Eval | E11；未确认不能 Export，新 revision 需重新确认 |

> Product Decision
> D7 BLOCK 不可确认绕过；WARN 才进入 Human Authority。

#### D8｜PDF required but unsupported

| Item | Detail |
|---|---|
| Problem | Brief 要求 PDF，但当前只验证 / 导出 SVG |
| Alternatives | A 阻止所有导出；B 假装浏览器打印是 Verified PDF；C partial SVG export + incomplete handoff |
| Decision | 允许导出已验证 SVG 部分，但整体 handoff blocked / incomplete |
| Why | 不隐藏已完成价值，也不伪造 unsupported capability |
| Risk | 用户误以为 partial export 等于任务完成 |
| Eval | completion 显示缺失 PDF；只有 Human 取消 requirement 并产生新 Brief revision 才重算 |

> Product Decision
> D8 required output 缺失影响 handoff completion，不得被 Tool 静默降级。

#### D9｜External SVG truth boundary

| Item | Detail |
|---|---|
| Problem | 外部 SVG 没有 MakerFlow Design Spec，结构和来源不可信 |
| Alternatives | A 完整逆向恢复；B 拒绝所有外部文件；C sanitize + limited edit + partial / none Spec status |
| Decision | 采用 C；External Artifact 是 truth source，不承诺完整逆向 |
| Why | 既支持真实文件入口，又不虚构可恢复语义 |
| Risk | 用户期望完整编辑；恶意 / 复杂 SVG |
| Eval | sanitize script / event / foreignObject / external link；明确 unsupported structure route |

> Product Decision
> D9 External SVG 可以被检查，不等于成为 MakerFlow-native Artifact。

### 5.8 Failure / Recovery Principles

| Failure | Owner | Recovery | Must preserve |
|---|---|---|---|
| Provider unavailable | Provider / Orchestrator | retry later / manual path | input + confirmed state |
| Invalid JSON | Adapter | fail closed | raw output + error |
| Schema invalid | Validator | return to Model step | no state write |
| SVG malformed | File Check | external design tool / replace file | original file evidence |
| Brief conflict | Human + Rule | edit / reconfirm Brief | conflict sources |
| Stale report | Workflow State | rerun Preflight | old report history |
| Unconfirmed WARN | Human | confirm or fix | current revision |
| Unsupported PDF | Product boundary | partial SVG + incomplete | required output status |

统一 timeout、backoff、自动重试次数和 rollback 深度仍为【待Human Decision】。

# 06 AI 产品评估体系

## 6.1 为什么评估

MakerFlow 的风险不是单一的“回答不够好”。一次任务可能同时发生语义遗漏、结构不合法、状态失真、验证过期和权限越界。只看最终 SVG 是否“像一张说明卡”，无法判断系统是否保留了用户事实、是否在错误版本上预检，也无法证明导出结论可信。

> Product Decision
> 评估对象拆成 Contract、Model / Semantic、Workflow / State / Authority、UX / Task 四类；当前基线只证明已实际运行的 Contract 条目，不外推为模型质量或用户价值。

| Eval Type | 解决的问题 | 主要对象 | 当前状态 | 不能推出 |
|---|---|---|---|---|
| Contract Eval | 接口、状态、门禁是否按 Canonical 运行 | schema、revision、gate、adapter | Implemented；部分用 mock，部分需 provider | 真实模型好用 |
| Model / Semantic Eval | 模型是否正确提取、保留和表达事实 | Brief、Plan 文本与结构 | 部分 case 已定义；系统性基线未完成 | 已完成模型选型 |
| Workflow / State / Authority Eval | 顺序、失效、确认权是否正确 | Task Graph、Preflight、Human Gate | 核心规则已有 Contract evidence | 端到端用户体验优秀 |
| UX / Task Eval | 用户能否理解、修改并完成交付 | 7 步体验、问题路由、导出 | 【待补证据】 | 用户采用、效率收益 |

### Why this decision

四类 Eval 对应四种不同失败责任。若把它们合并成一个总分，Contract PASS 可能掩盖语义错误，视觉满意度也可能掩盖 stale report。分层后，失败才能被路由到 Prompt、Rule、Workflow 或 UI，而不是笼统归因于“模型”。

## 6.2 Evaluation Object 与 Metrics

| Object | Metric / Signal | Method | Acceptance | Evidence Level |
|---|---|---|---|---|
| Brief Candidate | required field recall、事实保留、unknown 处理 | schema + case assertion + 人工复核 | 不编造；缺失项保持可追问 | MEDIUM |
| Creative Plan | 与 confirmed Brief 一致、不过早写 Spec | deterministic assertion + review | 不覆盖确认事实 | MEDIUM |
| Design Spec | schema valid、尺寸映射一致 | validator | 可被 renderer 消费 | HIGH（contract） |
| Artifact | SVG parse、尺寸、结构、artifact_id / revision | file check + contract | 文件合法且身份可追踪 | HIGH（contract） |
| Preflight Report | report revision 对齐、ERROR/WARN 分类 | deterministic rules | stale 不得导出 | HIGH（contract） |
| Issue Route | owner / fix path / rerun path 完整 | route assertion | 每项问题有明确下一步 | MEDIUM |
| Human Gate | WARN 未确认时阻断，确认事件可追踪 | state transition test | authority 不被 model 越权 | HIGH（contract） |
| E2E Task | 完成率、理解成本、返工点 | moderated task test | 【待Human Decision】 | NONE |

当前不设 SLA、模型准确率或用户成功率数字；没有已运行数据时统一标记【待补证据】。

## 6.3 E01–E12 Dataset Classification

分类用于决定测试价值，不代表当前全部已由真实 Provider 跑过。

| Eval | Class | Evaluation Object | 核心问题 | Method | Current Truth |
|---|---|---|---|---|---|
| E01 | Edge | Brief Extract | 缺尺寸时是否保持 unknown 并追问 | provider + schema / semantic assertion | Provider-required；不计入当前 Contract PASS |
| E02 | Regular | Brief → Spec | A6 映射是否保持确定尺寸 | deterministic contract | 已运行 |
| E03 | Regular | Brief Extract | MomoRay 产品事实是否原样保留 | provider + semantic assertion | Provider-required |
| E04 | Edge | Brief Extract | 视觉支持需求是否被正确结构化 | provider + semantic assertion | Provider-required |
| E05 | Regular | Plan | Plan 是否避免覆盖 confirmed size | mock / deterministic assertion | 已运行 |
| E06 | Bad | Provider Adapter | 非法 JSON 是否 fail closed | invalid response fixture | 已运行 |
| E07 | Bad | SVG File Check | malformed SVG 是否阻断 | malformed fixture | 已运行 |
| E08 | Bad / Edge | Consistency | Brief 与 Artifact 尺寸冲突是否暴露 | deterministic check | 已运行 |
| E09 | Edge | Readiness | 材料未确认是否成为 WARN / route | deterministic rule | 已运行 |
| E10 | Edge | Lifecycle | 编辑后旧 Preflight 是否 stale | state transition | 已运行 |
| E11 | Edge | Authority | WARN 是否必须由 Human 确认 | gate transition | 已运行 |
| E12 | Edge | Provider Contract | 替换 provider 是否保持统一返回格式 | adapter contract | 已运行；不代表候选模型质量相同 |

### Case 06｜E01：用户没有给出卡片尺寸

- Input：制作 MomoRay 高度调节说明卡，但未说明物理尺寸。
- Expected：`brief.extract` 保留已知内容，将尺寸保持 unknown，并触发 Ask Missing。
- Bad Case：擅自填 A6，再把它写成 confirmed。
- Acceptance：schema valid；无无来源数字；missing field 可被下一 Task 消费。

### Case 07｜E06：Provider 返回非法 JSON

- Expected：adapter 返回错误，不写入 Brief State，不继续生成 Plan。
- Bad Case：从残缺文本“猜”出字段并推进流程。
- Acceptance：fail closed；raw response / error 可观察；已有 Contract case 覆盖。

### Case 08｜E10：用户编辑 Artifact 后直接导出

- Expected：revision 增加，旧 Preflight 标记 stale，导出被 Block 并提示重新检查。
- Bad Case：沿用旧报告，制造“已验证”的假象。
- Acceptance：report.artifact_revision 不等于 current revision 时不可视为有效。

### Case 09｜E11：只有 WARN，没有 ERROR

- Expected：系统解释 WARN；Human 可 Fix 或显式 Accept；未选择前不可自动放行。
- Bad Case：模型替用户接受风险。
- Acceptance：存在可审计的 Human confirmation event，且绑定当前 revision。

## 6.4 Evaluation Method

| Layer | Automation | Human Review | Output |
|---|---|---|---|
| Schema / Contract | 必须 | 失败时抽查 | pass / fail / skipped + evidence |
| Semantic Preservation | 可部分自动化 | 必须，直至形成可靠标注规范 | field-level judgment |
| State / Authority | 必须 | 只复核边界设计 | transition trace |
| Visual / Usability | 不宜只靠自动分数 | 必须 | observation + bad case |

LLM as Judge 当前不实现。它只属于 Future Evaluation Options，启用前必须定义 rubric、judge model、人工一致性校准和成本边界；不得回填为现有能力。

## 6.5 Eval Lifecycle

```text
Case Definition
  -> Fixture / Provider Input
  -> Run
  -> Assertion
  -> Result Artifact
  -> Failure Classification
  -> Owner Routing
  -> Fix
  -> Regression Run
  -> Baseline Update
```

三个状态必须分开：

| State | Meaning | Example |
|---|---|---|
| definition_status | case 是否定义完整 | E01 已定义 |
| execution_status | 是否在当前环境真正执行 | provider-required case 可为 skipped |
| latest_run_status | 最近一次实际运行结果 | PASS / FAIL / SKIPPED_PROVIDER_REQUIRED |

> Risk
> 把 SKIPPED 当 PASS 会把“没有执行”伪装成“能力已验证”。

## 6.6 Current Baseline

| Baseline | Total | PASS | FAIL | SKIPPED_PROVIDER_REQUIRED | Interpretation |
|---|---:|---:|---:|---:|---|
| Contract Baseline v0.4 | 12 | 7 | 0 | 5 | 7 个已执行 Contract case 通过；5 个 provider-required case 未运行 |

### Case 10｜如何阅读 7 / 12

正确表达是“当前 Contract baseline 中 7 PASS、0 FAIL、5 SKIPPED_PROVIDER_REQUIRED”。错误表达是“MakerFlow 准确率 100%”或“模型通过 12 项测试”。该 baseline 不能证明 Brief 提取质量、视觉质量或真实用户价值。

## 6.7 Failure Taxonomy 与 Bad Case Record

| Failure Class | Typical Signal | Owner | Next Action |
|---|---|---|---|
| Input ambiguity | required field unknown | Human / Brief Skill | Ask Missing |
| Hallucinated fact | 无来源数字或约束 | Prompt / Model | prompt fix + semantic regression |
| Structured output instability | JSON / schema invalid | Adapter / Model | fail closed + retry policy |
| State inconsistency | revision / identity 不匹配 | Workflow / Rule | block + recompute |
| Artifact invalidity | SVG parse / structure fail | Renderer / File Check | rerender or external fix |
| False manufacturing confidence | 把 format check 写成安全保证 | Copy / Product boundary | downgrade claim + block unsupported |
| Authority violation | 自动接受 WARN | Workflow | require Human event |
| Unsupported capability | PDF / machine integration 被暗示为完成 | Product / UI | expose incomplete status |

```yaml
bad_case_id: BC-XXX
source_eval: E01-E12
input_snapshot: <immutable reference>
expected_behavior: <contract>
actual_behavior: <observed only>
failure_class: <taxonomy>
artifact_id: <if applicable>
revision: <if applicable>
evidence_path: <log / result artifact>
owner: <model | tool | rule | workflow | human | product>
proposed_change: <not yet a result>
regression_case: <new or existing case>
status: open | fixed_unverified | verified
```

## 6.8 Eval-driven Iteration

> Product Decision
> 只有“失败证据 → 责任层 → 修改对象 → 回归 case”闭环完成，才算一次有效迭代；修改 Prompt 后未重跑，不得写成已改善。

| Failure | Change Candidate | Mandatory Regression |
|---|---|---|
| E01 编造尺寸 | Prompt constraint / example | E01 + 所有 numeric preservation cases |
| E06 非法 JSON | adapter / retry policy | E06 + provider contract |
| E08 尺寸冲突漏检 | consistency rule | E02 + E08 |
| E10 stale 未触发 | revision lifecycle | E10 + export gate |
| E11 自动放行 | authority rule / UI | E11 + trace event |

系统性 Model Eval、用户任务测试与 bad case 累积样本均为【待补证据】。

# 07 大模型选型

## 7.1 MakerFlow 中的 Model Tasks

模型适合把自然语言中的意图和约束整理成候选结构，也可生成 Creative Plan 草案；它不负责确定性尺寸校验、SVG 解析、revision 对齐、Preflight 结论或 Human WARN 决策。

| Task | Model Role | Current Provider Truth | Deterministic Guard |
|---|---|---|---|
| brief.extract | task_input → brief_candidate | DeepSeek experimental path 可运行 | JSON parse + schema validation |
| plan.generate | confirmed Brief → plan candidate | 主体验仍依赖受控路径；真实 provider 证据不足 | Brief consistency check |
| 其他 9 Skills | 非全部需要模型 | 不得声称 DeepSeek 已覆盖 | Tool / Rule / Human contracts |

## 7.2 为什么先用 DeepSeek 跑通

> Evidence
> 仓库已存在 DeepSeek provider adapter、配置路径和一次 `brief.extract` 成功 smoke artifact；另有缺少 API key 的配置错误 artifact。

> Product Decision
> DeepSeek 仅作为 Current Experimental Provider，用于验证 provider contract 和最小真实调用链，不是 Final Selection。

选择它先跑通的原因是当前代码与实验入口已存在，可用较低接入成本验证“真实 Provider 是否能返回可解析、schema-valid 的 Brief Candidate”。这项选择没有证明其语义准确率、稳定性、成本优势或生产适配性。

### Case 11｜成功 smoke 的正确解释

- Model：`deepseek-v4-flash`。
- Observed：一次 `brief.extract` 调用完成，约 1174 ms，响应可解析且 schema valid。
- Can claim：实验 Provider 路径可以运行。
- Cannot claim：真实模型效果已验证、延迟 SLA 已达成、DeepSeek 已胜出。

### Case 12｜缺少 API key

- Observed：仓库留有 provider configuration error artifacts。
- Product implication：Provider unavailable 必须是显式错误状态，不能静默切到 mock 后仍展示为真实模型结果。
- Acceptance：run metadata 能区分 mock、real provider、configuration failure。

## 7.3 尚未证明的内容

- Brief 字段级准确率和 unknown 处理稳定性：【待后续Model Eval】。
- Creative Plan 的事实一致性与可用性：【待后续Model Eval】。
- 中文长输入、冲突输入、噪声输入表现：【待后续Model Eval】。
- 候选模型的质量 / latency / cost 对比：【待后续Model Eval】。
- Final Selection：【待后续Model Eval】。

## 7.4 Candidate Comparison 与 Selection Criteria

| Dimension | Why it matters | Required Evidence | Decision Status |
|---|---|---|---|
| Structured output validity | 下游依赖 schema | 相同 dataset 的 parse / schema rate | 【待后续Model Eval】 |
| Fact preservation | 不能改变产品尺寸和步骤 | field-level labeled cases | 【待后续Model Eval】 |
| Uncertainty handling | 缺信息时应追问 | edge-case pass rate | 【待后续Model Eval】 |
| Instruction following | 禁止越过 Brief / Plan 边界 | forbidden-output cases | 【待后续Model Eval】 |
| Latency | 影响交互等待 | repeated run distribution | 【待后续Model Eval】 |
| Cost | 影响可持续性 | token / request cost under workload | 【待定义】 |
| Availability / privacy | 影响可靠性和数据边界 | provider terms + failure logs | 【待补证据】 |

候选模型池与权重需要【待Human Decision】；在此之前不制作带结论的排名表。

## 7.5 Fallback Strategy

| Failure | Fallback Principle | Boundary |
|---|---|---|
| timeout / transient error | 可重试或提示稍后再试 | 次数与 backoff【待Human Decision】 |
| invalid structured output | fail closed；不写 state | 是否二次修复调用【待Human Decision】 |
| provider unavailable | 保留输入，允许手工完成结构化 | 不伪装为 AI 成功 |
| semantic uncertainty | Ask Missing / Human Confirm | 不由 fallback model 自动确认事实 |

# 08 Demo 搭建

## 8.1 Technology Stack 与产品形态

当前 Demo 是 Custom Web Prototype，对应独立 Web Assistant；不是 Coze 教程、浏览器插件或设备内原生集成。具体依赖版本以仓库实现为准，本 PRD 不复制易过期的 package inventory。

> Product Decision
> Demo 的目标是让一条 Canonical E2E 路径可观察、可编辑、可阻断；不是用视觉完整度掩盖缺失能力。

## 8.2 Demo Minimum Standard

| Standard | Acceptance |
|---|---|
| Scenario | MomoRay 模块化枕头高度调节说明卡 |
| Path | 7 个 Canonical 步骤可识别 |
| Artifact | 有明确 identity / revision；可编辑矢量路径有真实证据 |
| Preflight | ERROR / WARN / PASS 与 stale 可见 |
| Authority | WARN 由 Human 决定；ERROR / stale 阻断 |
| Truth | mock 与 real provider 可区分；unsupported 不伪装完成 |
| Evidence | Eval result / trace 可关联到具体版本 |

## 8.3 E2E User Path

```text
MomoRay idea
  -> Extract Editable Brief
  -> Human Confirm
  -> Generate Creative Plan
  -> Build Design Spec
  -> Render / Edit SVG Artifact
  -> Run Preflight
  -> Resolve ERROR / WARN
  -> Export SVG + Handoff Status
```

### Case 13｜编辑后的重新验证

用户在 Studio 修改步骤编号。系统创建新 revision，使之前的 Preflight stale；用户必须重新运行检查。验收不看页面是否显示绿色标签，而看 report revision 是否与 current artifact revision 对齐。

### Case 14｜required PDF 但当前 unsupported

如果交付要求包含 PDF，当前系统不能把 SVG 成功导出包装成完整交付。正确状态是 SVG 可用、PDF incomplete / unsupported，并把问题路由给 Human 或外部工具。

## 8.4 Key Prompt / Workflow

首个真实 Provider 案例使用 `brief.extract` Prompt v0.1；其 contract、限制和 bad cases 见 5.6。Demo 不应在同一次展示中暗示所有 11 Skills 都由 DeepSeek 执行。

## 8.5 Demo Entry / Video

- Demo entry：【待补证据】。
- Demo video：【待补证据】。
- QR code：【待补证据】。

## 8.6 Known Limitations

- PDF export 未验证。
- 不控制 xTool / Cricut 或任何制造设备。
- 外部 SVG 只具 limited-edit / partial-preflight truth boundary。
- real provider 只完成有限 smoke，不代表完整 E2E Model Eval。
- RAG / Memory 未实现。
- Multi-Agent 不属于当前能力。

## 8.7 Demo Validation

| Question | Evidence Needed | Current Status |
|---|---|---|
| 用户能否完成 7 步 | task observation | 【待补证据】 |
| 用户能否理解 Brief 与 Plan 区别 | interview / comprehension task | 【待补证据】 |
| stale 是否能阻止错误导出 | contract + UI observation | Contract evidence exists；UX evidence【待补证据】 |
| WARN 是否保持 Human Authority | transition test + UI observation | Contract evidence exists；UX evidence【待补证据】 |

# 09 NFR

## 9.1 NFR Decision Table

| NFR | Why | Product Decision | Measurement | Current Boundary |
|---|---|---|---|---|
| Latency | Brief / Plan 等待影响编辑节奏 | 分 Task 记录，不用单次 smoke 充当 SLA | p50 / p95 by skill/provider | SLA【待Human Decision】 |
| Cost | 模型调用和重试影响可持续性 | 按 skill、provider、tokens 归因 | cost per successful task | budget【待Human Decision】 |
| Reliability | 错误状态不能污染 confirmed state | fail closed；保留 last valid state | error / retry / recovery rate | retry policy【待Human Decision】 |
| Privacy | 用户可能上传未公开设计 | 最小化传输与保留；展示 provider boundary | data inventory / retention audit | policy【待定义】 |
| Observability | Eval 与事故需要可复现 | run / artifact / revision / prompt version 可追踪 | trace completeness | retention【待定义】 |

### Boundary / Bad Case

- 单次 1174 ms smoke 不能定义 latency target。
- 未统计 tokens 时不能写单位成本。
- 原始 SVG、Prompt 输入和日志可能包含用户设计信息，不能默认无限期保留。
- retry 若没有幂等和 state guard，可能产生重复 revision 或覆盖 confirmed state。

### Acceptance / Evaluation

NFR 数字在 Human 决定并形成可测工作负载前均不冻结。当前验收只要求指标可被定义、错误可观察、状态不因失败被错误推进。

# 10 Risks / Open Questions / Truth Boundary

## 10.1 Status Vocabulary

| Status | Definition | Example |
|---|---|---|
| Implemented | 仓库存在可检查实现或已运行证据 | Contract runner、部分 deterministic checks |
| Planned | 已进入路线或 contract，但没有完成证据 | 制作生态扩展 |
| Hypothesis | 需要用户 / 市场 / Model Eval 验证 | 用户愿意采用结构化 7 步体验 |

## 10.2 Risk Register

| Risk | Failure Impact | Mitigation / Gate | Evidence Status |
|---|---|---|---|
| Model hallucination | 编造尺寸、材料、事实 | unknown + Human Confirm + semantic eval | 部分 case；系统性证据待补 |
| Structured output instability | 下游无法消费或 state 污染 | adapter + schema + fail closed | Contract evidence |
| False manufacturing confidence | 用户误以为文件已安全制造 | 限定 Preflight scope；禁止安全保证 | Canonical boundary |
| Over-automation | Human Authority 被模型取代 | Confirm / WARN Gate | Contract evidence |
| Unsupported capabilities | PDF / integration 被误写完成 | explicit incomplete / unsupported | Canonical boundary |
| External Artifact trust | 外部 SVG 结构、来源、语义不可信 | sanitize + limited edit + partial preflight | 设计已定义；完整实现证据有限 |
| Preflight stale | 旧检查用于新文件 | revision binding + block | Contract evidence |
| Provider dependency | 不可用或行为变化 | adapter、显式错误、fallback | 部分实现；策略待定 |

## 10.3 Truth Boundary

MakerFlow 当前可以表达：

- 面向初级 Maker / 设计学生的独立 Web Assistant。
- 将模糊想法转成结构化约束，形成可编辑矢量作品，并在导出前做确定性预检与问题路由。
- 存在 7 步 Canonical workflow、Task Graph、11 Skills、contracts 与 Contract Eval baseline。
- DeepSeek 可作为实验 Provider 运行，已有有限 smoke evidence。

MakerFlow 当前不能表达：

- 已上线、已有增长、效率提升或商业收益。
- 已完成 Multi-Agent、RAG、Memory。
- 已完成候选模型对比或 Final Selection。
- 已验证制造成功率、安全性或设备兼容性。
- 已完成 xTool / Cricut / AImake native integration。
- PDF 已被可靠导出。

## 10.4 Open Questions

1. MVP 首要成功标准是“完成可验证交付”还是“理解并修复问题”？【待Human Decision】
2. Target User 中初级 Maker 与设计学生谁是首轮招募优先级？【待Human Decision】
3. WARN 可接受范围和免责声明由谁定义？【待Human Decision】
4. External SVG 在 MVP 中支持到何种编辑深度？【待Human Decision】
5. PDF 是 MVP required output 还是后续扩展？【待Human Decision】
6. Model selection 的候选池、权重和成本上限是什么？【待Human Decision】
7. NFR 的 latency / cost / retention target 是什么？【待Human Decision】

# 11 Appendix

## 11.1 Evidence Index

| Material | Repository Area | Used For |
|---|---|---|
| Canonical State / Product Canonical | canonical / docs | positioning、7-step、truth boundary |
| Task Graph | task graph documents | T01–T17、dependencies、gates |
| Skill Contracts | contracts / skill docs | 11 Skills、I/O、failure contracts |
| Prompt v0.1 | prompts / docs | `brief.extract` full case |
| Provider implementation / artifacts | provider / eval artifacts | DeepSeek experimental truth |
| Eval Cases E01–E12 | eval specs / cases | dataset classification |
| Contract Baselines | eval baselines | 7 PASS / 5 skipped interpretation |
| Prototype | prototype | product form、observable state |
| Decision Records | decisions | D1–D9 rationale |
| Competitor Research | research / competitor docs | AImake、Cricut、Atomm analysis |

## 11.2 Traceable Artifacts

- Full Task Graph：以仓库当前 Canonical 文件为准。
- Skill Contracts：以当前 contract / schema 为准。
- Prompt Versions：当前完整案例只引用真实 `brief.extract` v0.1；不存在的 v0.2 不补造。
- Eval Cases / Baselines：结果必须保留 run status 与 skipped semantics。
- Architecture / UI / Wireframes：以 prototype 和对应文档为准，不把概念图写成已实现。

## 11.3 Remaining Evidence Debt

- 用户研究样本、观察记录与任务完成证据：【待补证据】。
- 竞品最新界面 / 实测路径的可引用证据：【待补证据】。
- 完整真实 Provider Model Eval baseline：【待后续Model Eval】。
- Demo entry、video、QR 与端到端录屏：【待补证据】。
- NFR workload、成本和数据保留策略：【待定义】。

---

本 PRD 的完成标准不是章节齐全，而是每项结论能够回答：依据是什么、谁拥有决定权、失败时如何阻断、用什么证据验收。所有未运行、未实现或需产品判断的内容均保留显式状态，不用推测补齐。
