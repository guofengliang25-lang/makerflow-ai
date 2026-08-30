import test from "node:test";
import assert from "node:assert/strict";

const stateApi = await import("../design-state.js").catch(() => ({}));

test("Design Spec edit increments design_spec_revision", () => {
  assert.equal(typeof stateApi.markDesignSpecEdited, "function");
  const designSpec = { design_spec_revision: 3 };

  stateApi.markDesignSpecEdited(designSpec);

  assert.equal(designSpec.design_spec_revision, 4);
});

test("recording an ordinary render event does not increment design_spec_revision", () => {
  assert.equal(typeof stateApi.recordRenderedSvg, "function");
  const design = { spec: { design_spec_revision: 3 }, svgString: "<svg id=\"old\"/>" };

  stateApi.recordRenderedSvg(design, "<svg id=\"new\"/>");

  assert.equal(design.spec.design_spec_revision, 3);
  assert.equal(design.svgString, "<svg id=\"new\"/>");
});
