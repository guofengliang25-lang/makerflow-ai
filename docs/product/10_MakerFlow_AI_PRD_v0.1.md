# MakerFlow AI-native PRD v0.1

> Architecture ruling addendum (2026-08-16): 本节人工裁决优先于本文后续仍未同步的旧措辞。
>
> - `[DESIGN DECISION]` Brief字段状态为`confirmed / assumed / missing / needs_confirmation`；Brief lifecycle为`draft / ready_for_confirmation / confirmed / superseded`。Human确认的是满足关键字段Gate的`brief_revision`，不要求所有非关键字段均为confirmed。
> - `[DESIGN DECISION]` Design Spec使用`design_spec_revision`，Artifact使用独立`artifact_revision`并记录`source_design_spec_revision`；Preflight绑定`checked_artifact_revision`。
> - `[DESIGN DECISION]` MakerFlow-native路径由Design Spec作为创作事实来源；External SVG路径由外部Artifact作为事实来源，`design_spec_status`只能为`derived_partial`或`none`，不得承诺完整逆向恢复。
> - `[DESIGN DECISION]` 输出要求具有`requirement_level = required / preferred / optional`。required PDF缺失不阻止SVG部分导出，但整体handoff为blocked/incomplete；preferred PDF缺失为WARN。只有Human取消PDF要求并产生新`brief_revision`后才重新计算交付就绪度。
> - `[DESIGN DECISION]` Eval生命周期分为`definition_status`、`execution_status`和`latest_run_status`，不得用单一状态混合定义质量、可运行性与运行结果。
> - `[FACT]` 当前Demo尚未完整实现以上状态拆分；这是已知一致性缺口，不代表新增能力已经实现。

> `[FACT]` 文档状态：First Draft。  
> `[FACT]` 文档目的：归档与整合MakerFlow当前已有研究证据、产品决策、Agent架构、数据架构、Skill Contract和Eval资产。  
> `[DESIGN DECISION]` 本文不重新设计MakerFlow；详细技术规范继续保留在对应来源文件中。  
> `[DESIGN DECISION]` “AI-native”描述目标架构，不代表当前已经接入真实模型API。  
> `[FACT]` 当前日期：2026-08-16。

## 文档标签

| 标签 | 含义 |
|---|---|
| `FACT` | 有现有文件、实现、测试或研究记录直接支持 |
| `DESIGN DECISION` | 已通过人工裁决冻结的产品或架构选择 |
| `HYPOTHESIS` | 需要后续研究、实验或市场验证的判断 |
| `TARGET` | 未来希望达到的产品、模型或Eval状态，不是当前结果 |
| `NOT VALIDATED` | 当前没有足够证据或尚未完成实际验证 |

## Version Glossary

| 名称 | 含义 | 状态 |
|---|---|---|
| MakerFlow AI PRD v0.1 | 本产品决策汇总文档版本 | `[FACT]` First Draft |
| MakerFlow MVP Scope v0.2 | W2研究驱动范围文档 | `[FACT]` 现有范围来源之一 |
| MakerFlow v2.0 | Agent与产品讨论中使用的流程代号 | `[FACT]` 不等同于正式发布版本 |
| Prototype v0.2 | 当前SVG-first低保真Demo版本 | `[FACT]` 本地可运行原型 |
| Data / Context Architecture v0.1 | 数据、状态与上下文架构草案 | `[FACT]` Draft |
| Design Spec Schema v0.1 | canonical Design Spec草案 | `[FACT]` Draft，尚未冻结 |
| Skill Registry v1.1 | 11个Core Skill的注册表版本 | `[FACT]` Draft Registry |

`[DESIGN DECISION]` 上述版本号属于不同文档和资产序列，禁止把它们解释为同一个产品发布序列。

## Source of Truth优先级

1. `[DESIGN DECISION]` 用户最新人工裁决。
2. `[DESIGN DECISION]` Ask-vs-Act Policy与Human–AI Responsibility Matrix。
3. `[DESIGN DECISION]` Node I/O Matrix。
4. `[DESIGN DECISION]` Skill Registry v1.1与Skill Contracts。
5. `[FACT]` 当前可运行Demo、自动测试和Eval Baseline。
6. `[FACT]` Data / Context Architecture Draft。
7. `[FACT]` MVP Scope、JTBD、AS-IS、Problem Priority和Evidence Matrix。
8. `[FACT]` 早期Checker、旧流程和能力边界文档。

`[DESIGN DECISION]` 该优先级只解决术语、实现状态和流程版本冲突，不降低研究证据本身的重要性。

---

## 00 Executive Summary

`[DESIGN DECISION]` MakerFlow是面向设计学生和初级Maker的可制作作品助手：把模糊创意转成结构化设计约束，形成Creative Plan，建立内部Design Spec，确定性生成可编辑SVG草稿，并在本地导出前完成MakerFlow Preflight和问题路由。

`[DESIGN DECISION]` 当前MVP只处理“MomoRay模块化枕头包装内高度调节说明卡”这一场景，不扩展为通用AI图片生成器、完整矢量编辑器、设备控制软件或xTool Studio替代品。

`[FACT]` 当前Demo采用七步SVG-first流程，SVG从一开始就是用户看到的可视化作品和主要交付文件。PNG/JPG仅作为素材或参考，不存在“图片生成→图片转SVG→Preflight”的主链路。

`[FACT]` 当前T02 `brief.extract`、T04 `brief.ask_missing`、T06 `plan.generate`仍为Mock，没有DeepSeek、OpenAI或其他真实模型API接入。

`[FACT]` 当前已经存在本地Rule、Tool和UI：Brief状态编辑、Creative Plan Mock决策、Design Spec构建、本地SVG Renderer、受控编辑、Preflight、Issue Routing界面、本地Verified SVG导出和Studio Checklist展示。

`[DESIGN DECISION]` 当前只把Verified SVG写成已实现事实。Verified PDF为`[待确认]`，浏览器打印或另存PDF不等于PDF已经通过独立Preflight。

`[NOT VALIDATED]` MakerFlow尚未证明能够减少返工、缩短时间、降低错误或提高加工成功率。

---

## 01 Problem & Opportunity

### 01.1 Problem

`[FACT]` 三人研究共同支持：用户开始制作任务时，需求和约束通常不完整。现有样本包括两份真实制作经历和一份低经验情境访谈，三人均不是xTool Studio专项用户。

`[FACT]` 现有研究支持以下问题：

- `[FACT]` 初始任务与关键约束不完整；
- `[FACT]` confirmed、assumed、missing和needs_confirmation状态容易混杂；
- `[FACT]` 多工具流程中存在重复整理、上下文遗漏和版本负担；
- `[FACT]` 上游问题可能到下游工具才暴露；
- `[FACT]` 用户可能不知道问题应在哪个阶段、由谁解决；
- `[FACT]` 文件能够导入不等于生产就绪；
- `[FACT]` AI建议与人工确认责任边界需要明确。

`[FACT]` P01和P03的真实经历主要来自3D制作流程；这些证据支持“分阶段检查和人工确认”的架构，但不能直接证明SVG错误的频率或xTool Studio行为。

`[FACT]` P02属于情境回答，不得写成已经完成的真实说明卡制作行为。

### 01.2 Opportunity

`[DESIGN DECISION]` MakerFlow的机会不是“更懂材料参数”或“生成更漂亮图片”，而是：

1. `[DESIGN DECISION]` 在创作前把缺失、暂定和已确认约束显性化；
2. `[DESIGN DECISION]` 在作品生成与编辑过程中保持Brief、Plan、Design Spec和SVG之间的结构化关系；
3. `[DESIGN DECISION]` 在导出前检查可确定的SVG和Brief一致性问题；
4. `[DESIGN DECISION]` 将Studio设置和加工前事项清楚交还给操作人员；
5. `[DESIGN DECISION]` 为BLOCK、WARN和失败恢复提供责任方、解决位置和Next Step。

`[HYPOTHESIS]` 目标用户会认为“结构化约束→可编辑SVG→确定性Preflight→问题路由”比直接从模糊输入进入多个工具更容易理解和控制。

`[NOT VALIDATED]` 当前未验证该机会是否具有长期使用、付费或规模化价值。

详细依据见：[JTBD](01_JTBD_v1.0.md)、[AS-IS Journey](02_ASIS_Journey_v1.0.md)、[Problem Priority](03_Problem_Priority_v1.0.md)和[Evidence Matrix](05_Evidence_Matrix_v1.0.md)。

---

## 02 Target User & JTBD

`[DESIGN DECISION]` 目标用户为：有基础设计能力，但缺少完整制作交接经验的设计学生或初级Maker。

`[FACT]` 当前研究样本是邻近用户，而不是xTool Studio专项目标用户。

`[FACT]` 主JTBD的研究归纳为：当用户拿到一个信息不完整、最终需要进入设计与制作流程的任务时，希望逐步确认关键约束，并知道文件与制作问题应在哪个阶段、由谁处理，以形成可继续编辑和交接的文件，同时保留对高影响决定和最终加工的控制权。

`[FACT]` 主要功能任务包括：明确交付物和用途、补齐约束、区分字段状态、跨工具保留上下文、判断文件能否进入下一步、找到修复位置并保留加工前人工确认。

`[HYPOTHESIS]` 用户的情绪目标包括降低不确定感、在交付前看见风险、理解为什么能继续或必须停止，以及失败后知道如何恢复。

`[NOT VALIDATED]` 用户是否愿意长期维护Brief、Decision Log或项目状态尚未验证。

---

## 03 Evidence & Competitive Landscape

### 03.1 Evidence

`[FACT]` 当前研究样本量为3：P01为设计学生与3D打印项目参与者，P02为低经验情境用户，P03为3D打印制作侧从业者。

`[FACT]` 证据较强地支持模糊需求、两阶段检查、人工确认和问题路由；证据不足以支持具体SVG规则频率、xTool Studio缺陷、产品效果或付费意愿。

`[DESIGN DECISION]` Research severity S0–S3与Preflight issue severity `block/warn/info`是两套不同维度，不进行自动转换。

### 03.2 Competitive / Ecosystem Position

`[FACT]` Illustrator/Inkscape等专业工具擅长矢量编辑和导出，但约束识别主要由用户承担。

`[NOT VALIDATED]` xTool Studio位于文件导入、设置、Preview/Framing和设备交接阶段的具体行为仍待实际验证。

`[DESIGN DECISION]` MakerFlow不通过接管xTool生态建立差异；只有本地Verified SVG作为当前主要文件交付物。Brief、Plan、Preflight Report和Decision Log属于用户项目记录。

`[DESIGN DECISION]` Constraint Recommendations是辅助层，不是MakerFlow核心差异；但当前Demo仍需要Creative Plan决策页来连接Brief和Design Spec，P1不表示可以从当前流程中直接删除。

详细来源见：[xTool生态边界](../../competitor/V3-W2-D02_xTool生态能力边界拆解_v0.1.md)和[2×2机会图结论](../../competitor/W2-D01_2x2机会图与综合结论_v1.0.md)。

---

## 04 Why AI

### 04.1 适合LLM的问题

`[DESIGN DECISION]` 以下任务适合使用LLM，因为它们需要自然语言理解、上下文归纳或开放式候选生成：

- `[DESIGN DECISION]` T02 `brief.extract`：把模糊输入提取为结构化Brief候选；
- `[DESIGN DECISION]` T04 `brief.ask_missing`：根据确定性缺失/冲突结果生成中性追问；
- `[DESIGN DECISION]` T06 `plan.generate`：只针对尚未确定的约束生成有依据和取舍的Recommendation；
- `[TARGET]` T07 `design_spec.build`未来可让模型参与首次语义映射，但最终Schema和硬规则仍由Rule控制。

`[FACT]` 上述Model能力当前均未接真实模型；T02、T04、T06使用Mock，T07当前为local_rule。

### 04.2 不应该使用LLM的问题

`[DESIGN DECISION]` 以下能力必须保持确定性，不允许LLM改写硬规则：

- `[DESIGN DECISION]` Brief Schema、必填字段、枚举和冲突校验；
- `[DESIGN DECISION]` Design Spec硬约束；
- `[DESIGN DECISION]` SVG确定性渲染；
- `[DESIGN DECISION]` SVG结构检查；
- `[DESIGN DECISION]` Brief一致性检查；
- `[DESIGN DECISION]` Studio Readiness状态核对；
- `[DESIGN DECISION]` BLOCK/WARN/PASS路由；
- `[DESIGN DECISION]` Export门禁和本地文件导出；
- `[DESIGN DECISION]` 材料、设备、功率、速度、次数和安全参数的实际决定。

### 04.3 为什么纯传统软件不足

`[HYPOTHESIS]` 单纯表单和硬编码规则难以从多样化自然语言中识别隐含目标、来源差异、缺失约束和需要追问的语义。

`[HYPOTHESIS]` 单纯规则系统可以验证结构，却不适合生成自然、上下文相关且不过度诱导的追问和Creative Plan候选。

`[FACT]` 传统专业设计工具能编辑作品，但现有研究显示用户仍需自行整理产品事实、约束状态、跨工具责任和加工前确认。

### 04.4 为什么组合架构更合理

`[DESIGN DECISION]` MakerFlow采用Model + Tool + Rule + Human组合：

| Owner | 负责 | 不负责 |
|---|---|---|
| Model | 提取候选、生成追问、生成Recommendation | 不确认事实、不覆盖Rule、不决定加工参数 |
| Rule | Schema、状态、冲突、门禁、Studio Checklist和Issue Routing | 不生成开放式创意、不接受风险 |
| Tool | SVG渲染、文件检查、证据解析和本地导出 | 不推断材料、不自动修复、不控制设备 |
| Human | 提供事实、确认Brief/Plan/WARN/Export、编辑作品和完成Studio设置 | 不应被系统默认代签 |

`[DESIGN DECISION]` 该组合让开放式语义任务可以利用模型，同时将事实确认、硬规则、文件操作和风险接受保留在可测试、可解释的边界内。

---

## 05 Goals

### 05.1 User Goal

`[TARGET]` 用户能够把模糊任务转成一份状态清楚的Editable Brief，并理解当前缺少什么、什么已经确认、什么仍是暂定。

`[TARGET]` 用户能够获得并编辑一份原生SVG作品，而不是只得到不可编辑的生成图片。

`[TARGET]` 用户能够区分导入前必须解决的问题和进入Studio后仍需人工完成的事项。

`[TARGET]` 用户能够理解PASS只代表通过MakerFlow当前规则，不代表生产就绪或加工成功。

### 05.2 Product Goal

`[TARGET]` 在单一MomoRay说明卡场景中验证七步SVG-first流程是否可理解、可操作、可恢复。

`[TARGET]` 让Brief、Creative Plan、Design Spec、SVG revision和Preflight结果之间保持明确版本关系。

`[TARGET]` 对BLOCK、WARN和Studio待办提供明确责任方、解决位置和Next Step。

### 05.3 Model Goal

`[TARGET]` 未来Model Provider能够按照Provider-neutral Skill Contract输出合法结果，不编造产品事实、不重复推荐confirmed约束、不越过Human Gate。

`[TARGET]` DeepSeek原型应在Contract Eval与Semantic Eval中达到可接受结果后，才进入下一阶段评估。

`[NOT VALIDATED]` 可接受分数、延迟、成本和稳定性阈值尚未确定。

### 05.4 Eval Goal

`[TARGET]` Contract Eval能够稳定识别Schema、事实边界、确定性规则、状态污染和Provider兼容问题。

`[TARGET]` 补齐Semantic Eval、Workflow Eval和UX Eval，并建立回归基线。

`[FACT]` 当前Contract Eval Baseline为12项：PASS 4、FAIL 3、SKIPPED_PROVIDER_REQUIRED 5。

### 05.5 Business / Product Hypothesis

`[HYPOTHESIS]` MakerFlow可能降低用户从模糊需求到可交接SVG过程中的理解成本和错误恢复成本。

`[HYPOTHESIS]` 目标用户可能愿意使用轻量Brief、Creative Plan和Preflight，而不是在多个工具中重复整理约束。

`[HYPOTHESIS]` 清晰的Authority和Truth Boundary可能提升用户对AI辅助制作流程的信任。

`[NOT VALIDATED]` 当前没有收入、转化、留存、付费意愿或市场规模指标，不设置虚构数值目标。

---

## 06 Scope & Non-goals

### 06.1 Current MVP Scope

`[DESIGN DECISION]` 单一场景：MomoRay模块化枕头包装内高度调节说明卡。

`[DESIGN DECISION]` 当前MVP范围：

- `[DESIGN DECISION]` Define与任务输入；
- `[DESIGN DECISION]` Editable Brief与字段状态；
- `[DESIGN DECISION]` Creative Plan决策页；
- `[DESIGN DECISION]` Build Design Spec；
- `[DESIGN DECISION]` 本地SVG Renderer；
- `[DESIGN DECISION]` 受控结构化编辑和group拖动；
- `[DESIGN DECISION]` MakerFlow Preflight三层检查；
- `[DESIGN DECISION]` Issue Routing；
- `[DESIGN DECISION]` WARN Human Confirm；
- `[DESIGN DECISION]` 本地Verified SVG导出；
- `[DESIGN DECISION]` Studio Checklist展示。

`[DESIGN DECISION]` Constraint Recommendations不是核心差异，但Creative Plan决策页保留为当前Demo必经流程。

`[DESIGN DECISION]` T14 Apply Safe Fix只作为Task Graph架构占位，不属于当前MVP Functional Requirement；当前自动修复权限为BLOCK。

### 06.2 Non-goals

- `[DESIGN DECISION]` 不做通用Prompt-to-image；
- `[DESIGN DECISION]` 不做图片生成后转SVG；
- `[DESIGN DECISION]` 不做完整Illustrator/Figma式矢量编辑器；
- `[DESIGN DECISION]` 不做3D模型检查或修复；
- `[DESIGN DECISION]` 不自动决定材料、功率、速度、次数或安全参数；
- `[DESIGN DECISION]` 不自动修复SVG；
- `[DESIGN DECISION]` 不控制设备或执行加工；
- `[DESIGN DECISION]` 不声称xTool Studio读取Brief、Design Spec、Preflight JSON或Decision Log；
- `[DESIGN DECISION]` 不保证生产就绪、安全或加工成功；
- `[DESIGN DECISION]` 不把Verified PDF写成当前FACT；
- `[DESIGN DECISION]` 不建立企业级完整审计系统。

### 06.3 Future / Backlog

`[NOT VALIDATED]` `studio.handoff`仅是未来概念候选，必须在实际验证Studio能力后独立评估，不能扩大`artifact.export`职责。

`[NOT VALIDATED]` `issue.safe_fix`位于Backlog，不代表计划实施。

`[NOT VALIDATED]` Verified PDF是否进入后续范围为`[待确认]`。

---

## 07 Product Experience

### 07.1 Current Seven-step Flow

```text
1. Define
→ 2. Editable Brief
→ 3. Creative Plan
→ 4. Create & Edit
→ 5. MakerFlow Preflight
→ 6. Resolve Issues
→ 7. Export & Handoff
```

`[DESIGN DECISION]` 以上最新七步SVG-first流程取代早期“Brief直接进入候选SVG/PDF”的流程；早期流程标记为superseded。

### 07.2 Define

`[FACT]` 用户通过主自然语言输入描述作品，并可上传PNG/JPG/PDF/SVG参考资料。当前“提取需求”使用Mock数据，不调用模型API。

### 07.3 Editable Brief

`[FACT]` Brief包含交付物、用途、目标用户、最终需要呈现、已确认产品事实、成品尺寸、材料方向、颜色方向、输出格式和视觉辅助需求等字段。

`[DESIGN DECISION]` 成品尺寸是一个组合逻辑字段；缺失关键尺寸必须ASK，候选尺寸必须由用户CONFIRM。

`[FACT]` 当前Demo在选择A6时直接写入confirmed，与权限政策尚未完全一致。

### 07.4 Creative Plan

`[DESIGN DECISION]` confirmed Brief字段只作为locked constraints，不再次生成Recommendation。

`[FACT]` 当前Mock Plan支持单项接受、拒绝、补充要求、重新考虑和局部换建议。

`[DESIGN DECISION]` 用户接受/拒绝Recommendation属于CONFIRM；accepted Plan与confirmed Brief共同输入T07。

### 07.5 Create & Edit

`[DESIGN DECISION]` MakerFlow-native路径中Design Spec是内部创作事实来源，用户通过结构化属性面板和Controlled Direct Manipulation编辑，而不是直接编辑JSON。External SVG路径中Artifact是事实来源，MakerFlow只保留可靠解析出的`derived_partial` Spec或`none`。

`[FACT]` 可拖动group包括标题、三条步骤、页脚和视觉辅助；cutline、artboard boundary和单个path anchor不可拖动。

`[FACT]` 修改后更新Design Spec position、revision和SVG，并使旧Preflight失效。

### 07.6 MakerFlow Preflight

`[DESIGN DECISION]` 统一使用“MakerFlow Preflight”，只有历史引用保留“Checker”。

`[FACT]` 三层检查为：SVG File Check、Brief Consistency Check、Studio Readiness Checklist。

`[DESIGN DECISION]` Studio Readiness只读取Project State，不从SVG推断材料、设备或加工参数。

### 07.7 Resolve Issues

`[DESIGN DECISION]` BLOCK禁止Export，用户必须返回内置编辑或外部工具修复后重新Preflight。

`[DESIGN DECISION]` WARN必须由用户查看证据并CONFIRM；确认只对当前revision有效。

### 07.8 Export & Handoff

`[FACT]` 当前只进行本地`verified_design.svg`下载和摘要展示，不向Studio发送数据。

`[DESIGN DECISION]` Export后只展示设备、材料、加工参数、Preview、Framing和加工前确认待办，不进入设备执行。

### 07.9 Prototype

`[FACT]` 原型路径：`projects/MakerFlow-AI/prototype/`。

`[FACT]` 本地启动：`py -m http.server 8000 -d prototype`，访问`http://localhost:8000/`；QA模式为`http://localhost:8000/?qa=1`。

`[FACT]` 详细运行说明见[Prototype README](../../prototype/README.md)。

---

## 08 System / Agent Architecture

`[DESIGN DECISION]` Agent Task Graph保持T01–T17总体架构，不在PRD中复制完整节点Contract。

`[DESIGN DECISION]` 实现状态以[Node I/O Matrix](../07.agent/06_node_io_matrix.md)和[Skill Registry v1.1](../skills/07_Skill_Registry_v1.1.md)为准：

- `[FACT]` `mock`：T02、T04、T06；
- `[FACT]` `local_rule`：T03、T07、T12、T13；
- `[FACT]` `local_tool`：T08、T10、T11、T16；
- `[FACT]` `implemented_ui`：T01、T05、T09、T15、T17；
- `[DESIGN DECISION]` T14当前按Backlog/权限BLOCK处理。

`[FACT]` Registry包含11个Core Skill：`brief.extract`、`brief.validate`、`brief.ask_missing`、`plan.generate`、`design_spec.build`、`svg.render`、`svg.file_check`、`brief.consistency_check`、`studio.readiness_check`、`issue.route`、`artifact.export`。

`[DESIGN DECISION]` Human Gate和单纯UI动作不注册为Skill。

`[FACT]` Skill Contract实际路径为`docs/skills/Skill_Contract/`。Registry表内部分旧路径未同步，属于文档维护缺口。

详细架构见[Agent Task Graph](../07.agent/06_Agent_Task_Graph_v1.0.md)、[Node I/O Matrix](../07.agent/06_node_io_matrix.md)及[Skill Registry](../skills/07_Skill_Registry_v1.1.md)。

---

## 09 Data / State / Memory

`[DESIGN DECISION]` 数据架构采用“版本化结构对象 + 当前版本指针 + 关键确认追加记录”。

| 对象 | 产品职责 | 状态 |
|---|---|---|
| Brief | 事实、约束、字段状态和确认 | `[FACT]` Demo存在 |
| Creative Plan | 未确定约束的候选建议和用户决定 | `[FACT]` Demo存在Mock数据 |
| Design Spec | MakerFlow-native路径的内部创作事实来源；External SVG路径不保证完整恢复 | `[FACT]` Demo存在；canonical Schema Draft；authoring来源状态尚未在Demo实现 |
| Project State | 设备、材料、参数、Preview、Framing状态 | `[FACT]` Demo存在 |
| Artifact Revision | 绑定某次Design Spec渲染结果 | `[DESIGN DECISION]` 架构已定义，Demo尚未完全拆分 |
| Preflight Report | 绑定当前作品revision的检查结果 | `[FACT]` Demo存在 |
| Decision Log | 关键Brief、Plan、WARN和Export确认追加记录 | `[DESIGN DECISION]` 轻量范围；未形成企业级审计 |
| Session Context | 当前步骤、选择、缩放、平移、Undo等 | `[FACT]` Demo状态中存在 |
| Retrieved Knowledge | 带来源的未来检索结果 | `[NOT VALIDATED]` 当前无RAG |

`[DESIGN DECISION]` Human confirmed Structured State优先于Recommendation、Retrieved Knowledge和旧模型输出。

`[DESIGN DECISION]` 作品或相关状态变化后，旧Preflight和WARN确认必须失效。

`[FACT]` 当前Demo Design Spec使用`canvas/content/style/output_requirements`；canonical Draft建议使用`artboard/content_blocks/palette/production_requirements`。两者映射尚未完成，Schema为`[待确认]`。

`[DESIGN DECISION]` Skill Contract中的Design Spec示例不是冻结Schema。

详细定义见[Data Model](../architecture/12_Data_Model_v0.1.md)、[Design Spec Schema Draft](../architecture/13_Design_Spec_Schema_v0.1.md)和[Context Architecture](../architecture/14_Context_Memory_Architecture_v0.1.md)。

---

## 10 Model Strategy

### 10.1 Current State

`[FACT]` 当前Model能力为Mock：T02、T04、T06没有真实模型调用。

`[FACT]` 当前Demo的Brief提取和Creative Plan内容来自本地Mock JSON或固定逻辑，不能写成真实AI能力。

### 10.2 Planned Prototype Provider

`[TARGET]` DeepSeek是planned prototype provider，用于未来验证`brief.extract`、`brief.ask_missing`和`plan.generate`等Model Skill。

`[DESIGN DECISION]` 未经Contract Eval、Semantic Eval、Workflow Eval和成本/延迟评估，不得把DeepSeek写成最终模型选型。

`[DESIGN DECISION]` Provider变化不得改变Skill ID、Skill I/O Contract、Task Graph、Rule边界或Human Gate。

### 10.3 Model Selection Criteria

`[TARGET]` 未来选型至少比较：

- `[TARGET]` Contract Schema遵从率；
- `[TARGET]` 产品事实忠实度；
- `[TARGET]` 缺失约束识别质量；
- `[TARGET]` 追问中性与必要性；
- `[TARGET]` Recommendation边界遵从；
- `[TARGET]` 中文表达质量；
- `[TARGET]` 延迟、成本、稳定性和可观测性；
- `[TARGET]` Provider替换与fallback能力。

`[NOT VALIDATED]` 具体模型版本、评分权重、最低阈值、延迟阈值和成本预算均为`[待确认]`。

### 10.4 Fallback

`[DESIGN DECISION]` Model输出非法JSON时Fail Closed，不Normalize为成功结果，不允许污染下游。

`[DESIGN DECISION]` 缺少只能由用户提供的事实时返回ASK，不由fallback默认值自动补写。

`[TARGET]` Provider不可用时应保留用户输入和现有Structured State，并允许用户稍后重试或手动完成受影响步骤。

`[NOT VALIDATED]` timeout、自动重试次数、退避策略、Provider切换条件和错误Envelope为`[待确认]`。

### 10.5 Training and Eval Data

`[FACT]` 当前无Fine-tuning。

`[FACT]` Training Dataset：Not Applicable（N/A）。

`[FACT]` Eval Dataset独立存在于`evals/contract/cases.json`，不得称为Training Dataset。

`[NOT VALIDATED]` 未来是否需要Fine-tuning或训练数据没有现有依据。

---

## 11 Prompt Strategy

`[NOT VALIDATED]` 当前尚未建立正式Prompt Inventory、Prompt模板、版本号或changelog。

`[TARGET]` 每个未来Prompt记录：prompt_id、version、related_skill、related_task_node、input contract、output contract、related_eval、change reason和changelog。

`[DESIGN DECISION]` Prompt不得重新定义Skill职责、绕过Schema、覆盖Human confirmed事实或修改Rule硬约束。

`[TARGET]` Prompt变更必须运行关联Contract Eval和Semantic Eval；发生回归时不得通过静默修改Expected掩盖问题。

`[NOT VALIDATED]` Prompt审批人、版本格式、存储路径和回滚政策为`[待确认]`。

---

## 12 Authority & Guardrails

### 12.1 Authority States

`[DESIGN DECISION]` MakerFlow只使用四种authority：`ACT`、`ASK`、`CONFIRM`、`BLOCK`。Recommendation是输出类型，不是第五种authority。

| 场景 | Authority | 决策 |
|---|---|---|
| 提取Brief候选 | ACT | `[DESIGN DECISION]` Model可提取，但不能确认 |
| 缺失关键尺寸或产品事实 | ASK | `[DESIGN DECISION]` 必须询问用户 |
| 确认Brief或候选事实 | CONFIRM | `[DESIGN DECISION]` Human Gate |
| 生成Creative Plan | ACT | `[DESIGN DECISION]` 只建议未确定约束 |
| 接受/拒绝Plan | CONFIRM | `[DESIGN DECISION]` Human决定 |
| 构建合法Design Spec | ACT | `[DESIGN DECISION]` 新高影响决定则ASK，冲突则BLOCK |
| 渲染合法SVG | ACT | `[DESIGN DECISION]` Spec不足则BLOCK |
| 用户编辑作品 | ACT | `[DESIGN DECISION]` 修改后系统ACT使旧检查失效 |
| 运行Preflight | ACT | `[DESIGN DECISION]` Rule/Tool确定性执行 |
| 导入前BLOCK | BLOCK | `[DESIGN DECISION]` 不得确认绕过 |
| 可接受WARN | CONFIRM | `[DESIGN DECISION]` 仅Human可接受风险 |
| 触发Export | CONFIRM | `[DESIGN DECISION]` Human触发 |
| 本地导出 | ACT | `[DESIGN DECISION]` Tool忠实导出当前revision |
| Studio实际设置 | ASK / CONFIRM | `[DESIGN DECISION]` 由操作人员提供和确认 |
| Studio原生交接 | BLOCK | `[DESIGN DECISION]` 当前无已验证集成 |
| 自动修复 | BLOCK | `[DESIGN DECISION]` 当前返回用户编辑 |
| 保证加工成功 | BLOCK | `[DESIGN DECISION]` 永不由当前Preflight结果推出 |

### 12.2 Guardrails

`[DESIGN DECISION]` confirmed事实只能由Human显式修改；模型输出不得自动设置confirmed。

`[DESIGN DECISION]` Creative Plan不得对confirmed约束重复Recommendation。

`[DESIGN DECISION]` Design Spec与Brief/Plan冲突时BLOCK，不修改Brief迎合Plan。

`[DESIGN DECISION]` T12只读Project State；从SVG推断材料、设备或参数属于BLOCK行为。

`[DESIGN DECISION]` BLOCK不能直接Export；WARN确认必须绑定当前revision。

`[DESIGN DECISION]` 当前本地导出由`artifact.export`执行；未来Studio原生交接如果成立，应另建`studio.handoff`，不得扩大现有Skill职责。

详细政策见[Ask-vs-Act](08_Ask_vs_Act_Policy_v1.0.md)和[Human–AI Responsibility Matrix](09_Human_AI_Responsibility_Matrix_v1.0.md)。

---

## 13 Eval Strategy

### 13.1 Eval Types

| Eval类型 | 目的 | 当前状态 |
|---|---|---|
| Contract Eval | 检查I/O、Schema、禁止行为和确定性边界 | `[FACT]` 已有Dataset、Runner和Baseline |
| Semantic Eval | 检查事实忠实度、缺失识别、追问与建议语义 | `[NOT VALIDATED]` 尚未形成可执行正式集合 |
| Workflow Eval | 检查跨节点路径、revision、WARN和Export门禁 | `[FACT]` Case已定义；自动入口不完整 |
| UX Eval | 检查用户能否理解Brief、BLOCK、Studio边界和PASS | `[TARGET]` 已有测试脚本/标准，最新实测结果不足 |

### 13.2 Contract Eval Dataset

`[FACT]` Provider-neutral Dataset位于`evals/contract/cases.json`；Runner位于`evals/runners/run_contract_evals.js`。

`[FACT]` grader类型只允许`deterministic`、`human_rubric`、`model_grader_future`。

`[DESIGN DECISION]` future_model Case在当前无Provider时标记`SKIPPED_PROVIDER_REQUIRED`，不得使用伪造输出。

### 13.3 Current Baseline

`[FACT]` 当前Baseline：total 12、PASS 4、FAIL 3、SKIPPED 5。

`[FACT]` PASS：E05、E07、E08、E09。

`[FACT]` FAIL：

- `[FACT]` E02：A6映射存在于`plan-policy`，但没有可调用的`brief.validate`实现/规范化输出位置；
- `[FACT]` E10：Demo UI存在revision/Preflight失效逻辑，但Node Runner没有可调用的workflow_state入口；
- `[FACT]` E11：Demo UI存在WARN门禁逻辑，但Node Runner没有可调用的workflow_authority入口。

`[FACT]` SKIPPED_PROVIDER_REQUIRED：E01、E03、E04、E06、E12。

`[DESIGN DECISION]` 产品行为与Eval冲突时FAIL并报告Expected/Actual，不修改产品逻辑或偷偷修改Expected。

### 13.4 Regression

`[TARGET]` 本地Rule/Tool变更运行所有deterministic Contract Eval及Prototype单元测试。

`[TARGET]` Prompt或Model Provider变更运行关联Contract、Semantic和Provider Compatibility Eval。

`[TARGET]` 七步流程、Authority或状态逻辑变更运行Workflow和UX回归。

`[NOT VALIDATED]` CI触发条件、阻断阈值、model grader和报告保留政策为`[待确认]`。

详见[Contract Eval Audit](../evals/01_contract_eval_audit_v0.1.md)、[Manifest](../evals/02_contract_eval_manifest_v0.1.md)及[Baseline Report](../../evals/reports/contract_eval_baseline_mock_v0.1.md)。

---

## 14 Reliability

`[DESIGN DECISION]` Schema validation、Rule validation和版本检查优先于下游执行。

`[DESIGN DECISION]` A6映射归属`brief.validate`，但当前实现归属冲突仍为FAIL，不能在PRD中写成已解决。

`[DESIGN DECISION]` 非法Model JSON采用Fail Closed；当前正式错误Envelope和错误码为`[待确认]`。

`[DESIGN DECISION]` 缺失事实使用ASK；冲突返回上游或BLOCK；不得用默认值掩盖缺失。

`[DESIGN DECISION]` Renderer输入非法时返回失败，不自行决定布局或补创意。

`[DESIGN DECISION]` 修改Design Spec或SVG后，旧Preflight、WARN确认和Export资格立即失效。

`[FACT]` Create & Edit提供至少一次Undo和重置布局；企业级版本回滚尚未实现。

`[TARGET]` 所有失败输出包含可定位原因、Expected/Actual或用户可理解的Next Step。

`[NOT VALIDATED]` retry次数、timeout、backoff、幂等策略、错误码、rollback历史深度和可观测事件为`[待确认]`。

---

## 15 Functional Requirements

| ID | Requirement | Evidence | Task Node | Skill | Authority | Eval | 状态 |
|---|---|---|---|---|---|---|---|
| FR-01 | 接收initial/clarification任务输入并区分事实与参考 | J01 | T01 | 非Skill | ACT | E01部分 | `[FACT]` implemented_ui |
| FR-02 | 提取Brief candidate，不确认事实 | J01/J08 | T02 | `brief.extract` | ACT | E01/E03/E04 | `[FACT]` mock |
| FR-03 | 确定性校验Brief缺失、冲突和状态 | J01/J02 | T03 | `brief.validate` | ACT | E01/E02 | `[FACT]` local_rule；E02 FAIL |
| FR-04 | 对必要缺口生成中性追问 | J01/J09 | T04 | `brief.ask_missing` | ASK | E01 | `[FACT]` mock |
| FR-05 | 用户确认当前Brief版本 | J02/J09 | T05 | 非Skill | CONFIRM | UX Eval `[待确认]` | `[FACT]` implemented_ui |
| FR-06 | 只对未确定约束生成Creative Plan | J08/J10 | T06 | `plan.generate` | ACT→CONFIRM | E05 | `[FACT]` mock数据；筛选PASS |
| FR-07 | 将confirmed Brief与accepted Plan映射为Design Spec | 产品架构决策 | T07 | `design_spec.build` | ACT/ASK/BLOCK | Schema Eval `[待确认]` | `[FACT]` local_rule |
| FR-08 | 按合法Design Spec确定性渲染SVG | 产品架构决策 | T08 | `svg.render` | ACT/BLOCK | Contract test | `[FACT]` local_tool |
| FR-09 | 用户通过结构化控件和group拖动编辑作品 | 原型验证目标 | T09 | 非Skill | ACT | E10/UX | `[FACT]` implemented_ui；E10 Runner FAIL |
| FR-10 | 检查当前真实SVG结构 | J05/J07 | T10 | `svg.file_check` | ACT | E07 | `[FACT]` local_tool，PASS |
| FR-11 | 比较SVG、Design Spec与confirmed Brief | J02/J07 | T11 | `brief.consistency_check` | ACT/BLOCK | E08 | `[FACT]` local_tool，PASS |
| FR-12 | 只从Project State生成Studio待办 | J06/J07 | T12 | `studio.readiness_check` | ACT | E09 | `[FACT]` local_rule，PASS |
| FR-13 | 聚合检查并路由BLOCK/WARN/PASS | J06/J09 | T13 | `issue.route` | ACT/BLOCK | E11 | `[FACT]` local_rule；Workflow Runner FAIL |
| FR-14 | 用户确认当前revision WARN | J09 | T15 | 非Skill | CONFIRM | E11 | `[FACT]` implemented_ui；自动Workflow入口缺失 |
| FR-15 | 用户触发后本地导出Verified SVG | J07/J09 | T16 | `artifact.export` | CONFIRM→ACT | E11部分 | `[FACT]` local_tool |
| FR-16 | 展示Studio Checklist并停止于交接 | J06/J07 | T17 | 非Skill | ACT→CONFIRM | E09/UX | `[FACT]` implemented_ui |
| FR-17 | 作品修改后增加revision并使旧检查失效 | 恢复路径证据/架构决策 | T09/T08/T13 | 多Skill工作流 | ACT | E10 | `[FACT]` Demo UI存在；Runner FAIL |

`[DESIGN DECISION]` T14不列为当前MVP Functional Requirement。

---

## 16 Non-functional Requirements

| NFR | 要求 | 状态 |
|---|---|---|
| Portability | 原生HTML/CSS/JS，可通过Python http.server、GitHub Pages、Netlify运行 | `[FACT]` 当前Demo支持 |
| API Independence | 当前本地流程不依赖真实模型或Studio API | `[FACT]` |
| Determinism | Rule/Tool对相同输入和规则版本产生相同结果 | `[DESIGN DECISION]` |
| Privacy | 用户项目数据的存储、保留和删除政策 | `[待确认]` |
| Latency | Model和本地检查响应目标 | `[待确认]` |
| Cost | 单次Model调用和项目预算 | `[待确认]` |
| Reliability | 超时、重试、错误率和可用性目标 | `[待确认]` |
| Observability | Model、Rule、Tool、Eval和状态事件 | `[待确认]` |
| Accessibility | 键盘、焦点、对比度、屏幕阅读器目标 | `[待确认]` |
| Storage | localStorage容量、迁移、TTL和历史保留 | `[待确认]` |

`[DESIGN DECISION]` 不虚构任何尚未定义的性能、成本、可靠性或业务数值。

---

## 17 Acceptance Criteria

### 17.1 Product Flow

- `[TARGET]` 用户可以完成七步流程，且每一步能够说明当前任务、下一步和继续/阻塞原因。
- `[TARGET]` 早期流程不再出现在正式体验说明中，除历史引用外统一使用最新七步流程。

### 17.2 Brief and Plan

- `[TARGET]` 用户能识别关键缺失字段。
- `[TARGET]` 用户能区分confirmed、assumed、missing和needs_confirmation。
- `[TARGET]` confirmed字段不会在Creative Plan中被重复推荐。
- `[TARGET]` 用户理解Recommendation需要接受/拒绝，不等于事实。

### 17.3 Create & Edit

- `[FACT]` 当前Renderer输出原生SVG，不用Canvas位图替代。
- `[TARGET]` 修改结构化属性或拖动group后，Design Spec和SVG同步更新。
- `[TARGET]` 修改后revision增加，旧Preflight和WARN确认失效。
- `[TARGET]` 用户不需要查看或编辑Design Spec JSON。

### 17.4 Preflight and Routing

- `[TARGET]` 用户能区分SVG File Check、Brief Consistency Check和Studio Readiness Checklist。
- `[TARGET]` malformed SVG产生BLOCK；Brief尺寸冲突产生BLOCK；材料pending只进入Studio待办。
- `[TARGET]` BLOCK不能导出；WARN未经Human Confirm不能导出。
- `[TARGET]` 每个issue提供证据、责任方、解决位置和Next Step。

### 17.5 Export and Truth Boundary

- `[FACT]` 当前只验收本地Verified SVG导出。
- `[TARGET]` 导出Artifact与当前已检查revision一致。
- `[TARGET]` 页面明确显示“通过MakerFlow当前规则，不代表保证加工成功”。
- `[TARGET]` Studio Checklist不被解释为已自动设置设备。

### 17.6 Eval Acceptance

- `[TARGET]` 所有deterministic Case可重复运行并输出total/pass/fail/skipped。
- `[TARGET]` FAIL必须显示Expected和Actual。
- `[TARGET]` Provider-required Case在未接模型时保持SKIPPED_PROVIDER_REQUIRED。
- `[TARGET]` DeepSeek原型接入前后复用同一Provider-neutral Dataset。
- `[NOT VALIDATED]` 当前Baseline仍有E02、E10、E11三项FAIL，不能宣布Eval全部通过。

### 17.7 UX Acceptance

- `[TARGET]` 受试者能够识别缺失字段、BLOCK、修复位置、SVG问题和Studio设置的区别。
- `[TARGET]` 受试者能够说明PASS不等于加工成功。
- `[NOT VALIDATED]` 最新七步版本的正式用户测试结果尚未形成。

---

## 18 Risks & Open Questions

| Risk / Question | 状态 |
|---|---|
| 三个邻近样本能否代表xTool初级用户 | `[NOT VALIDATED]` |
| Editable Brief是否负担过高 | `[HYPOTHESIS]` |
| Creative Plan是否帮助决策而非增加步骤 | `[HYPOTHESIS]` |
| SVG规则频率、严重度和误报 | `[NOT VALIDATED]` |
| xTool Studio真实导入、尺寸和对象行为 | `[待实际验证]` |
| DeepSeek是否满足Contract和中文语义质量 | `[NOT VALIDATED]` |
| Model成本、延迟和fallback | `[待确认]` |
| Design Spec canonical Schema与Demo mapping | `[待确认]` |
| E02 `brief.validate`规范化归属冲突 | `[FACT]` 当前FAIL |
| E10/E11 Workflow Eval调用入口 | `[FACT]` 当前不可运行 |
| T14仍存在于Task Graph | `[FACT]` 当前仅架构占位，MVP权限BLOCK |
| Node Matrix T16 target与Registry不一致 | `[FACT]` PRD采用Registry/Contract local_tool |
| Skill Registry Contract路径未同步 | `[FACT]` 文档维护缺口 |
| PDF是否进入Verified范围 | `[待确认]` |
| RAG、知识有效期和引用机制 | `[待确认]` |
| Decision Log是否具有用户价值 | `[HYPOTHESIS]` |
| MakerFlow是否减少返工或时间 | `[HYPOTHESIS]` |
| 长期使用和付费意愿 | `[HYPOTHESIS]` |

---

## 19 Truth Boundary

### 19.1 当前可以写成FACT

- `[FACT]` 存在一个可本地运行的七步SVG-first低保真Demo。
- `[FACT]` 存在Editable Brief、Mock Creative Plan、内部Design Spec、本地SVG Renderer和结构化编辑UI。
- `[FACT]` Preflight检查当前SVG字符串、Brief/Design Spec和独立Project State。
- `[FACT]` 当前存在本地SVG File Check、Brief Consistency Check、Studio Readiness和Issue Routing逻辑。
- `[FACT]` 当前支持本地Verified SVG下载。
- `[FACT]` 当前存在Task Graph、Node I/O Matrix、11个Core Skill、Skill Contracts、数据架构草案和Contract Eval资产。
- `[FACT]` Contract Eval Baseline为4 PASS、3 FAIL、5 SKIPPED。

### 19.2 当前必须写成Mock

- `[FACT]` `brief.extract`当前为Mock。
- `[FACT]` `brief.ask_missing`当前为Mock。
- `[FACT]` `plan.generate`当前为Mock。
- `[FACT]` Demo中的“提取需求”和Creative Plan不代表真实模型已经完成推理。

### 19.3 当前只能写成Planned Prototype

- `[TARGET]` DeepSeek是planned prototype provider，不是最终选型。
- `[TARGET]` 未来模型只在通过Contract、Semantic和Workflow Eval后进入下一阶段。
- `[NOT VALIDATED]` `studio.handoff`仅为概念候选。

### 19.4 当前不得声称

- `[DESIGN DECISION]` 不声称MakerFlow已经降低返工、节省时间或减少错误。
- `[DESIGN DECISION]` 不声称MakerFlow保证生产就绪、安全或加工成功。
- `[DESIGN DECISION]` 不声称xTool Studio读取Brief、Design Spec、Preflight JSON或Decision Log。
- `[DESIGN DECISION]` 不声称MakerFlow已经接入AImake、xTool Studio、DeepSeek或OpenAI。
- `[DESIGN DECISION]` 不声称MakerFlow能从SVG判断材料、设备或加工参数。
- `[DESIGN DECISION]` 不声称当前已经生成Verified PDF。
- `[DESIGN DECISION]` 不把P02情境回答写成真实制作行为。
- `[DESIGN DECISION]` 不把3D模型问题直接写成SVG高频问题。
- `[DESIGN DECISION]` 不把Draft Design Spec Schema或Contract示例写成冻结接口。
- `[DESIGN DECISION]` 不把AI-native目标架构写成已实现AI能力。

---

## 20 Reference Index

### Product and Research

- [JTBD v1.0](01_JTBD_v1.0.md)
- [AS-IS Journey v1.0](02_ASIS_Journey_v1.0.md)
- [Problem Priority v1.0](03_Problem_Priority_v1.0.md)
- [MVP Scope v0.2](04_MVP_Scope_v0.2.md)
- [Evidence Matrix v1.0](05_Evidence_Matrix_v1.0.md)
- [Ask-vs-Act Policy v1.0](08_Ask_vs_Act_Policy_v1.0.md)
- [Human–AI Responsibility Matrix v1.0](09_Human_AI_Responsibility_Matrix_v1.0.md)

### Agent and Skills

- [Agent Task Graph v1.0](../07.agent/06_Agent_Task_Graph_v1.0.md)
- [Node I/O Matrix](../07.agent/06_node_io_matrix.md)
- [Skill Registry v1.1](../skills/07_Skill_Registry_v1.1.md)
- [Skill Contracts](../skills/Skill_Contract/)

### Data and Context

- [Data Model v0.1](../architecture/12_Data_Model_v0.1.md)
- [Design Spec Schema v0.1 Draft](../architecture/13_Design_Spec_Schema_v0.1.md)
- [Context & Memory Architecture v0.1](../architecture/14_Context_Memory_Architecture_v0.1.md)

### Eval

- [Contract Eval Audit v0.1](../evals/01_contract_eval_audit_v0.1.md)
- [Contract Eval Manifest v0.1](../evals/02_contract_eval_manifest_v0.1.md)
- [Executable Contract Eval Dataset](../../evals/contract/cases.json)
- [Contract Eval Baseline Mock v0.1](../../evals/reports/contract_eval_baseline_mock_v0.1.md)

### Prototype and Ecosystem

- [Prototype README](../../prototype/README.md)
- [xTool生态能力边界](../../competitor/V3-W2-D02_xTool生态能力边界拆解_v0.1.md)
- [2×2机会图与综合结论](../../competitor/W2-D01_2x2机会图与综合结论_v1.0.md)

---

> `[FACT]` 本文是第一稿。  
> `[NOT VALIDATED]` 所有`[待确认]`、`[待实际验证]`、HYPOTHESIS和TARGET内容仍需对应的人工裁决、模型Eval、用户研究或设备软件验证。
