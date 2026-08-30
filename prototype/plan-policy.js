import { normalizeFinishedSize as normalizeBriefFinishedSize } from "./brief-validate.js";

export function normalizeFinishedSize(size = {}) {
  const normalized=normalizeBriefFinishedSize(size);
  return {...normalized,source:normalized.preset_size==="custom"?"custom":"preset"};
}

const displayValue = (id, value) => id === "finished_size"
  ? `${value.preset_size === "custom" ? "自定义" : value.preset_size} · ${value.width} × ${value.height} ${value.unit}`
  : String(value ?? "");

export function splitCreativePlan(brief, items = []) {
  const fields = new Map((brief.fields || []).map(field => [field.id, field]));
  const locked = (brief.fields || []).filter(field => field.status === "confirmed").map(field => ({ id:field.id, label:field.label, value:displayValue(field.id,field.value) }));
  const finishedSize = normalizeFinishedSize(brief.finished_size || {});
  if (finishedSize.status === "confirmed") locked.push({ id:"finished_size", label:"成品尺寸", value:displayValue("finished_size",finishedSize) });
  const suggestions = items.filter(item => {
    if (item.brief_field_id === "finished_size") return finishedSize.status !== "confirmed";
    const field = fields.get(item.brief_field_id);
    return !field || ["assumed","needs_confirmation","missing","undecided"].includes(field.status);
  });
  return { locked, suggestions };
}

export function refreshSuggestion(items, id) {
  return items.map(item => {
    if (item.id !== id || item.decision === "accepted" || !item.variants?.length) return item;
    const variantIndex = ((item.variant_index || 0) + 1) % item.variants.length;
    return { ...item, ...item.variants[variantIndex], variant_index:variantIndex, decision:"pending" };
  });
}

export function reconsiderSuggestion(items, id) {
  return items.map(item => item.id === id ? { ...item, decision:"pending" } : item);
}

export function acceptedPlan(items) {
  return items.filter(item => item.decision === "accepted");
}
