# `brief.consistency_check` Skill Contract

> Status: Draft  
> Skill ID: `brief.consistency_check`  
> Called by: T11 Brief Consistency Check  
> Current implementation: `local_tool`  
> 未明确的信息标记为`[待确认]`。确定性硬规则不允许LLM改写。

## Purpose

确定性比较current SVG、confirmed Brief和`design_spec`，输出`consistency_issues[]`。

## Owner

- Owner type: `Tool + Rule`
- Implementation type: `composite`
- Current implementation: `local_tool`
- Target implementation: `local_tool`
- Owning node: T11

## Input Schema

输入名称必须为current SVG + `artifact_revision` + confirmed Brief + `brief_revision` + `design_spec`。

```yaml
current SVG: unknown
artifact_revision: unknown
confirmed Brief: unknown
brief_revision: unknown
design_spec: unknown
design_spec_revision: unknown
```

三个对象及版本关联的完整Schema为`[待确认]`。

## Output Schema

输出名称必须为`consistency_issues[]` + `checked_artifact_revision`。

```yaml
consistency_issues[]:
  - issue_id: unknown
    severity: unknown
    evidence: unknown
    checked_artifact_revision: unknown
checked_artifact_revision: unknown
```

正式Issue Schema为`[待确认]`。

## Preconditions

1. SVG、confirmed Brief与Design Spec均存在。
2. `brief_revision`、`design_spec_revision`和`artifact_revision`关联有效；External SVG路径允许`design_spec_status`为`derived_partial`或`none`。

## Postconditions

1. 确定性比较尺寸、矢量要求、文字策略、视觉辅助和cutline要求。
2. 每个判断指向SVG、Brief或Design Spec证据。
3. 返回`consistency_issues[]`并用`checked_artifact_revision`绑定被检查Artifact。
4. 不修改输入对象。

## Determinism

`true`。相同输入、版本和规则必须产生相同结果；LLM不得覆盖一致性硬规则。

## Side Effects

- 写入一致性结果。
- 不修改Brief、Design Spec或SVG。

记录位置为`[待确认]`。

## Failure Codes

| Failure condition | Failure code |
|---|---|
| 单位不可比较 | `[待确认]` |
| Brief或Design Spec版本过期 | `[待确认]` |
| 规则缺失 | `[待确认]` |
| 版本无法关联 | `[待确认]` |

发现BLOCK/WARN是检查结果而非正式执行错误；其表示方式为`[待确认]`。

## Retry Policy

任一领域revision过期时使用当前关联版本重新检查；单位不可比较或规则缺失时先补齐确定性规则，不允许模型猜测。自动重试策略为`[待确认]`。

## Human Approval

Skill内部不确认WARN或修改约束。结果交T13路由，必要时进入T15。

## Example Input

```yaml
current SVG: "[待确认：当前SVG]"
artifact_revision: "[待确认：当前artifact_revision]"
confirmed Brief: "[待确认：已确认Brief]"
brief_revision: "[待确认：当前brief_revision]"
design_spec: "[待确认：当前Design Spec]"
design_spec_revision: "[待确认：当前design_spec_revision或External SVG路径的none]"
```

## Example Output

```yaml
consistency_issues[]: "[待确认：一致性问题与证据]"
```

## Positive Test

Given三份输入版本有效且尺寸一致，When执行检查，Then返回可定位证据、相同输入结果可复现，并不修改任何输入。

## Negative Test

GivenBrief版本已过期，When执行检查，Then不得基于旧Brief产生可执行PASS结论；返回版本问题，正式failure code为`[待确认]`。

## Non-goals

- 不判断未固化的美学偏好。
- 不把Recommendation当成confirmed约束。
- 不检查Studio实时状态。
- 不从SVG推断材料或参数。
- 不自动修复文件或修改Brief。
- 不允许LLM改写硬规则。
