export const DEMO_MODE = "momoray";

export const MOMORAY_QUESTIONS = [
  {
    id: "momoray-usage",
    field_id: "usage",
    title: "这张说明卡主要用于哪里？",
    options: [
      { label: "包装内说明", value: "package_insert" },
      { label: "桌面展示", value: "desktop_display" },
      { label: "随产品附带", value: "product_included" },
      { label: "由 AI 推荐", value: "ai_recommend" }
    ]
  },
  {
    id: "momoray-style",
    field_id: "style",
    title: "你希望信息呈现更偏向哪种方式？",
    options: [
      { label: "结构对照", value: "comparison" },
      { label: "三步骤说明", value: "three_steps" },
      { label: "极简参数说明", value: "minimal_specs" },
      { label: "由 AI 推荐", value: "ai_recommend" }
    ]
  }
];

export function createMomoRayBrief() {
  return {
    brief_revision: 1,
    lifecycle: "confirmed",
    confirmed: true,
    fields: [
      { id: "deliverable", label: "作品类型", value: "MomoRay 高度调节说明卡", status: "confirmed", critical: true, source: "momoray_demo" },
      { id: "purpose", label: "用途", value: "解释模块组合与对应枕高", status: "confirmed", critical: true, source: "momoray_demo" },
      { id: "must_content", label: "必须内容", value: "三种高度配置、垫片数量、15 / 16 / 17 cm 枕高和偏高/合适/偏低调整提示", status: "confirmed", critical: true, source: "momoray_demo" },
      { id: "product_facts", label: "产品事实", value: "0片垫片 → 15cm；1片垫片 → 16cm；2片垫片 → 17cm", status: "confirmed", critical: true, source: "momoray_demo" },
      { id: "material_direction", label: "材料", value: "卡纸或亚克力", status: "confirmed", critical: false, source: "momoray_demo" },
      { id: "usage", label: "使用场景", value: "包装内说明卡", status: "confirmed", critical: false, source: "momoray_demo" },
      { id: "style", label: "信息呈现", value: "结构对照", status: "confirmed", critical: false, source: "momoray_demo" }
    ],
    finished_size: { preset_size: "A6", width: 148, height: 105, unit: "mm", status: "confirmed", source: "momoray_demo" },
    visual_aid_requirement: { status: "required", purposes: ["explain_structure", "explain_steps"], field_status: "confirmed" }
  };
}

export function createMomoRayCreativePlan() {
  const plans = [
    { id: "momoray-plan-01", title: "工业精密说明牌", material: "亚克力卡纸", process: "激光雕刻", time: "42s", reason: "高对比结构标注，适合包装内快速理解。", previewImage: "./assets/plan-industrial.png" },
    { id: "momoray-plan-02", title: "三栏高度对照说明卡", material: "哑光卡纸", process: "激光切割与雕刻", time: "55s", reason: "将0/1/2片与15/16/17cm一一对应，阅读路径清晰。", previewImage: "./assets/plan-wood-memorial.png" },
    { id: "momoray-plan-03", title: "极简步骤说明卡", material: "白色涂布卡纸", process: "单色激光雕刻", time: "38s", reason: "信息密度低，突出调整步骤和实际枕高。", previewImage: "./assets/plan-acrylic-sign.png" }
  ];
  const recommendations = [
    { recommendation_id: "momoray-form", decision_type: "form", suggestion: "三栏高度对照说明卡", basis: "Demo固定结构", tradeoff: "信息完整但版面较密", confidence: 1 },
    { recommendation_id: "momoray-visual", decision_type: "visual_aid", suggestion: "使用结构图标辅助三种配置", basis: "Demo固定结构", tradeoff: "需要保持图标简洁", confidence: 1 }
  ];
  return {
    plan_id: "momoray-demo-plan",
    source_brief_revision: 1,
    recommendations,
    plans,
    provider: { name: "local-demo", model: "momoray-demo", prompt_version: "demo" }
  };
}
