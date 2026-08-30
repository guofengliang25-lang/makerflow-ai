# MakerFlow Ask-vs-Act Policy v1.0

> 适用范围：MakerFlow当前MVP——MomoRay模块化枕头包装内高度调节说明卡。  
> 权限依据：用户对C01–C20的人工裁决优先于模型推断、旧草案和实现便利。  
> 当前状态：产品权限政策；不代表模型API、AImake或xTool Studio原生集成已实现。

## 1. 唯一权限状态

| authority | 定义 |
|---|---|
| `ACT` | 输入、规则和授权已满足，系统或用户可以执行该动作 |
| `ASK` | 缺少只能由用户补充的事实、关键约束或高影响决定，必须先询问 |
| `CONFIRM` | 候选、风险或最终动作已明确，必须由用户接受、拒绝或确认 |
| `BLOCK` | 当前动作被禁止；不能通过默认值、模型推断或普通“下一步”绕过 |

不得新增第五种authority状态。`Recommendation`是输出类型，不是authority状态。每条策略只使用一个authority；连续行为拆成多条策略。

## 2. 决策原则

1. 产品事实、关键尺寸和高影响约束缺失时使用`ASK`。
2. 模型提取、Recommendation、Design Spec构建、SVG渲染和确定性检查不自动获得确认权。
3. 用户接受候选事实、Creative Plan、WARN风险、导出和Studio实际设置时使用`CONFIRM`。
4. 自动补写产品事实、绕过BLOCK、自动接受WARN、自动修复、自动设置加工参数、未验证的Studio交接和加工成功保证均为`BLOCK`。
5. 当前Model节点为Mock。未来Provider变化不得改变本政策、Skill I/O或Human Gate。

## 3. 策略表

| ID | authority | actor | trigger | input state | action | reason | risk | output | next state | reversible | example | counterexample |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| AVA-01 | `ACT` | Model（当前为Mock） | T01提交或补充任务输入 | `task_input`可读取 | 提取`brief_candidate`，标记来源、假设、缺失和冲突 | 结构化候选是低风险中间动作 | 把推断写成事实 | Brief候选 | 进入T03验证，不能直接成为confirmed Brief | 是 | 从用户描述提取“说明卡用途”候选 | 自动把参考资料写成已确认产品事实 |
| AVA-02 | `CONFIRM` | Human | T03判定Brief可确认 | 候选字段、状态和证据可见 | 确认或退回当前Brief版本 | C03裁决要求Human Confirm | 过期版本或假设被误确认 | confirmed Brief或修改请求 | 确认后进入T06；退回T01 | 是，但形成新版本 | 用户检查字段后点击确认Brief | 模型提取后直接标记整个Brief已确认 |
| AVA-03 | `ASK` | Model/UI | 关键成品尺寸缺失 | 未选择有效预设，或自定义宽/高缺失 | 询问成品尺寸 | C01裁决：size missing必须ASK | 错误尺寸传播到设计和文件 | 尺寸问题 | 用户回答后重新提取与验证 | 是 | “请选择A6或填写自定义宽高” | 系统在用户未选择时自动确认A6 |
| AVA-04 | `CONFIRM` | Human | 系统已有尺寸候选 | 候选尺寸可见且来源明确 | 确认成品尺寸 | 尺寸是高影响约束 | 用户未理解单位或方向 | confirmed尺寸 | 进入后续Brief确认 | 是，但需新revision | 用户确认“A6 · 148 × 105 mm” | 系统仅凭模板默认值确认尺寸 |
| AVA-05 | `ASK` | Model/UI | 产品事实缺失或冲突 | 事实无法从用户输入确认 | 询问用户真实产品信息 | C04裁决：缺失事实=ASK | 虚构枕高、结构或产品能力 | 事实澄清问题 | 回到T01→T02→T03循环 | 是 | 询问真实枕高数据来源 | 用竞品数据补齐MomoRay事实 |
| AVA-06 | `CONFIRM` | Human | 已提取产品事实候选 | 候选值、来源和冲突可见 | 接受、修正或拒绝候选事实 | C04裁决：候选事实确认=CONFIRM | 错误事实进入作品 | confirmed事实或修正 | 重新验证Brief | 是 | 用户确认模块可拆卸 | 模型把候选事实自动设为confirmed |
| AVA-07 | `ACT` | Model（当前为Mock） | confirmed Brief存在且有未决策约束 | confirmed字段锁定，未确定字段可建议 | 生成`creative_plan` Recommendation | C05裁决：生成Recommendation=ACT | 重复推荐已确认约束 | 候选Creative Plan | 等待用户决策 | 是 | 推荐“两种版式方向” | 再次要求接受已确认A6尺寸 |
| AVA-08 | `CONFIRM` | Human | Creative Plan建议可见 | 每项依据、收益、限制和状态可见 | 接受或拒绝Recommendation | C05裁决：用户接受/拒绝=CONFIRM | 建议被当成事实 | accepted Plan | 全部决策完成后进入T07 | 是 | 接受线性图标方案 | 系统默认接受全部建议 |
| AVA-09 | `ACT` | Rule / Model+Rule | confirmed Brief与accepted Plan版本一致 | Schema、模板和资源映射可用 | 构建并校验`design_spec` | C06裁决：构建=ACT | 错误映射污染内部单一事实来源 | 初始Design Spec revision | 进入T08 | 是，可回上游重建 | 将已接受版式映射为布局 | 每次用户编辑都重新调用模型 |
| AVA-10 | `ASK` | Model/UI | 构建时出现新的高影响决定 | Brief和Plan无法决定该约束 | 向用户询问，不继续构建 | C06裁决：新高影响决策=ASK | 模型越权决策 | 澄清问题 | 返回Brief或Plan决策 | 是 | 询问未确认的刀线要求 | 模型擅自开启刀线 |
| AVA-11 | `BLOCK` | Rule | Brief、Plan或硬规则映射冲突 | 冲突不能由既定规则解决 | 停止构建 | C07裁决：保持分离，冲突时BLOCK | 静默覆盖confirmed Brief | 冲突与证据 | 返回T06或人工处理 | 是 | Plan尺寸与confirmed Brief不同 | 修改Brief迎合Plan |
| AVA-12 | `ACT` | Tool | Design Spec合法且依赖可用 | 已通过Schema与硬约束校验 | 确定性渲染当前SVG | C08裁决：合法Spec下ACT | Renderer自行补创意 | `draft.svg` | 进入T09查看/编辑 | 是 | 按Spec生成图标和结构示意 | Renderer自行选择未定义布局 |
| AVA-13 | `BLOCK` | Tool/Rule | Design Spec必要字段不足 | 尺寸、布局或内容块无法合法渲染 | 停止渲染并返回失败 | C08裁决：必要字段不足=BLOCK | 产生不可追溯作品 | 失败信息 | 返回T07或用户决策 | 是 | layout不存在时停止 | 用默认布局掩盖缺失字段 |
| AVA-14 | `ACT` | Human/UI | 用户在Create & Edit修改作品 | 当前SVG及Spec已加载 | 编辑标题、步骤、位置或视觉元素 | C09裁决：用户编辑=ACT | 修改后仍使用旧检查 | updated Design Spec | 产生新revision并重渲染 | 是，至少支持Undo | 用户拖动步骤组 | 系统代替用户做审美决定 |
| AVA-15 | `ACT` | Rule/UI | Design Spec或SVG发生修改 | revision增加 | 立即使旧Preflight和WARN确认失效 | C09裁决：系统立即失效=ACT | 旧结果误用于新文件 | stale状态 | 要求重新Preflight | 否；只能重新检查 | 显示“布局已修改，需要重新Preflight” | 修改后仍显示当前版本已检查 |
| AVA-16 | `ACT` | Tool/Rule | 用户对当前revision发起Preflight | SVG、Brief、Design Spec和project_state满足各自前置条件 | 执行T10、T11、T12并由T13路由 | 固定权限只有四种；按既有Graph和Registry执行确定性检查 | 使用过期或Mock结果 | 三类检查结果与路由 | BLOCK/WARN/PASS分支 | 是，可复检 | 检查当前SVG DOM | 切换预写Mock结果冒充检查 |
| AVA-17 | `BLOCK` | Rule/UI | 任一导入前block存在 | 当前revision检查有效 | 禁止进入Export | C02、C11裁决 | 带结构性错误导出 | BLOCK状态与Next Step | 返回T09或外部工具修复 | 是，修复后复检 | viewBox无效时禁用导出 | BLOCK仍允许点击下一步 |
| AVA-18 | `CONFIRM` | Human | 当前revision存在允许继续的WARN且无BLOCK | 用户已看到证据、影响和未覆盖风险 | 接受风险或返回修改 | C12裁决 | 系统代签风险 | `warning_decision` | 接受后可导出；拒绝回T09 | 是；revision变化后失效 | 用户确认保留空元素 | WARN默认视为已接受 |
| AVA-19 | `CONFIRM` | Human | 当前revision满足导出门禁 | 无BLOCK、无未确认WARN | 用户触发最终本地导出 | C13裁决 | 用户未确认就生成最终交付物 | 导出请求 | 进入T16 | 是 | 点击“下载Verified SVG” | 系统在后台自动导出 |
| AVA-20 | `ACT` | Tool | 已收到有效导出请求 | SVG与Preflight revision一致 | 生成本地`verified_design.svg`和摘要 | C13裁决：本地导出=ACT | 导出旧revision | 本地SVG文件和摘要 | 进入T17 Checklist | 是，不修改源文件 | 下载当前已检查SVG | 导出检查前的旧SVG |
| AVA-21 | `BLOCK` | Rule | 请求Studio原生交接 | 当前不存在已验证集成 | 禁止发送Brief、JSON或Artifact到Studio | C15裁决：Studio原生交接当前=BLOCK | 虚构集成或错误外发 | 边界提示 | 保持本地交付 | 是 | 提示用户手动导入SVG | 声称Studio自动读取交接包 |
| AVA-22 | `ACT` | Model（当前为Mock） | 材料方向尚未确定且允许建议 | 已确认用途和约束可作为依据 | 输出材料方向Recommendation | C16裁决 | 建议被误解为加工参数 | 材料方向候选 | 等待用户确认 | 是 | 建议纸张方向并说明取舍 | 给出激光功率和速度 |
| AVA-23 | `CONFIRM` | Human | 材料、设备或加工参数需要实际决定 | 项目状态或Studio环境可见 | 用户确认具体材料和参数 | C16、C17、C18裁决 | 不安全或未经验证的参数 | 人工确认记录 | 进入实际Preview/Framing | 取决于外部Studio | 操作人员确认材料 | MakerFlow自动设置功率 |
| AVA-24 | `ASK` | UI | project_state缺少只能由用户提供的实际状态 | 设备、材料或参数状态未知 | 询问用户/操作人员 | C17裁决 | 从SVG猜测状态 | 状态问题 | 更新project_state后重检 | 是 | 询问实际使用材料 | 根据SVG颜色推断材料 |
| AVA-25 | `BLOCK` | Rule | 试图从SVG推断材料、设备或加工参数 | 只有文件证据，无实际项目状态 | 禁止推断 | C17裁决 | 伪造安全信息 | BLOCK边界提示 | 返回ASK/CONFIRM | 是 | 要求填写project_state | 从cutline推断激光参数 |
| AVA-26 | `ACT` | Rule/UI | Export完成且Studio Readiness结果可读 | Verified SVG已产生 | 展示Studio Checklist | C18裁决 | 用户误以为系统已设置设备 | 人工待办清单 | 等待用户在Studio完成 | 是 | 显示材料、Preview待办 | 显示“参数已自动设置” |
| AVA-27 | `BLOCK` | Rule/UI | 请求MakerFlow自动修复问题 | 当前MVP不承担Safe Fix | 禁止自动修改文件 | C19裁决 | 修改超出用户授权 | BLOCK与修复位置 | 返回用户编辑 | 是 | 定位到画板尺寸字段 | 按钮声称已自动修复SVG |
| AVA-28 | `ACT` | Human/UI | Issue提供内置或外部修复位置 | 用户理解问题和Next Step | 返回编辑并修改作品 | C19裁决 | 修改后未复检 | 新revision | 重新Render和Preflight | 是 | 用户修复viewBox后复检 | 系统假装外部问题已修好 |
| AVA-29 | `ACT` | Rule | Preflight无导入前BLOCK且WARN均确认 | 当前revision有效 | 允许进入本地导出流程 | C20裁决 | PASS被误解为生产就绪 | 可导出状态 | AVA-19用户确认 | 是 | 显示“允许导出” | 显示“保证加工成功” |
| AVA-30 | `BLOCK` | Rule/UI | 任何环节试图承诺生产成功 | 仅有MakerFlow当前规则结果 | 禁止保证加工成功 | C20裁决 | 安全与责任误导 | 风险声明 | 进入人工Studio设置 | 否 | “不代表保证加工成功” | “PASS保证加工成功” |

## 4. 状态流

```text
ACT 提取Brief候选 → CONFIRM Brief
缺关键尺寸/产品事实 → ASK → CONFIRM
ACT 生成Recommendation → CONFIRM 接受/拒绝
ACT Build Design Spec → ACT Render SVG
Human ACT编辑 → 系统ACT使旧Preflight失效
ACT运行Preflight
├─ BLOCK → 禁止Export → Human ACT修复 → 复检
├─ WARN → CONFIRM风险 → Export门
└─ PASS → ACT允许进入导出 → CONFIRM用户触发 → ACT本地导出
Export后ACT展示Checklist → Human CONFIRM实际Studio设置
```

## 5. 当前真实性边界

- T02、T04、T06仍为Mock，没有真实模型API。
- 不调用AImake API或xTool Studio。
- 只有当前revision的SVG是主要本地交付物；不声称Studio读取Brief或Checker JSON。
- MakerFlow是否降低返工尚未验证。
- PASS不代表材料兼容、生产就绪、安全或加工成功。

## 6. 已知未解决冲突

1. C10裁决原文为“AC”，但固定authority中不存在`AC`。本版依据同一裁决项指向T10–T13及既有Graph/Registry，将该执行行为记录为`ACT`；仍需人工确认该拼写。
2. 裁决列表未单列C14；C15的文字内容对应“本地导出/Studio原生交接”，而原冲突表C15是“当前Verified PDF”。本版不宣称Verified PDF已实现，但PDF authority仍需单独裁决。
3. 当前Demo选择A6时会立即把尺寸状态写成`confirmed`，与C01“缺失尺寸必须ASK”和AVA-04人工确认边界未完全一致。
4. 当前Demo Export页仍提供“打印／另存为PDF”，但`artifact.export` Contract明确当前不生成Verified PDF。
5. Agent Task Graph仍保留T14 Safe Fix可选路径；Registry v1.1和人工裁决已把当前自动修复设为`BLOCK`。
6. Node I/O Matrix仍将T16 target写为`future_integration`；Registry v1.1与人工裁决限定为本地`local_tool`。

