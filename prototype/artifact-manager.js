function stableSerialize(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }

  const entries = Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`);
  return `{${entries.join(",")}}`;
}

const IDENTITY_PROVENANCE_KEYS = new Set([
  "renderer",
  "renderer_version",
  "source_tool",
  "source_file_hash",
  "transformation"
]);

function identityProvenance(provenance) {
  if (!provenance || typeof provenance !== "object") return null;
  return Object.fromEntries(
    Object.entries(provenance).filter(([key]) => IDENTITY_PROVENANCE_KEYS.has(key))
  );
}

export function hashArtifactContent(content) {
  const text = String(content ?? "");
  let hash = 0x811c9dc5;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function createArtifactStore() {
  return {
    artifacts: [],
    current_artifact_revision: null,
    trace_events: [],
    preflight_reports: [],
    current_preflight_report_id: null
  };
}

function invalidateCurrentPreflight(store, artifactRevision) {
  store.preflight_reports.forEach((report) => {
    if (!report.stale && report.checked_artifact_revision !== artifactRevision) {
      report.stale = true;
      report.stale_reason = "artifact_identity_changed";
    }
  });
}

function artifactIdentity(input) {
  return stableSerialize({
    artifact_type: "svg",
    content_hash: hashArtifactContent(input.svg),
    authoring_source: input.authoring_source,
    design_spec_status: input.design_spec_status,
    source_design_spec_revision: input.source_design_spec_revision ?? null,
    provenance: identityProvenance(input.provenance)
  });
}

function appendTraceEvent(store, artifactRevision, createdNewRevision) {
  const traceEvent = {
    trace_event_id: store.trace_events.length + 1,
    event_type: "artifact_persist",
    artifact_revision: artifactRevision,
    created_new_revision: createdNewRevision
  };
  store.trace_events.push(traceEvent);
  return traceEvent;
}

export function persistSvgArtifact(store, input) {
  const identity = artifactIdentity(input);
  const currentArtifact = store.artifacts.find(
    (artifact) => artifact.artifact_revision === store.current_artifact_revision
  );

  if (currentArtifact?.identity === identity) {
    return {
      artifact: currentArtifact,
      created_new_revision: false,
      trace_event: appendTraceEvent(store, currentArtifact.artifact_revision, false)
    };
  }

  const artifactRevision = store.artifacts.reduce(
    (latest, artifact) => Math.max(latest, artifact.artifact_revision),
    0
  ) + 1;
  const artifact = {
    artifact_revision: artifactRevision,
    artifact_type: "svg",
    content_hash: hashArtifactContent(input.svg),
    authoring_source: input.authoring_source,
    design_spec_status: input.design_spec_status,
    source_design_spec_revision: input.source_design_spec_revision ?? null,
    provenance: identityProvenance(input.provenance),
    svg: input.svg,
    identity
  };

  store.artifacts.push(artifact);
  store.current_artifact_revision = artifactRevision;
  invalidateCurrentPreflight(store, artifactRevision);

  return {
    artifact,
    created_new_revision: true,
    trace_event: appendTraceEvent(store, artifactRevision, true)
  };
}


export function savePreflightReport(store, report) {
  const savedReport = {
    ...report,
    preflight_report_id: store.preflight_reports.length + 1,
    stale: false,
    stale_reason: null
  };
  store.preflight_reports.push(savedReport);
  store.current_preflight_report_id = savedReport.preflight_report_id;
  return savedReport;
}

export function evaluateArtifactExport(store) {
  const currentReport = store.preflight_reports.find(
    (report) => report.preflight_report_id === store.current_preflight_report_id
  );
  const reportIsCurrent = currentReport
    && !currentReport.stale
    && currentReport.checked_artifact_revision === store.current_artifact_revision;

  if (!reportIsCurrent) {
    return {
      allowed: false,
      decision: "block",
      reason: "current_artifact_has_no_current_preflight"
    };
  }

  if (currentReport.result !== "pass") {
    return {
      allowed: false,
      decision: "block",
      reason: "current_preflight_not_pass"
    };
  }

  return {
    allowed: true,
    decision: "act",
    reason: "current_artifact_preflight_pass"
  };
}
