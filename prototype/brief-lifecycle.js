export const BRIEF_LIFECYCLES = Object.freeze(["draft","ready_for_confirmation","confirmed","superseded"]);

const clone=value=>structuredClone(value);

export function applyBriefValidation(brief,validation){
  const next=clone(brief);
  if(next.lifecycle!=="confirmed") next.lifecycle=validation?.can_confirm?"ready_for_confirmation":"draft";
  next.confirmed=next.lifecycle==="confirmed"; // deprecated compatibility mirror
  return next;
}

export function confirmBrief(brief,validation,history=[]){
  if(!validation?.can_confirm||brief.lifecycle!=="ready_for_confirmation") return {ok:false,brief,history};
  const next={...clone(brief),lifecycle:"confirmed",confirmed:true,confirmedAt:new Date().toISOString()};
  return {ok:true,brief:next,history:[...history.filter(item=>item.brief_revision!==next.brief_revision),clone(next)]};
}

export function beginBriefRevision(brief,history=[]){
  if(brief.lifecycle!=="confirmed") return {brief,history,created:false};
  const archived={...clone(brief),lifecycle:"superseded"};
  const next={...clone(brief),brief_revision:Number(brief.brief_revision||0)+1,lifecycle:"draft",confirmed:false,confirmedAt:null};
  return {brief:next,history:[...history.filter(item=>item.brief_revision!==archived.brief_revision),archived],created:true};
}
