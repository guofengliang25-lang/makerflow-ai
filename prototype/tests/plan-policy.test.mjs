import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeFinishedSize,
  splitCreativePlan,
  refreshSuggestion,
  reconsiderSuggestion,
  acceptedPlan
} from "../plan-policy.js";

const brief = {
  fields: [
    { id:"deliverable", label:"最终交付物", value:"包装内高度调节说明卡", status:"confirmed" },
    { id:"must_content", label:"最终需要呈现", value:"三种组合、对应枕高、使用提醒", status:"confirmed" },
    { id:"form", label:"形式", value:"双面矩形说明卡", status:"assumed" },
    { id:"material_direction", label:"材料方向", value:"未涂布卡纸", status:"assumed" },
    { id:"output_format", label:"输出格式", value:"SVG", status:"confirmed" }
  ],
  finished_size: { preset_size:"A6", width:148, height:105, unit:"mm", status:"confirmed", source:"preset" }
};

const items = [
  { id:"rec-size", brief_field_id:"finished_size", decision:"pending", variants:[{recommendation:"A6"}] },
  { id:"rec-format", brief_field_id:"output_format", decision:"pending", variants:[{recommendation:"SVG"}] },
  { id:"rec-form", brief_field_id:"form", decision:"accepted", recommendation:"双面", user_note:"保留", variant_index:0, variants:[{recommendation:"双面"},{recommendation:"折页"}] },
  { id:"rec-material", brief_field_id:"material_direction", decision:"pending", recommendation:"卡纸", user_note:"", variant_index:0, variants:[{recommendation:"卡纸"},{recommendation:"未涂布纸"}] }
];

test("A6 preset normalizes into one confirmed finished-size field", () => {
  assert.deepEqual(normalizeFinishedSize({ preset_size:"A6", status:"confirmed" }), {
    preset_size:"A6", width:148, height:105, unit:"mm", status:"confirmed", source:"preset"
  });
});

test("custom size is missing only when width or height is absent", () => {
  assert.equal(normalizeFinishedSize({preset_size:"custom",width:"",height:105,unit:"mm"}).status,"missing");
  assert.equal(normalizeFinishedSize({preset_size:"custom",width:120,height:80,unit:"mm",status:"confirmed"}).status,"confirmed");
});

test("Creative Plan locks confirmed constraints and omits their recommendations", () => {
  const result = splitCreativePlan(brief, items);
  assert.deepEqual(result.suggestions.map(item=>item.id),["rec-form","rec-material"]);
  assert.ok(result.locked.some(item=>item.id==="finished_size" && item.value==="A6 · 148 × 105 mm"));
  assert.ok(result.locked.some(item=>item.id==="output_format"));
});

test("refreshing one pending suggestion preserves accepted sibling decisions", () => {
  const refreshed = refreshSuggestion(items,"rec-material");
  assert.equal(refreshed.find(item=>item.id==="rec-form").decision,"accepted");
  assert.equal(refreshed.find(item=>item.id==="rec-form").user_note,"保留");
  assert.equal(refreshed.find(item=>item.id==="rec-material").recommendation,"未涂布纸");
  assert.equal(refreshed.find(item=>item.id==="rec-material").decision,"pending");
});

test("accepted suggestion must be reconsidered before it can refresh", () => {
  assert.deepEqual(refreshSuggestion(items,"rec-form"),items);
  const reconsidered = reconsiderSuggestion(items,"rec-form");
  assert.equal(reconsidered.find(item=>item.id==="rec-form").decision,"pending");
});

test("acceptedPlan contains only accepted decisions", () => {
  assert.deepEqual(acceptedPlan(items).map(item=>item.id),["rec-form"]);
});
