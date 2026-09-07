import assert from "node:assert/strict";
import test from "node:test";

async function loadServer() {
  try {
    return await import("../../server.mjs");
  } catch (error) {
    assert.fail(`server.mjs must expose the brief.extract API: ${error.code || error.message}`);
  }
}

async function withServer(options, run) {
  const { createMakerFlowServer } = await loadServer();
  const server = createMakerFlowServer(options);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

test("POST brief.extract missing key fails closed with a sanitized configuration error", async () => {
  await withServer({ env: {}, fetchImpl: async () => assert.fail("must not call DeepSeek") }, async baseUrl => {
    const response = await fetch(`${baseUrl}/api/skills/brief.extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_input: "做一张说明卡", attachments: [] })
    });
    const body = await response.json();
    assert.equal(response.status, 503);
    assert.equal(body.ok, false);
    assert.equal(body.error.code, "PROVIDER_CONFIGURATION_ERROR");
    assert.equal("brief_candidate" in body, false);
    assert.doesNotMatch(JSON.stringify(body), /authorization|api[_-]?key|stack/i);
  });
});

test("POST brief.extract returns a validated brief_candidate through the shared executor", async () => {
  const candidate = {
    brief_revision: 1,
    lifecycle: "draft",
    fields: [{ id: "deliverable", value: "说明卡", status: "confirmed", critical: true }],
    finished_size: { preset_size: "custom", width: "", height: "", unit: "mm", status: "missing" }
  };
  const executor = async ({ taskInput }) => ({
    ok: true,
    brief_candidate: candidate,
    trace: {
      provider_name: "deepseek",
      model_name: "deepseek-chat",
      prompt_version: "v0.1",
      run_id: "run-test",
      latency_ms: 12,
      parse_status: "parsed",
      schema_validation: "valid"
    },
    received_task_input: taskInput
  });
  await withServer({ executeBriefExtract: executor }, async baseUrl => {
    const response = await fetch(`${baseUrl}/api/skills/brief.extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "must-not-echo" },
      body: JSON.stringify({ user_input: "做一张说明卡", attachments: [{ name: "ref.svg", type: "image/svg+xml" }] })
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.deepEqual(body.brief_candidate, candidate);
    assert.equal(body.skill_id, "brief.extract");
    assert.equal(body.trace.schema_validation, "valid");
    assert.doesNotMatch(JSON.stringify(body), /authorization|must-not-echo|api[_-]?key|stack/i);
  });
});

test("server maps malformed, schema-invalid and provider failures to sanitized fail-closed envelopes", async () => {
  for (const [code, expectedMessage] of [
    ["MALFORMED_JSON", "模型返回格式无法解析，请重试。"],
    ["SCHEMA_INVALID", "模型返回内容未通过结构校验，请重试。"],
    ["PROVIDER_HTTP_ERROR", "模型服务暂时不可用，请稍后重试。"]
  ]) {
    await withServer({ executeBriefExtract: async () => ({ ok: false, error: { code, message: "safe message" } }) }, async baseUrl => {
      const response = await fetch(`${baseUrl}/api/skills/brief.extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_input: "说明卡", attachments: [] })
      });
      const body = await response.json();
      assert.equal(response.status, 502);
      assert.deepEqual(body, { ok: false, skill_id: "brief.extract", error: { code, message: expectedMessage } });
    });
  }
});

test("POST brief.ask_missing returns only Rule-scoped questions and no credentials",async()=>{
  await withServer({executeBriefAskMissing:async({structuredInput})=>({ok:true,clarifying_questions:[{question_id:"q1",field_id:structuredInput.missing_items[0],question:"成品需要多宽和多高？",reason:"完成尺寸信息",priority:"P0"}],trace:{provider_name:"deepseek",prompt_version:"v0.1"}})},async baseUrl=>{
    const response=await fetch(`${baseUrl}/api/skills/brief.ask_missing`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"must-not-echo"},body:JSON.stringify({brief_candidate:{},brief_validation_result:{},missing_items:["finished_size"],conflict_items:[],confirmed_context:{}})});const body=await response.json();assert.equal(body.ok,true);assert.equal(body.clarifying_questions[0].field_id,"finished_size");assert.doesNotMatch(JSON.stringify(body),/authorization|must-not-echo|api[_-]?key/i);
  });
});

test("POST plan.generate uses the shared executor and never echoes credentials", async () => {
  const brief = { brief_revision: 2, lifecycle: "confirmed", fields: [] };
  const plan = { plan_id: "p2", source_brief_revision: 2, recommendations: [], unresolved_items: [], provider_metadata: { provider_name: "deepseek", model_name: "deepseek-chat", prompt_version: "v0.1", run_id: "run-p2" } };
  await withServer({ executePlanGenerate: async ({ confirmedBrief }) => ({ ok: true, creative_plan: { ...plan, source_brief_revision: confirmedBrief.brief_revision }, trace: plan.provider_metadata }) }, async baseUrl => {
    const response = await fetch(`${baseUrl}/api/skills/plan.generate`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "must-not-echo" }, body: JSON.stringify({ confirmed_brief: brief }) });
    const body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.creative_plan.source_brief_revision, 2);
    assert.doesNotMatch(JSON.stringify(body), /authorization|must-not-echo|api[_-]?key|stack/i);
  });
});

test("POST plan.generate rejects draft Brief and sanitizes provider failure", async () => {
  await withServer({ executePlanGenerate: async () => ({ ok: false, error: { code: "PROVIDER_HTTP_ERROR", message: "secret upstream detail" } }) }, async baseUrl => {
    const draft = await fetch(`${baseUrl}/api/skills/plan.generate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmed_brief: { brief_revision: 1, lifecycle: "draft" } }) });
    assert.equal(draft.status, 400);
    const failed = await fetch(`${baseUrl}/api/skills/plan.generate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmed_brief: { brief_revision: 1, lifecycle: "confirmed" } }) });
    const body = await failed.json();
    assert.equal(failed.status, 502);
    assert.equal(body.error.code, "PROVIDER_HTTP_ERROR");
    assert.doesNotMatch(JSON.stringify(body), /secret upstream detail|stack/i);
  });
});

test("POST plan.generate replacement模式复用同一executor并返回单项candidate",async()=>{
  let input;const brief={brief_revision:2,lifecycle:"confirmed",fields:[]},rejected={recommendation_id:"a",decision_type:"form",suggestion:"A"};
  await withServer({executePlanGenerate:async value=>{input=value;return{ok:true,replacement_recommendation:{...rejected,recommendation_id:"b",suggestion:"B"},trace:{}};}},async baseUrl=>{
    const response=await fetch(`${baseUrl}/api/skills/plan.generate`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:"replace_recommendation",confirmed_brief:brief,source_brief_revision:2,decision_type:"form",rejected_recommendation:rejected,previous_rejected_suggestions:["A"]})}),body=await response.json();
    assert.equal(input.mode,"replace_recommendation");assert.equal(input.decisionType,"form");assert.equal(body.replacement_recommendation.recommendation_id,"b");assert.equal(body.creative_plan,undefined);
  });
});
