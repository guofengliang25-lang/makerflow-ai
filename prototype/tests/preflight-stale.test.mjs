import test from "node:test";
import assert from "node:assert/strict";
import * as artifactManager from "../artifact-manager.js";
import { runPreflight } from "../preflight.js";

const brief = {
  fields: [
    { id: "finished_width", value: "148", status: "confirmed" },
    { id: "finished_height", value: "105", status: "confirmed" },
    { id: "finished_unit", value: "mm", status: "confirmed" }
  ]
};

const designSpec = {
  canvas: { width: 148, height: 105, unit: "mm" },
  visual_elements: { enabled: true },
  output_requirements: { pure_vector: true, text_strategy: "editable", required_format: "svg" },
  cutline: { required: true, enabled: true }
};

const projectState = {
  device: { status: "pending" },
  material: { status: "pending" },
  processing_parameters: { status: "pending" },
  preview: { status: "pending" },
  framing: { status: "pending" }
};

const svgR1 = '<svg xmlns="http://www.w3.org/2000/svg" width="148mm" height="105mm" viewBox="0 0 148 105"><text id="title">说明</text><path id="cutline" data-role="cutline" d="M 1 1 H 147 V 104 H 1 Z"/></svg>';
const svgR2 = svgR1.replace("说明", "新版说明");

function persist(store, svg) {
  return artifactManager.persistSvgArtifact(store, {
    svg,
    authoring_source: "makerflow_spec",
    design_spec_status: "native",
    source_design_spec_revision: svg === svgR1 ? 1 : 2,
    provenance: { renderer: "local_svg_renderer" }
  }).artifact;
}

function createStore() {
  assert.equal(typeof artifactManager.savePreflightReport, "function");
  assert.equal(typeof artifactManager.evaluateArtifactExport, "function");
  return artifactManager.createArtifactStore();
}

function preflight(svg, artifactRevision) {
  return runPreflight({
    svgString: svg,
    brief,
    designSpec,
    projectState,
    artifactRevision
  });
}

test("A: Preflight PASS保存其checked_artifact_revision", () => {
  const store = createStore();
  const artifact = persist(store, svgR1);
  const report = artifactManager.savePreflightReport(store, preflight(svgR1, artifact.artifact_revision));

  assert.equal(report.result, "pass");
  assert.equal(report.checked_artifact_revision, 1);
  assert.equal(report.stale, false);
  assert.equal(report.stale_reason, null);
});

test("B: Artifact identity变化后保留旧Report并标记stale", () => {
  const store = createStore();
  const artifactR1 = persist(store, svgR1);
  const oldReport = artifactManager.savePreflightReport(store, preflight(svgR1, artifactR1.artifact_revision));

  const artifactR2 = persist(store, svgR2);

  assert.equal(artifactR2.artifact_revision, 2);
  assert.equal(store.preflight_reports.length, 1);
  assert.equal(store.preflight_reports[0], oldReport);
  assert.equal(oldReport.checked_artifact_revision, 1);
  assert.equal(oldReport.stale, true);
  assert.equal(oldReport.stale_reason, "artifact_identity_changed");
});

test("C: r1 PASS不能授权r2 Export", () => {
  const store = createStore();
  const artifactR1 = persist(store, svgR1);
  artifactManager.savePreflightReport(store, preflight(svgR1, artifactR1.artifact_revision));
  persist(store, svgR2);

  assert.deepEqual(artifactManager.evaluateArtifactExport(store), {
    allowed: false,
    decision: "block",
    reason: "current_artifact_has_no_current_preflight"
  });
});

test("D: 重新Preflight r2生成绑定当前Artifact的非stale Report", () => {
  const store = createStore();
  const artifactR1 = persist(store, svgR1);
  artifactManager.savePreflightReport(store, preflight(svgR1, artifactR1.artifact_revision));
  const artifactR2 = persist(store, svgR2);

  const currentReport = artifactManager.savePreflightReport(store, preflight(svgR2, artifactR2.artifact_revision));

  assert.equal(store.preflight_reports.length, 2);
  assert.equal(store.preflight_reports[0].stale, true);
  assert.equal(currentReport.checked_artifact_revision, 2);
  assert.equal(currentReport.stale, false);
  assert.equal(currentReport.stale_reason, null);
  assert.equal(artifactManager.evaluateArtifactExport(store).allowed, true);
});
