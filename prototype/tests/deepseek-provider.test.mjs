import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";

import { createModelProviderAdapter } from "../provider-adapter.js";
import { createDeepSeekModelProvider } from "../../providers/deepseek-model-provider.js";
import { validateJsonSchema } from "../../providers/json-schema-validator.js";

const briefSchema = JSON.parse(fs.readFileSync(new URL("../../schemas/brief_state.schema.json", import.meta.url), "utf8"));

function request(overrides = {}) {
  return {
    skill_id: "brief.extract",
    structured_input: { mode: "initial", user_text: "产品由3个模块组成" },
    schema: briefSchema,
    messages: [{ role: "user", content: "return json" }],
    model_config: { provider_name: "deepseek", model_name: "deepseek-chat" },
    trace_metadata: { run_id: "smoke-test", prompt_version: "v0.1" },
    ...overrides
  };
}

function responseWithContent(content, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    async text() {
      return JSON.stringify(ok
        ? { model: "deepseek-chat", choices: [{ message: { content } }] }
        : { error: { message: "upstream rejected request" } });
    },
    async json() {
      return ok
        ? { choices: [{ message: { content } }] }
        : { error: { message: "upstream rejected request" } };
    }
  };
}

test("缺少DEEPSEEK_API_KEY时返回显式configuration error", async () => {
  const adapter = createModelProviderAdapter({
    providers: { deepseek: createDeepSeekModelProvider({ env: {}, fetchImpl: async () => assert.fail("must not fetch") }) }
  });

  const result = await adapter.invoke(request());

  assert.equal(result.parse_status, "not_attempted");
  assert.equal(result.parsed_output, null);
  assert.equal(result.error.code, "PROVIDER_CONFIGURATION_ERROR");
});

test("Provider Adapter拒绝非Model Skill", async () => {
  const adapter = createModelProviderAdapter({
    providers: { deepseek: createDeepSeekModelProvider({ env: { DEEPSEEK_API_KEY: crypto.randomUUID() }, fetchImpl: async () => assert.fail("must not fetch") }) }
  });

  const result = await adapter.invoke(request({ skill_id: "design_spec.build" }));

  assert.equal(result.parse_status, "not_attempted");
  assert.equal(result.error.code, "SKILL_NOT_MODEL_OWNED");
});

test("真实Provider边界通过Adapter返回brief_candidate且不泄露credential", async () => {
  const credential = crypto.randomUUID();
  let requestAuthorization = null;
  const briefCandidate = {
    brief_revision: 1,
    lifecycle: "draft",
    fields: [{ id: "module_count", value: 3, status: "needs_confirmation", critical: true, source: "user_input" }]
  };
  const provider = createDeepSeekModelProvider({
    env: { DEEPSEEK_API_KEY: credential },
    fetchImpl: async (_url, options) => {
      requestAuthorization = options.headers.Authorization;
      return responseWithContent(JSON.stringify(briefCandidate));
    }
  });
  const adapter = createModelProviderAdapter({ providers: { deepseek: provider }, schemaValidator: validateJsonSchema });

  const result = await adapter.invoke(request());

  assert.equal(requestAuthorization, `Bearer ${credential}`);
  assert.equal(result.provider_name, "deepseek");
  assert.equal(result.model_name, "deepseek-chat");
  assert.equal(result.parse_status, "parsed");
  assert.equal(result.schema_validation.status, "valid");
  assert.deepEqual(result.parsed_output, briefCandidate);
  assert.equal(JSON.stringify(result).includes(credential), false);
});

test("DeepSeek HTTP失败显式返回且不产生parsed output", async () => {
  const adapter = createModelProviderAdapter({
    providers: {
      deepseek: createDeepSeekModelProvider({
        env: { DEEPSEEK_API_KEY: crypto.randomUUID() },
        fetchImpl: async () => responseWithContent(null, { ok: false, status: 429 })
      })
    }
  });

  const result = await adapter.invoke(request());

  assert.equal(result.parse_status, "not_attempted");
  assert.equal(result.parsed_output, null);
  assert.equal(result.error.code, "PROVIDER_HTTP_ERROR");
  assert.equal(result.error.message.includes("429"), true);
});

test("Schema invalid时Adapter Fail Closed", async () => {
  const adapter = createModelProviderAdapter({
    providers: {
      deepseek: createDeepSeekModelProvider({
        env: { DEEPSEEK_API_KEY: crypto.randomUUID() },
        fetchImpl: async () => responseWithContent(JSON.stringify({ fields: [] }))
      })
    },
    schemaValidator: validateJsonSchema
  });

  const result = await adapter.invoke(request());

  assert.equal(result.parse_status, "parsed");
  assert.equal(result.schema_validation.status, "invalid");
  assert.equal(result.parsed_output, null);
  assert.equal(result.error.code, "SCHEMA_INVALID");
});
