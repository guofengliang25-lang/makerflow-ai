import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("public UI exposes exactly five MakerFlow stages", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  const steps = [...html.matchAll(/data-public-step="(\d)"/g)].map(match => match[1]);
  assert.deepEqual(steps, ["1", "2", "3", "4", "5"]);
  assert.doesNotMatch(html, />Preflight</);
  assert.doesNotMatch(html, />Resolve Issues</);
});

test("five-screen visual shell keeps workflow modules while plan cards stay data-driven", async () => {
  const [html, app, css] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
    readFile(new URL("styles.css", root), "utf8")
  ]);
  assert.match(html, /class="brand-mark"/);
  assert.match(app, /normalizeCreativePlans/);
  assert.match(app, /renderStep3Cards/);
  assert.match(app, /visibleStage/);
  assert.match(app, /choice-card/);
  assert.match(app, /function renderStep2\(\)/);
  assert.match(app, /normalizePlanData/);
  assert.match(app, /PLAN_TIMEOUT/);
  assert.match(app, /clarificationQuestion\(fieldId\)/);
  assert.doesNotMatch(app, /if\(state\.job\.sampleMode\)\{/);
  assert.doesNotMatch(app, /返回首页重新整理/);
  assert.match(app, /extractAndValidateBrief\(\{userInput/);
  assert.match(app, /state\.job\.sampleMode=false/);
  assert.match(app, /downloadPdf/);
  assert.match(app, /downloadPng/);
  assert.match(app, /canvas-bottom-status/);
  assert.match(app, /data-preview-mode/);
  assert.match(app, /data-preset-group/);
  assert.match(app, /editInstruction/);
  assert.match(app, /aiAdjustLoading/);
  assert.doesNotMatch(app, /最终作品预览/);
  assert.match(app, /\{1:renderStep1,2:renderStep2,3:renderStep3Cards/);
  assert.match(css, /--ai-purple:\s*#5b43e6/i);
  assert.match(app, /runCurrentArtifactPreflight/);
  assert.match(app, /canExportCurrentArtifact/);
});
