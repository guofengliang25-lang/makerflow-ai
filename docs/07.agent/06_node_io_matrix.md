# MakerFlow Agent Node I/O Matrix v1.0

> 范围：Current Execution Path及其节点契约。T14仅保留Future / Backlog历史编号，不属于Current Execution Path。  
> 场景：MomoRay模块化枕头包装内高度调节说明卡。  
> Artifact Manager属于Orchestrator / Project State Infrastructure，不是Skill，不新增Task。

## I/O总矩阵

| node_id | owner_type | input | output | preconditions | success_condition | failure_modes | side_effects | next_nodes | current_implementation | target_implementation |
|---|---|---|---|---|---|---|---|---|---|---|
| T01 | Human/UI | initial模式：用户文字、参考附件、已有文件；clarification模式：T04问题对应的用户补充回答 | `task_input` | 项目会话已初始化；输入模式已标识 | 输入被保存且来源可区分 | 空输入；附件不可读；来源混淆 | 更新项目输入记录 | T02 | implemented_ui | implemented_ui |
| T02 | Model | `task_input` | `brief_candidate` | `task_input`存在且可读取 | 不把假设写成事实 | 提取遗漏；虚构事实；覆盖已确认字段 | 更新Brief草稿，不确认字段 | T03 | mock | future_model |
| T03 | Rule | `brief_candidate` | `brief_validation_result` | Brief Schema与规则版本可用 | 确定性返回缺失、冲突和证据 | Schema错误；状态组合非法 | 写入校验记录，不修改Brief事实 | T04, T05 | local_rule | local_rule |
| T04 | Model | `brief_candidate` + `brief_validation_result` | `clarifying_questions[]` | 存在必须由用户补充或确认的缺口 | 问题必要、中性且不代答 | 诱导；重复；遗漏关键缺口 | 增加待回答问题，不改确认值 | T01 | mock | future_model |
| T05 | Human | 可确认Brief + 校验结果 + `brief_revision` | confirmed Brief + `brief_revision` | T03判定当前`brief_revision`满足Gate | 用户显式确认；lifecycle=`confirmed` | 确认版本过期；字段状态变化 | 写入确认记录与`brief_revision` | T01, T06 | implemented_ui | implemented_ui |
| T06 | Model | confirmed Brief + `brief_revision` | `creative_plan` | confirmed Brief为当前版本 | 只对未决事项建议，不含机器参数 | 推荐confirmed字段；建议与Brief冲突 | 新增候选Plan，不改Brief事实 | T07 | mock | future_model |
| T07 | Model + Rule | confirmed Brief + `brief_revision` + accepted Plan | `design_spec` + `design_spec_revision` | 输入引用同一`brief_revision`且Schema可用 | `design_spec`通过Schema与硬约束 | Schema失败；Plan引用过期Brief | 创建初始`design_spec_revision` | T06, T08 | local_rule | future_model |
| T08 | Tool | `design_spec` | `svg` | `design_spec`合法且显式资源可用 | `svg`可解析且只来自输入 | Renderer异常；资源无效；无法渲染 | none | T09 | local_tool | local_tool |
| T09 | Human/UI | native：current SVG + `design_spec`；external：External SVG upload | native：updated `design_spec` + `design_spec_revision`；external：External SVG Artifact交给Artifact Manager | 当前作品可显示或外部SVG可读取 | native修改进入T08；external Artifact不进入T08 | 非法尺寸；外部SVG不可解析或不能完整映射 | UI记录修改意图；Artifact状态变更由Artifact Manager负责 | native: T08；external: T10, T11, T12 | implemented_ui | implemented_ui |
| T10 | Tool | current SVG Artifact + `artifact_revision` | `svg_file_issues[]` + `checked_artifact_revision` | 当前Artifact存在且`artifact_revision`已锁定 | 返回文件事实与可定位证据 | SVG不可解析；检查中Artifact变化 | 写入检查结果，不修改SVG | T13 | local_tool | local_tool |
| T11 | Tool + Rule | current SVG Artifact + `artifact_revision` + confirmed Brief + `brief_revision` + `design_spec`/`design_spec_status` | `consistency_issues[]` + `checked_artifact_revision` | 版本关联有效；external路径允许`derived_partial`或`none` | 确定性比较可验证约束 | 单位不可比较；Brief过期；外部Spec信息不足 | 写入一致性结果，不修改输入 | T13 | local_tool | local_tool |
| T12 | Rule | `project_state` | `studio_checklist[]` | `project_state`可读取 | 不从SVG推断材料或参数 | 状态未知；字段缺失 | 更新Studio待办记录，不修改SVG | T13 | local_rule | local_rule |
| T13 | Rule | T10、T11、T12结果 + current `artifact_revision` + WARN确认记录 | `routed_issues[]` + `pre_import_status` + `studio_readiness_status` | 结果已收齐；`checked_artifact_revision`与当前Artifact一致 | BLOCK/WARN/PASS路由符合政策 | 检查过期；未知severity；路由冲突 | 更新路由状态，不修复文件 | T09, T15, T16 | local_rule | local_rule |
| T14 | Future / Backlog | N/A | N/A | 不在Current Execution Path | 保留历史编号，不重编号T15–T17 | N/A | none | none | N/A | N/A |
| T15 | Human | current-artifact WARN issues + `artifact_revision` | `warning_decision` | 无BLOCK且用户看到证据与风险 | 每个继续WARN均绑定当前`artifact_revision`确认 | 拒绝风险；确认过期 | 写入人工确认，不修改检查事实 | T09, T16 | implemented_ui | implemented_ui |
| T16 | Tool | current SVG + `artifact_revision` + Preflight结果 + `checked_artifact_revision` + WARN确认 + output requirements | SVG Artifact export + 检查摘要 + handoff completion | `checked_artifact_revision`等于当前`artifact_revision`；无BLOCK或未确认WARN | required PDF缺失时仅partial SVG export且handoff incomplete/blocked | 版本过期；BLOCK；WARN未确认；下载失败 | 生成本地SVG及交付状态，不发送到Studio | T17 | local_tool | local_tool |
| T17 | Rule/UI | Studio Readiness结果 + 导出摘要 + `artifact_revision` | Studio checklist | T16已产生当前`artifact_revision`的SVG导出 | 只展示人工待办 | 清单缺失；用户误解为自动执行 | 仅展示/记录待办，不控制设备 | END | implemented_ui | implemented_ui |

## Artifact Manager基础设施职责

Artifact Manager由Orchestrator / Project State Infrastructure调用，不是Skill，也不新增Task。它在T08返回`svg`或T09接收External SVG后负责：

- 持久化当前Artifact；
- 分配并更新`artifact_revision`；
- native路径记录`source_design_spec_revision`；
- External SVG记录`authoring_source: external_artifact`及`design_spec_status: derived_partial | none`；
- Artifact内容变化时使旧Preflight与WARN确认失效。

External SVG不进入T08；它由T09上传入口交给Artifact Manager保存，再进入T10–T12检查路径。

## 版本与门禁不变量

1. Brief只使用`brief_revision`。
2. Design Spec只使用`design_spec_revision`。
3. Artifact只使用`artifact_revision`，native Artifact记录`source_design_spec_revision`。
4. Preflight只使用`checked_artifact_revision`绑定被检查Artifact。
5. 任一导入前BLOCK存在时，T13不得进入T16；WARN必须先经T15。
6. T12只读取`project_state`；T17后不进入设备执行。
