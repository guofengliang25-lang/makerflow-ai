# MakerFlow Skill Registry v1.0（草案）

> 范围：基于 `06_Agent_Task_Graph_v1.0.md`、人工修正后的 `06_node_io_matrix.md` 与 `skill_candidate_mapping.md`，定义可被Task重复调用的稳定能力单元。  
> 本文是Skill Registry，不是Skill Contract，不定义API、模型供应商接入、AImake集成、xTool Studio原生集成或设备执行。  
> Skill不是页面、Human Gate、单纯UI动作、状态或Task的一一映射。

## 1. 字段与状态约定

- `implementation_type`只使用：`model`、`rule`、`tool`、`composite`。
- `deterministic`只使用：`true`、`false`、`conditional`。
- `current_implementation`与`target_implementation`沿用Node I/O Matrix状态：`mock`、`local_rule`、`local_tool`、`implemented_ui`、`future_model`、`future_integration`；每项只填写一个状态。
- `risk_level`使用：`low`、`medium`、`high`。
- `future_model`仅表示目标实现形态，不表示DeepSeek、OpenAI或其他模型已经接入。
- `future_integration`不表示已经或计划原生接入xTool Studio；T16当前只生成本地SVG下载文件。

## 2. Registry

| skill_id | display_name | purpose | implementation_type | deterministic | input | output | called_by_nodes | side_effects | risk_level | human_gate | current_implementation | target_implementation | non_goals |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `brief.extract` | 提取Creative Brief | 从任务输入中提取结构化Brief候选，不把推断写成已确认事实 | model | false | `task_input` | `brief_candidate` | T02 | 更新Brief草稿，不确认字段 | medium | 输出必须经过T03验证和T05用户确认 | mock | future_model | 不确认Brief；不生成Creative Plan；不虚构产品事实 |
| `brief.validate` | 验证Brief完整性 | 按确定性Schema和规则检查关键字段、状态、缺失与冲突 | rule | true | `brief_candidate` | `brief_validation_result` | T03 | 写入校验记录，不修改Brief事实 | medium | 验证通过后仍须T05确认 | local_rule | local_rule | 不代替用户回答；不把`assumed`自动改为`confirmed` |
| `brief.ask_missing` | 生成缺失约束问题 | 将校验发现的必要缺口转为中性、可回答的问题 | model | false | `brief_candidate` + `brief_validation_result` | `clarifying_questions[]` | T04 | 增加待回答问题，不改确认值 | low | 用户必须通过T01 clarification模式回答 | mock | future_model | 不决定约束；不诱导答案；不重复询问已确认字段 |
| `plan.generate` | 生成Creative Plan | 只针对未确定约束提供候选建议、依据与取舍 | model | false | confirmed Brief | `creative_plan` | T06 | 新增候选Plan，不改Brief事实 | medium | 建议进入T07前必须由用户接受或拒绝 | mock | future_model | 不重复推荐confirmed字段；不直接生成图片或SVG；不设置机器参数 |
| `design_spec.build` | 建立Design Spec | 将confirmed Brief与accepted Plan映射为可渲染、可验证的内部设计模型 | composite | conditional | confirmed Brief + accepted Plan | `design_spec` | T07 | 创建初始Design Spec revision | high | 输入必须已确认；冲突不得静默覆盖 | local_rule | future_model | 不要求用户编辑JSON；不修改confirmed Brief迎合Plan；不生成位图中间稿 |
| `svg.render` | 渲染SVG作品 | 根据Design Spec确定性生成当前可视化SVG草稿 | tool | true | `design_spec` | `draft.svg` | T08 | 更新当前SVG；使旧Preflight失效 | medium | 无直接Human Gate；产物由T09查看和编辑 | local_tool | local_tool | 不调用Prompt-to-image；不进行PNG转SVG；不实现完整矢量编辑器 |
| `svg.file_check` | SVG文件检查 | 检查当前SVG的语法、结构与可确定判断的文件问题 | tool | true | current SVG | `svg_file_issues[]` | T10 | 写入当前revision检查结果，不修改SVG | medium | 无；结果交由T13路由 | local_tool | local_tool | 不从SVG推断材料、设备或加工参数；不保证Studio兼容或加工成功 |
| `brief.consistency_check` | Brief一致性检查 | 比较当前SVG、Design Spec与confirmed Brief是否一致 | composite | true | current SVG + confirmed Brief + `design_spec` | `consistency_issues[]` | T11 | 写入一致性结果，不修改Brief或SVG | medium | WARN/BLOCK由T13路由，并按需进入T15 | local_tool | local_tool | 不检查Studio实时状态；不把Recommendation当成事实约束 |
| `studio.readiness_check` | Studio准备度检查 | 仅依据项目状态列出进入Studio后、加工前的人工待办 | rule | true | `project_state` | `studio_checklist[]` | T12 | 更新Studio待办记录，不修改SVG | medium | 设备、材料、参数、Preview和Framing须由人完成或确认 | local_rule | local_rule | 不解析SVG推断材料或参数；不调用xTool Studio；不执行加工 |
| `issue.route` | 问题路由 | 汇总三层Preflight结果，确定BLOCK、WARN、PASS及解决位置 | rule | true | T10、T11、T12结果 + 当前revision + WARN确认记录 | `routed_issues[]` + `pre_import_status` + `studio_readiness_status` | T13 | 更新路由状态，不修复文件 | high | WARN必须进入T15；BLOCK不得进入T16 | local_rule | local_rule | 不弱化BLOCK；不代替用户确认WARN；不声称导入成功等于生产就绪 |
| `artifact.export` | 导出已验证文件 | 在当前revision满足门禁后生成可下载的Verified SVG和检查摘要 | tool | true | current SVG + current-revision Preflight结果 + WARN确认记录 | `verified_design.svg` + 检查摘要；Verified PDF为future能力 | T16 | 生成本地SVG下载文件，不发送到Studio | high | 调用前必须无BLOCK、无未确认WARN | local_tool | future_integration | 当前不生成Verified PDF；不上传Studio；不让Studio读取Brief JSON；不保证加工成功 |
| `issue.safe_fix` | 安全修复（P1候选） | 对白名单内、可逆且低歧义的问题应用受限确定性修复 | tool | conditional | allowlisted issue + current SVG/Design Spec + 用户授权 | updated SVG/Design Spec + fix record | T14 | 修改Design Spec/SVG；使旧Preflight失效并触发复检 | high | 必须显式授权，且目标revision仍有效 | mock | local_tool | 不处理创意判断；不改变产品事实；不调整功率、速度、次数或安全参数 |

## 3. 非Skill节点

以下节点不登记为Skill：

| node_id | 原因 |
|---|---|
| T01 | Human/UI输入行为；同时支持initial与clarification两种输入模式 |
| T05 | Brief人工确认门 |
| T09 | 用户通过UI编辑草稿；底层可复用渲染能力由`svg.render`承担 |
| T15 | WARN人工确认门 |
| T17 | Rule/UI展示与交接终点，不是独立可调用能力；清单规则由`studio.readiness_check`承担 |

## 4. 边界与不变量

1. Model类Skill当前均未接入真实模型API：`brief.extract`、`brief.ask_missing`、`plan.generate`的当前状态均为`mock`。
2. `design_spec.build`的能力类型是`composite`，但当前Demo使用`local_rule`；未来模型只能参与语义映射，不能覆盖Schema和硬约束。
3. `svg.render`与`svg.file_check`保持本地确定性工具；模型供应商变化不应改变其I/O和规则。
4. `studio.readiness_check`只读取`project_state`，不得从SVG推断设备、材料、功率、速度、次数或安全参数。
5. `issue.route`必须保持确定性：BLOCK不能直接Export；WARN必须经过T15 Human Confirm。
6. `issue.safe_fix`是P1候选。只有白名单、可逆、获得用户授权且revision有效时才可执行；修复后必须重新渲染并重新Preflight。
7. `artifact.export`当前只导出与已检查revision一致的`verified_design.svg`及检查摘要。Verified PDF是future能力。
8. Export后只显示Studio人工待办，不进入设备执行，不声称AImake或xTool Studio存在原生集成。

## 5. 校验记录

- Skill数量：12；`skill_id`均唯一。
- `called_by_nodes`仅引用T02、T03、T04、T06、T07、T08、T10、T11、T12、T13、T14、T16，均存在于T01–T17 Task Graph。
- Registry的input/output名称与当前`06_node_io_matrix.md`逐项一致；自然语言名称保留Matrix原写法。
- `current_implementation`以人工修正后的Node I/O Matrix为准：
  - `mock`：T02、T04、T06、T14；
  - `local_rule`：T03、T07、T12、T13；
  - `local_tool`：T08、T10、T11、T16。
- 本文未定义或创建Skill Contract。
