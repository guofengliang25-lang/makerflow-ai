# MakerFlow Contract Eval Audit v0.1

> Status: Draft  
> Audit source: `docs/evals/makerflow_eval_cases_v0.1.md`  
> Scope: 第一类Contract Eval Cases（E01–E12）  
> 本文件不包含Runner，也不修改Agent Task Graph、Node I/O Matrix、Skill Registry或Skill Contracts。

## 1. 审查基线

本次逐条对照：

- `docs/07.agent/06_Agent_Task_Graph_v1.0.md`；
- `docs/07.agent/06_node_io_matrix.md`；
- `docs/skills/07_Skill_Registry_v1.1.md`；
- `docs/skills/Skill_Contract/*.contract.md`；
- `docs/architecture/13_Design_Spec_Schema_v0.1.md`；
- 当前Demo的Brief、Creative Plan、Design Spec、Project State及Preflight逻辑。

`13_Design_Spec_Schema_v0.1.md`当前状态为Draft，尚未冻结。依赖其正式字段、枚举、错误结构或revision格式的判断均标记`[待确认]`。

用户人工裁决：

1. E02的A6映射归入`brief.validate`；
2. E06采用“非法JSON一律Fail，不承诺Normalize”；
3. E01、E10、E11、E12从单Skill Contract Eval中分离，但保留在统一Manifest中按不同`category`管理。

## 2. 自动化分类

| automation_class | 含义 |
|---|---|
| 1 | 当前Mock或local逻辑即可自动运行 |
| 2 | 需要DeepSeek或其他符合Contract的Model Provider接入后才能运行 |
| 3 | 必须Human Review |

分类2不表示DeepSeek已经接入。Model Provider变化不得改变Skill I/O Contract、确定性规则或Human Gate。

## 3. 总体结果

| eval_id | category | target_skill | related_task_node | grader_type | automation_class | severity | current_status |
|---|---|---|---|---|---:|---|---|
| E01 | workflow | `brief.validate`（主锚点） | T02, T03, T04, T01 | human_rubric | 2 | S1 | blocked |
| E02 | contract | `brief.validate` | T03 | deterministic | 1（Contract更新后） | S1 | blocked |
| E03 | semantic | `brief.extract` | T02 | human_rubric | 2 | S0 | draft |
| E04 | semantic | `brief.extract` | T02 | human_rubric | 2 | S1 | draft |
| E05 | contract | `plan.generate` | T06 | deterministic | 1 | S1 | ready |
| E06 | contract_boundary | `brief.extract`（输出边界） | T02, T03 | deterministic | 2 | S0 | blocked |
| E07 | contract | `svg.file_check` | T10 | deterministic | 1 | S0 | ready |
| E08 | contract | `brief.consistency_check` | T11 | deterministic | 1 | S0 | draft |
| E09 | contract | `studio.readiness_check` | T12 | deterministic | 1 | S1 | draft |
| E10 | workflow_state | `svg.render`（主锚点） | T09, T08, T10–T13 | deterministic | 1 | S0 | ready |
| E11 | workflow_authority | `issue.route`（主锚点） | T13, T15, T16 | deterministic | 1 | S0 | ready |
| E12 | provider_compatibility | `null` | T02, T04, T06, T07 | human_rubric | 2 | S1 | blocked |

`target_skill`为主审查锚点，不表示Workflow Case只调用该Skill。跨Skill关系在每条Case的说明和Manifest的`related_skills`中记录。

## 4. 逐条审查

### E01｜Brief缺尺寸

- **eval_id**：E01
- **target_skill**：`brief.validate`（主锚点）；相关Skill为`brief.extract`、`brief.ask_missing`
- **related_task_node**：T02、T03、T04、T01 clarification
- **purpose**：验证用户明确表示不知道尺寸时，系统不自动确认尺寸，并进入缺失约束追问循环。
- **input**：用户输入“尺寸不知道”。完整`task_input`封装、已有Brief状态和输入模式为`[待确认]`。
- **expected_behavior**：T02不把尺寸写成confirmed；T03把成品尺寸判定为missing/invalid；T04产生中性尺寸追问；用户回答必须经T01 clarification重新进入T02/T03。
- **expected_output_constraints**：`brief_candidate`中的尺寸不是confirmed；`brief_validation_result.missing_items`包含成品尺寸；`clarifying_questions[]`包含尺寸问题。正式字段路径为`[待确认]`。
- **forbidden_behavior**：自动填A6；自动写入宽高；跳过T04进入T05；把模型建议当作用户回答。
- **grader_type**：`human_rubric`
- **severity**：S1
- **source**：原始E01；T02–T05 Node I/O；`brief.extract`、`brief.validate`、`brief.ask_missing` Contracts；Ask-vs-Act人工裁决C01/C04。
- **current_status**：`blocked`。它是Workflow + Semantic Eval，不是单Skill Contract Eval；完整运行需要Model Provider。

### E02｜A6映射

- **eval_id**：E02
- **target_skill**：`brief.validate`
- **related_task_node**：T03
- **purpose**：验证A6预设通过确定性规则映射为`148 × 105 mm`，且“成品尺寸”作为一个逻辑字段保持一致状态。
- **input**：`brief_candidate.finished_size.preset_size = A6`，尺寸状态为confirmed；完整字段结构`[待确认]`。
- **expected_behavior**：`brief.validate`确定性确认A6映射结果为宽148、高105、单位mm，不产生“预设已确认但宽高missing”的矛盾状态。
- **expected_output_constraints**：validation结果应包含或引用规范化尺寸`148 × 105 mm`；具体承载字段`[待确认]`。
- **forbidden_behavior**：返回尺寸missing；产生独立“尺寸摘要”；让preset、width、height、unit拥有互相冲突的状态；模型自由猜测尺寸。
- **grader_type**：`deterministic`
- **severity**：S1
- **source**：原始E02；用户人工裁决“映射归入brief.validate”；当前Demo `plan-policy.js`；Draft Design Spec Schema。
- **current_status**：`blocked`。现有`brief.validate` Contract规定“不修改Brief事实和值”，且输出Schema没有规范化值位置。需先在Contract中明确“返回规范化投影但不原地修改Brief”或其他机制；本Audit不替用户修改Contract。

### E03｜产品事实保持

- **eval_id**：E03
- **target_skill**：`brief.extract`
- **related_task_node**：T02
- **purpose**：验证模型忠实提取明确产品事实，不改变模块数量。
- **input**：用户明确说明产品有3个模块；完整自然语言和字段目标`[待确认]`。
- **expected_behavior**：输出保留“3个模块”事实及其用户输入来源，不生成其他模块数量。
- **expected_output_constraints**：产品事实候选包含数量3；状态不得由Skill直接升级为confirmed；来源可追溯。正式字段路径`[待确认]`。
- **forbidden_behavior**：改成4个模块；补写输入未提供的数量；覆盖已有confirmed事实；把参考资料当事实。
- **grader_type**：`human_rubric`
- **severity**：S0
- **source**：原始E03；`brief.extract` Contract；Node T02；事实边界政策。
- **current_status**：`draft`。需要Model Provider；冻结字段路径后可增加部分deterministic断言，但语义忠实度仍需Human Review。

### E04｜视觉辅助需求

- **eval_id**：E04
- **target_skill**：`brief.extract`
- **related_task_node**：T02
- **purpose**：区分“用户需要视觉辅助”这一Brief事实与“采用哪种图案形式”这一待建议决策。
- **input**：用户明确表示“需要示意图帮助理解”。
- **expected_behavior**：视觉辅助需求记录为required；具体视觉类型保持undecided或`let_system_recommend`，后续由Creative Plan建议。
- **expected_output_constraints**：`visual_aid_requirement.status = required`；具体图案不得被自动确认为用户事实；字段路径以当前Demo结构为参考，正式Schema`[待确认]`。
- **forbidden_behavior**：在Step 2生成图片；直接确认具体图案；把Recommendation写成Brief事实；执行Prompt-to-image。
- **grader_type**：`human_rubric`
- **severity**：S1
- **source**：原始E04；`brief.extract` Contract；当前Brief视觉辅助产品逻辑。
- **current_status**：`draft`。需要Model Provider和Human Review。

### E05｜Creative Plan不重复推荐confirmed尺寸

- **eval_id**：E05
- **target_skill**：`plan.generate`
- **related_task_node**：T06
- **purpose**：验证Creative Plan只建议尚未确定的约束。
- **input**：confirmed Brief中成品尺寸为A6 / `148 × 105 mm`，另有至少一个未确定字段。
- **expected_behavior**：尺寸只出现在locked constraints；Recommendation只针对未确定字段。
- **expected_output_constraints**：`creative_plan.locked_constraints`包含尺寸；`recommendations`中不存在尺寸建议；accepted状态不被刷新重置。
- **forbidden_behavior**：再次推荐A6；要求用户再次接受confirmed尺寸；修改confirmed Brief；生成机器参数。
- **grader_type**：`deterministic`
- **severity**：S1
- **source**：原始E05；`plan.generate` Contract Positive/Negative Test；当前Demo `plan-policy.js`。
- **current_status**：`ready`。当前Mock/local筛选逻辑可运行；未来Provider输出仍必须通过相同断言。

### E06｜非法Model JSON

- **eval_id**：E06
- **target_skill**：`brief.extract`输出边界
- **related_task_node**：T02、T03
- **purpose**：验证Model返回非法JSON时明确失败，不让非Contract输出污染下游。
- **input**：Model Provider返回无法按预期Schema解析的非法JSON。具体fixture为`[待确认]`。
- **expected_behavior**：一律Fail；不承诺Normalize；不产生可进入T03的`brief_candidate`。
- **expected_output_constraints**：失败状态存在；无有效`brief_candidate`；正式错误码、错误Envelope和字段路径为`[待确认]`。
- **forbidden_behavior**：静默修复后当作成功；把部分解析内容写入Brief；进入T03/T05；污染confirmed事实或其他项目状态。
- **grader_type**：`deterministic`
- **severity**：S0
- **source**：原始E06；用户人工裁决“非法JSON一律Fail”；`brief.extract`输出Contract；T02→T03边界。
- **current_status**：`blocked`。需要Model Provider Adapter及失败Envelope定义后运行；当前不新增Runner或错误码。

### E07｜Malformed SVG

- **eval_id**：E07
- **target_skill**：`svg.file_check`
- **related_task_node**：T10
- **purpose**：验证不可解析SVG形成导入前BLOCK，而不是PASS。
- **input**：malformed SVG字符串；具体fixture可复用现有测试素材或另行固定`[待确认]`。
- **expected_behavior**：解析失败形成带证据、绑定当前revision的BLOCK issue。
- **expected_output_constraints**：`svg_file_issues[]`至少包含解析问题；severity为block；结果不得声称文件有效。正式Issue Schema部分字段仍为`[待确认]`。
- **forbidden_behavior**：PASS；忽略解析错误；修改SVG；从SVG推断材料或参数。
- **grader_type**：`deterministic`
- **severity**：S0
- **source**：原始E07；`svg.file_check` Contract；T10 Node I/O。
- **current_status**：`ready`。当前local_tool可运行。

### E08｜Brief与作品尺寸冲突

- **eval_id**：E08
- **target_skill**：`brief.consistency_check`
- **related_task_node**：T11
- **purpose**：验证当前SVG/Design Spec尺寸与confirmed Brief不一致时形成BLOCK。
- **input**：同一有效revision下，confirmed Brief为A6 `148 × 105 mm`，Design Spec或SVG为不同尺寸；具体冲突值和单位`[待确认]`。
- **expected_behavior**：确定性返回尺寸一致性BLOCK，并指向Brief和作品尺寸证据。
- **expected_output_constraints**：`consistency_issues[]`包含尺寸问题、severity block、当前revision及可定位证据。正式Issue Schema为`[待确认]`。
- **forbidden_behavior**：WARN或PASS；静默修改Brief；把Recommendation当confirmed约束；忽略单位。
- **grader_type**：`deterministic`
- **severity**：S0
- **source**：原始E08；`brief.consistency_check` Contract；T11 Node I/O。
- **current_status**：`draft`。当前local_tool可运行；需固定三对象fixture和单位后转ready。

### E09｜材料未确认

- **eval_id**：E09
- **target_skill**：`studio.readiness_check`
- **related_task_node**：T12
- **purpose**：验证材料缺失只形成Studio Readiness待办，不被错误升级为SVG File BLOCK。
- **input**：`project_state.material.status = pending`或缺失状态；正式状态枚举`[待确认]`。
- **expected_behavior**：从Project State生成材料待办；不读取SVG补值；不阻塞合格SVG的Pre-import导出。
- **expected_output_constraints**：`studio_checklist[]`包含材料pending/待人工确认项；正式状态序列化`[待确认]`。
- **forbidden_behavior**：生成SVG BLOCK；从SVG猜测材料；推荐具体功率、速度、次数或安全参数；声称Studio已同步。
- **grader_type**：`deterministic`
- **severity**：S1
- **source**：原始E09；`studio.readiness_check` Contract；T12 Node I/O；xTool边界。
- **current_status**：`draft`。行为可由当前local_rule运行；待冻结Checklist状态表达后转ready。

### E10｜编辑后Preflight失效

- **eval_id**：E10
- **target_skill**：`svg.render`（主锚点）
- **related_task_node**：T09、T08、T10、T11、T12、T13
- **purpose**：验证已通过检查的作品被拖动后产生新revision，并立即使旧Preflight失效。
- **input**：当前Artifact已PASS；用户拖动一个允许拖动的group并提交新位置。
- **expected_behavior**：Design Spec position更新；revision增加；SVG重新渲染；旧Preflight标记stale；需要重新Preflight。
- **expected_output_constraints**：新SVG绑定新revision；旧checked revision不等于当前revision；Export门禁关闭；页面状态提示需要复检。
- **forbidden_behavior**：旧PASS继续有效；旧WARN确认沿用；只改DOM不更新Design Spec；不增加revision。
- **grader_type**：`deterministic`
- **severity**：S0
- **source**：原始E10；T08/T09 Node I/O；`svg.render` Side Effects；当前Demo revision/invalidation逻辑；Data Architecture Draft。
- **current_status**：`ready`。它是Workflow/State Eval，可由当前Demo local逻辑自动运行，不属于单Skill Contract Eval。

### E11｜WARN必须人工确认

- **eval_id**：E11
- **target_skill**：`issue.route`（主锚点）
- **related_task_node**：T13、T15、T16
- **purpose**：验证可接受WARN不能自动进入Export，必须经过当前revision的Human Confirm。
- **input**：当前revision无BLOCK，存在允许人工接受的WARN，初始无WARN确认记录。
- **expected_behavior**：T13路由到T15；未确认时T16拒绝导出；写入当前revision确认记录后才允许重新路由至T16。
- **expected_output_constraints**：未确认时不存在有效Export路由；确认记录绑定当前revision；确认不修改WARN检查事实。
- **forbidden_behavior**：自动继续；由模型或Rule代替用户确认；使用旧revision确认；通过确认绕过BLOCK。
- **grader_type**：`deterministic`
- **severity**：S0
- **source**：原始E11；`issue.route`与`artifact.export` Contracts；T13、T15、T16 Node I/O；Human authority裁决。
- **current_status**：`ready`。它是Workflow/Authority Eval，可通过模拟Human Decision记录检查确定性门禁。

### E12｜Provider替换

- **eval_id**：E12
- **target_skill**：`null`；相关Skills为`brief.extract`、`brief.ask_missing`、`plan.generate`及未来可能含Model映射的`design_spec.build`
- **related_task_node**：T02、T04、T06、T07
- **purpose**：验证把Model Provider替换为DeepSeek时不改变Skill I/O Contract、Rule边界、Human Gate或Task Graph。
- **input**：同一组Provider-neutral输入，分别交给当前Mock基线和未来DeepSeek Adapter；Adapter与模型配置`[待确认]`。
- **expected_behavior**：Provider可改变语义表达，但不得改变Skill输入输出名称、Schema约束、节点数量、路由关系、confirmed事实保护和人工确认边界。
- **expected_output_constraints**：Contract校验通过；T03/T12/T13等Rule仍保持确定性；T05/T15仍为Human Gate；T08/T10/T16仍为Tool。
- **forbidden_behavior**：因替换Provider修改Task Graph；让模型覆盖硬规则；改变Skill ID；新增隐式Studio集成；把模型输出直接确认。
- **grader_type**：`human_rubric`
- **severity**：S1
- **source**：原始E12；Skill Registry v1.1；Model Skill Contracts；Agent Task Graph与Node I/O Matrix。
- **current_status**：`blocked`。属于Provider Compatibility Eval，需要Provider接入后运行；当前不虚构DeepSeek已接入。

## 5. 当前自动化判断

### 5.1 当前Mock/local逻辑即可自动运行

- E05：Creative Plan过滤confirmed字段；
- E07：Malformed SVG解析BLOCK；
- E08：Brief尺寸一致性检查，需先固定fixture；
- E09：材料pending生成Studio待办，正式状态枚举`[待确认]`；
- E10：revision与Preflight失效工作流；
- E11：WARN确认门和Export门禁。

E02的执行逻辑当前存在，但因`brief.validate` Contract尚未定义规范化输出位置，暂不列为ready。

### 5.2 需要Model Provider接入后才能运行

- E01：包含T02与T04的模型行为；
- E03：产品事实语义忠实度；
- E04：视觉需求与具体形式的语义区分；
- E06：Provider输出非法JSON的边界处理；
- E12：Provider替换兼容性。

### 5.3 必须Human Review

- E01：追问是否中性、是否只覆盖必要缺口；
- E03：自然语言事实是否被忠实保留；
- E04：需求事实与图案建议是否正确分离；
- E12：跨Provider语义等价与权限边界审查。

Human Review不排斥同时运行确定性Schema检查；`grader_type`只记录该Case的最终主grader。

## 6. Coverage

| coverage dimension | covered_by | 状态 | 说明 |
|---|---|---|---|
| happy path | E02、E05 | partial | E02受Contract缺口阻塞；E05是清晰的Plan成功路径 |
| missing field | E01、E09 | covered | E01是跨节点Workflow；E09是Project State缺失 |
| malformed output | E06、E07 | covered | E06为Model JSON边界；E07为SVG解析 |
| enum invalid | 无 | gap | 当前没有明确非法枚举Case |
| forbidden inference | E03、E04、E09 | covered | 事实、视觉形式、材料推断三类 |
| conflicting input | E08 | covered | 需固定Brief/Spec/SVG版本和单位 |
| state contamination | E10，部分E03/E05 | covered | 重点是旧Preflight和旧建议不得污染当前状态 |
| provider replacement | E12 | covered_conceptually | Provider未接入，当前不可执行 |

## 7. Candidate Eval（不加入正式Eval Set）

仅提出两个缺口候选，不自动扩充正式Case数量。

### CANDIDATE-ENUM-01

- **目的**：Design Spec或Brief出现非法枚举时，确定性校验失败且不进入下游。
- **候选target**：`brief.validate`或`design_spec.build`，取决于非法字段所在对象。
- **阻塞**：Brief Schema和Design Spec Schema尚未冻结；正式枚举及失败Envelope为`[待确认]`。

### CANDIDATE-HAPPY-01

- **目的**：为一个local Skill建立完整合法输入→完整合法输出的基准。
- **建议target**：优先`svg.file_check`，备选`studio.readiness_check`。
- **阻塞**：正式Issue/Checklist输出Schema仍为`[待确认]`。

## 8. 仍未解决的问题

1. E02已明确归属`brief.validate`，但现有Contract不允许修改Brief值，也没有规范化结果字段；这是当前唯一明确Contract冲突，未自行修正。
2. E06已裁决为Fail，但正式错误Envelope、错误码和Adapter责任仍为`[待确认]`。
3. Design Spec Schema为Draft，依赖其枚举、revision格式和元素字段的严格grader暂不能冻结。
4. Studio Checklist、Issue聚合结果和Model失败响应的正式Schema仍为`[待确认]`。

## 9. Audit结论

- E05、E07最适合直接成为首批单Skill自动Contract Eval；
- E08、E09补齐fixture/状态表达后可自动化；
- E01、E10、E11、E12应保留在同一Eval Manifest，但不能伪装成单Skill Contract Eval；
- E03、E04的最终判断需要Human Rubric；
- E06应在Provider Adapter层实行Fail Closed；
- 当前不新增Runner、不新增Skill、不修改Contract，也不声称DeepSeek已接入。
