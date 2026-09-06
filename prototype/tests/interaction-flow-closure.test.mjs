import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { applyClarificationAnswers, briefUiMode, manualCriticalFieldIds } from "../brief-ui-state.js";
import { validateBrief } from "../brief-validate.js";
import {
  acceptEditedRecommendation,
  bulkAcceptPendingRecommendations,
  createCreativePlanState,
  finalizePlanReview,
  getAcceptedPlan,
  getConfirmedBriefPlanContext,
  recordPlanDecision
} from "../creative-plan-state.js";

const criticalField = (id, value, status = "confirmed", extra = {}) => ({ id, value, status, source: "human", ...extra });
const validBrief = () => ({
  brief_revision: 4,
  lifecycle: "confirmed",
  fields: [
    criticalField("deliverable", "高度调节说明卡"),
    criticalField("purpose", "帮助用户理解模块组合"),
    criticalField("must_content", "三种模块组合、垫片数量和对应枕高"),
    criticalField("product_facts", "0片组合为15cm，1片组合为16cm，2片组合为17cm", "confirmed", { evidence: ["产品方确认"] })
  ],
  finished_size: { preset_size: "A6", width: 148, height: 105, unit: "mm", status: "confirmed" }
});
const plan = () => ({
  plan_id: "p4",
  source_brief_revision: 4,
  recommendations: [
    { recommendation_id: "r1", decision_type: "form", suggestion: "三栏布局", basis: "便于比较", expected_benefit: "易扫读", tradeoff: "文字空间较少", confidence: 0.8 },
    { recommendation_id: "r2", decision_type: "color_direction", suggestion: "黑白灰", basis: "对比清晰", expected_benefit: "易读", tradeoff: "品牌感较弱", confidence: 0.7 },
    { recommendation_id: "r3", decision_type: "material_direction", suggestion: "卡纸", basis: "适合说明卡", expected_benefit: "挺括", tradeoff: "需打样", confidence: 0.6 }
  ],
  unresolved_items: []
});

test("critical blockers存在时Brief UI只能进入clarification", () => {
  assert.equal(briefUiMode({ critical_blockers: ["finished_size"] }, "draft"), "clarification");
});

test("critical blockers清空后Brief UI进入review，Human确认后进入confirmed", () => {
  assert.equal(briefUiMode({ critical_blockers: [] }, "ready_for_confirmation"), "review");
  assert.equal(briefUiMode({ critical_blockers: [] }, "confirmed"), "confirmed");
});

test("clarification回答确定性写回对应Brief字段且不要求重复填写", () => {
  const brief = validBrief();
  brief.lifecycle = "draft";
  brief.fields.find(field => field.id === "must_content").value = "";
  brief.fields.find(field => field.id === "must_content").status = "missing";
  const updated = applyClarificationAnswers(brief, [{ field_id: "must_content", answer: "三种模块组合、垫片数量和对应枕高" }]);
  const result = validateBrief({ brief_candidate: updated }).brief_validation_result;
  assert.equal(updated.fields.find(field => field.id === "must_content").source, "human_clarification");
  assert.equal(result.critical_blockers.includes("must_content"), false);
});

test("后续clarification不能覆盖已确认尺寸和已确认产品事实", () => {
  const brief = validBrief();
  const updated = applyClarificationAnswers(brief, [
    { field_id: "finished_size", answer: "A5" },
    { field_id: "product_facts", answer: "确认准确无误" }
  ]);
  assert.deepEqual(updated.finished_size, brief.finished_size);
  assert.equal(updated.fields.find(field => field.id === "product_facts").value, brief.fields.find(field => field.id === "product_facts").value);
});

test("manual fallback只返回当前Critical Missing的最小字段", () => {
  assert.deepEqual(
    manualCriticalFieldIds(["product_facts.module_relationship", "product_facts.evidence", "finished_size"]),
    ["product_facts", "finished_size"]
  );
});

test("custom有效尺寸立即解除blocker", () => {
  const brief = validBrief();
  brief.finished_size = { preset_size: "custom", width: 120, height: 80, unit: "mm", status: "missing" };
  const result = validateBrief({ brief_candidate: brief }).brief_validation_result;
  assert.equal(result.critical_blockers.includes("finished_size"), false);
  assert.equal(result.normalized_finished_size.status, "needs_confirmation");
});

test("Step 3只读取绑定current confirmed Brief revision的A6锁定尺寸", () => {
  const context = getConfirmedBriefPlanContext(validBrief(), plan());
  assert.equal(context.finished_size.display_value, "A6 · 148 × 105 mm");
  assert.throws(() => getConfirmedBriefPlanContext({ ...validBrief(), brief_revision: 5 }, plan()), /PLAN_STALE/);
});

test("采用和不采用点击动作立即改变Recommendation状态", () => {
  let state = createCreativePlanState(plan());
  state = recordPlanDecision(state, { recommendationId: "r1", action: "accept", actor: "human" });
  state = recordPlanDecision(state, { recommendationId: "r2", action: "reject", actor: "human" });
  assert.equal(state.decisions.r1.status, "accepted");
  assert.equal(state.decisions.r2.status, "rejected");
});

test("调整后保存并采用保留Human edited suggestion", () => {
  const state = acceptEditedRecommendation(createCreativePlanState(plan()), {
    recommendationId: "r1",
    editedSuggestion: "两栏布局",
    actor: "human"
  });
  assert.equal(state.decisions.r1.status, "accepted");
  assert.equal(getAcceptedPlan(state, 4).recommendations[0].suggestion, "两栏布局");
});

test("采用当前方案批量接受pending但保留reject", () => {
  let state = createCreativePlanState(plan());
  state = recordPlanDecision(state, { recommendationId: "r2", action: "reject", actor: "human" });
  state = bulkAcceptPendingRecommendations(state, { actor: "human" });
  assert.equal(state.decisions.r1.status, "accepted");
  assert.equal(state.decisions.r2.status, "rejected");
  assert.equal(state.decisions.r3.status, "accepted");
  assert.deepEqual(getAcceptedPlan(state, 4).recommendations.map(item => item.recommendation_id), ["r1", "r3"]);
});

test("完成Plan Review后可建立accepted Plan并启用Step 4", () => {
  const reviewed = bulkAcceptPendingRecommendations(createCreativePlanState(plan()), { actor: "human" });
  const finalized = finalizePlanReview(reviewed, { actor: "human" });
  assert.equal(finalized.confirmed, true);
  assert.equal(finalized.can_enter_create_edit, true);
});

test("普通Step 1不显示内部Demo Sample提示，Step 2和3使用新交互CTA", async () => {
  const app = await readFile("prototype/app.js", "utf8");
  assert.doesNotMatch(app, /IS_QA \|\| state\.job\.sampleMode/);
  assert.match(app, /手动补充缺失信息/);
  assert.match(app, /采用当前方案并继续/);
  assert.match(app, /保存并采用/);
});
