# V3-W2-D02｜xTool 生态能力边界拆解 v0.1

> 阶段：W2 产品定义  
> 文档性质：能力边界假设，不是 xTool 产品验收报告  
> 标记规则：未通过实际软件、账号或设备操作确认的能力统一标记 `[待实际验证]`

## 1. 拆解目的

明确 MakerFlow、AImake、xTool Studio 与设备端分别承担什么，防止重复建设、能力夸大和错误的自动化假设。

## 2. 责任边界

| 层级 | 当前可描述的责任 | MakerFlow 不应声称 |
|---|---|---|
| AImake | 面向制作场景的 AI 创作与主动建议能力 `[待实际验证]` | 不声称已完整验证其输入、编辑、导出和失败恢复能力 |
| MakerFlow | 缺失信息识别、Ask-vs-Act、Editable Creative Brief、辅助建议、候选文件准备、Pre-import SVG Checker 和项目记录 | 不替代专业设计工具，不自动决定机器安全参数，不直接控制设备 |
| xTool Studio | 接收设计文件并进行软件内设置、预览和设备交接 `[待实际验证]` | 不声称能自动读取 Creative Brief、Checker JSON、建议记录或完整交接包 |
| 设备与操作人员 | 材料放置、机器参数确认、Preview/Framing 复核、加工和安全责任 `[待实际验证]` | 不把软件导入成功写成设备加工成功或安全证明 |

## 3. MakerFlow 应保留的能力

### 3.1 核心能力

- 识别模糊输入中的缺失信息；
- 根据风险、可逆性和信息影响执行 Ask-vs-Act；
- 形成用户可编辑和确认的 Creative Brief；
- 保存候选设计、人工修改和决策记录；
- 在导入制作软件前执行确定性文件检查；
- 清楚说明哪些问题必须在 Studio 内或加工前由人处理。

### 3.2 辅助能力

- Constraint Recommendations：根据已确认约束提供候选形式、尺寸、材料、颜色、版式与可读性、制作路径和输出格式建议。

该能力不得作为 MakerFlow 核心差异，也不得输出或决定机器功率、速度、次数和安全参数。

## 4. MakerFlow 不做的能力

- 不复刻 AImake 的通用视觉生成或工艺 Agent 定位；
- 不承担 Illustrator、Inkscape 等专业矢量编辑器的完整编辑能力；
- 不替代 xTool Studio 的对象设置、Preview/Framing、机器连接和加工流程；
- 不保证文件适配全部设备、材料或生产环境；
- 不生成未经验证的“推荐加工参数”；
- 不声称 Studio 会自动读取 Brief、Checker JSON 或项目交接记录；
- 不把 Checker 结论描述为加工安全认证。

## 5. 数据与交接边界

| 产物 | 角色 | 是否作为 Studio 主要输入 |
|---|---|---|
| Editable Creative Brief | 用户项目记录与设计依据 | 否 |
| Constraint Recommendations | 用户决策辅助记录 | 否 |
| Checker 报告 | 文件问题、证据和下一步记录 | 否 |
| 决策与确认记录 | 记录接受、拒绝和人工确认 | 否 |
| Verified SVG/PDF | 通过 Pre-import Gate 后的设计文件 | 是 |
| Studio Setup Checklist | Studio 内和加工前的人工操作清单 | 否；由用户查看并执行 |

## 6. Checker 边界

Checker 使用两条分类轴：

- `severity`：`block`、`warn`、`info`；
- `resolution_stage`：`before_import`、`in_design_tool`、`in_studio`、`before_processing`、`out_of_scope`。

宏观上分为：

- Pre-import Gate：在文件进入 Studio 前解决或确认；
- Studio Setup Checklist：进入 Studio 后处理，但加工前完成。

Checker 只报告可观察事实、规则依据和下一步。材料兼容、机器参数、Preview/Framing 结果、操作环境和加工安全属于人工与设备侧责任，其中具体 xTool 行为均 `[待实际验证]`。

## 7. 当前产品边界结论

MakerFlow 不通过“接管 xTool 生态”形成差异，而通过更清楚的前置约束、可编辑记录、两阶段检查和人工确认点降低跨工具返工。系统边界停在 Verified SVG/PDF 与 Studio Setup Checklist；加工决定仍由用户在实际软件、材料和设备环境中完成。
