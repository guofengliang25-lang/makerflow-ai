import assert from "node:assert/strict";
import test from "node:test";

import { createRuntimeId } from "../runtime-id.js";
import {
  applyRecommendationReplacement,
  beginRecommendationReplacement,
  createCreativePlanState,
  failRecommendationReplacement,
  reconcileCreativePlanState,
  recordPlanDecision
} from "../creative-plan-state.js";
import { replaceCreativePlanRecommendation } from "../plan-generate-client.js";

const recommendation=(id,type="form",suggestion=id)=>({recommendation_id:id,decision_type:type,suggestion,basis:"basis",expected_benefit:"benefit",tradeoff:"tradeoff",confidence:0.7});
const plan=()=>({plan_id:"p1",source_brief_revision:1,recommendations:[recommendation("form-a"),recommendation("color-a","color_direction")],unresolved_items:[],provider_metadata:{}});

test("crypto.randomUUID unavailable仍生成唯一Decision ID并允许Accept/Reject",()=>{
  let seed=0;const fallbackCrypto={getRandomValues(array){for(let i=0;i<array.length;i++)array[i]=(seed++*17+3)%256;return array;}};
  const ids=[createRuntimeId(fallbackCrypto),createRuntimeId(fallbackCrypto)];
  assert.notEqual(ids[0],ids[1]);
  let state=createCreativePlanState(plan());
  state=recordPlanDecision(state,{recommendationId:"form-a",action:"accept",actor:"human",runtimeCrypto:fallbackCrypto});
  state=recordPlanDecision(state,{recommendationId:"color-a",action:"reject",actor:"human",runtimeCrypto:fallbackCrypto});
  assert.equal(state.decisions["form-a"].status,"accepted");
  assert.equal(state.decisions["color-a"].status,"rejected");
  assert.equal(new Set(state.decision_log.map(item=>item.decision_id)).size,2);
});

test("Reject A保留历史并只将同类型replacement B置为pending",()=>{
  let state=createCreativePlanState(plan());
  state=recordPlanDecision(state,{recommendationId:"color-a",action:"accept",actor:"human"});
  state=recordPlanDecision(state,{recommendationId:"form-a",action:"reject",actor:"human"});
  state=beginRecommendationReplacement(state,"form-a");
  assert.equal(state.replacements.form.loading,true);
  state=applyRecommendationReplacement(state,"form-a",recommendation("form-b","form","B"));
  assert.equal(state.plan.recommendations.some(item=>item.recommendation_id==="form-a"),false);
  assert.equal(state.decisions["form-b"].status,"pending");
  assert.equal(state.decisions["color-a"].status,"accepted");
  assert.equal(state.rejected_recommendations.form[0].recommendation_id,"form-a");
});

test("replacement必须保持decision_type、Brief revision且使用新ID",()=>{
  let state=createCreativePlanState(plan());
  state=recordPlanDecision(state,{recommendationId:"form-a",action:"reject",actor:"human"});
  state=beginRecommendationReplacement(state,"form-a");
  assert.throws(()=>applyRecommendationReplacement(state,"form-a",recommendation("form-a","form")),/REPLACEMENT_ID_REUSED/);
  assert.throws(()=>applyRecommendationReplacement(state,"form-a",recommendation("visual-b","visual_aid")),/REPLACEMENT_TYPE_MISMATCH/);
});

test("同一decision_type最多自动替换3次",()=>{
  let state=createCreativePlanState(plan());
  for(let index=0;index<3;index++){
    const current=state.plan.recommendations.find(item=>item.decision_type==="form");
    state=recordPlanDecision(state,{recommendationId:current.recommendation_id,action:"reject",actor:"human"});
    state=beginRecommendationReplacement(state,current.recommendation_id);
    state=applyRecommendationReplacement(state,current.recommendation_id,recommendation(`form-${index+1}`,"form"));
  }
  const current=state.plan.recommendations.find(item=>item.decision_type==="form");
  state=recordPlanDecision(state,{recommendationId:current.recommendation_id,action:"reject",actor:"human"});
  assert.throws(()=>beginRecommendationReplacement(state,current.recommendation_id),/REPLACEMENT_LIMIT_REACHED/);
});

test("replacement provider failure只标记当前卡片且保留其它Plan状态",()=>{
  let state=createCreativePlanState(plan());
  state=recordPlanDecision(state,{recommendationId:"color-a",action:"accept",actor:"human"});
  state=recordPlanDecision(state,{recommendationId:"form-a",action:"reject",actor:"human"});
  state=beginRecommendationReplacement(state,"form-a");
  state=failRecommendationReplacement(state,"form-a",{code:"PROVIDER_ERROR"});
  assert.equal(state.decisions["color-a"].status,"accepted");
  assert.equal(state.replacements.form.error.code,"PROVIDER_ERROR");
  assert.equal(state.replacements.form.loading,false);
});

test("刷新中断replacement请求后loading恢复为可重试错误",()=>{
  let state=createCreativePlanState(plan());
  state=recordPlanDecision(state,{recommendationId:"form-a",action:"reject",actor:"human"});
  state=beginRecommendationReplacement(state,"form-a");
  const restored=reconcileCreativePlanState(structuredClone(state),{recoverInterruptedReplacement:true});
  assert.equal(restored.replacements.form.loading,false);
  assert.equal(restored.replacements.form.error.code,"REPLACEMENT_INTERRUPTED");
  assert.equal(restored.replacements.form.replacing_recommendation_id,"form-a");
});

test("Browser replacement请求保持same-origin并返回单项candidate",async()=>{
  let body;const result=await replaceCreativePlanRecommendation({confirmedBrief:{brief_revision:1,lifecycle:"confirmed"},rejectedRecommendation:recommendation("form-a"),previousRejectedSuggestions:["A"],fetchImpl:async(url,options)=>{assert.equal(url,"./api/skills/plan.generate");body=JSON.parse(options.body);return{ok:true,json:async()=>({ok:true,replacement_recommendation:recommendation("form-b","form","B"),trace:{}})}}});
  assert.equal(body.mode,"replace_recommendation");
  assert.equal(body.source_brief_revision,1);
  assert.equal(result.replacement_recommendation.recommendation_id,"form-b");
});
