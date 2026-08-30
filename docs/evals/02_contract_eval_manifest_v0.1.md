# MakerFlow Contract Eval Manifest v0.1

> Status: Draft  
> Source set: E01–E12 from `makerflow_eval_cases_v0.1.md`  
> Purpose: 统一描述可维护、未来可由Runner读取的Eval资产  
> Runner: local runner implemented（Model Provider未接入）

> Lifecycle migration completed (2026-08-22): E01–E12已拆分为`definition_status`、`execution_status`和`latest_run_status`。三者分别表达定义质量、可执行性和最近运行结果，不得互相推导。

## 1. Manifest Schema

```yaml
eval_id: string
category: contract | contract_boundary | semantic | workflow | workflow_state | workflow_authority | provider_compatibility
target_skill: string | null
related_skills: string[]
related_task_nodes: string[]
purpose: string
input:
  fixture_ref: string | null
  inline: object | string
expected:
  behavior: string[]
  output_constraints: object
  next_node_constraints: object | null
  side_effect_constraints: object | null
forbidden:
  behaviors: string[]
grader_type: deterministic | human_rubric | model_grader_future
severity: S0 | S1 | S2 | S3
tags: string[]
source:
  primary: string
  references: string[]
automation:
  class: 1 | 2 | 3
  label: current_mock_or_local | requires_model_provider | human_review
  blocker: string | null
definition_status: draft | reviewed | approved
execution_status: manual_only | runnable_local | provider_required | blocked
latest_run_status: not_run | pass | fail | skipped | error
notes: string | null
```

规则：

- `target_skill`只允许Skill Registry中的稳定skill_id或`null`；
- 跨Skill Case使用一个主锚点Skill，并在`related_skills`补充其余Skill；
- Human Gate不是Skill，只放入`related_task_nodes`和Expected约束；
- `grader_type`只能是`deterministic`、`human_rubric`或`model_grader_future`；
- `automation.class`采用用户要求的三类能力判断；
- 所有未冻结字段、枚举和错误结构标记`[待确认]`；
- Manifest不代表已经存在Runner、DeepSeek/OpenAI API或xTool Studio集成。

## 2. Eval Set

```yaml
manifest_version: "0.1"
design_spec_schema_status: "draft_[待确认]"
runner_status: "local_implemented"

evals:
  - eval_id: E01
    category: workflow
    target_skill: brief.validate
    related_skills:
      - brief.extract
      - brief.ask_missing
    related_task_nodes: [T02, T03, T04, T01]
    purpose: "尺寸未知时保持missing并进入Ask循环"
    input:
      fixture_ref: null
      inline:
        input_mode: initial
        user_text: "尺寸不知道"
        current_brief: "[待确认]"
    expected:
      behavior:
        - "T02不得把尺寸写成confirmed"
        - "T03将成品尺寸判定为missing/invalid"
        - "T04生成中性尺寸追问"
        - "用户回答通过T01 clarification重新进入T02/T03"
      output_constraints:
        brief_candidate.finished_size.status: "not_confirmed"
        brief_validation_result.missing_items: "contains_finished_size"
        clarifying_questions: "contains_neutral_size_question"
      next_node_constraints:
        required_path: [T02, T03, T04, T01]
        forbidden_next: [T05]
      side_effect_constraints:
        confirmed_brief_mutated: false
    forbidden:
      behaviors:
        - "自动填A6或其他尺寸"
        - "把尺寸自动标为confirmed"
        - "跳过Ask进入Brief确认"
    grader_type: human_rubric
    severity: S1
    tags: [missing_field, ask_vs_act, workflow, semantic]
    source:
      primary: "makerflow_eval_cases_v0.1.md#E01"
      references:
        - "brief.extract.contract.md"
        - "brief.validate.contract.md"
        - "brief.ask_missing.contract.md"
        - "Node I/O T01-T04"
    automation:
      class: 2
      label: requires_model_provider
      blocker: "真实Provider路径可执行；当前Contract Runner仍不执行需要网络与Human Rubric的E01。"
    definition_status: reviewed
    execution_status: provider_required
    latest_run_status: pass
    notes: "真实DeepSeek + Browser Human Rubric运行见evals/reports/e01_brief_ask_missing_real_v0.1.md；Workflow + Semantic Eval，不作为单Skill Contract Eval。"

  - eval_id: E02
    category: contract
    target_skill: brief.validate
    related_skills: []
    related_task_nodes: [T03]
    purpose: "确定性执行A6到148×105mm的成品尺寸映射"
    input:
      fixture_ref: null
      inline:
        brief_candidate:
          finished_size:
            preset_size: A6
            status: confirmed
    expected:
      behavior:
        - "A6规范化为width=148、height=105、unit=mm"
        - "成品尺寸作为一个逻辑字段保持confirmed"
      output_constraints:
        normalized_finished_size:
          preset_size: A6
          width: 148
          height: 105
          unit: mm
          status: confirmed
        normalized_output_location: "[待确认]"
      next_node_constraints:
        allowed_next: [T05]
      side_effect_constraints:
        input_brief_mutated_in_place: false
    forbidden:
      behaviors:
        - "返回尺寸missing"
        - "产生互相冲突的preset/width/height/unit状态"
        - "创建独立尺寸摘要字段"
    grader_type: deterministic
    severity: S1
    tags: [happy_path, normalization, size, a6, enum]
    source:
      primary: "makerflow_eval_cases_v0.1.md#E02"
      references:
        - "brief.validate.contract.md"
        - "13_Design_Spec_Schema_v0.1.md [Draft]"
        - "用户裁决：映射归入brief.validate"
    automation:
      class: 1
      label: current_mock_or_local
      blocker: null
    definition_status: approved
    execution_status: runnable_local
    latest_run_status: pass
    notes: "Runner调用brief.validate本地Rule；规范化值通过brief_validation_result.normalized_finished_size返回，不原地修改Brief。"

  - eval_id: E03
    category: semantic
    target_skill: brief.extract
    related_skills: []
    related_task_nodes: [T02]
    purpose: "保留用户明确提供的3模块产品事实"
    input:
      fixture_ref: null
      inline:
        input_mode: initial
        user_text: "产品由3个模块组成"
    expected:
      behavior:
        - "提取模块数量3"
        - "保留用户输入来源"
        - "不由Skill直接升级为confirmed"
      output_constraints:
        product_fact.module_count: 3
        product_fact.source: user_input
        product_fact.status: "not_auto_confirmed"
      next_node_constraints:
        required_next: T03
      side_effect_constraints:
        confirmed_brief_mutated: false
    forbidden:
      behaviors:
        - "把3改成4"
        - "生成输入未支持的模块数量"
        - "覆盖已有confirmed事实"
    grader_type: human_rubric
    severity: S0
    tags: [forbidden_inference, fact_preservation, semantic]
    source:
      primary: "makerflow_eval_cases_v0.1.md#E03"
      references: ["brief.extract.contract.md", "Node I/O T02"]
    automation:
      class: 2
      label: requires_model_provider
      blocker: "Model Provider未接入；正式Brief字段路径[待确认]"
    definition_status: reviewed
    execution_status: provider_required
    latest_run_status: skipped
    notes: "冻结字段后可增加确定性数值断言，语义忠实度仍由Human Review。"

  - eval_id: E04
    category: semantic
    target_skill: brief.extract
    related_skills: [plan.generate]
    related_task_nodes: [T02, T06]
    purpose: "区分视觉辅助需求事实与具体图案建议"
    input:
      fixture_ref: null
      inline:
        input_mode: initial
        user_text: "需要示意图帮助理解"
    expected:
      behavior:
        - "记录视觉辅助需求为required"
        - "具体视觉类型保持undecided或let_system_recommend"
        - "具体形式留给Creative Plan"
      output_constraints:
        visual_aid_requirement.status: required
        visual_aid_requirement.preferred_type: "undecided_or_let_system_recommend"
      next_node_constraints:
        image_generation_allowed: false
      side_effect_constraints:
        generated_artifact_count: 0
    forbidden:
      behaviors:
        - "直接确认具体图案"
        - "在Brief阶段生成图片"
        - "把Recommendation写成产品事实"
        - "调用Prompt-to-image"
    grader_type: human_rubric
    severity: S1
    tags: [forbidden_inference, visual_aid, semantic, boundary]
    source:
      primary: "makerflow_eval_cases_v0.1.md#E04"
      references: ["brief.extract.contract.md", "plan.generate.contract.md"]
    automation:
      class: 2
      label: requires_model_provider
      blocker: "Model Provider未接入；视觉辅助Brief Schema[待确认]"
    definition_status: reviewed
    execution_status: provider_required
    latest_run_status: skipped
    notes: null

  - eval_id: E05
    category: contract
    target_skill: plan.generate
    related_skills: []
    related_task_nodes: [T06]
    purpose: "Creative Plan不重复推荐confirmed尺寸"
    input:
      fixture_ref: "prototype/data/brief_confirmed.json"
      inline:
        confirmed_constraint: "A6 · 148 × 105 mm"
        undecided_field: layout
    expected:
      behavior:
        - "尺寸仅作为locked constraint"
        - "Recommendation只针对未确定字段"
      output_constraints:
        locked_constraints: "contains_finished_size"
        recommendations: "excludes_finished_size"
      next_node_constraints:
        human_decision_required_before_T07: true
      side_effect_constraints:
        confirmed_brief_mutated: false
    forbidden:
      behaviors:
        - "再次推荐A6"
        - "要求重新接受confirmed尺寸"
        - "生成机器参数"
    grader_type: deterministic
    severity: S1
    tags: [confirmed_constraint, state_contamination, plan_filter, happy_path]
    source:
      primary: "makerflow_eval_cases_v0.1.md#E05"
      references: ["plan.generate.contract.md", "prototype/plan-policy.js"]
    automation:
      class: 1
      label: current_mock_or_local
      blocker: null
    definition_status: reviewed
    execution_status: runnable_local
    latest_run_status: pass
    notes: "当前可测试Mock/local筛选；未来Provider使用同一Contract断言。"

  - eval_id: E06
    category: contract_boundary
    target_skill: brief.extract
    related_skills: [brief.validate]
    related_task_nodes: [T02, T03]
    purpose: "非法Model JSON必须Fail Closed且不污染下游"
    input:
      fixture_ref: "[待确认]"
      inline:
        provider_output: "{ invalid json"
    expected:
      behavior:
        - "解析失败"
        - "不尝试Normalize为成功结果"
        - "不产生可进入T03的brief_candidate"
      output_constraints:
        success: false
        brief_candidate: null
        error_envelope: "[待确认]"
      next_node_constraints:
        forbidden_next: [T03, T05]
      side_effect_constraints:
        project_state_mutated: false
        confirmed_brief_mutated: false
    forbidden:
      behaviors:
        - "静默Normalize并作为成功"
        - "把部分解析内容写入Brief"
        - "污染下游状态"
    grader_type: deterministic
    severity: S0
    tags: [malformed_output, fail_closed, schema_boundary]
    source:
      primary: "makerflow_eval_cases_v0.1.md#E06"
      references:
        - "brief.extract.contract.md"
        - "用户裁决：非法JSON一律Fail"
    automation:
      class: 2
      label: requires_model_provider
      blocker: "Provider Adapter、错误Envelope和正式错误码[待确认]"
    definition_status: approved
    execution_status: blocked
    latest_run_status: skipped
    notes: "不新增Normalize承诺。"

  - eval_id: E07
    category: contract
    target_skill: svg.file_check
    related_skills: [issue.route]
    related_task_nodes: [T10, T13]
    purpose: "Malformed SVG形成导入前BLOCK"
    input:
      fixture_ref: "prototype/tests/fixtures/unsafe-upload.svg或新固定fixture[待确认]"
      inline:
        svg: "<svg><g></svg"
        artifact_revision: 1
    expected:
      behavior:
        - "SVG解析失败"
        - "生成绑定revision的BLOCK issue"
      output_constraints:
        svg_file_issues: "contains_parse_issue"
        severity: block
        checked_artifact_revision: 1
      next_node_constraints:
        forbidden_next: [T16]
      side_effect_constraints:
        svg_mutated: false
    forbidden:
      behaviors:
        - "返回PASS"
        - "忽略解析错误"
        - "修改SVG"
        - "推断材料或参数"
    grader_type: deterministic
    severity: S0
    tags: [malformed_output, svg, block, preflight]
    source:
      primary: "makerflow_eval_cases_v0.1.md#E07"
      references: ["svg.file_check.contract.md", "Node I/O T10"]
    automation:
      class: 1
      label: current_mock_or_local
      blocker: null
    definition_status: reviewed
    execution_status: runnable_local
    latest_run_status: pass
    notes: "正式Issue字段仍有[待确认]，但核心BLOCK行为可运行。"

  - eval_id: E08
    category: contract
    target_skill: brief.consistency_check
    related_skills: []
    related_task_nodes: [T11]
    purpose: "作品尺寸与confirmed Brief冲突时BLOCK"
    input:
      fixture_ref: "[待确认]"
      inline:
        artifact_revision: 1
        confirmed_brief_size: "148 × 105 mm"
        design_spec_size: "150 × 105 mm"
        svg_size: "150 × 105 mm"
    expected:
      behavior:
        - "识别尺寸冲突"
        - "返回Brief和作品两侧证据"
      output_constraints:
        consistency_issues: "contains_size_conflict"
        severity: block
        checked_artifact_revision: 1
      next_node_constraints:
        forbidden_next: [T16]
      side_effect_constraints:
        brief_mutated: false
        svg_mutated: false
    forbidden:
      behaviors:
        - "返回WARN或PASS"
        - "静默修改Brief"
        - "忽略单位"
    grader_type: deterministic
    severity: S0
    tags: [conflicting_input, size, brief_consistency, block]
    source:
      primary: "makerflow_eval_cases_v0.1.md#E08"
      references: ["brief.consistency_check.contract.md", "Node I/O T11"]
    automation:
      class: 1
      label: current_mock_or_local
      blocker: "需固定Brief/Design Spec/SVG三对象fixture和单位"
    definition_status: reviewed
    execution_status: runnable_local
    latest_run_status: pass
    notes: null

  - eval_id: E09
    category: contract
    target_skill: studio.readiness_check
    related_skills: [issue.route]
    related_task_nodes: [T12, T13]
    purpose: "材料未确认形成Studio待办而不是SVG BLOCK"
    input:
      fixture_ref: "prototype/data/project_state.json"
      inline:
        project_state:
          material:
            status: pending
            value: null
    expected:
      behavior:
        - "生成材料待人工确认项"
        - "不从SVG推断材料"
        - "不阻塞合格SVG的Pre-import导出"
      output_constraints:
        studio_checklist: "contains_material_pending"
        formal_status_enum: "[待确认]"
      next_node_constraints:
        pre_import_block_created: false
      side_effect_constraints:
        project_state_mutated: false
        svg_mutated: false
    forbidden:
      behaviors:
        - "生成SVG File BLOCK"
        - "从SVG猜测材料"
        - "生成具体加工参数"
        - "声称Studio已同步"
    grader_type: deterministic
    severity: S1
    tags: [missing_field, forbidden_inference, studio_readiness]
    source:
      primary: "makerflow_eval_cases_v0.1.md#E09"
      references: ["studio.readiness_check.contract.md", "issue.route.contract.md"]
    automation:
      class: 1
      label: current_mock_or_local
      blocker: "正式Checklist状态枚举[待确认]"
    definition_status: reviewed
    execution_status: runnable_local
    latest_run_status: pass
    notes: "核心行为可运行，严格输出Schema尚未冻结。"

  - eval_id: E10
    category: workflow_state
    target_skill: null
    target_system: workflow_orchestrator_artifact_state
    related_skills: [svg.file_check, brief.consistency_check, studio.readiness_check, issue.route]
    related_task_nodes: [T09, T08, T10, T11, T12, T13]
    purpose: "作品编辑产生新revision并使旧Preflight失效"
    input:
      fixture_ref: "prototype/data/design_spec.json"
      inline:
        design_spec_revision: 1
        artifact_revision: 1
        checked_artifact_revision: 1
        initial_preflight_status: pass
        action: "drag step_2 group by one grid unit"
    expected:
      behavior:
        - "更新Design Spec position"
        - "design_spec_revision与artifact_revision按各自语义增加"
        - "重新渲染SVG"
        - "旧Preflight变为stale"
      output_constraints:
        artifact_revision: "greater_than_checked_artifact_revision"
        preflight_current: false
      next_node_constraints:
        rerun_preflight_required: true
        export_allowed: false
      side_effect_constraints:
        design_spec_position_updated: true
        old_warning_confirmation_valid: false
    forbidden:
      behaviors:
        - "旧PASS继续有效"
        - "沿用旧WARN确认"
        - "只修改DOM而不更新Design Spec"
        - "使用一个generic revision表达Design Spec、Artifact和Preflight"
    grader_type: deterministic
    severity: S0
    tags: [state_contamination, revision, stale, workflow]
    source:
      primary: "makerflow_eval_cases_v0.1.md#E10"
      references:
        - "prototype/workflow-state.js"
        - "prototype/artifact-manager.js"
        - "Node I/O T07-T13"
        - "prototype/app.js"
    automation:
      class: 1
      label: current_mock_or_local
      blocker: null
    definition_status: approved
    execution_status: runnable_local
    latest_run_status: pass
    notes: "Workflow/State Eval，不作为单Skill Contract Eval。"

  - eval_id: E11
    category: workflow_authority
    target_skill: issue.route
    related_skills: [artifact.export]
    related_task_nodes: [T13, T15, T16]
    purpose: "WARN必须经过当前revision的Human Confirm"
    input:
      fixture_ref: "prototype/data/preflight_warn.json或真实规则生成结果[待确认]"
      inline:
        artifact_revision: 1
        block_count: 0
        warn_count: 1
        warning_confirmation_records: []
    expected:
      behavior:
        - "T13路由到T15"
        - "未确认时T16拒绝导出"
        - "当前revision确认后才允许导出"
      output_constraints:
        pre_import_status: warn
        export_before_confirmation: blocked
        confirmation_artifact_revision: 1
      next_node_constraints:
        required_before_export: T15
        allowed_after_confirmation: T16
      side_effect_constraints:
        warning_fact_mutated: false
    forbidden:
      behaviors:
        - "自动继续"
        - "Rule或Model代替用户确认"
        - "复用旧revision确认"
        - "通过确认绕过BLOCK"
    grader_type: deterministic
    severity: S0
    tags: [warn, human_gate, authority, workflow]
    source:
      primary: "makerflow_eval_cases_v0.1.md#E11"
      references: ["issue.route.contract.md", "artifact.export.contract.md", "Node I/O T13-T16"]
    automation:
      class: 1
      label: current_mock_or_local
      blocker: null
    definition_status: approved
    execution_status: runnable_local
    latest_run_status: pass
    notes: "当前本地Decision Log将Human WARN确认绑定artifact_revision与checked_artifact_revision；Human Gate本身不是Skill。"

  - eval_id: E12
    category: provider_compatibility
    target_skill: null
    related_skills: [brief.extract, brief.ask_missing, plan.generate, design_spec.build]
    related_task_nodes: [T02, T04, T06, T07]
    purpose: "替换为DeepSeek时保持Skill Contract与Agent架构不变"
    input:
      fixture_ref: "[待确认：Provider-neutral eval fixture set]"
      inline:
        baseline_provider: mock
        replacement_provider: deepseek_future
    expected:
      behavior:
        - "Skill input/output名称不变"
        - "Schema和硬规则不变"
        - "Task Graph节点及路由不变"
        - "Human Gate不变"
      output_constraints:
        contract_compatible: true
        provider_specific_fields_in_skill_io: false
      next_node_constraints:
        task_graph_changed: false
      side_effect_constraints:
        confirmed_fact_protection_changed: false
    forbidden:
      behaviors:
        - "为Provider修改Skill ID"
        - "让Model覆盖Rule"
        - "移除T05或T15 Human Gate"
        - "新增隐式Studio集成"
    grader_type: human_rubric
    severity: S1
    tags: [provider_replacement, compatibility, architecture]
    source:
      primary: "makerflow_eval_cases_v0.1.md#E12"
      references:
        - "07_Skill_Registry_v1.1.md"
        - "06_Agent_Task_Graph_v1.0.md"
        - "06_node_io_matrix.md"
        - "Model Skill Contracts"
    automation:
      class: 2
      label: requires_model_provider
      blocker: "DeepSeek尚未接入；Provider Adapter与比较fixture[待确认]"
    definition_status: approved
    execution_status: provider_required
    latest_run_status: skipped
    notes: "Provider Compatibility Eval，不作为单Skill Contract Eval。"
```

## 3. Candidate Evals（非正式集合）

以下不计入E01–E12正式Eval Set。

```yaml
candidates:
  - eval_id: CANDIDATE-ENUM-01
    category: contract
    purpose: "非法枚举必须被确定性校验拒绝"
    target_skill: null
    candidate_target_options: [brief.validate, design_spec.build]
    blocker: "Brief/Design Spec Schema与正式枚举尚未冻结"

  - eval_id: CANDIDATE-HAPPY-01
    category: contract
    purpose: "为一个local Skill建立完整合法输入到输出的基准"
    target_skill: null
    candidate_target_options: [svg.file_check, studio.readiness_check]
    blocker: "正式Issue/Checklist输出Schema仍为[待确认]"
```

## 4. Runner边界

本Manifest定义当前本地Runner可读取的数据形状。本轮明确不包含：

- DeepSeek/OpenAI API调用；
- model grader实现；
- 新Skill或Skill Contract；
- xTool Studio或AImake集成；
- 自动修改现有Contract；
- 把Draft Design Spec Schema冒充为冻结接口。
