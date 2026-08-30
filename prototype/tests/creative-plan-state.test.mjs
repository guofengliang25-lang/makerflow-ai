import assert from "node:assert/strict";
import test from "node:test";

import { createCreativePlanState, recordPlanDecision, getAcceptedPlan, syncPlanStaleness } from "../creative-plan-state.js";
import { buildDesignSpecFromBrief } from "../renderer.js";

const plan = { plan_id: "p1", source_brief_revision: 1, recommendations: [
  { recommendation_id: "r1", decision_type: "form", suggestion: "三栏", basis: "比较", expected_benefit: "清楚", tradeoff: "空间少", confidence: 0.8 },
  { recommendation_id: "r2", decision_type: "visual_aid", suggestion: "结构图", basis: "解释组合", expected_benefit: "易懂", tradeoff: "占空间", confidence: 0.9 }
], unresolved_items: [], provider_metadata: {} };

test("only explicit Human accept enters accepted Plan and reject is excluded", () => {
  let state = createCreativePlanState(plan);
  state = recordPlanDecision(state, { recommendationId: "r1", action: "accept", actor: "human" });
  state = recordPlanDecision(state, { recommendationId: "r2", action: "reject", actor: "human" });
  const accepted = getAcceptedPlan(state, 1);
  assert.deepEqual(accepted.recommendations.map(item => item.recommendation_id), ["r1"]);
  assert.equal(state.decision_log.every(item => item.actor === "human" && item.source_brief_revision === 1), true);
});

test("edit does not auto-accept, and reconsider returns a decision to pending", () => {
  let state = createCreativePlanState(plan);
  state = recordPlanDecision(state, { recommendationId: "r1", action: "edit", actor: "human", editedSuggestion: "双栏" });
  assert.equal(getAcceptedPlan(state, 1).recommendations.length, 0);
  state = recordPlanDecision(state, { recommendationId: "r1", action: "accept", actor: "human" });
  state = recordPlanDecision(state, { recommendationId: "r1", action: "reconsider", actor: "human" });
  assert.equal(state.decisions.r1.status, "pending");
});

test("Brief revision change makes old Plan stale and unusable", () => {
  const state = syncPlanStaleness(createCreativePlanState(plan), 2);
  assert.equal(state.stale, true);
  assert.equal(state.lifecycle, "superseded");
  assert.throws(() => getAcceptedPlan(state, 2), /PLAN_STALE/);
});

test("accepted Plan can enter the existing deterministic Design Spec build", () => {
  let state = createCreativePlanState(plan);
  state = recordPlanDecision(state, { recommendationId: "r1", action: "accept", actor: "human" });
  const accepted = getAcceptedPlan(state, 1);
  const brief = { brief_revision: 1, lifecycle: "confirmed", fields: [], finished_size: { width: 148, height: 105, unit: "mm", status: "confirmed" } };
  const spec = buildDesignSpecFromBrief(brief, { ...accepted, template_id: "three-column" });
  assert.equal(spec.brief_revision, 1);
  assert.equal(spec.layout.template_id, "three-column");
});
