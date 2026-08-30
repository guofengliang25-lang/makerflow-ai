# MakerFlow Human–AI Responsibility Matrix v1.0

> 本矩阵执行`08_Ask_vs_Act_Policy_v1.0.md`。用户人工裁决优先于旧草案、模型推断与实现便利。  
> Authority仅允许：`ACT`、`ASK`、`CONFIRM`、`BLOCK`。Recommendation不是authority状态。

## 1. 角色边界

| actor | 可以负责 | 不能负责 | 当前实现真实性 |
|---|---|---|---|
| Human | 提供事实；确认Brief、候选事实、Creative Plan、WARN、导出及Studio实际设置；编辑作品 | 不应被系统默认代签 | T01、T05、T09、T15及导出触发由UI承载 |
| Model | 提取候选Brief、生成中性追问、生成Creative Plan候选、未来参与首次语义映射 | 不确认事实；不覆盖规则；不决定加工参数；不接受WARN | T02、T04、T06均为`mock`；没有模型API |
| Rule | Brief校验、Design Spec硬约束、Studio状态核对、Issue Routing、权限门禁 | 不生成开放式创意；不替Human确认；不被LLM覆盖 | T03、T07、T12、T13为`local_rule` |
| Tool | SVG渲染、SVG文件检查、一致性证据解析、本地Artifact导出 | 不推断材料参数；不自动修复；不控制Studio或设备 | T08、T10、T11、T16为`local_tool` |
| UI | 展示状态、收集输入和确认、定位编辑、展示Checklist | 不把按钮点击包装成已修复或已生产就绪 | 当前Demo为本地原型 |

## 2. 场景责任矩阵

| 场景 | Human | Model | Rule | Tool/UI | authority链 | 最终责任 |
|---|---|---|---|---|---|---|
| 1. Extract Brief | 审阅并确认候选 | `ACT`提取候选（当前Mock） | 验证结构、缺失和冲突 | UI展示来源和状态 | `ACT → CONFIRM` | Human确认Brief |
| 2. Missing size | 提供预设或自定义尺寸并确认 | 只能提出问题 | 判断是否阻塞Brief | UI不得自动确认默认A6 | `ASK → CONFIRM` | Human决定尺寸 |
| 3. Product fact missing | 提供、修正并确认事实 | 提取候选，不得编造 | 阻止未确认事实成为完成状态 | UI显示来源与状态 | `ASK → CONFIRM` | Human对事实最终负责 |
| 4. Generate Creative Plan | 接受或拒绝建议 | `ACT`生成Recommendation（当前Mock） | 限制confirmed约束和机器参数边界 | UI保留单项决策 | `ACT → CONFIRM` | Human选择方案 |
| 5. Build Design Spec | 已确认Brief和Plan；处理新高影响问题 | 未来仅参与首次语义映射 | `ACT`构建并校验；冲突时阻止 | UI不暴露JSON直接编辑 | `ACT / ASK / BLOCK`（按触发条件分行执行） | Rule控制合法性，Human控制新决策 |
| 6. Render SVG | 查看作品 | 无职责 | 校验前置条件 | Tool合法Spec下`ACT`渲染 | `ACT`或`BLOCK` | Tool忠实执行Spec |
| 7. User edits SVG | `ACT`编辑作品 | 不重新生成设计 | `ACT`使旧检查失效 | UI更新Spec、revision并重渲染 | `ACT → ACT` | Human负责内容取舍 |
| 8. Run Preflight | 发起检查、查看结果 | 无职责 | T12/T13确定性检查与路由 | T10/T11检查当前真实SVG | `ACT` | Rule/Tool负责可复现结果 |
| 9. BLOCK | 修复文件或返回外部工具 | 不得绕过 | 禁止Export | UI禁用继续并显示Next Step | `BLOCK` | Rule执行门禁 |
| 10. WARN | 阅读证据并接受或拒绝风险 | 不得代签 | 识别并路由WARN | UI保存当前revision确认 | `CONFIRM` | Human接受风险 |
| 11. Export | `CONFIRM`触发本地导出 | 无职责 | 检查门禁 | Tool `ACT`生成本地SVG和摘要 | `CONFIRM → ACT` | Human触发，Tool忠实导出 |
| 12. Studio setup | 确认设备、材料、参数、Preview和Framing | 可建议材料方向，不能决定参数 | 只从project_state生成待办 | UI `ACT`展示Checklist，不操作Studio | `ACT → ASK/CONFIRM`；自动设置=`BLOCK` | Studio操作人员最终负责 |

## 3. Task与Skill责任对照

| Task | Skill / 行为 | actor | current implementation | authority | Human Gate / 边界 |
|---|---|---|---|---|---|
| T01 | Intake User Input | Human/UI | implemented_ui | `ACT` | 用户提供事实和clarification回答 |
| T02 | `brief.extract` | Model | mock | `ACT` | 输出必须进入T03和T05 |
| T03 | `brief.validate` | Rule | local_rule | `ACT` | Rule结论不能被LLM覆盖 |
| T04 | `brief.ask_missing` | Model | mock | `ASK` | 用户通过T01回答 |
| T05 | Confirm Brief | Human | implemented_ui | `CONFIRM` | confirmed Brief的唯一确认门 |
| T06 | `plan.generate` | Model | mock | `ACT` | Recommendation等待Human确认 |
| T07 | `design_spec.build` | Model+Rule | local_rule | `ACT` | 新高影响决定=`ASK`；冲突=`BLOCK` |
| T08 | `svg.render` | Tool | local_tool | `ACT` | 非法Spec=`BLOCK` |
| T09 | Edit Draft | Human/UI | implemented_ui | `ACT` | 编辑产生新revision，旧检查失效 |
| T10 | `svg.file_check` | Tool | local_tool | `ACT` | 不推断材料参数 |
| T11 | `brief.consistency_check` | Tool+Rule | local_tool | `ACT` | 不判断美学，不改Brief |
| T12 | `studio.readiness_check` | Rule | local_rule | `ACT` | 只读取project_state |
| T13 | `issue.route` | Rule | local_rule | `ACT` | BLOCK与WARN按独立策略进入门禁 |
| T14 | Apply Safe Fix | Backlog | mock | `BLOCK` | 当前MVP不自动修复；返回T09由Human编辑 |
| T15 | Confirm Warning | Human | implemented_ui | `CONFIRM` | 只对当前revision有效 |
| T16 | `artifact.export` | Tool | local_tool | `ACT` | 需Human先触发；只生成本地Verified SVG |
| T17 | Show Studio Checklist | Rule/UI | implemented_ui | `ACT` | 不进入设备执行 |

## 4. 决策权分层

| 决策类型 | 系统权限 | Human权限 | 禁止事项 |
|---|---|---|---|
| 输入结构化 | `ACT`生成候选 | `CONFIRM`事实和Brief | 系统不得把候选升级为事实 |
| 缺失关键约束 | `ASK` | 回答并`CONFIRM` | 不用默认值静默继续 |
| Recommendation | `ACT`输出候选 | `CONFIRM`接受/拒绝 | Recommendation不是authority |
| Design Spec | Rule在前置条件满足时`ACT` | 新高影响决策由Human回答 | 冲突时必须`BLOCK` |
| SVG生成与检查 | Tool/Rule `ACT` | Human查看、编辑和发起 | 不用模型替代确定性规则 |
| WARN | Rule `ACT`识别 | Human `CONFIRM`风险 | 不允许自动接受 |
| BLOCK | Rule `BLOCK`后续动作 | Human只能修复后复检 | 不能点击确认绕过 |
| 本地Export | Human `CONFIRM`触发 | Tool `ACT`生成文件 | 不导出旧revision |
| Studio设置 | UI `ACT`展示待办 | Human `CONFIRM`实际设置 | 不自动设置或控制设备 |

## 5. 事实与责任声明

- 当前没有DeepSeek、OpenAI或其他模型API接入。
- 当前没有AImake或xTool Studio原生集成。
- Brief、Design Spec、Preflight报告和确认记录是用户项目记录，不声称由Studio读取。
- MakerFlow是否降低返工尚未验证。
- MakerFlow当前规则PASS不保证生产就绪、安全或加工成功。
- 材料方向Recommendation不等于材料兼容性或加工参数建议。

## 6. 未解决冲突

| ID | 冲突 | 当前文档处理 | 等待人工确认 |
|---|---|---|---|
| U01 | C10裁决原文使用`AC`，不属于固定四种authority | 依据现有T10–T13职责暂记录为`ACT` | 是否确认`AC`为`ACT`拼写错误 |
| U02 | 裁决未单列C14，C15文字与原冲突编号不完全对应 | 采用明确文字：本地导出`ACT`、Studio原生交接`BLOCK` | 是否需要补充原C15 Verified PDF裁决 |
| U03 | Demo选择A6时直接写入`confirmed` | 政策保持`ASK → CONFIRM` | Demo尚未按裁决修正 |
| U04 | Demo提供“打印／另存为PDF” | 不把它定义为Verified PDF | 是否隐藏该按钮或明确降级为未验证输出 |
| U05 | Task Graph保留T14可选Safe Fix | 当前责任矩阵按裁决设为`BLOCK` | Graph尚未同步 |
| U06 | Matrix将T16 target写为`future_integration` | 采用Registry v1.1和人工裁决的`local_tool`边界 | Matrix尚未同步 |
