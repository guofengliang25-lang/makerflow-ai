# MakerFlow v0.2 SVG-first低保真Demo

## 产品定位

MakerFlow面向初级创作者，把模糊想法转成结构化设计约束，生成可编辑SVG草稿，并在导出前完成确定性预检和问题路由。

本MVP只处理“MomoRay模块化枕头包装内高度调节说明卡”。它不是通用AI图片生成器，也不是完整矢量编辑器。

## 核心链路

```text
Creative Brief
→ Creative Plan
→ 内部Build Design Spec
→ SVG Renderer
→ 浏览器直接显示当前SVG作品
→ 结构化控件修改Design Spec
→ SVG实时重新渲染
→ 对当前SVG执行Preflight
→ Resolve Issues
→ Export & Handoff
```

Design Spec是MakerFlow内部single source of truth，不是用户编辑JSON的界面。SVG是用户看到的当前作品和主要交付文件。PNG/JPG只可作为插图素材，不存在图片转SVG流程。

## 本地运行

在`projects/MakerFlow-AI`目录运行：

```powershell
py -m http.server 8000 -d prototype
```

访问：

```text
http://localhost:8000/
```

内部QA模式：

```text
http://localhost:8000/?qa=1
```

QA的BLOCK/WARN/PASS只向当前SVG副本注入测试缺陷，检查结果仍由真实Preflight引擎计算。普通访问不显示QA切换器。

## GitHub Pages部署

1. 将仓库推送到GitHub；
2. 在Pages设置中选择静态分支部署；
3. 将发布目录指向包含`prototype/`的分支；
4. 访问`https://<user>.github.io/<repo>/prototype/`。

所有数据请求使用`./data/...`相对路径，兼容仓库子路径。无需构建命令、后端或环境变量。

## Netlify部署

- Base directory：项目根目录或留空；
- Build command：留空；
- Publish directory：`projects/MakerFlow-AI/prototype`（若MakerFlow目录本身为站点根，则填`prototype`）。

这是纯静态站点，不需要Functions或API代理。

## Preflight范围

SVG File Check检查当前编辑区SVG的解析、width/height、viewBox、text、image、重复ID、空元素及cutline闭合状态。

Brief Consistency Check比较当前SVG和已确认Brief的尺寸、纯矢量要求、文字策略和cutline要求。

Studio Readiness Checklist只读取`project_state.json`中的设备、材料、加工参数、Preview和Framing状态，不从SVG推测。

## 上传边界

- 支持上传完整SVG草稿；
- 支持PNG/JPG/SVG作为插图素材；
- 上传SVG会移除脚本、事件属性、`foreignObject`和危险外链；
- AImake只是一种用户标注的素材来源，MakerFlow不调用AImake API，也不声明原生集成；
- 复杂外部SVG只支持有限结构化编辑，必要时路由到Illustrator等工具。

## xTool边界

- 不调用真实AImake或xTool Studio；
- 不控制设备；
- 不自动决定材料、功率、速度、次数和安全参数；
- Brief、内部Design Spec和Preflight报告不会被xTool Studio自动读取；
- SVG/PDF才是主要交付；
- “通过MakerFlow当前规则”不代表保证加工成功。

## 自动测试

无需`package.json`，使用Node内置测试运行器：

```powershell
node --test prototype/tests/*.test.mjs
```
