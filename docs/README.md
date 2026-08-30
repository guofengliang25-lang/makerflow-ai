# MakerFlow 文档索引

本索引用于区分当前产品证据与历史阶段材料。版本号来自不同文档轨道，不应被理解为同一发布序列。

## KEEP_PUBLIC｜当前主要入口

- [Full AI Product PRD v0.2](prd/02_makerflow_full_prd_v0.2.md)：当前对外产品定义与真实性边界的主要入口。
- [MVP Scope v0.2](product/04_MVP_Scope_v0.2.md)：当前单一场景、范围与非目标。
- [Agent Task Graph v1.0](07.agent/06_Agent_Task_Graph_v1.0.md) 与 [Node I/O Matrix](07.agent/06_node_io_matrix.md)：任务职责与数据流。
- [Skill Registry v1.1](skills/07_Skill_Registry_v1.1.md) 与 [Skill Contracts](skills/Skill_Contract/)：稳定能力边界；Human Gate 不作为 Skill。
- [Data Model v0.1](architecture/12_Data_Model_v0.1.md)、[Design Spec Schema v0.1](architecture/13_Design_Spec_Schema_v0.1.md) 与 [Context Architecture v0.1](architecture/14_Context_Memory_Architecture_v0.1.md)：数据与状态架构草案；其中标记为未来的 RAG / Memory 不代表已经实现。
- [Contract Eval Manifest](evals/02_contract_eval_manifest_v0.1.md)：评估定义入口；可执行资产位于仓库 `evals/`。
- `prompts/`、`providers/`、`prototype/`、`schemas/`：当前可运行原型及其直接实现资产。

## ARCHIVE_PUBLIC｜公开保留的产品演进记录

以下材料用于说明研究和产品判断如何演进，不应覆盖上面的当前入口：

- `01_MakerFlow一页Brief.md` 至 `04_W1复盘.md`：W1 产品定义与复盘；
- `05_constraint_recommendations.md` 至 `07_updated_main_flow.md`：W2 中间产品架构；其中 “SVG Checker” 是历史名称，当前统一使用 MakerFlow Preflight；
- `product/01_JTBD_v1.0.md` 至 `product/05_Evidence_Matrix_v1.0.md`：早期研究综合；
- `product/10_MakerFlow_AI_PRD_v0.1.md`、`prd/01_makerflow_full_prd_v0.1.md`：PRD 历史版本；
- `skills/07_Skill_Registry_v1.0.md`、`skills/*Draft*`、`skills/*notes*`：Registry / Contract 形成过程；
- `evals/01_contract_eval_audit_v0.1.md` 与初始 Eval cases：评估资产的审查历史。

历史文档中的阶段状态、Mock 描述或待验证项不代表当前 Demo 状态。发生冲突时，优先参考当前实现、Full PRD v0.2、Node I/O Matrix、Skill Registry v1.1 和现行 Contract/Eval 资产。

## REMOVE_FROM_PUBLIC_REPO｜仅在本地保留

以下内容属于会话恢复或内部执行辅助材料，不是产品证据资产，因此从 Git 跟踪中移除，但可保留在本地工作区：

- `MakerFlow_项目交接包_2026-08-16/`；
- `docs/MakerFlow_PRD_KSRD_Context_Pack.md`；
- `docs/superpowers/plans/`。

## Truth Boundary

- MakerFlow 当前是可运行功能原型，不是已上线产品；
- DeepSeek 是 Experimental Provider，不是最终模型选型；
- 当前可靠交付物是 SVG，PDF unsupported；
- 未实现 Multi-Agent、RAG、长期 Memory 或制造设备原生集成；
- MakerFlow Verified 不等于 Studio Ready，也不保证加工成功。
