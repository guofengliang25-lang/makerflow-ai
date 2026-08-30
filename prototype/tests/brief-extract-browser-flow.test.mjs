import assert from "node:assert/strict";
import test from "node:test";

async function loadClient() {
  try {
    return await import("../brief-extract-client.js");
  } catch (error) {
    assert.fail(`brief-extract-client.js must expose the browser flow: ${error.code || error.message}`);
  }
}

test("browser request contains user input and attachments but never credentials", async () => {
  const { extractAndValidateBrief } = await loadClient();
  let captured;
  const fetchImpl = async (url, options) => {
    captured = { url, options };
    return { ok: false, status: 503, json: async () => ({ ok: false, error: { code: "PROVIDER_CONFIGURATION_ERROR", message: "未配置模型服务。" } }) };
  };
  await extractAndValidateBrief({
    userInput: "做一张说明卡",
    attachments: [{ name: "ref.svg", type: "image/svg+xml", size: 10 }],
    fetchImpl,
    validateBrief: () => assert.fail("validation must not run on API failure")
  });
  assert.equal(captured.url, "./api/skills/brief.extract");
  const requestText = JSON.stringify(captured.options);
  assert.doesNotMatch(requestText, /deepseek|authorization|api[_-]?key|bearer/i);
  assert.deepEqual(JSON.parse(captured.options.body), {
    user_input: "做一张说明卡",
    attachments: [{ name: "ref.svg", type: "image/svg+xml", size: 10 }]
  });
});

test("malformed, schema-invalid and provider errors cannot advance to Step 2 or load a fixture", async () => {
  const { extractAndValidateBrief } = await loadClient();
  for (const code of ["MALFORMED_JSON", "SCHEMA_INVALID", "PROVIDER_HTTP_ERROR"]) {
    let validationCalls = 0;
    const result = await extractAndValidateBrief({
      userInput: "原始输入必须保留",
      attachments: [],
      fetchImpl: async () => ({ ok: false, status: 502, json: async () => ({ ok: false, error: { code, message: "无法理解需求，请重试。" } }) }),
      validateBrief: () => { validationCalls += 1; }
    });
    assert.equal(result.ok, false);
    assert.equal(result.can_enter_step_2, false);
    assert.equal(result.user_input, "原始输入必须保留");
    assert.equal(result.brief_candidate, null);
    assert.equal(validationCalls, 0);
  }
});

test("successful API response invokes formal brief.validate before Step 2 is allowed", async () => {
  const { extractAndValidateBrief } = await loadClient();
  const candidate = {
    brief_revision: 1,
    lifecycle: "draft",
    fields: [],
    finished_size: { preset_size: "custom", width: "", height: "", unit: "mm", status: "missing" }
  };
  let validatedInput;
  const result = await extractAndValidateBrief({
    userInput: "尺寸还没确定",
    attachments: [],
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ ok: true, skill_id: "brief.extract", brief_candidate: candidate, trace: { parse_status: "parsed", schema_validation: "valid" } }) }),
    validateBrief: input => {
      validatedInput = input;
      return { brief_validation_result: { validity: "invalid", missing_items: ["finished_size.width"] } };
    }
  });
  assert.deepEqual(validatedInput, { brief_candidate: candidate });
  assert.equal(result.ok, true);
  assert.equal(result.can_enter_step_2, true);
  assert.equal(result.brief_candidate, candidate);
  assert.equal(result.brief_validation_result.validity, "invalid");
});

test("editor preparation preserves extracted fields and adds only explicit missing UI fields", async () => {
  const { prepareBriefForEditor } = await loadClient();
  const candidate = {
    brief_revision: 2,
    lifecycle: "draft",
    fields: [{ id: "module_count", value: 3, status: "needs_confirmation", critical: true, evidence: "user input" }]
  };
  const brief = prepareBriefForEditor(candidate, {
    brief_revision: 2,
    normalized_finished_size: { preset_size: "custom", width: "", height: "", unit: "mm", status: "missing" }
  });
  assert.equal(brief.fields.find(field => field.id === "module_count").value, 3);
  assert.equal(brief.fields.find(field => field.id === "deliverable").status, "missing");
  assert.equal(brief.finished_size.status, "missing");
  assert.equal(brief.lifecycle, "draft");
  assert.equal(brief.confirmed, false);
});

test("QA trace exposes only the approved sanitized model fields", async () => {
  const { sanitizeModelTrace } = await loadClient();
  const trace = sanitizeModelTrace({
    provider_name: "deepseek",
    model_name: "deepseek-chat",
    prompt_version: "v0.1",
    run_id: "run-qa-001",
    latency_ms: 321,
    parse_status: "parsed",
    schema_validation: "valid",
    authorization: "Bearer must-not-leak",
    stack: "internal stack"
  });
  assert.deepEqual(trace, {
    provider_name: "deepseek",
    model_name: "deepseek-chat",
    prompt_version: "v0.1",
    run_id: "run-qa-001",
    latency_ms: 321,
    parse_status: "parsed",
    schema_validation: "valid"
  });
});

test("clarification re-enters extract with original input and confirmed context",async()=>{
  const {clarifyAndValidateBrief}=await loadClient();let request;
  const previous={brief_revision:1,lifecycle:"draft",fields:[{id:"product_facts",value:"模块可拆卸",status:"confirmed",critical:true}],finished_size:{preset_size:"custom",width:"",height:"",unit:"mm",status:"missing"}};
  const incoming={...previous,fields:[{id:"product_facts",value:"被覆盖",status:"needs_confirmation",critical:true}],finished_size:{preset_size:"custom",width:"",height:"",unit:"mm",status:"missing"}};
  const result=await clarifyAndValidateBrief({originalUserInput:"尺寸未定",previousBrief:previous,answers:[{question_id:"q1",field_id:"finished_size",answer:"148 × 105 mm"}],fetchImpl:async(url,options)=>{request=JSON.parse(options.body);return{ok:true,json:async()=>({ok:true,brief_candidate:incoming,trace:{}})}},validateBrief:({brief_candidate})=>({brief_validation_result:{can_confirm:true,validity:"valid",missing_items:[],conflict_items:[],normalized_finished_size:brief_candidate.finished_size}})});
  assert.equal(request.mode,"clarification");assert.equal(request.original_user_input,"尺寸未定");assert.equal(result.brief_candidate.fields[0].value,"模块可拆卸");assert.equal(result.brief_candidate.finished_size.width,148);
});
