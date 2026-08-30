import test from "node:test";
import assert from "node:assert/strict";

const artifactManager = await import("../artifact-manager.js").catch(() => ({}));
const renderer = await import("../renderer.js");

function createManager() {
  assert.equal(typeof artifactManager.createArtifactStore, "function");
  assert.equal(typeof artifactManager.persistSvgArtifact, "function");
  return artifactManager.createArtifactStore();
}

function persist(store, overrides = {}) {
  return artifactManager.persistSvgArtifact(store, {
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>',
    authoring_source: "makerflow_spec",
    design_spec_status: "native",
    source_design_spec_revision: 3,
    provenance: {
      renderer: "local_svg_renderer",
      renderer_version: "v0.1"
    },
    ...overrides
  });
}

test("首次 persist SVG 创建 artifact_revision 1", () => {
  const store = createManager();
  const result = persist(store);

  assert.equal(result.created_new_revision, true);
  assert.equal(result.artifact.artifact_revision, 1);
  assert.equal(result.artifact.artifact_type, "svg");
  assert.equal(typeof result.artifact.content_hash, "string");
  assert.ok(result.artifact.content_hash.length > 0);
  assert.equal(result.artifact.authoring_source, "makerflow_spec");
  assert.equal(result.artifact.design_spec_status, "native");
  assert.equal(result.artifact.source_design_spec_revision, 3);
  assert.equal(store.artifacts.length, 1);
  assert.equal(store.current_artifact_revision, 1);
  assert.equal(store.trace_events.length, 1);
});

test("易变Trace字段不参与Artifact identity", () => {
  const store = createManager();
  const first = persist(store, {
    provenance: {
      renderer: "local_svg_renderer",
      renderer_version: "v0.1",
      timestamp: "2026-08-22T10:00:00.000Z",
      trace_event_id: 1,
      render_count: 1,
      save_count: 1
    }
  });
  const repeated = persist(store, {
    provenance: {
      renderer: "local_svg_renderer",
      renderer_version: "v0.1",
      timestamp: "2026-08-22T10:01:00.000Z",
      trace_event_id: 2,
      render_count: 2,
      save_count: 2
    }
  });

  assert.equal(first.artifact.artifact_revision, 1);
  assert.equal(repeated.artifact.artifact_revision, 1);
  assert.equal(repeated.created_new_revision, false);
  assert.equal(store.trace_events.length, 2);
});

test("相同Artifact identity再次persist不增加revision但新增Trace Event", () => {
  const store = createManager();
  const first = persist(store);
  const second = persist(store);

  assert.equal(first.artifact.artifact_revision, 1);
  assert.equal(second.artifact.artifact_revision, 1);
  assert.equal(second.created_new_revision, false);
  assert.equal(store.artifacts.length, 1);
  assert.equal(store.current_artifact_revision, 1);
  assert.equal(store.trace_events.length, 2);
  assert.equal(store.trace_events[1].created_new_revision, false);
});

test("SVG内容变化创建新artifact_revision", () => {
  const store = createManager();
  persist(store);
  const changed = persist(store, {
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>'
  });

  assert.equal(changed.created_new_revision, true);
  assert.equal(changed.artifact.artifact_revision, 2);
  assert.equal(store.artifacts.length, 2);
});

test("内容相同但authoring_source变化创建新artifact_revision", () => {
  const store = createManager();
  persist(store);
  const external = persist(store, {
    authoring_source: "external_artifact",
    design_spec_status: "derived_partial"
  });

  assert.equal(external.created_new_revision, true);
  assert.equal(external.artifact.artifact_revision, 2);
  assert.equal(external.artifact.authoring_source, "external_artifact");
});

test("内容相同但design_spec_status变化创建新artifact_revision", () => {
  const store = createManager();
  persist(store, {
    authoring_source: "external_artifact",
    design_spec_status: "none",
    source_design_spec_revision: null
  });
  const derived = persist(store, {
    authoring_source: "external_artifact",
    design_spec_status: "derived_partial",
    source_design_spec_revision: null
  });

  assert.equal(derived.created_new_revision, true);
  assert.equal(derived.artifact.artifact_revision, 2);
  assert.equal(derived.artifact.design_spec_status, "derived_partial");
});

test("svg.render只返回payload，不持久化Artifact或修改Design Spec revision", () => {
  const store = createManager();
  const spec = {
    design_spec_revision: 4,
    canvas: { width: 148, height: 105, unit: "mm" },
    layout: { template_id: "three-column" },
    content: { title: "测试说明卡", steps: [], footer: "" },
    style: { primary_color: "#333333", background_color: "#ffffff" },
    icons: {},
    elements: {},
    visual_elements: { enabled: false },
    illustration: { enabled: false },
    cutline: { enabled: false }
  };

  const svg = renderer.renderSvgString(spec);

  assert.equal(typeof svg, "string");
  assert.equal(spec.design_spec_revision, 4);
  assert.equal(store.artifacts.length, 0);
  assert.equal(store.trace_events.length, 0);
});
