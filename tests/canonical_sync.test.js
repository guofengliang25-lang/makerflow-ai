const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const graphMarkdown = read('docs/07.agent/06_Agent_Task_Graph_v1.0.md');
const graphMermaid = read('docs/07.agent/06_agent_task_graph.mmd');
const matrix = read('docs/07.agent/06_node_io_matrix.md');
const registry = read('docs/skills/07_Skill_Registry_v1.1.md');
const contractDirectory = path.join(root, 'docs/skills/Skill_Contract');

test('current task path excludes T14 while preserving T15 through T17 identifiers', () => {
  assert.doesNotMatch(graphMermaid, /T13\s*--[^\n]*-->\s*T14|T14\s*--[^\n]*-->/);
  assert.match(graphMermaid, /T15\[/);
  assert.match(graphMermaid, /T16\[/);
  assert.match(graphMermaid, /T17\[/);
  assert.match(graphMarkdown, /T14[^\n]*(Future|Backlog)/i);
});

test('T08 is the pure native Design Spec renderer and Artifact Manager owns persistence', () => {
  const t08Row = matrix.split(/\r?\n/).find((line) => line.startsWith('| T08 |'));
  assert.ok(t08Row, 'T08 row must exist');
  const cells = t08Row.split('|').map((cell) => cell.trim());
  assert.equal(cells[3], '`design_spec`');
  assert.equal(cells[4], '`svg`');
  assert.equal(cells[8], 'none');
  assert.doesNotMatch(t08Row, /external SVG/i);
  assert.match(matrix, /Artifact Manager[^\n]*(Orchestrator|Project State)/i);
  assert.match(matrix, /External SVG[^\n]*(不进入|不得进入)T08/i);
});

test('registry contains exactly 11 Core Skills and every contract_path exists', () => {
  const section = registry.match(/### 3\.2[\s\S]*?(?=\n## 4\.)/);
  assert.ok(section, 'Registry section 3.2 must exist');
  const rows = section[0].split(/\r?\n/).filter((line) => /^\| `[^`]+` \|/.test(line));
  assert.equal(rows.length, 11);

  for (const row of rows) {
    const skillId = row.match(/^\| `([^`]+)` \|/)[1];
    const expectedPath = `docs/skills/Skill_Contract/${skillId}.contract.md`;
    assert.match(row, new RegExp(expectedPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.ok(fs.existsSync(path.join(root, expectedPath)), `${expectedPath} must exist`);
  }
});

test('svg.render contract is design_spec to svg with no side effects', () => {
  const contract = read('docs/skills/Skill_Contract/svg.render.contract.md');
  assert.match(contract, /Input\s*=\s*`?design_spec`?/i);
  assert.match(contract, /Output\s*=\s*`?svg`?/i);
  assert.match(contract, /Side Effects\s*=\s*`?none`?/i);
  assert.doesNotMatch(contract, /artifact_revision|source_design_spec_revision|Preflight invalidation|使旧Preflight失效/i);
});

test('Core Skill contracts use only domain-specific revision field names', () => {
  const files = fs.readdirSync(contractDirectory).filter((name) => name.endsWith('.contract.md'));
  assert.equal(files.length, 11);
  for (const file of files) {
    const contract = fs.readFileSync(path.join(contractDirectory, file), 'utf8');
    assert.doesNotMatch(contract, /\bcheckedRevision\b/);
    assert.doesNotMatch(contract, /^\s*(?:current_)?revision\s*:/m);
    assert.doesNotMatch(contract, /`(?:current_)?revision`/);
  }
});

