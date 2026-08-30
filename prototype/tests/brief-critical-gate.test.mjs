import assert from "node:assert/strict";
import test from "node:test";
import {validateBrief} from "../brief-validate.js";
import {applyBriefValidation,confirmBrief} from "../brief-lifecycle.js";
import {prepareBriefForEditor} from "../brief-extract-client.js";

const field=(id,value,status="confirmed",extra={})=>({id,value,status,critical:true,source:"human_input",...extra});
function validBrief(){return{brief_revision:1,lifecycle:"draft",fields:[field("deliverable","包装内高度调节说明卡"),field("purpose","让用户理解模块组合与枕高"),field("must_content","三种高度配置、垫片数量、对应枕高、使用提醒"),field("product_facts","三种模块组合分别使用0、1、2片垫片；对应真实枕高为15、16、17 cm")],finished_size:{preset_size:"A6",status:"confirmed"}}}
const result=brief=>validateBrief({brief_candidate:brief}).brief_validation_result;
const setField=(brief,id,patch)=>Object.assign(brief.fields.find(item=>item.id===id),patch);

for(const [name,id] of [["deliverable","deliverable"],["purpose","purpose"],["must_content","must_content"]])test(`${name} missing blocks Brief`,()=>{const brief=validBrief();setField(brief,id,{value:"",status:"missing"});assert.ok(result(brief).critical_blockers.includes(id));assert.equal(result(brief).can_confirm,false)});
test("required product fact missing blocks Brief",()=>{const brief=validBrief();setField(brief,"product_facts",{value:"模块组合关系见产品资料",source:"human_input"});assert.ok(result(brief).critical_blockers.includes("product_facts.pillow_height_data"))});
test("required product facts without evidence or source block Brief",()=>{const brief=validBrief();setField(brief,"product_facts",{source:null,evidence:null});assert.ok(result(brief).critical_blockers.includes("product_facts.evidence"))});
test("unrelated product fact missing does not block Brief",()=>{const brief=validBrief();brief.fields.push(field("material_weight","","missing",{source:null}));assert.equal(result(brief).can_confirm,true)});
test("finished_size missing blocks Brief",()=>{const brief=validBrief();brief.finished_size={preset_size:"custom",width:"",height:"",unit:"mm",status:"missing"};assert.ok(result(brief).critical_blockers.includes("finished_size"))});
for(const id of ["form","color_direction","output_format"])test(`${id} missing is non-critical at Brief Gate`,()=>{const brief=validBrief();brief.fields.push(field(id,"","missing",{source:null}));assert.equal(result(brief).can_confirm,true)});
test("critical unresolved conflict blocks Brief",()=>{const brief=validBrief();setField(brief,"purpose",{unresolved_conflict:true});assert.ok(result(brief).conflict_items.includes("purpose"));assert.equal(result(brief).can_confirm,false)});
test("all critical resolved becomes ready_for_confirmation",()=>{const brief=validBrief(),validation=result(brief);assert.equal(applyBriefValidation(brief,validation).lifecycle,"ready_for_confirmation")});
test("only Human Confirm changes ready Brief to confirmed",()=>{const brief=validBrief(),validation=result(brief),ready=applyBriefValidation(brief,validation);assert.equal(confirmBrief(ready,validation).brief.lifecycle,"confirmed")});
test("UI required flags match frozen Rule critical fields",()=>{const prepared=prepareBriefForEditor({brief_revision:1,lifecycle:"draft",fields:[field("must_content","组合与枕高","confirmed",{critical:false}),field("output_format","SVG","confirmed",{critical:true})],finished_size:validBrief().finished_size},{});const flags=Object.fromEntries(prepared.fields.map(item=>[item.id,item.critical]));assert.equal(flags.deliverable,true);assert.equal(flags.purpose,true);assert.equal(flags.must_content,true);assert.equal(flags.product_facts,true);assert.equal(flags.output_format,false)});
