# MakerFlow｜06 Node I/O Matrix v1.0

> 用途：定义 Agent Task Graph 中每个节点“吃什么、吐什么、谁负责、失败后去哪里”。
> 注意：这是接口/产品架构定义，不代表功能已经开发完成。当前未接真实模型 API 的节点可标记为 `mock` 或 `future_model`。

## 0. 核心理解

不需要先“拥有” Extract Brief，才能定义它的输入输出。

例如：

```text
用户自然语言
→ T02 Extract Brief
→ brief_candidate.json
```

即使 T02 当前只是 Mock，也可以先定义：
- 它未来应该接收什么；
- 应该输出什么结构；
- 什么算成功；
- 失败后交给谁处理。

这相当于先确定接口协议，再决定未来由 DeepSeek、OpenAI 或其他模型实现。

## 1. 核心数据对象

### 1.1 task_input

```json
{
  "task_description": "用户对作品需求的自然语言描述",
  "reference_assets": [],
  "existing_files": [],
  "project_id": "demo-momoray-001"
}
```

### 1.2 brief_candidate

```json
{
  "deliverable": "",
  "purpose": "",
  "target_user": "",
  "required_content": [],
  "product_facts": [],
  "visual_aid_requirement": {
    "status": "required | not_required | undecided",
    "purposes": [],
    "preferred_type": ""
  },
  "size": {
    "preset": "",
    "width": null,
    "height": null,
    "unit": "mm",
    "status": "missing"
  },
  "material_direction": "",
  "color_direction": "",
  "output_format": [],
  "production_path": "",
  "missing_fields": [],
  "needs_confirmation": []
}
```

`visual_aid_requirement` 只记录“用户是否需要图案/图标/结构示意/简单插画及其目的”，不代表此时已经生成图片。

### 1.3 creative_plan

```json
{
  "layout_recommendation": {},
  "size_recommendation": {},
  "material_recommendation": {},
  "color_recommendation": {},
  "visual_aid_recommendation": {
    "recommended": true,
    "direction": "三组模块组合示意图 + 简洁线性图标",
    "reason": "",
    "benefits": [],
    "limitations": [],
    "confidence": "medium",
    "needs_confirmation": true
  },
  "production_recommendation": {},
  "output_recommendation": {}
}
```

Step 3 只给“图案/视觉辅助建议”，不直接生成图。真正作品在 Create & Edit 阶段产生。

### 1.4 design_spec

```json
{
  "artifact_type": "instruction_card",
  "artboard": {
    "width_mm": 148,
    "height_mm": 105
  },
  "layout": "vertical_steps",
  "content_blocks": [],
  "visual_elements": {
    "enabled": true,
    "type": "module_diagram",
    "purpose": "explain_structure",
    "asset_source": "makerflow_template"
  },
  "palette": {},
  "production": {}
}
```

### 1.5 project_state

```json
{
  "brief_confirmed": false,
  "creative_plan_confirmed": false,
  "device_confirmed": false,
  "material_confirmed": false,
  "processing_parameters_confirmed": false,
  "preview_completed": false,
  "framing_completed": false
}
```

## 2. Node I/O Matrix

| Node | Purpose | Owner | Input | Output | Success / Branch | Current implementation |
|---|---|---|---|---|---|---|
| T01 Intake User Input | 接收任务、参考资料和已有文件 | Human/UI | 用户文字、附件、已有SVG | `task_input` | 有任务描述才继续 | `implemented_ui` |
| T02 Extract Brief | 提取候选Brief | Model | `task_input` | `brief_candidate` | 结构合法；缺失字段允许保留 | `mock / future_model` |
| T03 Validate Brief | 判断关键字段是否完整 | Rule | `brief_candidate` | `brief_validation_result` | P0缺失→T04；可继续→T05 | `local_rule / mock` |
| T04 Ask Missing Constraints | 生成最少澄清问题 | Model | Brief + validation | `clarifying_questions[]` | 用户回答后回T03 | `mock / future_model` |
| T05 Confirm Brief | 用户确认事实、暂定项 | Human/UI | Brief + 用户回答 | confirmed Brief | 拒绝/修改→T03 | `implemented_ui` |
| T06 Generate Creative Plan | 生成设计候选建议 | Model | confirmed Brief | `creative_plan` | 可整体/局部刷新 | `mock / future_model` |
| T07 Build Design Spec | 把已接受Plan固化成结构化规格 | Model + Rule | Brief + accepted Plan | `design_spec` | 高影响冲突→Human确认 | `mock / local_rule` |
| T08 Render SVG | 根据Spec稳定渲染SVG | Tool | `design_spec` | `draft.svg` | 非法尺寸/布局→render error | `local_tool` |
| T09 Edit Draft | 用户结构化编辑作品 | Human/UI | SVG + Spec | updated `design_spec` | 修改后回T08重渲染 | `implemented_ui` |
| T10 SVG File Check | 检查SVG自身 | Tool | current SVG | `svg_file_issues[]` | 解析失败→BLOCK | `local_tool` |
| T11 Brief Consistency Check | 检查SVG是否符合Brief | Tool + Rule | SVG + confirmed Brief | `consistency_issues[]` | 冲突→BLOCK/WARN | `local_rule / local_tool` |
| T12 Studio Readiness Check | 判断Studio待办 | Rule | project_state + Brief | `studio_checklist[]` | 未确认→Pending，不作为SVG错误 | `local_rule` |
| T13 Route Issues | 问题分级和路由 | Rule | T10-T12结果 | `routed_issues[]` | BLOCK→T09；WARN→T15；PASS→T16 | `local_rule` |
| T14 Apply Safe Fix | 低风险可逆修复 | Tool | issue + SVG/Spec | updated SVG/Spec | 不可自动修→Human/Edit | `optional / mock` |
| T15 Confirm Warning | 用户接受风险或返回修改 | Human | WARN issues | warning_decision | revise→T09；continue→T16 | `implemented_ui / mock` |
| T16 Export Verified Artifact | 导出当前通过规则的文件 | Tool | SVG + state + report | SVG/PDF + summary | export error→重试 | `local_tool` |
| T17 Show Studio Checklist | 展示进入Studio后的剩余事项 | Rule/UI | readiness result | checklist | 到此结束，不进入设备执行 | `implemented_ui / local_rule` |

## 3. 关键节点示例

### T02｜Extract Brief

**Input**

```json
{
  "task_description": "我要给MomoRay模块化枕头做一张包装内高度调节说明卡，需要三种组合、对应枕高和使用提醒，最好有简单图案帮助理解。",
  "reference_assets": [],
  "existing_files": []
}
```

**Output**

```json
{
  "deliverable": "包装内高度调节说明卡",
  "purpose": "帮助用户理解模块组合与对应枕高",
  "required_content": ["三种组合", "对应枕高", "使用提醒"],
  "visual_aid_requirement": {
    "status": "required",
    "purposes": ["explain_structure"],
    "preferred_type": "undecided"
  },
  "size": {"status": "missing"},
  "missing_fields": ["成品尺寸", "最终制作路径"],
  "needs_confirmation": ["视觉辅助具体形式"]
}
```

当前完全可以由 Mock JSON 代替真实模型调用。

### T03｜Validate Brief

**Output**

```json
{
  "can_continue": false,
  "blocking_fields": ["size"],
  "assumable_fields": [
    "material_direction",
    "color_direction",
    "visual_aid_type"
  ],
  "needs_confirmation": ["output_format"]
}
```

这里要区分：
- “是否需要视觉辅助”若由用户明确提出，可作为Brief事实；
- “具体用什么视觉形式”通常可暂定，留给Step 3建议。

### T06｜Generate Creative Plan

**Output示例**

```json
{
  "visual_aid_recommendation": {
    "recommended": true,
    "direction": "三组模块组合示意图 + 简洁线性图标",
    "reason": "核心任务是让首次用户快速理解组合差异",
    "benefits": ["降低纯文字理解成本", "便于快速对照"],
    "limitations": ["视觉元素过多会挤占说明文字空间"],
    "confidence": "high",
    "needs_confirmation": true
  }
}
```

这里仍不直接生成图片。

### T07｜Build Design Spec

```text
confirmed Brief
+
accepted Creative Plan
→ design_spec.json
```

### T08｜Render SVG

```text
design_spec.json
→ draft.svg
```

T08不负责“想图案”，只负责把已确认的结构稳定画出来。

## 4. 今天怎么用

1. 等Codex输出Task Graph草案；
2. 用本表逐节点对照；
3. 检查有没有漏输入/输出；
4. 如果Owner分类不同，要求Codex解释为什么；
5. 最终确认后，将本表更新为正式 `06_node_io_matrix.md`。

## 5. Day 1理解检查

- 为什么没有真实Extract Brief也能定义T02？
  - 因为Task Graph先定义系统职责和接口，当前实现可以是Mock。
- T06为什么不直接生成图片？
  - 因为Plan负责建议，真正作品在Design Spec→SVG Renderer阶段产生。
- 为什么视觉辅助既出现在Brief又出现在Plan？
  - Brief记录“要不要、为什么要”；Plan负责“具体建议用什么形式”。
- 为什么T08不需要LLM？
  - 因为它是确定性渲染，不是开放创意。
