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
import { generateCreativePlan } from "./plan-generate-client.js";
import { createCreativePlanState, recordPlanDecision, getAcceptedPlan, syncPlanStaleness } from "./creative-plan-state.js";
import { evaluateHandoffCompletion } from "./handoff-state.js";

const STORAGE_KEY = "makerflow.lowfi.v2";
const IS_QA = new URLSearchParams(location.search).get("qa") === "1";
const DATA_FILES = {
  job: "./data/job_initial.json",
  brief: "./data/brief_confirmed.json",
  designSpec: "./data/design_spec.json",
  layouts: "./data/layout_templates.json",
  icons: "./data/icon_library.json",
  projectState: "./data/project_state.json"
};

const defaultState = () => ({
  version: 2,
  currentStep: 1,
  maxUnlockedStep: 1,
  qaScenario: "pass",
  job: { description:"", productFacts:"", cardPurpose:"", references:"", existingFiles:"", referenceFiles:[], sampleMode:false },
  extracted: false,
  extractRequest: { loading:false, error:null, trace:null },
  briefValidation: null, briefHistory:[],
  askMissing:{loading:false,error:null,questions:[],trace:null},
  brief: { brief_revision:1,lifecycle:"draft",fields:[], confirmed:false, confirmedAt:null },
  creativePlan: { plan:null, lifecycle:"empty", stale:false, decisions:{}, decision_log:[], loading:false, error:null, trace:null, confirmed:false, confirmedAt:null },
  design: { spec:null, svgString:"", source:"makerflow_template", sourceLabel:"MakerFlow模板生成", assets:[], revision:0, dirty:false, focusTarget:null, selectedElement:"title", zoom:1, pan:{x:0,y:0}, layoutUndo:null, statusMessage:"" },
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
qaControls.hidden = !IS_QA;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved?.version === 2 ? saved : defaultState();
  } catch { return defaultState(); }
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
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
  state.extractRequest = { ...defaultState().extractRequest, ...state.extractRequest, loading:false };
  state.askMissing={...defaultState().askMissing,...state.askMissing,loading:false};state.briefHistory=state.briefHistory||[];
  state.design = { ...defaultState().design, ...state.design, pan:{...defaultState().design.pan,...state.design?.pan} };
  state.artifactStore = state.artifactStore || createArtifactStore();
  state.decisionLog = state.decisionLog || createDecisionLog();
  if (state.extracted && !state.brief.visual_aid_requirement) state.brief.visual_aid_requirement = structuredClone(fixtures.brief.visual_aid_requirement);
  if (state.extracted && !state.brief.finished_size) state.brief.finished_size = structuredClone(fixtures.brief.finished_size);
  if (state.design.spec && !state.design.spec.visual_elements) state.design.spec.visual_elements = structuredClone(fixtures.designSpec.visual_elements);
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
const canonicalBriefBlockers=()=>[...(state.briefValidation?.missing_items||[]),...(state.briefValidation?.conflict_items||[])];
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
    button.classList.toggle("active", step === state.currentStep);
    button.classList.toggle("done", step < state.currentStep);
    button.disabled = step > state.maxUnlockedStep || !canAccessStep(step);
  });
  prevButton.disabled = state.currentStep === 1;
  nextButton.hidden = state.currentStep <= 3;
  nextButton.disabled = state.currentStep === 7 || Boolean(gateForNext());
  nextButton.textContent = ({3:"进入Create & Edit",4:"检查当前SVG",5:"查看问题路由",6:"进入Export & Handoff"})[state.currentStep] || "下一步";
  gateMessage.textContent = gateForNext();
  scenarioSelect.value = state.qaScenario;
}

function goToStep(step) {
  if (step < 1 || step > 7 || step > state.maxUnlockedStep || !canAccessStep(step)) return;
  state.currentStep = step;
  if (step === 4 && !state.design.spec && state.creativePlan.confirmed) buildDesign();
  saveState(); render(); app.focus();
}

function unlockNext() {
  state.maxUnlockedStep = Math.max(state.maxUnlockedStep, Math.min(7, state.currentStep + 1));
  goToStep(state.currentStep + 1);
}

function heading(step, title, description, badge = "") {
  return `<div class="step-heading"><div><div class="step-number">STEP ${step} / 7</div><h2>${title}</h2><p class="muted">${description}</p></div>${badge}</div>`;
}

function rebuildSvg() {
  const artifact = persistNativeDesign({artifactStore:state.artifactStore,designSpec:state.design.spec,icons:fixtures.icons.icons,assets:state.design.assets});
  // Deprecated migration mirrors. Current authority is artifactStore/current artifact.
  state.design.revision = artifact.artifact_revision;
  recordRenderedSvg(state.design, artifact.svg);
  state.design.dirty = true;
  state.design.source = "makerflow_template";
  state.design.sourceLabel = "MakerFlow模板生成";
  state.routing.confirmedWarnings = [];
  saveState();
}

function commitLayout(elements,undo){state.design.layoutUndo=undo?structuredClone(undo):state.design.layoutUndo;state.design.spec.elements=elements;markDesignSpecEdited(state.design.spec);state.design.statusMessage="布局已修改，需要重新Preflight";rebuildSvg();}

function buildDesign() {
  const acceptedPlan=getAcceptedPlan(state.creativePlan,state.brief.brief_revision),accepted=acceptedPlan.recommendations;
  const form=accepted.find(item=>item.decision_type==="form"),visual=accepted.find(item=>item.decision_type==="visual_aid");
  const accepted_plan={...acceptedPlan,template_id:/三栏|并列|横向/.test(form?.suggestion||"")?"three-column":"vertical-steps",visual_elements:visual?{enabled:true,type:/图标/.test(visual.suggestion)?"icon":/插画/.test(visual.suggestion)?"simple_illustration":/图案/.test(visual.suggestion)?"decorative_pattern":"structural_diagram",purpose:state.brief.visual_aid_requirement?.purposes||[],asset_source:"makerflow_template"}:{enabled:false}};
  state.design.spec = buildDesignSpecFromBrief(state.brief, accepted_plan, structuredClone(fixtures.designSpec));
  rebuildSvg();
  state.maxUnlockedStep = Math.max(state.maxUnlockedStep, 4);
}

function revalidateCurrentBrief(){const result=validateBrief({brief_candidate:state.brief}).brief_validation_result;state.briefValidation=result;state.brief=applyBriefValidation(state.brief,result);return result;}
function ensureEditableBriefRevision(){const result=beginBriefRevision(state.brief,state.briefHistory);state.brief=result.brief;state.briefHistory=result.history;if(state.creativePlan.plan)state.creativePlan=syncPlanStaleness(state.creativePlan,state.brief.brief_revision);return result.created;}
async function loadCreativePlan(){if(state.brief.lifecycle!=="confirmed")return;state.creativePlan={...defaultState().creativePlan,loading:true};saveState();render();const result=await generateCreativePlan({confirmedBrief:state.brief});if(!result.ok){state.creativePlan={...defaultState().creativePlan,error:result.error};saveState();render();return;}state.creativePlan={...createCreativePlanState(result.creative_plan),loading:false,error:null,trace:result.trace,confirmed:false,confirmedAt:null};saveState();render();}
async function loadMissingQuestions(){const blockers=canonicalBriefBlockers();if(!blockers.length){state.askMissing={loading:false,error:null,questions:[],trace:null};return true;}state.askMissing={loading:true,error:null,questions:[],trace:null};saveState();render();const result=await requestMissingQuestions({briefCandidate:state.brief,validationResult:state.briefValidation,confirmedContext:{fields:state.brief.fields.filter(f=>f.status==="confirmed")}});state.askMissing=result.ok?{loading:false,error:null,questions:result.questions,trace:result.trace}:{loading:false,error:result.error,questions:[],trace:null};saveState();render();return result.ok;}

function renderStep1() {
  const requestState=state.extractRequest;
  app.innerHTML = heading(1, "定义作品 Define", "先描述你想完成的作品；下一步会把输入整理成可确认的Brief。") + `
    ${(IS_QA || state.job.sampleMode) ? '<div class="notice demo-note"><strong>Demo Sample：</strong>MomoRay模块化枕头包装内高度调节说明卡。需求理解通过本地Node服务调用Experimental Provider。</div>' : ''}
    <section class="creative-entry"><label for="description">请描述你要制作的作品</label><textarea id="description" placeholder="例如：我需要一张放在包装内的说明卡，帮助用户理解三种枕头模块组合……">${escapeHtml(state.job.description || state.job.cardPurpose)}</textarea></section>
    <section class="reference-drop"><div><strong>参考资料</strong><p class="muted">可添加 PNG、JPG、PDF 或 SVG，仅保存在当前浏览器会话。</p></div><label class="button secondary">选择文件<input id="referenceUpload" type="file" accept="image/png,image/jpeg,application/pdf,image/svg+xml,.svg,.pdf" multiple hidden></label></section>
    ${state.job.referenceFiles?.length ? `<ul class="file-chips">${state.job.referenceFiles.map(file=>`<li>${escapeHtml(file.name)} · ${escapeHtml(file.type || "文件")}</li>`).join("")}</ul>`:""}
    ${requestState.error?`<div class="notice block" role="alert"><strong>暂时无法理解需求</strong><p>${escapeHtml(requestState.error.message)}</p></div>`:""}
    ${IS_QA&&requestState.trace?`<details><summary>QA：脱敏Model Trace</summary><pre>${escapeHtml(JSON.stringify(requestState.trace,null,2))}</pre></details>`:""}
    <div class="action-row"><button id="loadJob" class="text-button" ${requestState.loading?'disabled':''}>体验MomoRay示例</button><button id="extractButton" class="button primary" ${requestState.loading?'disabled':''}>${requestState.loading?'正在理解你的需求…':requestState.error?'重试理解需求':'理解需求'}</button></div>`;
  document.querySelector("#description")?.addEventListener("input", event => { state.job.description = event.target.value; saveState(); });
  document.querySelector("#referenceUpload").addEventListener("change",event=>{state.job.referenceFiles=[...event.target.files].map(file=>({name:file.name,type:file.type,size:file.size}));saveState();render();});
  document.querySelector("#loadJob").addEventListener("click", () => { const overrides=state.job.referenceFiles||[]; state.job = { ...fixtures.job, description:fixtures.job.cardPurpose, referenceFiles:overrides, sampleMode:true }; delete state.job.draft_overrides; saveState(); render(); });
  document.querySelector("#extractButton").addEventListener("click", async () => {
    const userInput=state.job.description.trim();
    if(!userInput){state.extractRequest.error={code:"EMPTY_INPUT",message:"请先描述你要制作的作品。"};saveState();render();return;}
    state.extractRequest={loading:true,error:null,trace:null};saveState();render();
    const result=await extractAndValidateBrief({userInput,attachments:state.job.referenceFiles||[],validateBrief});
    if(!result.ok){state.extracted=false;state.extractRequest={loading:false,error:result.error,trace:null};state.maxUnlockedStep=1;saveState();render();return;}
    state.briefValidation=result.brief_validation_result;
    state.brief=prepareBriefForEditor(result.brief_candidate,result.brief_validation_result);
    state.briefValidation=validateBrief({brief_candidate:state.brief}).brief_validation_result;
    state.brief=applyBriefValidation(state.brief,state.briefValidation);state.briefHistory=[];
    state.extracted=true;
    state.extractRequest={loading:false,error:null,trace:result.trace};
    state.creativePlan=defaultState().creativePlan;
    state.maxUnlockedStep=2;saveState();goToStep(2);await loadMissingQuestions();
  });
}

function renderStep2() {
  const blockers = canonicalBriefBlockers();
  const byId=id=>state.brief.fields.find(field=>field.id===id); const visual=state.brief.visual_aid_requirement; const size=normalizeFinishedSize(state.brief.finished_size);
  const renderField=id=>{const field=byId(id);if(!field)return"";const control=field.input_type==="unit"?`<select data-field-value="${id}"><option value="mm" ${field.value==='mm'?'selected':''}>mm</option><option value="cm" ${field.value==='cm'?'selected':''}>cm</option></select>`:field.input_type==="preset"?`<select data-field-value="${id}"><option value="A6" ${field.value==='A6'?'selected':''}>A6</option><option value="custom" ${field.value==='custom'?'selected':''}>自定义</option></select>`:`<input type="${field.input_type==='number'?'number':'text'}" min="1" step="0.1" data-field-value="${id}" value="${escapeHtml(field.value)}">`;const requirement=field.critical?'必须确认':field.advanced?'可选':'可在方案阶段继续决定';return `<div class="brief-field ${field.critical?'critical':'tentative'}"><div class="field-title"><label>${field.label}</label><span>${requirement}</span></div>${control}<select class="field-status" data-field-status="${id}">${["confirmed","assumed","missing","needs_confirmation"].map(status=>`<option value="${status}" ${field.status===status?'selected':''}>${statusLabel(status)}</option>`).join("")}</select></div>`;};
  const lifecycleLabel={draft:"草稿",ready_for_confirmation:"可确认",confirmed:"已确认",superseded:"已取代"}[state.brief.lifecycle]||state.brief.lifecycle;
  const ask=state.askMissing;
  app.innerHTML = heading(2, "可编辑需求 Brief", "下一步将基于当前Brief生成Creative Plan，并在Create & Edit中生成可编辑作品草稿。", `<span class="status-badge ${blockers.length?'block':state.brief.lifecycle==='confirmed'?'pass':'warn'}">Brief r${state.brief.brief_revision} · ${lifecycleLabel}</span>`) + `
    ${blockers.length?`<section class="notice warn"><strong>还需要确认 ${blockers.length} 项信息</strong>${ask.loading?'<p>正在整理中性问题…</p>':ask.error?`<p>${escapeHtml(ask.error.message)}</p><button id="retryAsk" class="button secondary">重试生成问题</button>`:(ask.questions||[]).map(q=>`<div class="clarification-question"><label>${escapeHtml(q.question)}<input data-answer="${escapeHtml(q.question_id)}" data-field-id="${escapeHtml(q.field_id)}"></label><small>${escapeHtml(q.reason)}</small></div>`).join('')}${ask.questions?.length?'<button id="submitClarification" class="button primary">补充信息</button>':''}</section>`:''}
    <div class="brief-groups">
      <section class="brief-section"><h3>作品目标</h3><div class="brief-field-grid">${["deliverable","purpose","target_user","must_content"].map(renderField).join("")}</div></section>
      <section class="brief-section"><h3>内容与事实</h3><div class="brief-field-grid">${["product_facts","form"].map(renderField).join("")}</div></section>
      <section class="brief-section"><div class="field-title"><h3>成品尺寸 <span class="help-tip" title="作品最终实际尺寸，不是屏幕预览大小。">?</span></h3><span class="status-badge ${size.status==='confirmed'?'pass':'warn'}">${statusLabel(size.status)}</span></div><label>预设尺寸<select id="finished-size-preset"><option value="A4" ${size.preset_size==='A4'?'selected':''}>A4</option><option value="A5" ${size.preset_size==='A5'?'selected':''}>A5</option><option value="A6" ${size.preset_size==='A6'?'selected':''}>A6</option><option value="custom" ${size.preset_size==='custom'?'selected':''}>自定义</option></select></label>${size.preset_size==='custom'?`<div class="custom-size-fields"><label>成品宽度<input id="finished-size-width" type="number" min="1" value="${escapeHtml(size.width)}"></label><label>成品高度<input id="finished-size-height" type="number" min="1" value="${escapeHtml(size.height)}"></label><label>单位<select id="finished-size-unit"><option value="mm" ${size.unit==='mm'?'selected':''}>mm</option><option value="cm" ${size.unit==='cm'?'selected':''}>cm</option></select></label><label>状态<select id="finished-size-status"><option value="confirmed" ${size.status==='confirmed'?'selected':''}>已确认</option><option value="needs_confirmation" ${size.status==='needs_confirmation'?'selected':''}>需要确认</option></select></label></div>`:''}<p class="size-summary"><strong>${size.preset_size==='custom'?'自定义':size.preset_size} · ${size.width||'—'} × ${size.height||'—'} ${size.unit}</strong></p></section>
      <section class="brief-section"><h3>视觉与制作方向</h3><div class="brief-field-grid">${["material_direction","color_direction"].map(renderField).join("")}</div><div class="visual-requirement"><div><h4>视觉辅助需求 <span class="help-tip" title="只记录是否需要图标、结构示意或简单插画；此处不会生成图片。">?</span></h4><p class="muted">是否需要视觉元素帮助解释结构、步骤或品牌信息？</p></div><label>是否需要<select id="visual-status"><option value="required" ${visual.status==='required'?'selected':''}>需要</option><option value="not_required" ${visual.status==='not_required'?'selected':''}>不需要</option><option value="undecided" ${visual.status==='undecided'?'selected':''}>尚未决定</option></select></label><fieldset><legend>用途</legend>${[["explain_structure","解释结构"],["explain_steps","解释步骤"],["brand_identity","品牌识别"],["decoration","装饰"]].map(([value,label])=>`<label><input type="checkbox" data-visual-purpose="${value}" ${visual.purposes.includes(value)?'checked':''}>${label}</label>`).join("")}</fieldset><label>偏好形式<select id="visual-type">${[["let_system_recommend","由系统建议"],["icon","图标"],["structural_diagram","结构示意"],["simple_illustration","简单插画"],["decorative_pattern","装饰图案"]].map(([value,label])=>`<option value="${value}" ${visual.preferred_type===value?'selected':''}>${label}</option>`).join("")}</select></label></div></section>
      <section class="brief-section"><h3>输出要求</h3><div class="brief-field-grid">${["output_format"].map(renderField).join("")}</div><p class="help">输出格式决定交付文件类型；材料方向是候选约束；刀线要求将在Design Spec和Preflight中继续确认。</p><details><summary>高级字段</summary>${renderField("maker_source")}</details></section>
    </div>
    <div class="continue-summary ${blockers.length?'blocked':'ready'}"><div><strong>${blockers.length?'当前不能进入Creative Plan':'可以进入Creative Plan'}</strong><p>${blockers.length?`仍缺失或冲突：${blockers.join('、')}`:'所有关键Gate已满足。'}</p></div><div><span>规则阻塞：${blockers.length}项</span><span>生命周期：${lifecycleLabel}</span></div></div>
    <div class="action-row"><button id="confirmBrief" class="button primary" ${state.brief.lifecycle!=='ready_for_confirmation'?'disabled':''}>确认Brief并进入Creative Plan</button></div>`;
  document.querySelectorAll("[data-field-value]").forEach(control => control.addEventListener(control.tagName === "SELECT" ? "change" : "input", event => {
    ensureEditableBriefRevision();const field = state.brief.fields.find(item => item.id === event.target.dataset.fieldValue); field.value = event.target.value;field.source="human_edit"; if (!String(field.value).trim()) field.status = "missing";
    revalidateCurrentBrief();saveState();updateNavigation();
  }));
  document.querySelectorAll("[data-field-status]").forEach(control => control.addEventListener("change", event => {ensureEditableBriefRevision(); const field = state.brief.fields.find(item => item.id === event.target.dataset.fieldStatus); field.status = event.target.value;revalidateCurrentBrief();saveState(); render(); }));
  document.querySelector("#finished-size-preset").addEventListener("change",event=>{ensureEditableBriefRevision();state.brief.finished_size=normalizeFinishedSize({preset_size:event.target.value,status:event.target.value==='custom'?'needs_confirmation':'confirmed'});revalidateCurrentBrief();saveState();render();});
  ["width","height","unit","status"].forEach(key=>document.querySelector(`#finished-size-${key}`)?.addEventListener("change",event=>{ensureEditableBriefRevision();state.brief.finished_size=normalizeFinishedSize({...state.brief.finished_size,[key]:event.target.value});revalidateCurrentBrief();saveState();render();}));
  document.querySelector("#visual-status").addEventListener("change",event=>{ensureEditableBriefRevision();visual.status=event.target.value;visual.field_status=event.target.value==='undecided'?'needs_confirmation':'confirmed';revalidateCurrentBrief();saveState();render();});
  document.querySelectorAll("[data-visual-purpose]").forEach(input=>input.addEventListener("change",()=>{ensureEditableBriefRevision();visual.purposes=[...document.querySelectorAll('[data-visual-purpose]:checked')].map(x=>x.dataset.visualPurpose);revalidateCurrentBrief();saveState();}));
  document.querySelector("#visual-type").addEventListener("change",event=>{ensureEditableBriefRevision();visual.preferred_type=event.target.value;revalidateCurrentBrief();saveState();});
  document.querySelector("#retryAsk")?.addEventListener("click",loadMissingQuestions);
  document.querySelector("#submitClarification")?.addEventListener("click",async()=>{const answers=[...document.querySelectorAll("[data-answer]")].map(input=>({question_id:input.dataset.answer,field_id:input.dataset.fieldId,answer:input.value.trim(),source:"human_clarification"})).filter(x=>x.answer);if(!answers.length)return;const oldBrief=structuredClone(state.brief),oldValidation=structuredClone(state.briefValidation);state.askMissing.loading=true;saveState();render();const result=await clarifyAndValidateBrief({originalUserInput:state.job.description,previousBrief:state.brief,answers,attachments:state.job.referenceFiles||[],validateBrief});if(!result.ok){state.brief=oldBrief;state.briefValidation=oldValidation;state.askMissing={loading:false,error:result.error,questions:ask.questions,trace:null};saveState();render();return;}state.brief=prepareBriefForEditor(result.brief_candidate,result.brief_validation_result);state.briefValidation=validateBrief({brief_candidate:state.brief}).brief_validation_result;state.brief=applyBriefValidation(state.brief,state.briefValidation);state.extractRequest.trace=result.trace;saveState();if(canonicalBriefBlockers().length)await loadMissingQuestions();else{state.askMissing={loading:false,error:null,questions:[],trace:null};saveState();render();}});
  document.querySelector("#confirmBrief").addEventListener("click", async () => {const result=confirmBrief(state.brief,state.briefValidation,state.briefHistory);if(!result.ok)return;state.brief=result.brief;state.briefHistory=result.history;state.maxUnlockedStep = Math.max(state.maxUnlockedStep,3);saveState();goToStep(3);await loadCreativePlan();});
}

function renderStep3() {
  if(state.creativePlan.loading){app.innerHTML=heading(3,"创作方案 Creative Plan","正在基于已确认Brief生成候选设计决策。")+`<div class="notice info"><strong>正在生成Creative Plan…</strong></div>`;return;}
  if(state.creativePlan.error){app.innerHTML=heading(3,"创作方案 Creative Plan","Brief保持已确认；失败不会载入Mock方案。")+`<div class="notice block"><strong>${escapeHtml(state.creativePlan.error.message||"无法生成Creative Plan，请重试。")}</strong></div><button id="retryPlan" class="button primary">重试</button>`;document.querySelector("#retryPlan").addEventListener("click",loadCreativePlan);return;}
  if(!state.creativePlan.plan){app.innerHTML=heading(3,"创作方案 Creative Plan","需要从已确认Brief生成候选设计决策。")+`<button id="retryPlan" class="button primary">生成Creative Plan</button>`;document.querySelector("#retryPlan").addEventListener("click",loadCreativePlan);return;}
  const suggestions=planRecommendations(),accepted=suggestions.filter(item=>state.creativePlan.decisions[item.recommendation_id]?.status==='accepted').length,rejected=suggestions.filter(item=>state.creativePlan.decisions[item.recommendation_id]?.status==='rejected').length,pending=pendingPlan().length;
  const locked=(state.brief.fields||[]).filter(item=>item.status==='confirmed').map(item=>({label:item.label,value:item.value}));const size=state.brief.finished_size;locked.push({label:"成品尺寸",value:`${size.preset_size||"自定义"} · ${size.width} × ${size.height} ${size.unit}`});
  app.innerHTML = heading(3, "创作方案 Creative Plan", "现在决定作品方向；下一步才会建立Design Spec并生成可编辑SVG。", `<span class="status-badge ${pending?'warn':'pass'}">${pending}项待决定</span>`) + `
    <div class="notice warn"><strong>建议仅作为候选，关键约束由用户确认。</strong>不会决定设备或加工参数。</div>
    <section class="locked-constraints"><h3>A. 已锁定约束</h3><p class="muted">来自confirmed Brief，只展示，不需要再次接受。</p><dl>${locked.map(item=>`<div><dt>${escapeHtml(item.label||'')}</dt><dd>${escapeHtml(item.value||'')}</dd></div>`).join('')}</dl></section>
    <section><h3>B. 待决策建议</h3><div class="decision-summary"><span>已接受 <strong>${accepted}</strong></span><span>待确认 <strong>${pending}</strong></span>${rejected?`<span>已拒绝 <strong>${rejected}</strong></span>`:''}</div>
    <div class="cards">${suggestions.map(item=>{const d=state.creativePlan.decisions[item.recommendation_id]||{status:'pending'};return `<article class="recommendation-card ${d.status}"><div><span class="step-number">${escapeHtml(item.decision_type)}</span><h3>${escapeHtml(d.edited_suggestion||item.suggestion)}</h3><span class="status-badge ${d.status==='accepted'?'pass':d.status==='rejected'?'block':'info'}">${d.status}</span><span class="status-badge info">置信度 ${item.confidence}</span>${d.status!=='pending'?`<button class="text-button" data-reconsider="${item.recommendation_id}">重新考虑</button>`:''}</div><dl><dt>为什么推荐</dt><dd>${escapeHtml(item.basis)}</dd><dt>收益</dt><dd>${escapeHtml(item.expected_benefit)}</dd><dt>取舍</dt><dd>${escapeHtml(item.tradeoff)}</dd></dl><div class="decision-box"><strong>你的决定</strong><div class="decision-buttons"><button class="button secondary ${d.status==='accepted'?'selected':''}" data-rec="${item.recommendation_id}" data-decision="accept">接受</button><button class="button secondary ${d.status==='rejected'?'selected':''}" data-rec="${item.recommendation_id}" data-decision="reject">拒绝</button></div><label>编辑建议（编辑后需再点击接受）<textarea data-plan-edit="${item.recommendation_id}">${escapeHtml(d.edited_suggestion||item.suggestion)}</textarea></label></div></article>`}).join("")}</div></section>
    ${IS_QA?`<details><summary>QA：Model Trace</summary><pre>${escapeHtml(JSON.stringify({...state.creativePlan.trace,source_brief_revision:state.creativePlan.plan.source_brief_revision},null,2))}</pre></details>`:''}
    <div class="plan-primary-action"><button id="confirmPlan" class="button primary" ${pending?'disabled':''}>进入 Create & Edit</button><p>将根据已确认Brief和当前已接受的Creative Plan建立Design Spec，并生成可编辑SVG草稿。</p></div>`;
  document.querySelectorAll("[data-rec]").forEach(button=>button.addEventListener("click",event=>{state.creativePlan=recordPlanDecision(state.creativePlan,{recommendationId:event.target.dataset.rec,action:event.target.dataset.decision,actor:"human"});state.creativePlan.confirmed=false;saveState();render();}));
  document.querySelectorAll("[data-plan-edit]").forEach(input=>input.addEventListener("change",event=>{state.creativePlan=recordPlanDecision(state.creativePlan,{recommendationId:event.target.dataset.planEdit,action:"edit",actor:"human",editedSuggestion:event.target.value});state.creativePlan.confirmed=false;saveState();render();}));
  document.querySelectorAll("[data-reconsider]").forEach(button=>button.addEventListener("click",()=>{state.creativePlan=recordPlanDecision(state.creativePlan,{recommendationId:button.dataset.reconsider,action:"reconsider",actor:"human"});state.creativePlan.confirmed=false;saveState();render();}));
  document.querySelector("#confirmPlan").addEventListener("click", () => { if (pendingPlan().length) return; state.creativePlan.confirmed = true; state.creativePlan.confirmedAt = new Date().toISOString(); buildDesign(); saveState(); goToStep(4); });
}

function editControls() {
  const spec=state.design.spec,selected=state.design.selectedElement||"title",icons=fixtures.icons.icons.map(icon=>`<option value="${icon.id}">${icon.label}</option>`).join("");
  if(selected==="title")return `<h3>标题属性</h3><label>标题<input id="design-title-input" value="${escapeHtml(spec.content.title)}"></label><label>主色<input id="primary-color" type="color" value="${spec.style.primary_color}"></label>`;
  if(selected.startsWith("step-")){const index=Number(selected.split("-")[1])-1,step=spec.content.steps[index];return `<h3>步骤${index+1}属性</h3><label>标题<input data-step-index="${index}" data-step-key="title" value="${escapeHtml(step.title)}"></label><label>说明<textarea data-step-index="${index}" data-step-key="body">${escapeHtml(step.body)}</textarea></label><label>图标<select data-icon-step="${step.id}">${icons.replace(`value="${spec.icons[step.id]}"`,`value="${spec.icons[step.id]}" selected`)}</select></label>`;}
  if(selected==="footer")return `<h3>页脚属性</h3><label>页脚文字<input id="footer-input" value="${escapeHtml(spec.content.footer||'')}"></label>`;
  if(selected==="visual-elements")return `<h3>视觉辅助属性</h3><label class="switch-row"><input id="visual-enabled" type="checkbox" ${spec.visual_elements.enabled?'checked':''}>显示视觉辅助</label><label>类型<select id="visual-element-type">${[["icon","图标"],["structural_diagram","结构示意"],["simple_illustration","简单插画"],["decorative_pattern","装饰图案"]].map(([v,l])=>`<option value="${v}" ${spec.visual_elements.type===v?'selected':''}>${l}</option>`).join('')}</select></label><p class="help">用途：${spec.visual_elements.purpose.join('、')||'未指定'}<br>来源：MakerFlow本地SVG模板</p>`;
  if(selected==="artboard")return `<h3>成品与版式</h3><div class="inline-fields"><label>成品宽度<input id="canvas-width" type="number" min="10" value="${spec.canvas.width}"></label><label>成品高度<input id="canvas-height" type="number" min="10" value="${spec.canvas.height}"></label><label>单位<input value="${spec.canvas.unit}" disabled></label></div><label>版式<select id="layout-template">${fixtures.layouts.templates.map(x=>`<option value="${x.id}" ${x.id===spec.layout.template_id?'selected':''}>${x.label}</option>`).join('')}</select></label>`;
  if(selected==="cutline")return `<h3>刀线属性</h3><label class="switch-row"><input id="cutline-enabled" type="checkbox" ${spec.cutline.enabled?'checked':''}>显示闭合刀线</label><p class="help">刀线只表达当前文件要求，不代表设备参数或加工安全。</p>`;
  return `<h3>素材</h3><p class="muted">上传PNG/JPG/SVG作为插图素材，不执行图片转SVG。</p>`;
}

function renderStep4() {
  if (!state.design.spec) buildDesign();
  const spec = state.design.spec;
  app.innerHTML = heading(4, "Create & Edit", "MVP从一开始就是SVG；预览中的SVG就是当前作品。", `<span class="status-badge ${preflightIsCurrent() ? 'info' : 'warn'}">${preflightIsCurrent()?'当前作品已检查':'需要Preflight'}</span>`) + `
    <div class="editor-status"><span>${escapeHtml(state.design.sourceLabel)}</span><span>作品版本 ${currentArtifact()?.artifact_revision || '—'}</span><strong>${escapeHtml(state.design.statusMessage || (preflightIsCurrent()?"当前版本已检查":"导出前需要运行Preflight"))}</strong><button id="undoLayout" ${state.design.layoutUndo?'':'disabled'}>Undo</button><button id="resetLayout">重置布局</button></div>
    <div class="create-edit-grid">
      <aside class="structure-panel"><h3>作品结构</h3><nav class="element-list">${[["title","标题"],["step-1","步骤1"],["step-2","步骤2"],["step-3","步骤3"],["footer","页脚"],["visual-elements","视觉辅助"],["artboard","成品与版式"],["cutline","刀线"],["assets","素材"]].map(([id,label])=>{const locked=spec.elements?.[id]?.locked;const status=id==='visual-elements'?(spec.visual_elements.enabled?'显示':'已关闭'):id==='cutline'?(spec.cutline.enabled?'显示 · 已锁定':'隐藏 · 已锁定'):id==='assets'?'通过属性面板管理':locked?'已锁定':'可拖动';return `<div class="element-row ${state.design.selectedElement===id?'active':''}"><button data-select-element="${id}">${label}</button><span>${status}</span></div>`;}).join('')}</nav></aside>
      <section class="design-work"><div class="canvas-toolbar"><strong>作品画布</strong><div><button data-zoom="fit">适应窗口</button><button data-zoom="out">−</button><button data-zoom="100">100%</button><button data-zoom="in">＋</button><span id="zoomLabel">${Math.round(state.design.zoom*100)}%</span></div></div><div id="designPreview" class="svg-preview"><div id="canvasStage" class="canvas-stage" style="transform:translate(${state.design.pan.x}px,${state.design.pan.y}px) scale(${state.design.zoom})">${currentSvg()}</div></div><p class="help">点击作品元素进行选择；拖动画布空白区域可平移。</p></section>
      <aside class="property-panel">${editControls()}<hr><details><summary>上传与下载</summary><label>上传已有SVG<input id="full-svg-upload" type="file" accept="image/svg+xml,.svg"></label><label>上传PNG/JPG/SVG素材<input id="asset-upload" type="file" accept="image/png,image/jpeg,image/svg+xml,.svg"></label><label>素材来源<select id="asset-source"><option value="user_upload">用户上传</option><option value="aimake_export">AImake导出（无API集成）</option><option value="external_tool">其他外部工具</option></select></label><div id="uploadMessage" class="help"></div><button id="downloadCurrentSvg" class="button secondary">下载当前SVG</button></details><details ${IS_QA?'':'hidden'}><summary>QA：Design Spec</summary><pre>${escapeHtml(JSON.stringify(spec,null,2))}</pre></details></aside>
    </div>`;
  bindEditorControls();
  document.querySelector("#downloadCurrentSvg").addEventListener("click", () => downloadTextFile(currentSvg(),"editable_draft.svg","image/svg+xml"));
  document.querySelector("#full-svg-upload").addEventListener("change", handleFullSvgUpload);
  document.querySelector("#asset-upload").addEventListener("change", handleAssetUpload);
  bindCanvasInteractions();
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
function bindCanvasInteractions(){
  document.querySelectorAll('[data-select-element]').forEach(button=>button.addEventListener('click',()=>{state.design.selectedElement=button.dataset.selectElement;saveState();render();}));
  bindCanvasElementClicks();
  document.querySelectorAll('[data-zoom]').forEach(button=>button.addEventListener('click',()=>{const action=button.dataset.zoom;if(action==='fit')state.design.zoom=.9;else if(action==='100')state.design.zoom=1;else state.design.zoom=Math.min(2.5,Math.max(.4,state.design.zoom+(action==='in' ? .15 : -.15)));state.design.pan={x:0,y:0};saveState();render();}));
  const preview=document.querySelector('#designPreview');let panDrag=null,elementDrag=null;
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

function executePreflight() {
  runCurrentArtifactPreflight({artifactStore:state.artifactStore,brief:state.brief,designSpec:state.design.spec,projectState:state.studioReadiness,svgTransform:IS_QA?(svg=>applyQaMutation(svg,state.qaScenario)):null});
  state.routing.confirmedWarnings=[]; state.maxUnlockedStep=Math.max(state.maxUnlockedStep,6); saveState(); render();
}

function renderStep5() {
  const p=currentPreflight();
  app.innerHTML=heading(5,"MakerFlow Preflight","检查Create & Edit当前SVG、已确认Brief和独立project state。",p?`<span class="status-badge ${p.stale?'warn':p.result}">${p.stale?'需要重新检查':severityLabel(p.result)}</span>`:'<span class="status-badge warn">尚未检查</span>')+`
    <div class="notice"><strong>检查对象：</strong>当前作品版本 ${currentArtifact()?.artifact_revision || '—'}。${IS_QA?`QA模式将注入${state.qaScenario.toUpperCase()}测试缺陷，但仍调用真实规则。`:"普通体验不使用预写Mock结果。"}</div>
    ${p?`<div class="preflight-grid">${renderLayer(p.layers.svg)}${renderLayer(p.layers.brief)}${renderLayer(p.layers.studio)}</div><div class="panel"><p>检查作品版本：${p.checked_artifact_revision}</p><p>当前状态：${p.stale?'已过期，需要重新检查':'有效'}</p><p>SVG摘要：${p.checkedSvgHash}</p><p>text：${p.inspection.textCount}；image：${p.inspection.imageCount}；重复ID：${p.inspection.duplicateIds.length}</p></div>`:'<div class="empty">运行后将显示三层真实检查结果。</div>'}
    <div class="action-row"><button id="runPreflight" class="button primary">${p?"重新检查当前SVG":"检查当前SVG"}</button></div>`;
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
  app.innerHTML=heading(6,"Resolve Issues","问题不会被按钮假装修复；修改后必须重新检查当前SVG。",`<span class="status-badge ${p.result}">${severityLabel(p.result)}</span>`)+`
    <section class="routing-group"><h3>A. 导入前必须解决或确认</h3>${before.length?before.map(renderIssue).join(""):'<div class="empty">当前没有导入前问题。</div>'}</section>
    <section class="routing-group"><h3>B. Studio内待办</h3>${studio.map(renderIssue).join("")}</section>
    <div class="action-row"><label class="button secondary">上传外部工具修改后的SVG<input id="resolved-svg-upload" type="file" accept="image/svg+xml,.svg" hidden></label><button id="rerunFromIssues" class="button primary">重新检查当前SVG</button></div>`;
  document.querySelectorAll("[data-return-edit]").forEach(button=>button.addEventListener("click",()=>{state.design.focusTarget=button.dataset.returnEdit;state.currentStep=4;saveState();render();}));
  document.querySelectorAll("[data-download-external]").forEach(button=>button.addEventListener("click",()=>downloadTextFile(currentSvg(),"external_fix_needed.svg","image/svg+xml")));
  document.querySelectorAll("[data-confirm-warn]").forEach(button=>button.addEventListener("click",()=>{const artifact=currentArtifact(),report=currentPreflight();recordHumanWarningConfirmation({decisionLog:state.decisionLog,issueId:button.dataset.confirmWarn,artifactRevision:artifact.artifact_revision,checkedArtifactRevision:report.checked_artifact_revision,humanConfirmation:true,actor:"human"});state.maxUnlockedStep=Math.max(state.maxUnlockedStep,7);saveState();render();}));
  document.querySelector("#resolved-svg-upload").addEventListener("change",handleFullSvgUpload);
  document.querySelector("#rerunFromIssues").addEventListener("click",()=>{state.currentStep=5;executePreflight();});
}

function renderStep7() {
  const exportGate=canExportCurrentArtifact(state.artifactStore,state.decisionLog);
  if(!exportGate.allowed){state.currentStep=5;renderStep5();return;}
  const p=currentPreflight(),artifact=currentArtifact();
  const confirmed=state.brief.fields.filter(field=>field.status==="confirmed");
  const handoff=evaluateHandoffCompletion({brief:state.brief,svgExportAllowed:exportGate.allowed});
  const pdfRequiredBlocked=handoff.artifact_exports.pdf.status==="unsupported"&&handoff.completion_gate==="blocked";
  const pdfPreferredWarn=handoff.warnings.includes("PREFERRED_PDF_UNSUPPORTED");
  const statusClass=pdfRequiredBlocked?"block":pdfPreferredWarn?"warn":"pass";
  const statusText=pdfRequiredBlocked?"SVG可导出 · 交接未完成":pdfPreferredWarn?"SVG可导出 · PDF暂不支持":"允许导出";
  app.innerHTML=heading(7,"Export & Handoff","SVG是主要交付文件；项目记录不会被Studio自动读取。",`<span class="status-badge ${statusClass}">${statusText}</span>`)+`
    <div class="summary-grid"><section class="panel"><h3>当前作品</h3><div class="file-preview"><div class="mini-svg">${artifact.svg}</div><div><strong>verified_design.svg</strong><p>作品版本 ${artifact.artifact_revision} · ${p.checkedSvgHash}</p><button id="downloadVerified" class="button primary">下载当前SVG</button></div></div><h3>交付状态</h3><ul><li>SVG：${handoff.artifact_exports.svg.status} / exportable</li><li>PDF：${handoff.artifact_exports.pdf.status}</li><li>部分导出：${handoff.partial_export.allowed?"allowed":"blocked"}</li><li>整体交接：${handoff.handoff_completion}</li><li>完成门禁：${handoff.completion_gate}</li></ul>${pdfRequiredBlocked?'<div class="boundary">PDF是required，但当前MakerFlow不生成Verified PDF。可以下载已完成SVG；整体Handoff保持incomplete。</div>':pdfPreferredWarn?'<div class="boundary">PDF是preferred，但当前不支持。此项作为WARN，不阻止SVG交付。</div>':''}<p class="muted">浏览器打印不属于MakerFlow验证产物。</p><h3>Preflight摘要</h3><ul><li>SVG File Check：${severityLabel(p.layers.svg.status)}</li><li>Brief Consistency Check：${severityLabel(p.layers.brief.status)}</li><li>Studio Readiness Checklist：${severityLabel(p.layers.studio.status)}</li></ul><h3>未覆盖风险</h3><ul><li>未验证真实材料和设备兼容性</li><li>未验证真实xTool Studio导入行为 [待实际验证]</li><li>未验证功率、速度、次数、安全参数和加工效果</li></ul></section><section class="panel"><h3>已确认事项</h3><ul>${confirmed.map(field=>`<li><strong>${field.label}</strong>：${escapeHtml(field.value)}</li>`).join("")}</ul><h3>Studio内待完成</h3><ul class="checklist"><li>设备</li><li>材料</li><li>加工参数</li><li>Preview</li><li>Framing或试样</li><li>加工前人工确认</li></ul><p class="muted">Brief、内部Design Spec和Preflight报告属于用户项目记录，不会被xTool Studio自动读取。</p></section></div><div class="boundary">通过MakerFlow当前规则，不代表保证加工成功。</div>`;
  document.querySelector("#downloadVerified").addEventListener("click",()=>downloadTextFile(artifact.svg,"verified_design.svg","image/svg+xml"));
}

function render() {
  ({1:renderStep1,2:renderStep2,3:renderStep3,4:renderStep4,5:renderStep5,6:renderStep6,7:renderStep7})[state.currentStep]();
  if(IS_QA){const artifact=currentArtifact(),report=currentPreflight();app.insertAdjacentHTML("beforeend",`<aside class="panel" id="qaStatePanel"><h3>QA Canonical State</h3><pre>${escapeHtml(JSON.stringify({model_trace:sanitizeModelTrace(state.extractRequest?.trace),design_spec_revision:state.design.spec?.design_spec_revision??null,current_artifact_revision:artifact?.artifact_revision??null,checked_artifact_revision:report?.checked_artifact_revision??null,preflight_stale:report?.stale??null,preflight_result:report?.result??null,authoring_source:artifact?.authoring_source??null,design_spec_status:artifact?.design_spec_status??null,warn_decisions:state.decisionLog.records.map(item=>({issue_id:item.issue_id,artifact_revision:item.artifact_revision,confirmed:item.human_confirmation,actor:item.actor}))},null,2))}</pre></aside>`);} updateNavigation();
}

scenarioSelect.addEventListener("change",event=>{state.qaScenario=event.target.value;if(state.currentStep>5)state.currentStep=5;saveState();render();});
resetButton.addEventListener("click",()=>{localStorage.removeItem(STORAGE_KEY);state=defaultState();state.studioReadiness=structuredClone(fixtures.projectState);render();});
prevButton.addEventListener("click",()=>goToStep(state.currentStep-1));
nextButton.addEventListener("click",()=>{if(!gateForNext())unlockNext();});
document.querySelectorAll(".stepper button").forEach(button=>button.addEventListener("click",()=>goToStep(Number(button.dataset.step))));

loadFixtures().then(render).catch(error=>{console.error(error);app.innerHTML=`<div class="notice block"><h2>本地数据加载失败</h2><p>${escapeHtml(error.message)}</p><p>请通过静态服务器运行。</p></div>`;});
