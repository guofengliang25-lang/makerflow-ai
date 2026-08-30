import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");

test("normal Step 1 path no longer seeds Creative Plan from recommendation fixture", () => {
  assert.doesNotMatch(app, /creativePlan\.items\s*=\s*structuredClone\(fixtures\.recommendations/);
});

test("confirmed Brief triggers real plan client and Human decisions feed Design Spec", () => {
  assert.match(app, /generateCreativePlan\(\{confirmedBrief:state\.brief\}\)/);
  assert.match(app, /recordPlanDecision/);
  assert.match(app, /getAcceptedPlan\(state\.creativePlan,state\.brief\.brief_revision\)/);
});
