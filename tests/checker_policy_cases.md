# MakerFlow Checker Policy Cases

> 阶段：W2 产品定义  
> 测试性质：政策预期案例，不是已运行的代码测试或 xTool Studio 测试  
> 使用方式：W3 实现 Checker 后，将每个案例转为固定输入、预期 JSON 和实际结果

## 1. 统一判定原则

- Pre-import Gate：`before_import`、`in_design_tool`；
- Studio Setup Checklist：`in_studio`、`before_processing`；
- 未解决的 Pre-import `block`：`can_import_to_studio=false`；
- 涉及加工前必须处理的事项：`must_resolve_before_processing=true`；
- 未实际确认的 xTool Studio、材料或设备行为标记 `[待实际验证]`；
- Verified SVG/PDF 只表示通过已定义的 Pre-import Gate。

## 2. 案例总表

| ID | 情形 | severity | resolution_stage | owner | can_import_to_studio | must_resolve_before_processing |
|---|---|---|---|---|---:|---:|
| CP-01 | SVG 无法解析 | `block` | `before_import` | designer | false | true |
| CP-02 | 缺少 `viewBox`，但尺寸与单位完整 | `warn` | `in_design_tool` | designer | true | false |
| CP-03 | 宽高、单位和 `viewBox` 均不足 | `block` | `in_design_tool` | designer | false | true |
| CP-04 | SVG 尺寸与已确认 Brief 不一致 | `block` | `in_design_tool` | designer | false | true |
| CP-05 | 存在未转路径文字 | `warn` | `in_design_tool` | designer | true | true |
| CP-06 | 存在嵌入位图 | `warn` | `in_design_tool` | designer | true | true |
| CP-07 | 存在外链资源 | `block` | `in_design_tool` | designer | false | true |
| CP-08 | 存在重复 ID | `warn` | `in_design_tool` | designer | true | true |
| CP-09 | 存在空路径或零面积对象 | `info` | `in_design_tool` | designer | true | false |
| CP-10 | 裁切用途路径未闭合 | `block` | `in_design_tool` | designer | false | true |
| CP-11 | 路径数量超过提示阈值 | `warn` | `in_design_tool` | designer | true | false |
| CP-12 | Studio 中尚未核对实际导入尺寸 | `warn` | `in_studio` | studio_operator | true | true |
| CP-13 | Studio 中尚未确认对象操作类型 | `warn` | `in_studio` | studio_operator | true | true |
| CP-14 | Preview/Framing 尚未执行 | `block` | `before_processing` | studio_operator | true | true |
| CP-15 | 材料、功率、速度或次数尚未确认 | `block` | `before_processing` | studio_operator | true | true |
| CP-16 | 视觉质量、设备兼容与加工安全 | `info` | `out_of_scope` | user | true | true |

## 3. 详细案例

### CP-01｜SVG 无法解析

- 预期证据：XML 解析失败位置和错误摘要；
- 预期 message：无法执行其余文件规则，当前文件不能标记为 Verified；
- next_steps：重新导出或修复 XML，保存新版本并完整复检；
- 理由：没有可读取的文件结构，无法建立 Pre-import 证据。

### CP-02｜缺少 `viewBox`，但尺寸与单位完整

- 预期证据：宽度、高度、单位存在，`viewBox` 缺失；
- 预期 message：文件具有明确物理尺寸，但缩放和跨工具表现可能受影响；
- next_steps：建议在设计工具中补充 `viewBox`，或记录用户接受该风险；
- 理由：该问题本身不必然阻止导入，但需在后续真实软件验证中确认 `[待实际验证]`。

### CP-03｜宽高、单位和 `viewBox` 均不足

- 预期证据：无法建立可靠物理尺寸；
- 预期 message：Checker 无法验证画布与 Brief 尺寸的一致性；
- next_steps：在设计工具中设置明确尺寸、单位和坐标范围后复检；
- 理由：尺寸是当前制作文件的关键约束。

### CP-04｜文件尺寸与 Brief 不一致

- 预期证据：已确认 Brief 版本、目标尺寸、SVG 声明尺寸和差值；
- 预期 message：候选文件不符合用户确认的需求基线；
- next_steps：确认 Brief 或修正画布，保存新版本并复检；
- 理由：Checker 不替用户选择哪个尺寸正确。

### CP-05｜存在未转路径文字

- 预期证据：`<text>` 元素数量及位置；
- 预期 message：字体和文字呈现可能依赖目标软件环境；
- next_steps：在设计工具中转路径，或保留文字并明确记录兼容风险；
- 理由：是否阻止导入需由具体用途和实际 Studio 行为验证 `[待实际验证]`。

### CP-06｜存在嵌入位图

- 预期证据：`<image>` 元素、尺寸和嵌入方式；
- 预期 message：文件不是纯矢量，位图分辨率和处理方式需确认；
- next_steps：确认用途，必要时替换为矢量或准备独立印刷 PDF；
- 理由：Checker 只报告结构，不判断位图视觉质量。

### CP-07｜存在外链资源

- 预期证据：外部 URL 或本地文件引用；
- 预期 message：目标环境可能无法访问依赖资源；
- next_steps：嵌入、打包或移除外链后复检；
- 理由：缺失依赖会使文件结果不可自包含。

### CP-08｜存在重复 ID

- 预期证据：重复 ID 和相关元素位置；
- 预期 message：引用、样式或脚本解析可能指向错误对象；
- next_steps：在设计工具或 SVG 源文件中生成唯一 ID 后复检；
- 理由：实际影响取决于是否存在 ID 引用，但加工前应消除不确定性。

### CP-09｜存在空路径或零面积对象

- 预期证据：对象位置、路径数据和边界框；
- 预期 message：发现可能无视觉或加工贡献的对象；
- next_steps：检查并删除无用对象，或记录保留理由；
- 理由：单独出现通常不阻断，但可增加文件噪声。

### CP-10｜裁切用途路径未闭合

- 预期证据：文件用途为裁切、开放端点数量和位置；
- 预期 message：目标刀线不是闭合轮廓；
- next_steps：回到设计工具闭合路径并重新执行 Gate；
- 理由：Checker 不推断用户是否有意保留开放路径。

### CP-11｜路径数量超过提示阈值

- 预期证据：实际路径数量、项目阈值和统计范围；
- 预期 message：文件复杂度较高，可能增加编辑或软件处理负担；
- next_steps：检查是否存在重复或可简化对象；
- 理由：阈值是项目提示，不代表 xTool Studio 的官方限制 `[待实际验证]`。

### CP-12｜Studio 中尚未核对导入尺寸

- 预期证据：文件层尺寸与 Brief 一致，但没有实际 Studio 尺寸记录；
- 预期 message：可进入 Studio，但加工前必须核对实际导入尺寸；
- next_steps：导入 Verified SVG/PDF，记录软件版本、单位和显示尺寸 `[待实际验证]`；
- 理由：文件层验证不能替代软件内结果。

### CP-13｜Studio 中尚未确认对象操作类型

- 预期证据：对象存在，但没有 Studio 内操作类型确认记录；
- 预期 message：必须由用户在 Studio 中确认对象如何处理 `[待实际验证]`；
- next_steps：逐对象检查并保存人工确认记录 `[待实际验证]`；
- 理由：MakerFlow 不自动设置加工操作。

### CP-14｜Preview/Framing 尚未执行

- 预期证据：没有对应软件或设备预览记录；
- 预期 message：不得仅凭 Verified 文件进入加工；
- next_steps：执行 Preview/Framing，检查位置、范围和材料放置后人工确认 `[待实际验证]`；
- 理由：这是加工前人工 Gate，不属于文件层 Checker 能力。

### CP-15｜材料、功率、速度或次数尚未确认

- 预期证据：没有实际材料、设备和参数确认记录；
- 预期 message：MakerFlow 不决定机器功率、速度、次数或安全参数；
- next_steps：由合格操作人员依据实际材料、设备说明和测试结果确认 `[待实际验证]`；
- 理由：该问题必须在加工前解决，但不反向阻止文件导入。

### CP-16｜视觉质量、设备兼容与加工安全

- 预期证据：Checker 只完成已定义文件规则，没有相应真实世界证据；
- 预期 message：这些结论超出 Checker 范围；
- next_steps：分别进行设计评审、软件导入、材料测试、设备确认和安全检查；
- 理由：`out_of_scope` 用于防止 Verified 被误解为全面认证。

## 4. W3 转换要求

后续实现时，每个案例至少需要：

1. 一个固定 SVG 或项目状态输入；
2. 一个符合 `checker_issue.schema.json` 的预期 issue；
3. 对 `severity`、`resolution_stage` 和两个布尔字段的断言；
4. Mock、实际 Studio 验证和设备验证分开归档；
5. 实际执行后再填写结果，当前不得标记为通过。

