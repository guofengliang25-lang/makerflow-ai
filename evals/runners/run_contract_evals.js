const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const projectRoot = path.resolve(__dirname, "../..");
const datasetPath = path.join(projectRoot, "evals/contract/cases.json");

const stable = value => JSON.stringify(value, null, 2);
const same = (actual, expected) => stable(actual) === stable(expected);

function baseSpec() {
  return {
    design_spec_revision: 1,
    canvas: { width: 148, height: 105, unit: "mm" },
    content: { title:"MomoRay 高度调节说明", steps:[], footer:"使用前请确认" },
    layout: { template_id:"three-column" },
    style: { primary_color:"#333333", background_color:"#ffffff" },
    icons: {},
    elements: { title:{ id:"title", position:{x:0,y:0}, draggable:true, locked:false } },
    visual_elements: { enabled: true, type: "structural_diagram" },
    illustration: { enabled:false },
    output_requirements: { pure_vector: true, text_strategy: "editable", required_format: "svg" },
    cutline: { required: true, enabled: true }
  };
}

function baseBrief(width = 148, height = 105) {
  return {
    fields: [
      { id: "finished_width", value: String(width), status: "confirmed" },
      { id: "finished_height", value: String(height), status: "confirmed" },
      { id: "finished_unit", value: "mm", status: "confirmed" }
    ],
    visual_aid_requirement: { status: "required" }
  };
}

function baseProjectState(materialStatus = "confirmed") {
  return {
    device: { status: "confirmed" },
    material: { status: materialStatus },
    processing_parameters: { status: "confirmed" },
    preview: { status: "completed", completed: true },
    framing: { status: "completed", completed: true }
  };
}

function validSvg(width = 148, height = 105, revision = 1) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}" data-design-revision="${revision}"><text id="title">标题</text><path id="cutline" data-role="cutline" d="M 1 1 H ${width - 1} V ${height - 1} H 1 Z"/></svg>`;
}

async function loadModules() {
  const load = relative => import(pathToFileURL(path.join(projectRoot, relative)).href);
  const [planPolicy, preflight, workflowState, artifactManager, designState, decisionLog, briefValidate] = await Promise.all([
    load("prototype/plan-policy.js"),
    load("prototype/preflight.js"),
    load("prototype/workflow-state.js"),
    load("prototype/artifact-manager.js"),
    load("prototype/design-state.js"),
    load("prototype/decision-log.js"),
    load("prototype/brief-validate.js")
  ]);
  return { planPolicy, preflight, workflowState, artifactManager, designState, decisionLog, briefValidate };
}

function assertResult(condition, expected, actual, reason) {
  return condition
    ? { passed: true, expected, actual }
    : { passed: false, expected, actual, reason };
}

function createExecutors(modules) {
  return {
    brief_validate_a6(evalCase) {
      const result=modules.briefValidate.validateBrief({brief_candidate:evalCase.input.brief_candidate});
      const actual=result.brief_validation_result.normalized_finished_size;
      const expected=evalCase.expected.output_constraints;
      return assertResult(
        same(actual,expected),
        expected,
        actual,
        "brief.validate未返回E02要求的A6规范化结果。"
      );
    },

    plan_filter_confirmed(evalCase) {
      const result = modules.planPolicy.splitCreativePlan(evalCase.input.brief, evalCase.input.recommendations);
      const actual = {
        locked_contains: result.locked.some(item => item.id === "finished_size") ? "finished_size" : null,
        suggestion_ids: result.suggestions.map(item => item.id)
      };
      const expected = evalCase.expected.output_constraints;
      return assertResult(same(actual, expected), expected, actual, "confirmed尺寸仍进入Recommendation或未进入locked constraints。 ");
    },

    svg_malformed_block(evalCase) {
      const result = modules.preflight.runPreflight({
        svgString: evalCase.input.svg,
        brief: baseBrief(),
        designSpec: baseSpec(),
        projectState: baseProjectState(),
        artifactRevision: evalCase.input.artifact_revision
      });
      const parseIssue = result.issues.find(item => item.issue_id === "SVG-PARSE-001");
      const actual = { result: result.result, issue_id: parseIssue?.issue_id || null, severity: parseIssue?.severity || null };
      const expected = evalCase.expected.output_constraints;
      return assertResult(same(actual, expected), expected, actual, "Malformed SVG未形成预期解析BLOCK。 ");
    },

    brief_size_conflict(evalCase) {
      const result = modules.preflight.runPreflight({
        svgString: validSvg(evalCase.input.svg_width, evalCase.input.svg_height, evalCase.input.artifact_revision),
        brief: baseBrief(evalCase.input.brief_width, evalCase.input.brief_height),
        designSpec: baseSpec(),
        projectState: baseProjectState(),
        artifactRevision: evalCase.input.artifact_revision
      });
      const sizeIssue = result.issues.find(item => item.issue_id === "BRIEF-SIZE-001");
      const actual = { result: result.result, issue_id: sizeIssue?.issue_id || null, severity: sizeIssue?.severity || null };
      const expected = evalCase.expected.output_constraints;
      return assertResult(same(actual, expected), expected, actual, "Brief与SVG尺寸冲突未形成预期BLOCK。 ");
    },

    studio_material_pending(evalCase) {
      const result = modules.preflight.runPreflight({
        svgString: validSvg(),
        brief: baseBrief(),
        designSpec: baseSpec(),
        projectState: baseProjectState(evalCase.input.material.status),
        revision: 1
      });
      const materialIssue = result.issues.find(item => item.issue_id === "STUDIO-MATERIAL-001");
      const actual = {
        studio_issue_id: materialIssue?.issue_id || null,
        studio_severity: materialIssue?.severity || null,
        pre_import_result: result.result
      };
      const expected = evalCase.expected.output_constraints;
      return assertResult(same(actual, expected), expected, actual, "材料pending没有保持为Studio待办，或错误阻塞了Pre-import。 ");
    },

    workflow_revision_invalidation(evalCase) {
      const store = modules.artifactManager.createArtifactStore();
      const spec = baseSpec();
      spec.design_spec_revision = evalCase.input.design_spec_revision;
      const artifactR1 = modules.workflowState.persistNativeDesign({ artifactStore:store, designSpec:spec });
      const reportR1 = modules.workflowState.runCurrentArtifactPreflight({
        artifactStore:store,
        brief:baseBrief(),
        designSpec:spec,
        projectState:baseProjectState()
      });
      spec.elements.title.position.x = 8;
      modules.designState.markDesignSpecEdited(spec);
      const artifactR2 = modules.workflowState.persistNativeDesign({ artifactStore:store, designSpec:spec });
      const blockedBeforeRerun = modules.workflowState.canExportCurrentArtifact(store);
      const reportR2 = modules.workflowState.runCurrentArtifactPreflight({
        artifactStore:store,
        brief:baseBrief(),
        designSpec:spec,
        projectState:baseProjectState()
      });
      const allowedAfterRerun = modules.workflowState.canExportCurrentArtifact(store);
      const canonicalChainPassed = artifactR1.artifact_revision === evalCase.input.artifact_revision
        && reportR1.checked_artifact_revision === evalCase.input.checked_artifact_revision
        && spec.design_spec_revision === evalCase.input.design_spec_revision + 1
        && artifactR2.artifact_revision === artifactR1.artifact_revision + 1
        && reportR1.stale === true
        && reportR1.checked_artifact_revision === artifactR1.artifact_revision
        && blockedBeforeRerun.allowed === false
        && reportR2.checked_artifact_revision === artifactR2.artifact_revision
        && reportR2.stale === false
        && allowedAfterRerun.allowed === true;
      const actual = canonicalChainPassed ? {
        revision_incremented:true,
        preflight_current:false,
        export_allowed:false
      } : {
        revision_incremented:spec.design_spec_revision > evalCase.input.design_spec_revision && artifactR2.artifact_revision > artifactR1.artifact_revision,
        preflight_current:!reportR1.stale,
        export_allowed:blockedBeforeRerun.allowed,
        evidence:{
          design_spec_revision:spec.design_spec_revision,
          artifact_revision:artifactR2.artifact_revision,
          old_checked_artifact_revision:reportR1.checked_artifact_revision,
          old_stale:reportR1.stale,
          new_checked_artifact_revision:reportR2.checked_artifact_revision,
          new_stale:reportR2.stale,
          export_after_rerun:allowedAfterRerun.allowed
        }
      };
      const expected = evalCase.expected.output_constraints;
      return assertResult(canonicalChainPassed && same(actual, expected), expected, actual, "Canonical Artifact/Preflight revision workflow不符合E10。 ");
    },

    workflow_warn_human_gate(evalCase) {
      const store=modules.artifactManager.createArtifactStore();
      const decisions=modules.decisionLog.createDecisionLog();
      const spec=baseSpec();
      spec.design_spec_revision=1;
      spec.visual_elements.enabled=false;
      const artifactR1=modules.workflowState.persistNativeDesign({artifactStore:store,designSpec:spec});
      const reportR1=modules.workflowState.runCurrentArtifactPreflight({artifactStore:store,brief:baseBrief(),designSpec:spec,projectState:baseProjectState()});
      const warningR1=reportR1.issues.find(item=>item.severity==="warn");
      const before=modules.workflowState.evaluateHumanAuthorityGate({artifactStore:store,decisionLog:decisions});
      modules.decisionLog.recordHumanWarningConfirmation({decisionLog:decisions,issueId:warningR1.issue_id,artifactRevision:artifactR1.artifact_revision,checkedArtifactRevision:reportR1.checked_artifact_revision,humanConfirmation:true,actor:"human",timestamp:"2026-08-23T10:00:00.000Z"});
      const after=modules.workflowState.evaluateHumanAuthorityGate({artifactStore:store,decisionLog:decisions});

      spec.content.title="新版说明";
      modules.designState.markDesignSpecEdited(spec);
      const artifactR2=modules.workflowState.persistNativeDesign({artifactStore:store,designSpec:spec});
      const reportR2=modules.workflowState.runCurrentArtifactPreflight({artifactStore:store,brief:baseBrief(),designSpec:spec,projectState:baseProjectState()});
      const oldDecisionCannotAuthorizeR2=!modules.workflowState.evaluateHumanAuthorityGate({artifactStore:store,decisionLog:decisions}).allowed;
      modules.decisionLog.recordHumanWarningConfirmation({decisionLog:decisions,issueId:warningR1.issue_id,artifactRevision:artifactR2.artifact_revision,checkedArtifactRevision:reportR2.checked_artifact_revision,humanConfirmation:true,actor:"human",timestamp:"2026-08-23T10:01:00.000Z"});
      modules.workflowState.runCurrentArtifactPreflight({artifactStore:store,brief:baseBrief(),designSpec:spec,projectState:baseProjectState(),svgTransform:svg=>svg.replace("</svg>",'<path id="cutline" d="M 0 0"/></svg>')});
      const blockCannotBeBypassed=!modules.workflowState.evaluateHumanAuthorityGate({artifactStore:store,decisionLog:decisions}).allowed;
      const canonicalChainPassed=before.reason==="BLOCKED_BY_HUMAN_CONFIRMATION"
        && after.allowed===true
        && decisions.records.length===2
        && decisions.records[0].artifact_revision===artifactR1.artifact_revision
        && oldDecisionCannotAuthorizeR2
        && blockCannotBeBypassed;
      const actual=canonicalChainPassed?{
        route_before_confirmation:"T15",
        export_before_confirmation:false,
        export_after_confirmation:true
      }:{
        route_before_confirmation:before.reason==="BLOCKED_BY_HUMAN_CONFIRMATION"?"T15":null,
        export_before_confirmation:before.allowed,
        export_after_confirmation:after.allowed,
        evidence:{oldDecisionCannotAuthorizeR2,blockCannotBeBypassed,decision_count:decisions.records.length}
      };
      const expected=evalCase.expected.output_constraints;
      return assertResult(canonicalChainPassed&&same(actual,expected),expected,actual,"Revision-bound WARN Human Gate不符合E11。 ");
    }
  };
}

function validateDataset(dataset) {
  if (!dataset || !Array.isArray(dataset.cases)) throw new Error("INVALID_DATASET: cases必须是数组");
  const ids = dataset.cases.map(item => item.eval_id);
  if (new Set(ids).size !== ids.length) throw new Error("INVALID_DATASET: eval_id必须唯一");
  const allowedGraders = new Set(["deterministic", "human_rubric", "model_grader_future"]);
  const allowedDefinitionStatuses = new Set(["draft", "reviewed", "approved"]);
  const allowedExecutionStatuses = new Set(["manual_only", "runnable_local", "provider_required", "blocked"]);
  const allowedLatestRunStatuses = new Set(["not_run", "pass", "fail", "skipped", "error"]);
  for (const item of dataset.cases) {
    if (!allowedGraders.has(item.grader_type)) throw new Error(`INVALID_DATASET: ${item.eval_id} grader_type非法`);
    if (!allowedDefinitionStatuses.has(item.definition_status)) throw new Error(`INVALID_DATASET: ${item.eval_id} definition_status非法`);
    if (!allowedExecutionStatuses.has(item.execution_status)) throw new Error(`INVALID_DATASET: ${item.eval_id} execution_status非法`);
    if (!allowedLatestRunStatuses.has(item.latest_run_status)) throw new Error(`INVALID_DATASET: ${item.eval_id} latest_run_status非法`);
    if (Object.hasOwn(item, "current_status")) throw new Error(`INVALID_DATASET: ${item.eval_id}不得继续使用current_status`);
  }
}

function skippedResult(evalCase) {
  return {
    eval_id: evalCase.eval_id,
    status: "SKIPPED_PROVIDER_REQUIRED",
    failure_reason: "SKIPPED_PROVIDER_REQUIRED: 本地Contract Runner不执行真实Provider或Human Rubric。"
  };
}

function failedResult(evalCase, reason, expected, actual) {
  return {
    eval_id: evalCase.eval_id,
    status: "FAIL",
    failure_reason: reason,
    expected,
    actual
  };
}

async function runCase(evalCase, executors) {
  if (evalCase.execution_status === "provider_required" || evalCase.automation.provider_required) return skippedResult(evalCase);
  const executor = executors[evalCase.automation.executor];
  if (!executor) {
    return failedResult(
      evalCase,
      `EXECUTOR_UNAVAILABLE: 当前产品没有可由Node Runner调用的${evalCase.category}执行入口。`,
      evalCase.expected,
      { executor: evalCase.automation.executor, available: false }
    );
  }
  try {
    const assertion = await executor(evalCase);
    if (!assertion.passed) return failedResult(evalCase, assertion.reason, assertion.expected, assertion.actual);
    return { eval_id: evalCase.eval_id, status: "PASS", failure_reason: null };
  } catch (error) {
    return { eval_id:evalCase.eval_id, status:"ERROR", failure_reason:`RUNNER_ERROR: ${error.message}`, expected:evalCase.expected, actual:{ error:error.stack || error.message } };
  }
}

function buildReport(results) {
  return {
    total: results.length,
    pass: results.filter(item => item.status === "PASS").length,
    fail: results.filter(item => item.status === "FAIL").length,
    skipped: results.filter(item => item.status === "SKIPPED_PROVIDER_REQUIRED").length,
    error: results.filter(item => item.status === "ERROR").length,
    results
  };
}

function markdownReport(report) {
  const lines = [
    "# MakerFlow Contract Eval Baseline — brief.validate Contract Owner v0.4",
    "",
    "> Provider: none（未调用真实模型API）  ",
    `> Generated at: ${new Date().toISOString()}  `,
    "> Dataset: `evals/contract/cases.json`",
    "",
    "## Summary",
    "",
    `- total: ${report.total}`,
    `- pass: ${report.pass}`,
    `- fail: ${report.fail}`,
    `- skipped: ${report.skipped}`,
    `- error: ${report.error}`,
    "",
    "## Results",
    "",
    "| eval_id | status | failure_reason |",
    "|---|---|---|",
    ...report.results.map(item => `| ${item.eval_id} | ${item.status} | ${(item.failure_reason || "—").replace(/\|/g, "\\|")} |`)
  ];
  const failures = report.results.filter(item => item.status === "FAIL" || item.status === "ERROR");
  if (failures.length) {
    lines.push("", "## Failures");
    for (const item of failures) {
      lines.push(
        "",
        `### ${item.eval_id}`,
        "",
        `- failure_reason: ${item.failure_reason}`,
        "- Expected:",
        "",
        "```json",
        stable(item.expected),
        "```",
        "",
        "- Actual:",
        "",
        "```json",
        stable(item.actual),
        "```"
      );
    }
  }
  lines.push("", "## Boundary", "", "SKIPPED不计为PASS。本报告未调用模型API，也未修改产品逻辑或Expected。", "");
  return lines.join("\n");
}

function printHuman(report) {
  console.log(`total=${report.total} pass=${report.pass} fail=${report.fail} skipped=${report.skipped} error=${report.error}`);
  for (const item of report.results) {
    console.log(`${item.eval_id} ${item.status}${item.failure_reason ? ` — ${item.failure_reason}` : ""}`);
    if (item.status === "FAIL" || item.status === "ERROR") {
      console.log(`Expected:\n${stable(item.expected)}`);
      console.log(`Actual:\n${stable(item.actual)}`);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes("--json");
  const reportIndex = args.indexOf("--report");
  const reportPath = reportIndex >= 0 ? args[reportIndex + 1] : null;
  if (reportIndex >= 0 && !reportPath) throw new Error("--report需要文件路径");

  const dataset = JSON.parse(fs.readFileSync(datasetPath, "utf8"));
  validateDataset(dataset);
  const modules = await loadModules();
  const executors = createExecutors(modules);
  const results = [];
  for (const evalCase of dataset.cases) results.push(await runCase(evalCase, executors));
  const report = buildReport(results);

  if (reportPath) {
    const absoluteReportPath = path.resolve(projectRoot, reportPath);
    fs.mkdirSync(path.dirname(absoluteReportPath), { recursive: true });
    fs.writeFileSync(absoluteReportPath, markdownReport(report), "utf8");
  }

  if (jsonMode) console.log(JSON.stringify(report));
  else printHuman(report);
  process.exitCode = report.fail > 0 || report.error > 0 ? 1 : 0;
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 2;
});
