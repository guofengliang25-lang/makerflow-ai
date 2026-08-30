import { renderSvgString } from "./renderer.js";
import { runPreflight } from "./preflight.js";
import {
  persistSvgArtifact,
  savePreflightReport,
  evaluateArtifactExport
} from "./artifact-manager.js";
import { isWarningConfirmed } from "./decision-log.js";

export function getCurrentArtifact(artifactStore) {
  return artifactStore.artifacts.find(
    (artifact) => artifact.artifact_revision === artifactStore.current_artifact_revision
  ) || null;
}

export function getCurrentPreflightReport(artifactStore) {
  return artifactStore.preflight_reports.find(
    (report) => report.preflight_report_id === artifactStore.current_preflight_report_id
  ) || null;
}

export function migrateLegacyDesignArtifact({ artifactStore, legacySvg, designSpec, legacySource }) {
  const existing = getCurrentArtifact(artifactStore);
  if (existing || !legacySvg) return existing;
  const external = legacySource === "user_uploaded_svg";
  return persistSvgArtifact(artifactStore, {
    svg: legacySvg,
    authoring_source: external ? "external_artifact" : "makerflow_spec",
    design_spec_status: external ? "none" : "native",
    source_design_spec_revision: external ? null : designSpec?.design_spec_revision ?? null,
    provenance: { transformation:"legacy_state_migration" }
  }).artifact;
}

export function persistNativeDesign({ artifactStore, designSpec, icons = [], assets = [] }) {
  const svg = renderSvgString(designSpec, {
    revision: designSpec.design_spec_revision,
    icons,
    assets
  });
  return persistSvgArtifact(artifactStore, {
    svg,
    authoring_source: "makerflow_spec",
    design_spec_status: "native",
    source_design_spec_revision: designSpec.design_spec_revision,
    provenance: { renderer:"local_svg_renderer", renderer_version:"v0.1" }
  }).artifact;
}

export function runCurrentArtifactPreflight({ artifactStore, brief, designSpec, projectState, svgTransform }) {
  const artifact = getCurrentArtifact(artifactStore);
  if (!artifact) throw new Error("current_artifact_required");
  const svgString = svgTransform ? svgTransform(artifact.svg) : artifact.svg;
  const report = runPreflight({
    svgString,
    brief,
    designSpec,
    projectState,
    artifactRevision: artifact.artifact_revision
  });
  return savePreflightReport(artifactStore, report);
}

export function evaluateHumanAuthorityGate({ artifactStore, decisionLog = {records:[]} }) {
  const artifact=getCurrentArtifact(artifactStore),report=getCurrentPreflightReport(artifactStore);
  if(!artifact||!report||report.stale||report.checked_artifact_revision!==artifact.artifact_revision){
    return {allowed:false,decision:"block",reason:"current_artifact_has_no_current_preflight"};
  }
  const preImportIssues=(report.issues||[]).filter(item=>item.resolution_stage!=="in_studio"&&item.resolution_stage!=="before_processing");
  if(preImportIssues.some(item=>item.severity==="block")){
    return {allowed:false,decision:"block",reason:"PREFLIGHT_BLOCK"};
  }
  const unconfirmed=preImportIssues.filter(item=>item.severity==="warn"&&!isWarningConfirmed({
    decisionLog,
    issueId:item.issue_id,
    artifactRevision:artifact.artifact_revision,
    checkedArtifactRevision:report.checked_artifact_revision
  }));
  if(unconfirmed.length){
    return {allowed:false,decision:"block",reason:"BLOCKED_BY_HUMAN_CONFIRMATION",unconfirmed_warning_ids:unconfirmed.map(item=>item.issue_id)};
  }
  return {allowed:true,decision:"act",reason:report.result==="warn"?"current_warnings_human_confirmed":"current_artifact_preflight_pass"};
}

export function canExportCurrentArtifact(artifactStore, decisionLog) {
  if(decisionLog) return evaluateHumanAuthorityGate({artifactStore,decisionLog});
  return evaluateArtifactExport(artifactStore);
}
