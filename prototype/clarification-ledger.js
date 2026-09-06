import { parseMomoRayHeightMapping } from "./brief-validate.js";

const clone=value=>structuredClone(value);
const SLOT_BY_BLOCKER={
  "product_facts.module_relationship":"product_facts.pillow_height_mapping",
  "product_facts.pillow_height_data":"product_facts.pillow_height_mapping",
  "product_facts.evidence":"product_facts.pillow_height_mapping",
  finished_size:"finished_size",
  deliverable:"deliverable",
  purpose:"purpose",
  must_content:"must_content"
};
const CRITICAL=new Set(Object.keys(SLOT_BY_BLOCKER));
export const semanticSlotFor=fieldId=>SLOT_BY_BLOCKER[fieldId]||fieldId;
export function createClarificationLedger(){return{round_count:0,slots:{}};}
const ensure=(ledger,slotId)=>ledger.slots[slotId]||(ledger.slots[slotId]={slot_id:slotId,asked_count:0,questions:[],human_answers:[],normalized_value:null,resolved:false,resolution_source:null});
export function recordAskedQuestions(ledger,questions=[]){const next=clone(ledger||createClarificationLedger());next.round_count+=1;for(const question of questions){const slot=ensure(next,semanticSlotFor(question.field_id));slot.asked_count+=1;slot.questions.push({question_id:question.question_id,question:question.question});}return next;}
export function recordHumanAnswers(ledger,answers=[],normalizers={}){const next=clone(ledger||createClarificationLedger());for(const answer of answers){const slotId=semanticSlotFor(answer.field_id),slot=ensure(next,slotId),value=String(answer.answer||"").trim();if(!value)continue;slot.human_answers.push(value);const normalizer=normalizers[slotId]||(slotId==="product_facts.pillow_height_mapping"?parseMomoRayHeightMapping:null);const normalized=normalizer?normalizer(value):value;slot.normalized_value=normalized??value;slot.resolved=normalized!==null&&normalized!==false&&normalized!==undefined;slot.resolution_source="human_clarification";}
  const mapping=parseMomoRayHeightMapping(answers.map(item=>item.answer).join("；"));if(mapping){const slot=ensure(next,"product_facts.pillow_height_mapping");slot.human_answers.push(...answers.map(item=>String(item.answer||"").trim()).filter(Boolean));slot.normalized_value=mapping;slot.resolved=true;slot.resolution_source="human_clarification";}
  return next;}
export function markSlotsResolved(ledger,slotIds=[],normalizedValue=null,source="rule_normalization"){const next=clone(ledger||createClarificationLedger());for(const id of slotIds){const slot=ensure(next,id);slot.resolved=true;slot.normalized_value=normalizedValue;slot.resolution_source=source;}return next;}
export function filterAskableBlockers(blockers=[],ledger=createClarificationLedger(),brief={}){if((ledger.round_count||0)>=2)return[];return blockers.filter(blocker=>{if(!CRITICAL.has(blocker))return false;const slot=ledger.slots?.[semanticSlotFor(blocker)];if(slot?.resolved||slot?.asked_count>=1||slot?.human_answers?.some(Boolean))return false;const root=String(blocker).split('.')[0],field=(brief.fields||[]).find(item=>item.id===root);if(field&&String(field.source||'').startsWith('human')&&String(field.value||'').trim())return false;return true;});}
