# MakerFlow MVP Scope v0.2

> 阶段：W2产品定义  
> 产品性质：个人作品集Demo，不是xTool内部项目  
> 当前状态：研究驱动的范围定义，尚未开发或验证产品效果

## 1. v0.2范围变化

`[研究者推断]` 根据P01、P02、P03，本版完成以下调整：

1. 将原先单一文件检查总名称统一为 **MakerFlow Preflight**；
2. 将Preflight拆为 **SVG File Check**、**Brief Consistency Check**、**Studio Readiness Checklist**；
3. 将文件层问题与Studio设置、材料、设备和加工安全分离；
4. 将Constraint Recommendations调整为P1辅助模块；
5. 不纳入3D模型检查、完整设计编辑和设备控制；
6. 将“减少返工”保留为下一轮验证目标，不作为已实现结果。

## 2. 目标用户

> 有基础设计能力，但缺少完整制作交接经验的设计学生或初级Maker。

当前证据来自三名邻近样本，尚未覆盖xTool Studio专项用户。

## 3. 单一场景

> 将“MomoRay模块化枕头包装内高度调节说明卡”的零散需求，整理为用户确认的Creative Brief和候选设计文件；对候选SVG/PDF执行MakerFlow Preflight，再由用户进入xTool Studio完成后续人工设置与确认 `[待实际验证]`。

该场景用于验证产品流程，不代表MakerFlow已用于MomoRay实际销售包装。

## 4. MVP主流程

```text
模糊输入与产品事实
→ 缺失信息识别
→ Ask-vs-Act
→ Editable Creative Brief
→ 人工确认
→ 候选SVG/PDF
→ MakerFlow Preflight
   ├─ SVG File Check
   ├─ Brief Consistency Check
   └─ Studio Readiness Checklist
→ BLOCK：返回设计工具修复并复检
→ WARN：用户理解风险后确认是否继续
→ 通过当前导入前规则的SVG/PDF
→ 用户导入xTool Studio `[待实际验证]`
→ 完成Studio Readiness Checklist `[待实际验证]`
→ Preview/Framing与加工前人工确认 `[待实际验证]`
→ 加工
```

通过当前导入前规则只表示文件满足已定义检查条件，不代表生产就绪、材料兼容或加工安全。

## 5. P0模块

### P0-01｜Constraint Intake与缺失信息识别

- 接收零散目标、产品事实、参考和已有文件；
- 区分事实、参考、假设和缺失信息；
- 不自动补写产品事实。

证据：J01、J02。

### P0-02｜Ask-vs-Act

- 产品事实、关键尺寸、制作路径或高影响约束缺失时追问；
- 低风险、可撤销视觉方向可以生成候选；
- 所有假设显式标记；
- 最终文件和加工相关操作保留人工确认。

证据：J02、J09。

### P0-03｜Editable Creative Brief

至少包含：

- 最终交付物；
- 用途与目标用户；
- 必须内容和产品事实；
- 形式；
- 成品与展开尺寸；
- 材料方向；
- 颜色与版式方向；
- 制作路径；
- 输出格式；
- 制作方；
- `confirmed`、`assumed`、`missing`、`needs_confirmation`状态。

证据：J01、J02、J11。Brief交互形式仍需验证。

### P0-04｜人工确认门

- 未确认的产品事实、关键尺寸、制作路径和最终文件不得自动进入完成状态；
- 保存必要的确认人、确认项和文件版本；
- 不将完整版本历史作为首版刚需。

证据：J09、J14。

### P0-05｜MakerFlow Preflight

#### A. SVG File Check

检查可确定的SVG文件结构：

- 文件能否解析；
- `viewBox`；
- width、height和单位；
- `<text>`元素；
- 嵌入或外链位图；
- 空元素和重复ID；
- 按已确认用途检查裁切路径是否闭合；
- 图层/刀线命名约定；
- 路径复杂度提示。

SVG File Check只检查文件结构，不检查或推荐材料、功率、速度、次数和安全参数。具体规则频率尚未通过真实SVG样本验证。

#### B. Brief Consistency Check

将候选文件与已确认Brief比较：

- 文件用途；
- 目标尺寸和单位；
- 必需输出类型；
- 必须存在的文件角色，例如印刷PDF或刀线SVG；
- 未确认约束是否被错误写成最终值。

该模块不判断视觉是否美观，也不验证产品文案事实本身是否正确。

#### C. Studio Readiness Checklist

列出进入xTool Studio后、加工前需要人工完成的事项 `[待实际验证]`：

- 核对实际导入尺寸和单位；
- 核对对象、图层或操作类型；
- 确认材料和设备；
- 由操作人员确认功率、速度、次数和安全参数；
- 执行Preview/Framing；
- 完成加工前人工确认。

MakerFlow不声称xTool Studio自动读取Brief、Preflight报告或Checklist。

### P0-06｜Issue Router与修复/复检

每个issue至少返回：

- `severity`；
- `resolution_stage`；
- `owner`；
- `can_import_to_studio`；
- `must_resolve_before_processing`；
- `evidence`；
- `message`；
- `next_steps`。

修复后的文件保存为新版本并重新检查。

证据：J05、J06、J07。

## 6. P1模块

### P1-01｜Constraint Recommendations

提供形式、尺寸、材料方向、颜色、版式与可读性、制作路径和输出格式候选，并包含：

- `recommendation`；
- `based_on`；
- `benefit`；
- `tradeoff`；
- `confidence`；
- `requires_user_confirmation`。

它是辅助层，不是MakerFlow核心差异，也不输出机器参数。

### P1-02｜参考资料与产品事实整理

- 允许用户粘贴产品事实和参考；
- 提取候选字段；
- 事实必须由用户确认；
- 不自动爬取全网，不把竞品信息写成产品事实。

### P1-03｜轻量项目记录

保存Brief版本、关键确认、Preflight结果和修复记录。不做复杂协作权限和完整决策历史。

## 7. 明确不做

- 通用图像生成器；
- 完整矢量编辑器或Figma/Illustrator替代品；
- 3D建模、3D模型修复或3D模型Checker；
- 自动修改专业设计工具文件；
- 自动连接、控制或替代xTool Studio；
- 自动决定材料、功率、速度、次数和安全参数；
- 自动执行Preview/Framing；
- 机器连接和加工；
- 保证文件生产就绪或安全加工；
- 声称xTool Studio读取Brief、Preflight JSON或完整交接记录；
- 自动将竞品内容生成产品事实；
- 企业级生产、工业级校验或量产保证。

## 8. 成功标准

以下均为下一轮验证指标，不是当前成绩：

| 指标 | 目标 | 验证方式 |
|---|---|---|
| 约束状态理解 | 用户能区分已确认、暂定、缺失和需确认 | 任务后分类测试 |
| Ask-vs-Act一致性 | 10个边界案例中至少8个符合预期政策 | 预设标准答案对照 |
| Brief可用性 | 用户能发现并修正关键缺失字段 | 低保真原型任务观察 |
| Preflight阶段理解 | 用户能区分文件问题、Brief不一致和Studio待办 | 分类与Next Step任务 |
| 修复可行动性 | 用户能根据issue返回正确阶段并说明下一步 | 错误案例任务测试 |
| SVG File Check准确性 | 固定测试SVG的实际结果与预期规则一致 | 单元测试与人工复核，进入W3后执行 |
| Studio Readiness理解 | 用户不会将导入成功解释为生产就绪 | 场景判断测试 |
| 效果指标 | 记录完成时间、返工次数和错误恢复，不预设改善 | 与无辅助基线对照 |

## 9. 下一轮验证问题

1. 用户是否愿意使用轻量Editable Creative Brief？
2. 用户能否正确理解四种约束状态？
3. Ask-vs-Act是否补齐关键约束而不过度打断？
4. 用户能否区分SVG File Check、Brief Consistency Check和Studio Readiness Checklist？
5. 用户能否根据issue返回正确工具修复？
6. 哪些SVG规则在真实文件中最常见、最严重？
7. Brief Consistency Check是否会产生误报或增加负担？
8. 用户是否信任带依据和取舍的Constraint Recommendations？
9. xTool Studio实际导入、尺寸和对象行为是什么 `[待实际验证]`？
10. MakerFlow相对无辅助基线是否减少完成时间、返工或错误？

## 10. 仍未验证的产品假设

- Editable Creative Brief的真实采用意愿；
- 状态字段的可理解性；
- Ask-vs-Act的实际准确性；
- 三个Preflight子模块的用户理解；
- SVG规则的频率、严重度和误报；
- xTool Studio真实行为与Checklist内容 `[待实际验证]`；
- Constraint Recommendations的使用价值；
- 轻量记录的协作价值；
- MakerFlow是否减少返工、时间或错误；
- 长期使用和付费意愿。
