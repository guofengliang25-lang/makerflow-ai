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
