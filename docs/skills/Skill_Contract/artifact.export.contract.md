# `artifact.export` Skill Contract

> Status: Draft  
> Skill ID: `artifact.export`  
> Called by: T16 Export Verified Artifact  
> Current implementation: `local_tool`  
> 未明确的信息标记为`[待确认]`。当前只导出本地Verified SVG，不存在Studio原生交接。

## Purpose

在当前SVG Artifact与Preflight的`checked_artifact_revision`一致、无BLOCK且无未确认WARN时执行本地SVG导出并计算交付完成状态。PDF要求保留在Brief；当前工具不生成PDF。

## Owner

- Owner type: `Tool`
- Implementation type: `tool`
- Current implementation: `local_tool`
- Target implementation: `local_tool`
- Owning node: T16

## Input Schema

输入名称为current SVG + current-artifact Preflight结果 + WARN确认记录 + output requirements。

```yaml
current SVG: unknown
artifact_revision: unknown
current-artifact Preflight结果:
  checked_artifact_revision: unknown
WARN确认记录: unknown
output requirements:
  - format: unknown
    requirement_level: required | preferred | optional
```

聚合输入、`artifact_revision`、`checked_artifact_revision`和确认记录的正式Schema为`[待确认]`。

## Output Schema

当前输出为SVG artifact export + 检查摘要 + 分离的交付完整度与完成门禁；不声称生成Verified PDF。

```yaml
artifact_exports:
  svg:
    status: ready | exported | missing | unsupported
    content: unknown
    artifact_revision: unknown
  pdf:
    status: ready | exported | missing | unsupported
partial_export:
  allowed: true | false
  formats: unknown
检查摘要: unknown
handoff_completion: complete | incomplete
completion_gate: open | blocked
```

文件封装、摘要Schema和下载元数据为`[待确认]`。当前Demo不生成经过验证的PDF。

## Preconditions

1. 当前SVG存在。
2. Preflight的`checked_artifact_revision`对应当前Artifact。
3. 不存在BLOCK。
4. 不存在未确认WARN。

## Postconditions

1. 导出SVG与已检查SVG一致。
2. 生成本地下载文件和检查摘要。
3. 摘要声明未覆盖风险及PASS不保证加工成功。
4. 不发送到Studio，不控制设备。
5. required PDF不受支持时允许SVG部分导出，整体handoff为`incomplete`且`completion_gate=blocked`；该blocked只禁止将整体交接标为Complete。
6. preferred PDF不受支持时产生WARN，整体完成门禁保持open。

## Determinism

`true`。相同当前SVG、同`artifact_revision`检查结果、确认记录和输出要求必须得到相同Artifact内容与交付状态；文件元数据的确定性范围为`[待确认]`。

## Side Effects

- 生成本地SVG下载文件。
- 生成检查摘要。
- 不修改源SVG、Brief、Design Spec或检查结果。
- 不上传任何外部系统。

## Failure Codes

| Failure condition | Failure code |
|---|---|
| artifact revision过期或不一致 | `[待确认]` |
| BLOCK仍存在 | `[待确认]` |
| WARN未确认 | `[待确认]` |
| SVG下载失败 | `[待确认]` |

正式错误码和失败响应Schema为`[待确认]`。

## Retry Policy

门禁不满足时不得重试导出，应返回对应编辑、复检或T15确认路径；下载瞬时失败是否可在输入不变时重试及最大次数为`[待确认]`。

## Human Approval

Skill内部不自动执行Human Gate。所有WARN必须已由T15对当前`artifact_revision`确认；BLOCK不能通过用户确认绕过。取消required PDF要求必须由Human产生新`brief_revision`，本Skill不得代改Brief。

## Example Input

```yaml
current SVG: "[待确认：当前SVG]"
current-artifact Preflight结果: "[待确认：checked_artifact_revision匹配且无BLOCK]"
WARN确认记录: "[待确认：当前artifact_revision全部确认或为空]"
output requirements: "[待确认：含requirement_level]"
```

## Example Output

```yaml
artifact_exports:
  svg:
    status: ready
    content: "[待确认：与已检查SVG一致]"
    artifact_revision: "[待确认：当前artifact_revision]"
  pdf:
    status: unsupported
partial_export:
  allowed: true
  formats: [svg]
检查摘要: "[待确认：结果、确认事项与未覆盖风险]"
handoff_completion: incomplete
completion_gate: blocked
```

## Positive Test

Given当前SVG与Preflight revision一致且无BLOCK、无未确认WARN，When导出，Then生成内容一致的本地`verified_design.svg`和摘要，不发送到Studio。

## Negative Test

Given仍存在未确认WARN，When调用本Skill，Then不得生成Verified Artifact，应返回门禁失败信息并进入T15；正式failure code为`[待确认]`。

## Non-goals

- 当前不生成Verified PDF；但不得删除或降级Brief中的PDF要求。
- 不执行Preflight或问题路由。
- 不上传、导入或发送到xTool Studio。
- 不让Studio读取Brief、Checker JSON或项目记录。
- 不创建`studio.handoff`隐式能力。
- 不控制设备或保证加工成功。
- 不调用AImake或任何模型API。
