import assert from "node:assert/strict";
import test from "node:test";

import { evaluateHandoffCompletion } from "../handoff-state.js";

const brief = (briefRevision, outputRequirements) => ({
  brief_revision: briefRevision,
  lifecycle: "confirmed",
  fields: [{ id: "output_format", status: "confirmed", value: outputRequirements, source: "human" }]
});

test("required unsupported PDF blocks completion but keeps partial SVG export allowed", () => {
  const result = evaluateHandoffCompletion({
    brief: brief(1, [
      { format: "svg", requirement_level: "required" },
      { format: "pdf", requirement_level: "required" }
    ]),
    svgExportAllowed: true
  });

  assert.deepEqual(result.artifact_exports, {
    svg: { status: "ready" },
    pdf: { status: "unsupported" }
  });
  assert.deepEqual(result.partial_export, { allowed: true, formats: ["svg"] });
  assert.equal(result.handoff_completion, "incomplete");
  assert.equal(result.completion_gate, "blocked");
});

test("preferred unsupported PDF produces WARN without blocking completion", () => {
  const result = evaluateHandoffCompletion({
    brief: brief(1, [
      { format: "svg", requirement_level: "required" },
      { format: "pdf", requirement_level: "preferred" }
    ]),
    svgExportAllowed: true
  });

  assert.equal(result.artifact_exports.pdf.status, "unsupported");
  assert.equal(result.handoff_completion, "complete");
  assert.equal(result.completion_gate, "open");
  assert.deepEqual(result.warnings, ["PREFERRED_PDF_UNSUPPORTED"]);
});

test("Human cancellation is represented by a new Brief revision and recalculates completion", () => {
  const r1 = evaluateHandoffCompletion({
    brief: brief(1, [{ format: "svg", requirement_level: "required" }, { format: "pdf", requirement_level: "required" }]),
    svgExportAllowed: true
  });
  const r2 = evaluateHandoffCompletion({
    brief: brief(2, [{ format: "svg", requirement_level: "required" }]),
    svgExportAllowed: true
  });

  assert.equal(r1.brief_revision, 1);
  assert.equal(r1.completion_gate, "blocked");
  assert.equal(r2.brief_revision, 2);
  assert.equal(r2.completion_gate, "open");
  assert.equal(r2.handoff_completion, "complete");
});

test("legacy confirmed SVG plus PDF string remains truthful and cannot imply Verified PDF", () => {
  const result = evaluateHandoffCompletion({
    brief: brief(1, "印刷PDF + 刀线/标记SVG"),
    svgExportAllowed: true
  });
  assert.equal(result.artifact_exports.svg.status, "ready");
  assert.equal(result.artifact_exports.pdf.status, "unsupported");
  assert.equal(result.completion_gate, "blocked");
});
