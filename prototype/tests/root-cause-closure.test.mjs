import assert from "node:assert/strict";
import test from "node:test";

import { parseMomoRayHeightMapping, validateBrief } from "../brief-validate.js";
import { applyClarificationAnswers, applyTrustedMomoRayContext } from "../brief-ui-state.js";
import { mergeClarification } from "../brief-extract-client.js";
import { createClarificationLedger, recordAskedQuestions, recordHumanAnswers, filterAskableBlockers } from "../clarification-ledger.js";
import { reconcileCreativePlanState } from "../creative-plan-state.js";
import { migratePersistedState } from "../state-migration.js";

const field=(id,value,status="confirmed",extra={})=>({id,value,status,source:"human_clarification",...extra});
const brief=(facts="0片15cm，1片16cm，2片17cm")=>({brief_revision:1,lifecycle:"draft",fields:[field("deliverable","高度调节说明卡"),field("purpose","帮助用户调节枕高"),field("must_content","三种模块组合和对应枕高"),field("product_facts",facts,"confirmed",{evidence:["MomoRay product owner / project confirmed data"]})],finished_size:{preset_size:"A6",status:"confirmed"}});

test("MomoRay高度映射接受不含Rule关键词的三组简写",()=>{
  for(const input of ["0片15cm，1片16cm，2片17cm","0=15，1=16，2=17cm","不放15，一片16，两片17","15/16/17分别是0/1/2片"]){
    assert.deepEqual(parseMomoRayHeightMapping(input),[{insert_count:0,height_cm:15},{insert_count:1,height_cm:16},{insert_count:2,height_cm:17}]);
  }
});

test("完整三组映射同时resolve模块关系和高度数据",()=>{
  const result=validateBrief({brief_candidate:brief()}).brief_validation_result;
  assert.equal(result.critical_blockers.includes("product_facts.module_relationship"),false);
  assert.equal(result.critical_blockers.includes("product_facts.pillow_height_data"),false);
  assert.deepEqual(result.normalized_product_facts.height_mapping,[{insert_count:0,height_cm:15},{insert_count:1,height_cm:16},{insert_count:2,height_cm:17}]);
});

test("draft期间Human clarification覆盖旧partial confirmed值",()=>{
  const current=brief("0片15cm");
  const next=applyClarificationAnswers(current,[{field_id:"product_facts",answer:"0片15cm，1片16cm，2片17cm"}]);
  assert.deepEqual(parseMomoRayHeightMapping(next.fields.find(item=>item.id==="product_facts").value),[{insert_count:0,height_cm:15},{insert_count:1,height_cm:16},{insert_count:2,height_cm:17}]);
});

test("draft merge优先保留Human新回答而不是previous partial值",()=>{
  const previous=brief("0片15cm"),incoming=brief("0片15cm，1片16cm，2片17cm");
  incoming.fields.find(item=>item.id==="product_facts").source="model_extract";
  const merged=mergeClarification(previous,incoming,[{field_id:"product_facts",answer:"0片15cm，1片16cm，2片17cm"}]);
  assert.equal(merged.fields.find(item=>item.id==="product_facts").value,"0片15cm，1片16cm，2片17cm");
});

test("MomoRay trusted context在后续Model re-extract中保持Human authority",()=>{
  const trusted=applyTrustedMomoRayContext(brief("")),incoming=brief("");
  incoming.fields.find(item=>item.id==="product_facts").source="model_extract";
  const merged=mergeClarification(trusted,incoming,[]);
  assert.deepEqual(parseMomoRayHeightMapping(merged.fields.find(item=>item.id==="product_facts").value),[{insert_count:0,height_cm:15},{insert_count:1,height_cm:16},{insert_count:2,height_cm:17}]);
});

test("MomoRay trusted context在Model省略product_facts时仍建立权威字段",()=>{
  const candidate={brief_revision:1,lifecycle:"draft",fields:[field("deliverable","高度调节说明卡")],finished_size:{preset_size:"custom",status:"missing"}};
  const trusted=applyTrustedMomoRayContext(candidate),facts=trusted.fields.find(item=>item.id==="product_facts");
  assert.ok(facts);
  assert.equal(facts.source,"human_confirmed_product_owner");
  assert.deepEqual(parseMomoRayHeightMapping(facts.value),[{insert_count:0,height_cm:15},{insert_count:1,height_cm:16},{insert_count:2,height_cm:17}]);
});

test("semantic slot最多主动ASK一次且Human回答后不再可问",()=>{
  let ledger=createClarificationLedger();
  ledger=recordAskedQuestions(ledger,[{question_id:"q1",field_id:"product_facts.pillow_height_data",question:"请提供映射"}]);
  assert.deepEqual(filterAskableBlockers(["product_facts.pillow_height_data"],ledger,brief("")),[]);
  ledger=recordHumanAnswers(ledger,[{field_id:"product_facts.pillow_height_data",answer:"0=15，1=16，2=17"}]);
  assert.deepEqual(filterAskableBlockers(["product_facts.pillow_height_data"],ledger,brief("")),[]);
  assert.equal(ledger.slots["product_facts.pillow_height_mapping"].resolved,true);
});

test("综合Human回答中的高度映射跨field_id解析并resolve产品事实slot",()=>{
  const answers=[{field_id:"must_content",answer:"必须包含三种配置。产品事实：0=15，1=16，2=17cm"}];
  const updated=applyClarificationAnswers(brief(""),answers);
  assert.deepEqual(parseMomoRayHeightMapping(updated.fields.find(item=>item.id==="product_facts").value),[{insert_count:0,height_cm:15},{insert_count:1,height_cm:16},{insert_count:2,height_cm:17}]);
  const ledger=recordHumanAnswers(createClarificationLedger(),answers);
  assert.equal(ledger.slots["product_facts.pillow_height_mapping"].resolved,true);
});

test("两轮Clarification后不再主动ASK",()=>{
  const ledger={...createClarificationLedger(),round_count:2};
  assert.deepEqual(filterAskableBlockers(["finished_size"],ledger,brief("")),[]);
});

test("旧Plan decision map迁移后与recommendations一一对应",()=>{
  const old={plan:{recommendations:[{recommendation_id:"r1"},{recommendation_id:"r2"}]},decisions:{r1:{status:"accepted"},orphan:{status:"rejected"}}};
  const next=reconcileCreativePlanState(old);
  assert.deepEqual(Object.keys(next.decisions),["r1","r2"]);
  assert.equal(next.decisions.r1.status,"accepted");
  assert.equal(next.decisions.r2.status,"pending");
});

test("v2持久状态迁移清理旧Plan污染并升级版本",()=>{
  const next=migratePersistedState({version:2,creativePlan:{plan:{recommendations:[{recommendation_id:"r1"}]},decisions:{old:{status:"accepted"}}}});
  assert.equal(next.version,3);
  assert.equal(next.creativePlan.decisions.r1.status,"pending");
  assert.equal("old" in next.creativePlan.decisions,false);
});
