import test from "node:test";
import assert from "node:assert/strict";
import {
  inspectSvgString,
  runPreflight,
  applyQaMutation
} from "../preflight.js";

const brief = {
  fields: [
    { id: "finished_width", value: "148", status: "confirmed" },
    { id: "finished_height", value: "105", status: "confirmed" },
    { id: "finished_unit", value: "mm", status: "confirmed" }
  ],
  visual_aid_requirement: { status:"required", purposes:["explain_structure"], preferred_type:"let_system_recommend", field_status:"confirmed" }
};

const spec = {
  canvas: { width: 148, height: 105, unit: "mm" },
  visual_elements: { enabled: true, type: "structural_diagram" },
  output_requirements: { pure_vector: true, text_strategy: "editable", required_format: "svg" },
  cutline: { required: true, enabled: true }
};

const projectState = {
  device: { status: "pending" }, material: { status: "pending" },
  processing_parameters: { status: "pending" }, preview: { status: "pending", completed: false },
  framing: { status: "pending", completed: false }
};

const validSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="148mm" height="105mm" viewBox="0 0 148 105" data-design-revision="3"><text id="title">标题</text><path id="cutline" data-role="cutline" d="M 1 1 H 147 V 104 H 1 Z"/></svg>`;

test("SVG inspection counts text and images and detects duplicate IDs", () => {
  const result = inspectSvgString(validSvg.replace("</svg>", '<image id="title" href="data:image/png;base64,AA=="/></svg>'));
  assert.equal(result.textCount, 1);
  assert.equal(result.imageCount, 1);
  assert.deepEqual(result.duplicateIds, ["title"]);
});

test("preflight passes current SVG structure while keeping Studio tasks separate", () => {
  const result = runPreflight({ svgString: validSvg, brief, designSpec: spec, projectState, revision: 3 });
  assert.equal(result.checkedRevision, 3);
  assert.equal(result.layers.svg.status, "pass");
  assert.equal(result.layers.brief.status, "pass");
  assert.equal(result.layers.studio.status, "info");
  assert.equal(result.result, "pass");
  assert.ok(result.issues.some(issue => issue.issue_id === "STUDIO-DEVICE-001"));
});

test("open cutline and size mismatch are real BLOCK results", () => {
  const bad = validSvg.replace(" H 1 Z", " H 1").replace('width="148mm"', 'width="140mm"');
  const result = runPreflight({ svgString: bad, brief, designSpec: spec, projectState, revision: 3 });
  assert.equal(result.result, "block");
  assert.ok(result.issues.some(issue => issue.issue_id === "SVG-CUTLINE-OPEN-001"));
  assert.ok(result.issues.some(issue => issue.issue_id === "BRIEF-SIZE-001"));
});

test("pure vector requirement blocks embedded images", () => {
  const withImage = validSvg.replace("</svg>", '<image id="asset" href="data:image/png;base64,AA=="/></svg>');
  const result = runPreflight({ svgString: withImage, brief, designSpec: spec, projectState, revision: 3 });
  assert.ok(result.issues.some(issue => issue.issue_id === "BRIEF-VECTOR-001" && issue.severity === "block"));
});

test("required visual aid disabled in Design Spec produces a consistency WARN", () => {
  const result = runPreflight({ svgString: validSvg, brief, designSpec: { ...spec, visual_elements:{ enabled:false } }, projectState, revision:3 });
  assert.ok(result.issues.some(issue => issue.issue_id === "BRIEF-VISUAL-AID-001" && issue.severity === "warn"));
  assert.equal(result.result, "warn");
});

test("QA mutations change input and still use the real inspection engine", () => {
  const blocked = applyQaMutation(validSvg, "block");
  const warned = applyQaMutation(validSvg, "warn");
  assert.match(blocked, /id="title"[^>]*>[\s\S]*id="title"/);
  assert.match(warned, /<path[^>]+d=""/);
  assert.equal(applyQaMutation(validSvg, "pass"), validSvg);
});

test("QA BLOCK duplicates an ID that exists in any current renderer SVG", () => {
  const rendererLike = validSvg.replace('id="title"', 'id="design-title"');
  const mutated = applyQaMutation(rendererLike, "block");
  assert.deepEqual(inspectSvgString(mutated).duplicateIds, ["design-title"]);
});
