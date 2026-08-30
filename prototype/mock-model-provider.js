const clone = value => value == null
  ? value
  : typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));

export function createMockModelProvider({
  modelName = "makerflow-mock-v1",
  response = {},
  rawOutput,
  error = null
} = {}) {
  return {
    async generate() {
      if (error) throw error;
      return {
        provider_name: "mock",
        model_name: modelName,
        raw_output: rawOutput ?? JSON.stringify(clone(response))
      };
    }
  };
}
