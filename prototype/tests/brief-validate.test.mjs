import test from "node:test";
import assert from "node:assert/strict";
const briefValidate = await import("../brief-validate.js").catch(() => ({}));

test("brief.validate将已确认A6规范化为148×105mm", () => {
  assert.equal(typeof briefValidate.validateBrief,"function");
  const brief_candidate={
    brief_revision:1,
    lifecycle:"ready_for_confirmation",
    fields:[
      {id:"deliverable",value:"说明卡",status:"confirmed",critical:true,source:"human"},
      {id:"purpose",value:"解释组合",status:"confirmed",critical:true,source:"human"},
      {id:"must_content",value:"使用提醒",status:"confirmed",critical:true,source:"human"}
    ],
    finished_size:{preset_size:"A6",status:"confirmed"}
  };
  const before=structuredClone(brief_candidate);

  const output=briefValidate.validateBrief({brief_candidate});

  assert.deepEqual(output.brief_validation_result.normalized_finished_size,{
    preset_size:"A6",width:148,height:105,unit:"mm",status:"confirmed"
  });
  assert.equal(output.brief_validation_result.validity,"valid");
  assert.deepEqual(brief_candidate,before);
});

test("brief.validate确定性支持A4、A5、A6横向预设且不依赖Model", () => {
  const cases = [
    ["A4", 297, 210],
    ["A5", 210, 148],
    ["A6", 148, 105]
  ];
  for (const [preset_size, width, height] of cases) {
    const output = briefValidate.validateBrief({ brief_candidate: {
      brief_revision: 1,
      lifecycle: "draft",
      fields: [],
      finished_size: { preset_size, status: "confirmed" }
    }});
    assert.deepEqual(output.brief_validation_result.normalized_finished_size, {
      preset_size, width, height, unit: "mm", status: "confirmed"
    });
  }
});

test("brief.validate不会把Human未确认的preset自动升级为confirmed", () => {
  assert.equal(typeof briefValidate.validateBrief,"function");
  const output=briefValidate.validateBrief({brief_candidate:{
    brief_revision:1,
    lifecycle:"draft",
    fields:[],
    finished_size:{preset_size:"A6",status:"needs_confirmation"}
  }});

  assert.equal(output.brief_validation_result.normalized_finished_size.status,"needs_confirmation");
});

test("brief.validate将缺少自定义宽度视为invalid且不生成Plan或Artifact", () => {
  assert.equal(typeof briefValidate.validateBrief,"function");
  const output=briefValidate.validateBrief({brief_candidate:{
    brief_revision:2,
    lifecycle:"draft",
    fields:[],
    finished_size:{preset_size:"custom",width:"",height:105,unit:"mm",status:"missing"}
  }});

  assert.equal(output.brief_validation_result.validity,"invalid");
  assert.ok(output.brief_validation_result.missing_items.includes("finished_size"));
  assert.equal(Object.hasOwn(output,"creative_plan"),false);
  assert.equal(Object.hasOwn(output,"artifact"),false);
});
