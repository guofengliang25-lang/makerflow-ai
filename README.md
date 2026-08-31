# MakerFlow AI

MakerFlow 是面向初级 Maker / 设计学生的可制作作品助手：把模糊想法转成结构化设计约束，形成可编辑矢量作品，并在导出前完成确定性预检与问题路由。

> 当前状态：功能原型，可本地运行。DeepSeek 是实验性 Provider，不代表最终模型选型。

## Current Demo

当前 Demo 已实现一条面向单一场景的浏览器流程：

- 通过 DeepSeek 执行真实 `brief.extract`；
- 通过 DeepSeek 执行真实 `brief.ask_missing`，并由用户补充缺失信息；
- Human Brief Confirm：关键约束满足规则后仍需用户确认 Brief；
- 通过 DeepSeek 执行真实 `plan.generate`；
- Human Plan Decision：建议只有经用户接受后才能进入 Design Spec；
- Design Spec → SVG，并在浏览器中形成可编辑矢量作品；
- Artifact revision、Preflight 绑定及内容变化后的 stale invalidation；
- MakerFlow Preflight：SVG File Check、Brief Consistency Check、Studio Readiness Checklist；
- BLOCK 路由与 revision-bound WARN Human Gate；
- SVG partial export；PDF 当前为 unsupported，不把浏览器打印视为 Verified PDF。

该原型不代表 MakerFlow 已上线、已有真实用户或已经提升效率、降低返工。

## Demo Scenario

当前 MVP 验证 MomoRay 模块化枕头高度调节说明卡：

| 配置 | 真实枕高 |
|---|---:|
| 0 inserts | 15 cm |
| 1 insert | 16 cm |
| 2 inserts | 17 cm |

当前 Demo 选择 A6 preset，由确定性规则规范化为 `148 × 105 mm`。这些高度数据来自项目方人工确认；Demo 不把用户身高推断为医学匹配规则。

## Architecture

```text
Browser
  → Node server
  → DeepSeek Experimental Provider
  → Model / Rule / Tool / Human
  → Artifact / Preflight / Export
```

浏览器不会直接调用 DeepSeek。API Key 只由 Node 服务从环境变量读取。确定性规则负责 Brief validation、SVG render/check、Artifact revision、Preflight 和 Export gate；模型不决定真实设备、材料或加工参数。

架构、产品和评估文档入口见 [docs/README.md](docs/README.md)。部署说明见 [DEPLOY.md](DEPLOY.md)。

## Eval

当前 Contract baseline：

- 7 PASS
- 0 FAIL
- 5 SKIPPED_PROVIDER_REQUIRED

这是当前 Contract Eval 的执行结果，不是模型准确率，也不证明真实用户价值、生产成功率或最终模型选型。

## Local Run

要求 Node.js `>=24 <25`。

```bash
npm install
npm start
```

在本地 `.env` 中配置：

```text
DEEPSEEK_API_KEY=<your key>
```

`.env` 与真实 Provider 运行产物已被 Git 忽略。启动后默认访问：

- Demo: `http://localhost:8000/`
- QA: `http://localhost:8000/?qa=1`
- Health: `http://localhost:8000/health`

## Public Demo

Coming Soon — Vercel deployment pending.

## Known Limitations

- PDF unsupported；当前只可靠支持 SVG partial export；
- 没有 AImake、xTool Studio 或制造设备的原生集成；
- 不控制设备，不自动决定功率、速度、次数或安全参数；
- PASS 只表示通过 MakerFlow 当前规则，不等于 Studio Ready 或保证加工成功；
- 不包含 Multi-Agent、RAG 或长期 Memory；
- DeepSeek 是 Experimental Provider，尚未成为最终模型选型；
- 当前 MVP 只验证一个主要 MomoRay 场景。

## Repository Boundaries

本仓库保留产品定义、研究证据、Task Graph、Skill Contracts、Prompt、Eval、Provider、Prototype 与部署资产。早期 W1/W2 文档作为产品演进记录公开保留，但不代表当前实现；纯内部交接包、上下文包和 Codex 执行计划不进入公开仓库。
