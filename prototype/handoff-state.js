const LEVELS = new Set(["required", "preferred", "optional"]);

function normalizeFormat(format) {
  return String(format || "").trim().toLowerCase();
}

function fromLegacyString(value, fieldStatus) {
  const text = String(value || "");
  const level = /preferred|希望|优先|最好/.test(text) ? "preferred" : fieldStatus === "confirmed" ? "required" : "optional";
  const requirements = [];
  if (/svg/i.test(text)) requirements.push({ format: "svg", requirement_level: "required" });
  if (/pdf/i.test(text)) requirements.push({ format: "pdf", requirement_level: level });
  return requirements;
}

export function readOutputRequirements(brief = {}) {
  const field = (brief.fields || []).find(item => item.id === "output_format");
  const value = field?.value;
  const raw = Array.isArray(value) ? value : Array.isArray(value?.output_formats) ? value.output_formats : fromLegacyString(value, field?.status);
  return raw
    .map(item => ({ format: normalizeFormat(item?.format), requirement_level: LEVELS.has(item?.requirement_level) ? item.requirement_level : "optional" }))
    .filter(item => item.format);
}

export function evaluateHandoffCompletion({ brief, svgExportAllowed }) {
  const requirements = readOutputRequirements(brief);
  const pdf = requirements.find(item => item.format === "pdf");
  const svgRequested = requirements.some(item => item.format === "svg");
  const svgReady = Boolean(svgExportAllowed);
  const requiredPdfUnsupported = pdf?.requirement_level === "required";
  const preferredPdfUnsupported = pdf?.requirement_level === "preferred";

  return {
    brief_revision: brief?.brief_revision ?? null,
    artifact_exports: {
      svg: { status: svgReady ? "ready" : svgRequested ? "missing" : "ready" },
      pdf: { status: pdf ? "unsupported" : "not_requested" }
    },
    partial_export: { allowed: svgReady, formats: svgReady ? ["svg"] : [] },
    handoff_completion: svgReady && !requiredPdfUnsupported ? "complete" : "incomplete",
    completion_gate: requiredPdfUnsupported || !svgReady ? "blocked" : "open",
    warnings: preferredPdfUnsupported ? ["PREFERRED_PDF_UNSUPPORTED"] : []
  };
}
