# 03｜Agent Task Graph、Skill、State、Memory架构交接

## 1. Task Graph一句话

> **Agent Task Graph把用户体验流程翻译成系统执行责任与状态流：明确节点、责任方、输入输出、继续/阻塞条件、失败分支、状态变化和恢复路径。**

不是页面流程，也不是代码文件结构。

---

# 2. 当前Task Graph逻辑节点

概念上仍围绕：

```text
Intake
→ Extract Brief
→ Validate Brief
→ Ask Missing
→ Human Confirm Brief
→ Generate Plan
→ Build Design Spec
→ Render SVG
→ Human Edit
→ SVG File Check
→ Brief Consistency
→ Studio Readiness
→ Route Issues
→ Human Confirm WARN
→ Export
→ Studio Checklist
```

注意：
- 旧文档中`Apply Safe Fix`存在过，但最新决策是移出当前MVP。
- 因删除Safe Fix，后续Task编号可能需要统一重排；不要在新会话中假定旧T14/T15编号永远正确，应以最新Task Graph文件为准。

---

# 3. Node I/O的意义

Node I/O不是“已经存在的代码接口”，而是先约定：

```text
这个节点接收什么
→ 做什么责任
→ 输出什么
→ 什么情况下失败
→ 下一步去哪
```

例如：

```text
T02 Extract Brief
Input: task_input
Output: brief_candidate
current: mock
target: future_model
```

即使还没接DeepSeek，也可以定义I/O。

JSON示例只是Example Payload，不代表磁盘一定存在一个`.json`文件。

---

# 4. Skill最新定义

> **Skill是Agent可调用、具有稳定职责、明确I/O和责任边界的能力单元。**

判断Skill不能只看“有没有人为干预”。

真正标准：
1. 有独立稳定职责；
2. 有稳定输入输出；
3. 可被系统调用，不是纯UI/Human Gate；
4. 有明确Non-goals。

命名：
- Skill ID用稳定能力名，例如`brief.extract`；
- 使用场景放`trigger_when`，不要把长自然语言塞进Skill ID。

分层路由当前不需要复杂Router：
- `brief.*`
- `plan.*`
- `design_spec.*`
- `svg.*`
- `studio.*`
- `issue.*`
- `artifact.*`
已经是轻量一级分类。

---

# 5. Core Skill Registry最新目标

应收敛为11个：

```text
brief.extract
brief.validate
brief.ask_missing
plan.generate
design_spec.build
svg.render
svg.file_check
brief.consistency_check
studio.readiness_check
issue.route
artifact.export
```

最新Registry建议字段：
- skill_id
- display_name
- purpose
- implementation_type
- deterministic
- input
- output
- called_by_nodes
- side_effects
- risk_level
- human_gate
- current_implementation
- target_implementation
- trigger_when
- do_not_trigger_when
- contract_status
- contract_path
- non_goals

Future/Backlog：
- `issue.safe_fix`
- `studio.handoff`

但不代表计划一定实现。

---

# 6. Skill Contract学习重点

用户最终不需要亲手写完所有Contract。

必须真正吃透的代表：
- `brief.extract`：Model Skill；
- `design_spec.build`：Composite /语义+规则；
- `svg.render`：Tool Skill；
- `issue.route`：Rule Skill。

其他Contract可让Codex批量生成骨架，但用户必须人工审核：
- Purpose
- Input
- Output
- Human Gate
- Non-goals

Contract不能随Provider变化。

例如：
```text
brief.extract
Input = task_input
Output = brief_candidate
```

Mock → DeepSeek → OpenAI都应遵守相同Contract。

Provider变化可以改变：
- model/provider；
- prompt；
- timeout；
- retry；
- cost；
- latency；
- normalization实现。

不应改变：
- Task Graph；
- Skill ID；
- Contract；
- Brief Schema；
- 下游Validate逻辑。

---

# 7. `svg.render`最新职责建议

`svg.render`最好尽量纯：

```text
Input: design_spec
Output: svg
Side Effects: none
```

“保存当前Artifact / revision+1 / 旧Preflight失效”更适合由T08 Orchestrator / Project State Manager负责，而不是Renderer自身。

这样更：
- 易测试；
- 易重用；
- 易Retry；
- 易Provider/实现替换；
- 易定位Bug。

旧`svg.render.contract.md`中仍有“Renderer更新Artifact并使Preflight失效”的内容，后续应同步修正。

---

# 8. Design Spec Schema用户需要懂到什么程度

不是“设计规范库”，而是：

> 当前Artifact已经确定的结构化设计状态。

用户需要懂：
- 为什么字段属于Design Spec；
- 谁产生它；
- 谁读取它；
- 修改后哪些状态失效。

不需要：
- 手写JSON Schema；
- 写Validator；
- 数据库Migration；
- TypeScript类型工程。

最新建议最低字段：

```text
design_spec
├─ schema_version
├─ revision
├─ artifact_type
├─ artboard
│  ├─ preset
│  ├─ width
│  ├─ height
│  └─ unit
├─ layout
│  └─ template_id
├─ content_blocks[]
│  ├─ id
│  ├─ type
│  ├─ role
│  ├─ text
│  ├─ position.x/y
│  ├─ draggable
│  └─ locked
├─ visual_elements[]
│  ├─ id
│  ├─ type
│  ├─ purpose
│  ├─ asset_source
│  ├─ position
│  ├─ draggable
│  └─ locked
├─ palette
└─ production_requirements
   ├─ output_formats
   ├─ pure_vector_required
   ├─ text_policy
   └─ cutline_required
```

不要塞：
- 用户访谈；
- 原始产品事实；
- Studio功率速度；
- Preview；
- Preflight结果；
- 对话历史。

---

# 9. Structured Project State / Memory

### Structured Project State
= 当前已确认的项目事实和状态，可理解为内部结构化状态存储。

### Memory Architecture
= 什么时候存、取、忘，以及什么信息应该进入下次模型上下文。

至少分：
1. Structured Project State
2. Session Context
3. Decision Log / History
4. Knowledge Retrieval / RAG
5. Artifact / Trace

用户学习深度：
- 了解用途和边界；
- 判断什么应长期存、什么仅临时；
- 判断信息优先级；
- 能审Codex架构是否合理。
不要求自己实现数据库/Redis/向量库。

---

# 10. STORE / RETRIEVE / EXPIRE

推荐规则：

## STORE
- Human confirmed → Project State
- Accept/Reject Plan → Decision Log
- 新Design Spec / Artifact → Revision History
- Preflight完成 → Report绑定Artifact revision
- AI普通candidate → 不得自动进入confirmed state

## RETRIEVE
- Skill输入需要事实 → Structured State
- “刚才第二个方案” → Session/Decision Log
- 材料/工艺外部知识 → RAG
- 无关旧对话 → 不取

## EXPIRE / LOGICAL FORGET
- Session临时摘要 → TTL/Session结束
- assumed被新confirmed值替代 → 不再进入active context
- 旧Artifact → 保留History，不进入当前Context
- 错误AI猜测 → 不写长期State

优先级：

```text
Human Confirmed State
>
Current Artifact / Latest Human Decision
>
Retrieved Knowledge
>
Past AI Suggestions
```

---

# 11. RAG边界

RAG = Retrieval-Augmented Generation：
- 从外部知识库检索；
- 把相关资料放进模型上下文；
- 帮助生成有依据的结果。

RAG不是：
- 当前项目数据库；
- confirmed事实存储；
- 所有聊天记录的长期记忆。

MakerFlow材料推荐未来可使用RAG；
当前Brief、Design Spec等应直接读Structured State。