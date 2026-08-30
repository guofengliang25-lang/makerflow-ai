# MakerFlow Full AI Product PRD v0.1

> 文档状态：First Draft，等待 Human Review
> 日期：2026-08-28
> 产品形态：独立 Web Assistant
> MVP Validation Scenario：MomoRay 模块化枕头高度调节说明卡

## 文档约定

本文使用三种事实状态：

- **Implemented**：仓库中存在可运行实现、测试、输出文件或运行报告。
- **Planned**：已经形成产品或架构设计，但尚无完整运行证据。
- **Hypothesis**：仍需用户研究、实验或市场证据验证。

补充标记：

- `【待补证据】`：PRD 需要该事实，但仓库尚无足够证据。
- `【待Human Decision】`：必须由产品负责人裁决，不能从现有材料自动推出。
- `【待后续Model Eval】`：已有实验 Provider 或候选方向，但尚未完成正式模型评估。
- `【待定义】`：NFR、阈值或运营规则尚未冻结。

本文不把 Planned 或 Hypothesis 写成已实现能力。

---

## 00 Executive Summary

MakerFlow 是面向初级 Maker / 设计学生的可制作作品助手：把模糊想法转成结构化设计约束，形成可编辑矢量作品，并在导出前完成确定性预检与问题路由。

MakerFlow 采用独立 Web Assistant 形态。当前 MVP 只验证“MomoRay 模块化枕头高度调节说明卡”这一单一场景，核心体验为：

```text
Define
→ Editable Brief
→ Creative Plan
→ Create & Edit
→ Preflight
→ Resolve Issues
→ Export & Handoff
```

产品的核心判断不是“让模型直接生成最终图片”，而是让用户在进入制作流程前获得四类可控制对象：

1. 状态清楚的结构化设计约束；
2. 可编辑、可版本化的 SVG Artifact；
3. 与当前 Artifact Revision 绑定的确定性 Preflight 证据；
4. 能说明问题严重度、责任方、解决位置和下一步的 Issue Routing。

### 当前实现状态

**Implemented**

- Custom Web Prototype v0.2，可本地运行；
- Editable Brief 状态编辑；
- Creative Plan 的 Mock 决策流程；
- 本地 Design Spec 构建与 SVG Renderer；
- 受控结构化编辑与部分 SVG group 拖动；
- SVG File Check、Brief Consistency Check、Studio Readiness Checklist；
- BLOCK / WARN / PASS 路由；
- Artifact Revision、Preflight stale 与 revision-bound WARN Human Gate；
- 本地 Verified SVG 导出与 handoff completion 状态；
- Provider-neutral Contract Eval Dataset、Runner 与 v0.1—v0.4 Baseline；
- DeepSeek `brief.extract` 实验 Provider、Adapter、测试、smoke runner，以及一次 parsed 且 schema-valid 的实验输出。

**Planned**

- 将更多 Model Tasks 从 Mock 接入真实 Provider；
- Semantic Eval、Workflow Eval、UX Eval；
- 更完整的产品级 Failure / Recovery；
- 公开 Demo、视频和可复现演示入口；
- 在保持文件交接边界的前提下验证制作生态扩展。

**Hypothesis**

- 结构化约束、可编辑 Artifact 和前置验证能够降低理解与错误恢复成本；
- 用户会认为两段式检查与问题路由比单一“通过 / 失败”更易理解；
- 清晰的 Authority 与 Truth Boundary 能提高用户对 AI 辅助制作流程的信任。

MakerFlow 不是 AI Native OS、Multi-Agent Platform、单纯 Workflow Tool 或 Prompt-to-image Generator。当前不控制机器，不自动决定材料、功率、速度、次数或加工安全参数，不保证文件生产就绪或制造成功。

---

## 01 业务背景

### 1.1 场景 / 行业背景

MakerFlow 关注的是“数字创意如何进入真实制作”这一具体过程，而不是泛化的 AI 内容生成。

典型任务从一句不完整的想法开始，随后需要经历需求澄清、内容与尺寸确认、矢量作品形成、文件检查、制作软件导入、参数设置和加工前确认。现有流程通常跨越聊天工具、图片生成工具、Figma / Illustrator / Inkscape、搜索引擎和制作软件。信息在工具之间主要依靠用户手动搬运。

现有三名邻近样本和 AS-IS Journey 支持以下背景：

- 初始需求与关键约束经常不完整；
- 已确认事实、默认假设、缺失信息和待确认项容易混杂；
- 上游信息在跨工具传递中容易遗漏或被重新解释；
- 版本变化后，旧检查结论可能被误用于新文件；
- 文件问题可能到导入或制作准备阶段才暴露；
- 用户未必知道问题应在哪个阶段、由谁解决；
- “能够导入”容易被误解为“可以生产”或“加工安全”。

设计交接是该场景的重要风险点。交付并不只是导出一个文件，还包括目标尺寸、文件角色、版本、文字策略、刀线要求、未确认项和加工前人工责任。只要其中一项与当前作品不一致，交接就可能失效。

证据边界：现有研究样本为邻近用户，其中部分真实经历来自 3D 制作流程，不是 xTool Studio 专项用户。它们支持“分阶段检查、版本管理和人工确认”的产品架构，但不能直接证明 SVG 错误频率、xTool Studio 行为或市场规模。

### 1.2 Target User

核心目标用户是：

> 有基础设计意识或设计能力，但缺少完整制作交接经验的设计学生或初级 Maker。

该用户通常能够表达想做什么，也可能会使用一种或多种设计工具，但难以独立完成以下判断：

- 当前信息是否足以开始设计；
- 哪些内容是事实，哪些只是暂定方向；
- 用途、尺寸、材料、形式和输出文件之间如何相互约束；
- 文件问题应回到 Brief、设计工具还是制作软件解决；
- 当前文件是否与刚刚确认的设计意图一致；
- 什么可以由 AI 建议，什么必须由自己或操作人员确认。

当前不以专业生产工程师、成熟制造团队或需要完整 CAM 能力的用户为 MVP 核心用户。

### 1.3 JTBD

主 JTBD：

> 当我拿到一个信息不完整、最终需要进入设计和制作流程的任务时，我希望逐步确认关键约束，形成可继续编辑和交接的矢量作品，并知道文件与制作问题应在哪个阶段、由谁处理，从而在保留最终控制权的情况下继续推进任务。

功能任务包括：

1. 明确最终交付物、用途和目标用户；
2. 识别缺失、冲突和高影响约束；
3. 区分 confirmed、assumed、missing、needs_confirmation；
4. 把已确认 Brief 转成可执行的 Creative Plan；
5. 形成并编辑矢量 Artifact；
6. 在导出前检查确定性文件和一致性问题；
7. 找到正确的修复位置并完成复检；
8. 保留加工前人工确认。

情绪任务包括：

- 降低面对不完整任务时的不确定感；
- 在交付前看到风险，而不是在下游突然失败；
- 理解系统为什么允许继续或要求停止；
- 失败后知道如何恢复；
- 确认 AI 没有替自己接受风险或篡改已确认事实。

长期使用意愿、付费意愿及是否愿意维护项目状态仍为【待补证据】。

### 1.4 Pain Points

#### P0-01｜约束不完整且状态混杂

用户可能只输入用途或视觉想法，却缺少尺寸、形式、产品事实、材料方向、文字策略或输出要求。若系统直接生成，后续设计和交付会建立在未确认假设上。

#### P0-02｜问题后置暴露

SVG 的尺寸、单位、文字、位图、重复 ID、空元素、cutline 等问题可能在导出或制作准备阶段才暴露。问题越晚发现，用户越难判断应该回到哪个工具修复。

#### P0-03｜导入状态被过度解释

文件能够打开或导入，不代表它符合已确认 Brief，也不代表材料、设备、参数和加工安全已经确认。

#### P0-04｜AI 与人工责任边界不清

如果系统没有区分建议、规则结论和人工确认，用户可能把 AI 推荐当成事实，或误以为系统已为加工风险负责。

#### P1-01｜跨工具上下文和版本负担

用户需要在不同工具之间重复录入信息。文件修改后，旧检查报告和旧风险接受可能仍被错误沿用。

#### P1-02｜缺少可行动的问题路由

简单报错只说明“有问题”，却没有说明 severity、owner、resolution stage、是否允许继续以及 next step。

痛点频率、总体返工成本和行业规模当前为【待补证据】。

### 1.5 Why AI / Why not traditional tool

MakerFlow 需要的是组合式 AI 产品能力，而不是让 LLM 承担所有任务。

适合 Model 的任务：

- 从自然语言中提取 Brief 候选；
- 根据确定性缺失结果生成中性追问；
- 针对未确定约束生成带依据、收益和取舍的 Creative Plan；
- 未来参与从已确认 Brief 到 Design Spec 的语义映射。

必须保持确定性的任务：

- Schema、枚举、必填字段与冲突校验；
- Design Spec 硬约束；
- SVG 渲染与文件解析；
- SVG File Check 与 Brief Consistency Check；
- Artifact Revision 与 Preflight stale；
- BLOCK / WARN / PASS 路由；
- Export Gate；
- 材料、设备、参数和安全责任边界。

纯传统工具的不足不在于无法编辑 SVG，而在于用户仍需要自己从模糊语言中提取约束、维护状态、判断缺口并协调跨工具责任。单纯表单可以收集字段，却不擅长处理多样自然语言和上下文相关追问；单纯 LLM 能处理语言，却不适合承担精确校验和高风险决定。

因此 MakerFlow 使用 Model + Tool + Rule + Human：概率性语义任务交给 Model，确定性执行与校验交给 Tool / Rule，高影响事实和风险接受保留给 Human。

### 1.6 Product Positioning

产品形态：独立 Web Assistant。

产品定位：

> MakerFlow 是面向初级 Maker / 设计学生的可制作作品助手：把模糊想法转成结构化设计约束，形成可编辑矢量作品，并在导出前完成确定性预检与问题路由。

当前 MVP 只处理一个说明卡场景。MakerFlow 不替代 Illustrator、Figma、Inkscape、xTool Studio、Cricut Design Space 或专业 CAM；它也不是企业生产系统、通用 Agent 平台或机器控制软件。

---

## 02 竞品分析

### 2.1 Competitor Scope

竞品范围按用户工作流位置划分，而不是只选择名称相似的 AI 产品：

| 对象 | 工作流角色 | 纳入原因 | 证据状态 |
|---|---|---|---|
| AImake V2.0 | AI 创作 / 制作相关 Assistant | 与从想法到制作相关设计最直接 | 官方资料 + 研究初稿，完整实测不足 |
| Adobe Illustrator / Inkscape | 专业矢量编辑 | 代表可编辑 SVG 和专业导出能力 | 能力边界较明确 |
| xTool Studio | 制作软件 | 代表导入、设置、Preview / Framing 和设备交接 | 官方资料，关键行为待实际验证 |
| Cricut Design Space | 纸张印刷与裁切 | 与说明卡、Print Then Cut、校准和机器闭环相关 | 研究对象已定义，完整实测不足 |
| Atomm / AImake Projects | Maker 社区与项目复用 | 代表发现案例、复用项目和从内容进入制作 | 研究对象已定义，完整实测不足 |

以上对象不必然都是 MakerFlow 的直接竞品。比较目的在于理解不同环节如何处理输入、可编辑性、制作交接和失败恢复。

### 2.2 Detailed Comparison

| 维度 | AImake V2.0 | Illustrator / Inkscape | Cricut Design Space | Atomm Projects | MakerFlow |
|---|---|---|---|---|---|
| 核心起点 | 文字或图片创意【待实际验证】 | 用户已有设计任务或文件 | 设计 / Print Then Cut 项目【待实际验证】 | 社区项目与案例【待实际验证】 | 模糊任务、产品事实、参考和已有文件 |
| AI 角色 | 官方强调主动建议和制作相关动作 | AI 是局部辅助，不承担完整约束状态 | 【待补证据】 | 项目发现 / 复用中的 AI 角色【待补证据】 | 提取候选、追问和 Creative Plan；不覆盖 Rule / Human |
| 中间结果 | 编辑深度和依据【待补证据】 | 专业可编辑矢量 | 编辑范围【待补证据】 | 复用深度【待补证据】 | Editable Brief、Creative Plan、Design Spec、SVG Artifact |
| 确定性检查 | 范围【待补证据】 | 依赖专业知识和工具功能 | 校准 / 制作检查【待补证据】 | 【待补证据】 | SVG、Brief consistency、Studio readiness 三层检查 |
| 版本与证据 | 【待补证据】 | 用户自行管理 | 【待补证据】 | 【待补证据】 | Artifact Revision、checked revision、Decision Log |
| 失败恢复 | 【待补证据】 | 用户手动诊断 | 【待补证据】 | 【待补证据】 | BLOCK / WARN / PASS、owner、resolution stage、next step |
| 制作交接 | 官方面向制作场景，具体输出待验证 | 输出 SVG / PDF 等文件 | 进入 Cricut 制作流程【待验证】 | 项目步骤 / 素材【待验证】 | 本地 Verified SVG + handoff 状态；不控制机器 |

该表只记录现有研究可支持的判断。AImake、Cricut 和 Atomm 的详细实测、截图和失败路径为【待补证据】。

### 2.3 Common Gap

当前材料支持三个待验证的共同缺口：

1. **约束显性化不足**：工具通常擅长生成、编辑或制作，但用户仍需自己管理哪些信息已确认、哪些只是建议。
2. **检查与制作状态混杂**：单一“通过 / 失败”不足以区分文件能否进入下一步、Studio 中还需做什么以及是否加工安全。
3. **跨工具连接主要依赖人工**：自动互通不是可假设的能力，更现实的连接方式是使用结构化记录和明确文件交付物。

由于多个对象尚未完整实测，这些结论属于 Product Interpretation，不是对整个市场的普遍事实。

### 2.4 MakerFlow Differentiation

MakerFlow 的差异不建立在“比现有工具更会生成”或“更懂机器参数”上，而建立在以下组合：

- 生成或设计前先识别缺失信息；
- 使用 Editable Brief 保留事实、假设和待确认状态；
- 使用 Creative Plan 公开建议依据、收益和取舍；
- 让 SVG 从一开始就是可编辑 Artifact，而非先生成位图再转换；
- 将确定性文件问题提前到导出前；
- 让 Preflight 与当前 Artifact Revision 绑定；
- 用 Issue Routing 指向正确责任方和修复位置；
- 高影响事实、WARN 接受、最终导出和加工决定保留 Human Authority。

差异是否被目标用户感知，以及是否优于现有组合工具流程，仍需任务测试验证。

---

## 03 产品方案

### 3.1 Product Form

MakerFlow 是 Custom Web Prototype 形态的独立 Web Assistant。当前实现为纯静态 HTML / CSS / JavaScript，可本地运行，也具备静态站点部署条件。Prototype 不依赖 Coze，不需要把 Coze 教程纳入 PRD。

当前产品只使用 MomoRay 说明卡作为验证任务，不提供项目类型自由扩展或企业级协作。

### 3.2 Core Product Experience

#### Step 1｜Define

用户提供任务、产品事实、参考和已有文件。系统建立 `task_input`，但不把未提供的信息补写为事实。

#### Step 2｜Editable Brief

系统把输入映射为 Brief 候选，区分 `confirmed / assumed / missing / needs_confirmation`。关键字段满足 Gate 后，由 Human 确认某个 `brief_revision`。

#### Step 3｜Creative Plan

系统只针对尚未确定的约束给出候选，必须说明 `based_on`、benefit、tradeoff、confidence 和是否需要确认。当前 Creative Plan 的模型行为为 Mock。

#### Step 4｜Create & Edit

系统建立内部 Design Spec，并通过确定性 SVG Renderer 形成当前作品。用户使用结构化控件和有限拖动修改作品。Design Spec 是内部创作事实来源，不要求用户编辑 JSON。

#### Step 5｜Preflight

对当前 Artifact 执行：

- SVG File Check；
- Brief Consistency Check；
- Studio Readiness Checklist。

#### Step 6｜Resolve Issues

Issue Router 返回 severity、resolution stage、owner、是否可继续、证据、message 和 next steps。修改作品后产生新 Artifact Revision，旧 Preflight 变为 stale。

#### Step 7｜Export & Handoff

BLOCK 不可绕过。WARN 必须由 Human 对当前 Artifact Revision 明确确认。通过门禁后，Tool 忠实导出本地 Verified SVG 和检查摘要。required PDF 缺失时可以只导出 SVG 部分，但整体 handoff 仍为 incomplete / blocked。

### 3.3 Core Functional Modules

| Module | Core responsibility | Current status |
|---|---|---|
| Constraint Intake | 接收任务、事实、参考和文件 | Implemented |
| Brief Extract | 提取 Brief 候选 | Mock in main Demo；DeepSeek experimental smoke available |
| Brief Validate | Schema、字段、枚举和冲突校验 | Implemented local rule / contract owner |
| Ask Missing | 基于缺失结果生成追问 | Mock in main Demo |
| Editable Brief | 编辑并确认 Brief revision | Implemented |
| Creative Plan | 生成未确定约束的候选 | Mock in main Demo |
| Design Spec Build | 建立内部结构化设计规格 | Implemented local rule |
| SVG Renderer | 确定性生成 SVG | Implemented local tool |
| Create & Edit | 受控编辑和重渲染 | Implemented with limited scope |
| SVG File Check | 检查 SVG 结构 | Implemented |
| Brief Consistency Check | 比较 Artifact 与 confirmed Brief | Implemented |
| Studio Readiness | 展示加工前人工待办 | Implemented as checklist; no Studio integration |
| Issue Router | BLOCK / WARN / PASS 与 next step | Implemented |
| WARN Human Gate | 绑定当前 Artifact Revision | Implemented and contract-evaluated |
| Artifact Export | 本地 Verified SVG 与摘要 | Implemented |

### 3.4 Non-goals

当前不做：

- 通用 Prompt-to-image；
- 图片生成后自动转 SVG；
- 完整 Illustrator / Figma 式矢量编辑器；
- 3D 模型检查或修复；
- 自动修复所有 SVG 问题；
- 自动决定材料、功率、速度、次数和安全参数；
- 控制设备或执行加工；
- 声称 xTool Studio、Cricut 或 AImake 读取 MakerFlow 的 Brief / JSON / Report；
- 保证生产就绪、制造成功或加工安全；
- Multi-Agent System；
- 企业级完整权限、协作或审计系统。

### 3.5 Core User Journey

```text
模糊输入 / 事实 / 参考
→ 提取 Brief 候选
→ Rule 校验
→ 缺失：追问并更新 Brief
→ Human 确认 Brief Revision
→ Creative Plan 候选
→ Human 选择 / 修改
→ Build Design Spec
→ Render Artifact Revision
→ Human 编辑
→ 新 Artifact Revision + 旧 Preflight stale
→ Run Preflight
→ BLOCK：回到正确修复阶段并复检
→ WARN：Human 对当前 revision 确认或返回修复
→ PASS / confirmed WARN
→ Human 触发本地导出
→ 显示 Studio Readiness Checklist
```

### 3.6 Ask / Act / Confirm / Block

| Authority | Meaning | Example |
|---|---|---|
| ASK | 信息不足，需要用户补充 | 缺少关键尺寸、产品事实或制作路径 |
| ACT | 低风险、可逆且有明确输入，可由系统执行 | 渲染当前 SVG、运行确定性检查 |
| CONFIRM | 高影响事实、风险接受或最终动作需要 Human 明确同意 | 确认 Brief、接受 WARN、触发 Export |
| BLOCK | 硬规则或高风险条件未满足，禁止继续 | SVG 无法解析、当前 Artifact 与 checked revision 不一致 |

权限原则：

- Model 不确认事实；
- Rule 不接受风险；
- Tool 不扩大授权；
- Human Gate 不注册为 Skill；
- BLOCK 不能由 Human 点击“仍然继续”绕过；
- WARN 确认必须绑定当前 Artifact Revision。

### 3.7 Core State Objects

| Object | Purpose | Key state / identity |
|---|---|---|
| Task Input | 原始任务、事实、参考和文件入口 | source / timestamp / user input |
| Brief | 结构化设计约束 | field status + brief lifecycle + brief_revision |
| Creative Plan | 对未确定约束的候选 | recommendation + basis + tradeoff + confirmation |
| Design Spec | MakerFlow-native 创作事实来源 | design_spec_revision |
| Project State | 当前项目指针与制作准备状态 | current pointers / checklist states |
| Artifact Revision | 不可变作品版本 | artifact_revision + source_design_spec_revision + content identity |
| Preflight Report | 当前规则的检查证据 | checked_artifact_revision + result + stale |
| Decision Log | Human 对事实、建议和 WARN 的决定 | actor + issue + artifact revision + confirmation |
| Trace Event | 调试与证据事件 | run / revision / prompt / provider metadata |

`Session Context` 与 `Retrieved Knowledge` 已有架构草案，但 RAG / Memory 不属于当前已实现能力。

### 3.8 Before / After

| Stage | Before | MakerFlow target experience |
|---|---|---|
| 输入 | 用户在聊天和文档中散落描述 | 形成可编辑 Brief，并显示字段状态 |
| 设计前 | 用户自己判断是否缺信息 | Rule 识别必要缺口，Model 只负责候选提取和追问表达 |
| 设计中 | 视觉结果与设计意图关系不透明 | Design Spec 与 Artifact Revision 有明确来源关系 |
| 修改后 | 旧检查可能继续被沿用 | 新 Artifact Revision 自动使旧 Preflight / WARN confirmation 失效 |
| 导出前 | 问题可能仅以报错形式出现 | Preflight + Issue Routing 返回 owner、stage 和 next step |
| 交接 | 文件可打开容易被理解为可生产 | 明确区分 file pass、handoff completion、Studio checklist 和加工安全 |

该对照是基于现有流程研究和产品设计形成的目标体验，不代表已经取得效率提升或错误下降。真实 Before / After 数据为【待补证据】。

### 3.9 Key UI

关键界面包括：

1. Define 输入页；
2. Editable Brief 状态编辑页；
3. Creative Plan 决策页；
4. SVG Create & Edit 工作区；
5. Preflight 结果页；
6. Issue Resolution 面板；
7. Export & Handoff 页；
8. QA Canonical State 面板。

每个关键状态需要覆盖正常、缺失、BLOCK、WARN、PASS、stale、重试、回退和人工确认。完整截图索引与用户测试结果为【待补证据】。

---

## 04 版本迭代

路线顺序已冻结：

```text
Phase 1 产品假设验证
→ Phase 2 Model能力接入
→ Phase 3 体验与Eval闭环
→ Phase 4 制作生态扩展
```

不在本 PRD 中虚构交付周数。

### Phase 1｜产品假设验证

| Field | Definition |
|---|---|
| Goal | 验证七步 SVG-first 流程能否让目标用户理解约束、作品、检查和责任边界 |
| Core Scope | 单一说明卡、Editable Brief、Mock Creative Plan、Design Spec、SVG、Preflight、Issue Routing、Export |
| Product Form | 本地 Custom Web Prototype |
| Target User | 设计学生 / 初级 Maker；现有样本为邻近用户 |
| Validation Question | 用户能否理解并完成从模糊输入到已验证 SVG 的核心任务？ |
| Metrics | 【待Human Decision：主指标在“流程可理解 / 任务完成 / 愿意继续使用”中选择】 |
| Why this order | 先验证产品链路，避免在问题价值未确认前扩大 Model 和生态投入 |
| Risks | Mock 行为可能让用户误解 AI 能力；单一场景代表性有限 |

### Phase 2｜Model能力接入

| Field | Definition |
|---|---|
| Goal | 在不改变 Contract、Rule 和 Human Gate 的情况下验证真实 Provider 能否承担 Model Tasks |
| Core Scope | 优先 `brief.extract`，再评估 `brief.ask_missing` 与 `plan.generate` |
| Product Form | Custom Web Prototype + Provider Adapter + versioned Prompt / artifacts |
| Target User | 与 Phase 1 相同 |
| Validation Question | Provider 能否稳定输出合法、忠实、不过权的结构化结果？ |
| Metrics | Schema validity、事实保持、必要缺口识别、语义质量、latency、cost、error rate【阈值待定义】 |
| Why this order | 先用 Provider-neutral Contract 固定边界，再比较语义与运行表现 |
| Risks | Hallucination、结构化输出不稳定、供应商错误、成本与延迟不可控 |

Phase 2 进入 / 退出 Gate 为【待Human Decision】。

### Phase 3｜体验与 Eval 闭环

| Field | Definition |
|---|---|
| Goal | 建立从失败发现、产品修复到回归验证的持续闭环 |
| Core Scope | Contract、Model / Semantic、Workflow、State / Authority、UX Eval |
| Product Form | 可复现 Demo + versioned dataset + runner / human review |
| Target User | 目标用户 + 内部 QA / 产品评审者 |
| Validation Question | 产品迭代是否改善目标任务，同时不破坏硬规则和 Human Authority？ |
| Metrics | 各 Eval 对象指标；不使用单一总分掩盖失败类型 |
| Why this order | Model 接入后才有真实语义输出可评；已有 Contract Baseline 作为回归底座 |
| Risks | 为通过测试而修改 Expected；小样本被过度解释；评估对象混淆 |

Model、Workflow、Artifact、UX 的优先级为【待Human Decision】。

### Phase 4｜制作生态扩展

| Field | Definition |
|---|---|
| Goal | 【待Human Decision】 |
| Core Scope | 当前最多有文件兼容与 Studio 操作指引证据；原生集成不在现有事实范围 |
| Product Form | 【待Human Decision】 |
| Target User | 【待Human Decision】 |
| Validation Question | 【待Human Decision】 |
| Metrics | 【待Human Decision】 |
| Why this order | 只有产品链路、Provider 与 Eval 稳定后，才有条件扩大制作生态验证 |
| Risks | False manufacturing confidence、scope creep、未经授权的设备 / 平台承诺 |

---

## 05 AI Agent能力与执行机制

### 5.1 为什么需要Agent能力

MakerFlow 的任务不是一次输入、一次输出。它包含：

- 缺失信息循环；
- Human 确认点；
- Model、Tool、Rule 的不同执行权限；
- Design Spec 与 Artifact 的版本关系；
- Preflight、BLOCK / WARN 和恢复分支；
- 导出前的 authority gate。

因此需要 Agent 式任务编排能力来管理任务节点、依赖、状态和恢复。但 MakerFlow 不是完全自治 Agent，也不是 Multi-Agent System。用户始终拥有事实、风险接受和最终加工决定权。

### 5.2 Agent Task Graph

当前 Task Graph 包含 T01—T17：

| Node | Task | Actor / form |
|---|---|---|
| T01 | Intake User Input | Human + UI |
| T02 | Extract Brief | Model Skill；main Demo Mock，experimental Provider available |
| T03 | Validate Brief | Rule / local callable contract owner |
| T04 | Ask Missing Constraints | Model Skill；main Demo Mock |
| T05 | Confirm Brief | Human Gate |
| T06 | Generate Creative Plan | Model Skill；main Demo Mock |
| T07 | Build Design Spec | Current local rule; future semantic mapping may use Model |
| T08 | Render SVG | Tool |
| T09 | Edit Draft | Human + UI |
| T10 | SVG File Check | Tool / Rule |
| T11 | Brief Consistency Check | Rule |
| T12 | Studio Readiness Check | Rule / checklist |
| T13 | Route Issues | Rule |
| T14 | Apply Safe Fix | Future / Backlog; not current execution path |
| T15 | Confirm Warning | Human Gate |
| T16 | Export Verified Artifact | Tool, after gates |
| T17 | Show Studio Checklist | UI / Human action guidance |

三条核心任务流分别处理 Brief 缺失、设计与编辑、Preflight 与恢复。

### 5.3 Core Skill Architecture

Skill 的判断标准是：能力可复用、输入输出相对稳定、可独立测试，并能被 Task Graph 调用。页面、Human Gate、纯 UI 动作和状态本身不是 Skill。

当前 Core Skills：

- `brief.extract`
- `brief.validate`
- `brief.ask_missing`
- `plan.generate`
- `design_spec.build`
- `svg.render`
- `svg.file_check`
- `brief.consistency_check`
- `studio.readiness_check`
- `issue.route`
- `artifact.export`

`issue.safe_fix` 和 `studio.handoff` 为 Future / Backlog，不属于当前能力。

### 5.4 Prompt Contract

当前已有 `brief.extract` Prompt v0.1。Prompt 资产包含：

- Prompt metadata；
- Runtime inputs；
- Baseline Prompt；
- Contract Boundary；
- Eval Mapping；
- Failure Boundary；
- Changelog。

Prompt 可以改变表达和语义表现，但不得改变：

- Skill ID；
- 输入输出字段；
- Brief Schema；
- Rule 边界；
- Human Gate；
- confirmed 事实保护；
- Task Graph。

Prompt 变更必须带版本并运行相关 Eval。其他 Model Skill 的正式 Prompt 资产为【待补证据】。

### 5.5 Workflow / Orchestration

Orchestration 负责：

- 按依赖调度节点；
- 在缺失时回到 ASK；
- 在 Human Gate 等待明确输入；
- 在 Artifact 变化时传播 stale；
- 根据 BLOCK / WARN / PASS 路由；
- 在导出前检查当前 revision 与 checked revision；
- 保留错误和用户可恢复路径。

当前 Prototype 是一个有明确状态与分支的受控 Workflow，不声称自主规划任意任务。

### 5.6 Task间信息传递

节点之间通过版本化结构对象传递信息，而不是依赖自由文本历史：

```text
task_input
→ brief_candidate
→ validated brief_revision
→ creative_plan
→ design_spec_revision
→ artifact_revision
→ preflight_report.checked_artifact_revision
→ decision_log
→ export result / handoff completion
```

Provider 调用携带独立 trace metadata，包括 skill、run、prompt version 和 model configuration。Trace 字段不参与 Artifact 内容身份。

### 5.7 State Management

状态管理遵循以下原则：

1. 当前状态和历史版本分离；
2. Human confirmed 事实优先于 AI 建议；
3. 新 revision 不覆盖旧 revision，而是移动 current pointer；
4. Preflight Report 只对其 checked Artifact 有效；
5. Artifact 或相关事实变化触发 stale；
6. WARN confirmation 与 Artifact Revision 绑定；
7. Provider 失败不应污染已确认状态。

当前 Demo 尚未完全实现目标 PRD 中所有状态拆分，这一差距必须作为 Known Limitation 保留。

### 5.8 Artifact Identity

Design Spec Revision 与 Artifact Revision 分离：

- `design_spec_revision` 表示设计意图变化；
- `artifact_revision` 表示真实作品内容变化；
- Artifact 记录 `source_design_spec_revision`；
- 内容未变但重复 persist 不新增 Artifact Revision，可以新增 Trace Event；
- 易变 Trace 字段不参与 Artifact identity。

MakerFlow-native Artifact 由 Design Spec 生成。External SVG 以外部 Artifact 为事实来源，只能建立 `derived_partial` 或 `none` 的 Design Spec 状态，不承诺完整逆向恢复。

External Artifact 的具体信任等级和允许编辑深度为【待Human Decision】。

### 5.9 Human Authority

Human 独占以下权限：

- 提供和修正产品事实；
- 确认 Brief Revision；
- 接受或拒绝 Creative Plan；
- 编辑 Artifact；
- 接受当前 Artifact Revision 的 WARN；
- 触发最终导出；
- 决定材料、设备、参数和加工；
- 决定对外发布。

系统不得从历史对话推断 Human 已确认，也不得把 Model 输出自动升级为 confirmed。

### 5.10 Failure / Recovery

| Failure class | Expected behavior | Current evidence |
|---|---|---|
| Missing input | ASK 并保留已提供信息 | Brief flow / contracts |
| Invalid structured output | Fail closed，不进入 Rule 后续 | Provider Adapter / smoke runner |
| Provider configuration / HTTP / response error | 返回明确错误，不污染状态 | DeepSeek Provider |
| Malformed SVG | BLOCK，路由到文件 / 设计工具 | Contract Eval E07 |
| Brief / Artifact conflict | BLOCK 或 WARN，指向来源阶段 | Contract Eval E08 |
| Stale Preflight | 禁止导出，要求复检 | Canonical workflow / E10 |
| Unconfirmed WARN | 导出被 Human Gate 阻止 | E11 / WARN gate tests |
| Unsupported capability | 明确提示边界并建议外部工具 | Prototype upload / xTool boundary |
| Download failure | 保留当前 Artifact 和状态，允许重试 | Skill Contract；策略细节待定义 |

产品级 timeout、重试次数、backoff、统一错误 Envelope、幂等与 rollback 深度为【待定义】。

---

## 06 AI产品评估体系

### 6.1 Evaluation Object

MakerFlow 不使用一个总分评估所有能力。评估对象包括：

1. **Contract**：I/O、Schema、Rule、Human Gate 是否不变；
2. **Model / Semantic**：候选提取、追问和建议是否忠实、相关、不过权；
3. **Workflow**：是否走对路径、调用对能力、遵守依赖；
4. **State / Authority**：revision、stale、confirmed 事实和 Human Gate 是否正确；
5. **Artifact**：SVG 内容、尺寸、identity 和导出是否正确；
6. **UX**：用户是否理解状态、问题和下一步；
7. **Manufacturing handoff**：文件和人工 checklist 是否完整，但不评估制造成功保证。

LLM as Judge 当前不实现，只能作为 Future Evaluation Option。

### 6.2 Metrics

| Eval object | Current / proposed metrics | Status |
|---|---|---|
| Contract | PASS / FAIL / SKIPPED / ERROR | Implemented |
| Structured output | parse success、schema validity、required fields | Partially implemented in smoke |
| Semantic | fact preservation、missing constraint coverage、neutrality、recommendation relevance | 【待后续Model Eval】 |
| Workflow | correct route、required node / gate、recovery success | Partially designed |
| State / Authority | revision increment、stale propagation、export allowed / blocked | Implemented in contract tests |
| Artifact | deterministic render、identity、checked revision、file rule result | Implemented locally |
| UX | task completion、critical misunderstanding、recovery understanding | Test script exists; baseline missing |
| Latency / Cost | per node / E2E latency、per call / task cost | 【待定义】 |

不在没有基线时设置虚构阈值。

### 6.3 Evaluation Method

- **Deterministic assertions**：用于 Schema、Rule、revision、stale、routing 和 export gate；
- **Provider smoke**：确认请求、解析、Schema 和错误边界可运行；
- **Human rubric**：用于语义忠实度、追问中立性、建议质量和 UX 理解；
- **Task observation**：记录完成、卡点、提示、回退和用户原话；
- **Regression**：Contract、Prompt、Provider、Rule 或状态逻辑变化后重跑关联 Case。

不得为了让 Case 变绿而静默修改 Expected、Contract 或 Human Gate。

### 6.4 Eval Dataset

当前正式 Contract Dataset 位于 `evals/contract/cases.json`，包含 12 个 Case：

- E01 Brief 缺尺寸；
- E02 A6 映射；
- E03 产品事实保持；
- E04 视觉辅助需求；
- E05 不重复推荐 confirmed 尺寸；
- E06 非法 Model JSON；
- E07 Malformed SVG；
- E08 Brief 与作品尺寸冲突；
- E09 材料未确认；
- E10 编辑后 Preflight 失效；
- E11 WARN 必须人工确认；
- E12 Provider 替换。

Dataset 是 Provider-neutral 的。当前没有 Provider 时需要真实 Model 的 Case 必须标为 `SKIPPED_PROVIDER_REQUIRED`，不能使用伪造输出代替。

### 6.5 Eval Lifecycle

每个 Eval 分别记录：

- `definition_status`：是否已经正确定义；
- `execution_status`：当前是否具备运行条件；
- `latest_run_status`：最近一次运行结果。

这三个状态不能合并。例如一个 Case 可以定义完整，但因缺少 Provider 而无法执行；这不等于 Case 失败，也不等于通过。

### 6.6 Baseline

Contract Eval 的真实演进：

| Baseline | PASS | FAIL | SKIPPED | Key change |
|---|---:|---:|---:|---|
| v0.1 Mock | 4 | 3 | 5 | 暴露 contract owner、revision invalidation、WARN gate 执行缺口 |
| v0.2 Canonical State | 5 | 2 | 5 | Canonical revision state 可运行 |
| v0.3 Revision-bound Human Gate | 6 | 1 | 5 | WARN confirmation 与 current revision 绑定 |
| v0.4 brief.validate Contract Owner | 7 | 0 | 5 | A6 mapping contract owner 缺口修复 |

最新 v0.4 的 5 个 SKIPPED 不计为 PASS。该 Baseline 未调用真实模型 API，不是 Model Eval。

DeepSeek 当前只有 `brief.extract` smoke artifact：一次运行得到 parsed、schema-valid 输出，另有配置错误 artifacts。它证明实验链路和错误记录可运行，不足以形成模型质量 Baseline。

### 6.7 Failure Taxonomy

建议按责任边界建立 Taxonomy：

- Input / missing constraint；
- Model hallucination / semantic omission；
- Structured output / schema；
- Provider configuration / HTTP / response；
- Rule / contract owner；
- Tool execution / file parse；
- Workflow route；
- State / revision / stale；
- Authority / Human Gate；
- Artifact identity / external trust；
- UX misunderstanding；
- Unsupported capability；
- Manufacturing confidence overreach。

统一 severity、owner、recoverability 和 user message mapping 为【待补证据】。

### 6.8 Eval-driven Iteration

标准迭代流程：

```text
Freeze task and expected boundary
→ Run baseline
→ Classify failure
→ Identify owner: Prompt / Model / Rule / Tool / State / UX
→ Make smallest scoped change
→ Run target case
→ Run related regression
→ Record improvement and regression
→ Update version / changelog
```

v0.1—v0.4 Contract Baseline 已证明该流程可以用于 Contract、State 和 Authority 问题。Model 与 UX 的 Eval-driven Iteration 尚未运行。

---

## 07 大模型选型

### 7.1 MakerFlow中的Model Tasks

| Task | Why Model | Current status |
|---|---|---|
| `brief.extract` | 从多样自然语言中提取结构化候选 | Main Demo Mock；DeepSeek experimental smoke available |
| `brief.ask_missing` | 把 Rule 缺失结果转成自然、中性追问 | Mock |
| `plan.generate` | 针对未确定约束生成有依据和取舍的候选 | Mock |
| `design_spec.build` semantic mapping | 未来可参与首次语义映射 | Current local rule; future option |

Model 不负责 Schema 最终合法性、事实确认、文件检查、Issue severity、Export Gate 或加工参数。

### 7.2 Business / Technical Constraints

模型必须满足：

- 中文任务理解；
- Provider-neutral Skill I/O；
- 结构化输出可解析并符合 Schema；
- 不编造产品事实；
- 不覆盖 confirmed 事实；
- 不重复推荐已经 confirmed 的约束；
- 不越过 Ask / Confirm / Block；
- 失败时 fail closed；
- 可记录 model、prompt version、run、latency 和 error；
- 成本、延迟、稳定性和隐私边界可解释。

预算、latency、稳定性和隐私阈值为【待定义】。

### 7.3 Current Experimental Provider

当前实验 Provider 为 DeepSeek。

仓库已有：

- DeepSeek Provider implementation；
- Provider Adapter；
- JSON Schema Validator；
- `brief.extract` smoke runner；
- Provider 和 Adapter tests；
- versioned smoke artifacts。

一次成功 artifact 使用 `deepseek-v4-flash`，latency 记录为 1174 ms，输出 parsed 且 schema-valid。另有两个 `deepseek-chat` artifact 因 `DEEPSEEK_API_KEY` 未配置而正确记录配置错误。

这些事实只能证明实验 Provider 能够在一次 smoke 中返回符合当前 Brief Schema 的结果，以及配置错误能够被记录。它们不证明：

- DeepSeek 已经接入主 Demo；
- DeepSeek 在所有 Model Tasks 上可用；
- 语义质量已经验证；
- 延迟和成本达到产品要求；
- DeepSeek 是 Final Selection。

模型名称与可长期使用性需在后续评估中重新核对。

### 7.4 Evaluation Dimensions

正式 Model Eval 至少覆盖：

1. Fact preservation；
2. Missing constraint recall / precision；
3. Structured output parse / schema validity；
4. Neutrality and non-leading questions；
5. Recommendation relevance and tradeoff quality；
6. Human Gate / Rule compliance；
7. Latency；
8. Cost；
9. Stability across repeated runs；
10. Provider availability and operational risk。

维度权重、阈值和排序原则为【待Human Decision】。

### 7.5 Candidate Model Comparison

当前没有正式 Candidate Pool，也没有跨模型统一对比报告。

【待后续Model Eval】需要：

- 确认候选模型；
- 使用相同 Prompt、Schema、任务集和温度 / 配置边界；
- 每个任务重复运行；
- 同时记录质量、invalid output、latency、cost 和错误；
- 把 Contract violation 作为硬淘汰条件；
- 对 Semantic 结果进行 Human Review。

是否只验证“DeepSeek 是否足够”，还是建立多个 Provider 候选池，为【待Human Decision】。

### 7.6 Final Selection

当前无 Final Selection。

正式结论只能在 Candidate Model Comparison 和相关 Eval 完成后形成，并记录：

- 选择的 Provider / Model；
- 适用的 Skill；
- 选择理由和权重；
- 不选择其他候选的原因；
- fallback；
- 成本与隐私边界；
- 复审触发条件。

状态：`【待后续Model Eval】` + `【待Human Decision】`。

### 7.7 Fallback Strategy

当前可确认原则：

- Provider 配置或请求失败时不污染已确认状态；
- Structured Output 无效时 fail closed；
- 保留用户输入和当前 Structured State；
- 允许用户稍后重试；
- 对受影响步骤提供手动路径或使用 Mock 的演示路径，但必须明确标记；
- 不因替换 Provider 改变 Skill I/O、Rule、Task Graph 或 Human Gate。

自动重试次数、timeout、backoff、Provider 自动切换和错误 Envelope 为【待定义】。系统是否有权自动切换 Provider 为【待Human Decision】。

---

## 08 Demo搭建

### 8.1 Technology Stack

- Frontend：原生 HTML / CSS / JavaScript；
- Artifact：原生 SVG；
- State / fixtures：JSON + browser-local runtime objects；
- Schema：JSON Schema；
- Tests：Node built-in test runner；
- Eval：Provider-neutral JSON Dataset + local Node Runner；
- Provider：Adapter pattern；DeepSeek 为当前 experimental provider；
- Hosting option：GitHub Pages / Netlify 静态部署；
- Build：当前不需要构建命令或后端服务。

### 8.2 Demo Minimum Standard

Demo 至少必须：

1. 从固定场景进入完整七步主链路；
2. 允许用户编辑 Brief 和 Artifact；
3. 展示 BLOCK、WARN、PASS 和 stale；
4. 修改 Artifact 后使旧 Preflight 失效；
5. WARN 未确认时阻止导出；
6. 导出当前已检查 SVG，而不是旧 revision；
7. 显示 Model / Mock / Rule / Tool / Human 边界；
8. 错误不能通过剪辑隐藏；
9. 可重置到稳定演示状态；
10. 有 README 和可复现测试证据。

浏览器范围、公开部署稳定性和 Demo 数据重置规则为【待补证据】。

### 8.3 E2E User Path

E2E 路径与 3.5 Core User Journey 一致。演示应至少包含：

- 一个必要约束缺失；
- 一个 Human Brief confirmation；
- 一次 SVG 编辑产生新 Artifact Revision；
- 一次 stale Preflight；
- 一个 BLOCK 或 WARN；
- 一次修复 / 复检；
- 一次满足门禁的本地 SVG 导出。

### 8.4 Key Prompt

当前关键 Prompt 为 `brief.extract` v0.1。Demo 和 Provider smoke 必须显示：

- prompt version；
- skill ID；
- model configuration；
- schema boundary；
- run / trace metadata；
- parse / validation result；
- failure status。

不得把 raw Model 输出直接写入 confirmed Brief。

### 8.5 Key Workflow

Demo 的关键闭环是：

```text
Brief facts and state
→ Creative Plan decision
→ Design Spec
→ Artifact Revision
→ Preflight checked revision
→ Issue Router
→ Human authority
→ Export result / handoff completion
```

核心技术证明点不是“页面能跳转”，而是每一步共享正确的版本化对象和 authority boundary。

### 8.6 Demo Entry / Video

- Public Demo URL：`【待补证据】`
- Demo Video：`【待补证据】`
- QR Code：`【待补证据】`
- Version / commit：`【待补证据】`
- Last verified environment：`【待补证据】`

### 8.7 Known Limitations

- 主 Demo 的 T02 / T04 / T06 仍使用 Mock；
- DeepSeek 仅有 `brief.extract` 实验 smoke，不等于主流程 Model 集成；
- 当前是单一说明卡场景；
- SVG 编辑能力有限，不是完整矢量编辑器；
- External SVG 只能有限结构化编辑；
- Verified PDF 未实现；
- 不调用 AImake、xTool Studio 或 Cricut；
- 不控制设备；
- Studio Checklist 不代表自动读取 Studio 状态；
- 不决定材料和安全参数；
- 当前用户研究不是 xTool Studio 专项样本；
- Semantic / Workflow / UX Eval 尚无 Baseline；
- 产品级 NFR 尚未定义。

### 8.8 Demo Validation

当前验证资产：

- Prototype unit / workflow tests；
- Artifact identity tests；
- WARN Human Gate tests；
- Provider Adapter / DeepSeek Provider tests；
- Contract Eval v0.1—v0.4；
- 低保真用户测试脚本、观察模板和验收标准。

仍需：

- 运行并归档完整 E2E 用户测试；
- 公开部署检查；
- 主流浏览器验证；
- 实际 xTool Studio 文件导入和尺寸对照；
- 若条件允许，再做真实制作，但必须单独记录安全责任与环境。

---

## 09 NFR

### 9.1 Latency

当前 Provider Adapter 和 smoke artifacts 能记录节点 latency，但没有产品目标。

- Model node latency：`【待定义】`
- Local rule / tool latency：`【待定义】`
- E2E task response：`【待定义】`
- 测量分位数和样本量：`【待定义】`

【待Human Decision】：MVP 是否采用“先记录真实值、形成基线后再定阈值”。

### 9.2 Cost

- 单次 Model call budget：`【待定义】`
- 单任务 Model cost：`【待定义】`
- 项目 / 用户预算：`【待定义】`
- 超预算行为：`【待定义】`
- Mock / manual fallback 的成本策略：`【待定义】`

当前没有真实成本 Baseline。

### 9.3 Reliability

- Provider timeout：`【待定义】`
- Retry / backoff：`【待定义】`
- Idempotency：`【待定义】`
- State rollback：`【待定义】`
- Availability / error-rate objective：`【待定义】`
- Artifact export integrity：必须确保导出 current checked Artifact；现有门禁已实现。

不在本版虚构 SLA 数字。

### 9.4 Privacy

研究材料要求脱敏、最小化记录并允许参与者退出。产品级政策尚未冻结。

- 用户输入是否发送给 Provider：仅 Model Task 所需最小上下文；具体政策【待定义】；
- 项目数据默认存储位置：`【待Human Decision】`；
- 数据保留期限：`【待定义】`；
- 用户删除权：`【待定义】`；
- 日志敏感字段脱敏：`【待定义】`；
- Provider 数据使用与区域政策：`【待定义】`。

### 9.5 Observability

当前已有局部 trace：

- Provider Adapter 保存 run、prompt、provider、latency 和 error；
- Artifact Manager 保存 revision 与 trace event；
- Decision Log 保存 Human confirmation；
- Eval reports 保存 Dataset、结果和 failure reason。

仍需定义：

- 统一事件 Schema；
- 日志级别；
- 敏感字段；
- retention；
- correlation ID；
- failure alert；
- Model / Rule / Tool / Human 时间线视图。

---

## 10 Risks / Open Questions / Truth Boundary

### 10.1 Risk Register

| Risk | Status | Impact | Current control | Open item |
|---|---|---|---|---|
| Model hallucination | Planned risk control | 错误事实进入设计 | Model 只产候选；Human confirmation；Rule validate | Semantic Eval【待后续Model Eval】 |
| Structured output instability | Partially implemented control | Workflow 无法继续或状态污染 | Schema validation + fail closed + artifact logging | 重试 / repair policy【待定义】 |
| False manufacturing confidence | Implemented truth boundary | 用户误以为可以安全加工 | 明确 PASS 仅代表当前规则；Studio / safety 由 Human | 用户是否理解【待补证据】 |
| Over-automation | Implemented authority policy | AI 越过事实或风险决定 | Ask / Act / Confirm / Block + Human Gate | 持续 UX / workflow eval |
| Unsupported capabilities | Partially implemented | 用户期待 PDF、完整编辑、集成或设备控制 | Non-goals + Issue / message boundary | 统一 capability registry / UX【待补证据】 |
| External Artifact trust boundary | Partial | 外部 SVG 结构和来源不可信 | sanitize + limited edit + derived_partial / none | 信任等级和重建策略【待Human Decision】 |
| Stale verification | Implemented | 旧报告误用于新作品 | Artifact Revision + checked revision + stale | E2E 持续回归 |
| Provider dependency | Partial | 不可用、成本或表现变化 | Provider-neutral Contract + Adapter | Candidate Pool / fallback【待后续Model Eval】 |
| Privacy leakage | Open | 产品事实或用户内容暴露 | 研究脱敏；产品政策未定义 | Privacy NFR【待Human Decision】 |
| Scope creep | Active control | 变成 OS、平台或完整制作软件 | Canonical positioning + Non-goals | Phase 4 boundary【待Human Decision】 |

### 10.2 Open Questions

1. Phase 1 的唯一主指标是什么？
2. Phase 2 的进入和退出 Gate 是什么？
3. Phase 3 优先评估 Model、Workflow、Artifact 还是 UX？
4. Phase 4 制作生态扩展允许到什么边界？
5. External SVG 只检查、有限编辑，还是允许 Human 重建为 native Artifact？
6. Candidate Model Pool 是否只验证 DeepSeek，还是加入其他 Provider？
7. Model Selection 权重如何排序？
8. MVP 是否先记录 NFR Baseline，再定数值阈值？
9. 项目数据默认本地、会话级还是项目级持久化？
10. “个人作品集 Demo”是否放入面向外部的产品正文？

### 10.3 Truth Boundary

#### Implemented

- Custom Web Prototype；
- 本地 SVG-first 主链路中的 Rule / Tool / UI；
- Editable Brief、Design Spec、Artifact Revision、Preflight stale、Issue Routing、WARN Gate、Verified SVG export；
- Contract Dataset / Runner / v0.1—v0.4 Baseline；
- DeepSeek `brief.extract` experimental Provider smoke path。

#### Planned

- 主 Demo 的真实 Model Tasks；
- Model / Semantic、Workflow、UX Eval；
- 完整 NFR；
- 公开 Demo；
- 制作生态扩展；
- Verified PDF；
- 更完整的 Failure / Recovery。

#### Hypothesis

- MakerFlow 能减少理解或错误恢复成本；
- 用户认为结构化约束和 Preflight 有价值；
- 差异具有长期使用或商业价值；
- 两阶段检查能提高信任和任务成功。

#### 当前不得声称

- 已上线、已有用户增长或商业收益；
- 已实现效率提升；
- 已验证制造成功率；
- 已接入 xTool / Cricut / AImake；
- 已实现 Multi-Agent、RAG 或 Memory；
- 已实现 LLM as Judge；
- DeepSeek 已完成 Model Eval 或成为 Final Selection；
- MakerFlow 可以替代专业设计、CAM、材料测试或设备安全检查。

---

## 11 Appendix

### 11.1 Research Evidence

- `research/W2-D03/`
- `research/testing/`
- `docs/product/01_JTBD_v1.0.md`
- `docs/product/02_ASIS_Journey_v1.0.md`
- `docs/product/03_Problem_Priority_v1.0.md`
- `docs/product/05_Evidence_Matrix_v1.0.md`

### 11.2 Competitor Material

- `evidence/D05/05_W2-D01_创作到制作工作流研究.md`
- `competitor/W2-D01_2x2机会图与综合结论_v1.0.md`
- `competitor/V3-W2-D02_xTool生态能力边界拆解_v0.1.md`

### 11.3 Full Task Graph

- `docs/07.agent/06_Agent_Task_Graph_v1.0.md`
- `docs/07.agent/06_node_io_matrix.md`
- `docs/07.agent/06_node_io_matrix_v1.0.md`

### 11.4 Skill Contracts

- `docs/skills/07_Skill_Registry_v1.1.md`
- `docs/skills/Skill_Contract/`

### 11.5 Prompt Versions

- `prompts/brief.extract/v0.1.md`
- `prompts/brief.extract/CHANGELOG.md`

### 11.6 Eval Cases and Baselines

- `docs/evals/01_contract_eval_audit_v0.1.md`
- `docs/evals/02_contract_eval_manifest_v0.1.md`
- `evals/contract/cases.json`
- `evals/reports/contract_eval_baseline_mock_v0.1.md`
- `evals/reports/contract_eval_baseline_canonical_state_v0.2.md`
- `evals/reports/contract_eval_baseline_warn_human_gate_v0.3.md`
- `evals/reports/contract_eval_baseline_brief_validate_v0.4.md`
- `evals/artifacts/deepseek/`

### 11.7 Architecture

- `docs/architecture/12_Data_Model_v0.1.md`
- `docs/architecture/13_Design_Spec_Schema_v0.1.md`
- `docs/architecture/14_Context_Memory_Architecture_v0.1.md`
- `schemas/`

### 11.8 Demo / UI / Wireframes

- `prototype/README.md`
- `prototype/`
- `research/testing/`

### 11.9 Evidence Matrix

- `docs/prd/00_prd_evidence_matrix.md`

---

## Human Review Gate

本 Draft v0.1 已按当前证据形成完整结构，但以下内容在确认前不得升级为冻结 PRD：

- 四阶段指标和 Gate；
- Phase 4 边界；
- External Artifact 策略；
- Model Candidate Pool、权重和 Final Selection；
- Provider 自动切换权限；
- NFR 与产品数据政策；
- 面向外部的“个人作品集 Demo”表述位置。
