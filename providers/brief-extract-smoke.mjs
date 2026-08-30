import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { executeBriefExtract } from "./brief-extract-executor.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, "..");
const defaultArtifactDir = join(projectRoot, "evals", "artifacts", "deepseek");

function summarizeRaw(rawOutput) {
  if (!rawOutput) return null;
  return rawOutput.replace(/\s+/g, " ").slice(0, 500);
}

export async function runBriefExtractSmoke({
  env = process.env,
  fetchImpl = globalThis.fetch,
  artifactDir = defaultArtifactDir,
  schemaOverride,
  promptTextOverride,
  runId = randomUUID()
} = {}) {
  const taskInput = {
    mode: "initial",
    user_text: "产品由3个模块组成",
    reference_attachments: [],
    existing_files: [],
    clarification_answers: null,
    source_metadata: { source: "smoke_test" }
  };
  const execution = await executeBriefExtract({ taskInput, env, fetchImpl, schemaOverride, promptTextOverride, runId });

  const artifact = {
    provider_name: execution.trace.provider_name,
    model_name: execution.trace.model_name,
    prompt_version: "v0.1",
    skill_id: "brief.extract",
    run_id: runId,
    latency_ms: execution.trace.latency_ms,
    parse_status: execution.error?.code === "SCHEMA_INVALID" ? "schema_invalid" : execution.trace.parse_status,
    schema_validation: { status: execution.trace.schema_validation },
    error: execution.error?.code === "SCHEMA_INVALID"
      ? { code: "SCHEMA_VALIDATION_ERROR", message: "DeepSeek output does not match the Brief schema." }
      : execution.error || null,
    raw_output: execution.raw_output,
    parsed_output: execution.brief_candidate || null
  };
  await mkdir(artifactDir, { recursive: true });
  const artifactPath = join(artifactDir, `brief_extract_smoke_${runId.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`);
  await writeFile(artifactPath, JSON.stringify(artifact, null, 2), "utf8");

  return {
    ...artifact,
    brief_candidate: execution.brief_candidate || null,
    raw_response_summary: summarizeRaw(execution.raw_output),
    artifact_path: artifactPath
  };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const result = await runBriefExtractSmoke();
  console.log(JSON.stringify({
    provider_name: result.provider_name,
    model_name: result.model_name,
    prompt_version: result.prompt_version,
    skill_id: result.skill_id,
    run_id: result.run_id,
    latency_ms: result.latency_ms,
    parse_status: result.parse_status,
    schema_validation: result.schema_validation,
    error: result.error,
    raw_response_summary: result.raw_response_summary,
    brief_candidate_created: Boolean(result.brief_candidate)
  }, null, 2));
  if (result.error) process.exitCode = 1;
}
