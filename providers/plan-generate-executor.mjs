import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createModelProviderAdapter } from "../prototype/provider-adapter.js";
import { createDeepSeekModelProvider } from "./deepseek-model-provider.js";
import { validateJsonSchema } from "./json-schema-validator.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const promptPath = join(root, "prompts", "plan.generate", "v0.1.md");
const schemaPath = join(root, "schemas", "creative_plan.schema.json");
const ALLOWED = new Set(["form", "information_hierarchy", "visual_aid", "color_direction", "material_direction"]);

const promptBlock = markdown => markdown.match(/```text\r?\n([\s\S]*?)\r?\n```/)?.[1];
const fieldMap = brief => new Map((brief.fields || []).map(field => [field.id, field]));

export function unresolvedPlanFields(brief) {
  const fields = fieldMap(brief);
  const unresolved = [];
  for (const id of ["form", "color_direction", "material_direction"]) {
    const field = fields.get(id);
    if (!field || ["assumed", "missing", "needs_confirmation"].includes(field.status)) unresolved.push(id);
  }
  const hierarchy = fields.get("information_hierarchy");
  if (!hierarchy || ["assumed", "missing", "needs_confirmation"].includes(hierarchy.status)) unresolved.push("information_hierarchy");
  const visual = brief.visual_aid_requirement;
  if (!visual || visual.status === "undecided" || visual.field_status === "needs_confirmation" || visual.preferred_type === "let_system_recommend") unresolved.push("visual_aid");
  return [...new Set(unresolved)];
}

function lockedContext(brief) {
  return {
    deliverable: fieldsValue(brief, "deliverable"), purpose: fieldsValue(brief, "purpose"),
    must_content: fieldsValue(brief, "must_content"), product_facts: fieldsValue(brief, "product_facts"),
    finished_size: brief.finished_size
  };
}
function fieldsValue(brief, id) { return fieldMap(brief).get(id)?.value ?? null; }

export async function executePlanGenerate({ confirmedBrief, env = process.env, fetchImpl = globalThis.fetch, runId = randomUUID() } = {}) {
  if (!confirmedBrief || confirmedBrief.lifecycle !== "confirmed" || !Number.isInteger(confirmedBrief.brief_revision)) {
    return { ok: false, error: { code: "BRIEF_NOT_CONFIRMED", message: "plan.generate requires a confirmed Brief revision." }, trace: null };
  }
  const schema = JSON.parse(await readFile(schemaPath, "utf8"));
  const template = promptBlock(await readFile(promptPath, "utf8"));
  const unresolved = unresolvedPlanFields(confirmedBrief);
  const structuredInput = {
    confirmed_brief: { brief_revision: confirmedBrief.brief_revision, lifecycle: confirmedBrief.lifecycle, locked_context: lockedContext(confirmedBrief) },
    unresolved_non_critical_fields: unresolved,
    relevant_context: { visual_aid_requirement: confirmedBrief.visual_aid_requirement || null },
    provider_metadata: { provider_name: "deepseek", model_name: "deepseek-chat", prompt_version: "v0.1", run_id: runId }
  };
  const prompt = template.replace("{{structured_input_json}}", JSON.stringify(structuredInput, null, 2)).replace("{{output_schema_json}}", JSON.stringify(schema, null, 2));
  const adapter = createModelProviderAdapter({ providers: { deepseek: createDeepSeekModelProvider({ env, fetchImpl }) }, schemaValidator: validateJsonSchema });
  const result = await adapter.invoke({ skill_id: "plan.generate", messages: [{ role: "system", content: prompt }], structured_input: structuredInput, schema, model_config: { provider_name: "deepseek", model_name: "deepseek-chat", temperature: 0 }, trace_metadata: { skill_id: "plan.generate", run_id: runId, prompt_version: "v0.1" } });
  const trace = { provider_name: result.provider_name, model_name: result.model_name, prompt_version: "v0.1", run_id: runId, latency_ms: result.latency_ms, parse_status: result.parse_status, schema_validation: result.schema_validation?.status || "not_run" };
  if (result.error) return { ok: false, error: result.error, trace };
  const plan = result.parsed_output;
  if (plan.source_brief_revision !== confirmedBrief.brief_revision) return { ok: false, error: { code: "PLAN_BRIEF_REVISION_MISMATCH", message: "Creative Plan references a different Brief revision." }, trace };
  const allowed = new Set(unresolved);
  if (plan.recommendations.some(item => !ALLOWED.has(item.decision_type) || !allowed.has(item.decision_type))) return { ok: false, error: { code: "PLAN_SCOPE_INVALID", message: "Creative Plan recommends a locked or resolved field." }, trace };
  plan.provider_metadata = { provider_name: trace.provider_name, model_name: trace.model_name, prompt_version: trace.prompt_version, run_id: trace.run_id };
  return { ok: true, skill_id: "plan.generate", creative_plan: plan, trace };
}
