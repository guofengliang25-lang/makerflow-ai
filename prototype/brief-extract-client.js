import {BRIEF_CRITICAL_FIELD_IDS} from "./brief-validate.js";
const isCritical=id=>BRIEF_CRITICAL_FIELD_IDS.includes(id);
const FIELD_CATALOG = [
  ["deliverable", "最终交付物", isCritical("deliverable")],
  ["purpose", "用途", isCritical("purpose")],
  ["target_user", "目标用户", false],
  ["must_content", "最终需要呈现", isCritical("must_content")],
  ["product_facts", "已确认产品事实", isCritical("product_facts")],
  ["form", "形式", false],
  ["material_direction", "材料方向", false],
  ["color_direction", "颜色方向", false],
  ["output_format", "输出格式", false],
  ["maker_source", "制作要求来源（可选）", false, true]
];

const TRACE_FIELDS = [
  "provider_name",
  "model_name",
  "prompt_version",
  "run_id",
  "latency_ms",
  "parse_status",
  "schema_validation"
];

export function sanitizeModelTrace(trace) {
  if (!trace || typeof trace !== "object") return null;
  return Object.fromEntries(TRACE_FIELDS.map(key => [key, trace[key] ?? null]));
}

export async function extractAndValidateBrief({ userInput, attachments = [], fetchImpl = globalThis.fetch, validateBrief }) {
  let response;
  let envelope;
  try {
    response = await fetchImpl("./api/skills/brief.extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_input: userInput, attachments })
    });
    envelope = await response.json();
  } catch {
    return {
      ok: false,
      can_enter_step_2: false,
      user_input: userInput,
      brief_candidate: null,
      error: { code: "NETWORK_ERROR", message: "无法连接本地MakerFlow服务，请确认服务已启动后重试。" }
    };
  }
  if (!response.ok || !envelope.ok || !envelope.brief_candidate) {
    return {
      ok: false,
      can_enter_step_2: false,
      user_input: userInput,
      brief_candidate: null,
      error: envelope.error || { code: "REQUEST_FAILED", message: "无法理解需求，请重试。" }
    };
  }
  const validation = validateBrief({ brief_candidate: envelope.brief_candidate });
  return {
    ok: true,
    can_enter_step_2: true,
    user_input: userInput,
    brief_candidate: envelope.brief_candidate,
    brief_validation_result: validation.brief_validation_result,
    trace: sanitizeModelTrace(envelope.trace)
  };
}

export async function requestMissingQuestions({briefCandidate,validationResult,confirmedContext={},fetchImpl=globalThis.fetch}){
  try{
    const response=await fetchImpl("./api/skills/brief.ask_missing",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({brief_candidate:briefCandidate,brief_validation_result:validationResult,missing_items:validationResult.missing_items||[],conflict_items:validationResult.conflict_items||[],confirmed_context:confirmedContext})});
    const envelope=await response.json();
    if(!response.ok||!envelope.ok)return{ok:false,error:envelope.error||{code:"ASK_FAILED",message:"问题生成失败，请重试或手工编辑。"}};
    return{ok:true,questions:envelope.clarifying_questions,trace:sanitizeModelTrace(envelope.trace)};
  }catch{return{ok:false,error:{code:"NETWORK_ERROR",message:"问题生成失败，请重试或手工编辑。"}}}
}

function mergeClarification(previous,incoming){
  const next=structuredClone(incoming),map=new Map((next.fields||[]).map(f=>[f.id,f]));
  for(const old of previous.fields||[]){if(old.status==="confirmed")map.set(old.id,structuredClone(old));else if(!map.has(old.id))map.set(old.id,structuredClone(old));}
  next.fields=[...map.values()];next.brief_revision=previous.brief_revision;next.lifecycle="draft";return next;
}

function applyExplicitClarification(candidate,answers){
  const next=structuredClone(candidate),sizeAnswer=answers.find(item=>item.field_id==="finished_size");
  if(sizeAnswer){const match=String(sizeAnswer.answer).match(/(\d+(?:\.\d+)?)\s*[×xX*]\s*(\d+(?:\.\d+)?)\s*(mm|cm)?/i);if(match)next.finished_size={preset_size:"custom",width:Number(match[1]),height:Number(match[2]),unit:(match[3]||"mm").toLowerCase(),status:"confirmed",source:"human_clarification"};}
  return next;
}

export async function clarifyAndValidateBrief({originalUserInput,previousBrief,answers,attachments=[],fetchImpl=globalThis.fetch,validateBrief}){
  let response,envelope;
  try{response=await fetchImpl("./api/skills/brief.extract",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:"clarification",user_input:answers.map(a=>a.answer).join("\n"),original_user_input:originalUserInput,attachments,clarification_answers:answers,existing_confirmed_context:{fields:(previousBrief.fields||[]).filter(f=>f.status==="confirmed")}})});envelope=await response.json();}catch{return{ok:false,error:{code:"NETWORK_ERROR",message:"补充信息处理失败，请重试。"}}}
  if(!response.ok||!envelope.ok)return{ok:false,error:envelope.error||{code:"REQUEST_FAILED",message:"补充信息处理失败，请重试。"}};
  const merged=applyExplicitClarification(mergeClarification(previousBrief,envelope.brief_candidate),answers),validation=validateBrief({brief_candidate:merged}).brief_validation_result;
  return{ok:true,brief_candidate:merged,brief_validation_result:validation,trace:sanitizeModelTrace(envelope.trace)};
}

export function prepareBriefForEditor(candidate, validationResult = {}) {
  const extractedFields = new Map((candidate.fields || []).map(field => [field.id, structuredClone(field)]));
  const catalogFields = FIELD_CATALOG.map(([id, label, critical, advanced = false]) => {
    const extracted = extractedFields.get(id);
    if (extracted) {
      extractedFields.delete(id);
      return { ...extracted, label, critical, advanced };
    }
    return { id, label, value: "", status: "missing", critical, advanced };
  });
  return {
    ...structuredClone(candidate),
    brief_revision: candidate.brief_revision || validationResult.brief_revision || 1,
    lifecycle: candidate.lifecycle || "draft",
    fields: [...catalogFields, ...extractedFields.values()],
    finished_size: structuredClone(candidate.finished_size || validationResult.normalized_finished_size || {
      preset_size: "custom", width: "", height: "", unit: "mm", status: "missing"
    }),
    visual_aid_requirement: structuredClone(candidate.visual_aid_requirement || {
      status: "undecided", purposes: [], preferred_type: "let_system_recommend", note: "", field_status: "needs_confirmation"
    }),
    confirmed: false,
    confirmedAt: null
  };
}
