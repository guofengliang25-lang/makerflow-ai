# `brief.validate` Skill Contract

> Status: Draft  
> Skill ID: `brief.validate`  
> Called by: T03 Validate Brief  
> Current implementation: `local_rule`  
> 未明确的信息标记为`[待确认]`。本Skill的硬规则不允许LLM改写。

当前本地实现入口：`prototype/brief-validate.js`。当前已实现E02所需的成品尺寸确定性规范化；其余未冻结字段继续标记为`[待确认]`。

## Purpose

按Brief Schema和确定性规则检查`brief_candidate`的关键字段、字段状态、缺失项与冲突，输出`brief_validation_result`。

## Owner

- Owner type: `Rule`
- Implementation type: `rule`
- Current implementation: `local_rule`
- Target implementation: `local_rule`
- Owning node: T03

## Input Schema

输入名称必须为`brief_candidate`。

```yaml
brief_candidate:
  finished_size:
    preset_size: string
    width: number | "" # 自定义尺寸；预设尺寸可省略
    height: number | "" # 自定义尺寸；预设尺寸可省略
    unit: string
    status: confirmed | assumed | missing | needs_confirmation
  fields: unknown # 其余Brief字段[待确认]
  field_statuses: unknown
  field_sources: unknown
  brief_revision: unknown
```

完整Brief Schema、关键字段清单、状态存储结构和`brief_revision`格式为`[待确认]`。校验还依赖Brief Schema与规则版本，其传入方式为`[待确认]`。

## Output Schema

输出名称必须为`brief_validation_result`。

```yaml
brief_validation_result:
  brief_revision: unknown
  validity: valid | invalid
  missing_items: unknown
  conflict_items: unknown
  evidence: unknown
  normalized_finished_size:
    preset_size: string
    width: number | ""
    height: number | ""
    unit: string
    status: confirmed | assumed | missing | needs_confirmation
```

确认资格、字段路径、证据和规则版本的正式字段结构为`[待确认]`。

## Preconditions

1. `brief_candidate`存在。
2. Brief Schema可用。
3. 校验规则版本可用。

## Postconditions

1. 返回valid/invalid、缺失项、冲突项及证据。
2. 相同输入和规则版本产生相同结果。
3. 校验记录被写入。
4. 输入Brief事实、值和状态不被原地修改；规范化结果作为独立输出返回。
5. invalid结果进入T04；可确认结果才可进入T05。

## Determinism

`true`。相同`brief_candidate`、Schema和规则版本必须产生相同结果。任何LLM或Provider均不得覆盖硬规则结论。

## Side Effects

- 写入校验记录。
- 不修改Brief字段、事实或状态。
- 不执行用户确认。

校验记录保存位置为`[待确认]`。

## Failure Codes

| Failure condition | Failure code |
|---|---|
| Brief Schema错误或不可用 | `[待确认]` |
| 规则版本缺失 | `[待确认]` |
| 字段状态组合非法 | `[待确认]` |
| 规则无法识别字段 | `[待确认]` |

正式错误码与失败响应Schema均为`[待确认]`。

## Retry Policy

Schema或规则不可用时，修复依赖后重试；字段缺失或冲突时，不在原输入上盲目重试，应进入T04/T01补充并重新提取后再校验。最大重试次数为`[待确认]`。

## Human Approval

Skill内部不执行Human Approval。即使验证通过，也必须由T05用户确认Brief。

## Example Input

```yaml
brief_candidate:
  brief_revision: 3
  finished_size:
    preset_size: A6
    status: confirmed
```

## Example Output

```yaml
brief_validation_result:
  brief_revision: 3
  validity: valid
  missing_items: []
  conflict_items: []
  evidence:
    - brief_candidate.finished_size
  normalized_finished_size:
    preset_size: A6
    width: 148
    height: 105
    unit: mm
    status: confirmed
```

## Positive Test

Given同一份合法`brief_candidate`及同一规则版本，When连续校验两次，Then两次结果相同、包含证据、不修改Brief，并允许进入T05。

## Negative Test

Given关键字段状态组合非法，When调用本Skill，Then返回invalid或对应失败信息，不修改字段，不允许绕过规则直接进入T05；正式failure code为`[待确认]`。

## Non-goals

- 不提取Brief。
- 不生成追问。
- 不代替用户回答或确认。
- 不把`assumed`自动改为`confirmed`。
- 不检查SVG、Design Spec或Studio状态。
- 不允许LLM改写Schema或硬规则。
