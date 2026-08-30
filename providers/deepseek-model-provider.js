const DEFAULT_ENDPOINT = "https://api.deepseek.com/chat/completions";

function providerError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function createDeepSeekModelProvider({
  env = process.env,
  fetchImpl = globalThis.fetch,
  endpoint = DEFAULT_ENDPOINT
} = {}) {
  return {
    async generate(request = {}) {
      if (!["brief.extract","brief.ask_missing","plan.generate"].includes(request.skill_id)) {
        throw providerError("UNSUPPORTED_SKILL", "DeepSeek provider does not support this skill.");
      }

      const apiKey = env.DEEPSEEK_API_KEY;
      if (!apiKey) {
        throw providerError("PROVIDER_CONFIGURATION_ERROR", "DEEPSEEK_API_KEY is not configured.");
      }
      if (typeof fetchImpl !== "function") {
        throw providerError("PROVIDER_CONFIGURATION_ERROR", "Node fetch is not available.");
      }

      const modelName = request.model_config?.model_name || "deepseek-chat";
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: modelName,
          messages: request.messages,
          response_format: { type: "json_object" },
          stream: false
        })
      });

      const responseText = await response.text();
      if (!response.ok) {
        throw providerError(
          "PROVIDER_HTTP_ERROR",
          `DeepSeek HTTP ${response.status}: ${responseText.slice(0, 500)}`
        );
      }

      let payload;
      try {
        payload = JSON.parse(responseText);
      } catch {
        throw providerError("PROVIDER_RESPONSE_ERROR", "DeepSeek response envelope is not valid JSON.");
      }
      const rawOutput = payload?.choices?.[0]?.message?.content;
      if (typeof rawOutput !== "string" || rawOutput.length === 0) {
        throw providerError("PROVIDER_RESPONSE_ERROR", "DeepSeek response does not contain message content.");
      }

      return {
        provider_name: "deepseek",
        model_name: payload.model || modelName,
        raw_output: rawOutput
      };
    }
  };
}
