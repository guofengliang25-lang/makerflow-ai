# MakerFlow PRD 专用上下文包｜KSRD

> 用途：新开一个只处理 MakerFlow Full PRD 颗粒度的对话。
> 原则：PRD 是产品判断文档，不是作品集摘要；不把未实现能力写成已实现。

## KEEP｜核心需要长期保留、不得漂移

### 1. 产品 Canonical
- 产品名称：MakerFlow AI
- 产品形态：独立 Web Assistant
- 一句话定义：MakerFlow 是面向初级 Maker / 设计学生的可制作作品助手：把模糊想法转成结构化设计约束，形成可编辑矢量作品，并在导出前完成确定性预检与问题路由。
- MVP Validation Scenario：MomoRay 模块化枕头「高度调节说明卡」。
- 主 Artifact：可编辑 SVG；不是一次性图片。
- 产品不是：AI Native OS、通用 Agent Platform、Multi-Agent System、单纯 Workflow Automation Tool、Prompt-to-image 工具、制造设备控制平台。

### 2. 核心用户与问题
目标用户：有基础设计意识、会基础设计工具，但缺少完整制作 / handoff 经验的设计学生与初级 Maker。
核心问题：
1. 模糊想法难以转成结构化设计约束；
2. AI 生成视觉结果不等于可编辑、可制作、可验证作品；
3. Brief / Artifact / Preflight / Decision 容易跨版本失配；
4. 新手容易把“文件能打开 / 检查通过”误解为“可以安全加工”。

### 3. Why AI / Why not AI
Model 适合：brief.extract、brief.ask_missing、plan.generate。
Rule / Tool 负责确定性任务：brief.validate、svg.render、svg.file_check、brief.consistency_check、studio.readiness_check、issue.route、artifact.export、revision / stale / export gate。
Human 负责：Brief Confirm、Plan Accept、WARN risk acceptance、Export / real manufacturing decisions。
硬原则：Model 处理模糊语义；Tool 执行确定动作；Rule 处理硬约束与门禁；Human 持有事实和高风险权限。

### 4. Canonical 7 步体验
1. Define
2. Editable Brief
3. Creative Plan
4. Create & Edit
5. Preflight
6. Resolve Issues
7. Export & Handoff

### 5. 核心状态对象
必须区分：Brief、Creative Plan、Design Spec、Artifact、Preflight Report、Human Decision / Decision Log。
版本语义必须区分：brief_revision、design_spec_revision、artifact_revision、checked_artifact_revision。
关键规则：
- Artifact Identity 不等于文件名或保存次数；
- 内容 / 来源 / 验证上下文变化可形成新 identity；
- 重复保存 / render 且 identity 不变 → Trace Event，不增 revision；
- Artifact 变化 → 旧 Preflight 保留，但 stale；
- stale = 保留证据，撤销权限；
- WARN Human Confirm 必须绑定当前 Artifact revision；
- BLOCK 不可由 Human Confirm 绕过。

### 6. Core Skill Baseline
当前 Core Skill 固定 11 个：brief.extract、brief.validate、brief.ask_missing、plan.generate、design_spec.build、svg.render、svg.file_check、brief.consistency_check、studio.readiness_check、issue.route、artifact.export。
issue.safe_fix 不属于当前 MVP / Core。

### 7. Eval
四类 Eval：Contract Eval、Semantic / Quality Eval、Workflow / Agent Eval、UX Eval。
Eval lifecycle 三维必须独立：definition_status、execution_status、latest_run_status。
当前 Contract baseline 的可信表达：12 total / 7 PASS / 0 FAIL / 5 SKIPPED_PROVIDER_REQUIRED。
不能写“模型准确率 100%”或“12 条全部通过”。

### 8. Provider / Model Truth
DeepSeek：当前是 Experimental Provider；Browser → Node → DeepSeek 的 brief.extract 真实垂直切片已跑通；不能因此声称 Final Model Selection；plan.generate、brief.ask_missing 尚需真实接入与 Eval。

### 9. 版本路线
Phase 1 产品假设验证 → Phase 2 Model 能力接入 → Phase 3 体验与 Eval 闭环 → Phase 4 制作生态扩展。
不要虚构固定 x 周交付，除非后续 Human 决策明确。

### 10. Truth Boundary
可写：独立 Web Assistant；7 步 Canonical workflow；11 Core Skills；Artifact / revision / stale / Human WARN Gate；Contract Eval baseline；DeepSeek brief.extract Experimental Provider 已真实跑通。
不可写：已上线 / 已增长 / 已提升效率 XX%；Multi-Agent、RAG、长期 Memory 已实现；完成 Model Selection；xTool / Cricut / AImake 原生集成；制造成功率、安全性已验证；PDF 已可靠导出。

## SUMMARIZE｜保留为历史摘要，不要反复展开

### A. 项目演进
MakerFlow 最初更接近“AI 帮用户生成设计”，随后逐步发现真正难点不是生成本身，而是：约束是否显式、中间设计状态是否可编辑、真实 Artifact 与 Design Spec 是否区分、作品改变后验证是否失效、Human / Rule / Model 权限是否清楚、Eval 是否能证明系统按预期运行。因此项目从“生成工具”演进为“可制作作品助手”。

### B. 关键修正历史
1. Renderer 从状态管理中拆出，保持 Design Spec → SVG 的确定性职责；
2. Design Spec revision 与 Artifact revision 分开；
3. Artifact Manager 成为 Orchestrator / Project State 基础设施，不是 Core Skill；
4. Preflight 由“删除旧结果”改为“保留旧结果 + stale”；
5. WARN Confirmation 从 issue_id 数组升级为 revision-bound Human Decision；
6. E10 从错误锚定 svg.render 迁移到 Workflow / Artifact State；
7. brief.validate 获得正式 Contract ownership；
8. Local deterministic baseline 达到 7 / 0 / 5；
9. Browser → Node → DeepSeek → brief.extract → validateBrief → Step 2 已真实跑通。

### C. PRD 写作演进
旧版问题：章节齐全但偏总结型；表格多，但产品判断颗粒度仍不足；容易把“最终架构”写出来，却没有充分写“为什么这么做”。
后续 PRD 要求：每个关键章节尽量覆盖 What → Why → Evidence → Product Decision → Why this decision → Example → Boundary / Bad Case → Acceptance / Eval。

## RETRIEVE｜需要时再从项目 Memory / 仓库取，不要常驻正文
1. 竞品原始研究：AImake V2.0、Cricut Design Space、Atomm / AImake Projects；需要时补官方 / 实测证据。
2. 具体 Skill Contract 全文：只有写对应 Skill 小节时取。
3. E01–E12 详细 Expected / Forbidden：写 Eval case 时再取。
4. Prompt v0.1 全文 / Provider trace：写 Prompt Strategy、Model Eval 时再取。
5. Artifact / Preflight / Decision schema：写 State、Authority、Reliability 时再取。
6. 旧 Decision Log / Canonical Sync / Codex report：遇到职责冲突时再取。
7. 用户研究原始记录：写 Evidence / User Research 时再取；不把 3 名邻近样本外推为大样本结论。
8. NFR 数据：Latency、Cost、Privacy、Retention 只有真实测量/政策后再取。

## DROP｜从 PRD 主线删除或不再重复
1. 过时定位：AI Native Creative Workflow OS、通用 AI OS、Multi-Agent 产品。
2. 已废弃实现细节：generic revision、checkedRevision、Renderer 管 Artifact revision、删除旧 Preflight 的旧实现。
3. 重复概念解释：每章都重复 Model / Tool / Rule / Human；每章都重复 Artifact stale；每章都重复 Truth Boundary。
4. 与当前 PRD 无关的求职包装：Notion 作品集排版、ChatGPT 产品拆解、MomoRay AI Transformation。
5. 过度技术展开：所有代码、测试文件名、实现路径放 Appendix / Evidence Index，不塞 PRD 正文。
6. 未实现且非当前核心：Multi-Agent、RAG、Long-term Memory、LLM as Judge、Auto Safe Fix。

## 新 PRD 专用对话的任务边界
只处理 MakerFlow Full PRD、产品判断颗粒度、PRD 内容证据、User / JTBD / Competitive / Product / Agent / Eval / Model / Demo / NFR / Risk、逐章节人工精修。
不处理 Demo 编码、UI 视觉设计、Notion 作品集排版、ChatGPT 拆解、MomoRay AI 改造方案。

## 新对话第一条消息（直接复制）

我现在要单独精修 MakerFlow Full AI Product PRD。

请严格使用我上传的《MakerFlow PRD 专用上下文包｜KSRD》和当前 Full PRD 作为事实基础。

工作方式：
1. 一次只处理一个 PRD 小节；
2. 不自动批量重写全文；
3. 我会先亲自写一个示范段落，之后你按我的颗粒度继续；
4. 每个核心小节优先检查 What / Why / Evidence / Product Decision / Alternatives / Example / Boundary / Acceptance；
5. 不为了“完整”虚构数据、用户研究、模型结果或商业结果；
6. 如果内容需要从旧项目资料取，先 Retrieve，不要从记忆猜；
7. 如果是重复内容，标记 Drop，不重复堆砌；
8. 如果是必须长期稳定的 Canonical，标记 Keep。

先不要写正文。第一步请读取 Full PRD，给出该章节当前问题，等我提供一个“颗粒度示范”后，再按该标准改写。
