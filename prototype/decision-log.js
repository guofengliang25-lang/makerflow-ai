export function createDecisionLog() {
  return { records: [] };
}

export function recordHumanWarningConfirmation({
  decisionLog,
  issueId,
  artifactRevision,
  checkedArtifactRevision,
  humanConfirmation,
  actor,
  timestamp = new Date().toISOString(),
  traceMetadata = { source:"explicit_ui_action" }
}) {
  if (actor !== "human" || humanConfirmation !== true) {
    throw new Error("explicit_human_confirmation_required");
  }
  const decision = {
    decision_id:`D-${decisionLog.records.length + 1}`,
    issue_id:issueId,
    artifact_revision:artifactRevision,
    checked_artifact_revision:checkedArtifactRevision,
    human_confirmation:true,
    decision_type:"warn_risk_acceptance",
    actor:"human",
    timestamp,
    trace_metadata:traceMetadata
  };
  decisionLog.records.push(decision);
  return decision;
}

export function isWarningConfirmed({ decisionLog, issueId, artifactRevision, checkedArtifactRevision }) {
  return decisionLog.records.some(decision =>
    decision.decision_type === "warn_risk_acceptance"
    && decision.actor === "human"
    && decision.human_confirmation === true
    && decision.issue_id === issueId
    && decision.artifact_revision === artifactRevision
    && decision.checked_artifact_revision === checkedArtifactRevision
  );
}
