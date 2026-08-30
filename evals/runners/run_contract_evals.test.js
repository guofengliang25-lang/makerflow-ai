const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const projectRoot = path.resolve(__dirname, "../..");
const datasetPath = path.join(projectRoot, "evals/contract/cases.json");
const runnerPath = path.join(projectRoot, "evals/runners/run_contract_evals.js");

test("Eval Dataset使用三层Lifecycle且E10归属Workflow State", () => {
  const dataset = JSON.parse(fs.readFileSync(datasetPath, "utf8"));
  for (const evalCase of dataset.cases) {
    assert.ok(["draft", "reviewed", "approved"].includes(evalCase.definition_status), `${evalCase.eval_id} definition_status`);
    assert.ok(["manual_only", "runnable_local", "provider_required", "blocked"].includes(evalCase.execution_status), `${evalCase.eval_id} execution_status`);
    assert.ok(["not_run", "pass", "fail", "skipped", "error"].includes(evalCase.latest_run_status), `${evalCase.eval_id} latest_run_status`);
    assert.equal(Object.hasOwn(evalCase, "current_status"), false, `${evalCase.eval_id} must not retain current_status`);
  }

  const e10 = dataset.cases.find(item => item.eval_id === "E10");
  const e02 = dataset.cases.find(item => item.eval_id === "E02");
  assert.equal(e10.target_skill, null);
  assert.equal(e10.target_system, "workflow_orchestrator_artifact_state");
  assert.equal(e10.execution_status, "runnable_local");
  assert.equal(e10.automation.executor, "workflow_revision_invalidation");
  assert.equal(e10.input.design_spec_revision, 1);
  assert.equal(e10.input.artifact_revision, 1);
  assert.equal(e10.input.checked_artifact_revision, 1);
  assert.equal(Object.hasOwn(e10.input, "initial_revision"), false);
  assert.equal(Object.hasOwn(e10.input, "checked_revision"), false);
  assert.equal(e02.execution_status,"runnable_local");
  assert.equal(e02.latest_run_status,"pass");
});

test("Contract Eval Runner通过真实Workflow入口执行E10并分别统计error", () => {
  const run = spawnSync(process.execPath, [runnerPath, "--json"], {
    cwd: projectRoot,
    encoding: "utf8"
  });
  assert.ok(run.stdout.trim(), run.stderr);
  const report = JSON.parse(run.stdout);
  const e10 = report.results.find(item => item.eval_id === "E10");
  const e11 = report.results.find(item => item.eval_id === "E11");
  const e02 = report.results.find(item => item.eval_id === "E02");

  assert.equal(e02.status,"PASS");
  assert.equal(e10.status, "PASS");
  assert.equal(e11.status, "PASS");
  assert.equal(typeof report.error, "number");
  assert.equal(report.total, report.pass + report.fail + report.skipped + report.error);
});
