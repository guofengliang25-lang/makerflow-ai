import test from "node:test";
import assert from "node:assert/strict";

import { createModelProviderAdapter } from "../provider-adapter.js";
import { createMockModelProvider } from "../mock-model-provider.js";

const baseRequest = overrides => ({
  skill_id: "brief.extract",
  structured_input: { mode: "initial", user_text: "产品由3个模块组成" },
  schema: { id: "brief_candidate", version: "draft" },
  model_config: { provider_name: "mock", model_name: "makerflow-mock-v1" },
  trace_metadata: { run_id: "run-provider-001", prompt_version: "not_configured" },
  ...overrides
});

test("Mock Provider通过统一Adapter返回解析后的结构化输出", async () => {
  const adapter = createModelProviderAdapter({
    providers: {
      mock: createMockModelProvider({
        modelName: "makerflow-mock-v1",
        response: { fields: [], assumptions: [], brief_revision: 1 }
      })
    }
  });

  const result = await adapter.invoke(baseRequest());

  assert.equal(result.provider_name, "mock");
  assert.equal(result.model_name, "makerflow-mock-v1");
  assert.equal(result.parse_status, "parsed");
  assert.deepEqual(result.parsed_output, { fields: [], assumptions: [], brief_revision: 1 });
  assert.equal(result.error, null);
  assert.equal(typeof result.raw_output, "string");
  assert.equal(Number.isFinite(result.latency_ms), true);
});

test("Provider抛错时显式返回失败且不伪造parsed output", async () => {
  const adapter = createModelProviderAdapter({
    providers: {
      mock: createMockModelProvider({ error: new Error("mock unavailable") })
    }
  });

  const result = await adapter.invoke(baseRequest());

  assert.equal(result.parse_status, "not_attempted");
  assert.equal(result.raw_output, null);
  assert.equal(result.parsed_output, null);
  assert.deepEqual(result.error, { code: "PROVIDER_ERROR", message: "mock unavailable" });
});

test("Malformed JSON Fail Closed且不自动修补", async () => {
  const adapter = createModelProviderAdapter({
    providers: {
      mock: createMockModelProvider({ rawOutput: "{ invalid json" })
    }
  });

  const result = await adapter.invoke(baseRequest());

  assert.equal(result.raw_output, "{ invalid json");
  assert.equal(result.parsed_output, null);
  assert.equal(result.parse_status, "malformed");
  assert.equal(result.error.code, "MALFORMED_JSON");
});

test("未知Provider显式返回UNSUPPORTED_PROVIDER", async () => {
  const adapter = createModelProviderAdapter({ providers: {} });

  const result = await adapter.invoke(baseRequest({
    model_config: { provider_name: "unknown", model_name: "unknown-model" }
  }));

  assert.equal(result.provider_name, "unknown");
  assert.equal(result.model_name, "unknown-model");
  assert.equal(result.parse_status, "not_attempted");
  assert.deepEqual(result.error, { code: "UNSUPPORTED_PROVIDER", message: "Unsupported provider: unknown" });
});

test("Adapter在结果中保留独立的trace metadata快照", async () => {
  const trace = { run_id: "run-provider-002", prompt_version: "brief.extract.mock.v1", span: { attempt: 1 } };
  const adapter = createModelProviderAdapter({
    providers: { mock: createMockModelProvider({ response: { fields: [] } }) }
  });

  const result = await adapter.invoke(baseRequest({ trace_metadata: trace }));
  trace.span.attempt = 2;

  assert.deepEqual(result.trace_metadata, {
    run_id: "run-provider-002",
    prompt_version: "brief.extract.mock.v1",
    span: { attempt: 1 }
  });
});

test("Rule和Tool Skill不能通过Model Provider Adapter执行", async () => {
  const adapter = createModelProviderAdapter({
    providers: { mock: createMockModelProvider({ response: { validity: "valid" } }) }
  });

  for (const skill_id of ["brief.validate", "svg.render"]) {
    const result = await adapter.invoke(baseRequest({ skill_id }));
    assert.equal(result.parse_status, "not_attempted");
    assert.equal(result.parsed_output, null);
    assert.deepEqual(result.error, {
      code: "SKILL_NOT_MODEL_OWNED",
      message: `Skill cannot execute through Model Provider Adapter: ${skill_id}`
    });
  }
});
