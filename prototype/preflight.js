const issue = (data) => ({
  issue_id: data.issue_id,
  title: data.title,
  severity: data.severity,
  resolution_stage: data.resolution_stage,
  owner: data.owner,
  can_continue: data.can_continue,
  evidence: data.evidence,
  next_steps: data.next_steps,
  edit_target: data.edit_target || null,
  resolution_capability: data.resolution_capability || "external"
});

const attr = (source, name) => source.match(new RegExp(`\\s${name}=["']([^"']*)["']`, "i"))?.[1] ?? null;
const tags = (svg, tag) => [...svg.matchAll(new RegExp(`<${tag}\\b([^>]*)>(?:[\\s\\S]*?<\\/${tag}>)?|<${tag}\\b([^>]*)\\/>`, "gi"))];
const briefValue = (brief, id) => brief?.fields?.find(field => field.id === id)?.value;
const statusFromIssues = issues => issues.some(item => item.severity === "block") ? "block" : issues.some(item => item.severity === "warn") ? "warn" : "pass";

export function inspectSvgString(svgString) {
  const root = svgString.match(/<svg\b([^>]*)>/i);
  const parserError = !root || !/<\/svg>\s*$/i.test(svgString.trim());
  const rootAttrs = root?.[1] || "";
  const ids = [...svgString.matchAll(/\sid=["']([^"']+)["']/gi)].map(match => match[1]);
  const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  const pathElements = [...svgString.matchAll(/<path\b([^>]*)\/?\s*>/gi)].map(match => match[1]);
  const emptyElements = [];
  pathElements.forEach((attrs, index) => { if (!(attr(` ${attrs}`, "d") || "").trim()) emptyElements.push(`path[${index}]`); });
  const textElements = tags(svgString, "text");
  textElements.forEach((match, index) => { if (!match[0].replace(/<[^>]+>/g, "").trim()) emptyElements.push(`text[${index}]`); });
  const imageElements = [...svgString.matchAll(/<image\b([^>]*)\/?\s*>/gi)];
  imageElements.forEach((match, index) => { if (!attr(` ${match[1]}`, "href") && !attr(` ${match[1]}`, "xlink:href")) emptyElements.push(`image[${index}]`); });
  const cutlineMatch = svgString.match(/<(path|rect|circle|ellipse|polygon|polyline)\b([^>]*(?:id=["']cutline["']|class=["'][^"']*cutline[^"']*["']|data-role=["']cutline["'])[^>]*)\/?\s*>/i);
  let cutlineClosed = false;
  if (cutlineMatch) {
    const type = cutlineMatch[1].toLowerCase();
    cutlineClosed = ["rect", "circle", "ellipse", "polygon"].includes(type) || (type === "path" && /z\s*$/i.test(attr(` ${cutlineMatch[2]}`, "d") || ""));
  }
  return {
    parserError,
    width: attr(` ${rootAttrs}`, "width"),
    height: attr(` ${rootAttrs}`, "height"),
    viewBox: attr(` ${rootAttrs}`, "viewBox"),
    revision: attr(` ${rootAttrs}`, "data-design-revision"),
    textCount: textElements.length,
    imageCount: imageElements.length,
    duplicateIds,
    emptyElements,
    cutlineFound: Boolean(cutlineMatch),
    cutlineClosed
  };
}

const parseLength = value => {
  const match = String(value || "").trim().match(/^([0-9]+(?:\.[0-9]+)?)(mm|cm|in|pt|pc|px)?$/i);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = (match[2] || "").toLowerCase();
  const factors = { mm: 1, cm: 10, in: 25.4, pt: 25.4 / 72, pc: 25.4 / 6 };
  return { amount, unit, mm: factors[unit] ? amount * factors[unit] : null };
};

function svgFileIssues(inspection, designSpec) {
  const issues = [];
  if (inspection.parserError) issues.push(issue({ issue_id:"SVG-PARSE-001", title:"SVG无法解析", severity:"block", resolution_stage:"in_design_tool", owner:"设计文件负责人", can_continue:false, evidence:"未找到有效且闭合的svg根元素", next_steps:["返回设计工具检查文件结构","重新导出SVG","重新运行Preflight"], resolution_capability:"external" }));
  if (!parseLength(inspection.width)) issues.push(issue({ issue_id:"SVG-WIDTH-001", title:"SVG缺少有效width", severity:"block", resolution_stage:"in_design_tool", owner:"设计文件负责人", can_continue:false, evidence:`svg[width]=${inspection.width ?? "未找到"}`, next_steps:["返回Create & Edit","设置成品宽度","重新渲染并检查"], edit_target:{step:4,field:"canvas-width"}, resolution_capability:"built_in" }));
  if (!parseLength(inspection.height)) issues.push(issue({ issue_id:"SVG-HEIGHT-001", title:"SVG缺少有效height", severity:"block", resolution_stage:"in_design_tool", owner:"设计文件负责人", can_continue:false, evidence:`svg[height]=${inspection.height ?? "未找到"}`, next_steps:["返回Create & Edit","设置成品高度","重新渲染并检查"], edit_target:{step:4,field:"canvas-height"}, resolution_capability:"built_in" }));
  const vb = String(inspection.viewBox || "").trim().split(/[ ,]+/).map(Number);
  if (vb.length !== 4 || vb.some(value => !Number.isFinite(value)) || vb[2] <= 0 || vb[3] <= 0) issues.push(issue({ issue_id:"SVG-VIEWBOX-001", title:"SVG缺少有效viewBox", severity:"block", resolution_stage:"in_design_tool", owner:"设计文件负责人", can_continue:false, evidence:`svg[viewBox]=${inspection.viewBox ?? "未找到"}`, next_steps:["返回Create & Edit重新渲染","或在Illustrator中设置画板后重新导出"], edit_target:{step:4,field:"canvas-width"}, resolution_capability:"built_in" }));
  if (inspection.duplicateIds.length) issues.push(issue({ issue_id:"SVG-DUPLICATE-ID-001", title:"SVG包含重复ID", severity:"block", resolution_stage:"in_design_tool", owner:"设计文件负责人", can_continue:false, evidence:`重复ID：${inspection.duplicateIds.join("、")}`, next_steps:["在Illustrator等外部工具中清理重复ID","重新上传修改后的SVG","重新运行Preflight"], resolution_capability:"external" }));
  if (inspection.emptyElements.length) issues.push(issue({ issue_id:"SVG-EMPTY-001", title:"SVG包含空元素", severity:"warn", resolution_stage:"in_design_tool", owner:"设计文件负责人", can_continue:true, evidence:inspection.emptyElements.join("、"), next_steps:["检查空元素是否必要","在外部工具清理或确认保留","重新运行Preflight"], resolution_capability:"external" }));
  if (designSpec.cutline?.required && !inspection.cutlineFound) issues.push(issue({ issue_id:"SVG-CUTLINE-MISSING-001", title:"缺少必需刀线", severity:"block", resolution_stage:"in_design_tool", owner:"设计文件负责人", can_continue:false, evidence:"未找到#cutline、.cutline或data-role=cutline", next_steps:["返回Create & Edit","开启刀线","重新运行Preflight"], edit_target:{step:4,field:"cutline-enabled"}, resolution_capability:"built_in" }));
  if (designSpec.cutline?.required && inspection.cutlineFound && !inspection.cutlineClosed) issues.push(issue({ issue_id:"SVG-CUTLINE-OPEN-001", title:"刀线未闭合", severity:"block", resolution_stage:"in_design_tool", owner:"设计文件负责人", can_continue:false, evidence:"cutline path未以Z/z闭合，或使用开放polyline", next_steps:["在Illustrator等矢量工具中闭合刀线路径","上传修改后的SVG","重新运行Preflight"], resolution_capability:"external" }));
  return issues;
}

function briefIssues(inspection, brief, designSpec) {
  const issues = [];
  const actualWidth = parseLength(inspection.width);
  const actualHeight = parseLength(inspection.height);
  const expectedWidth = Number(briefValue(brief, "finished_width") || briefValue(brief, "dimensions_width") || designSpec.canvas.width);
  const expectedHeight = Number(briefValue(brief, "finished_height") || briefValue(brief, "dimensions_height") || designSpec.canvas.height);
  if (!actualWidth?.mm || !actualHeight?.mm) {
    issues.push(issue({ issue_id:"BRIEF-UNIT-001", title:"SVG单位无法与Brief安全比较", severity:"warn", resolution_stage:"before_import", owner:"项目负责人", can_continue:true, evidence:`SVG尺寸：${inspection.width} × ${inspection.height}`, next_steps:["确认SVG使用mm、cm、in、pt或pc单位","不要假设px对应固定物理尺寸"], edit_target:{step:4,field:"canvas-unit"}, resolution_capability:"built_in" }));
  } else if (Math.abs(actualWidth.mm - expectedWidth) > .1 || Math.abs(actualHeight.mm - expectedHeight) > .1) {
    issues.push(issue({ issue_id:"BRIEF-SIZE-001", title:"SVG尺寸与Brief不一致", severity:"block", resolution_stage:"in_design_tool", owner:"设计文件负责人", can_continue:false, evidence:`SVG ${actualWidth.mm.toFixed(1)}×${actualHeight.mm.toFixed(1)}mm；Brief ${expectedWidth}×${expectedHeight}mm`, next_steps:["返回Create & Edit","修改画板宽高以匹配Brief","重新运行Preflight"], edit_target:{step:4,field:"canvas-width"}, resolution_capability:"built_in" }));
  }
  if (designSpec.output_requirements?.pure_vector && inspection.imageCount > 0) issues.push(issue({ issue_id:"BRIEF-VECTOR-001", title:"纯矢量要求下存在位图素材", severity:"block", resolution_stage:"in_design_tool", owner:"设计文件负责人", can_continue:false, evidence:`检测到${inspection.imageCount}个image元素`, next_steps:["返回Create & Edit移除PNG/JPG素材","或由用户确认修改Brief的纯矢量要求","重新运行Preflight"], edit_target:{step:4,field:"asset-upload"}, resolution_capability:"built_in" }));
  if (designSpec.output_requirements?.text_strategy === "outlined" && inspection.textCount > 0) issues.push(issue({ issue_id:"BRIEF-TEXT-001", title:"文字策略要求轮廓化但仍存在text", severity:"block", resolution_stage:"in_design_tool", owner:"设计文件负责人", can_continue:false, evidence:`检测到${inspection.textCount}个text元素`, next_steps:["下载当前SVG","在Illustrator等工具中将文字转轮廓","上传修改后的SVG并重新检查"], resolution_capability:"external" }));
  if (brief?.visual_aid_requirement?.status === "required" && !designSpec.visual_elements?.enabled) issues.push(issue({ issue_id:"BRIEF-VISUAL-AID-001", title:"Brief要求视觉辅助，但内建视觉元素已关闭", severity:"warn", resolution_stage:"in_design_tool", owner:"设计文件负责人", can_continue:true, evidence:"brief.visual_aid_requirement.status=required；design_spec.visual_elements.enabled=false", next_steps:["返回Create & Edit确认视觉辅助是否需要","开启视觉辅助或确认由其他SVG元素承担该功能","重新运行Preflight"], edit_target:{step:4,field:"visual-elements"}, resolution_capability:"built_in" }));
  return issues;
}

function studioIssues(projectState) {
  const labels = { device:"设备", material:"材料", processing_parameters:"加工参数", preview:"Preview", framing:"Framing" };
  return Object.entries(labels).flatMap(([key, label]) => {
    const item = projectState[key] || { status:"unknown" };
    const complete = item.status === "completed" || item.status === "confirmed" || item.completed === true;
    if (complete) return [];
    return [issue({ issue_id:`STUDIO-${key.toUpperCase().replace("_", "-")}-001`, title:`${label}尚未完成`, severity:"info", resolution_stage:"in_studio", owner:"Studio操作人员", can_continue:true, evidence:`project_state.${key}.status=${item.status || "unknown"}`, next_steps:[`进入Studio后确认${label} [待实际验证]`,"加工前由操作人员人工确认"], resolution_capability:"external" })];
  });
}

export function runPreflight({ svgString, brief, designSpec, projectState, artifactRevision, revision }) {
  const inspection = inspectSvgString(svgString);
  const svgIssues = svgFileIssues(inspection, designSpec);
  const consistencyIssues = briefIssues(inspection, brief, designSpec);
  const studio = studioIssues(projectState);
  const preImportIssues = [...svgIssues, ...consistencyIssues];
  return {
    checked_artifact_revision: artifactRevision ?? revision,
    checkedRevision: revision,
    checkedAt: new Date().toISOString(),
    checkedSvgHash: simpleHash(svgString),
    result: statusFromIssues(preImportIssues),
    inspection,
    layers: {
      svg: { name:"SVG File Check", status:statusFromIssues(svgIssues), source:"Create & Edit当前SVG", issues:svgIssues },
      brief: { name:"Brief Consistency Check", status:statusFromIssues(consistencyIssues), source:"当前SVG＋已确认Brief", issues:consistencyIssues },
      studio: { name:"Studio Readiness Checklist", status:studio.length ? "info" : "pass", source:"project_state.json", issues:studio }
    },
    issues: [...preImportIssues, ...studio]
  };
}

export function simpleHash(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function applyQaMutation(svgString, mode) {
  if (mode === "block") {
    const existingId = svgString.match(/\sid=["']([^"']+)["']/i)?.[1] || "qa-duplicate";
    return svgString.replace(/<\/svg>\s*$/i, `<path id="${existingId}" d="M 0 0 L 1 1"/></svg>`);
  }
  if (mode === "warn") return svgString.replace(/<\/svg>\s*$/i, '<path id="qa-empty-path" d=""/></svg>');
  return svgString;
}
