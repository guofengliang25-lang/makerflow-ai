# MakerFlow SVG Checker Policy

> 阶段：W2 产品定义  
> 能力定位：MakerFlow 内部确定性 Tool 的政策定义，尚未实现  
> 核心边界：文件检查不等于软件兼容、加工准备完成或加工安全认证

## 1. 目标

Checker 将每个发现表达为“问题是什么、严重程度如何、应在哪个阶段解决、谁负责、是否影响导入或加工”，而不是使用一个模糊的通过/失败状态。

## 2. 两条分类轴

### 2.1 `severity`

| 值 | 含义 |
|---|---|
| `block` | 阻止当前阶段继续，或缺少继续所需的可靠证据 |
| `warn` | 可以继续到下一阶段，但需要用户理解风险、确认或在指定阶段处理 |
| `info` | 说明观察结果、边界或非阻断性建议 |

`severity` 描述影响强度，不表示问题发生在哪个工具中。

### 2.2 `resolution_stage`

| 值 | 含义 |
|---|---|
| `before_import` | 在尝试进入 xTool Studio 前处理 |
| `in_design_tool` | 返回 Illustrator、Inkscape 或其他设计工具修复后再导入 |
| `in_studio` | 文件进入 xTool Studio 后完成 `[待实际验证]` |
| `before_processing` | 加工命令前由用户在实际软件、材料和设备环境中确认 `[待实际验证]` |
| `out_of_scope` | Checker 无法验证，只能说明责任边界和下一步 |

`resolution_stage` 描述处理位置，不等同于严重程度。

## 3. 两个宏观阶段

### A. Pre-import Gate

包含 `before_import` 和 `in_design_tool`。

- 未解决的 `block` 不得进入 Verified 状态；
- `warn` 可以在用户明确确认且政策允许时继续，但确认必须记录；
- 复检必须针对修复后的新文件版本；
- 只有 Gate 通过或允许的风险已确认，文件才能标记为 Verified SVG/PDF。

### B. Studio Setup Checklist

包含 `in_studio` 和 `before_processing`。

- 这些事项不反向证明文件层检查失败；
- 文件可能可以导入，但在加工前仍有必须完成的设置或人工确认；
- `must_resolve_before_processing=true` 的事项在加工前不得跳过；
- Studio 具体界面、导入表现和设置顺序均 `[待实际验证]`。

`out_of_scope` 不属于任何自动通过条件。它用于提醒用户另行验证。

## 4. Issue 字段

每个问题必须包含：

| 字段 | 说明 |
|---|---|
| `issue_id` | 当前报告内稳定且唯一的问题标识 |
| `title` | 简短问题名称 |
| `severity` | `block`、`warn` 或 `info` |
| `resolution_stage` | 五个处理阶段之一 |
| `owner` | 负责执行下一步的角色，如 `user`、`designer`、`studio_operator` |
| `can_import_to_studio` | 从当前文件状态看，是否允许进入 Studio 导入验证 |
| `must_resolve_before_processing` | 是否必须在加工前解决或确认 |
| `evidence` | Checker 观察到的对象、值、规则依据及验证状态 |
| `message` | 面向用户的解释，不夸大已验证范围 |
| `next_steps` | 至少一个可执行的后续动作 |

## 5. 判定矩阵

| 情况 | `can_import_to_studio` | `must_resolve_before_processing` |
|---|---:|---:|
| Pre-import `block` 未解决 | `false` | `true` |
| Pre-import `warn` 可接受且已记录确认 | `true` | 由问题性质决定 |
| Studio 内设置事项 | `true` | 通常为 `true` |
| 加工前人工确认事项 | `true` | `true` |
| 纯信息项 | 通常为 `true` | 通常为 `false` |
| `out_of_scope` 安全或兼容问题 | 不由该问题单独决定 | 涉及加工时为 `true` |

## 6. Verified SVG/PDF 定义

Verified 仅表示：

1. 文件可以被当前 Checker 读取；
2. 已定义的 Pre-import 规则已执行；
3. 未解决的 Pre-import `block` 为零；
4. 可继续的 `warn` 已按政策记录用户确认；
5. 报告列出未覆盖范围和 Studio Setup Checklist。

Verified 不表示：

- xTool Studio 一定成功导入；
- Studio 中尺寸、对象或加工类型一定正确；
- 材料与设备兼容；
- 功率、速度、次数或安全参数正确；
- Preview/Framing 已通过；
- 实际加工安全或成功。

## 7. 证据规则

- `evidence` 只记录可观察值和规则依据；
- 来自 Brief 的目标尺寸必须引用已确认版本；
- 来自官方文档但未经实际操作的结论标记 `[待实际验证]`；
- 来自 Mock 的内容必须标记 `source: mock`；
- 不得把缺少证据写成“已兼容”或“已安全”。

## 8. 交接规则

- Studio 的主要输入只有 Verified SVG/PDF；
- Creative Brief、Checker 报告、Constraint Recommendations 和决策记录属于用户项目记录；
- Studio Setup Checklist 供用户进入 Studio 后人工执行；
- 不声称 xTool Studio 自动读取 Brief、Checker JSON 或完整交接包。

## 9. Out of Scope

- 视觉设计质量；
- 产品文案与品牌事实；
- 最终印刷色彩；
- 材料真实性、质量或设备兼容；
- 机器功率、速度、次数和安全参数；
- Studio、设备固件或机器控制；
- Preview/Framing 的实际结果；
- 工业级、量产级或安全认证。

