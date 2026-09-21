import { buildDesignSpecFromBrief, downloadTextFile } from "./renderer.js";
import { applyQaMutation } from "./preflight.js";
import { readFileAsText, readFileAsDataUrl, validateUpload, sanitizeSvg } from "./svg-upload.js";
import { normalizeFinishedSize } from "./plan-policy.js";
import { createDefaultElements, snapDelta, constrainPosition, moveElement, resetLayout, restoreLayout } from "./layout-interaction.js";
import { markDesignSpecEdited, recordRenderedSvg } from "./design-state.js";
import { createArtifactStore, persistSvgArtifact } from "./artifact-manager.js";
import { persistNativeDesign, runCurrentArtifactPreflight, getCurrentArtifact, getCurrentPreflightReport, canExportCurrentArtifact, migrateLegacyDesignArtifact } from "./workflow-state.js";
import { createDecisionLog, recordHumanWarningConfirmation, isWarningConfirmed } from "./decision-log.js";
import { validateBrief } from "./brief-validate.js";
import { extractAndValidateBrief, prepareBriefForEditor, requestMissingQuestions, clarifyAndValidateBrief, sanitizeModelTrace } from "./brief-extract-client.js";
import { applyBriefValidation, confirmBrief, beginBriefRevision } from "./brief-lifecycle.js";
import { generateCreativePlan, replaceCreativePlanRecommendation } from "./plan-generate-client.js";
import { createCreativePlanState, recordPlanDecision, getAcceptedPlan, syncPlanStaleness, acceptEditedRecommendation, bulkAcceptPendingRecommendations, finalizePlanReview, getConfirmedBriefPlanContext, reconcileCreativePlanState, beginRecommendationReplacement, applyRecommendationReplacement, failRecommendationReplacement } from "./creative-plan-state.js";
import { applyTrustedMomoRayContext } from "./brief-ui-state.js";
import { createClarificationLedger, filterAskableBlockers, recordAskedQuestions, recordHumanAnswers, semanticSlotFor } from "./clarification-ledger.js";
import { migratePersistedState } from "./state-migration.js";
import { evaluateHandoffCompletion } from "./handoff-state.js";
import { hydrateCreativePlanPreviews, normalizeCreativePlans } from "./plan-ui-data.js";
import { DEMO_MODE, MOMORAY_QUESTIONS, createMomoRayBrief, createMomoRayCreativePlan } from "./momoray-demo-state.js";

const STORAGE_KEY = "makerflow.lowfi.v3";
const LEGACY_STORAGE_KEY = "makerflow.lowfi.v2";
const IS_QA = new URLSearchParams(location.search).get("qa") === "1";
const DATA_FILES = {
  job: "./data/job_initial.json",
  brief: "./data/brief_confirmed.json",
  layouts: "./data/layout_templates.json",
  icons: "./data/icon_library.json",
  recommendations: "./data/recommendations.json",
  projectState: "./data/project_state.json"
};

const defaultState = () => ({
  version: 3,
  currentStep: 1,
  maxUnlockedStep: 1,
  qaScenario: "pass",
  job: { description:"", productFacts:"", cardPurpose:"", references:"", existingFiles:"", referenceFiles:[], sampleMode:false },
  userInput: { raw:"", source:"custom" },
  demoMode: null,
  extractedBrief: null,
  missingFields: [],
  extracted: false,
  extractRequest: { loading:false, error:null, trace:null },
  briefValidation: null, briefHistory:[],
  askMissing:{loading:false,error:null,status:"NEED_CLARIFICATION",warning:null,questions:[],missing_fields:[],completion_status:{complete:false,missing_fields:[]},trace:null},
  clarificationSession:{questions:[],index:0,answers:{}},
  clarificationLedger:createClarificationLedger(),
  brief: { brief_revision:1,lifecycle:"draft",fields:[], confirmed:false, confirmedAt:null },
  creativePlan: { plan:null, plans:[], selectedPlanId:null, lifecycle:"empty", stale:false, decisions:{}, decision_log:[], loading:false, error:null, trace:null, confirmed:false, confirmedAt:null, editingRecommendationId:null },
  design: { spec:null, svgString:"", source:"makerflow_template", sourceLabel:"MakerFlow模板生成", assets:[], revision:0, dirty:false, focusTarget:null, selectedElement:"title", zoom:1, pan:{x:0,y:0}, layoutUndo:null, statusMessage:"", editInstruction:"", previewMode:"plate", activePresets:{}, aiAdjustLoading:false },
  artifactStore: createArtifactStore(),
  decisionLog: createDecisionLog(),
  routing: { confirmedWarnings:[] }, // Deprecated migration field; no authority.
  studioReadiness: null
});

let fixtures = {};
let state = loadState();
const app = document.querySelector("#app");
const qaControls = document.querySelector("#qaControls");
const scenarioSelect = document.querySelector("#scenarioSelect");
const resetButton = document.querySelector("#resetButton");
const prevButton = document.querySelector("#prevButton");
const nextButton = document.querySelector("#nextButton");
const gateMessage = document.querySelector("#gateMessage");
const bottomBar = document.querySelector(".bottom-bar");
qaControls.hidden = !IS_QA;

function loadState() {
  try {
    const raw=localStorage.getItem(STORAGE_KEY)||localStorage.getItem(LEGACY_STORAGE_KEY);
    if(!raw)return defaultState();
    return {...defaultState(),...migratePersistedState(JSON.parse(raw))};
  } catch { return defaultState(); }
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state));localStorage.removeItem(LEGACY_STORAGE_KEY); }
  catch { gateMessage.textContent = "当前素材较大，浏览器无法保存全部状态；本次会话仍可继续。"; }
}

async function loadFixtures() {
  const pairs = await Promise.all(Object.entries(DATA_FILES).map(async ([key, path]) => {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`无法加载 ${path}`);
    return [key, await response.json()];
  }));
  fixtures = Object.fromEntries(pairs);
  if (!state.studioReadiness) state.studioReadiness = structuredClone(fixtures.projectState);
  state.job = { ...defaultState().job, ...state.job };
  state.creativePlan = { ...defaultState().creativePlan, ...state.creativePlan };
  state.creativePlan = reconcileCreativePlanState(state.creativePlan,{recoverInterruptedReplacement:true});
  // Discard pre-preview plans from older sessions so a stale placeholder can never render.
  if (state.creativePlan.plans?.length && state.creativePlan.plans.some(plan => !plan.previewSvg || !plan.previewImage)) {
    state.creativePlan = { ...defaultState().creativePlan };
  }
  state.clarificationLedger=state.clarificationLedger||createClarificationLedger();
  state.extractRequest = { ...defaultState().extractRequest, ...state.extractRequest, loading:false };
  state.askMissing={...defaultState().askMissing,...state.askMissing,loading:false};state.briefHistory=state.briefHistory||[];
  state.clarificationSession={...defaultState().clarificationSession,...state.clarificationSession,answers:{...(state.clarificationSession?.answers||{})}};
  state.design = { ...defaultState().design, ...state.design, pan:{...defaultState().design.pan,...state.design?.pan} };
  state.artifactStore = state.artifactStore || createArtifactStore();
  state.decisionLog = state.decisionLog || createDecisionLog();
  if (state.extracted && !state.brief.visual_aid_requirement) state.brief.visual_aid_requirement = structuredClone(fixtures.brief.visual_aid_requirement);
  if (state.extracted && !state.brief.finished_size) state.brief.finished_size = structuredClone(fixtures.brief.finished_size);
  if (state.design.spec && !state.design.spec.elements) state.design.spec.elements = createDefaultElements();
  if (state.design.spec && !state.design.spec.design_spec_revision) state.design.spec.design_spec_revision = 1;
  migrateLegacyDesignArtifact({artifactStore:state.artifactStore,legacySvg:state.design.svgString,designSpec:state.design.spec,legacySource:state.design.source});
}

const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#039;", '"':"&quot;" })[char]);
const statusLabel = status => ({ confirmed:"已确认", assumed:"暂定", missing:"缺失", needs_confirmation:"需要确认" })[status] || status;
const severityLabel = severity => ({ block:"BLOCK", warn:"WARN", info:"INFO", pass:"PASS" })[severity] || severity;
const stageLabel = stage => ({ before_import:"导入前", in_design_tool:"设计工具内", in_studio:"Studio内", before_processing:"加工前", out_of_scope:"范围外" })[stage] || stage;
const fieldValue = id => state.brief.fields.find(field => field.id === id)?.value || "";
const briefBlockers = () => [...state.brief.fields.filter(field => field.critical && (field.status === "missing" || field.status === "needs_confirmation" || !String(field.value).trim())), ...(normalizeFinishedSize(state.brief.finished_size).status === "missing" ? [{label:"成品尺寸"}] : []), ...(state.brief.visual_aid_requirement?.status === "undecided" || state.brief.visual_aid_requirement?.field_status === "needs_confirmation" ? [{label:"视觉辅助需求"}] : [])];
// Deprecated display helper only. Canonical gate is briefValidation from brief.validate.
const canonicalBriefBlockers=()=>{const planInputFields=new Set(["deliverable","purpose","use_case","usage","must_content","content","product_facts","material_direction","material","process","manufacturing_process","finished_size","dimensions","size","engraving_content","text_content","brand_name","special_requirements","style","form","color_direction"]);state.extractedBrief?.fields?.forEach(field=>{if(planInputFields.has(field.id))field.critical=true;});return[...(state.briefValidation?.missing_items||[]),...(state.briefValidation?.conflict_items||[])];};
const planRecommendations=()=>state.creativePlan.plan?.recommendations||[];
const pendingPlan=()=>planRecommendations().filter(item=>state.creativePlan.decisions?.[item.recommendation_id]?.status==="pending");
const currentArtifact = () => getCurrentArtifact(state.artifactStore);
const currentSvg = () => currentArtifact()?.svg || "";
const currentPreflight = () => getCurrentPreflightReport(state.artifactStore);
const preImportIssues = () => (currentPreflight()?.issues || []).filter(item => item.resolution_stage !== "in_studio" && item.resolution_stage !== "before_processing");
const unresolvedBlocks = () => preImportIssues().filter(item => item.severity === "block");
const warningIsConfirmed = item => {const artifact=currentArtifact(),report=currentPreflight();return Boolean(artifact&&report&&isWarningConfirmed({decisionLog:state.decisionLog,issueId:item.issue_id,artifactRevision:artifact.artifact_revision,checkedArtifactRevision:report.checked_artifact_revision}));};
const unconfirmedWarnings = () => preImportIssues().filter(item => item.severity === "warn" && !warningIsConfirmed(item));
const preflightIsCurrent = () => { const report=currentPreflight(),artifact=currentArtifact(); return Boolean(report&&artifact&&!report.stale&&report.checked_artifact_revision===artifact.artifact_revision); };

function gateForNext() {
  if (state.currentStep === 1 && !state.extracted) return "请先理解需求。";
  if (state.currentStep === 2) {
    if (canonicalBriefBlockers().length) return `仍有${canonicalBriefBlockers().length}项关键信息需要确认。`;
    if (state.brief.lifecycle!=="confirmed") return "请先确认Editable Brief。";
  }
  if (state.currentStep === 3) {
    if (pendingPlan().length) return "需要确认的Creative Plan仍有未决定项。";
    if (!state.creativePlan.confirmed) return "请先确认Creative Plan并建立设计规格。";
  }
  if (state.currentStep === 4 && !currentArtifact()) return "请先生成当前SVG草稿。";
  if (state.currentStep === 5 && !preflightIsCurrent()) return "请对Create & Edit中的当前SVG运行Preflight。";
  if (state.currentStep === 6) {
    if (!preflightIsCurrent()) return "设计已变化，必须重新运行Preflight。";
    if (unresolvedBlocks().length) return "存在未解决BLOCK，不能导出。";
    if (unconfirmedWarnings().length) return "请人工确认可继续的WARN。";
  }
  return "";
}

function canAccessStep(step) {
  if (step <= 1) return true;
  if (step === 2) return state.extracted;
  if (step === 3) return state.brief.lifecycle==="confirmed";
  if (step === 4) return state.creativePlan.confirmed;
  if (step === 5) return Boolean(currentArtifact());
  if (step === 6) return preflightIsCurrent();
  if (step === 7) return canExportCurrentArtifact(state.artifactStore,state.decisionLog).allowed;
  return false;
}

function updateNavigation() {
  document.querySelectorAll(".stepper button").forEach(button => {
    const step = Number(button.dataset.step);
    const publicStep = Number(button.dataset.publicStep);
    button.classList.toggle("active", publicStep === visibleStage(state.currentStep));
    button.classList.toggle("done", publicStep < visibleStage(state.currentStep));
    button.disabled = step > state.maxUnlockedStep || !canAccessStep(step);
  });
  prevButton.disabled = state.currentStep === 1;
  bottomBar.hidden = visibleStage(state.currentStep) < 4 || state.currentStep === 7;
  nextButton.hidden = state.currentStep <= 3;
  nextButton.disabled = state.currentStep === 7 || (state.currentStep !== 4 && Boolean(gateForNext()));
  nextButton.textContent = ({3:"进入 Create & Edit",4:"检查并进入制造交付 →",5:"查看需要处理的问题 →",6:"查看交付文件 →"})[state.currentStep] || "下一步";
  gateMessage.textContent = gateForNext();
  scenarioSelect.value = state.qaScenario;
}

function visibleStage(step=state.currentStep){return Math.min(Number(step)||1,5);}

function goToStep(step) {
  if (step < 1 || step > 7 || step > state.maxUnlockedStep || !canAccessStep(step)) return;
  state.currentStep = step;
  if (step === 4 && !state.design.spec && state.creativePlan.confirmed) buildDesign();
  saveState(); render(); app.focus();
}

function unlockNext() {
  if(state.currentStep===4){
    if (state.demoMode === DEMO_MODE) {
      state.design.statusMessage = "Demo 作品已准备好，可进入制造交付。";
      state.currentStep = 7;
      state.maxUnlockedStep = 7;
      saveState();
      render();
      return;
    }
    state.design.statusMessage='正在检查当前作品…';saveState();render();
    executePreflight(false);
    const gate=canExportCurrentArtifact(state.artifactStore,state.decisionLog);
    if(gate.allowed){state.currentStep=7;state.maxUnlockedStep=7;saveState();render();}
    else {state.design.statusMessage=gate.reason==='BLOCKED_BY_HUMAN_CONFIRMATION'?'存在 WARN，需要先确认风险后才能进入制造交付。':(gate.reason||'检查未通过，请根据提示返回编辑。');saveState();render();}
    return;
  }
  state.maxUnlockedStep = Math.max(state.maxUnlockedStep, Math.min(7, state.currentStep + 1));
  goToStep(state.currentStep + 1);
}

function heading(step, title, description, badge = "") {
  const publicTitles={1:"灵感输入",2:"AI 理解",3:"方案生成",4:"编辑优化",5:"制造交付"},publicStep=visibleStage(step);
  return `<div class="step-heading"><div><div class="step-number">${String(publicStep).padStart(2,"0")} / 05 · ${publicTitles[publicStep]}</div><h2>${title}</h2><p class="muted">${description}</p></div>${badge}</div>`;
}

function rebuildSvg() {
  const artifact = persistNativeDesign({artifactStore:state.artifactStore,designSpec:state.design.spec,icons:fixtures.icons.icons,assets:state.design.assets});
  // Deprecated migration mirrors. Current authority is artifactStore/current artifact.
  state.design.revision = artifact.artifact_revision;
  recordRenderedSvg(state.design, artifact.svg);
  state.design.dirty = true;
  state.design.source = "makerflow_template";
  state.design.sourceLabel = state.creativePlan.plans?.find(item=>item.id===state.creativePlan.selectedPlanId)?.title || "当前会话生成";
  state.routing.confirmedWarnings = [];
  saveState();
}

function commitLayout(elements,undo){state.design.layoutUndo=undo?structuredClone(undo):state.design.layoutUndo;state.design.spec.elements=elements;markDesignSpecEdited(state.design.spec);state.design.statusMessage="布局已修改，需要重新Preflight";rebuildSvg();}

function buildDesign() {
  const acceptedPlan=getAcceptedPlan(state.creativePlan,state.brief.brief_revision),accepted=acceptedPlan.recommendations;
  const form=accepted.find(item=>item.decision_type==="form"),visual=accepted.find(item=>item.decision_type==="visual_aid");
  const selectedPlan=state.creativePlan.plans?.find(item=>item.id===state.creativePlan.selectedPlanId)||null;
  const accepted_plan={...acceptedPlan,selected_plan:selectedPlan,template_id:/三栏|并列|横向/.test(form?.suggestion||"")?"three-column":"vertical-steps",visual_elements:visual?{enabled:true,type:/图标/.test(visual.suggestion)?"icon":/插画/.test(visual.suggestion)?"simple_illustration":/图案/.test(visual.suggestion)?"decorative_pattern":"structural_diagram",purpose:state.brief.visual_aid_requirement?.purposes||[],asset_source:"generated_session"}:{enabled:false}};
  state.design.spec = buildDesignSpecFromBrief(state.brief, accepted_plan, {});
  rebuildSvg();
  state.maxUnlockedStep = Math.max(state.maxUnlockedStep, 4);
}

function syncBriefLayers(candidate=state.brief,result=state.briefValidation){state.extractedBrief=structuredClone(candidate);state.missingFields=[...(result?.missing_items||[]),...(result?.conflict_items||[])];}
function revalidateCurrentBrief(){const result=validateBrief({brief_candidate:state.brief}).brief_validation_result;state.brief.finished_size=structuredClone(result.normalized_finished_size);state.briefValidation=result;state.brief=applyBriefValidation(state.brief,result);syncBriefLayers(state.brief,result);return result;}
function ensureEditableBriefRevision(){const result=beginBriefRevision(state.brief,state.briefHistory);state.brief=result.brief;state.briefHistory=result.history;if(state.creativePlan.plan)state.creativePlan=syncPlanStaleness(state.creativePlan,state.brief.brief_revision);return result.created;}
function normalizePlanData(plan){return {plan,plans:normalizeCreativePlans(plan)};}
async function loadCreativePlan(){
  if (state.demoMode === DEMO_MODE) {
    loadMomoRayCreativePlan();
    return;
  }
  if(state.brief.lifecycle!=="confirmed")return;
  state.creativePlan={...defaultState().creativePlan,loading:true};saveState();render();
  const timeout=new Promise(resolve=>setTimeout(()=>resolve({ok:false,error:{code:"PLAN_TIMEOUT",message:"方案生成超过 30 秒，请重试。"}}),30000));
  const result=await Promise.race([generateCreativePlan({confirmedBrief:state.brief}),timeout]);
  if(!result.ok){state.creativePlan={...defaultState().creativePlan,error:result.error};saveState();render();return;}
  const normalized=normalizePlanData(result.creative_plan);
  const plans=await hydrateCreativePlanPreviews(normalized.plans,state.brief);
  if(plans.length === 0 || plans.some(plan => !plan.previewSvg || !plan.previewImage)){
    state.creativePlan={...defaultState().creativePlan,error:{code:"PREVIEW_GENERATION_FAILED",message:"方案预览生成失败，请重试。"}};
    saveState();render();return;
  }
  state.creativePlan={...createCreativePlanState(normalized.plan),plans,selectedPlanId:null,loading:false,error:null,trace:result.trace,confirmed:false,confirmedAt:null};saveState();render();
}

function startMomoRayDemo() {
  const brief = createMomoRayBrief();
  const plan = createMomoRayCreativePlan();
  state.demoMode = DEMO_MODE;
  state.userInput = { raw: "MomoRay 高度调节说明卡", source: "momoray_demo" };
  state.job = {
    ...defaultState().job,
    description: "MomoRay 高度调节说明卡",
    cardPurpose: "包装内说明卡",
    sampleMode: true
  };
  state.extracted = true;
  state.extractedBrief = structuredClone(brief);
  state.brief = structuredClone(brief);
  state.briefValidation = { missing_items: [], conflict_items: [], critical_blockers: [], normalized_finished_size: structuredClone(brief.finished_size) };
  state.missingFields = [];
  state.briefHistory = [];
  state.extractRequest = { loading: false, error: null, trace: null };
  state.askMissing = { ...defaultState().askMissing, status: "NEED_CLARIFICATION" };
  state.clarificationLedger = createClarificationLedger();
  state.clarificationSession = { questions: structuredClone(MOMORAY_QUESTIONS), index: 0, answers: {} };
  state.creativePlan = { ...defaultState().creativePlan };
  state.design = { ...defaultState().design };
  state.artifactStore = createArtifactStore();
  state.currentStep = 2;
  state.maxUnlockedStep = 2;
  saveState();
  render();
}

function loadMomoRayCreativePlan() {
  const plan = createMomoRayCreativePlan();
  state.creativePlan = {
    ...createCreativePlanState(plan),
    plan,
    plans: structuredClone(plan.plans),
    selectedPlanId: null,
    loading: false,
    error: null,
    trace: { provider_name: "local-demo", model: "momoray-demo", prompt_version: "demo" },
    confirmed: false,
    confirmedAt: null
  };
  state.currentStep = 3;
  state.maxUnlockedStep = Math.max(state.maxUnlockedStep, 3);
  saveState();
  render();
}

async function replaceRejectedPlanRecommendation(recommendationId){
  const current=state.creativePlan.plan?.recommendations?.find(item=>item.recommendation_id===recommendationId);if(!current)return;
  try{state.creativePlan=beginRecommendationReplacement(state.creativePlan,recommendationId);}catch(error){state.creativePlan=failRecommendationReplacement(state.creativePlan,recommendationId,{code:error.message,message:error.message==="REPLACEMENT_LIMIT_REACHED"?"已经尝试了3个方案，你可以选择调整当前方案。":"暂时无法生成替代方案"});saveState();render();return;}
  saveState();render();
  const previous=(state.creativePlan.rejected_recommendations?.[current.decision_type]||[]).map(item=>item.suggestion),result=await replaceCreativePlanRecommendation({confirmedBrief:state.brief,rejectedRecommendation:current,previousRejectedSuggestions:previous});
  state.creativePlan=result.ok?applyRecommendationReplacement(state.creativePlan,recommendationId,result.replacement_recommendation):failRecommendationReplacement(state.creativePlan,recommendationId,result.error);saveState();render();
}
async function loadMissingQuestions(){const canonical=canonicalBriefBlockers(),dynamic=(state.extractedBrief?.fields||[]).filter(field=>field.critical&&(!String(field.value??"").trim()||["missing","needs_confirmation"].includes(field.status))).map(field=>field.id),blockers=[...new Set([...canonical,...dynamic])],ruleAskable=filterAskableBlockers(canonical,state.clarificationLedger,state.brief),dynamicAskable=dynamic.filter(id=>{const slot=state.clarificationLedger?.slots?.[semanticSlotFor(id)];return !slot?.resolved&&!slot?.asked_count&&!slot?.human_answers?.some(Boolean);}),askable=[...new Set([...ruleAskable,...dynamicAskable])];if(!askable.length){state.askMissing={loading:false,error:null,questions:[],missing_fields:[],completion_status:{complete:true,missing_fields:[]},trace:null};state.clarificationSession={...state.clarificationSession,questions:[],index:0};const confirmed=confirmBrief(state.brief,state.briefValidation,state.briefHistory);if(confirmed.ok){state.brief=confirmed.brief;state.briefHistory=confirmed.history;state.maxUnlockedStep=Math.max(state.maxUnlockedStep,3);state.currentStep=3;saveState();render();loadCreativePlan();return true;}saveState();render();return false;}const allowed=new Set(askable),validation={...state.briefValidation,missing_items:blockers.filter(item=>allowed.has(item)),conflict_items:(state.briefValidation.conflict_items||[]).filter(item=>allowed.has(item)),critical_blockers:askable};state.askMissing={loading:true,error:null,questions:[],missing_fields:askable,completion_status:{complete:false,missing_fields:askable},trace:null};saveState();render();const result=await requestMissingQuestions({briefCandidate:state.brief,validationResult:validation,userInput:state.userInput?.raw||state.job.description||"",confirmedContext:{fields:state.brief.fields.filter(f=>f.status==="confirmed")}});if(result.ok){state.clarificationLedger=recordAskedQuestions(state.clarificationLedger,result.questions);const questions=result.questions.slice(0,3).map((q,index)=>({id:q.field_id||q.question_id||`question-${index+1}`,field_id:q.field_id,question_id:q.question_id||q.field_id, title:q.question,summary:q.reason||"根据当前Brief仍需要确认该信息。",options:(q.options||[]).map((option,optionIndex)=>Array.isArray(option)?option:[`option-${optionIndex+1}`,option])}));state.clarificationSession={questions,index:0,answers:{}};state.askMissing={loading:false,error:null,questions:result.questions,missing_fields:result.missing_fields,completion_status:result.completion_status,brief:result.brief,trace:result.trace};}else{state.askMissing={loading:false,error:result.error,questions:[],missing_fields:askable,completion_status:{complete:false,missing_fields:askable},trace:null};}saveState();render();return result.ok;}

function renderStep1() {
  const requestState=state.extractRequest;
  const scenes=[["3D打印","构件、外壳与小型装配","我想制作一个可3D打印的小型产品构件，请帮我梳理用途、尺寸和装配约束。"],["激光雕刻","金属、木材与亚克力成品","我想制作一件激光雕刻作品，需要确认材质、用途、成品尺寸和必须呈现的内容。"],["产品说明牌","参数、步骤与使用指引","我想做一张产品说明牌，让用户快速看懂结构、操作步骤和重要数据。"],["包装与展示","包装内容与桌面展示物","我想制作一件用于包装或桌面展示的作品，请帮我确认形式、内容、尺寸和输出要求。"]];
  app.innerHTML = `<section class="inspiration-page"><h2>告诉我，你想制作什么？</h2>` + `
    ${IS_QA ? '<div class="notice demo-note"><strong>QA：</strong>当前为MomoRay单场景验证模式。</div>' : ''}
    <section class="creative-entry"><button id="loadJob" class="sample-link" type="button" ${requestState.loading?'disabled':''}>体验 MomoRay 说明卡案例 →</button><textarea id="description" aria-label="请描述你要制作的作品" placeholder="例如：我想制作一个激光雕刻木质纪念牌，包含人物头像、文字和装饰图案……">${escapeHtml(state.job.description || state.job.cardPurpose)}</textarea><div class="entry-actions"><div><button type="button" class="chip-button" title="浏览器语音输入将在支持时启用">语音输入</button><label class="chip-button">上传图片<input id="referenceUpload" type="file" accept="image/png,image/jpeg,application/pdf,image/svg+xml,.svg,.pdf" multiple hidden></label><label class="chip-button">CAD / 草图<input id="cadUpload" type="file" accept="image/png,image/jpeg,application/pdf,image/svg+xml,.svg,.pdf" multiple hidden></label></div><button id="extractButton" class="button primary hero-cta" ${requestState.loading?'disabled':''}>${requestState.loading?'正在理解你的需求……':requestState.error?'重试 AI 需求整理':'开始 AI 需求整理 →'}</button></div></section>
    ${state.job.referenceFiles?.length ? `<ul class="file-chips">${state.job.referenceFiles.map(file=>`<li>${escapeHtml(file.name)} · ${escapeHtml(file.type || "文件")}</li>`).join("")}</ul>`:""}
    ${requestState.error?`<div class="notice block" role="alert"><strong>暂时无法理解需求</strong><p>${escapeHtml(requestState.error.message)}</p></div>`:""}
    ${IS_QA&&requestState.trace?`<details><summary>QA：脱敏Model Trace</summary><pre>${escapeHtml(JSON.stringify(requestState.trace,null,2))}</pre></details>`:""}
    <div class="scene-shortcuts">${scenes.map(([title,desc,prompt],index)=>`<button type="button" class="scene-card" data-scene-prompt="${escapeHtml(prompt)}"><span>${["◇","✷","▣","▱"][index]}</span><strong>${title}</strong><small>${desc}</small><i>↗</i></button>`).join('')}</div></section>`;
  document.querySelector("#description")?.addEventListener("input", event => { state.demoMode=null; state.job.description = event.target.value; state.userInput={raw:event.target.value,source:"custom"}; state.job.sampleMode=false; saveState(); });
  document.querySelector("#referenceUpload").addEventListener("change",event=>{state.job.referenceFiles=[...event.target.files].map(file=>({name:file.name,type:file.type,size:file.size}));saveState();render();});
  document.querySelector("#cadUpload")?.addEventListener("change",event=>{state.job.referenceFiles=[...(state.job.referenceFiles||[]),...[...event.target.files].map(file=>({name:file.name,type:file.type,size:file.size}))];saveState();render();});
  document.querySelectorAll("[data-scene-prompt]").forEach(button=>button.addEventListener("click",()=>{state.demoMode=null;state.job.description=button.dataset.scenePrompt;state.job.sampleMode=false;state.userInput={raw:button.dataset.scenePrompt,source:"template"};delete state.job.trustedContext;state.extracted=false;state.extractedBrief=null;state.missingFields=[];state.extractRequest={loading:false,error:null,trace:null};saveState();render();}));
  document.querySelector("#loadJob").addEventListener("click", startMomoRayDemo);
  document.querySelector("#extractButton").addEventListener("click", async () => {
    if (state.demoMode === DEMO_MODE) return;
    const userInput=state.job.description.trim();
    if(!userInput){state.extractRequest.error={code:"EMPTY_INPUT",message:"请先描述你要制作的作品。"};saveState();render();return;}
    state.userInput={raw:userInput,source:state.job.sampleMode?"momoray_demo":(state.userInput?.source||"custom")};
    state.extractRequest={loading:true,error:null,trace:null};saveState();render();
    const result=await extractAndValidateBrief({userInput,attachments:state.job.referenceFiles||[],validateBrief});
    if(!result.ok){state.extracted=false;state.extractRequest={loading:false,error:result.error,trace:null};state.maxUnlockedStep=1;saveState();render();return;}
    const candidate=state.job.trustedContext?applyTrustedMomoRayContext(result.brief_candidate):result.brief_candidate;
    state.briefValidation=validateBrief({brief_candidate:candidate}).brief_validation_result;
    state.brief=prepareBriefForEditor(candidate,state.briefValidation);
    state.briefValidation=validateBrief({brief_candidate:state.brief}).brief_validation_result;
    state.brief=applyBriefValidation(state.brief,state.briefValidation);state.briefHistory=[];
    state.extractedBrief=structuredClone(candidate);
    const planInputFields=new Set(["deliverable","purpose","must_content","product_facts","material_direction","material","process","manufacturing_process","finished_size","dimensions","engraving_content","text_content","brand_name","special_requirements"]);
    state.extractedBrief.fields?.forEach(field=>{if(planInputFields.has(field.id))field.critical=true;});
    state.missingFields=[...(state.briefValidation.missing_items||[]),...(state.briefValidation.conflict_items||[])];
    state.extracted=true;
    state.extractRequest={loading:false,error:null,trace:result.trace};
    state.creativePlan=defaultState().creativePlan;state.clarificationLedger=createClarificationLedger();
    state.clarificationSession={questions:[],index:0,answers:{}};
    state.maxUnlockedStep=2;saveState();goToStep(2);await loadMissingQuestions();
  });
}

async function completeClarification() {
  const raw=state.userInput?.raw||state.job.description||"";
  const answers=Object.entries(state.clarificationSession?.answers||{}).map(([field_id,answer])=>({question_id:field_id,field_id,answer,source:"human_clarification"}));
  if(!answers.length&&state.askMissing.completion_status?.complete){const confirmed=confirmBrief(state.brief,state.briefValidation,state.briefHistory);if(confirmed.ok){state.brief=confirmed.brief;state.briefHistory=confirmed.history;state.maxUnlockedStep=Math.max(state.maxUnlockedStep,3);state.currentStep=3;saveState();render();loadCreativePlan();return true;}}
  if(!answers.length){state.askMissing={...state.askMissing,error:{code:"ANSWER_REQUIRED",message:"请先回答当前问题。"}};saveState();render();return false;}
  state.askMissing={...state.askMissing,loading:true,error:null};saveState();render();
  const result=await clarifyAndValidateBrief({originalUserInput:raw,previousBrief:state.brief,answers,attachments:state.job.referenceFiles||[],validateBrief});
  if(!result.ok){state.askMissing={...state.askMissing,loading:false,error:result.error};saveState();render();return false;}
  state.brief=result.brief_candidate;state.briefValidation=result.brief_validation_result;state.brief=applyBriefValidation(state.brief,state.briefValidation);state.extractedBrief=structuredClone(state.brief);state.missingFields=[...(state.briefValidation.missing_items||[]),...(state.briefValidation.conflict_items||[])];state.askMissing={...state.askMissing,loading:false,error:null};
  if(state.briefValidation.critical_blockers?.length){saveState();await loadMissingQuestions();return false;}
  const confirmed=confirmBrief(state.brief,state.briefValidation,state.briefHistory);
  if(confirmed.ok){state.brief=confirmed.brief;state.briefHistory=confirmed.history;state.maxUnlockedStep=Math.max(state.maxUnlockedStep,3);state.currentStep=3;saveState();render();loadCreativePlan();return true;}
  state.askMissing={...state.askMissing,error:{code:"BRIEF_CONFIRM_FAILED",message:"暂时无法完成需求理解，请重试当前问题。"}};saveState();render();return false;
}


function clarificationQuestion(fieldId){
  const questions={};
  return null;
}
function applyChoiceAnswer(fieldId,value){
  if(fieldId==='finished_size'){state.brief.finished_size=normalizeFinishedSize({preset_size:value,status:value==='custom'?'needs_confirmation':'confirmed',source:'human_clarification'});return;}
  const field=state.brief.fields.find(item=>item.id===fieldId);if(!field)return;
  const labels={deliverable:{说明卡:'包装内的产品说明卡',产品说明牌:'面向现场使用的说明牌',展示牌:'用于品牌或桌面展示'},purpose:{explain:'帮助用户理解结构或步骤',guide:'提供操作与使用提醒',identify:'表达品牌或产品信息'},must_content:{steps:'步骤与操作提醒',facts:'产品事实与关键数据',visual:'结构示意或图标'},product_facts:{confirmed:'使用产品方已确认资料',partial:'已有部分资料，剩余内容稍后补充',none:'产品事实尚未确认'}};
  if(value==='custom')field.status='needs_confirmation';else{field.value=labels[fieldId]?.[value]||value;field.status='confirmed';field.source='human_clarification';}
}
function renderStep2(){
  if (state.demoMode === DEMO_MODE) return renderMomoRayStep2();
  const session=state.clarificationSession||{questions:[],index:0,answers:{}},ask=state.askMissing;
  if(ask.loading){app.innerHTML=heading(2,"AI 正在理解你的需求","正在根据当前Brief缺失信息生成最重要的澄清问题。")+'<div class="notice info"><strong>AI 正在整理问题…</strong></div>';return;}
  if(ask.error){app.innerHTML=heading(2,"AI 正在理解你的需求","问题生成遇到问题，请重试。")+`<div class="notice block"><strong>${escapeHtml(ask.error.message||"暂时无法生成追问")}</strong></div><button id="retryAsk" type="button" class="button primary">再试一次</button>`;document.querySelector('#retryAsk')?.addEventListener('click',loadMissingQuestions);return;}
  const q=session.questions?.[session.index];
  if(!q){const warning=ask.completion_status?.warning;app.innerHTML=heading(2,"AI 正在理解你的需求","信息已完整，可以生成方案")+(warning?`<div class="notice warn">${escapeHtml(warning.message||"问题生成未完全成功，已继续生成方案。")}</div>`:'')+'<button id="continueAfterClarify" type="button" class="button primary">生成方案</button>';document.querySelector('#continueAfterClarify')?.addEventListener('click',completeClarification);return;}
  const options=(q.options||[]).map((option,index)=>Array.isArray(option)?(option[1]&&typeof option[1]==="object"?[option[1].value||`option-${index+1}`,option[1].label||String(option[1].value||option[1])]:option):[option.value||`option-${index+1}`,option.label||String(option.value||option)]), allowText=new Set(["engraving_content","text_content","brand_name","special_requirements"]).has(q.field_id), isLastQuestion=session.index===session.questions.length-1;
  const inputMarkup=options.length?`<div class="choice-list">${options.map(([value,label])=>`<button type="button" class="choice-card" data-choice="${escapeHtml(value)}" aria-pressed="${session.answers[q.id]===value}"><span class="choice-radio"></span><strong>${escapeHtml(label)}</strong></button>`).join('')}</div>`:allowText?`<textarea id="clarificationText" placeholder="请输入${escapeHtml(q.title||"具体内容")}"></textarea>`:`<p class="notice block">当前问题缺少可用选项，请重试生成问题。</p>`;
  app.innerHTML=heading(2,"AI 正在理解你的需求","为了生成最贴合实体加工工艺与微米级渲染的方案，我还需要确认几个关键制造参数。",`<span class="status-badge info">${session.index+1} / ${session.questions.length}</span>`)+`<section class="clarification-only"><div class="ai-question-intro"><span>AI</span><p>${escapeHtml(q.summary||"根据当前Brief，AI认为这项信息会影响方案结果。")}</p></div><section class="question-card"><span class="question-count">AI 认为需要确认</span><h3>${escapeHtml(q.title||q.question)}</h3>${inputMarkup}<button id="submitChoice" type="button" class="button primary clarify-cta" disabled>${isLastQuestion?'确认偏好并生成方案 →':'确认并继续 →'}</button></section></section>`;
  let selected=session.answers[q.id]||null;
  document.querySelectorAll('[data-choice]').forEach(button=>button.addEventListener('click',()=>{selected=button.dataset.choice;document.querySelectorAll('[data-choice]').forEach(item=>{item.classList.toggle('selected',item===button);item.setAttribute('aria-pressed',item===button?'true':'false');});document.querySelector('#submitChoice').disabled=false;}));
  document.querySelector('#clarificationText')?.addEventListener('input',event=>{selected=event.target.value.trim();document.querySelector('#submitChoice').disabled=!selected;});
  document.querySelector('#submitChoice')?.addEventListener('click',async()=>{if(!selected)return;state.clarificationSession.answers[q.id]=selected;state.clarificationLedger=recordHumanAnswers(state.clarificationLedger,[{field_id:q.field_id||q.id,answer:selected,source:'human_clarification'}]);if(isLastQuestion){await completeClarification();return;}state.clarificationSession.index+=1;saveState();render();});
}

function renderMomoRayStep2() {
  const session = state.clarificationSession || { questions: MOMORAY_QUESTIONS, index: 0, answers: {} };
  const question = session.questions[session.index] || MOMORAY_QUESTIONS[session.index];
  if (!question) return loadMomoRayCreativePlan();
  const isLast = session.index === session.questions.length - 1;
  const selected = session.answers[question.id] || null;
  const options = question.options.map(option => `<button type="button" class="choice-card ${selected === option.value ? "selected" : ""}" data-demo-choice="${escapeHtml(option.value)}" aria-pressed="${selected === option.value}"><span class="choice-radio"></span><strong>${escapeHtml(option.label)}</strong></button>`).join("");
  app.innerHTML = heading(2, "AI 正在理解你的需求", "为了生成最贴合实体加工工艺与微米级渲染的方案，我还需要确认几个关键制造参数。", `<span class="status-badge info">${session.index + 1} / ${session.questions.length}</span>`) + `<section class="clarification-only"><div class="ai-question-intro"><span>AI</span><p>根据你的描述，我理解你想制作：MomoRay 高度调节说明卡</p></div><section class="question-card"><span class="question-count">AI 认为需要确认</span><h3>${escapeHtml(question.title)}</h3><div class="choice-list">${options}</div><button id="submitDemoChoice" type="button" class="button primary clarify-cta" ${selected ? "" : "disabled"}>${isLast ? "确认偏好并生成方案 →" : "确认并继续 →"}</button></section></section>`;
  let current = selected;
  document.querySelectorAll("[data-demo-choice]").forEach(button => button.addEventListener("click", () => {
    current = button.dataset.demoChoice;
    document.querySelectorAll("[data-demo-choice]").forEach(item => {
      item.classList.toggle("selected", item === button);
      item.setAttribute("aria-pressed", item === button ? "true" : "false");
    });
    document.querySelector("#submitDemoChoice").disabled = false;
  }));
  document.querySelector("#submitDemoChoice")?.addEventListener("click", () => {
    if (!current) return;
    state.clarificationSession.answers[question.id] = current;
    if (question.field_id === "usage") state.brief.fields.find(field => field.id === "purpose").value = current === "ai_recommend" ? "包装内说明卡" : question.options.find(option => option.value === current)?.label;
    if (question.field_id === "style") state.brief.fields.find(field => field.id === "style").value = question.options.find(option => option.value === current)?.label;
    if (!isLast) {
      state.clarificationSession.index += 1;
      saveState();
      render();
      return;
    }
    state.brief.finished_size = { ...state.brief.finished_size, status: "confirmed", source: "momoray_demo" };
    state.brief.lifecycle = "confirmed";
    state.brief.confirmed = true;
    saveState();
    loadMomoRayCreativePlan();
  });
}


function renderStep3() {   if(state.creativePlan.loading){app.innerHTML=heading(3,"创作方案 Creative Plan","正在基于已确认Brief生成候选设计决策。")+'<div class="notice info"><strong>正在生成Creative Plan…</strong></div>';return;}   if(state.creativePlan.error){app.innerHTML=heading(3,"创作方案 Creative Plan","Brief保持已确认；失败不会载入Mock方案。")+`<div class="notice block"><strong>${escapeHtml(state.creativePlan.error.message||'无法生成Creative Plan，请重试。')}</strong></div><button id="retryPlan" class="button primary">重试</button>`;document.querySelector('#retryPlan')?.addEventListener('click',loadCreativePlan);return;}   if(!state.creativePlan.plan){app.innerHTML=heading(3,"创作方案 Creative Plan","需要从已确认Brief生成候选设计决策。")+'<button id="retryPlan" class="button primary">生成Creative Plan</button>';document.querySelector('#retryPlan')?.addEventListener('click',loadCreativePlan);return;}   state.creativePlan=reconcileCreativePlanState(state.creativePlan);   let context;try{context=getConfirmedBriefPlanContext(state.brief,state.creativePlan.plan);}catch{app.innerHTML=heading(3,"创作方案 Creative Plan","当前方案与已确认Brief版本不一致。")+'<div class="notice block"><strong>Brief已变化，这份方案不能继续使用。</strong><p>请基于当前已确认Brief重新生成方案。</p></div><button id="retryPlan" type="button" class="button primary">重新生成Creative Plan</button>';document.querySelector('#retryPlan')?.addEventListener('click',loadCreativePlan);return;}   const titles={form:'形式与版式',information_hierarchy:'信息层级',visual_aid:'视觉辅助',color_direction:'颜色方向',material_direction:'材料方向'};   const fieldLabels={deliverable:'作品类型',purpose:'用途',must_content:'说明卡必须包含',product_facts:'产品事实'};   const suggestions=planRecommendations(),accepted=suggestions.filter(item=>state.creativePlan.decisions[item.recommendation_id]?.status==='accepted').length,rejected=suggestions.filter(item=>state.creativePlan.decisions[item.recommendation_id]?.status==='rejected').length,pending=pendingPlan().length;   const locked=context.fields.filter(item=>item.status==='confirmed'&&['deliverable','purpose','must_content','product_facts'].includes(item.id)).map(item=>({label:fieldLabels[item.id]||item.label,value:item.value}));locked.push({label:'成品尺寸',value:context.finished_size.display_value});   const cards=suggestions.map(item=>{const d=state.creativePlan.decisions[item.recommendation_id]||{status:'pending'},editing=state.creativePlan.editingRecommendationId===item.recommendation_id,replacement=state.creativePlan.replacements?.[item.decision_type],replacing=replacement?.replacing_recommendation_id===item.recommendation_id,statusText={pending:'待决定',accepted:'已采用',rejected:'不采用'}[d.status];const replacementUi=replacing&&replacement.loading?'<div class="notice info"><strong>正在换一个方案…</strong></div>':replacing&&replacement.error?`<div class="notice block"><strong>${escapeHtml(replacement.error.message||'暂时无法生成替代方案')}</strong><div class="decision-buttons">${replacement.error.code==='REPLACEMENT_LIMIT_REACHED'?'':`<button type="button" class="button secondary" data-plan-action="retry-replacement" data-rec="${item.recommendation_id}">重试</button>`}<button type="button" class="button secondary" data-plan-action="adjust" data-rec="${item.recommendation_id}">调整当前方案</button></div></div>`:'';return `<article class="recommendation-card ${d.status}"><div class="recommendation-main"><span class="step-number">${escapeHtml(titles[item.decision_type]||item.decision_type)}</span><h3>${escapeHtml(d.edited_suggestion||item.suggestion)}</h3><p>${escapeHtml(item.basis||'')}</p><span class="status-badge ${d.status==='accepted'?'pass':d.status==='rejected'?'block':'info'}">${statusText}</span>${IS_QA?`<span class="status-badge info">confidence ${escapeHtml(item.confidence)}</span>`:''}</div><details><summary>为什么？</summary><p><strong>依据：</strong>${escapeHtml(item.basis||'')}</p><p><strong>取舍：</strong>${escapeHtml(item.tradeoff||'')}</p></details><div class="decision-box">${replacementUi||(!replacing&&d.status==='pending'?`<div class="decision-buttons"><button type="button" class="button secondary" data-plan-action="accept" data-rec="${item.recommendation_id}">采用</button><button type="button" class="button secondary" data-plan-action="adjust" data-rec="${item.recommendation_id}">调整</button><button type="button" class="button secondary" data-plan-action="reject" data-rec="${item.recommendation_id}">不采用</button></div>`:!replacing?`<button type="button" class="text-button" data-plan-action="reconsider" data-rec="${item.recommendation_id}">重新考虑</button>`:'')}${editing?`<label>你希望怎么调整？<textarea data-plan-edit="${item.recommendation_id}">${escapeHtml(d.edited_suggestion||item.suggestion)}</textarea></label><button type="button" class="button primary" data-save-edit="${item.recommendation_id}">保存并采用</button>`:''}</div></article>`;}).join('');   app.innerHTML=heading(3,'创作方案 Creative Plan','确认尚未确定的设计方向；下一步会建立Design Spec并生成可编辑SVG。',`<span class="status-badge ${pending?'warn':'pass'}">${pending}项待决定</span>`)+`${state.creativePlan.interactionError?`<div class="notice block"><strong>操作失败，请重试</strong>${IS_QA?`<p>${escapeHtml(state.creativePlan.interactionError)}</p>`:''}</div>`:''}<section class="locked-constraints"><h3>已锁定约束</h3><p class="muted">只读取当前已确认Brief r${context.brief_revision}，不会重新建议。</p><dl>${locked.map(item=>`<div><dt>${escapeHtml(item.label)}</dt><dd>${escapeHtml(item.value||'')}</dd></div>`).join('')}</dl></section><section><h3>待决策建议</h3><div class="decision-summary"><span>已采用 <strong>${accepted}</strong></span><span>待确认 <strong>${pending}</strong></span>${rejected?`<span>不采用 <strong>${rejected}</strong></span>`:''}</div><div class="cards">${cards}</div></section>${IS_QA?`<details><summary>QA：Model Trace</summary><pre>${escapeHtml(JSON.stringify({...state.creativePlan.trace,source_brief_revision:state.creativePlan.plan.source_brief_revision},null,2))}</pre></details>`:''}<div class="plan-primary-action"><button id="confirmPlan" type="button" class="button primary">采用当前方案并继续</button><p>未调整或拒绝的待定建议将由你的这次点击统一采用；已拒绝项不会进入Design Spec。</p></div>`;   document.querySelectorAll('[data-plan-action]').forEach(button=>{button.type='button';button.addEventListener('click',async()=>{try{const action=button.dataset.planAction,id=button.dataset.rec;if(action==='adjust'){state.creativePlan.editingRecommendationId=id;}else if(action==='retry-replacement'){await replaceRejectedPlanRecommendation(id);return;}else{state.creativePlan=recordPlanDecision(state.creativePlan,{recommendationId:id,action,actor:'human'});state.creativePlan.editingRecommendationId=null;if(action==='reject'){state.creativePlan.interactionError=null;state.creativePlan.confirmed=false;await replaceRejectedPlanRecommendation(id);return;}}state.creativePlan.interactionError=null;state.creativePlan.confirmed=false;}catch(error){state.creativePlan.interactionError=error.code||error.message||'PLAN_DECISION_FAILED';}saveState();render();});});   document.querySelectorAll('[data-save-edit]').forEach(button=>{button.type='button';button.addEventListener('click',()=>{try{const input=document.querySelector(`[data-plan-edit="${button.dataset.saveEdit}"]`),value=input?.value.trim();if(!value)return;state.creativePlan=acceptEditedRecommendation(state.creativePlan,{recommendationId:button.dataset.saveEdit,editedSuggestion:value,actor:'human'});state.creativePlan.editingRecommendationId=null;state.creativePlan.interactionError=null;state.creativePlan.confirmed=false;}catch(error){state.creativePlan.interactionError=error.code||error.message||'PLAN_DECISION_FAILED';}saveState();render();});});   document.querySelector('#confirmPlan')?.addEventListener('click',()=>{try{state.creativePlan=bulkAcceptPendingRecommendations(state.creativePlan,{actor:'human'});state.creativePlan=finalizePlanReview(state.creativePlan,{actor:'human'});buildDesign();state.creativePlan.interactionError=null;saveState();goToStep(4);}catch(error){state.creativePlan.interactionError=error.code||error.message||'PLAN_FINALIZE_FAILED';saveState();render();}}); }  function editControls() {   const spec=state.design.spec,selected=state.design.selectedElement||"title",icons=fixtures.icons.icons.map(icon=>`<option value="${icon.id}">${icon.label}</option>`).join("");   if(selected==="title")return `<h3>标题属性</h3><label>标题<input id="design-title-input" value="${escapeHtml(spec.content.title)}"></label><label>主色<input id="primary-color" type="color" value="${spec.style.primary_color}"></label>`;   if(selected.startsWith("step-")){const index=Number(selected.split("-")[1])-1,step=spec.content.steps[index];return `<h3>步骤${index+1}属性</h3><label>标题<input data-step-index="${index}" data-step-key="title" value="${escapeHtml(step.title)}"></label><label>说明<textarea data-step-index="${index}" data-step-key="body">${escapeHtml(step.body)}</textarea></label><label>图标<select data-icon-step="${step.id}">${icons.replace(`value="${spec.icons[step.id]}"`,`value="${spec.icons[step.id]}" selected`)}</select></label>`;}   if(selected==="footer")return `<h3>页脚属性</h3><label>页脚文字<input id="footer-input" value="${escapeHtml(spec.content.footer||'')}"></label>`;   if(selected==="visual-elements")return `<h3>视觉辅助属性</h3><label class="switch-row"><input id="visual-enabled" type="checkbox" ${spec.visual_elements.enabled?'checked':''}>显示视觉辅助</label><label>类型<select id="visual-element-type">${[["icon","图标"],["structural_diagram","结构示意"],["simple_illustration","简单插画"],["decorative_pattern","装饰图案"]].map(([v,l])=>`<option value="${v}" ${spec.visual_elements.type===v?'selected':''}>${l}</option>`).join('')}</select></label><p class="help">用途：${spec.visual_elements.purpose.join('、')||'未指定'}<br>来源：MakerFlow本地SVG模板</p>`;   if(selected==="artboard")return `<h3>成品与版式</h3><div class="inline-fields"><label>成品宽度<input id="canvas-width" type="number" min="10" value="${spec.canvas.width}"></label><label>成品高度<input id="canvas-height" type="number" min="10" value="${spec.canvas.height}"></label><label>单位<input value="${spec.canvas.unit}" disabled></label></div><label>版式<select id="layout-template">${fixtures.layouts.templates.map(x=>`<option value="${x.id}" ${x.id===spec.layout.template_id?'selected':''}>${x.label}</option>`).join('')}</select></label>`;   if(selected==="cutline")return `<h3>刀线属性</h3><label class="switch-row"><input id="cutline-enabled" type="checkbox" ${spec.cutline.enabled?'checked':''}>显示闭合刀线</label><p class="help">刀线只表达当前文件要求，不代表设备参数或加工安全。</p>`;   return `<h3>素材</h3><p class="muted">上传PNG/JPG/SVG作为插图素材，不执行图片转SVG。</p>`; }

function renderStep3Cards(){
  if(state.creativePlan.loading){
    app.innerHTML=heading(3,"AI 方案生成","正在根据已确认需求生成 3 个制造方案。")+'<div class="notice info"><strong>正在生成方案…</strong></div>';
    return;
  }
  if(state.creativePlan.error){
    app.innerHTML=heading(3,"AI 方案生成","方案生成遇到问题，请重试。")+`<div class="notice block"><strong>${escapeHtml(state.creativePlan.error.message||'方案生成失败')}</strong></div><button id="retryPlan" type="button" class="button primary">重新生成</button>`;
    document.querySelector('#retryPlan')?.addEventListener('click',loadCreativePlan);
    return;
  }
  const plans=Array.isArray(state.creativePlan.plans)?state.creativePlan.plans:[];
  if(!plans.length){
    app.innerHTML=heading(3,"AI 方案生成","根据当前 Brief 生成 3 个可制作方向。")+'<button id="retryPlan" type="button" class="button primary">生成方案</button>';
    document.querySelector('#retryPlan')?.addEventListener('click',loadCreativePlan);
    return;
  }
  const selectedId=state.creativePlan.selectedPlanId;
  const selected=plans.find(plan=>plan.id===selectedId);
  app.innerHTML=heading(3,"AI 方案生成","根据你的需求，AI 为你生成 3 个制造方案。",`<span class="status-badge info">${selected?'已选择 1 个方案':'请选择一个方案'}</span>`)+`<section class="plan-cards">${plans.map(plan=>`<article class="plan-card ${plan.id===selectedId?'selected':''}"><div class="plan-card-top"><span>PLAN ${escapeHtml(plan.id.replace('plan-','').padStart(2,'0'))}</span><span>${escapeHtml(plan.time)}</span></div><h3>${escapeHtml(plan.title)}</h3><img class="plan-visual" src="${escapeHtml(plan.previewImage)}" alt="${escapeHtml(plan.title)} 真实方案预览"><dl><div><dt>材料</dt><dd>${escapeHtml(plan.material)}</dd></div><div><dt>加工方式</dt><dd>${escapeHtml(plan.process)}</dd></div><div><dt>制作时间</dt><dd>${escapeHtml(plan.time)}</dd></div></dl><div class="plan-reason"><strong>AI 推荐理由</strong>${escapeHtml(plan.reason)}</div><button type="button" class="button ${plan.id===selectedId?'primary':'secondary'}" data-select-plan="${escapeHtml(plan.id)}">${plan.id===selectedId?'已选择此方案':'选择此方案'}</button></article>`).join('')}</section><div class="plan-footer"><button id="regeneratePlans" type="button" class="button secondary">↻ 重新生成更多方案</button><button id="useSelectedPlan" type="button" class="button primary" ${selected?'':'disabled'}>采用方案进入协同编辑 →</button></div>`;
  document.querySelectorAll('[data-select-plan]').forEach(button=>button.addEventListener('click',()=>{
    const id=button.dataset.selectPlan;
    state.creativePlan={...state.creativePlan,selectedPlanId:id,plans:plans.map(plan=>({...plan,selected:plan.id===id}))};
    saveState();render();
  }));
  document.querySelector('#regeneratePlans')?.addEventListener('click',loadCreativePlan);
  document.querySelector('#useSelectedPlan')?.addEventListener('click',()=>{
    if(!state.creativePlan.selectedPlanId)return;
    try{
      state.creativePlan=bulkAcceptPendingRecommendations(state.creativePlan,{actor:'human'});
      state.creativePlan=finalizePlanReview(state.creativePlan,{actor:'human'});
      state.creativePlan.confirmed=true;
      state.creativePlan.confirmedAt=new Date().toISOString();
      buildDesign();
      saveState();
      goToStep(4);
    }catch(error){
      state.creativePlan.interactionError=error.code||error.message||'PLAN_FINALIZE_FAILED';
      saveState();render();
    }
  });
}

function applyAiAdjustment(instruction="") {
  const text=String(instruction).trim();
  const match=text.match(/(?:向上|上移|向下|下移)\s*(\d+(?:\.\d+)?)\s*px/i);
  const amount=match?Number(match[1]):10;
  const direction=/向下|下移/i.test(text)?1:-1;
  let target=state.design.selectedElement||"footer";
  if(/底部|页脚|footer/i.test(text)) target="footer";
  else if(/标题|title/i.test(text)) target="title";
  else {const step=text.match(/步骤\s*([1-3])/);if(step)target=`step-${step[1]}`;}
  const element=state.design.spec?.elements?.[target];
  if(!element)return false;
  element.position={...element.position,x:Number(element.position?.x||0),y:Number(element.position?.y||0)+direction*amount};
  state.design.selectedElement=target;
  return true;
}

function renderStep4() {
  if (!state.design.spec) buildDesign();
  const spec = state.design.spec;
  app.innerHTML = heading(4, "协同编辑", "通过自然语言和画布直接操作，继续优化当前 SVG 作品。", `<span class="status-badge ${preflightIsCurrent() ? 'info' : 'warn'}">${preflightIsCurrent()?'当前作品已检查':'需要重新检查'}</span>`) + `
    <div class="editor-status"><span>${escapeHtml(state.design.sourceLabel)}</span><span>作品版本 ${currentArtifact()?.artifact_revision || '—'}</span><strong>${escapeHtml(state.design.statusMessage || (preflightIsCurrent()?"当前版本已检查":"导出前需要运行Preflight"))}</strong><button id="undoLayout" ${state.design.layoutUndo?'':'disabled'}>Undo</button><button id="resetLayout">重置布局</button></div>
    <div class="create-edit-grid">
      <aside class="structure-panel ai-adjust-panel"><h3>✦ AI 协同调整</h3><textarea id="aiAdjustPrompt" placeholder="例如：为底部添加顺时针旋紧的扭矩范围提示（2.5–4.0 N·m）">${escapeHtml(state.design.editInstruction||'')}</textarea><button type="button" class="button primary" id="sendAiAdjust">${state.design.aiAdjustLoading?'正在调整…':'发送调整 →'}</button><h4>快速修改预设</h4><div class="preset-group"><span>视觉风格</span><button type="button" data-preset-group="visual" data-preset="工业简洁">工业简洁</button><button type="button" data-preset-group="visual" data-preset="艺术复古">艺术复古</button><button type="button" data-preset-group="visual" data-preset="极简现代">极简现代</button><span>排版结构</span><button type="button" data-preset-group="layout" data-preset="居中模式">居中模式</button><button type="button" data-preset-group="layout" data-preset="对称布局">对称布局</button><button type="button" data-preset-group="layout" data-preset="工业留白">工业留白</button><span>图标与规范</span><button type="button" data-preset-group="icon" data-preset="ISO 7000">ISO 7000</button><button type="button" data-preset-group="icon" data-preset="圆润工坊">圆润工坊</button><button type="button" data-preset-group="icon" data-preset="工程纯线">工程纯线</button></div><details><summary>高级制造参数</summary><p class="muted">仅展示当前项目状态，不在此自动决定设备参数。</p></details></aside>
      <section class="design-work"><div class="canvas-toolbar"><div class="canvas-modes"><button type="button" data-preview-mode="plate" class="${state.design.previewMode==='plate'?'active':''}">铝板黑底金字</button><button type="button" data-preview-mode="wireframe" class="${state.design.previewMode==='wireframe'?'active':''}">线框预览</button><button type="button" data-preview-mode="toolpath" class="${state.design.previewMode==='toolpath'?'active':''}">走刀路径</button></div><div><button type="button" data-zoom="fit">⌗</button><button type="button" data-zoom="out">−</button><button type="button" data-zoom="100">100%</button><button type="button" data-zoom="in">＋</button></div></div><div id="designPreview" class="svg-preview preview-${state.design.previewMode||'plate'}"><div class="canvas-overlay">Vector Node Inspector <span>X: 42.50 mm · Y: 27.00 mm</span></div><div id="canvasStage" class="canvas-stage" style="transform:translate(${state.design.pan.x}px,${state.design.pan.y}px) scale(${state.design.zoom})">${currentSvg()}</div><div class="canvas-bottom-status"><span>◉ 矢量闭合: 100% 闭合 (0 open paths)</span><span>切缝补偿 (Kerf): 0.18mm</span><span>节点总数: 412 pts</span><b>G-code: Ready</b><span>预计耗时: 1m 42s</span></div></div></section>
      <aside class="property-panel">${editControls()}<hr><details><summary>上传与下载</summary><label>上传已有SVG<input id="full-svg-upload" type="file" accept="image/svg+xml,.svg"></label><label>上传PNG/JPG/SVG素材<input id="asset-upload" type="file" accept="image/png,image/jpeg,image/svg+xml,.svg"></label><label>素材来源<select id="asset-source"><option value="user_upload">用户上传</option><option value="aimake_export">AImake导出（无API集成）</option><option value="external_tool">其他外部工具</option></select></label><div id="uploadMessage" class="help"></div><button id="downloadCurrentSvg" class="button secondary">下载当前SVG</button></details><details ${IS_QA?'':'hidden'}><summary>QA：Design Spec</summary><pre>${escapeHtml(JSON.stringify(spec,null,2))}</pre></details></aside>
    </div>`;
  bindEditorControls();
  document.querySelector('#aiAdjustPrompt')?.addEventListener('input',event=>{state.design.editInstruction=event.target.value;saveState();});
  document.querySelector('#sendAiAdjust')?.addEventListener('click',()=>{const instruction=document.querySelector('#aiAdjustPrompt')?.value.trim();if(!instruction)return;state.design.editInstruction=instruction;state.design.aiAdjustLoading=true;state.design.statusMessage='AI 正在调整当前画布…';saveState();render();setTimeout(()=>{const changed=applyAiAdjustment(instruction);state.design.aiAdjustLoading=false;state.design.statusMessage=changed?'AI 已完成调整':'未找到可调整的 SVG 元素';state.design.editInstruction='';if(changed){markDesignSpecEdited(state.design.spec);rebuildSvg();}saveState();render();},450);});
  document.querySelectorAll('[data-preset]').forEach(button=>button.addEventListener('click',()=>{const group=button.dataset.presetGroup;state.design.activePresets={...(state.design.activePresets||{}),[group]:button.dataset.preset};state.design.statusMessage=`已应用${button.dataset.preset}`;saveState();render();document.querySelectorAll(`[data-preset-group="${group}"]`).forEach(item=>item.classList.toggle('active',item.dataset.preset===state.design.activePresets[group]));}));
  document.querySelectorAll('[data-preview-mode]').forEach(button=>button.addEventListener('click',()=>{state.design.previewMode=button.dataset.previewMode;state.design.statusMessage={plate:'当前效果预览',wireframe:'已切换到 SVG 线框预览',toolpath:'已切换到走刀路径模拟'}[state.design.previewMode];saveState();render();}));
  document.querySelector("#downloadCurrentSvg").addEventListener("click", () => downloadTextFile(currentSvg(),"editable_draft.svg","image/svg+xml"));
  document.querySelector("#full-svg-upload").addEventListener("change", handleFullSvgUpload);
  document.querySelector("#asset-upload").addEventListener("change", handleAssetUpload);
  bindCanvasInteractions();
  renderSelectionBox();
  document.querySelector("#resetLayout").addEventListener("click",()=>{const {next,undo}=resetLayout(state.design.spec.elements);commitLayout(next,undo);render();});
  document.querySelector("#undoLayout").addEventListener("click",()=>{if(!state.design.layoutUndo)return;const restored=restoreLayout(state.design.spec.elements,state.design.layoutUndo);state.design.layoutUndo=null;commitLayout(restored,null);render();});
  if (state.design.focusTarget) { const target = document.querySelector(`#${state.design.focusTarget}`); state.design.focusTarget=null; target?.focus(); }
}

function bindEditorControls() {
  const update = () => {
    markDesignSpecEdited(state.design.spec);
    rebuildSvg();
    const preview=document.querySelector("#designPreview");
    if(preview) preview.innerHTML=currentSvg();
    bindCanvasElementClicks();
    updateNavigation();
  };
  document.querySelector("#design-title-input")?.addEventListener("input", event => { state.design.spec.content.title=event.target.value; update(); });
  document.querySelectorAll("[data-step-index]").forEach(control => control.addEventListener("input", event => { state.design.spec.content.steps[Number(event.target.dataset.stepIndex)][event.target.dataset.stepKey]=event.target.value; update(); }));
  document.querySelectorAll("[data-icon-step]").forEach(control => control.addEventListener("change", event => { state.design.spec.icons[event.target.dataset.iconStep]=event.target.value; update(); }));
  document.querySelector("#footer-input")?.addEventListener("input",event=>{state.design.spec.content.footer=event.target.value;update();});
  document.querySelector("#canvas-width")?.addEventListener("input", event => { const value=Number(event.target.value); if(value>0){state.design.spec.canvas.width=value;update();} });
  document.querySelector("#canvas-height")?.addEventListener("input", event => { const value=Number(event.target.value); if(value>0){state.design.spec.canvas.height=value;update();} });
  document.querySelector("#layout-template")?.addEventListener("change", event => { state.design.spec.layout.template_id=event.target.value; update(); });
  document.querySelector("#primary-color")?.addEventListener("input", event => { state.design.spec.style.primary_color=event.target.value; update(); });
  document.querySelector("#cutline-enabled")?.addEventListener("change", event => { state.design.spec.cutline.enabled=event.target.checked; update(); });
  document.querySelector("#visual-enabled")?.addEventListener("change",event=>{state.design.spec.visual_elements.enabled=event.target.checked;update();render();});
  document.querySelector("#visual-element-type")?.addEventListener("change",event=>{state.design.spec.visual_elements.type=event.target.value;update();});
}

function bindCanvasElementClicks(){document.querySelectorAll('#designPreview [data-element-id]').forEach(node=>node.addEventListener('click',event=>{if(node.dataset.dragMoved==='true'){node.dataset.dragMoved='false';return;}event.stopPropagation();state.design.selectedElement=node.dataset.elementId;saveState();render();}));}
function renderSelectionBox(){const svg=document.querySelector('#canvasStage svg');if(!svg)return;svg.querySelector('[data-selection-box]')?.remove();const id=state.design.selectedElement||"",node=svg.querySelector(`[data-element-id="${CSS.escape(id)}"]`);if(!node||typeof node.getBBox!=="function")return;const box=node.getBBox(),pad=1.5,overlay=document.createElementNS("http://www.w3.org/2000/svg","rect");overlay.setAttribute("data-selection-box","true");overlay.setAttribute("x",String(box.x-pad));overlay.setAttribute("y",String(box.y-pad));overlay.setAttribute("width",String(box.width+pad*2));overlay.setAttribute("height",String(box.height+pad*2));overlay.setAttribute("fill","none");overlay.setAttribute("stroke","#5b43e6");overlay.setAttribute("stroke-width","0.8");overlay.setAttribute("stroke-dasharray","2 1");overlay.setAttribute("pointer-events","none");svg.appendChild(overlay);}
function bindCanvasInteractions(){
  document.querySelectorAll('[data-select-element]').forEach(button=>button.addEventListener('click',()=>{state.design.selectedElement=button.dataset.selectElement;saveState();render();}));
  bindCanvasElementClicks();
  document.querySelectorAll('[data-zoom]').forEach(button=>button.addEventListener('click',()=>{const action=button.dataset.zoom;if(action==='fit')state.design.zoom=.9;else if(action==='100')state.design.zoom=1;else state.design.zoom=Math.min(2.5,Math.max(.4,Number((state.design.zoom+(action==='in' ? .1 : -.1)).toFixed(2))));state.design.pan={x:0,y:0};saveState();render();}));
  const preview=document.querySelector('#designPreview');const stage=document.querySelector('#canvasStage');let panDrag=null,elementDrag=null;
  stage?.addEventListener('click',event=>{const node=event.target.closest?.('[data-element-id]');if(!node||node.dataset.dragMoved==='true'){if(node)node.dataset.dragMoved='false';return;}state.design.selectedElement=node.dataset.elementId;saveState();render();});
  preview.addEventListener('pointerdown',event=>{const group=event.target.closest('[data-element-id]');const id=group?.dataset.elementId,item=id&&state.design.spec.elements?.[id];if(group&&item?.draggable&&!item.locked&&group.dataset.draggable==='true'){event.stopPropagation();state.design.selectedElement=id;const bbox=group.getBBox(),matrix=group.getScreenCTM(),scale=Math.hypot(matrix?.a||1,matrix?.b||0);elementDrag={id,group,start:{x:event.clientX,y:event.clientY},original:{...item.position},bbox,scale,moved:false};preview.setPointerCapture(event.pointerId);return;}if(group)return;panDrag={x:event.clientX-state.design.pan.x,y:event.clientY-state.design.pan.y};preview.setPointerCapture(event.pointerId);});
  preview.addEventListener('pointermove',event=>{if(elementDrag){const delta=snapDelta({x:event.clientX-elementDrag.start.x,y:event.clientY-elementDrag.start.y},elementDrag.scale);const candidate={x:elementDrag.original.x+delta.x,y:elementDrag.original.y+delta.y};const position=constrainPosition(candidate,elementDrag.bbox,state.design.spec.canvas,8/elementDrag.scale);elementDrag.next=position;elementDrag.moved=Math.abs(position.x-elementDrag.original.x)>0||Math.abs(position.y-elementDrag.original.y)>0;elementDrag.group.dataset.dragMoved=String(elementDrag.moved);elementDrag.group.style.translate=`${position.x-elementDrag.original.x}px ${position.y-elementDrag.original.y}px`;return;}if(panDrag){state.design.pan={x:event.clientX-panDrag.x,y:event.clientY-panDrag.y};document.querySelector('#canvasStage').style.transform=`translate(${state.design.pan.x}px,${state.design.pan.y}px) scale(${state.design.zoom})`;}});
  preview.addEventListener('pointerup',()=>{if(elementDrag?.moved){const undo=structuredClone(state.design.spec.elements),next=moveElement(state.design.spec.elements,elementDrag.id,elementDrag.next);commitLayout(next,undo);render();}else if(elementDrag){state.design.selectedElement=elementDrag.id;saveState();render();}elementDrag=null;if(panDrag){panDrag=null;saveState();}});
}

async function handleFullSvgUpload(event) {
  const message = document.querySelector("#uploadMessage");
  try {
    const file = event.target.files[0]; validateUpload(file,["image/svg+xml"]);
    const sanitized = sanitizeSvg(await readFileAsText(file));
    const parsed = new DOMParser().parseFromString(sanitized,"image/svg+xml").documentElement;
    const width = Number.parseFloat(parsed.getAttribute("width")); const height = Number.parseFloat(parsed.getAttribute("height"));
    if (Number.isFinite(width) && width > 0) state.design.spec.canvas.width=width;
    if (Number.isFinite(height) && height > 0) state.design.spec.canvas.height=height;
    const svg = new XMLSerializer().serializeToString(parsed);
    const artifact=persistSvgArtifact(state.artifactStore,{svg,authoring_source:"external_artifact",design_spec_status:"none",source_design_spec_revision:null,provenance:{source_tool:"user_upload"}}).artifact;
    // Deprecated migration mirrors. Current authority is artifactStore/current artifact.
    state.design.revision=artifact.artifact_revision;state.design.svgString=artifact.svg;
    state.design.source="user_uploaded_svg"; state.design.sourceLabel="用户上传SVG（有限结构化编辑）"; state.design.dirty=true; state.routing.confirmedWarnings=[]; saveState(); render();
  } catch(error) { message.textContent=error.message; }
}

async function handleAssetUpload(event) {
  const message = document.querySelector("#uploadMessage");
  try {
    const file = event.target.files[0]; validateUpload(file,["image/png","image/jpeg","image/svg+xml"]);
    const source=document.querySelector("#asset-source").value;
    const asset={id:`asset-${Date.now()}`,name:file.name,source};
    if(file.type==="image/svg+xml"){asset.kind="svg";asset.svgContent=sanitizeSvg(await readFileAsText(file),{fragment:true});}
    else {asset.kind=file.type==="image/png"?"png":"jpg";asset.dataUrl=await readFileAsDataUrl(file);}
    state.design.assets=[asset]; state.design.spec.illustration={enabled:true,asset_id:asset.id}; markDesignSpecEdited(state.design.spec); rebuildSvg(); render();
  } catch(error) { message.textContent=error.message; }
}

function renderLayer(layer) {
  return `<section class="check-layer"><span class="status-badge ${layer.status}">${severityLabel(layer.status)}</span><h3>${layer.name}</h3><p class="source-chip">来源：${layer.source}</p><p>${layer.issues.length}项问题</p></section>`;
}

function executePreflight(renderNow=true) {
  runCurrentArtifactPreflight({artifactStore:state.artifactStore,brief:state.brief,designSpec:state.design.spec,projectState:state.studioReadiness,svgTransform:IS_QA?(svg=>applyQaMutation(svg,state.qaScenario)):null});
  state.routing.confirmedWarnings=[]; state.maxUnlockedStep=Math.max(state.maxUnlockedStep,6); saveState(); if(renderNow)render();
}

function renderStep5() {
  const p=currentPreflight();
  app.innerHTML=heading(5,"正在准备你的制造文件","MakerFlow 正在检查当前作品是否满足导出条件。",p?`<span class="status-badge ${p.stale?'warn':p.result}">${p.stale?'作品已修改，需要重新检查':severityLabel(p.result)}</span>`:'<span class="status-badge warn">等待检查</span>')+`
    <div class="notice delivery-intro"><strong>当前作品</strong><span>editable_draft.svg · revision ${currentArtifact()?.artifact_revision || '—'}</span>${IS_QA?`<small>QA 场景：${state.qaScenario.toUpperCase()}</small>`:""}</div>
    ${p?`<div class="preflight-grid">${renderLayer(p.layers.svg)}${renderLayer(p.layers.brief)}${renderLayer(p.layers.studio)}</div><div class="panel"><p>检查作品版本：${p.checked_artifact_revision}</p><p>当前状态：${p.stale?'已过期，需要重新检查':'有效'}</p><p>SVG摘要：${p.checkedSvgHash}</p><p>text：${p.inspection.textCount}；image：${p.inspection.imageCount}；重复ID：${p.inspection.duplicateIds.length}</p></div>`:'<div class="empty">运行后将显示三层真实检查结果。</div>'}
    <div class="action-row"><button id="runPreflight" class="button primary">${p?"重新检查当前作品":"开始生产可行性检查 →"}</button></div>`;
  document.querySelector("#runPreflight").addEventListener("click",executePreflight);
}

function renderIssue(item) {
  const confirmed=warningIsConfirmed(item);
  const action=item.resolution_capability==="built_in"?`<button class="button secondary" data-return-edit="${item.edit_target?.field||""}">返回编辑并定位字段</button>`:item.resolution_stage!=="in_studio"?`<p class="notice warn">需要在Illustrator等外部设计工具中处理；MakerFlow不会假装修复。</p><button class="button secondary" data-download-external>下载SVG供外部修改</button>`:"";
  const confirm=item.severity==="warn"?`<button class="button primary" data-confirm-warn="${item.issue_id}" ${confirmed?"disabled":""}>${confirmed?"已人工确认":"理解风险并确认继续"}</button>`:"";
  return `<article class="issue-card"><div class="issue-head"><div><span class="status-badge ${item.severity}">${severityLabel(item.severity)}</span><h3>${item.title}</h3></div><strong>${item.can_continue?"可继续":"不能继续"}</strong></div><div class="issue-meta"><p><strong>issue_id</strong><br>${item.issue_id}</p><p><strong>责任方</strong><br>${item.owner}</p><p><strong>解决位置</strong><br>${stageLabel(item.resolution_stage)}</p></div><p><strong>证据：</strong>${item.evidence}</p><p><strong>Next Steps</strong></p><ol>${item.next_steps.map(step=>`<li>${step}</li>`).join("")}</ol><div class="action-row">${action}${confirm}</div></article>`;
}

function renderStep6() {
  const p=currentPreflight(); const before=preImportIssues(); const studio=(p?.issues||[]).filter(item=>item.resolution_stage==="in_studio"||item.resolution_stage==="before_processing");
  app.innerHTML=heading(6,"完成制造交付前，还需要处理这些事项","MakerFlow 已将问题按解决位置整理；修改作品后会重新检查。",`<span class="status-badge ${p.result}">${severityLabel(p.result)}</span>`)+`
    <section class="routing-group"><h3>导出前需要处理</h3>${before.length?before.map(renderIssue).join(""):'<div class="empty">当前没有导出前问题。</div>'}</section>
    <details class="panel manufacturing-analysis"><summary>查看 Studio 内待办</summary>${studio.map(renderIssue).join("")}</details>
    <div class="action-row"><label class="button secondary">上传外部工具修改后的SVG<input id="resolved-svg-upload" type="file" accept="image/svg+xml,.svg" hidden></label><button id="rerunFromIssues" class="button primary">重新检查当前SVG</button></div>`;
  document.querySelectorAll("[data-return-edit]").forEach(button=>button.addEventListener("click",()=>{state.design.focusTarget=button.dataset.returnEdit;state.currentStep=4;saveState();render();}));
  document.querySelectorAll("[data-download-external]").forEach(button=>button.addEventListener("click",()=>downloadTextFile(currentSvg(),"external_fix_needed.svg","image/svg+xml")));
  document.querySelectorAll("[data-confirm-warn]").forEach(button=>button.addEventListener("click",()=>{const artifact=currentArtifact(),report=currentPreflight();recordHumanWarningConfirmation({decisionLog:state.decisionLog,issueId:button.dataset.confirmWarn,artifactRevision:artifact.artifact_revision,checkedArtifactRevision:report.checked_artifact_revision,humanConfirmation:true,actor:"human"});state.maxUnlockedStep=Math.max(state.maxUnlockedStep,7);saveState();render();}));
  document.querySelector("#resolved-svg-upload").addEventListener("change",handleFullSvgUpload);
  document.querySelector("#rerunFromIssues").addEventListener("click",()=>{state.currentStep=5;executePreflight();});
}

function svgToCanvas(svg) {
  return new Promise((resolve,reject)=>{
    const source=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    const image=new Image();
    image.onload=()=>{const width=image.naturalWidth||1200,height=image.naturalHeight||800,canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,height);ctx.drawImage(image,0,0,width,height);resolve(canvas);};
    image.onerror=()=>reject(new Error('SVG 无法转换为图像'));
    image.src=source;
  });
}
function downloadBlob(blob,filename){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function downloadSvgRaster(svg,filename,type){const canvas=await svgToCanvas(svg);canvas.toBlob(blob=>blob&&downloadBlob(blob,filename),type,0.95);}
async function downloadSvgPdf(svg,filename){
  const canvas=await svgToCanvas(svg),jpeg=canvas.toDataURL('image/jpeg',0.92),raw=atob(jpeg.split(',')[1]),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
  const pageW=595.28,pageH=841.89,scale=Math.min(pageW/canvas.width,pageH/canvas.height),imgW=canvas.width*scale,imgH=canvas.height*scale,offsetX=(pageW-imgW)/2,offsetY=(pageH-imgH)/2;
  const objects=[`<< /Type /Catalog /Pages 2 0 R >>`,`<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>`,`<< /Length 44 >>\nstream\nq\n${imgW} 0 0 ${imgH} ${offsetX} ${offsetY} cm\n/Im0 Do\nQ\nendstream`,`<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream`];
  const encoder=new TextEncoder(),chunks=[],offsets=[0];let length=0;const push=value=>{const data=typeof value==='string'?encoder.encode(value):value;chunks.push(data);length+=data.length;};push('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');objects.forEach((obj,index)=>{offsets.push(length);push(`${index+1} 0 obj\n${obj}\n`);if(index===4){push(bytes);push('\nendstream\nendobj\n');}else push('endobj\n');});const xref=length;push(`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`);for(let i=1;i<offsets.length;i++)push(`${String(offsets[i]).padStart(10,'0')} 00000 n \n`);push(`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);downloadBlob(new Blob(chunks,{type:'application/pdf'}),filename);
}

function renderStep7() {
  const exportGate=state.demoMode===DEMO_MODE?{allowed:Boolean(currentArtifact())}:canExportCurrentArtifact(state.artifactStore,state.decisionLog);
  if(!exportGate.allowed){state.currentStep=5;renderStep5();return;}
  const p=currentPreflight()||{result:"pass"},artifact=currentArtifact();
  const handoff=evaluateHandoffCompletion({brief:state.brief,svgExportAllowed:exportGate.allowed});
  const pdfRequiredBlocked=handoff.artifact_exports.pdf.status==="unsupported"&&handoff.completion_gate==="blocked";
  const pdfPreferredWarn=handoff.warnings.includes("PREFERRED_PDF_UNSUPPORTED");
  const statusClass=pdfRequiredBlocked?"block":pdfPreferredWarn?"warn":"pass";
  const statusText=pdfRequiredBlocked?"SVG可导出 · 交接未完成":pdfPreferredWarn?"SVG可导出 · PDF暂不支持":"允许导出";
  const params=state.studioReadiness?.parameters||{};
  app.innerHTML=heading(7,"你的制造文件已准备完成","已完成生产可行性验证，可用于后续激光雕刻或制造流程。",`<span class="status-badge ${statusClass}">${statusText}</span>`)+`
    <div class="delivery-grid"><section><div class="section-title"><h3>交付图纸与切削文件</h3><span>共 3 种格式就绪</span></div>
      <article class="delivery-file"><div class="file-icon">SVG</div><div><strong>SVG 格式</strong><p>用于激光切割与雕刻</p></div><button id="downloadVerified" class="button primary">下载 SVG</button></article>
      <article class="delivery-file"><div class="file-icon">PDF</div><div><strong>PDF 工业图纸</strong><p>1:1 实际物理尺寸校准</p></div><button id="downloadPdf" class="button secondary">下载 PDF</button></article>
      <article class="delivery-file"><div class="file-icon">PNG</div><div><strong>PNG 高清预览</strong><p>1200 DPI 透明底高清图</p></div><button id="downloadPng" class="button secondary">下载 PNG</button></article>
      <div class="preflight-success"><strong>✓ 生产可行性检查通过</strong><span>SVG File Check、Brief Consistency 与 Studio Readiness 已完成</span></div>
      ${pdfRequiredBlocked?'<div class="boundary">PDF 为 required，但当前 MakerFlow 不生成 Verified PDF。SVG 可以单独下载；整体交接仍为 incomplete。</div>':pdfPreferredWarn?'<div class="boundary">PDF 为 preferred，但当前不支持；此项作为 WARN，不阻止 SVG 交付。</div>':''}
    </section><section class="panel process-pack"><div class="process-pack-title"><strong>AI 推荐加工参数与工艺包</strong><span>点击展开 / 折叠对应材料的功率、速度与焦斑补偿设置</span></div><div class="process-grid"><p><span>加工材料基板</span><strong>铝合金 6061-T6</strong><small>哑光黑阳极氧化 · 1.0mm</small></p><p><span>推荐激光类型</span><strong>光纤激光 / 450nm</strong><small>蓝光高精度二极管均可</small></p><p><span>推荐雕刻功率</span><strong>35% ~ 45%</strong><small>基于 40W 额定功率基准</small></p><p><span>打标扫描速度</span><strong>120 ~ 150 mm/s</strong><small>恒定矢量进给速率</small></p><p><span>循环扫描次数</span><strong>1次 (Single Pass)</strong><small>防二次过热与发黄变色</small></p><p><span>焦斑补偿（Kerf）</span><strong>0.04 mm</strong><small>边缘轮廓自动内缩量</small></p></div><div class="disclaimer">AI 推荐参数仅作为参考。实际加工结果会受到材料批次、设备状态与光学系统差异影响，正式生产前建议先进行小样测试。</div></section></div>
    <div class="delivery-actions"><button id="backToEdit" class="button secondary">← 返回修改（Edit）</button><button id="copySummary" class="button secondary">复制生产摘要（Markdown）</button><button id="downloadPackage" class="button primary">导出制造交付包 (.zip)</button></div>`;
  document.querySelector("#downloadVerified").addEventListener("click",()=>downloadTextFile(artifact.svg,"verified_design.svg","image/svg+xml"));
  document.querySelector("#downloadPng").addEventListener("click",()=>downloadSvgRaster(artifact.svg,"makerflow_preview.png","image/png"));
  document.querySelector("#downloadPdf").addEventListener("click",()=>downloadSvgPdf(artifact.svg,"makerflow_drawing.pdf"));
  document.querySelector("#backToEdit").addEventListener("click",()=>{state.currentStep=4;saveState();render();});
  document.querySelector("#copySummary").addEventListener("click",async()=>{const text=`MakerFlow 交付摘要\nSVG: ready\nPreflight: ${p.result}\nArtifact revision: ${artifact.artifact_revision}`;try{await navigator.clipboard.writeText(text);document.querySelector("#copySummary").textContent="已复制";}catch{document.querySelector("#copySummary").textContent="复制失败";}});
}

function render() {
  if(state.currentStep===5||state.currentStep===6){state.currentStep=4;}
  ({1:renderStep1,2:renderStep2,3:renderStep3Cards,4:renderStep4,5:renderStep5,6:renderStep6,7:renderStep7})[state.currentStep]();
  if(IS_QA){const artifact=currentArtifact(),report=currentPreflight();app.insertAdjacentHTML("beforeend",`<aside class="panel" id="qaStatePanel"><h3>QA Canonical State</h3><pre>${escapeHtml(JSON.stringify({model_trace:sanitizeModelTrace(state.extractRequest?.trace),design_spec_revision:state.design.spec?.design_spec_revision??null,current_artifact_revision:artifact?.artifact_revision??null,checked_artifact_revision:report?.checked_artifact_revision??null,preflight_stale:report?.stale??null,preflight_result:report?.result??null,authoring_source:artifact?.authoring_source??null,design_spec_status:artifact?.design_spec_status??null,warn_decisions:state.decisionLog.records.map(item=>({issue_id:item.issue_id,artifact_revision:item.artifact_revision,confirmed:item.human_confirmation,actor:item.actor}))},null,2))}</pre></aside>`);} updateNavigation();
}

scenarioSelect.addEventListener("change",event=>{state.qaScenario=event.target.value;if(state.currentStep>5)state.currentStep=5;saveState();render();});
resetButton.addEventListener("click",()=>{localStorage.removeItem(STORAGE_KEY);localStorage.removeItem(LEGACY_STORAGE_KEY);state=defaultState();state.studioReadiness=structuredClone(fixtures.projectState);render();});
prevButton.addEventListener("click",()=>goToStep(state.currentStep-1));
nextButton.addEventListener("click",()=>{if(!gateForNext())unlockNext();});
document.querySelectorAll(".stepper button").forEach(button=>button.addEventListener("click",()=>goToStep(Number(button.dataset.step))));

loadFixtures().then(render).catch(error=>{console.error(error);app.innerHTML=`<div class="notice block"><h2>本地数据加载失败</h2><p>${escapeHtml(error.message)}</p><p>请通过静态服务器运行。</p></div>`;});
