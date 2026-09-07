import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { executeBriefExtract as defaultExecuteBriefExtract } from "./providers/brief-extract-executor.mjs";
import { executeBriefAskMissing as defaultExecuteBriefAskMissing } from "./providers/brief-ask-missing-executor.mjs";
import { executePlanGenerate as defaultExecutePlanGenerate } from "./providers/plan-generate-executor.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const prototypeRoot = resolve(here, "prototype");
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg"
};

const safeMessages = {
  PROVIDER_CONFIGURATION_ERROR: "本地模型服务尚未配置，请检查服务器环境后重试。",
  PROVIDER_HTTP_ERROR: "模型服务暂时不可用，请稍后重试。",
  PROVIDER_RESPONSE_ERROR: "模型服务返回了无法使用的响应，请重试。",
  PROVIDER_ERROR: "模型服务调用失败，请稍后重试。",
  MALFORMED_JSON: "模型返回格式无法解析，请重试。",
  SCHEMA_INVALID: "模型返回内容未通过结构校验，请重试。"
};

function sendJson(response, status, payload) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 1_000_000) throw Object.assign(new Error("request_too_large"), { statusCode: 413 });
  }
  return JSON.parse(body || "{}");
}

function errorStatus(code) {
  if (code === "PROVIDER_CONFIGURATION_ERROR") return 503;
  if (["PROVIDER_HTTP_ERROR", "PROVIDER_RESPONSE_ERROR", "PROVIDER_ERROR", "MALFORMED_JSON", "SCHEMA_INVALID"].includes(code)) return 502;
  return 500;
}

function publicError(error = {}) {
  const code = safeMessages[error.code] ? error.code : "INTERNAL_ERROR";
  return { code, message: safeMessages[code] || "服务暂时无法处理请求，请稍后重试。" };
}

export function resolveServerConfig(env = process.env) {
  return {
    port: Number(env.PORT || 8000),
    host: "0.0.0.0"
  };
}

async function serveStatic(request, response) {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const requested = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filePath = resolve(prototypeRoot, requested);
  if (filePath !== prototypeRoot && !filePath.startsWith(`${prototypeRoot}${sep}`)) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error("not_file");
    response.writeHead(200, { "Content-Type": contentTypes[extname(filePath).toLowerCase()] || "application/octet-stream" });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not Found");
  }
}

export function createMakerFlowServer({
  env = process.env,
  fetchImpl = globalThis.fetch,
  executeBriefExtract
  ,executeBriefAskMissing
  ,executePlanGenerate
} = {}) {
  const executor = executeBriefExtract || (input => defaultExecuteBriefExtract({ ...input, env, fetchImpl }));
  const askExecutor=executeBriefAskMissing||(input=>defaultExecuteBriefAskMissing({...input,env,fetchImpl}));
  const planExecutor=executePlanGenerate||(input=>defaultExecutePlanGenerate({...input,env,fetchImpl}));
  return createServer(async (request, response) => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    if (pathname === "/health" && request.method === "GET") {
      sendJson(response, 200, { ok: true });
      return;
    }
    if (pathname === "/api/skills/brief.extract") {
      if (request.method !== "POST") {
        sendJson(response, 405, { ok: false, skill_id: "brief.extract", error: { code: "METHOD_NOT_ALLOWED", message: "只支持POST请求。" } });
        return;
      }
      try {
        const payload = await readJson(request);
        if (typeof payload.user_input !== "string" || !payload.user_input.trim() || !Array.isArray(payload.attachments || [])) {
          sendJson(response, 400, { ok: false, skill_id: "brief.extract", error: { code: "INVALID_REQUEST", message: "请先描述你要制作的作品。" } });
          return;
        }
        const taskInput = {
          mode: payload.mode==="clarification"?"clarification":"initial",
          user_text: payload.user_input,
          reference_attachments: payload.attachments || [],
          existing_files: [],
          clarification_answers: payload.clarification_answers||null,
          source_metadata: { source: payload.mode==="clarification"?"human_clarification":"browser_demo",original_user_input:payload.original_user_input||payload.user_input }
        };
        const result = await executor({ taskInput,existingConfirmedContext:payload.existing_confirmed_context||null });
        if (!result.ok) {
          const error = publicError(result.error);
          sendJson(response, errorStatus(error.code), { ok: false, skill_id: "brief.extract", error });
          return;
        }
        sendJson(response, 200, {
          ok: true,
          skill_id: "brief.extract",
          brief_candidate: result.brief_candidate,
          trace: result.trace
        });
      } catch (error) {
        const status = error?.statusCode || (error instanceof SyntaxError ? 400 : 500);
        const publicFailure = status === 400
          ? { code: "INVALID_JSON", message: "请求格式无效。" }
          : status === 413
            ? { code: "REQUEST_TOO_LARGE", message: "请求内容过大。" }
            : { code: "INTERNAL_ERROR", message: "服务暂时无法处理请求，请稍后重试。" };
        sendJson(response, status, { ok: false, skill_id: "brief.extract", error: publicFailure });
      }
      return;
    }
    if(pathname==="/api/skills/brief.ask_missing"){
      if(request.method!=="POST"){sendJson(response,405,{ok:false,skill_id:"brief.ask_missing",error:{code:"METHOD_NOT_ALLOWED",message:"只支持POST请求。"}});return;}
      try{const payload=await readJson(request);if(!payload.brief_candidate||!payload.brief_validation_result||!Array.isArray(payload.missing_items)||!Array.isArray(payload.conflict_items)){sendJson(response,400,{ok:false,skill_id:"brief.ask_missing",error:{code:"INVALID_REQUEST",message:"缺少验证结果。"}});return;}
        const result=await askExecutor({structuredInput:payload});if(!result.ok){const error=publicError(result.error);sendJson(response,errorStatus(error.code),{ok:false,skill_id:"brief.ask_missing",error});return;}
        sendJson(response,200,{ok:true,skill_id:"brief.ask_missing",clarifying_questions:result.clarifying_questions,trace:result.trace});
      }catch{sendJson(response,500,{ok:false,skill_id:"brief.ask_missing",error:{code:"INTERNAL_ERROR",message:"服务暂时无法处理请求，请稍后重试。"}});}return;
    }
    if(pathname==="/api/skills/plan.generate"){
      if(request.method!=="POST"){sendJson(response,405,{ok:false,skill_id:"plan.generate",error:{code:"METHOD_NOT_ALLOWED",message:"只支持POST请求。"}});return;}
      try{
        const payload=await readJson(request),brief=payload.confirmed_brief;
        if(!brief||brief.lifecycle!=="confirmed"||!Number.isInteger(brief.brief_revision)){sendJson(response,400,{ok:false,skill_id:"plan.generate",error:{code:"INVALID_REQUEST",message:"Creative Plan需要已确认的Brief版本。"}});return;}
        const result=await planExecutor({confirmedBrief:brief,mode:payload.mode||"generate_plan",decisionType:payload.decision_type||null,rejectedRecommendation:payload.rejected_recommendation||null,previousRejectedSuggestions:payload.previous_rejected_suggestions||[]});
        if(!result.ok){const error=publicError(result.error);sendJson(response,errorStatus(error.code),{ok:false,skill_id:"plan.generate",error});return;}
        sendJson(response,200,{ok:true,skill_id:"plan.generate",...(payload.mode==="replace_recommendation"?{replacement_recommendation:result.replacement_recommendation}:{creative_plan:result.creative_plan}),trace:result.trace});
      }catch{sendJson(response,500,{ok:false,skill_id:"plan.generate",error:{code:"INTERNAL_ERROR",message:"服务暂时无法处理请求，请稍后重试。"}});}
      return;
    }
    if (request.method === "GET" || request.method === "HEAD") {
      await serveStatic(request, response);
      return;
    }
    response.writeHead(404).end("Not Found");
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { port, host } = resolveServerConfig();
  const server = createMakerFlowServer();
  server.listen(port, host, () => {
    console.log(`MakerFlow Demo: http://localhost:${port}/`);
    console.log(`MakerFlow QA:   http://localhost:${port}/?qa=1`);
  });
}
