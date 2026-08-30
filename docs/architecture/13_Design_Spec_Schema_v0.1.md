# MakerFlow Design Spec Schema v0.1

> Status: Draft  
> Object: `design_spec`  
> Role: MakerFlow-native路径的内部创作事实来源；External SVG路径不适用该绝对表述  
> Current implementation: 当前Demo已有本地Design Spec与SVG Renderer，但字段结构尚未完全迁移到本规范

## 1. Purpose

Design Spec把confirmed Brief与accepted Creative Plan转换为可编辑、可渲染、可检查的作品结构。它服务于T07 Build Design Spec、T08 Render SVG和T09 Edit Draft。

用户通过结构化控件和Controlled Direct Manipulation编辑作品；用户不直接编辑Design Spec JSON。每次有效修改更新Design Spec revision，随后由本地SVG Renderer重新生成当前SVG，并使旧Preflight结果失效。

## 2. Schema边界

### 必须包含

- Schema版本、Design Spec revision和作品类型；
- 成品画板；
- 布局模板；
- 内容块；
- 视觉元素；
- 调色板；
- 与文件交付有关的生产要求。

### 明确不得包含

- 用户访谈、研究原话或研究者解释；
- 原始产品事实；
- Studio功率、速度、次数及安全参数；
- Preview、Framing或设备执行状态；
- Preflight issues、结果或报告；
- Agent运行日志、完整Prompt或模型隐藏推理；
- 将AI Recommendation冒充为人工确认事实的字段。

## 3. v0.1逻辑Schema

```yaml
schema_version: string
design_spec_revision: integer
artifact_type: svg

artboard:
  preset: string
  width: number
  height: number
  unit: string

layout:
  template_id: string

content_blocks:
  - id: string
    type: string
    role: string
    text: string
    position:
      x: number
      y: number
    draggable: boolean
    locked: boolean

visual_elements:
  - id: string
    type: string
    purpose: string | string[]
    asset_source: string
    position:
      x: number
      y: number
    draggable: boolean
    locked: boolean

palette:
  primary: string
  text: string
  background: string

production_requirements:
  output_formats: string[]
  pure_vector_required: boolean
  text_policy: string
  cutline_required: boolean
```

本文件描述产品级逻辑Schema，不等同于已经创建并运行的JSON Schema验证器。

## 4. 字段定义

### 4.1 Root

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `schema_version` | string | 是 | Design Spec Schema版本；与Demo现有`1.1`如何迁移为v0.1命名体系`[待确认]` |
| `design_spec_revision` | integer | 是 | Design Spec修订号；初始值及递增起点`[待确认]` |
| `artifact_type` | string | 是 | 当前MVP固定为`svg`；未来允许值`[待确认]` |

Design Spec revision与Artifact Revision必须分离：`design_spec_revision`表示设计意图变化；`artifact_revision`表示实际交付物内容变化，归Artifact Manager / rendered artifact state所有。Artifact必须记录`source_design_spec_revision`。

### 4.2 `artboard`

| 字段 | 类型 | 必填 | 规则 |
|---|---|---:|---|
| `preset` | string | 是 | 当前支持`A6`和`custom`；完整枚举`[待确认]` |
| `width` | number | 是 | 必须大于0 |
| `height` | number | 是 | 必须大于0 |
| `unit` | string | 是 | 当前场景使用`mm`；完整允许单位`[待确认]` |

当前规则：

- `preset = A6`时映射为`148 × 105 mm`；
- 前台以“成品尺寸”组合字段展示，不让preset、width、height和unit分别拥有冲突状态；
- `preset = custom`时才要求用户分别填写成品宽度和成品高度；
- 用户端不显示“画板宽度/画板高度”，内部仍可使用`artboard`术语。

### 4.3 `layout`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `template_id` | string | 是 | 引用本地可用布局模板；当前Demo的完整允许值以`layout_templates.json`为准 |

Renderer只执行模板，不负责重新决定创意方向。模板不存在或不支持时应失败，不应静默选择另一个模板。

### 4.4 `content_blocks[]`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `id` | string | 是 | 当前Design Spec内唯一；ID格式`[待确认]` |
| `type` | string | 是 | 内容结构类型；正式枚举`[待确认]` |
| `role` | string | 是 | 语义角色，如title、step、footer；正式枚举`[待确认]` |
| `text` | string | 是 | 当前显示文字；空值是否允许由role规则决定`[待确认]` |
| `position.x` | number | 是 | 作品内部坐标 |
| `position.y` | number | 是 | 作品内部坐标 |
| `draggable` | boolean | 是 | 是否允许Controlled Direct Manipulation |
| `locked` | boolean | 是 | 是否锁定位置或编辑行为 |

当前MVP至少映射：

- title group；
- step_1 group；
- step_2 group；
- step_3 group；
- footer group。

允许拖动整个group，不允许拖动单个字符、SVG path anchor或贝塞尔控制点。拖动采用8px网格吸附，并防止元素完全移出artboard。

### 4.5 `visual_elements[]`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `id` | string | 是 | 当前Design Spec内唯一 |
| `type` | string | 是 | 当前可能包括icon、structural_diagram、simple_illustration、decorative_pattern；最终枚举`[待确认]` |
| `purpose` | string或string[] | 是 | 当前Demo使用数组；正式类型`[待确认]` |
| `asset_source` | string | 是 | 例如MakerFlow模板、用户上传或外部工具素材；完整枚举`[待确认]` |
| `position` | object | 是 | 包含`x`和`y` |
| `draggable` | boolean | 是 | 当前视觉辅助group允许拖动 |
| `locked` | boolean | 是 | 锁定时不允许拖动 |

视觉辅助正确链路：

```text
Brief记录是否需要视觉辅助
→ Creative Plan给出方向建议
→ 用户接受
→ Design Spec固化visual_elements
→ SVG Renderer生成作品元素
→ 用户编辑后实时重渲染
→ Preflight检查当前SVG
```

不得实现为“图片生成→图片转SVG→Preflight”。PNG/JPG只作为素材或参考。

### 4.6 `palette`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `primary` | string | 是 | 当前主色；颜色格式规则`[待确认]` |
| `text` | string | 是 | 正文颜色；默认值政策`[待确认]` |
| `background` | string | 是 | 背景颜色；默认值政策`[待确认]` |

Renderer应按Design Spec使用颜色，不应自行决定品牌色或覆盖用户选择。

### 4.7 `production_requirements`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `output_formats` | object[] | 是 | 每项至少包含`format`与`requirement_level`；当前PDF生成不受支持，但要求本身不得被删除 |
| `pure_vector_required` | boolean | 是 | 用于Brief Consistency Check，不代表材料或加工安全 |
| `text_policy` | string | 是 | 当前可表示editable等策略；正式枚举`[待确认]` |
| `cutline_required` | boolean | 是 | 是否要求刀线；不包含机器切割参数 |

`production_requirements`只描述交付文件要求，不保存设备、材料、功率、速度、次数或安全参数。

## 5. 最小有效性规则

1. `schema_version`、`design_spec_revision`、`artifact_type`存在。
2. `artifact_type`在当前MVP中必须为`svg`。
3. `artboard.width`和`artboard.height`为大于0的有限数字。
4. `artboard.preset = A6`时尺寸为`148 × 105 mm`。
5. `layout.template_id`必须能解析到本地模板。
6. `content_blocks[].id`与`visual_elements[].id`在各自集合中唯一；是否要求跨集合全局唯一为`[待确认]`。
7. 每个position包含有限数值`x`与`y`。
8. `locked = true`时UI不得执行拖动。
9. `cutline_required`只表达作品要求，不表达Studio操作已完成。
10. Schema或硬约束失败时T07/T08必须BLOCK，不允许Renderer猜测缺失值。

## 6. Revision与Preflight失效

以下动作产生新`design_spec_revision`；随后成功渲染时产生独立的新`artifact_revision`：

- 修改标题、步骤或页脚；
- 修改成品尺寸或布局模板；
- 修改颜色；
- 开关或修改视觉辅助元素；
- 拖动可编辑group；
- 开关刀线要求或当前作品中的刀线元素；
- 重置布局或执行Undo后形成不同的当前Spec。

产生新Design Spec revision并重新渲染后：

1. 本地Renderer重新生成SVG；
2. 当前SVG界面立即刷新；
3. 原Preflight Report因`checked_artifact_revision`不再指向当前Artifact而标记stale；
4. 原WARN确认失效；
5. 页面提示“布局或作品已修改，需要重新Preflight”。

Undo是否恢复旧revision编号或始终创建新revision为`[待确认]`；建议始终创建新revision，以避免复用旧检查资格。

## 7. 当前Demo字段映射

| 当前Demo字段 | v0.1字段 | 处理方式 |
|---|---|---|
| `canvas.width/height/unit` | `artboard.width/height/unit` | 重命名并补`preset` |
| `content.title` | `content_blocks[]`中的title | 结构化展开 |
| `content.steps[]` | `content_blocks[]`中的step groups | 合并文字与元素位置 |
| `content.footer` | `content_blocks[]`中的footer | 结构化展开 |
| `elements.*.position/draggable/locked` | 对应block/visual element字段 | 合并到元素本身 |
| `layout.template_id` | `layout.template_id` | 保持 |
| `style.primary_color` | `palette.primary` | 重命名 |
| `style.background_color` | `palette.background` | 重命名 |
| 当前未独立保存text color | `palette.text` | 值与默认政策`[待确认]` |
| `visual_elements`对象 | `visual_elements[]`数组 | 标准化为元素集合 |
| `output_requirements.pure_vector` | `production_requirements.pure_vector_required` | 重命名 |
| `output_requirements.text_strategy` | `production_requirements.text_policy` | 重命名 |
| `output_requirements.required_format` | `production_requirements.output_formats[]` | 单值转数组 |
| `cutline.required` | `production_requirements.cutline_required` | 要求与当前显示状态分离 |
| `source` | Artifact Revision来源 | 不作为核心Design Spec字段；最终归属`[待确认]` |

迁移应使用适配器或显式migration，不应一次性重写Renderer和编辑器。迁移实现不属于本草案交付。

## 8. 示例Design Spec

以下示例只使用当前已有依据；尚未确定的规范处保留标记。

```json
{
  "schema_version": "0.1",
  "design_spec_revision": 1,
  "artifact_type": "svg",
  "artboard": {
    "preset": "A6",
    "width": 148,
    "height": 105,
    "unit": "mm"
  },
  "layout": {
    "template_id": "three-column"
  },
  "content_blocks": [
    {
      "id": "title",
      "type": "text_group",
      "role": "title",
      "text": "MomoRay 高度调节说明",
      "position": { "x": 0, "y": 0 },
      "draggable": true,
      "locked": false
    }
  ],
  "visual_elements": [
    {
      "id": "visual-aid-main",
      "type": "structural_diagram",
      "purpose": ["explain_structure", "explain_steps"],
      "asset_source": "makerflow_template",
      "position": { "x": 0, "y": 0 },
      "draggable": true,
      "locked": false
    }
  ],
  "palette": {
    "primary": "#333333",
    "text": "[待确认]",
    "background": "#ffffff"
  },
  "production_requirements": {
    "output_formats": [
      {"format": "svg", "requirement_level": "required"},
      {"format": "pdf", "requirement_level": "required"}
    ],
    "pure_vector_required": true,
    "text_policy": "editable",
    "cutline_required": true
  }
}
```

## 9. Non-goals

- 不定义完整Illustrator式矢量模型；
- 不支持Resize、Rotate、多选、Z-index管理或SVG anchor editing；
- 不定义通用Prompt-to-image输入；
- 不保存Studio实时数据；
- 不承诺PDF导出；
- 不定义AImake或xTool Studio原生交接；
- 不声明PASS等于生产就绪或加工成功。
