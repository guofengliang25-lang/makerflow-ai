import test from "node:test";
import assert from "node:assert/strict";
import { renderSvgString, buildDesignSpecFromBrief } from "../renderer.js";

const brief = {
  fields: [
    { id: "must_content", value: "三种高度配置、垫片数量、15 / 16 / 17 cm及调整方式", status: "confirmed" }
  ],
  finished_size: { preset_size:"A6", width:148, height:105, unit:"mm", status:"confirmed", source:"preset" },
  visual_aid_requirement: {
    status: "required",
    purposes: ["explain_structure", "explain_steps"],
    preferred_type: "let_system_recommend",
    field_status: "confirmed"
  }
};

test("buildDesignSpecFromBrief creates an SVG-first internal model", () => {
  const spec = buildDesignSpecFromBrief(brief, { template_id: "three-column" });
  assert.equal(spec.canvas.width, 148);
  assert.equal(spec.canvas.height, 105);
  assert.equal(spec.layout.template_id, "three-column");
  assert.equal(spec.content.steps.length, 3);
  assert.equal(spec.visual_elements.enabled, true);
  assert.equal(spec.visual_elements.type, "structural_diagram");
});

test("accepted visual-aid plan becomes deterministic Design Spec visual elements", () => {
  const spec = buildDesignSpecFromBrief(brief, {
    template_id: "three-column",
    visual_elements: { enabled: true, type: "simple_illustration", variant_id: "module-stack" }
  });
  assert.deepEqual(spec.visual_elements.purpose, ["explain_structure", "explain_steps"]);
  assert.equal(spec.visual_elements.type, "simple_illustration");
  assert.equal(spec.visual_elements.asset_source, "makerflow_template");
});

test("renderer emits selectable native SVG visual aid and never an image", () => {
  const spec = buildDesignSpecFromBrief(brief, { visual_elements: { enabled:true, type:"structural_diagram" } });
  const svg = renderSvgString(spec, { revision: 2, icons: [] });
  assert.match(svg, /id="visual-aid"/);
  assert.match(svg, /data-element-id="visual-elements"/);
  assert.match(svg, /data-element-type="structural_diagram"/);
  assert.doesNotMatch(svg, /<image\b/);
});

test("renderer removes visual aid when Design Spec disables it", () => {
  const spec = buildDesignSpecFromBrief(brief, {});
  spec.visual_elements.enabled = false;
  assert.doesNotMatch(renderSvgString(spec), /id="visual-aid"/);
});

test("renderer applies Design Spec element offsets to draggable groups", () => {
  const spec=buildDesignSpecFromBrief(brief,{});
  spec.elements.title.position={x:8,y:16};
  spec.elements["step-1"].position={x:-8,y:0};
  const svg=renderSvgString(spec);
  assert.match(svg,/data-element-id="title"[^>]+transform="translate\(8 16\)"/);
  assert.match(svg,/data-element-id="step-1"[^>]+data-draggable="true"/);
  assert.match(svg,/data-element-id="cutline"[^>]+data-draggable="false"/);
});

test("renderer emits dimensions, revision, text, icons and a closed cutline", () => {
  const spec = buildDesignSpecFromBrief(brief, { template_id: "three-column" });
  spec.content.title = "测试标题";
  spec.cutline.enabled = true;
  const svg = renderSvgString(spec, { revision: 7, icons: [] });
  assert.match(svg, /width="148mm"/);
  assert.match(svg, /height="105mm"/);
  assert.match(svg, /viewBox="0 0 148 105"/);
  assert.match(svg, /data-design-revision="7"/);
  assert.match(svg, />测试标题</);
  assert.match(svg, /data-role="cutline"[^>]+d="[^"]+Z"/);
});

test("renderer changes structure for the two supported layouts", () => {
  const horizontal = buildDesignSpecFromBrief(brief, { template_id: "three-column" });
  const vertical = structuredClone(horizontal);
  vertical.layout.template_id = "vertical-steps";
  assert.notEqual(renderSvgString(horizontal), renderSvgString(vertical));
  assert.match(renderSvgString(horizontal), /data-layout="three-column"/);
  assert.match(renderSvgString(vertical), /data-layout="vertical-steps"/);
});

test("renderer escapes user text instead of injecting markup", () => {
  const spec = buildDesignSpecFromBrief(brief, {});
  spec.content.title = '<script>alert("x")</script>';
  const svg = renderSvgString(spec);
  assert.doesNotMatch(svg, /<script>/);
  assert.match(svg, /&lt;script&gt;/);
});
