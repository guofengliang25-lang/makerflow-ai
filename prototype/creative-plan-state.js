import { normalizeFinishedSize } from "./brief-validate.js";

const clone = value => structuredClone(value);

export function createCreativePlanState(plan) {
  return { plan: clone(plan), lifecycle: "active", stale: false, decisions: Object.fromEntries(plan.recommendations.map(item => [item.recommendation_id, { status: "pending", edited_suggestion: null }])), decision_log: [] };
}

export function recordPlanDecision(state, { recommendationId, action, actor, editedSuggestion = null }) {
  if (actor !== "human") throw new Error("HUMAN_ACTION_REQUIRED");
  if (!state.decisions[recommendationId]) throw new Error("RECOMMENDATION_NOT_FOUND");
  const next = clone(state), decision = next.decisions[recommendationId];
  if (action === "accept") decision.status = "accepted";
  else if (action === "reject") decision.status = "rejected";
  else if (action === "reconsider") decision.status = "pending";
  else if (action === "edit") { decision.edited_suggestion = editedSuggestion; decision.status = "pending"; }
  else throw new Error("INVALID_PLAN_ACTION");
  next.decision_log.push({ decision_id: crypto.randomUUID(), recommendation_id: recommendationId, action, actor: "human", source_brief_revision: next.plan.source_brief_revision, timestamp: new Date().toISOString() });
  return next;
}

export function syncPlanStaleness(state, currentBriefRevision) {
  const next = clone(state);
  if (next.plan?.source_brief_revision !== currentBriefRevision) { next.stale = true; next.lifecycle = "superseded"; }
  return next;
}

export function getAcceptedPlan(state, currentBriefRevision) {
  if (!state.plan || state.stale || state.plan.source_brief_revision !== currentBriefRevision) throw new Error("PLAN_STALE");
  return { plan_id: state.plan.plan_id, source_brief_revision: state.plan.source_brief_revision, recommendations: state.plan.recommendations.filter(item => state.decisions[item.recommendation_id]?.status === "accepted").map(item => ({ ...clone(item), suggestion: state.decisions[item.recommendation_id].edited_suggestion || item.suggestion })) };
}

export function acceptEditedRecommendation(state, { recommendationId, editedSuggestion, actor }) {
  const edited = recordPlanDecision(state, { recommendationId, action: "edit", actor, editedSuggestion });
  return recordPlanDecision(edited, { recommendationId, action: "accept", actor });
}

export function bulkAcceptPendingRecommendations(state, { actor }) {
  if (actor !== "human") throw new Error("HUMAN_ACTION_REQUIRED");
  let next = clone(state);
  for (const item of next.plan?.recommendations || []) {
    if (next.decisions[item.recommendation_id]?.status === "pending") {
      next = recordPlanDecision(next, { recommendationId: item.recommendation_id, action: "accept", actor });
    }
  }
  return next;
}

export function finalizePlanReview(state, { actor }) {
  if (actor !== "human") throw new Error("HUMAN_ACTION_REQUIRED");
  if (Object.values(state.decisions || {}).some(decision => decision.status === "pending")) throw new Error("PLAN_REVIEW_INCOMPLETE");
  return { ...clone(state), confirmed: true, confirmedAt: new Date().toISOString(), can_enter_create_edit: true };
}

export function getConfirmedBriefPlanContext(brief, plan) {
  if (!brief || brief.lifecycle !== "confirmed" || plan?.source_brief_revision !== brief.brief_revision) throw new Error("PLAN_STALE");
  const size = normalizeFinishedSize(brief.finished_size || {});
  const preset = size.preset_size === "custom" ? "自定义" : size.preset_size;
  return {
    brief_revision: brief.brief_revision,
    fields: clone(brief.fields || []),
    finished_size: { ...size, display_value: `${preset} · ${size.width} × ${size.height} ${size.unit}` }
  };
}
