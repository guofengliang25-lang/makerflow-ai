# `brief.extract` Skill Contract

> Status: Review Priority Draft  
> Skill ID: `brief.extract`  
> Called by: T02 Extract Brief  
> Current implementation: `mock`  
> 本Contract只固化当前文档已经明确的职责和I/O；未知内容统一标记为`[待确认]`。当前未接入DeepSeek、OpenAI或其他模型API。

## Purpose

把T01产生的`task_input`提取为结构化`brief_candidate`，保留事实、参考、附件和补充回答的来源差异，并避免把假设写成已确认事实。

## Owner

- Owner type: `Model`
- Implementation type: `model`
- Current implementation: `mock`
- Target implementation: `future_model`
- Owning node: T02

模型供应商变化不得改变本Contract的输入名、输出名、职责边界或下游验证门。

## Input Schema

输入名称必须为`task_input`。

```yaml
task_input:
  mode: initial | clarification
  user_text: unknown
  reference_attachments: unknown
  existing_files: unknown
  clarification_answers: unknown
  source_metadata: unknown
```

T01明确支持initial与clarification两种模式。字段正式名称、类型、附件引用结构、回答与T04问题的关联方式及必填规则均为`[待确认]`。

## Output Schema

输出名称必须为`brief_candidate`。

```yaml
brief_candidate:
  fields: unknown
  field_sources: unknown
  missing_candidates: unknown
  conflict_candidates: unknown
  assumptions: unknown
  brief_revision: unknown
```

以上仅表达Agent Task Graph已确认的内容类别。Brief字段全集、状态枚举的存储结构、来源证据格式和`brief_revision`格式均为`[待确认]`。

## Preconditions

1. `task_input`存在且可读取。
2. 项目输入模式已由T01标识为initial或clarification。
3. clarification模式下，补充回答能够关联到对应追问；关联数据结构为`[待确认]`。

## Postconditions

成功后必须满足：

1. 返回`brief_candidate`。
2. 输出符合当前Brief草稿结构；完整Schema为`[待确认]`。
3. 用户明确提供的事实、参考信息、附件与补充回答来源可区分。
4. 推断和假设没有被标记为confirmed事实。
5. 已确认字段没有被静默覆盖。
6. 输出进入T03 `brief.validate`，而不是直接成为confirmed Brief。

## Determinism

`false`。

该Skill承担自然语言理解与语义提取。不同模型实现或同一模型的不同运行可能产生不同候选表达，但都必须满足相同I/O Contract和事实边界。

当前`mock`的具体返回是否字节级稳定为`[待确认]`。未来Provider变化不得改变`task_input → brief_candidate`契约。

## Side Effects

- 更新Brief草稿。
- 不确认任何Brief字段。
- 不修改confirmed Brief。
- 不修改原始`task_input`。

草稿保存位置、审计记录格式和版本写入机制为`[待确认]`。

## Failure Codes

现有文档只明确失败条件，未定义正式错误码：

| Failure condition | Failure code | Meaning |
|---|---|---|
| `task_input`不存在或不可读 | `[待确认]` | 无法执行Brief提取 |
| 提取遗漏 | `[待确认]` | 输入中的必要信息未进入候选Brief |
| 虚构事实 | `[待确认]` | 输出包含输入无法支持的产品事实 |
| 结构化输出无效 | `[待确认]` | `brief_candidate`不符合可校验结构 |
| 覆盖已确认字段 | `[待确认]` | 输出试图改写未获新证据支持的confirmed字段 |

失败响应Schema、字段路径和证据格式为`[待确认]`。

## Retry Policy

1. `task_input`缺失或不可读时，不重试；返回T01补充或修正输入。
2. T03发现结构错误、遗漏或冲突时，可在输入或提取条件修正后重新调用T02。
3. clarification回答写回T01后，重新执行提取并再次进入T03。
4. 不得通过重试把模型推断升级为事实，也不得覆盖confirmed字段。

自动重试次数、超时、退避策略和Provider级重试规则均为`[待确认]`。

## Human Approval

Skill内部不执行Human Approval。

`brief_candidate`必须经过T03确定性验证，最终由T05用户显式确认。Human Gate属于下游Task，不由模型自动完成。

## Example Input

以下只展示已确认的输入模式；正式字段结构尚未确定：

```yaml
task_input:
  mode: initial
  user_text: "[待确认：用户原始任务文本]"
  reference_attachments: "[待确认：附件引用结构]"
  existing_files: "[待确认：已有文件引用结构]"
  clarification_answers: null
  source_metadata: "[待确认：来源记录结构]"
```

## Example Output

```yaml
brief_candidate:
  fields: "[待确认：Brief候选字段结构]"
  field_sources: "[待确认：字段来源结构]"
  missing_candidates: "[待确认：缺失候选结构]"
  conflict_candidates: "[待确认：冲突候选结构]"
  assumptions: "[待确认：假设结构]"
  version: "[待确认：版本格式]"
```

该输出不是confirmed Brief。

## Positive Test

**场景：输入包含事实、参考与缺失信息。**

Given：T01产生可读取的initial模式`task_input`，其中事实、参考附件和用户文本来源可区分。

When：调用`brief.extract`。

Then：

- 返回`brief_candidate`；
- 可追溯区分输入来源；
- 未明确的信息保持为缺失候选或假设，而非confirmed事实；
- 输出进入T03验证；
- 不修改原始输入或confirmed Brief。

## Negative Test

**场景：模型尝试把参考信息写成产品事实。**

Given：`task_input`中某信息仅被标记为参考，未被用户确认。

When：提取结果把该信息标记为已确认产品事实。

Then：

- 本次提取不满足Contract；
- 不得把该结果提交为confirmed Brief；
- 返回对应失败信息，正式failure code为`[待确认]`；
- 由T03或人工审查暴露问题后重新提取或返回T01补充事实。

## Non-goals

`brief.extract`不负责：

- 确认Creative Brief；
- 代替T03执行Brief硬规则校验；
- 代替T04生成追问；
- 生成Creative Plan或Recommendation；
- 建立Design Spec；
- 生成、编辑或检查SVG；
- 虚构产品事实或把参考信息升级为事实；
- 调用AImake或xTool Studio；
- 决定设备、材料或加工参数。
