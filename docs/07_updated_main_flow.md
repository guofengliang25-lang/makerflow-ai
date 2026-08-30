# MakerFlow Updated Main Flow

> 阶段：W2 产品定义  
> 当前状态：流程和责任边界定义，不代表应用已开发或 xTool Studio 已实测

## 1. 主流程

```text
模糊输入
→ 缺失信息识别
→ Ask-vs-Act
→ Editable Creative Brief
→ Constraint Recommendations
→ 用户确认
→ 候选设计文件
→ Pre-import SVG Checker
→ 修复/复检循环
→ Verified SVG/PDF
→ 导入 xTool Studio
→ Studio Setup Checklist
→ Preview/Framing
→ 人工确认
→ 加工
```

### 统一术语

- `Editable Creative Brief`：用户可编辑并最终确认的需求基线；正文简称 `Brief` 时均指该对象；
- `Constraint Recommendations`：Brief 确认后的辅助建议层；
- `Pre-import SVG Checker`：主流程中的检查动作；其宏观政策门槛称为 `Pre-import Gate`；
- `Studio Setup Checklist`：进入 xTool Studio 后、加工前由用户执行的清单；
- `Verified SVG/PDF`：通过已定义 Pre-import Gate 的文件，不代表实际加工安全；
- `xTool Studio`：产品全称；表格或上下文明确时可简称 `Studio`。

## 2. 阶段定义

| 阶段 | 系统或用户动作 | 主要产物 | 责任边界 |
|---|---|---|---|
| 模糊输入 | 用户描述目标、对象和已有资料 | 原始输入记录 | 不假设缺失约束已经确认 |
| 缺失信息识别 | 系统区分已知、未知和冲突信息 | 缺失字段清单 | 不替用户补写关键事实 |
| Ask-vs-Act | 根据影响、风险和可逆性决定追问或继续 | 决策及理由 | 高风险、不可逆或结构性缺失必须 Ask |
| Editable Creative Brief | 将用户信息整理为可编辑需求基线 | Brief 草案与版本 | 未确认项保持可见 |
| Constraint Recommendations | 基于已确认约束提供七类候选建议 | 建议列表 | 辅助层，不是核心差异；不决定机器参数 |
| 用户确认 | 用户接受、拒绝或编辑建议 | 确认与决策记录 | 未确认建议不得升级为事实 |
| 候选设计文件 | 根据确认后的需求准备 SVG/PDF 候选文件 | 候选 SVG/PDF | 候选文件尚未 Verified |
| Pre-import SVG Checker | 检查文件结构、尺寸、文字、位图、路径等已定义规则 | Checker issues | 不验证 Studio、材料和加工安全 |
| 修复/复检循环 | 用户或设计者修复文件并提交新版本 | 新文件版本和复检记录 | 修复后必须重新执行 Gate |
| Verified SVG/PDF | Pre-import `block` 清零，允许风险已确认 | Verified SVG/PDF | 仅表示通过已定义的文件层 Gate |
| 导入 xTool Studio | 用户导入 Verified SVG/PDF `[待实际验证]` | Studio 项目状态 `[待实际验证]` | Studio 主要输入只有 Verified SVG/PDF |
| Studio Setup Checklist | 用户核对尺寸、对象和必要设置 `[待实际验证]` | 人工清单记录 | Brief 和 Checker JSON 不由 Studio 自动读取 |
| Preview/Framing | 用户执行软件或设备预览 `[待实际验证]` | 预览/定位记录 | 结果依赖实际软件、材料和设备 |
| 人工确认 | 操作人员确认材料、设置、环境和安全条件 | 加工前确认记录 | 功率、速度、次数和安全参数必须人工确认 |
| 加工 | 用户在实际设备环境中执行 `[待实际验证]` | 实际加工结果 | 不由文件层 Verified 状态保证 |

## 3. 三类交付物

### 3.1 Studio 主要输入

- Verified SVG；
- Verified PDF（是否适用于具体任务及实际导入行为 `[待实际验证]`）。

### 3.2 用户项目记录

- 原始输入；
- Ask-vs-Act 决策；
- Editable Creative Brief；
- Constraint Recommendations；
- 建议接受、拒绝和编辑记录；
- Checker 报告与复检历史；
- Studio Setup Checklist；
- Preview/Framing 与加工前确认记录。

这些记录用于追溯，不声称 xTool Studio 会读取或执行它们。

### 3.3 实际加工证据

- 实际软件版本和导入截图；
- 实际设备、材料和操作环境；
- Preview/Framing 结果；
- 人工确认记录；
- 加工结果与异常记录。

没有这些证据时，不得标记为真实软件或设备验证完成。

## 4. 修复/复检循环

1. Checker 返回带有 `severity` 和 `resolution_stage` 的 issue；
2. `owner` 执行 `next_steps`；
3. 修改后的文件保存为新版本，不覆盖证据记录；
4. 对新版本重新执行 Pre-import Gate；
5. 未解决的 `block` 继续阻止 Verified；
6. 允许继续的 `warn` 必须保存用户确认；
7. 生成 Verified SVG/PDF 时附带未覆盖范围和 Studio Setup Checklist。

## 5. 核心边界变化

- 在 Creative Brief 与候选设计之间新增 Constraint Recommendations，但明确其为辅助层；
- Checker 从单一报告改为 Pre-import Gate 和 Studio Setup Checklist；
- `severity` 与 `resolution_stage` 分离；
- Studio 的主要输入收敛为 Verified SVG/PDF；
- Brief、报告和决策记录归为用户项目记录；
- Studio 内设置、Preview/Framing、机器参数和加工安全由人工在实际环境中确认；
- 不声称任何交接包、Brief 或 JSON 会被 Studio 自动读取。
