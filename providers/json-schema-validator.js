function typeMatches(value, type) {
  if (type === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  if (type === "array") return Array.isArray(value);
  if (type === "integer") return Number.isInteger(value);
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  if (type === "string") return typeof value === "string";
  if (type === "boolean") return typeof value === "boolean";
  if (type === "null") return value === null;
  return true;
}

function inspect(value, schema, path, errors) {
  if (!schema || typeof schema !== "object") return;
  if (schema.type && !typeMatches(value, schema.type)) {
    errors.push(`${path} must be type ${schema.type}`);
    return;
  }
  if (schema.enum && !schema.enum.some(item => Object.is(item, value))) {
    errors.push(`${path} must match enum`);
  }
  if (typeof value === "number" && schema.minimum != null && value < schema.minimum) {
    errors.push(`${path} must be >= ${schema.minimum}`);
  }
  if (typeof value === "string" && schema.minLength != null && value.length < schema.minLength) {
    errors.push(`${path} must have minLength ${schema.minLength}`);
  }
  if (Array.isArray(value) && schema.items) {
    value.forEach((item, index) => inspect(item, schema.items, `${path}[${index}]`, errors));
  }
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    for (const key of schema.required || []) {
      if (!Object.hasOwn(value, key)) errors.push(`${path}.${key} is required`);
    }
    for (const [key, childSchema] of Object.entries(schema.properties || {})) {
      if (Object.hasOwn(value, key)) inspect(value[key], childSchema, `${path}.${key}`, errors);
    }
    if (schema.additionalProperties === false) {
      const allowed = new Set(Object.keys(schema.properties || {}));
      for (const key of Object.keys(value)) {
        if (!allowed.has(key)) errors.push(`${path}.${key} is not allowed`);
      }
    }
  }
}

export function validateJsonSchema(value, schema) {
  const errors = [];
  inspect(value, schema, "$", errors);
  return { valid: errors.length === 0, errors };
}

