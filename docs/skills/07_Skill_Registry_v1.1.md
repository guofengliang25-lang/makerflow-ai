# MakerFlow Skill Registry v1.1（草案）

> 范围：对Skill Registry v1.0进行增量收口，不重新设计Agent Task Graph或Skill体系。  
> 依据：`docs/skills/07_Skill_Registry_v1.0.md`、`docs/07.agent/06_Agent_Task_Graph_v1.0.md`、人工修正后的`docs/07.agent/06_node_io_matrix.md`及`docs/skills/svg.render.contract.md`。  
> Node状态冲突时，以人工修正后的Node I/O Matrix为准。本文不定义API、模型供应商接入、AImake集成、xTool Studio原生集成或设备执行。

## 1. v1.1收口结论

- Core Skill总数：11。
- `issue.safe_fix`退出Core Registry，移入Future / Backlog；当前MVP不承担自动修复。
- `artifact.export`的当前和目标实现均为`local_tool`。它只负责本地Artifact导出，不承担Studio交接。
- 不新增`preflight.run`；Preflight继续由`svg.file_check`、`brief.consistency_check`、`studio.readiness_check`和`issue.route`分别承担。
- T01、T05、T09、T15、T17等Human Gate或单纯UI行为不登记为Skill。

## 2. 字段与状态约定

- `implementation_type`：`model`、`rule`、`tool`、`composite`。
- `deterministic`：`true`、`false`、`conditional`。
- `current_implementation`与`target_implementation`：`mock`、`local_rule`、`local_tool`、`implemented_ui`、`experimental_provider`、`future_model`、`future_integration`；每项只填写一个状态。`experimental_provider`表示真实Provider已接入实验流程，但不代表最终模型选型。
- `contract_status`：`draft`或`not_started`。
- `risk_level`：`low`、`medium`、`high`。
- `trigger_when`描述调用场景，不改变稳定的`skill_id`。
- `do_not_trigger_when`定义明确的负触发条件，防止Skill越权或在错误阶段运行。
- `future_model`只表示目标实现形态，不表示DeepSeek、OpenAI或其他模型已经接入。

## 3. Core Skill Registry

### 3.1 身份、职责与触发条件

| skill_id | display_name | purpose | implementation_type | deterministic | trigger_when | do_not_trigger_when | called_by_nodes |
|---|---|---|---|---|---|---|---|
| `brief.extract` | 提取Creative Brief | 从任务输入中提取结构化Brief候选，不把推断写成已确认事实 | model | false | T01产生或更新了可读取的`task_input`，需要建立或更新Brief候选 | `task_input`不存在或不可读；confirmed Brief未收到新输入却要求被覆盖 | T02 |
| `brief.validate` | 验证Brief完整性 | 按确定性Schema和规则检查关键字段、状态、缺失与冲突 | rule | true | `brief_candidate`已创建或更新，准备判断能否进入用户确认 | `brief_candidate`不存在；要检查的是SVG、Design Spec或Studio状态 | T03 |
| `brief.ask_missing` | 生成缺失约束问题 | 将校验发现的必要缺口转为中性、可回答的问题 | model | false | `brief_validation_result`确认存在必须由用户补充或确认的缺失项/冲突项 | Brief已满足确认条件；缺口允许保持暂定且不阻塞；试图让模型替用户决定 | T04 |
| `plan.generate` | 生成Creative Plan | 只针对未确定约束提供候选建议、依据与取舍 | model | false | 当前版本confirmed Brief存在，且仍有适合通过建议辅助判断的未确定约束 | Brief尚未确认；要求重新推荐confirmed字段；要求生成机器加工参数 | T06 |
| `design_spec.build` | 建立Design Spec | 将confirmed Brief与accepted Plan映射为可渲染、可验证的内部设计模型 | composite | conditional | confirmed Brief与accepted Plan存在、版本一致，且需要首次建立Design Spec | Brief或Plan版本不一致；用户每次结构化编辑；试图修改confirmed Brief迎合Plan | T07 |
| `svg.render` | 渲染SVG作品 | 根据native Design Spec确定性返回SVG，不保存Artifact或管理revision | tool | true | 已验证`design_spec`首次建立或更新，需要生成`svg` | Design Spec未通过校验；External SVG是artifact source of truth；要求Renderer决定布局、创意或材料参数；要求执行Preflight | T08 |
| `svg.file_check` | SVG文件检查 | 检查当前SVG的语法、结构与可确定判断的文件问题 | tool | true | 当前SVG存在且待检查revision已锁定，用户发起当前作品的文件检查 | 只有预写Mock检查结果；SVG不存在或revision正在变化；要判断材料或Studio设置 | T10 |
| `brief.consistency_check` | Brief一致性检查 | 比较当前SVG、Design Spec与confirmed Brief是否一致 | composite | true | 当前SVG、confirmed Brief和`design_spec`均存在且版本关联有效 | 版本无法关联；要求判断未固化的美学偏好；要检查Studio实时状态 | T11 |
| `studio.readiness_check` | Studio准备度检查 | 仅依据项目状态列出进入Studio后、加工前的人工待办 | rule | true | `project_state`可读取，需要生成或刷新设备、材料、参数、Preview与Framing待办 | 只有SVG而没有`project_state`；要求从SVG推断材料、设备或加工参数 | T12 |
| `issue.route` | 问题路由 | 汇总三层Preflight结果，确定BLOCK、WARN、PASS及解决位置 | rule | true | T10、T11、T12结果已收齐且版本有效，需要形成统一路由和Next Step | 任一检查结果缺失或过期；要求自动修复；要求绕过BLOCK或替用户确认WARN | T13 |
| `artifact.export` | 导出已验证文件 | 在`checked_artifact_revision`门禁满足后导出本地SVG并计算handoff completion | tool | true | 当前SVG与被检查Artifact一致，且不存在BLOCK或未确认WARN | BLOCK仍存在；WARN未确认；artifact revision过期；要求生成当前不支持的PDF或发送到Studio | T16 |

### 3.2 I/O、实现、治理与Contract

| skill_id | input | output | side_effects | risk_level | human_gate | current_implementation | target_implementation | contract_status | contract_path | non_goals |
|---|---|---|---|---|---|---|---|---|---|---|
| `brief.extract` | `task_input` | `brief_candidate` | 更新Brief草稿，不确认字段 | medium | 输出必须经过T03验证和T05用户确认 | mock | future_model | draft | `docs/skills/Skill_Contract/brief.extract.contract.md` | 不确认Brief；不生成Creative Plan；不虚构产品事实 |
| `brief.validate` | `brief_candidate` | `brief_validation_result` | 写入校验记录，不修改Brief事实 | medium | 验证通过后仍须T05确认 | local_rule | local_rule | draft | `docs/skills/Skill_Contract/brief.validate.contract.md` | 不代替用户回答；不把`assumed`自动改为`confirmed` |
| `brief.ask_missing` | `brief_candidate` + `brief_validation_result` | `clarifying_questions[]` | 增加待回答问题，不改确认值 | low | 用户必须通过T01 clarification模式回答 | mock | future_model | draft | `docs/skills/Skill_Contract/brief.ask_missing.contract.md` | 不决定约束；不诱导答案；不重复询问已确认字段 |
| `plan.generate` | confirmed Brief + `brief_revision` | `creative_plan` | 新增候选Plan，不改Brief事实 | medium | 建议进入T07前必须由用户接受或拒绝 | experimental_provider | future_model | draft | `docs/skills/Skill_Contract/plan.generate.contract.md` | 不重复推荐confirmed字段；不直接生成图片或SVG；不设置机器参数 |
| `design_spec.build` | confirmed Brief + `brief_revision` + accepted Plan | `design_spec` | 创建初始`design_spec_revision` | high | 输入必须已确认且引用同一`brief_revision`；冲突不得静默覆盖 | local_rule | future_model | draft | `docs/skills/Skill_Contract/design_spec.build.contract.md` | 不要求用户编辑JSON；不修改confirmed Brief迎合Plan；不生成位图中间稿 |
| `svg.render` | `design_spec` | `svg` | none | medium | 无直接Human Gate；返回值由Artifact Manager基础设施持久化后交T09 | local_tool | local_tool | draft | `docs/skills/Skill_Contract/svg.render.contract.md` | 不处理External SVG；不持久化Artifact；不管理revision；不执行Preflight |
| `svg.file_check` | current SVG + `artifact_revision` | `svg_file_issues[]` + `checked_artifact_revision` | 写入检查结果，不修改SVG | medium | 无；结果交由T13路由 | local_tool | local_tool | draft | `docs/skills/Skill_Contract/svg.file_check.contract.md` | 不从SVG推断材料、设备或加工参数；不保证Studio兼容或加工成功 |
| `brief.consistency_check` | current SVG + `artifact_revision` + confirmed Brief + `brief_revision` + `design_spec` | `consistency_issues[]` + `checked_artifact_revision` | 写入一致性结果，不修改Brief或SVG | medium | WARN/BLOCK由T13路由，并按需进入T15 | local_tool | local_tool | draft | `docs/skills/Skill_Contract/brief.consistency_check.contract.md` | 不检查Studio实时状态；不把Recommendation当成事实约束 |
| `studio.readiness_check` | `project_state` | `studio_checklist[]` | 更新Studio待办记录，不修改SVG | medium | 设备、材料、参数、Preview和Framing须由人完成或确认 | local_rule | local_rule | draft | `docs/skills/Skill_Contract/studio.readiness_check.contract.md` | 不解析SVG推断材料或参数；不调用xTool Studio；不执行加工 |
| `issue.route` | T10、T11、T12结果 + 当前`artifact_revision` + WARN确认记录 | `routed_issues[]` + `pre_import_status` + `studio_readiness_status` | 更新路由状态，不修复文件 | high | WARN必须进入T15；BLOCK不得进入T16 | local_rule | local_rule | draft | `docs/skills/Skill_Contract/issue.route.contract.md` | 不弱化BLOCK；不代替用户确认WARN；不自动修复文件 |
| `artifact.export` | current SVG + current-artifact Preflight结果 + WARN确认记录 + output requirements | SVG artifact export +检查摘要 + handoff completion | 生成本地SVG下载及交付状态，不发送到Studio | high | 调用前必须无BLOCK、无未确认WARN；required PDF缺失只允许部分SVG导出且整体不完整 | local_tool | local_tool | draft | `docs/skills/Skill_Contract/artifact.export.contract.md` | 当前不生成Verified PDF；不修改Brief要求；不上传Studio；不保证加工成功 |

## 4. 非Skill节点

| node_id | 原因 |
|---|---|
| T01 | Human/UI输入行为；同时支持initial与clarification两种输入模式 |
| T05 | Brief人工确认门 |
| T09 | 用户通过UI编辑草稿；底层可复用渲染能力由`svg.render`承担 |
| T14 | 仅保留Future / Backlog历史编号，不属于Current Execution Path |
| T15 | WARN人工确认门 |
| T17 | Rule/UI展示与交接终点；清单规则由`studio.readiness_check`承担 |

Human Gate继续由Task Graph和各Skill的`human_gate`字段表达，不独立注册为Skill。

## 5. Preflight能力边界

当前不建立聚合Skill `preflight.run`。四项能力保持独立职责：

| skill_id | 职责边界 |
|---|---|
| `svg.file_check` | 解析和检查当前revision的真实SVG文件事实 |
| `brief.consistency_check` | 比较当前SVG、Design Spec与confirmed Brief |
| `studio.readiness_check` | 只读取`project_state`生成Studio人工待办 |
| `issue.route` | 在三类结果收齐后执行确定性问题路由 |

## 6. Future / Backlog

以下能力不属于v1.1 Core Skill，不计入11个核心Skill。

### `issue.safe_fix`

- Status: Backlog。
- 当前MVP不承担自动修复；问题通过返回内置编辑或外部工具处理后复检。
- T14仅作为Future / Backlog历史编号存在，不形成当前Core Skill或当前执行边。
- 若未来重新评估，仍必须限制为白名单、可逆、用户显式授权、revision有效并强制复检。
- 该条目不表示已经实现或承诺实现。

### `studio.handoff`

- Status: Concept candidate。
- 仅在未来存在经过实际验证的Studio原生交接需求时，才评估为独立Skill。
- 它不得通过扩大`artifact.export`职责来实现。
- 当前没有API、AImake或xTool Studio原生集成，也没有相关实施计划承诺。
- 所有xTool Studio原生交接能力均为`[待实际验证]`。

## 7. 架构不变量

1. Model节点未接真实模型时保持`mock`。`plan.generate`当前通过DeepSeek Experimental Provider运行，但未经Eval不得视为最终模型选型。
2. `design_spec.build`当前为`local_rule`；未来模型只能参与语义映射，不能覆盖Schema和硬约束。
3. `svg.render`严格遵守纯函数边界：Input=`design_spec`，Output=`svg`，Side Effects=`none`；Artifact Manager基础设施负责持久化、版本血缘和Preflight invalidation。
4. Preflight检查当前revision的真实SVG和项目状态，不使用预写Mock结果冒充检查。
5. `studio.readiness_check`只读取`project_state`，不从SVG推断材料、设备或加工参数。
6. BLOCK不能直接Export；WARN必须经过T15 Human Confirm。
7. `artifact.export`只进行本地确定性导出；它的目标实现仍为`local_tool`。
8. Export后只显示Studio人工待办，不进入设备执行，不声称AImake或xTool Studio原生集成。

## 8. 校验记录

- Core Skill数量：11。
- 11个核心`skill_id`唯一。
- `called_by_nodes`仅引用T02、T03、T04、T06、T07、T08、T10、T11、T12、T13、T16，均存在于T01–T17 Agent Task Graph。
- Core Skill的input/output名称与当前`06_node_io_matrix.md`一致。
- Review Priority Contract已存在：`docs/skills/Skill_Contract/brief.extract.contract.md`、`docs/skills/Skill_Contract/design_spec.build.contract.md`、`docs/skills/Skill_Contract/issue.route.contract.md`。
- 11个Core Skill均已有Draft Contract；路径均位于`docs/skills/`并与对应`skill_id`一致。
- 当前实现状态：
  - `mock`：T02、T04、T06；
  - `local_rule`：T03、T07、T12、T13；
  - `local_tool`：T08、T10、T11、T16。
- Registry未新增`preflight.run`，未把Human Gate登记为Skill，未声明任何模型API或xTool原生集成。
