import assert from "node:assert/strict";
import test from "node:test";

import { executePlanGenerate } from "../../providers/plan-generate-executor.mjs";

const confirmedBrief = {
  brief_revision: 3,
  lifecycle: "confirmed",
  fields: [
    { id: "deliverable", value: "包装内高度调节说明卡", status: "confirmed", source: "user" },
    { id: "purpose", value: "帮助用户理解模块组合", status: "confirmed", source: "user" },
    { id: "must_content", value: "三种组合、对应枕高、使用提醒", status: "confirmed", source: "user" },
    { id: "product_facts", value: "模块可拆卸；枕高数据来自产品资料", status: "confirmed", source: "product_sheet" },
    { id: "form", value: "", status: "missing", source: "user" },
    { id: "color_direction", value: "低饱和灰色", status: "assumed", source: "system" }
  ],
  finished_size: { preset_size: "A6", width: 148, height: 105, unit: "mm", status: "confirmed", source: "user" },
  visual_aid_requirement: { status: "required", field_status: "needs_confirmation", purposes: ["explain_structure"], preferred_type: "let_system_recommend" }
};

const validPlan = {
  plan_id: "plan-r3-001",
  source_brief_revision: 3,
  recommendations: [
    { recommendation_id: "rec-form", decision_type: "form", suggestion: "横向三栏步骤卡", basis: "三组组合需要并列比较", expected_benefit: "便于快速扫读", tradeoff: "单栏文字空间较少", confidence: 0.86 },
    { recommendation_id: "rec-color", decision_type: "color_direction", suggestion: "低饱和灰蓝作为强调色", basis: "当前颜色仍为暂定", expected_benefit: "层级清楚", tradeoff: "需确认品牌色一致性", confidence: 0.72 }
  ],
  unresolved_items: ["material_direction"],
  provider_metadata: { provider_name: "deepseek", model_name: "deepseek-chat", prompt_version: "v0.1", run_id: "run-plan-1" }
};

const deepSeekEnvelope = output => async (_url, request) => {
  assert.equal(request.headers.Authorization.startsWith("Bearer "), true);
  return { ok: true, text: async () => JSON.stringify({ model: "deepseek-chat", choices: [{ message: { content: JSON.stringify(output) } }] }) };
};

test("draft Brief cannot call plan.generate", async () => {
  let called = false;
  const result = await executePlanGenerate({ confirmedBrief: { ...confirmedBrief, lifecycle: "draft" }, env: { DEEPSEEK_API_KEY: "test" }, fetchImpl: async () => { called = true; } });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "BRIEF_NOT_CONFIRMED");
  assert.equal(called, false);
});

test("confirmed Brief produces revision-bound recommendations only for unresolved non-critical decisions", async () => {
  const result = await executePlanGenerate({ confirmedBrief, env: { DEEPSEEK_API_KEY: "test" }, fetchImpl: deepSeekEnvelope(validPlan), runId: "run-plan-1" });
  assert.equal(result.ok, true);
  assert.equal(result.creative_plan.source_brief_revision, 3);
  assert.deepEqual(result.creative_plan.recommendations.map(item => item.decision_type), ["form", "color_direction"]);
});

test("confirmed facts and size cannot be recommendations", async () => {
  const unsafe = structuredClone(validPlan);
  unsafe.recommendations[0].decision_type = "finished_size";
  const result = await executePlanGenerate({ confirmedBrief, env: { DEEPSEEK_API_KEY: "test" }, fetchImpl: deepSeekEnvelope(unsafe) });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "SCHEMA_INVALID");
});

test("wrong Brief revision, malformed JSON and schema invalid all fail closed", async () => {
  const wrongRevision = structuredClone(validPlan); wrongRevision.source_brief_revision = 2;
  const wrong = await executePlanGenerate({ confirmedBrief, env: { DEEPSEEK_API_KEY: "test" }, fetchImpl: deepSeekEnvelope(wrongRevision) });
  assert.equal(wrong.ok, false); assert.equal(wrong.error.code, "PLAN_BRIEF_REVISION_MISMATCH");

  const malformedFetch = async () => ({ ok: true, text: async () => JSON.stringify({ model: "deepseek-chat", choices: [{ message: { content: "{bad" } }] }) });
  const malformed = await executePlanGenerate({ confirmedBrief, env: { DEEPSEEK_API_KEY: "test" }, fetchImpl: malformedFetch });
  assert.equal(malformed.ok, false); assert.equal(malformed.error.code, "MALFORMED_JSON");

  const invalid = structuredClone(validPlan); delete invalid.recommendations[0].tradeoff;
  const schema = await executePlanGenerate({ confirmedBrief, env: { DEEPSEEK_API_KEY: "test" }, fetchImpl: deepSeekEnvelope(invalid) });
  assert.equal(schema.ok, false); assert.equal(schema.error.code, "SCHEMA_INVALID");
});

test("replace_recommendation复用plan.generate并只返回同类型新候选",async()=>{
  const replacement={...structuredClone(validPlan),recommendations:[{...validPlan.recommendations[0],recommendation_id:"rec-form-b",suggestion:"纵向三段说明卡"},{...validPlan.recommendations[0],recommendation_id:"rec-form-c",suggestion:"单面信息卡"}]};
  const result=await executePlanGenerate({confirmedBrief,mode:"replace_recommendation",decisionType:"form",rejectedRecommendation:validPlan.recommendations[0],previousRejectedSuggestions:[validPlan.recommendations[0].suggestion],env:{DEEPSEEK_API_KEY:"test"},fetchImpl:deepSeekEnvelope(replacement),runId:"run-replace-1"});
  assert.equal(result.ok,true);assert.equal(result.replacement_recommendation.decision_type,"form");assert.equal(result.replacement_recommendation.recommendation_id,"rec-form-b");assert.equal(result.creative_plan,undefined);
});
