import { executeBriefAskMissing as defaultExecuteBriefAskMissing } from "../../providers/brief-ask-missing-executor.mjs";
import { executeBriefExtract as defaultExecuteBriefExtract } from "../../providers/brief-extract-executor.mjs";
import { executePlanGenerate as defaultExecutePlanGenerate } from "../../providers/plan-generate-executor.mjs";

const safeMessages = {
  PROVIDER_CONFIGURATION_ERROR: "模型服务尚未配置，请检查服务器环境后重试。",
  PROVIDER_HTTP_ERROR: "模型服务暂时不可用，请稍后重试。",
  PROVIDER_RESPONSE_ERROR: "模型服务返回了无法使用的响应，请重试。",
  PROVIDER_ERROR: "模型服务调用失败，请稍后重试。",
  MALFORMED_JSON: "模型返回格式无法解析，请重试。",
  SCHEMA_INVALID: "模型返回内容未通过结构校验，请重试。"
};

function errorStatus(code) {
  if (code === "PROVIDER_CONFIGURATION_ERROR") return 503;
  if (["PROVIDER_HTTP_ERROR", "PROVIDER_RESPONSE_ERROR", "PROVIDER_ERROR", "MALFORMED_JSON", "SCHEMA_INVALID"].includes(code)) return 502;
  return 500;
}

function publicError(error = {}) {
  const code = safeMessages[error.code] ? error.code : "INTERNAL_ERROR";
  return { code, message: safeMessages[code] || "服务暂时无法处理请求，请稍后重试。" };
}

function send(response, status, payload) {
  response.setHeader("Cache-Control", "no-store");
  return response.status(status).json(payload);
}

function readBody(request) {
  if (typeof request.body === "string") return JSON.parse(request.body || "{}");
  return request.body || {};
}

function skillFromRequest(request) {
  const value = request.query?.skill;
  return Array.isArray(value) ? value[0] : value;
}

export function createSkillHandler({
  env = process.env,
  fetchImpl = globalThis.fetch,
  executeBriefExtract = input => defaultExecuteBriefExtract({ ...input, env, fetchImpl }),
  executeBriefAskMissing = input => defaultExecuteBriefAskMissing({ ...input, env, fetchImpl }),
  executePlanGenerate = input => defaultExecutePlanGenerate({ ...input, env, fetchImpl })
} = {}) {
  return async function skillHandler(request, response) {
    const skillId = skillFromRequest(request);
    if (!['brief.extract', 'brief.ask_missing', 'plan.generate'].includes(skillId)) {
      return send(response, 404, { ok: false, skill_id: skillId || null, error: { code: "NOT_FOUND", message: "未找到该能力。" } });
    }
    if (request.method !== "POST") {
      return send(response, 405, { ok: false, skill_id: skillId, error: { code: "METHOD_NOT_ALLOWED", message: "只支持POST请求。" } });
    }

    try {
      const payload = readBody(request);

      if (skillId === "brief.extract") {
        if (typeof payload.user_input !== "string" || !payload.user_input.trim() || !Array.isArray(payload.attachments || [])) {
          return send(response, 400, { ok: false, skill_id: skillId, error: { code: "INVALID_REQUEST", message: "请先描述你要制作的作品。" } });
        }
        const taskInput = {
          mode: payload.mode === "clarification" ? "clarification" : "initial",
          user_text: payload.user_input,
          reference_attachments: payload.attachments || [],
          existing_files: [],
          clarification_answers: payload.clarification_answers || null,
          source_metadata: {
            source: payload.mode === "clarification" ? "human_clarification" : "browser_demo",
            original_user_input: payload.original_user_input || payload.user_input
          }
        };
        const result = await executeBriefExtract({ taskInput, existingConfirmedContext: payload.existing_confirmed_context || null });
        if (!result.ok) {
          const error = publicError(result.error);
          return send(response, errorStatus(error.code), { ok: false, skill_id: skillId, error });
        }
        return send(response, 200, { ok: true, skill_id: skillId, brief_candidate: result.brief_candidate, trace: result.trace });
      }

      if (skillId === "brief.ask_missing") {
        if (!payload.brief_candidate || !payload.brief_validation_result || !Array.isArray(payload.missing_items) || !Array.isArray(payload.conflict_items)) {
          return send(response, 400, { ok: false, skill_id: skillId, error: { code: "INVALID_REQUEST", message: "缺少验证结果。" } });
        }
        const result = await executeBriefAskMissing({ structuredInput: payload });
        if (!result.ok) {
          const error = publicError(result.error);
          return send(response, errorStatus(error.code), { ok: false, skill_id: skillId, error });
        }
        return send(response, 200, { ok: true, skill_id: skillId, clarifying_questions: result.clarifying_questions, trace: result.trace });
      }

      const brief = payload.confirmed_brief;
      if (!brief || brief.lifecycle !== "confirmed" || !Number.isInteger(brief.brief_revision)) {
        return send(response, 400, { ok: false, skill_id: skillId, error: { code: "INVALID_REQUEST", message: "Creative Plan需要已确认的Brief版本。" } });
      }
      const result = await executePlanGenerate({ confirmedBrief: brief, mode: payload.mode || "generate_plan", decisionType: payload.decision_type || null, rejectedRecommendation: payload.rejected_recommendation || null, previousRejectedSuggestions: payload.previous_rejected_suggestions || [] });
      if (!result.ok) {
        const error = publicError(result.error);
        return send(response, errorStatus(error.code), { ok: false, skill_id: skillId, error });
      }
      return send(response, 200, { ok: true, skill_id: skillId, ...(payload.mode === "replace_recommendation" ? { replacement_recommendation: result.replacement_recommendation } : { creative_plan: result.creative_plan }), trace: result.trace });
    } catch (error) {
      const invalidJson = error instanceof SyntaxError;
      return send(response, invalidJson ? 400 : 500, {
        ok: false,
        skill_id: skillId,
        error: invalidJson
          ? { code: "INVALID_JSON", message: "请求格式无效。" }
          : { code: "INTERNAL_ERROR", message: "服务暂时无法处理请求，请稍后重试。" }
      });
    }
  };
}

export default createSkillHandler();
