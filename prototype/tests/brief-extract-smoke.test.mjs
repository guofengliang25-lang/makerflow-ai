import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

import { validateJsonSchema } from "../../providers/json-schema-validator.js";
import { runBriefExtractSmoke } from "../../providers/brief-extract-smoke.mjs";

const schema = {
  type: "object",
  required: ["brief_revision", "lifecycle", "fields"],
  properties: {
    brief_revision: { type: "integer", minimum: 1 },
    lifecycle: { type: "string", enum: ["draft", "ready_for_confirmation", "confirmed", "superseded"] },
    fields: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "status", "critical"],
        properties: {
          id: { type: "string", minLength: 1 },
          status: { type: "string", enum: ["confirmed", "assumed", "missing", "needs_confirmation"] },
          critical: { type: "boolean" }
        }
      }
    }
  }
};

test("JSON Schema validator接受合法Brief Candidate并拒绝非法enum", () => {
  const valid = { brief_revision: 1, lifecycle: "draft", fields: [{ id: "module_count", status: "needs_confirmation", critical: true }] };
  const invalid = { ...valid, fields: [{ id: "module_count", status: "confirmed_by_model", critical: true }] };

  assert.deepEqual(validateJsonSchema(valid, schema), { valid: true, errors: [] });
  const result = validateJsonSchema(invalid, schema);
  assert.equal(result.valid, false);
  assert.match(result.errors[0], /enum/);
});

test("Schema invalid的DeepSeek输出Fail Closed且不形成brief_candidate", async () => {
  const artifactDir = await mkdtemp(join(tmpdir(), "makerflow-smoke-invalid-"));
  const fetchImpl = async () => new Response(JSON.stringify({
    model: "deepseek-chat",
    choices: [{ message: { content: '{"brief_revision":1,"lifecycle":"draft","fields":[{"id":"module_count","status":"confirmed_by_model","critical":true}]}' } }]
  }), { status: 200 });

  const result = await runBriefExtractSmoke({
    env: { DEEPSEEK_API_KEY: `runtime-${randomUUID()}` },
    fetchImpl,
    artifactDir,
    schemaOverride: schema,
    promptTextOverride: "Return JSON for {{task_input_json}} using {{brief_candidate_schema_json}} and {{existing_confirmed_context_json}}"
  });

  assert.equal(result.parse_status, "schema_invalid");
  assert.equal(result.schema_validation.status, "invalid");
  assert.equal(result.brief_candidate, null);
  assert.equal(result.error.code, "SCHEMA_VALIDATION_ERROR");
});

test("单条brief.extract smoke通过Adapter保存无凭据的raw artifact并形成candidate", async () => {
  const artifactDir = await mkdtemp(join(tmpdir(), "makerflow-smoke-valid-"));
  const runtimeCredential = `runtime-${randomUUID()}`;
  const raw = '{"brief_revision":1,"lifecycle":"draft","fields":[{"id":"module_count","value":3,"status":"needs_confirmation","critical":true,"source":"user_input"}]}';
  const fetchImpl = async () => new Response(JSON.stringify({
    model: "deepseek-chat",
    choices: [{ message: { content: raw } }]
  }), { status: 200 });

  const result = await runBriefExtractSmoke({
    env: { DEEPSEEK_API_KEY: runtimeCredential },
    fetchImpl,
    artifactDir,
    schemaOverride: schema,
    promptTextOverride: "Return JSON for {{task_input_json}} using {{brief_candidate_schema_json}} and {{existing_confirmed_context_json}}",
    runId: "smoke-test-run"
  });

  assert.equal(result.provider_name, "deepseek");
  assert.equal(result.prompt_version, "v0.1");
  assert.equal(result.parse_status, "parsed");
  assert.equal(result.schema_validation.status, "valid");
  assert.equal(result.brief_candidate.fields[0].value, 3);
  const artifactText = await readFile(result.artifact_path, "utf8");
  const artifact = JSON.parse(artifactText);
  assert.equal(artifactText.includes(runtimeCredential), false);
  assert.equal(artifact.raw_output, raw);
});
