const escapeXml = (value = "") => String(value).replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;"
})[char]);

const numberValue = (value, fallback) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const fieldValue = (brief, id, fallback = "") => brief?.fields?.find(field => field.id === id)?.value ?? fallback;
const DEFAULT_ELEMENTS={"title":{id:"title",position:{x:0,y:0},draggable:true,locked:false},"step-1":{id:"step-1",position:{x:0,y:0},draggable:true,locked:false},"step-2":{id:"step-2",position:{x:0,y:0},draggable:true,locked:false},"step-3":{id:"step-3",position:{x:0,y:0},draggable:true,locked:false},"footer":{id:"footer",position:{x:0,y:0},draggable:true,locked:false},"visual-elements":{id:"visual-elements",position:{x:0,y:0},draggable:true,locked:false},"cutline":{id:"cutline",position:{x:0,y:0},draggable:false,locked:true},"artboard":{id:"artboard",position:{x:0,y:0},draggable:false,locked:true}};
const MOMORAY_HEIGHT_STEPS=[
  {id:"step-1",title:"0片 · 15 cm",body:"感觉偏高时，可减少垫片",insert_count:0,pillow_height:{value:15,unit:"cm"}},
  {id:"step-2",title:"1片 · 16 cm",body:"标准配置，适合作为默认起点",insert_count:1,pillow_height:{value:16,unit:"cm"}},
  {id:"step-3",title:"2片 · 17 cm",body:"感觉偏低时，可增加垫片",insert_count:2,pillow_height:{value:17,unit:"cm"}}
];
const elementPosition=(spec,id)=>spec.elements?.[id]?.position||{x:0,y:0};

export function buildDesignSpecFromBrief(brief, plan = {}, baseSpec = {}) {
  const finishedSize = brief?.finished_size || {};
  const width = numberValue(finishedSize.width ?? fieldValue(brief, "finished_width", fieldValue(brief, "dimensions_width", baseSpec.canvas?.width)), 148);
  const height = numberValue(finishedSize.height ?? fieldValue(brief, "finished_height", fieldValue(brief, "dimensions_height", baseSpec.canvas?.height)), 105);
  const unit = finishedSize.unit || fieldValue(brief, "finished_unit", fieldValue(brief, "dimensions_unit", baseSpec.canvas?.unit || "mm"));
  const visualRequirement = brief?.visual_aid_requirement || {};
  const visualPlan = plan.visual_elements || {};
  const visualEnabled = visualPlan.enabled ?? visualRequirement.status === "required";
  return {
    schema_version: "1.1",
    design_spec_revision: Number(baseSpec.design_spec_revision || 1),
    project_id: "momoray-insert-card",
    brief_revision: Number(brief?.brief_revision || 1),
    canvas: { width, height, unit },
    content: {
      title: baseSpec.content?.title || "MomoRay 高度调节说明",
      steps: structuredClone(baseSpec.content?.steps || MOMORAY_HEIGHT_STEPS),
      footer: baseSpec.content?.footer || "请根据实际使用感受调整模块组合"
    },
    layout: { template_id: plan.template_id || baseSpec.layout?.template_id || "three-column" },
    style: { primary_color: baseSpec.style?.primary_color || "#333333", background_color: "#ffffff" },
    icons: baseSpec.icons || { "step-1": "pillow-low", "step-2": "pillow-medium", "step-3": "pillow-high" },
    elements: structuredClone(baseSpec.elements || DEFAULT_ELEMENTS),
    visual_elements: {
      enabled: visualEnabled,
      type: visualPlan.type || (visualRequirement.preferred_type !== "let_system_recommend" ? visualRequirement.preferred_type : "structural_diagram") || "structural_diagram",
      purpose: visualPlan.purpose || visualRequirement.purposes || [],
      asset_source: visualPlan.asset_source || "makerflow_template",
      variant_id: visualPlan.variant_id || "module-combination-linear"
    },
    illustration: baseSpec.illustration || { enabled: false, asset_id: null },
    cutline: { required: true, enabled: baseSpec.cutline?.enabled ?? true, id: "cutline" },
    output_requirements: {
      pure_vector: baseSpec.output_requirements?.pure_vector ?? true,
      text_strategy: baseSpec.output_requirements?.text_strategy || "editable",
      required_format: "svg"
    },
    source: baseSpec.source || { type: "makerflow_template", label: "MakerFlow模板生成" }
  };
}

function visualElementMarkup(spec) {
  const visual = spec.visual_elements;
  if (!visual?.enabled) return "";
  const { width, height } = spec.canvas;
  const color = escapeXml(spec.style.primary_color);
  const x = width * .69, y = height * .055, w = width * .23, h = height * .17;
  let content = "";
  if (visual.type === "icon") {
    content = `<circle cx="${x + w * .5}" cy="${y + h * .5}" r="${h * .34}" fill="#f0f0ed" stroke="${color}"/><path d="M ${x+w*.34} ${y+h*.54} Q ${x+w*.5} ${y+h*.25} ${x+w*.66} ${y+h*.54} V ${y+h*.68} H ${x+w*.34} Z" fill="none" stroke="${color}" stroke-width="1.2"/>`;
  } else if (visual.type === "simple_illustration") {
    content = `<rect x="${x+w*.14}" y="${y+h*.47}" width="${w*.72}" height="${h*.34}" rx="3" fill="#ededE9" stroke="${color}"/><path d="M ${x+w*.2} ${y+h*.47} Q ${x+w*.5} ${y+h*.12} ${x+w*.8} ${y+h*.47}" fill="none" stroke="${color}" stroke-width="1.2"/><circle cx="${x+w*.5}" cy="${y+h*.29}" r="${h*.08}" fill="${color}"/>`;
  } else if (visual.type === "decorative_pattern") {
    content = [0,1,2,3].map(i => `<circle cx="${x+w*(.18+i*.21)}" cy="${y+h*.5}" r="${h*(.13+i*.025)}" fill="none" stroke="${color}" stroke-width="1"/>`).join("");
  } else {
    content = [0,1,2].map(i => `<g transform="translate(${x+i*w*.31} ${y})"><rect x="0" y="${h*(.56-i*.12)}" width="${w*.24}" height="${h*.28}" rx="2" fill="#efefec" stroke="${color}"/><line x1="${w*.04}" y1="${h*(.69-i*.12)}" x2="${w*.2}" y2="${h*(.69-i*.12)}" stroke="${color}"/></g>`).join("") + `<path d="M ${x+w*.08} ${y+h*.28} H ${x+w*.78}" stroke="${color}" stroke-width="1" marker-end="url(#arrow)"/>`;
  }
  const pos=elementPosition(spec,"visual-elements");
  return `<g id="visual-aid" data-element-id="visual-elements" data-element-type="${escapeXml(visual.type)}" data-draggable="true" transform="translate(${pos.x} ${pos.y})" role="button" tabindex="0"><defs><marker id="arrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0 0 L5 2.5 L0 5 Z" fill="${color}"/></marker></defs>${content}</g>`;
}

function iconMarkup(icon, x, y, size, color) {
  if (!icon) return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="2" fill="none" stroke="${escapeXml(color)}"/>`;
  return `<g transform="translate(${x} ${y}) scale(${size / 24})" fill="none" stroke="${escapeXml(color)}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${icon.paths.map(path => `<path d="${escapeXml(path)}"/>`).join("")}</g>`;
}

function illustrationMarkup(spec, assets, bounds) {
  if (!spec.illustration?.enabled || !spec.illustration.asset_id) return "";
  const asset = assets.find(item => item.id === spec.illustration.asset_id);
  if (!asset) return "";
  if (asset.kind === "png" || asset.kind === "jpg") {
    return `<image id="illustration-image" x="${bounds.x}" y="${bounds.y}" width="${bounds.width}" height="${bounds.height}" preserveAspectRatio="xMidYMid meet" href="${escapeXml(asset.dataUrl)}" data-source="${escapeXml(asset.source)}"/>`;
  }
  return `<g id="illustration-vector" transform="translate(${bounds.x} ${bounds.y})" data-source="${escapeXml(asset.source)}">${asset.svgContent || ""}</g>`;
}

function threeColumn(spec, icons, assets) {
  const { width, height } = spec.canvas;
  const margin = width * 0.075;
  const gap = width * 0.035;
  const cardWidth = (width - margin * 2 - gap * 2) / 3;
  const top = height * 0.31;
  return `<g id="layer-steps" data-layout="three-column">${spec.content.steps.map((step, index) => {
    const x = margin + index * (cardWidth + gap);
    const icon = icons.find(item => item.id === spec.icons[step.id]);
    const pos=elementPosition(spec,step.id);return `<g id="${escapeXml(step.id)}" data-element-id="${escapeXml(step.id)}" data-draggable="true" transform="translate(${x+pos.x} ${top+pos.y})"><rect width="${cardWidth}" height="${height * 0.46}" rx="2" fill="#f4f4f2" stroke="#b5b5af"/>${iconMarkup(icon, cardWidth / 2 - 7, 5, 14, spec.style.primary_color)}<text x="${cardWidth / 2}" y="24" text-anchor="middle" font-size="5" font-weight="700" fill="${escapeXml(spec.style.primary_color)}">${escapeXml(step.title)}</text><text x="${cardWidth / 2}" y="32" text-anchor="middle" font-size="3.4" fill="#555">${escapeXml(step.body)}</text></g>`;
  }).join("")}${illustrationMarkup(spec, assets, { x: width * .75, y: height * .08, width: width * .17, height: height * .17 })}</g>`;
}

function verticalSteps(spec, icons, assets) {
  const { width, height } = spec.canvas;
  const left = width * .12;
  const top = height * .29;
  const rowHeight = height * .19;
  return `<g id="layer-steps" data-layout="vertical-steps">${spec.content.steps.map((step, index) => {
    const y = top + index * rowHeight;
    const icon = icons.find(item => item.id === spec.icons[step.id]);
    const pos=elementPosition(spec,step.id);return `<g id="${escapeXml(step.id)}" data-element-id="${escapeXml(step.id)}" data-draggable="true" transform="translate(${left+pos.x} ${y+pos.y})">${iconMarkup(icon, 0, 0, 13, spec.style.primary_color)}<text x="19" y="5" font-size="5" font-weight="700" fill="${escapeXml(spec.style.primary_color)}">${escapeXml(step.title)}</text><text x="19" y="12" font-size="3.7" fill="#555">${escapeXml(step.body)}</text><line x1="19" y1="17" x2="${width * .67}" y2="17" stroke="#d0d0ca"/></g>`;
  }).join("")}${illustrationMarkup(spec, assets, { x: width * .76, y: height * .34, width: width * .16, height: height * .28 })}</g>`;
}

export function renderSvgString(spec, options = {}) {
  const revision = options.revision ?? 1;
  const icons = options.icons || [];
  const assets = options.assets || [];
  const { width, height, unit } = spec.canvas;
  const layout = spec.layout.template_id === "vertical-steps" ? verticalSteps(spec, icons, assets) : threeColumn(spec, icons, assets);
  const cutline = spec.cutline.enabled ? `<path id="cutline" data-element-id="cutline" data-draggable="false" data-role="cutline" d="M 1 1 H ${width - 1} V ${height - 1} H 1 Z" fill="none" stroke="#777" stroke-width="0.3" stroke-dasharray="2 1"/>` : "";
  const footerPos=elementPosition(spec,"footer"),titlePos=elementPosition(spec,"title");
  const footer = `<g id="footer" data-element-id="footer" data-draggable="true" transform="translate(${footerPos.x} ${footerPos.y})"><text x="${width*.5}" y="${height*.94}" text-anchor="middle" font-size="3.2" fill="#666">${escapeXml(spec.content.footer || "")}</text></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}${escapeXml(unit)}" height="${height}${escapeXml(unit)}" viewBox="0 0 ${width} ${height}" data-design-revision="${revision}" role="img" aria-labelledby="design-title design-description"><title id="design-title">${escapeXml(spec.content.title)}</title><desc id="design-description">MomoRay模块化枕头包装内高度调节说明卡</desc><rect id="background" data-element-id="artboard" data-draggable="false" width="${width}" height="${height}" fill="${escapeXml(spec.style.background_color)}"/><g id="layer-title" data-element-id="title" data-draggable="true" transform="translate(${titlePos.x} ${titlePos.y})"><text x="${width * .075}" y="${height * .14}" font-size="8" font-weight="700" fill="${escapeXml(spec.style.primary_color)}">${escapeXml(spec.content.title)}</text><line x1="${width * .075}" y1="${height * .2}" x2="${width * .925}" y2="${height * .2}" stroke="${escapeXml(spec.style.primary_color)}" stroke-width="0.7"/></g>${visualElementMarkup(spec)}${layout}${footer}${cutline}</svg>`;
}

export function downloadTextFile(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
