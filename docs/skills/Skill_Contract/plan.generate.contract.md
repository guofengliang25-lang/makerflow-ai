# `plan.generate` Skill Contract

> Status: Draft  
> Skill ID: `plan.generate`  
> Called by: T06 Generate Creative Plan  
> Current implementation: `experimental_provider`  
> 未明确的信息标记为`[待确认]`。当前通过DeepSeek Experimental Provider运行；这不代表最终模型选型。

## Purpose

基于当前版本confirmed Brief，只针对仍未确定的约束生成包含依据、收益、限制和待确认项的`creative_plan`候选。

## Owner

- Owner type: `Model`
- Implementation type: `model`
- Current implementation: `experimental_provider`
- Target implementation: `future_model`
- Owning node: T06

Provider变化不得改变Skill I/O、confirmed约束边界或人工接受要求。

## Input Schema

输入名称必须为confirmed Brief + `brief_revision`。

```yaml
confirmed Brief:
  fields: unknown
  field_statuses: unknown
  brief_revision: unknown
  confirmation_record: unknown
```

正式Schema、已锁定约束表示和可建议字段筛选结构为`[待确认]`。

## Output Schema

输出名称必须为`creative_plan`。

```yaml
creative_plan:
  brief_revision: unknown
  locked_constraints: unknown
  recommendations: unknown
  tradeoffs: unknown
  pending_confirmations: unknown
```

Recommendation字段、状态、置信度和版本结构为`[待确认]`。

## Preconditions

1. confirmed Brief存在且`brief_revision`仍为当前版本。
2. 仍有适合通过建议辅助判断的未确定约束。
3. 单一MVP场景边界可用。

## Postconditions

1. 返回`creative_plan`。
2. Plan包含依据、取舍和待确认项。
3. confirmed Brief字段只作为锁定约束，不被重复推荐。
4. 建议不被写成事实。
5. 不包含机器功率、速度、次数或安全参数。
6. Plan不修改Brief；用户接受/拒绝后才形成accepted Plan进入T07。

## Determinism

`false`。候选建议可以变化，但必须满足相同I/O和边界。当前Mock是否固定返回同一Plan为`[待确认]`。

## Side Effects

- 新增候选Plan。
- 不修改confirmed Brief。
- 不自动接受任何建议。

Plan版本和保存记录格式为`[待确认]`。

## Failure Codes

| Failure condition | Failure code |
|---|---|
| confirmed Brief缺失或版本过期 | `[待确认]` |
| 把建议写成事实 | `[待确认]` |
| 对confirmed字段重复Recommendation | `[待确认]` |
| 建议与Brief冲突 | `[待确认]` |
| 超出单一场景或生成机器参数 | `[待确认]` |

正式错误码及失败响应Schema为`[待确认]`。

## Retry Policy

Brief缺失或过期时返回T05/T06上游处理；候选违反边界时可在保持confirmed约束不变的前提下重新生成对应未确定项。最大重试次数和单项刷新协议为`[待确认]`。

## Human Approval

Skill内部不接受或拒绝建议。每项建议须由用户决定；只有accepted Plan可进入T07。

## Example Input

```yaml
confirmed Brief:
  fields: "[待确认：已确认Brief结构]"
  field_statuses: "[待确认：包含confirmed与未确定状态]"
  version: "[待确认]"
  confirmation_record: "[待确认]"
```

## Example Output

```yaml
creative_plan:
  brief_version_reference: "[待确认：当前Brief版本]"
  locked_constraints: "[待确认：confirmed字段]"
  recommendations: "[待确认：只针对未确定字段]"
  tradeoffs: "[待确认]"
  pending_confirmations: "[待确认]"
```

## Positive Test

Given confirmed Brief中尺寸已确认、版式未确定，When调用本Skill，Then尺寸只出现在锁定约束，Recommendation只针对版式等未确定项，且必须等待用户接受。

## Negative Test

Given confirmed Brief已锁定成品尺寸，When Plan再次要求接受相同尺寸Recommendation，Then输出不满足Contract，不得自动进入T07；正式failure code为`[待确认]`。

## Non-goals

- 不修改或重新确认Brief。
- 不推荐已confirmed字段。
- 不自动接受Recommendation。
- 不建立Design Spec或生成SVG。
- 不直接生成图片、图案文件或Prompt-to-image结果。
- 不决定材料加工参数、设备参数或安全参数。
- 不调用AImake或xTool Studio。
