# 05｜Demo UX、开发与真实性规则

## 1. Demo当前定位

不是高保真视觉产品。
当前优先级：
1. 基础功能能运行；
2. 逻辑闭环；
3. 状态/权限正确；
4. 用户理解；
5. 再公开部署；
6. 最后视觉。

公开地址可等Demo逻辑稳定后再做。

---

# 2. Demo主路径必须独立跑通

即使没有AImake/xTool Studio API：

```text
用户输入
→ Brief
→ Plan
→ Design Spec
→ SVG
→ Edit
→ Preflight
→ Resolve
→ Export
```

可通过：
- Mock Model；
- 本地Renderer；
- 本地Rule/Tool；
- 文件上传/下载；
实现完整概念闭环。

---

# 3. xTool生态关系

AImake：
- 可作为上游素材来源；
- 不宣称自动连接。

MakerFlow：
- Brief；
- Plan；
- Editable SVG；
- Preflight；
- Routing；
- Export。

xTool Studio：
- 真实设备；
- 材料；
- 加工参数；
- Preview；
- Framing；
- 执行。

正确表述：
> MakerFlow是xTool创作生态的概念扩展，通过标准SVG/PDF文件表达上游素材与下游制作交接；原生集成仍属后续验证项。

---

# 4. 外部SVG模式

支持用户已有SVG进入Preflight，但：
- 不要求所有用户先用MakerFlow生成；
- 外部SVG不一定能完整转为Design Spec；
- 只对可靠解析部分建立derived partial spec；
- External Artifact保持自身权威。

---

# 5. QA模式

内部QA可显示：
- BLOCK/WARN/PASS场景选择；
- Mock说明；
- 调试状态。

外部用户测试应隐藏这些提示，避免测试污染。

建议：
```text
?qa=1
```
才显示内部控件。

---

# 6. Preflight后状态

修改Artifact后：
- 旧Preflight → stale；
- 不能立刻说出现新Issue；
- 必须Re-run；
- 新结果才能判PASS/WARN/BLOCK。

---

# 7. Export最新边界

当前真实输出优先：
- `verified_design.svg`
- 检查摘要/JSON/Checklist（若真实实现）

PDF：
- 若未真实实现，不写当前可生成Verified PDF；
- 若Brief要求PDF required，则允许SVG partial export，但Handoff incomplete；
- 如果用户确认取消PDF，创建新Brief revision。

---

# 8. 开发工具职责

Codex适合：
- 文件夹和Markdown结构；
- Schema骨架；
- Mock数据；
- UI实现；
- 本地SVG Renderer；
- Runner；
- 自动一致性检查；
- README；
- 批量Contract骨架；
- Diff / conflict audit。

用户必须自己做：
- MVP边界；
- 为什么要AI；
- Human Gate；
- FACT vs recommendation；
- Skill边界；
- Eval Expected/Forbidden；
- PRD关键裁决；
- 是否能宣称某种结果；
- 面试叙事。

原则：
> 产品判断由用户做，结构化/机械实现由Codex做。

---

# 9. 公开部署

目前不是P0。
Demo逻辑稳定后：
- 本地静态server；
- Netlify / GitHub Pages等静态部署；
- 普通URL隐藏QA；
- QA URL可保留`?qa=1`。

不要在代码中依赖Codex内部代理地址。
fetch尽量用相对路径。

---

# 10. Demo专业评审视角

AI PM会问：
- 为什么这里用LLM？
- 为什么不直接用AImake？
- AI什么时候必须问人？
- 你的核心差异是否只是Checker？
- 什么是可靠的中间状态？

UX/Product Designer会问：
- 用户第一次知道怎么开始吗？
- confirmed/assumed/missing能理解吗？
- 用户编辑时是否真的感觉在操作作品？
- Gate为什么存在？

Agent Engineer会问：
- Model输出如何约束？
- Tool/Rule如何解耦？
- Provider换了Contract是否稳定？
- State怎么失效？
- Retry/Fallback怎么处理？

制作工程会问：
- PASS是否代表可加工？
- 材料/设备/参数从哪里来？
- 哪些必须真实软件/人工确认？

面试官会问：
- 最初做大而全时错在哪？
- 研究删除了什么？
- 为什么最后保留这些？
- Demo真的跑通了吗？
- 有Eval证明模型/Agent行为吗？