import assert from "node:assert/strict";
import test from "node:test";

import { generateCreativePlan } from "../plan-generate-client.js";

const brief = { brief_revision: 1, lifecycle: "confirmed", fields: [], finished_size: { width: 148, height: 105, unit: "mm", status: "confirmed" } };

test("Browser plan request contains no API key and returns formal creative_plan", async () => {
  const fetchImpl = async (url, request) => {
    assert.equal(url, "./api/skills/plan.generate");
    assert.equal(JSON.stringify(request).includes("DEEPSEEK_API_KEY"), false);
    assert.equal(JSON.stringify(request).includes("Authorization"), false);
    return { ok: true, json: async () => ({ ok: true, creative_plan: { plan_id: "p1", source_brief_revision: 1, recommendations: [], unresolved_items: [], provider_metadata: {} }, trace: { provider_name: "deepseek" } }) };
  };
  const result = await generateCreativePlan({ confirmedBrief: brief, fetchImpl });
  assert.equal(result.ok, true);
  assert.equal(result.creative_plan.source_brief_revision, 1);
});

test("provider error cannot fallback to fixture", async () => {
  const result = await generateCreativePlan({ confirmedBrief: brief, fetchImpl: async () => ({ ok: false, json: async () => ({ ok: false, error: { code: "PROVIDER_HTTP_ERROR", message: "failed" } }) }) });
  assert.equal(result.ok, false);
  assert.equal(result.creative_plan, null);
});

