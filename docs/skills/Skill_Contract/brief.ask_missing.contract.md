# `brief.ask_missing` Skill Contract

> Status: Draft  
> Skill ID: `brief.ask_missing`  
> Called by: T04 Ask Missing Constraints  
> Current implementation: `mock`  
> 未明确的信息标记为`[待确认]`。当前未接入DeepSeek、OpenAI或其他模型API。

## Purpose

根据`brief_candidate`和`brief_validation_result`，仅针对必须由用户补充或确认的缺失项与冲突项生成最少且中性的`clarifying_questions[]`。

## Owner

- Owner type: `Model`
- Implementation type: `model`
- Current implementation: `mock`
- Target implementation: `future_model`
- Owning node: T04

Provider变化不得改变Skill I/O、必要缺口边界或Human Gate。

## Input Schema

输入名称必须为`brief_candidate` + `brief_validation_result`。

```yaml
brief_candidate: unknown
brief_validation_result:
  brief_revision: unknown
  validity: unknown
  missing_items: unknown
  conflict_items: unknown
  evidence: unknown
```

完整字段结构、问题去重依据和上下文封装为`[待确认]`。

## Output Schema

输出名称必须为`clarifying_questions[]`。

```yaml
clarifying_questions[]:
  - question: unknown
    based_on: unknown
    expected_answer_format: unknown
```

正式问题字段、ID、顺序和关联结构为`[待确认]`。

## Preconditions

1. 两个输入均存在且引用同一`brief_revision`。
2. 校验结果包含必须由用户补充或确认的缺失项或冲突项。

## Postconditions

1. 只生成覆盖必要缺口的问题。
2. 问题不暗示答案、不替用户决定。
3. 已确认字段不被重复追问。
4. 输出进入T01 clarification模式等待用户回答。
5. Brief确认值不被修改。

## Determinism

`false`。问题措辞可能变化，但必须覆盖相同必要缺口并遵守中性边界。Provider变化不得改变I/O Contract。

## Side Effects

- 增加待回答问题。
- 不修改Brief候选值或确认值。
- 不写入用户答案。

问题保存和去重记录格式为`[待确认]`。

## Failure Codes

| Failure condition | Failure code |
|---|---|
| 输入缺失或版本无法关联 | `[待确认]` |
| 诱导性提问 | `[待确认]` |
| 重复追问 | `[待确认]` |
| 遗漏关键缺口 | `[待确认]` |
| 要求模型代替用户决定 | `[待确认]` |

正式错误码和失败响应Schema为`[待确认]`。

## Retry Policy

输入无效时先修复或重新运行T03；问题遗漏、重复或诱导时，在不改变缺口事实的前提下重新生成。自动重试次数与评价机制为`[待确认]`。

## Human Approval

Skill内部不批准约束。每个问题必须由用户通过T01 clarification模式回答，回答再经T02提取和T03复验。

## Example Input

```yaml
brief_candidate: "[待确认：Brief候选结构]"
brief_validation_result:
  validity: invalid
  missing_items: "[待确认：必须补充项]"
  conflict_items: "[待确认：冲突项]"
  evidence: "[待确认]"
```

## Example Output

```yaml
clarifying_questions[]:
  - question: "[待确认：中性问题文本]"
    based_on: "[待确认：对应缺口]"
    expected_answer_format: "[待确认]"
```

## Positive Test

Given校验结果只有一个必须由用户回答的缺口，When调用本Skill，Then输出只覆盖该缺口的中性问题，并返回T01等待回答，不改Brief。

## Negative Test

Given某字段已confirmed，When输出再次要求用户确认该字段且暗示具体答案，Then该输出不满足Contract；正式failure code为`[待确认]`，不得写回Brief。

## Non-goals

- 不判断Brief是否有效；该结论来自T03。
- 不回答问题或决定约束。
- 不修改confirmed字段。
- 不询问不阻塞流程的无关偏好。
- 不生成Creative Plan、Design Spec或SVG。
- 不调用AImake或xTool Studio。
