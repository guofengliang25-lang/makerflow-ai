# 04｜Eval 与 AI-native PRD 核心资产

## Part A｜Eval

# 1. Eval是什么

> **Eval = AI产品的考试题 + 判卷标准 + 可重复运行机制。**

不是“感觉新版更好”。

Eval回答：
- 什么叫做对；
- 哪些错误绝对不可接受；
- Provider/Prompt变化后有没有退步；
- 是否出现Regression。

---

# 2. 四类Eval

## Contract Eval
测结构和硬规则：
- Schema；
- required fields；
- enum；
- forbidden inference；
- Contract I/O。

例：
用户没说尺寸 → `size.status = missing`；
Fail：模型自己confirmed A6。

## Semantic / Quality Eval
测语义质量：
- 是否符合Brief；
- Recommendation是否相关；
- 是否解释依据；
- 是否违反事实；
- 是否可执行。

需要Human Rubric，未来可使用校准后的Model Grader。

## Workflow / Agent Eval
测路径：
- 应ASK时有没有ASK；
- BLOCK是否绕过；
- WARN是否经过Human；
- Skill调用顺序是否合理；
- 状态失效是否正确。

## UX Eval
测真实用户：
- 能否识别缺失字段；
- 能否理解BLOCK；
- 是否知道回哪修；
- 是否理解PASS≠可加工。

---

# 3. 第一类Eval资产链路

```text
人工Case
→ Audit
→ 标准化
→ cases.json
→ Runner
→ Baseline
→ Provider/Prompt更新
→ 同一Case重跑
→ Regression
```

文件意义：

### `cases.json`
最重要。正式题库/Source of Truth。

### `run_contract_evals.js`
自动监考+判卷。用户不要求会写，但必须能看懂：
- Input
- Expected
- Actual
- Pass/Fail逻辑。

### `contract_eval_baseline_mock_v0.1.md`
当前版本基线成绩。未来和DeepSeek/Prompt v0.1/v0.2比较。

### `README.md`
说明：
- 测什么；
- 怎么新增Case；
- 怎么跑；
- grader是什么；
- 什么不属于本类Eval。

---

# 4. Eval Case最新生命周期

必须三维：

```text
definition_status:
- draft
- reviewed
- approved

execution_status:
- manual_only
- runnable_local
- provider_required
- blocked

latest_run_status:
- not_run
- pass
- fail
- skipped
- error
```

例：
```text
definition_status = approved
execution_status = provider_required
latest_run_status = not_run
```
= 题目定义好了，但DeepSeek还没接，尚未真正考试。

---

# 5. 用户已经做到哪里

用户已经自己完成第一类Contract Eval Cases。

下一步不是继续堆Case，而是：
1. 交给Codex Audit；
2. 用户审“测什么/绝不接受什么/怎样Pass”；
3. Codex把confirmed cases机器可读化；
4. 建`cases.json + runner + baseline`；
5. 当前Mock先跑；
6. 后续DeepSeek接入后用同一Case复跑。

---

# 6. Contract Eval下一步Codex Prompt模板

```text
请读取我已经完成并人工确认的Contract Eval Cases。

同时读取：
- Agent Task Graph
- Node I/O Matrix
- Skill Registry
- Skill Contracts
- 当前Schema

本轮目标：
把人工Eval标准化并转换成可维护、可执行资产，不重新设计产品。

先AUDIT：
每条输出：
- eval_id
- target_skill
- related_task_node
- purpose
- input
- expected_behavior
- expected_output_constraints
- forbidden_behavior
- grader_type
- severity
- source
- definition_status
- execution_status
- latest_run_status

grader_type仅：
- deterministic
- human_rubric
- model_grader_future

检查：
- happy path
- missing field
- malformed output
- invalid enum
- forbidden inference
- conflicting input
- state contamination
- provider replacement

发现缺口只列Candidate，不自动加入正式Case。

先输出：
1. 定义不清的Case
2. 无法自动判定的Expected
3. 与Contract冲突的Case
4. 应移动到Semantic/Workflow Eval的Case

等待我人工裁决。
```

用户裁决后：

```text
请把approved Contract Eval转为可执行资产：

evals/contract/cases.json
evals/contract/README.md
evals/runners/run_contract_evals.js
evals/reports/contract_eval_baseline_mock_v0.1.md

要求：
- cases.json是正式Case Source of Truth
- 当前不调用真实Model API
- future_model Case标SKIPPED_PROVIDER_REQUIRED
- FAIL显示Expected/Actual/Reason
- Runner不能改产品逻辑
- 不能为了PASS修改Expected
- 输出total/pass/fail/skipped
- 运行一次Mock baseline
```

---

## Part B｜AI-native PRD

# 7. PRD是什么

> **PRD = 团队对“为什么做、给谁做、做到什么、怎样表现、怎样算做对”的共同产品协议。**

AI产品中PRD不被Eval取代。

```text
PRD = 应该怎样工作
Prototype = 用户怎么操作
Task Graph/Contract/Schema = 系统怎样协作
Eval = 怎么证明AI真的按预期工作
```

---

# 8. 为什么AI PRD比传统PRD多内容

普通软件：
```text
点击 → function → 输出
```

AI产品还要定义：
- 哪些任务真的需要Model；
- Prompt；
- Context；
- Output Contract；
- Model选择；
- Human Gate；
- Ask-vs-Act；
- Eval；
- Retry/Fallback；
- Observability；
- Prompt/Model版本变化如何验证。

---

# 9. MakerFlow AI PRD推荐结构

```text
00 Executive Summary
01 Problem & Opportunity
02 Target User & JTBD
03 Evidence & Competitive Landscape
04 Why AI / Why not traditional
05 Goals
   - User Goal
   - Product Goal
   - Model Goal
   - Eval Goal
   - Business/Product Hypothesis
06 Scope & Non-goals
07 Product Experience
08 System / Agent Architecture
09 Data / State / Memory
10 Model Strategy
11 Prompt Strategy
12 Authority & Guardrails
13 Eval Strategy
14 Reliability / Recovery
15 Functional Requirements
16 Non-functional Requirements
17 Acceptance Criteria
18 Risks / Open Questions
19 Truth Boundary
```

---

# 10. Why AI必须写清

适合Model：
- Extract Brief；
- Ask Missing；
- Creative Plan；
- 部分Design Spec semantic mapping。

不应该用LLM：
- SVG Render；
- SVG parse；
- 简单一致性规则；
- BLOCK/WARN路由硬规则；
- Artifact export。

AI PM的重要能力是：
> 知道什么地方不要用AI。

---

# 11. Model Strategy当前状态

当前：
- Model Skill = Mock；
- DeepSeek = planned prototype provider；
- 未经过Eval，不能写“最终模型选型”。

正式模型选择应比较：
- Structured output adherence；
- Chinese intent understanding；
- Instruction following；
- Latency；
- Cost；
- Failure rate；
- Eval score。

---

# 12. Prompt Strategy

PRD只放Prompt Inventory，不把完整Prompt全部塞正文。

建议：
```text
P01 brief.extract
P02 brief.ask_missing
P03 plan.generate
P04 design_spec.build
```

单独目录：
```text
prompts/<skill>/
- v0.1.md
- v0.2.md
- CHANGELOG.md
```

Prompt版本变化必须关联：
- 为什么改；
- 对应哪个Eval failure；
- 新版Eval结果；
- 是否产生Regression。

不要只写“优化Prompt”。

---

# 13. 数据集边界

当前没有fine-tuning：
- Training Dataset = N/A。

必须建设：
- Eval Dataset。

未来若RAG：
- Knowledge corpus ≠ Training dataset ≠ Eval dataset。

---

# 14. PRD当前进度

Codex已经被要求先生成：
- 目录；
- 已有内容映射；
- 缺失项；
- Cross-document冲突。

下一步：
1. 用户先审核Problem / Why AI / Scope / Goals / Conflict；
2. 用户逐条裁决冲突；
3. Codex生成PRD正文v0.1；
4. 用户审核7个核心问题；
5. Codex做Cross-document consistency review；
6. 用户再次裁决；
7. 冻结PRD v0.1 + CHANGELOG。

---

# 15. PRD第一稿Codex Prompt

```text
我已审核AI PRD Skeleton、内容映射、缺失项和冲突。
以下为我的人工裁决：
[粘贴]

请生成：
docs/product/10_MakerFlow_AI_PRD_v0.1.md

原则：
- 不重新设计MakerFlow
- 已有人工作出决定优先
- PRD负责产品决策，不复制所有详细规范
- 详细Task Graph/Contract/Schema/Eval通过引用关联

每项信息尽量标：
FACT
DESIGN DECISION
HYPOTHESIS
TARGET
NOT VALIDATED

Model：
- 当前Mock
- DeepSeek为planned prototype provider
- 未经Eval不得写最终选型

Training Dataset：
- N/A
Eval Dataset：
- 单独定义

完成后输出：
1. [待确认]
2. 全部HYPOTHESIS
3. 全部TARGET
4. 文档引用关系
5. 最需要人工审核的5个章节
```

---

# 16. PRD人工审核7问

1. 我到底解决什么问题？
2. 为什么需要AI？
3. 什么明确不做？
4. 用户完整流程是什么？
5. AI有什么权限？
6. 怎么证明系统做对？
7. 哪些仍是假设？

这7问清楚，PRD就具备主要价值。