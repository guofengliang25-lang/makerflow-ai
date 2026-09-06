const clone = value => structuredClone(value);
const CRITICAL_FIELDS = new Set(["deliverable", "purpose", "must_content", "product_facts", "finished_size"]);

export function briefUiMode(validation = {}, lifecycle = "draft") {
  if ((validation.critical_blockers || []).length) return "clarification";
  return lifecycle === "confirmed" ? "confirmed" : "review";
}

const rootFieldId = blocker => {
  if (String(blocker).startsWith("product_facts")) return "product_facts";
  if (String(blocker).startsWith("finished_size")) return "finished_size";
  return blocker;
};

export function manualCriticalFieldIds(blockers = []) {
  return [...new Set(blockers.map(rootFieldId).filter(id => CRITICAL_FIELDS.has(id)))];
}

export function applyClarificationAnswers(brief, answers = []) {
  const next = clone(brief);
  for (const item of answers) {
    const id = rootFieldId(item.field_id);
    const answer = String(item.answer ?? "").trim();
    if (!answer) continue;
    if (id === "finished_size") {
      if (next.finished_size?.status === "confirmed") continue;
      const match = answer.match(/(A4|A5|A6)|(?:(\d+(?:\.\d+)?)\s*[×xX*]\s*(\d+(?:\.\d+)?)\s*(mm|cm)?)/i);
      if (match?.[1]) next.finished_size = { preset_size: match[1].toUpperCase(), status: "confirmed", source: "human_clarification" };
      else if (match?.[2]) next.finished_size = { preset_size: "custom", width: Number(match[2]), height: Number(match[3]), unit: (match[4] || "mm").toLowerCase(), status: "confirmed", source: "human_clarification" };
      continue;
    }
    const field = (next.fields || []).find(candidate => candidate.id === id);
    if (!field) continue;
    if (field.status === "confirmed" && String(field.value || "").trim()) {
      if (id === "product_facts") field.evidence = [...new Set([...(field.evidence || []), "Human clarification"] )];
      continue;
    }
    field.value = answer;
    field.status = "confirmed";
    field.source = "human_clarification";
    if (id === "product_facts") field.evidence = [...new Set([...(field.evidence || []), "Human clarification"] )];
  }
  next.lifecycle = "draft";
  next.confirmed = false;
  return next;
}
