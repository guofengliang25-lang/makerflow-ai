# `svg.render` Skill Contract

> Status: Draft  
> Skill ID: `svg.render`  
> Called by: T08 Render SVG  
> Current implementation: `local_tool`

## Canonical Interface

- Input = `design_spec`
- Output = `svg`
- Side Effects = `none`

## Purpose

把已确定且通过校验的`design_spec`稳定渲染为可解析的`svg`。Renderer只执行Design Spec已经固化的描述，不决定创意方向、布局、材料或加工参数。

## Owner

- Owner type: `Tool`
- Implementation type: `tool`
- Current implementation: `local_tool`
- Target implementation: `local_tool`
- Owning node: T08

## Input Schema

输入名称必须为`design_spec`。

```yaml
design_spec:
  design_spec_revision: unknown
  artboard:
    width: number
    height: number
    unit: unknown
  layout: unknown
  content_blocks: unknown
  visual_elements: unknown
  referenced_resources: unknown
```

完整Design Spec Schema、单位规则、布局枚举、内容块结构和资源引用格式仍为`[待确认]`。Renderer不得用自行创意补齐缺失字段。

## Output Schema

输出名称必须为`svg`。

```yaml
svg:
  media_type: image/svg+xml
  content: string
```

## Preconditions

1. `design_spec`存在并通过上游Schema与硬约束校验。
2. 画板宽高均大于0。
3. 布局、内容块和显式引用资源可用。
4. 输入来自MakerFlow native Design Spec路径；External SVG不调用本Skill。

## Postconditions

1. 返回可解析的`svg`。
2. 渲染内容只来自输入`design_spec`及其显式资源引用。
3. 输入与其他用户数据均未被修改。
4. 不写文件、不更新Project State、不生成任何版本记录。

Renderer返回后，Artifact Manager（Orchestrator / Project State Infrastructure）负责保存Artifact、建立版本血缘并处理检查状态；这些职责不属于本Skill。

## Determinism

`true`。相同的已验证`design_spec`、Renderer版本、模板、字体环境和资源版本必须产生相同的SVG结果。具体等价比较方式仍为`[待确认]`。

## Side Effects

Side Effects = `none`。

## Failure Codes

| Failure condition | Failure code | Meaning |
|---|---|---|
| 画板宽或高不大于0 | `[待确认]` | 成品尺寸不满足渲染前置条件 |
| 布局不存在 | `[待确认]` | 缺少可用布局定义或引用 |
| 内容块不合法 | `[待确认]` | 内容块未通过既定规则 |
| 显式资源不可用 | `[待确认]` | Design Spec引用的资源无法读取 |
| Renderer异常 | `[待确认]` | 本地Renderer未完成渲染 |

失败响应的统一结构为`[待确认]`。

## Retry Policy

输入未变化时不得盲目重试。调用方应先修正导致失败的Design Spec字段或资源引用，并在重新通过校验后重试。瞬时Renderer异常的最大重试次数与退避策略为`[待确认]`。

## Human Approval

不需要Human Approval。本Skill只执行已确认设计状态的确定性渲染，不拥有创意或约束确认权。

## Example Input

```json
{
  "design_spec": {
    "design_spec_revision": "dsr-001",
    "artboard": {"width": 148, "height": 105, "unit": "mm"},
    "layout": "instruction-card",
    "content_blocks": [],
    "visual_elements": [],
    "referenced_resources": []
  }
}
```

## Example Output

```yaml
svg:
  media_type: image/svg+xml
  content: "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 148 105\"></svg>"
```

## Positive Test

Given同一份已验证`design_spec`及同一运行环境，When调用两次`svg.render`，Then两次均返回相同且可解析的`svg`，输入保持不变，且没有任何外部状态写入。

## Negative Test

Given画板宽度不大于0，When调用`svg.render`，Then不返回成功SVG，不修改输入或外部状态，也不自行选择尺寸绕过失败。

## Non-goals

`svg.render`绝对不负责：

- External SVG导入或逆向恢复Design Spec；
- 保存、发布或导出Artifact；
- 决定布局、创意方向或未确认内容；
- 修改Brief、Plan或`design_spec`；
- 执行Preflight或问题路由；
- 推断材料、设备、功率、速度、次数或安全参数；
- 调用AImake、xTool Studio或任何真实Provider；
- 控制设备或保证加工安全。
