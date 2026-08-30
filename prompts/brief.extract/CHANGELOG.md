# `brief.extract` Prompt Changelog

本文件记录`brief.extract` Prompt资产的版本变化。Prompt变更不得改变Skill ID、Skill Contract、Rule边界、Human Gate或Eval Expected。

## v0.1 — Baseline

### 为什么建立

- 为`brief.extract`建立第一份可追溯的正式Prompt资产；
- 明确`task_input → brief_candidate`的单一职责；
- 固化用户事实、明确数字、原始意图和来源证据的保留要求；
- 固化缺失、不确定和待确认信息不得被自动升级为confirmed的边界；
- 将E01、E03、E04中与Brief事实提取直接相关的要求映射到Prompt。

### 当前证据状态

- 当前Model能力仍为Mock；
- 当前没有DeepSeek、OpenAI或其他真实Provider调用；
- 当前没有真实Provider Eval Baseline；
- 本版本未针对任何Provider偏好优化；
- 本版本不得描述为“optimized”或“production-ready”。

### 变更规则

后续版本修改必须至少关联以下一种证据：

1. 具体`eval_id`的真实Failure；
2. 已批准的Skill Contract变更；
3. 已批准的Brief Schema变更；
4. 人工确认的Authority或Truth Boundary裁决。

每次变更记录至少包含：

- 变更原因；
- 关联Eval Failure或人工裁决；
- 修改的单一主要变量；
- 预期影响；
- 回归范围；
- 是否保留或回滚。

禁止为了让Case变绿而静默修改Eval Expected、Skill Contract或Human Gate。未经真实Baseline，不创建以“优化”为理由的后续版本。
