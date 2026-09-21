import { buildDesignSpecFromBrief, renderSvgString } from "./renderer.js";

const toSvgDataUrl = svg => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export function createPlanPreviewSvg(plan = {}, brief = {}) {
  const spec = buildDesignSpecFromBrief(brief, { selected_plan: plan }, {});
  return renderSvgString(spec, { icons: [] });
}

export function svgToPngDataUrl(svg) {
  if (typeof document === "undefined" || !svg) return Promise.resolve("");
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth || 1200;
      canvas.height = image.naturalHeight || 900;
      const context = canvas.getContext("2d");
      if (!context) return resolve("");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => resolve("");
    image.src = toSvgDataUrl(svg);
  });
}

export async function hydrateCreativePlanPreviews(plans = [], brief = {}) {
  return Promise.all(plans.map(async plan => {
    // Always render from this plan so regenerated cards cannot share a stale preview.
    const previewSvg = createPlanPreviewSvg(plan, brief);
    const previewImage = await svgToPngDataUrl(previewSvg);
    return { ...plan, previewSvg, previewImage, preview: previewImage || toSvgDataUrl(previewSvg) };
  }));
}

export function normalizeCreativePlans(plan = {}) {
  const modelPlans = Array.isArray(plan.plans) ? plan.plans : [];
  const recommendations = Array.isArray(plan.recommendations) ? plan.recommendations : [];
  const source = modelPlans.length ? modelPlans : recommendations.slice(0, 3);
  return source.map((item, index) => {
    const title = item.title || item.name || item.suggestion || `制造方案 ${index + 1}`;
    return {
      id: item.plan_id || item.id || item.recommendation_id || `plan-${index + 1}`,
      title,
      previewSvg: item.previewSvg || item.preview_svg || "",
      previewImage: item.previewImage || item.preview_image || "",
      preview: item.previewImage || item.preview_image || item.previewSvg || item.preview_svg || "",
      material: item.material || item.material_direction || "由方案建议",
      process: item.process || item.manufacturing_process || item.decision_type || "由方案建议",
      time: item.time || item.estimated_time || "由方案估算",
      reason: item.reason || item.basis || "基于当前 Brief 与制造约束生成",
      selected: false,
      recommendationId: item.recommendation_id || null
    };
  });
}
