import test from "node:test";
import assert from "node:assert/strict";
import { createArtifactStore } from "../artifact-manager.js";
import * as workflow from "../workflow-state.js";
const decisions = await import("../decision-log.js").catch(() => ({}));

const brief = {
  fields: [
    { id:"finished_width", value:"148", status:"confirmed" },
    { id:"finished_height", value:"105", status:"confirmed" },
    { id:"finished_unit", value:"mm", status:"confirmed" }
  ],
  visual_aid_requirement:{ status:"required" }
};

const projectState = {
  device:{status:"confirmed"}, material:{status:"confirmed"},
  processing_parameters:{status:"confirmed"}, preview:{status:"completed"}, framing:{status:"completed"}
};

function spec() {
  return {
    design_spec_revision:1,
    canvas:{width:148,height:105,unit:"mm"},
    content:{title:"说明",steps:[],footer:"使用提示"}, layout:{template_id:"three-column"},
    style:{primary_color:"#333",background_color:"#fff"}, icons:{},
    elements:{title:{id:"title",position:{x:0,y:0},draggable:true,locked:false}},
    visual_elements:{enabled:false}, illustration:{enabled:false},
    cutline:{required:true,enabled:true},
    output_requirements:{pure_vector:true,text_strategy:"editable",required_format:"svg"}
  };
}

function setupWarn() {
  assert.equal(typeof decisions.createDecisionLog,"function");
  assert.equal(typeof decisions.recordHumanWarningConfirmation,"function");
  assert.equal(typeof workflow.evaluateHumanAuthorityGate,"function");
  const artifactStore=createArtifactStore(), decisionLog=decisions.createDecisionLog(), designSpec=spec();
  const artifact=workflow.persistNativeDesign({artifactStore,designSpec});
  const report=workflow.runCurrentArtifactPreflight({artifactStore,brief,designSpec,projectState});
  const warning=report.issues.find(item=>item.severity==="warn");
  assert.ok(warning);
  return {artifactStore,decisionLog,designSpec,artifact,report,warning};
}

function confirmCurrent(context) {
  return decisions.recordHumanWarningConfirmation({
    decisionLog:context.decisionLog,
    issueId:context.warning.issue_id,
    artifactRevision:context.artifact.artifact_revision,
    checkedArtifactRevision:context.report.checked_artifact_revision,
    humanConfirmation:true,
    actor:"human",
    timestamp:"2026-08-23T10:00:00.000Z"
  });
}

test("current Artifact WARN未确认时被Human Gate阻止", () => {
  const context=setupWarn();
  assert.deepEqual(workflow.evaluateHumanAuthorityGate(context),{
    allowed:false,
    decision:"block",
    reason:"BLOCKED_BY_HUMAN_CONFIRMATION",
    unconfirmed_warning_ids:[context.warning.issue_id]
  });
});

test("显式Human确认当前WARN后允许当前Artifact继续", () => {
  const context=setupWarn();
  const decision=confirmCurrent(context);

  assert.equal(decision.decision_id,"D-1");
  assert.equal(decision.issue_id,context.warning.issue_id);
  assert.equal(decision.artifact_revision,1);
  assert.equal(decision.checked_artifact_revision,1);
  assert.equal(decision.human_confirmation,true);
  assert.equal(decision.decision_type,"warn_risk_acceptance");
  assert.equal(decision.actor,"human");
  assert.equal(workflow.evaluateHumanAuthorityGate(context).allowed,true);
});

test("Artifact变为r2后旧r1 WARN确认不能复用", () => {
  const context=setupWarn();
  confirmCurrent(context);
  context.designSpec.content.title="新版说明";
  context.designSpec.design_spec_revision=2;
  context.artifact=workflow.persistNativeDesign({artifactStore:context.artifactStore,designSpec:context.designSpec});
  context.report=workflow.runCurrentArtifactPreflight({artifactStore:context.artifactStore,brief,designSpec:context.designSpec,projectState});

  const gate=workflow.evaluateHumanAuthorityGate(context);
  assert.equal(context.artifact.artifact_revision,2);
  assert.equal(gate.allowed,false);
  assert.equal(gate.reason,"BLOCKED_BY_HUMAN_CONFIRMATION");
});

test("Artifact变化后旧Decision仍保留在Decision Log", () => {
  const context=setupWarn();
  const oldDecision=confirmCurrent(context);
  context.designSpec.content.title="新版说明";
  context.designSpec.design_spec_revision=2;
  workflow.persistNativeDesign({artifactStore:context.artifactStore,designSpec:context.designSpec});

  assert.equal(context.decisionLog.records.length,1);
  assert.equal(context.decisionLog.records[0],oldDecision);
  assert.equal(context.decisionLog.records[0].artifact_revision,1);
});

test("BLOCK不能被当前WARN Human Confirm绕过", () => {
  const context=setupWarn();
  confirmCurrent(context);
  context.report=workflow.runCurrentArtifactPreflight({
    artifactStore:context.artifactStore,
    brief,
    designSpec:context.designSpec,
    projectState,
    svgTransform:svg=>svg.replace("</svg>",'<path id="cutline" d="M 0 0"/></svg>')
  });

  const gate=workflow.evaluateHumanAuthorityGate(context);
  assert.equal(context.report.result,"block");
  assert.equal(gate.allowed,false);
  assert.equal(gate.reason,"PREFLIGHT_BLOCK");
});
