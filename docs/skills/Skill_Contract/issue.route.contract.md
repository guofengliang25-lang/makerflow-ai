# `issue.route` Skill Contract

> Status: Review Priority Draft  
> Skill ID: `issue.route`  
> Called by: T13 Route Issues  
> Current implementation: `local_rule`  
> 本Contract只固化当前文档已经明确的职责和I/O；未知内容统一标记为`[待确认]`。本Skill不使用模型自由判断路由。

## Purpose

在T10、T11和T12结果收齐且版本有效后，按既定severity、resolution_stage、owner、`artifact_revision`与WARN确认政策生成确定性问题路由，区分Pre-import状态和Studio Readiness状态。

## Owner

- Owner type: `Rule`
- Implementation type: `rule`
- Current implementation: `local_rule`
- Target implementation: `local_rule`
- Owning node: T13

路由硬规则不允许LLM或模型供应商改写。

## Input Schema

输入名称必须保持为：T10、T11、T12结果 + 当前`artifact_revision` + WARN确认记录。

```yaml
svg_file_issues: unknown          # T10结果
consistency_issues: unknown       # T11结果
studio_checklist: unknown         # T12结果
artifact_revision: unknown
warn_confirmation_records: unknown
project_state_version: unknown
```

以上键名是对现有输入名称的结构化表达，正式聚合对象Schema、issue字段类型、`artifact_revision`格式、项目状态版本格式及WARN确认记录结构均为`[待确认]`。

## Output Schema

输出名称必须为：`routed_issues[]` + `pre_import_status` + `studio_readiness_status`。

```yaml
routed_issues[]:
  - issue: unknown
    route: unknown
    next_step: unknown
pre_import_status: unknown
studio_readiness_status: unknown
```

`routed_issues[]`中issue字段沿用现有Checker政策；正式聚合Schema、状态枚举的序列化方式和Next Step结构为`[待确认]`。

## Preconditions

1. T10 `svg_file_issues[]`已产生。
2. T11 `consistency_issues[]`已产生。
3. T12 `studio_checklist[]`已产生。
4. 三类结果已收齐。
5. T10、T11结果的`checked_artifact_revision`与当前`artifact_revision`一致。
6. T12结果与当前项目状态版本一致。
7. WARN确认记录可读取；无记录时的空值表达为`[待确认]`。

## Postconditions

成功后必须满足：

1. 返回`routed_issues[]`、`pre_import_status`和`studio_readiness_status`。
2. BLOCK、WARN、PASS路由符合当前政策。
3. 任一导入前BLOCK存在时，不产生直接进入T16的路由。
4. 任一允许继续的WARN在进入T16前必须经过T15 Human Confirm。
5. PASS且无未确认WARN时，才可路由到T16。
6. Studio待办不会被误判为阻塞SVG导出的Pre-import BLOCK。
7. 路由过程不修改SVG、Brief、Design Spec或`project_state`。
8. 路由过程不自动修复文件。

## Determinism

`true`。

相同检查结果、相同`artifact_revision`、相同项目状态版本、相同WARN确认记录和相同路由规则版本必须产生相同输出。

规则版本标识、排序稳定性和冲突消解优先级的正式定义为`[待确认]`。无论模型供应商如何变化，LLM都不能改写路由硬规则。

## Side Effects

- 更新路由状态。
- 记录Pre-import状态和Studio Readiness状态。
- 不修改检查事实。
- 不修改或修复SVG、Brief、Design Spec及`project_state`。
- 不代替用户写入WARN确认。

路由记录保存位置、审计字段和状态写入接口为`[待确认]`。

## Failure Codes

现有文档未定义正式错误码：

| Failure condition | Failure code | Meaning |
|---|---|---|
| T10、T11或T12结果缺失 | `[待确认]` | 路由输入未收齐 |
| 结果与当前revision或项目状态版本不一致 | `[待确认]` | 检查结果已过期或无法关联 |
| 未知severity或resolution_stage | `[待确认]` | 当前规则无法识别issue分类 |
| 路由规则冲突 | `[待确认]` | 同一问题产生互斥Next Step |
| BLOCK或WARN需要后续处理 | `[待确认]` | 不是执行异常，但当前状态不能直接进入Export |

最后一项是否应作为状态而非failure、以及失败响应Schema均为`[待确认]`。

## Retry Policy

1. 检查结果未收齐时，等待或重新运行缺失的T10、T11或T12，不在不完整输入上重试路由。
2. `checked_artifact_revision`与当前`artifact_revision`不一致或项目状态版本不一致时，丢弃过期结果，并对当前版本重新执行对应检查。
3. 未知分类或规则冲突时，停止路由并检查规则定义；不得让LLM临时决定。
4. WARN经T15确认或作品修改产生新`artifact_revision`后，使用最新有效记录重新运行路由。

自动重试次数和路由规则加载失败的恢复机制为`[待确认]`。

## Human Approval

Skill内部不执行Human Approval。

- WARN必须路由到T15，由用户决定接受风险或返回修改。
- BLOCK不能由用户在本Skill内部点击确认后直接绕过。
- Human Gate的结果作为后续输入记录存在，不由Rule自动生成。

## Example Input

```yaml
svg_file_issues: "[待确认：T10输出结构]"
consistency_issues: "[待确认：T11输出结构]"
studio_checklist: "[待确认：T12输出结构]"
artifact_revision: "[待确认：当前artifact_revision]"
warn_confirmation_records: "[待确认：当前artifact_revision的确认记录或空值]"
project_state_version: "[待确认：项目状态版本]"
```

## Example Output

```yaml
routed_issues[]: "[待确认：带责任方、解决位置和Next Step的路由结果]"
pre_import_status: "[待确认：BLOCK/WARN/PASS的正式序列化值]"
studio_readiness_status: "[待确认：Studio待办状态结构]"
```

## Positive Test

**场景：存在导入前BLOCK。**

Given：T10、T11、T12结果已收齐且版本有效，其中至少一个问题被确定为导入前BLOCK。

When：调用`issue.route`。

Then：

- 返回完整路由输出；
- `pre_import_status`反映BLOCK；
- Next Step返回T09编辑或外部工具修改路径；
- 不产生直接到T16的路由；
- Studio待办保持在`studio_readiness_status`中；
- 不修改或自动修复作品。

## Negative Test

**场景：T10结果属于旧`artifact_revision`。**

Given：T10、T11、T12结果看似齐全，但T10结果的`checked_artifact_revision`与当前`artifact_revision`不一致。

When：调用`issue.route`。

Then：

- 不输出可执行的PASS或Export路由；
- 返回版本不一致失败信息，正式failure code为`[待确认]`；
- 不复用旧检查结果；
- 要求对当前`artifact_revision`重新执行对应检查。

## Non-goals

`issue.route`不负责：

- 执行T10、T11或T12检查；
- 新增聚合Skill `preflight.run`；
- 自动修复SVG或Design Spec；
- 替用户确认WARN；
- 允许BLOCK直接进入Export；
- 从SVG推断材料、设备或加工参数；
- 修改severity、resolution_stage或其他硬规则以迎合结果；
- 导出Artifact；
- 向xTool Studio发送数据；
- 控制设备或保证加工成功；
- 调用模型API、AImake或xTool Studio原生能力。
