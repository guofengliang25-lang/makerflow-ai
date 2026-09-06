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

const chineseCount=value=>({"不放":0,"零":0,"一":1,"二":2,"两":2}[value]??Number(value));
export function parseMomoRayHeightMapping(value=""){
  const source=text(value).replace(/厘米/gi,"cm").replace(/\s+/g,"");
  const inverse=source.match(/(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)(?:cm)?分别(?:是|对应)(?:不放|0)(?:片)?\/(?:一|1)(?:片)?\/(?:二|两|2)片?/i);
  if(inverse)return[0,1,2].map((insert_count,index)=>({insert_count,height_cm:Number(inverse[index+1])}));
  const found=new Map();
  const pattern=/(不放|零|一|二|两|[012])(?:片|个|insert|inserts)?(?:垫片)?(?:=|：|:|为|是|对应|→|->)?(\d+(?:\.\d+)?)(?:cm)?/gi;
  for(const match of source.matchAll(pattern)){const count=chineseCount(match[1]);if([0,1,2].includes(count))found.set(count,Number(match[2]));}
  return[0,1,2].every(count=>found.has(count))?[0,1,2].map(insert_count=>({insert_count,height_cm:found.get(insert_count)})):null;
}

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
    status:width&&height&&size.status==="confirmed"?"confirmed":width&&height?"needs_confirmation":"missing"
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
  const heightMapping=parseMomoRayHeightMapping(productFacts?.value);
  const requiredFacts=MOMORAY_PRODUCT_FACT_DEPENDENCIES.filter(rule=>rule.must_content_terms.some(term=>text(mustContent?.value).includes(term)));
  for(const rule of requiredFacts){
    const factText=text(productFacts?.value);
    const factIsUsable=productFacts&&productFacts.status!=="missing"&&(heightMapping||rule.fact_terms.some(term=>factText.includes(term))&&(!rule.requires_numeric||/\d/.test(factText)));
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
      normalized_product_facts:{height_mapping:heightMapping},
      required_product_facts:requiredFacts.map(rule=>rule.id)
    }
  };
}
