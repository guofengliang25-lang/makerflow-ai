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
