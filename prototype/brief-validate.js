const PRESET_SIZES = {
  A4:{width:297,height:210,unit:"mm"},
  A5:{width:210,height:148,unit:"mm"},
  A6:{width:148,height:105,unit:"mm"}
};

const FIELD_STATUSES = new Set(["confirmed","assumed","missing","needs_confirmation"]);

export const BRIEF_CRITICAL_FIELD_IDS = Object.freeze(["deliverable","purpose","must_content","product_facts"]);
export const MOMORAY_PRODUCT_FACT_DEPENDENCIES = Object.freeze([
  {id:"module_relationship",must_content_terms:["模块","组合"],fact_terms:["组合"]},
  {id:"pillow_height_data",must_content_terms:["枕高","高度"],fact_terms:["枕高","高度"],requires_numeric:true}
]);
const findField=(brief,id)=>(brief.fields||[]).find(field=>field.id===id);
const text=value=>String(value??"").trim();
const hasUnresolvedConflict=field=>Boolean(field?.unresolved_conflict||field?.conflict_status==="unresolved"||(Array.isArray(field?.conflicts)&&field.conflicts.length));
const hasEvidence=field=>Boolean(text(field?.source)||text(field?.evidence)||(Array.isArray(field?.evidence)&&field.evidence.length));

export function normalizeFinishedSize(size = {}) {
  const preset=PRESET_SIZES[size.preset_size];
  if(preset){
    const status=FIELD_STATUSES.has(size.status) ? size.status : "needs_confirmation";
    return {preset_size:size.preset_size,...preset,status};
  }
  const width=Number(size.width)||"",height=Number(size.height)||"";
  return {
    preset_size:"custom",
    width,
    height,
    unit:size.unit||"mm",
    status:width&&height&&FIELD_STATUSES.has(size.status)?size.status:width&&height?"needs_confirmation":"missing"
  };
}

export function validateBrief({ brief_candidate }) {
  const normalized=normalizeFinishedSize(brief_candidate.finished_size);
  const missing=[];
  const conflicts=[];
  if(normalized.preset_size==="custom"){
    if(!normalized.width||!normalized.height)missing.push("finished_size");
  }
  if(brief_candidate.finished_size?.preset_size&&brief_candidate.finished_size.preset_size!=="custom"&&!PRESET_SIZES[brief_candidate.finished_size.preset_size]){
    conflicts.push("finished_size.preset_size");
  }
  for(const id of ["deliverable","purpose","must_content"]){
    const field=findField(brief_candidate,id);
    if(!field||field.status==="missing"||!text(field.value))missing.push(id);
    if(hasUnresolvedConflict(field))conflicts.push(id);
  }
  const mustContent=findField(brief_candidate,"must_content"),productFacts=findField(brief_candidate,"product_facts");
  const requiredFacts=MOMORAY_PRODUCT_FACT_DEPENDENCIES.filter(rule=>rule.must_content_terms.some(term=>text(mustContent?.value).includes(term)));
  for(const rule of requiredFacts){
    const factText=text(productFacts?.value);
    const factIsUsable=productFacts&&productFacts.status!=="missing"&&rule.fact_terms.some(term=>factText.includes(term))&&(!rule.requires_numeric||/\d/.test(factText));
    if(!factIsUsable)missing.push(`product_facts.${rule.id}`);
  }
  if(requiredFacts.length&&productFacts&&!hasEvidence(productFacts))missing.push("product_facts.evidence");
  if(hasUnresolvedConflict(productFacts))conflicts.push("product_facts");
  // Rule owns the critical set. Model-provided `critical` flags never decide the Gate.
  const uniqueMissing=[...new Set(missing)],uniqueConflicts=[...new Set(conflicts)];
  return {
    brief_validation_result:{
      brief_revision:brief_candidate.brief_revision??null,
      validity:uniqueMissing.length||uniqueConflicts.length?"invalid":"valid",
      missing_items:uniqueMissing,
      conflict_items:uniqueConflicts,
      critical_blockers:[...uniqueMissing,...uniqueConflicts],
      can_confirm:uniqueMissing.length===0&&uniqueConflicts.length===0,
      evidence:["brief_candidate.finished_size"],
      normalized_finished_size:normalized,
      required_product_facts:requiredFacts.map(rule=>rule.id)
    }
  };
}
