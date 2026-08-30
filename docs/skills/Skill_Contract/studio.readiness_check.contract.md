# `studio.readiness_check` Skill Contract

> Status: Draft  
> Skill ID: `studio.readiness_check`  
> Called by: T12 Studio Readiness Check  
> Current implementation: `local_rule`  
> 未明确的信息标记为`[待确认]`。实际xTool Studio能力仍为`[待实际验证]`。

## Purpose

只读取`project_state`，生成进入Studio后、加工前需要人工完成的`studio_checklist[]`。

## Owner

- Owner type: `Rule`
- Implementation type: `rule`
- Current implementation: `local_rule`
- Target implementation: `local_rule`
- Owning node: T12

## Input Schema

输入名称必须为`project_state`。

```yaml
project_state:
  device_status: unknown
  material_status: unknown
  processing_parameters_status: unknown
  preview_status: unknown
  framing_status: unknown
  project_state_version: unknown
```

正式字段名、状态枚举和`project_state_version`格式为`[待确认]`。该字段用于项目状态快照，不替代Artifact的`artifact_revision`或Preflight的`checked_artifact_revision`。

## Output Schema

输出名称必须为`studio_checklist[]`。

```yaml
studio_checklist[]:
  - item: unknown
    status: unknown
    evidence_source: project_state
```

Checklist正式Schema为`[待确认]`。

## Preconditions

1. `project_state`存在。
2. 状态字段可读取。

## Postconditions

1. 只依据项目状态生成清单。
2. 清单覆盖设备、材料、加工参数、Preview和Framing状态。
3. 不从SVG推断任何上述状态。
4. 更新Studio待办记录，不修改SVG或加工参数。
5. 待办进入T13，但不误阻塞合格SVG导出。

## Determinism

`true`。相同`project_state`和规则版本产生相同清单。LLM不得改写硬规则。

## Side Effects

- 更新Studio待办记录。
- 不修改`project_state`、SVG或加工参数。
- 不控制Studio或设备。

记录位置为`[待确认]`。

## Failure Codes

| Failure condition | Failure code |
|---|---|
| project_state不存在 | `[待确认]` |
| 状态字段缺失或未知 | `[待确认]` |
| 实际Studio能力未验证 | `[待确认]` |

“待人工完成项”是清单结果还是失败状态的正式区分为`[待确认]`。

## Retry Policy

状态缺失时先由项目记录补充后重跑；不得通过解析SVG补值。实际Studio能力未知时保留`[待实际验证]`。自动重试次数为`[待确认]`。

## Human Approval

Skill内部不自动完成或确认清单。设备、材料、参数、Preview和Framing由操作人员在实际环境中完成或确认。

## Example Input

```yaml
project_state:
  device_status: "[待确认]"
  material_status: "[待确认]"
  processing_parameters_status: "[待确认]"
  preview_status: "[待确认]"
  framing_status: "[待确认]"
  version: "[待确认]"
```

## Example Output

```yaml
studio_checklist[]: "[待确认：Studio人工待办结构]"
```

## Positive Test

Given可读取的`project_state`含五类状态，When调用本Skill，Then清单只引用项目状态，且不修改SVG或设备。

## Negative Test

Given材料状态缺失但SVG存在，When调用本Skill，Then不得从SVG猜测材料；输出未知/待办或失败信息，正式表示为`[待确认]`。

## Non-goals

- 不解析SVG推断设备、材料、功率、速度、次数或安全参数。
- 不验证xTool Studio未确认能力。
- 不调用xTool Studio或控制设备。
- 不执行Preview、Framing或加工。
- 不把Studio待办自动升级为Pre-import BLOCK。
