# `design_spec.build` Skill Contract

> Status: Review Priority Draft  
> Skill ID: `design_spec.build`  
> Called by: T07 Build Design Spec  
> Current implementation: `local_rule`  
> 本Contract只固化当前文档已经明确的职责和I/O；未知内容统一标记为`[待确认]`。当前未接入DeepSeek、OpenAI或其他模型API。

## Purpose

首次把版本一致的confirmed Brief与accepted Plan映射为MakerFlow内部`design_spec`，并通过Design Spec Schema和硬约束校验，为确定性SVG渲染提供单一事实来源。

## Owner

- Owner type: `Model + Rule`
- Implementation type: `composite`
- Current implementation: `local_rule`
- Target implementation: `future_model`
- Owning node: T07

未来模型只可参与语义映射。Schema、硬约束、版本一致性和合法性结论必须由Rule控制，不能被LLM或Provider改写。

## Input Schema

输入名称必须保持为confirmed Brief + `brief_revision` + accepted Plan。

```yaml
confirmed_brief:
  data: unknown
  brief_revision: unknown
  confirmation_record: unknown
accepted_plan:
  data: unknown
  brief_revision: unknown
  acceptance_record: unknown
```

Node I/O Matrix使用自然语言名称“confirmed Brief + accepted Plan”。上方snake_case仅用于展示两个输入对象，不代表正式字段命名。Brief、Plan、确认记录和版本引用的完整Schema均为`[待确认]`。

本Skill还依赖Design Spec Schema、布局模板和资源映射规则；它们的输入封装方式与版本字段为`[待确认]`。

## Output Schema

输出名称必须为`design_spec`。

```yaml
design_spec:
  schema_version: unknown
  design_spec_revision: unknown
  artboard: unknown
  layout: unknown
  content_blocks: unknown
  visual_elements: unknown
  referenced_resources: unknown
```

已确认Design Spec是内部数据模型和SVG Renderer的输入，但完整Schema、字段必填性、单位规则、元素结构、资源引用格式与`design_spec_revision`格式均为`[待确认]`。

## Preconditions

1. confirmed Brief存在。
2. accepted Plan存在。
3. confirmed Brief与accepted Plan版本一致。
4. Design Spec Schema可用。
5. 布局模板可用。
6. 资源映射规则可用。

确认记录的有效性判断方式、Schema版本选择规则及模板版本锁定方式为`[待确认]`。

## Postconditions

成功后必须满足：

1. 返回`design_spec`，而不是Brief与Plan的拼接对象。
2. `design_spec`通过Schema和硬约束校验。
3. 创建初始`design_spec_revision`。
4. 输出可作为T08 `svg.render`的输入。
5. confirmed Brief没有被修改。
6. accepted Plan没有被自动升级为confirmed Brief事实。
7. 不支持或冲突的映射没有被静默接受。

初始revision的编号规则和校验记录格式为`[待确认]`。

## Determinism

`conditional`。

- 当前`local_rule`实现应对相同输入、Schema、模板和资源映射规则产生可复现结果。
- 未来若模型参与语义映射，语义候选可能非确定；但最终`design_spec`必须经过确定性Schema与硬约束校验。
- Provider变化不得改变输入输出Contract、Design Spec Schema或硬规则。

未来模型输出如何固定、比较和审计为`[待确认]`。

## Side Effects

- 创建初始`design_spec_revision`。
- 写入Design Spec校验结果；具体记录结构为`[待确认]`。
- 不修改confirmed Brief。
- 不修改accepted Plan。
- 不生成SVG；SVG由T08负责。

Design Spec保存位置和失败草稿是否保留为`[待确认]`。

## Failure Codes

现有文档未定义正式错误码：

| Failure condition | Failure code | Meaning |
|---|---|---|
| confirmed Brief或accepted Plan不存在 | `[待确认]` | 缺少建立Design Spec所需输入 |
| Brief与Plan版本不一致 | `[待确认]` | Plan引用的不是当前confirmed Brief |
| Schema校验失败 | `[待确认]` | 生成结果不符合Design Spec Schema |
| 布局不受支持 | `[待确认]` | accepted Plan引用的布局无法映射 |
| 关键约束映射冲突 | `[待确认]` | Brief、Plan或硬规则之间存在不可静默解决的冲突 |
| 模板或资源映射规则不可用 | `[待确认]` | 建立Design Spec所需确定性依赖缺失 |

失败响应Schema、字段路径、证据和是否可重试标志均为`[待确认]`。

## Retry Policy

1. 输入缺失、版本不一致或依赖不可用时，不在原输入上盲目重试。
2. Plan与Brief冲突或Plan引用过期Brief时，返回T06重新生成或重新确认Plan。
3. Schema或硬约束失败时，先定位映射、模板或规则问题；修正后重新执行T07。
4. Rule结论不得通过模型重试被覆盖。

自动重试次数、Provider级重试和超时策略为`[待确认]`。

## Human Approval

Skill内部不执行新的Human Approval。

运行前，Brief必须已经经过T05确认，Plan必须已经被用户接受。若发生映射冲突，Skill不得替用户确认新事实或新约束，应返回上游处理。

## Example Input

```yaml
confirmed Brief:
  data: "[待确认：已确认Brief结构]"
  version: "[待确认：Brief版本]"
  confirmation_record: "[待确认：用户确认记录]"
accepted Plan:
  data: "[待确认：已接受Plan结构]"
  brief_version_reference: "[待确认：应与confirmed Brief一致]"
  acceptance_record: "[待确认：用户接受记录]"
```

## Example Output

```yaml
design_spec:
  schema_version: "[待确认]"
  design_spec_revision: "[待确认：初始design_spec_revision格式]"
  artboard: "[待确认：成品尺寸到内部artboard的结构]"
  layout: "[待确认：有效布局结构]"
  content_blocks: "[待确认：内容块结构]"
  visual_elements: "[待确认：视觉元素结构]"
  referenced_resources: "[待确认：模板与资源引用结构]"
```

## Positive Test

**场景：版本一致的已确认输入建立有效Design Spec。**

Given：confirmed Brief与accepted Plan均存在、版本一致，且Schema、布局模板和资源映射规则可用。

When：调用`design_spec.build`。

Then：

- 返回通过Schema与硬约束校验的`design_spec`；
- 创建初始`design_spec_revision`；
- 输出可进入T08；
- 不修改confirmed Brief或accepted Plan；
- 相同硬规则不会被模型输出覆盖。

## Negative Test

**场景：accepted Plan引用过期Brief。**

Given：accepted Plan的Brief版本引用与当前confirmed Brief不一致。

When：调用`design_spec.build`。

Then：

- 不返回可进入T08的有效`design_spec`；
- 返回版本不一致失败信息，正式failure code为`[待确认]`；
- 不自动修改Brief或Plan以消除冲突；
- 路径返回T06或对应人工决策步骤处理。

## Non-goals

`design_spec.build`不负责：

- 提取或确认Creative Brief；
- 生成Creative Plan；
- 把未接受Recommendation写入Design Spec；
- 修改confirmed Brief迎合Plan；
- 在每次T09编辑后重新调用模型生成设计；
- 渲染SVG；
- 执行Preflight或问题路由；
- 生成PNG/JPG中间作品；
- 决定设备、材料加工参数或安全参数；
- 调用AImake或xTool Studio；
- 允许LLM覆盖Schema和硬规则。
