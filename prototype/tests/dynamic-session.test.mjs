import test from "node:test";
import assert from "node:assert/strict";
import { createPlanPreviewSvg, hydrateCreativePlanPreviews, normalizeCreativePlans } from "../plan-ui-data.js";
import { buildDesignSpecFromBrief, renderSvgString } from "../renderer.js";

const brief = (title, content) => ({
  brief_revision: 2,
  lifecycle: "confirmed",
  fields: [
    { id: "deliverable", value: title, status: "confirmed" },
    { id: "purpose", value: "帮助用户理解并使用作品", status: "confirmed" },
    { id: "must_content", value: content, status: "confirmed" },
    { id: "product_facts", value: "由用户输入提供", status: "confirmed", evidence: ["user_input"] }
  ],
  finished_size: { preset_size: "A6", width: 148, height: 105, unit: "mm", status: "confirmed" }
});

test("Step03 cards use model-provided plans without fixed MomoRay titles", () => {
  const input = { plans: [
    { plan_id: "p-a", title: "咖啡杯环绕雕刻", material: "竹木", process: "旋转轴激光雕刻", time: "38 秒", reason: "适合曲面杯体" },
    { plan_id: "p-b", title: "极简杯身标记", material: "不锈钢", process: "光纤激光打标", time: "22 秒", reason: "高对比且耐磨" },
    { plan_id: "p-c", title: "礼赠图案雕刻", material: "亚克力", process: "矢量雕刻", time: "45 秒", reason: "适合礼品场景" }
  ] };
  const plans = normalizeCreativePlans(input);
  assert.deepEqual(plans.map(item => item.title), ["咖啡杯环绕雕刻", "极简杯身标记", "礼赠图案雕刻"]);
  assert.equal(plans[0].material, "竹木");
  assert.equal(plans[0].previewSvg, "");
  assert.equal(plans.some(item => /MomoRay|工业精密铭牌/.test(item.title)), false);
});

test("plan previews are generated from each plan instead of a shared placeholder", async () => {
  const plans = normalizeCreativePlans({ recommendations: [
    { recommendation_id: "r1", decision_type: "form", suggestion: "咖啡杯弧面刻度", basis: "适配圆柱表面", tradeoff: "需要旋转定位" },
    { recommendation_id: "r2", decision_type: "material_direction", suggestion: "阳极氧化铝铭牌", basis: "耐磨", tradeoff: "成本更高" }
  ] });
  const hydrated = await hydrateCreativePlanPreviews(plans, brief("咖啡杯说明牌", "容量刻度"));
  assert.equal(hydrated.length, 2);
  assert.ok(hydrated.every(item => item.previewSvg.startsWith("<svg")));
  assert.notEqual(hydrated[0].previewSvg, hydrated[1].previewSvg);
  assert.equal(/MomoRay/.test(hydrated[0].previewSvg), false);
});

test("Design Spec and SVG derive title and content from the current brief", () => {
  const currentBrief = brief("咖啡杯激光雕刻说明牌", "清洁步骤、容量刻度和注意事项");
  const spec = buildDesignSpecFromBrief(currentBrief, { selected_plan: { title: "咖啡杯环绕雕刻", template_id: "three-column" } }, {});
  const svg = renderSvgString(spec, { icons: [] });
  assert.equal(spec.content.title, "咖啡杯环绕雕刻");
  assert.match(svg, /咖啡杯环绕雕刻/);
  assert.match(svg, /清洁步骤/);
  assert.match(svg, /容量刻度和注意事项/);
  assert.equal(svg.includes("MomoRay"), false);
  assert.equal(spec.project_id, "makerflow-session");
});
