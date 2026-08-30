# 09｜后续回答格式、Codex协作模板、验收方式

## 1. 固定学习/执行模板

以后所有新知识、新架构、新任务都按：

### ① 概念是什么？
大白话。

### ② MakerFlow里的具体例子？
不能只用抽象行业例子。

### ③ 我需要懂到什么程度？
明确：
- 必须会判断；
- 只需能读懂；
- 不需要自己实现。

### ④ 我必须亲自判断什么？
AI PM不能外包的产品判断。

### ⑤ 我具体怎么做？
步骤级。

### ⑥ Codex能替我做什么？
给可复制Prompt。

### ⑦ 验收标准是什么？
什么时候算完成。

---

# 2. 理解闭环模板

Codex产出后：

```text
不要继续修改文件。
请按：
解决什么问题
→ 为什么需要
→ 每个字段是什么意思
→ MakerFlow中对应哪里
解释这份文档。
一次只解释一个概念，不引入新术语。
```

用户自己复述：

```text
我理解这个东西其实就是……
在MakerFlow里它负责……
如果没有它，会出现……
```

再让Codex纠错：

```text
这是我的理解：
[粘贴]

不要重新上课。
只指出：
1. 哪些正确；
2. 哪一点混淆；
3. 只需要改哪一句。
```

---

# 3. 事实/决策/假设输出模板

后续PRD、研究、作品集统一标记：

```text
FACT
DESIGN DECISION
HYPOTHESIS
TARGET
NOT VALIDATED
[待确认]
```

### FACT
已有证据。

### DESIGN DECISION
人为做出的产品选择，不冒充事实。

### HYPOTHESIS
需要验证的假设。

### TARGET
目标，不是已经取得的结果。

### NOT VALIDATED
尚未验证。

---

# 4. Codex执行原则

适合Codex：
- 建目录；
- 创建Markdown；
- 批量Contract；
- Schema格式；
- Runner；
- Mock数据；
- consistency audit；
- Diff；
- README；
- 文件名统一；
- Mermaid；
- 代码实现与本地验证。

用户亲自：
- 范围；
- 权限；
- Human Gate；
- Fact vs Candidate；
- Expected / Forbidden；
- Skill边界；
- Non-goals；
- PRD问题/价值/Why AI；
- Eval成功标准；
- 面试叙事。

---

# 5. “只Audit、不直接修改”Prompt模板

```text
请先AUDIT，不直接修改任何产品决策或代码。

读取：
[文件列表]

检查：
1. 与最新人工决策的冲突；
2. 状态模型冲突；
3. I/O命名冲突；
4. Reality/Truth Boundary冲突；
5. 已删除能力是否被旧文件重新带回；
6. HYPOTHESIS是否被写成FACT。

输出Conflict Table：
- conflict_id
- file_a
- statement_a
- file_b
- statement_b
- severity
- suggested_resolution
- human_decision_required

等待我逐条裁决。
```

---

# 6. “人工裁决后再修改”模板

```text
以下为我的人工裁决：
C01：...
C02：...
C03：...

这些决策优先级高于旧文档。

现在请：
1. 先输出Impact Analysis；
2. 列出要修改的文件；
3. 列出Schema/Task/Skill/Eval影响；
4. 确认不会增加新能力；
5. 等我确认后再真正写入。
```

---

# 7. “PRD更新”模板

```text
请只根据已经确认的Research、MVP、Task Graph、Skill、Schema、Authority和Eval更新PRD。

不要重新设计产品。

每个重要结论标记：
FACT / DESIGN DECISION / HYPOTHESIS / TARGET / NOT VALIDATED。

所有Function Requirement尽量关联：
- Evidence
- Task Node
- Skill
- Authority
- Eval Case

有冲突先报告，不自动替我裁决。
```

---

# 8. “Eval迭代”模板

```text
请不要根据本次模型输出修改Eval Expected。

Eval Case是产品标准。
如果系统行为与Eval冲突：
- 测试FAIL；
- 报告Expected / Actual / Reason；
- 我来决定是修产品、Prompt还是修改经过证据证明错误的Eval。

每次Prompt/Provider变化：
复用同一approved Eval Set，生成新Baseline/Comparison。
```

---

# 9. 接近100分的交付验收

任何MakerFlow产物至少问：

## 产品
- 为什么存在？
- 用户问题有证据吗？
- 是否和现有工具重复？
- 是否超MVP？

## AI
- 为什么要Model？
- 能否用Rule/Tool更稳定？
- 模型输出是否有Contract？
- 是否有Human Gate？

## 状态
- 谁是canonical owner？
- revision怎么变化？
- 哪些旧结果会stale？

## Eval
- 什么叫PASS？
- Forbidden是什么？
- 能重复跑吗？
- Provider变化后还能用吗？

## Truth
- 有没有把Mock写成真实？
- 有没有把Target写成结果？
- 有没有把Recommendation写成Fact？

## 面试
- 能用30秒解释吗？
- 能回答“为什么不直接用AImake/xTool Studio”吗？
- 能说出研究删掉了哪些功能吗？
- 能解释为什么这个项目体现AI产品潜力吗？