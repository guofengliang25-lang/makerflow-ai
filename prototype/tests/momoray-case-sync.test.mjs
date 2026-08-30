import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildDesignSpecFromBrief } from "../renderer.js";

const readJson = async path => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));

test("MomoRay sample keeps the Human-confirmed 0/1/2 insert height facts with evidence", async () => {
  const brief = await readJson("../data/brief_confirmed.json");
  const facts = brief.fields.find(field => field.id === "product_facts");

  assert.equal(facts.status, "confirmed");
  assert.equal(facts.source, "MomoRay product owner / project confirmed data");
  assert.match(facts.value, /0[^\d]+15\s*cm/i);
  assert.match(facts.value, /1[^\d]+16\s*cm/i);
  assert.match(facts.value, /2[^\d]+17\s*cm/i);
  assert.doesNotMatch(facts.value, /\d+\s*(?:cm|厘米)\s*[-–—至到]+\s*\d+\s*(?:cm|厘米)/i);
});

test("MomoRay sample must_content states configurations, insert counts, real heights and felt-height adjustment", async () => {
  const brief = await readJson("../data/brief_confirmed.json");
  const mustContent = brief.fields.find(field => field.id === "must_content").value;

  for (const term of ["三种高度配置", "垫片数量", "15 / 16 / 17 cm", "偏高", "合适", "偏低"]) {
    assert.match(mustContent, new RegExp(term.replaceAll("/", "\\/"), "i"));
  }
});

test("default Design Spec renders the confirmed insert counts and heights rather than placeholder combinations", async () => {
  const brief = await readJson("../data/brief_confirmed.json");
  const spec = buildDesignSpecFromBrief(brief, {});

  assert.deepEqual(spec.content.steps.map(step => [step.insert_count, step.pillow_height]), [
    [0, { value: 15, unit: "cm" }],
    [1, { value: 16, unit: "cm" }],
    [2, { value: 17, unit: "cm" }]
  ]);
  assert.match(spec.content.steps[0].body, /偏高.*减少垫片/);
  assert.match(spec.content.steps[1].body, /标准配置.*默认起点/);
  assert.match(spec.content.steps[2].body, /偏低.*增加垫片/);
});
