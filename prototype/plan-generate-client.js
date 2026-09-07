const TRACE_FIELDS = ["provider_name", "model_name", "prompt_version", "run_id", "latency_ms", "parse_status", "schema_validation"];
const sanitizeTrace = trace => trace && Object.fromEntries(TRACE_FIELDS.map(key => [key, trace[key] ?? null]));

export async function generateCreativePlan({ confirmedBrief, fetchImpl = globalThis.fetch }) {
  try {
    const response = await fetchImpl("./api/skills/plan.generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmed_brief: confirmedBrief }) });
    const envelope = await response.json();
    if (!response.ok || !envelope.ok || !envelope.creative_plan) return { ok: false, creative_plan: null, error: envelope.error || { code: "PLAN_FAILED", message: "无法生成Creative Plan，请重试。" } };
    return { ok: true, creative_plan: envelope.creative_plan, trace: sanitizeTrace(envelope.trace) };
  } catch {
    return { ok: false, creative_plan: null, error: { code: "NETWORK_ERROR", message: "无法连接本地MakerFlow服务，请确认服务已启动后重试。" } };
  }
}

export async function replaceCreativePlanRecommendation({confirmedBrief,rejectedRecommendation,previousRejectedSuggestions=[],fetchImpl=globalThis.fetch}){
  try{
    const response=await fetchImpl("./api/skills/plan.generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:"replace_recommendation",confirmed_brief:confirmedBrief,source_brief_revision:confirmedBrief.brief_revision,decision_type:rejectedRecommendation.decision_type,rejected_recommendation:rejectedRecommendation,previous_rejected_suggestions:previousRejectedSuggestions})});
    const envelope=await response.json();
    if(!response.ok||!envelope.ok||!envelope.replacement_recommendation)return{ok:false,replacement_recommendation:null,error:envelope.error||{code:"REPLACEMENT_FAILED",message:"暂时无法生成替代方案。"}};
    return{ok:true,replacement_recommendation:envelope.replacement_recommendation,trace:sanitizeTrace(envelope.trace)};
  }catch{return{ok:false,replacement_recommendation:null,error:{code:"NETWORK_ERROR",message:"暂时无法生成替代方案。"}};}
}
