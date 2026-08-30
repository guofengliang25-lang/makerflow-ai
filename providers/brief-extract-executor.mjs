import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createModelProviderAdapter } from "../prototype/provider-adapter.js";
import { createDeepSeekModelProvider } from "./deepseek-model-provider.js";
import { validateJsonSchema } from "./json-schema-validator.js";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "..");
const defaultPromptPath = join(projectRoot, "prompts", "brief.extract", "v0.1.md");
const defaultSchemaPath = join(projectRoot, "schemas", "brief_state.schema.json");

function extractBaselinePrompt(markdown) {
  const match = markdown.match(/```text\r?\n([\s\S]*?)\r?\n```/);
  if (!match) throw new Error("brief.extract Prompt v0.1 does not contain a text prompt block.");
  return match[1];
}

function renderPrompt(template, taskInput, schema, existingConfirmedContext) {
  return template
    .replace("{{task_input_json}}", JSON.stringify(taskInput, null, 2))
    .replace("{{brief_candidate_schema_json}}", JSON.stringify(schema, null, 2))
    .replace("{{existing_confirmed_context_json}}", JSON.stringify(existingConfirmedContext??null,null,2));
}

export async function executeBriefExtract({
  taskInput,
  env = process.env,
  fetchImpl = globalThis.fetch,
  schemaOverride,
  promptTextOverride,
  existingConfirmedContext=null,
  runId = randomUUID()
} = {}) {
  const schema = schemaOverride || JSON.parse(await readFile(defaultSchemaPath, "utf8"));
  const promptMarkdown = promptTextOverride || await readFile(defaultPromptPath, "utf8");
  const promptTemplate = promptTextOverride || extractBaselinePrompt(promptMarkdown);
  const adapter = createModelProviderAdapter({
    providers: { deepseek: createDeepSeekModelProvider({ env, fetchImpl }) },
    schemaValidator: validateJsonSchema
  });
  const result = await adapter.invoke({
    skill_id: "brief.extract",
    messages: [{ role: "system", content: renderPrompt(promptTemplate, taskInput, schema,existingConfirmedContext) }],
    structured_input: taskInput,
    schema,
    model_config: { provider_name: "deepseek", model_name: "deepseek-chat", temperature: 0 },
    trace_metadata: { skill_id: "brief.extract", run_id: runId, prompt_version: "v0.1" }
  });
  const trace = {
    provider_name: result.provider_name,
    model_name: result.model_name,
    prompt_version: "v0.1",
    run_id: runId,
    latency_ms: result.latency_ms,
    parse_status: result.parse_status,
    schema_validation: result.schema_validation?.status || "not_run"
  };
  if (result.error) {
    return { ok: false, error: result.error, trace, raw_output: result.raw_output, parsed_output: null };
  }
  return {
    ok: true,
    skill_id: "brief.extract",
    brief_candidate: result.parsed_output,
    trace,
    raw_output: result.raw_output,
    parsed_output: result.parsed_output
  };
}
