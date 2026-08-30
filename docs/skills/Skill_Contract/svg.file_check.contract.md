# `svg.file_check` Skill Contract

> Status: Draft  
> Skill ID: `svg.file_check`  
> Called by: T10 SVG File Check  
> Current implementation: `local_tool`  
> 未明确的信息标记为`[待确认]`。

## Purpose

对Create & Edit当前`artifact_revision`的真实SVG执行确定性文件检查，输出`svg_file_issues[]`与`checked_artifact_revision`。

## Owner

- Owner type: `Tool`
- Implementation type: `tool`
- Current implementation: `local_tool`
- Target implementation: `local_tool`
- Owning node: T10

## Input Schema

输入名称必须为current SVG + `artifact_revision`。

```yaml
current SVG:
  content_or_dom: unknown
  artifact_revision: unknown
```

DOM/字符串封装、`artifact_revision`格式和锁定机制为`[待确认]`。

## Output Schema

输出名称必须为`svg_file_issues[]` + `checked_artifact_revision`。

```yaml
svg_file_issues[]:
  - issue_id: unknown
    title: unknown
    severity: unknown
    evidence: unknown
    checked_artifact_revision: unknown
checked_artifact_revision: unknown
```

正式Issue Schema及摘要结构为`[待确认]`。

## Preconditions

1. 当前SVG存在。
2. 待检查`artifact_revision`已锁定。

## Postconditions

1. 返回解析、width/height、viewBox、text、image、重复ID、空元素和cutline闭合检查结果。
2. 结果附带可定位证据并通过`checked_artifact_revision`绑定当前Artifact。
3. SVG不被修改。
4. 结果进入T13，不直接决定Export。

## Determinism

`true`。相同SVG、`artifact_revision`和规则版本必须产生相同结果。规则版本与排序规范为`[待确认]`。

## Side Effects

- 写入当前revision的检查结果。
- 不修改SVG、Design Spec或Brief。

结果保存位置为`[待确认]`。

## Failure Codes

| Failure condition | Failure code |
|---|---|
| SVG不可解析 | `[待确认]` |
| 检查过程中revision变化 | `[待确认]` |
| 规则无法处理某元素 | `[待确认]` |

SVG解析失败会产生BLOCK issue；正式错误码及失败响应结构为`[待确认]`。

## Retry Policy

revision变化时锁定最新revision后重新检查；SVG不可解析时先返回编辑修复；规则不支持元素时停止对应判断并返回证据。自动重试次数为`[待确认]`。

## Human Approval

不需要Skill内部审批。检查结果由T13路由；WARN接受由T15完成。

## Example Input

```yaml
current SVG:
  content_or_dom: "[待确认：当前SVG DOM或字符串]"
  artifact_revision: "[待确认]"
```

## Example Output

```yaml
svg_file_issues[]: "[待确认：文件问题数组及证据]"
```

## Positive Test

Given可解析SVG且revision保持锁定，When检查两次，Then返回相同文件事实结果、证据和revision，不修改SVG。

## Negative Test

Given检查过程中SVG revision变化，When完成检查，Then不得把旧结果绑定到新revision或路由为PASS；正式failure code为`[待确认]`。

## Non-goals

- 不读取预写Mock结果冒充真实检查。
- 不从SVG推断材料、设备或加工参数。
- 不执行Brief一致性或Studio Readiness检查。
- 不自动修复SVG。
- 不保证Studio兼容或加工成功。
