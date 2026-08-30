const MODEL_SKILLS = new Set([
  "brief.extract",
  "brief.ask_missing",
  "plan.generate"
]);

const clone = value => value == null
  ? value
  : typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));

function baseResult(request, startedAt) {
  return {
    provider_name: request.model_config?.provider_name ?? null,
    model_name: request.model_config?.model_name ?? null,
    raw_output: null,
    parsed_output: null,
    parse_status: "not_attempted",
    schema_validation: { status: "not_run", errors: [] },
    latency_ms: Math.max(0, Date.now() - startedAt),
    error: null,
    trace_metadata: clone(request.trace_metadata ?? {})
  };
}

export function createModelProviderAdapter({ providers = {}, schemaValidator = null } = {}) {
  return {
    async invoke(request = {}) {
      const startedAt = Date.now();
      const result = baseResult(request, startedAt);

      if (!MODEL_SKILLS.has(request.skill_id)) {
        result.error = {
          code: "SKILL_NOT_MODEL_OWNED",
          message: `Skill cannot execute through Model Provider Adapter: ${request.skill_id}`
        };
        return result;
      }

      const providerName = request.model_config?.provider_name;
      const provider = providers[providerName];
      if (!provider) {
        result.error = {
          code: "UNSUPPORTED_PROVIDER",
          message: `Unsupported provider: ${providerName}`
        };
        return result;
      }

      try {
        const providerResult = await provider.generate({
          skill_id: request.skill_id,
          messages: clone(request.messages ?? null),
          structured_input: clone(request.structured_input ?? null),
          schema: clone(request.schema ?? null),
          model_config: clone(request.model_config ?? {}),
          trace_metadata: clone(request.trace_metadata ?? {})
        });
        result.provider_name = providerResult.provider_name ?? providerName;
        result.model_name = providerResult.model_name ?? result.model_name;
        result.raw_output = providerResult.raw_output ?? null;
      } catch (error) {
        result.latency_ms = Math.max(0, Date.now() - startedAt);
        result.error = {
          code: error?.code || "PROVIDER_ERROR",
          message: error instanceof Error ? error.message : String(error)
        };
        return result;
      }

      try {
        if (typeof result.raw_output !== "string") throw new Error("Provider output is not a JSON string.");
        result.parsed_output = JSON.parse(result.raw_output);
        result.parse_status = "parsed";
      } catch {
        result.parsed_output = null;
        result.parse_status = "malformed";
        result.error = {
          code: "MALFORMED_JSON",
          message: "Provider output is not valid JSON."
        };
      }
      if (!result.error && schemaValidator && request.schema) {
        const validation = schemaValidator(result.parsed_output, request.schema);
        result.schema_validation = {
          status: validation.valid ? "valid" : "invalid",
          errors: clone(validation.errors || [])
        };
        if (!validation.valid) {
          result.parsed_output = null;
          result.error = {
            code: "SCHEMA_INVALID",
            message: "Provider output does not satisfy the requested schema."
          };
        }
      }
      result.latency_ms = Math.max(0, Date.now() - startedAt);
      return result;
    }
  };
}
