import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createSkillHandler } from "../../api/skills/[skill].mjs";
import healthHandler from "../../api/health.mjs";

function responseRecorder() {
  return {
    statusCode: 200,
    headers: {},
    payload: undefined,
    status(code) { this.statusCode = code; return this; },
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    json(payload) { this.payload = payload; return this; }
  };
}

test("Vercel brief.extract route复用existing executor", async () => {
  let received;
  const handler = createSkillHandler({
    executeBriefExtract: async input => {
      received = input;
      return { ok: true, brief_candidate: { fields: [] }, trace: { provider_name: "deepseek" } };
    }
  });
  const response = responseRecorder();
  await handler({ method: "POST", query: { skill: "brief.extract" }, body: { user_input: "说明卡", attachments: [] } }, response);
  assert.equal(response.statusCode, 200);
  assert.equal(response.payload.skill_id, "brief.extract");
  assert.equal(received.taskInput.user_text, "说明卡");
});

test("Vercel brief.ask_missing route复用existing executor", async () => {
  let called = false;
  const handler = createSkillHandler({
    executeBriefAskMissing: async ({ structuredInput }) => {
      called = structuredInput.missing_items[0] === "finished_size";
      return { ok: true, clarifying_questions: [{ field_id: "finished_size" }], trace: {} };
    }
  });
  const response = responseRecorder();
  await handler({ method: "POST", query: { skill: "brief.ask_missing" }, body: { brief_candidate: {}, brief_validation_result: {}, missing_items: ["finished_size"], conflict_items: [] } }, response);
  assert.equal(called, true);
  assert.equal(response.payload.clarifying_questions[0].field_id, "finished_size");
});

test("Vercel plan.generate route复用existing executor", async () => {
  let revision;
  const handler = createSkillHandler({
    executePlanGenerate: async ({ confirmedBrief }) => {
      revision = confirmedBrief.brief_revision;
      return { ok: true, creative_plan: { plan_id: "p1" }, trace: {} };
    }
  });
  const response = responseRecorder();
  await handler({ method: "POST", query: { skill: "plan.generate" }, body: { confirmed_brief: { lifecycle: "confirmed", brief_revision: 1 } } }, response);
  assert.equal(revision, 1);
  assert.equal(response.payload.creative_plan.plan_id, "p1");
});

test("Vercel health只返回公开健康状态", async () => {
  const response = responseRecorder();
  await healthHandler({ method: "GET", headers: { authorization: "must-not-echo" } }, response);
  assert.deepEqual(response.payload, { ok: true });
  assert.doesNotMatch(JSON.stringify(response.payload), /authorization|secret|api[_-]?key/i);
});

test("Vercel provider failure保持Fail Closed且不返回fixture", async () => {
  const handler = createSkillHandler({
    executeBriefExtract: async () => ({ ok: false, error: { code: "PROVIDER_HTTP_ERROR", message: "private upstream detail" } })
  });
  const response = responseRecorder();
  await handler({ method: "POST", query: { skill: "brief.extract" }, body: { user_input: "说明卡", attachments: [] } }, response);
  assert.equal(response.statusCode, 502);
  assert.equal(response.payload.ok, false);
  assert.equal("brief_candidate" in response.payload, false);
  assert.doesNotMatch(JSON.stringify(response.payload), /fixture|private upstream detail/i);
});

test("Browser保持same-origin且client bundle不包含Secret", async () => {
  const clientFiles = ["prototype/brief-extract-client.js", "prototype/plan-generate-client.js", "prototype/app.js"];
  const source = (await Promise.all(clientFiles.map(file => readFile(file, "utf8")))).join("\n");
  assert.match(source, /\.\/api\/skills\/brief\.extract/);
  assert.match(source, /\.\/api\/skills\/brief\.ask_missing/);
  assert.match(source, /\.\/api\/skills\/plan\.generate/);
  assert.doesNotMatch(source, /DEEPSEEK_API_KEY|Authorization\s*:/);
});

test("Vercel配置将根路径映射到现有prototype且保留API URL", async () => {
  const config = JSON.parse(await readFile("vercel.json", "utf8"));
  assert.equal(config.outputDirectory, "prototype");
  assert.ok(config.rewrites.some(rule => rule.source === "/health" && rule.destination === "/api/health"));
  assert.equal("builds" in config, false);
});
