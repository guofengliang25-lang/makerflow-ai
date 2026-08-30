import test from "node:test";
import assert from "node:assert/strict";
const workflow = await import("../workflow-state.js").catch(() => ({}));
import { createArtifactStore } from "../artifact-manager.js";
import { markDesignSpecEdited } from "../design-state.js";

const brief = {
  fields: [
    { id: "finished_width", value: "148", status: "confirmed" },
    { id: "finished_height", value: "105", status: "confirmed" },
    { id: "finished_unit", value: "mm", status: "confirmed" }
  ]
};

const projectState = {
  device: { status: "pending" }, material: { status: "pending" },
  processing_parameters: { status: "pending" }, preview: { status: "pending" },
  framing: { status: "pending" }
};

function designSpec() {
  return {
    design_spec_revision: 1,
    canvas: { width: 148, height: 105, unit: "mm" },
    content: { title: "MomoRay 高度调节说明", steps: [], footer: "使用前请确认" },
    layout: { template_id: "three-column" },
    style: { primary_color: "#333333", background_color: "#ffffff" },
    icons: {}, elements: { title:{ position:{x:0,y:0} } },
    visual_elements: { enabled: false }, illustration: { enabled: false },
    cutline: { required: true, enabled: true },
    output_requirements: { pure_vector: true, text_strategy: "editable", required_format: "svg" }
  };
}

function requireWorkflowApi() {
  for (const name of ["persistNativeDesign", "runCurrentArtifactPreflight", "getCurrentArtifact", "getCurrentPreflightReport", "canExportCurrentArtifact", "migrateLegacyDesignArtifact"]) {
    assert.equal(typeof workflow[name], "function", `${name} must exist`);
  }
}

test("旧localStorage作品迁移为Artifact且旧revision不再成为权威", () => {
  requireWorkflowApi();
  const artifactStore=createArtifactStore();
  const spec=designSpec();
  const legacySvg='<svg xmlns="http://www.w3.org/2000/svg" width="148mm" height="105mm" viewBox="0 0 148 105"></svg>';

  const artifact=workflow.migrateLegacyDesignArtifact({artifactStore,legacySvg,designSpec:spec,legacySource:"makerflow_template"});

  assert.equal(artifact.artifact_revision,1);
  assert.equal(artifact.source_design_spec_revision,1);
  assert.equal(artifact.authoring_source,"makerflow_spec");
  assert.equal(workflow.getCurrentArtifact(artifactStore).svg,legacySvg);
});

test("UI workflow: r1 Preflight PASS后允许Export", () => {
  requireWorkflowApi();
  const artifactStore = createArtifactStore();
  const spec = designSpec();

  const artifact = workflow.persistNativeDesign({ artifactStore, designSpec:spec, icons:[], assets:[] });
  const report = workflow.runCurrentArtifactPreflight({ artifactStore, brief, designSpec:spec, projectState });

  assert.equal(artifact.artifact_revision, 1);
  assert.equal(workflow.getCurrentArtifact(artifactStore).artifact_revision, 1);
  assert.equal(report.checked_artifact_revision, 1);
  assert.equal(report.result, "pass");
  assert.equal(workflow.canExportCurrentArtifact(artifactStore).allowed, true);
});

test("UI workflow: Design Spec编辑产生r2并使r1 Preflight stale", () => {
  requireWorkflowApi();
  const artifactStore = createArtifactStore();
  const spec = designSpec();
  workflow.persistNativeDesign({ artifactStore, designSpec:spec, icons:[], assets:[] });
  const oldReport = workflow.runCurrentArtifactPreflight({ artifactStore, brief, designSpec:spec, projectState });

  spec.elements.title.position.x = 8;
  markDesignSpecEdited(spec);
  const artifactR2 = workflow.persistNativeDesign({ artifactStore, designSpec:spec, icons:[], assets:[] });

  assert.equal(spec.design_spec_revision, 2);
  assert.equal(artifactR2.artifact_revision, 2);
  assert.equal(oldReport.stale, true);
  assert.equal(oldReport.checked_artifact_revision, 1);
  assert.equal(workflow.canExportCurrentArtifact(artifactStore).allowed, false);
});

test("UI workflow: 重新Preflight r2后恢复Export授权", () => {
  requireWorkflowApi();
  const artifactStore = createArtifactStore();
  const spec = designSpec();
  workflow.persistNativeDesign({ artifactStore, designSpec:spec, icons:[], assets:[] });
  workflow.runCurrentArtifactPreflight({ artifactStore, brief, designSpec:spec, projectState });
  spec.content.title = "调整后的标题";
  markDesignSpecEdited(spec);
  workflow.persistNativeDesign({ artifactStore, designSpec:spec, icons:[], assets:[] });

  const currentReport = workflow.runCurrentArtifactPreflight({ artifactStore, brief, designSpec:spec, projectState });

  assert.equal(currentReport.checked_artifact_revision, 2);
  assert.equal(currentReport.stale, false);
  assert.equal(workflow.getCurrentPreflightReport(artifactStore), currentReport);
  assert.equal(workflow.canExportCurrentArtifact(artifactStore).allowed, true);
});
