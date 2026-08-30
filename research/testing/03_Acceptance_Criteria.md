# MakerFlow低保真Demo验收标准

## 1. 技术验收

- 可通过本地静态服务器运行，无需安装项目依赖；
- 仅使用原生HTML、CSS、JavaScript和本地Mock JSON；
- 不存在React、Next.js、后端、`package.json`或真实API请求；
- 七个步骤均可通过页面控件进入；
- 所有主要按钮有可观察的状态变化；
- BLOCK、WARN、PASS三种场景均可演示；
- BLOCK不能导出；WARN需要人工确认；PASS允许导出；
- 刷新后`localStorage`恢复当前步骤和已编辑状态；
- 一键重置只清除`makerflow.lowfi.v1`；
- 浏览器控制台没有未处理错误。
- 普通访问不显示QA切换器；`?qa=1`才显示；
- 所有fetch均使用`./data/...`相对路径；

## 2. 产品边界验收

- Brief清楚显示`confirmed`、`assumed`、`missing`、`needs_confirmation`；
- 关键字段缺失或待确认时不能继续；
- MakerFlow Preflight明确拆为三个子模块；
- SVG File Check不检查或推荐材料、设备及加工参数；
- 材料、设备与Preview状态来自Brief或项目状态；
- Studio Readiness Checklist允许导入后完成，但加工前必须完成；
- 只有SVG/PDF被描述为Studio主要输入；
- 不声称xTool Studio自动读取Brief或Checker JSON；
- Verified Export显示“通过MakerFlow当前规则，不代表保证加工成功。”
- Design Spec只作为内部single source of truth，不提供普通JSON编辑器；
- 浏览器作品区直接显示当前SVG DOM，不使用Canvas或PNG替代；
- 修改标题、三条步骤、宽高、版式、主色、图标或刀线后，当前SVG立即重新渲染；
- Preflight检查Create & Edit当前SVG和当前revision，而不是预写Mock SVG；
- PNG/JPG只作为插图素材，不实现图片转SVG；
- 上传SVG经过安全净化，不声明与AImake原生集成；

## 3. 研究理解验收

以下结果必须区分“独立完成”“提示后完成”和“未完成”，不能只记录最终是否完成。

1. **识别缺失字段**：受试者无需诱导即可定位至少一个故意缺失的关键字段，并说明它阻止Brief确认。
2. **区分暂定与确认**：受试者能够解释暂定不是最终事实，并正确处理关键字段的确认状态。
3. **识别BLOCK**：受试者能够说明BLOCK需要在导入前停止。
4. **找到修复位置**：受试者能够找到责任方、解决位置和Next Step，并执行重新检查。
5. **区分SVG与Studio**：受试者不会把材料、设备、加工参数和Preview归为SVG File Check已验证内容。
6. **理解PASS边界**：受试者能够说明PASS只表示通过当前规则，仍需Studio设置、Preview/Framing或试样及人工确认。

## 4. 不能作为验收结论

- 不以一次演示声称MakerFlow减少了返工或提升加工成功率；
- 不以Mock结果证明具体SVG规则高频；
- 不以本Demo证明xTool Studio真实导入行为；
- 不以任务完成证明长期使用或付费意愿。
