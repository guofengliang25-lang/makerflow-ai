# MakerFlow Canonical Agent, Skill, and Contract Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Synchronize the current Task Graph, Node I/O Matrix, 11-skill registry, and all 11 Core Skill contracts with the 2026-08-17 human Decision.

**Architecture:** Keep execution responsibility in the Task Graph and stable capability boundaries in Skill Contracts. Make `svg.render` a pure `design_spec -> svg` renderer, while Artifact Manager remains Orchestrator / Project State infrastructure responsible for persistence, revision lineage, and Preflight invalidation.

**Tech Stack:** Markdown, Mermaid, Node.js built-in test runner.

## Global Constraints

- Core Skill exactly 11.
- T14 `issue.safe_fix` is Future / Backlog only and is absent from the Current Execution Path.
- Do not renumber T15–T17.
- Artifact Manager is Orchestrator / Project State Infrastructure, not a Skill and not a Task.
- T08 accepts only `design_spec`; External SVG does not enter T08.
- `svg.render`: Input = `design_spec`; Output = `svg`; Side Effects = `none`.
- Use only `brief_revision`, `design_spec_revision`, `artifact_revision`, `source_design_spec_revision`, and `checked_artifact_revision` in their respective domains.
- Preserve historical baselines; do not change Eval Expected values.
- Do not claim DeepSeek, xTool, AImake Studio, complete PDF handoff, production safety, or real provider integration.

---

### Task 1: Canonical validation harness

**Files:**
- Create: `tests/canonical_sync.test.js`

**Interfaces:**
- Consumes: current canonical Markdown, Mermaid, Registry, and Contract files.
- Produces: executable validation of Core Skill count, paths, task routing, renderer purity, and revision vocabulary.

- [ ] Write tests that parse the real canonical artifacts and assert the Decision invariants.
- [ ] Run `node --test tests/canonical_sync.test.js` and confirm failures identify the existing T14 path, T08 external SVG input, renderer side effects, wrong paths, and generic revision names.

### Task 2: Task Graph and Node I/O sync

**Files:**
- Modify: `docs/07.agent/06_Agent_Task_Graph_v1.0.md`
- Modify: `docs/07.agent/06_agent_task_graph.mmd`
- Modify: `docs/07.agent/06_node_io_matrix.md`

**Interfaces:**
- Consumes: 2026-08-17 Decision.
- Produces: Current Execution Path T01–T13, T15–T17; historical T14 Backlog marker; pure T08 boundary; Artifact Manager infrastructure responsibility.

- [ ] Remove all Current Execution Path edges into or out of T14 without renumbering T15–T17.
- [ ] Change T08 to consume only `design_spec` and return only `svg`, with no side effects.
- [ ] Document External SVG ingestion outside T08 and assign persistence/revision/invalidation to Artifact Manager infrastructure without adding a Task or Skill.
- [ ] Run the canonical validation test and confirm Task Graph / Matrix assertions pass.

### Task 3: Skill Registry v1.1 sync

**Files:**
- Modify: `docs/skills/07_Skill_Registry_v1.1.md`

**Interfaces:**
- Consumes: Task Graph and Matrix boundaries from Task 2.
- Produces: exactly 11 Core Skill rows with existing Contract paths.

- [ ] Keep exactly 11 Core Skills and move `issue.safe_fix` wording to historical Future / Backlog only.
- [ ] Make `svg.render` input/output/side effects exactly `design_spec` / `svg` / `none`.
- [ ] Correct every `contract_path` to `docs/skills/Skill_Contract/<skill_id>.contract.md` and verify every path exists.
- [ ] Run the canonical validation test and confirm Registry assertions pass.

### Task 4: Pure `svg.render` Contract

**Files:**
- Modify: `docs/skills/Skill_Contract/svg.render.contract.md`

**Interfaces:**
- Consumes: validated `design_spec`.
- Produces: `svg` with no side effects.

- [ ] Remove Artifact persistence, `artifact_revision`, `source_design_spec_revision`, and Preflight invalidation from Renderer responsibilities.
- [ ] State that Artifact Manager infrastructure owns those concerns after Renderer returns.
- [ ] Run the canonical validation test and confirm renderer purity assertions pass.

### Task 5: Remaining Core Skill Contracts

**Files:**
- Modify: the other 10 files under `docs/skills/Skill_Contract/`.

**Interfaces:**
- Consumes: canonical revision vocabulary and updated Task Graph boundaries.
- Produces: contracts using domain-specific revision keys with no generic `revision` / `current_revision` / `checkedRevision` fields.

- [ ] Replace Brief version fields with `brief_revision`.
- [ ] Replace Design Spec version fields with `design_spec_revision`.
- [ ] Replace Artifact and Preflight binding fields with `artifact_revision`, `source_design_spec_revision`, and `checked_artifact_revision` as appropriate.
- [ ] Keep side effects with the actual owning Skill or Artifact Manager; do not expand product scope.
- [ ] Run the canonical validation test and the existing Contract Eval runner tests.

### Task 6: Repository verification

**Files:**
- Verify only; do not rewrite historical baselines.

**Interfaces:**
- Consumes: synchronized canonical artifacts.
- Produces: modified-file list, remaining-conflict list, tests run, and test result.

- [ ] Run full repository searches for `issue.safe_fix`, generic `revision`, `checkedRevision`, External SVG routing to Renderer, and `svg.render` side effects.
- [ ] Classify historical / Backlog references separately from Current conflicts.
- [ ] Run `node --test tests/canonical_sync.test.js evals/runners/run_contract_evals.test.js` and `node evals/runners/run_contract_evals.js`.
- [ ] Review every requirement against the fresh outputs before reporting completion.
