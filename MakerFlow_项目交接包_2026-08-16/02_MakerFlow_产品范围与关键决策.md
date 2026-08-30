# 02｜MakerFlow 产品范围、MVP与重要决策

## 1. 为什么做MakerFlow

用户研究和工具链研究共同指向：
- 初始需求通常不完整；
- 设计约束会逐步形成；
- 用户会跨AI/设计/制作工具工作；
- 文件可以导入，不代表符合Brief或真实制作就绪；
- 上游文件问题和下游材料/设备/参数问题应分层处理；
- 最终高影响决策需要人确认。

MakerFlow不是“取代所有工具”，而是帮助用户管理：
- 约束；
- 决策；
- 可编辑Artifact；
- 预检；
- 问题定位；
- Handoff。

---

# 2. MVP核心模块

## P0
1. Editable Brief / Brief Builder
2. Brief字段状态与Human Confirm
3. Creative Plan（只对未决事项建议）
4. Design Spec
5. 可编辑SVG Artifact
6. MakerFlow Preflight
7. Issue Routing
8. BLOCK / WARN / PASS
9. Artifact Revision + Preflight invalidation
10. Export + Studio Checklist

## P1
- Constraint Recommendation扩展；
- 材料方向建议；
- 视觉辅助建议；
- 制作环境Checklist；
- 参考资料提取；
- 局部建议刷新。

## 暂不进入MVP
- 通用Prompt-to-image；
- 完整矢量编辑器；
- 自动Safe Fix；
- 自动xTool Studio交接；
- 材料数据库自动下发；
- 激光参数自动决定；
- Preview/Framing自动控制；
- 设备执行；
- 3D Checker；
- 全格式生产检查。

---

# 3. Step 1 Define最新要求

用户输入应尽量自然：
- 一个主自然语言输入框；
- 一个参考资料上传区（PNG/JPG/PDF/SVG）；
- 删除重复的“已有文件与高级输入”折叠区；
- “体验MomoRay示例”可以保留为弱入口，不应与主CTA同等级；
- 正式体验隐藏“MVP单一场景”“不调用API”等内部说明，QA模式才显示。

---

# 4. Step 2 Editable Brief最新要求

保留区别：

### 最终需要呈现
= 最终作品必须让用户看到什么。

### 已确认产品事实
= AI和设计过程不能擅自改变的真实信息。

不能合并。

新增：
### 视觉辅助需求
- 不需要
- 需要
- 暂不确定

目的可包含：
- 解释产品结构；
- 解释步骤；
- 品牌识别；
- 装饰；
- 其他。

视觉具体形式可在Plan阶段建议。

尺寸：
- 删除“尺寸摘要”独立字段；
- 前台统一“成品尺寸”；
- 预设A6时自动映射148×105mm；
- A6已confirmed时，不允许宽/高同时显示missing；
- 自定义时才展开宽/高/单位；
- 内部Design Spec仍可使用artboard字段。

---

# 5. Step 3 Creative Plan最新要求

核心原则：

> **confirmed Brief字段不再进入Recommendation。**

Plan只针对：
- assumed
- needs_confirmation
- undecided
- missing但允许通过建议辅助决策的事项。

例如：
- 版式；
- 材料方向；
- 颜色方向；
- 视觉辅助形式；
- 制作路径；
- 输出格式（若未confirmed）。

顶部可显示“已锁定约束”，但不要求用户再次接受。

建议卡包含：
- recommendation
- rationale
- benefits
- limitations
- confidence（必须未来定义真实含义）
- Accept / Reject
- 用户补充要求

删除“换一组Creative Plan”大按钮；当前更适合每张未确认卡“换一个建议”。

已accepted建议默认锁定，除非用户点击“重新考虑”。

---

# 6. Step 4 Create & Edit最新要求

不是完整Illustrator。

推荐交互：
- 左：作品结构；
- 中：SVG画布；
- 右：选中元素属性。

需要：
- Fit to screen；
- Zoom；
- 点击SVG元素；
- 属性修改实时更新Design Spec；
- Renderer重新渲染；
- visual aid真正出现在作品中；
- revision变化后旧Preflight变stale。

允许Controlled Direct Manipulation：
- 标题组；
- step groups；
- footer；
- visual aid/icon group。

暂不允许：
- Anchor编辑；
- 贝塞尔；
- 旋转；
- 多选；
- 复杂Z-index；
- 完整图层系统。

拖拽应：
- 更新position.x/y；
- 8px网格吸附；
- 防止完全移出画板；
- 支持重置布局；
- 最低一次Undo；
- 触发新revision和Preflight stale。

状态视觉要区分：
- selected element；
- enabled/visible状态。
不能都用同一个黑底active样式。

---

# 7. Preflight最终宏观分层

## A. SVG File Check
只检查SVG本身：
- parse
- width/height
- viewBox
- text
- bitmap
- IDs
- empty elements
- cutline/path closure等确定性信息。

## B. Brief Consistency Check
比较：
- 当前Artifact；
- confirmed Brief；
- 必要时Design Spec。

检查：
- 尺寸；
- pure vector要求；
- text policy；
- cutline requirement；
- confirmed内容是否冲突。

## C. Studio Readiness
只读Project State：
- 设备；
- 材料；
- 加工方式；
- 参数；
- Preview；
- Framing/试样。

不得从SVG猜材料/设备/参数。

---

# 8. Issue Routing

每个Issue至少有：
- issue_id
- severity
- title
- evidence
- owner
- resolution_stage
- can_continue
- next_steps

核心价值不是“发现错误”，而是：

> **发现后告诉用户问题在哪个阶段、回哪个工具、谁负责、怎么修、修完后要不要复检。**

这可能是MakerFlow最有辨识度的产品点。

---

# 9. BLOCK / WARN / PASS

- BLOCK：当前硬规则或confirmed约束冲突，不允许直接继续完整Handoff。
- WARN：存在风险/未完全确认事项，需Human Confirm。
- PASS：仅表示通过当前MakerFlow规则。

必须强调：

```text
MakerFlow Verified
≠ Studio Ready
≠ Ready to Process
```

---

# 10. 材料建议最终边界

允许：
- 根据Brief用途、形式、阅读体验等生成“材料方向候选”；
- 可结合可靠外部知识/RAG给依据；
- 这属于ACT生成recommendation → Human Confirm。

不允许：
- 自动决定真实production material spec；
- 自动决定设备参数；
- 把网上类似案例直接写成confirmed；
- 未经真实设备/材料验证即声称安全可加工。

建议未来区分：

```text
material_direction
production_material_spec
```

---

# 11. Design Spec直接生成SVG的原因

不要：
```text
Prompt → PNG → 转SVG → Preflight
```

主路径：
```text
Brief
→ Plan
→ Design Spec
→ SVG Renderer
→ 可视可编辑SVG
→ Preflight
```

原因：
- 精确尺寸可控；
- 可以结构化编辑；
- confirmed内容不因再次生成被随机改写；
- 易做一致性检查；
- 避免位图转矢量结构损失；
- 不与通用AImake图像生成正面重复。

图片/插画可以作为素材，而不是核心Artifact中间格式。