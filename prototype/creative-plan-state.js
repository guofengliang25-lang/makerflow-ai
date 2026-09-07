import { normalizeFinishedSize } from "./brief-validate.js";
import { createRuntimeId } from "./runtime-id.js";

const clone = value => structuredClone(value);

export function createCreativePlanState(plan) {
  return { plan: clone(plan), lifecycle: "active", stale: false, decisions: Object.fromEntries(plan.recommendations.map(item => [item.recommendation_id, { status: "pending", edited_suggestion: null }])), decision_log: [], replacements:{}, rejected_recommendations:{} };
}

export function reconcileCreativePlanState(state={}, { recoverInterruptedReplacement=false }={}){
  const next=clone(state),current=next.decisions||{},ids=(next.plan?.recommendations||[]).map(item=>item.recommendation_id);
  next.decisions=Object.fromEntries(ids.map(id=>[id,current[id]||{status:"pending",edited_suggestion:null}]));
  next.decision_log=next.decision_log||[];
  next.replacements=next.replacements||{};next.rejected_recommendations=next.rejected_recommendations||{};
  if(recoverInterruptedReplacement){
    for(const replacement of Object.values(next.replacements)){
      if(replacement?.loading){
        replacement.loading=false;
        replacement.error={code:"REPLACEMENT_INTERRUPTED",message:"替代方案请求已中断，请重试。"};
      }
    }
  }
  return next;
}

export function recordPlanDecision(state, { recommendationId, action, actor, editedSuggestion = null, runtimeCrypto=globalThis.crypto }) {
  state=reconcileCreativePlanState(state);
  if (actor !== "human") throw new Error("HUMAN_ACTION_REQUIRED");
  if (!state.decisions[recommendationId]) throw new Error("RECOMMENDATION_NOT_FOUND");
  const next = clone(state), decision = next.decisions[recommendationId];
  if (action === "accept") decision.status = "accepted";
  else if (action === "reject") decision.status = "rejected";
  else if (action === "reconsider") decision.status = "pending";
  else if (action === "edit") { decision.edited_suggestion = editedSuggestion; decision.status = "pending"; }
  else throw new Error("INVALID_PLAN_ACTION");
  next.decision_log.push({ decision_id: createRuntimeId(runtimeCrypto), recommendation_id: recommendationId, action, actor: "human", source_brief_revision: next.plan.source_brief_revision, timestamp: new Date().toISOString() });
  return next;
}

const findRecommendation=(state,id)=>state.plan?.recommendations?.find(item=>item.recommendation_id===id);
export function beginRecommendationReplacement(state,recommendationId){
  const next=reconcileCreativePlanState(state),current=findRecommendation(next,recommendationId);
  if(!current)throw new Error("RECOMMENDATION_NOT_FOUND");
  if(next.decisions[recommendationId]?.status!=="rejected")throw new Error("RECOMMENDATION_NOT_REJECTED");
  const type=current.decision_type,history=next.rejected_recommendations[type]||[];
  if(history.length>=3)throw new Error("REPLACEMENT_LIMIT_REACHED");
  if(!history.some(item=>item.recommendation_id===recommendationId))history.push(clone(current));
  next.rejected_recommendations[type]=history;
  next.replacements[type]={loading:true,error:null,replacing_recommendation_id:recommendationId,attempt_count:history.length};
  return next;
}

export function applyRecommendationReplacement(state,recommendationId,replacement){
  const next=reconcileCreativePlanState(state),current=findRecommendation(next,recommendationId);
  if(!current)throw new Error("RECOMMENDATION_NOT_FOUND");
  if(replacement.recommendation_id===recommendationId||next.plan.recommendations.some(item=>item.recommendation_id===replacement.recommendation_id))throw new Error("REPLACEMENT_ID_REUSED");
  if(replacement.decision_type!==current.decision_type)throw new Error("REPLACEMENT_TYPE_MISMATCH");
  const index=next.plan.recommendations.findIndex(item=>item.recommendation_id===recommendationId);
  next.plan.recommendations[index]=clone(replacement);delete next.decisions[recommendationId];next.decisions[replacement.recommendation_id]={status:"pending",edited_suggestion:null};
  next.replacements[current.decision_type]={loading:false,error:null,replacing_recommendation_id:null,attempt_count:(next.rejected_recommendations[current.decision_type]||[]).length};
  return next;
}

export function failRecommendationReplacement(state,recommendationId,error){
  const next=reconcileCreativePlanState(state),current=findRecommendation(next,recommendationId);if(!current)return next;
  const previous=next.replacements[current.decision_type]||{};next.replacements[current.decision_type]={...previous,loading:false,error:clone(error),replacing_recommendation_id:recommendationId};return next;
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
