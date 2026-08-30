import assert from "node:assert/strict";
import test from "node:test";

import * as serverModule from "../../server.mjs";

const { createMakerFlowServer } = serverModule;

async function withServer(run) {
  const server = createMakerFlowServer({
    executeBriefExtract: async () => assert.fail("health check must not invoke a model provider")
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

test("deployment config defaults to port 8000 and binds all interfaces", () => {
  assert.equal(typeof serverModule.resolveServerConfig, "function", "server must expose its deploy listen configuration");
  const { resolveServerConfig } = serverModule;
  assert.deepEqual(resolveServerConfig({}), { port: 8000, host: "0.0.0.0" });
  assert.deepEqual(resolveServerConfig({ PORT: "10000" }), { port: 10000, host: "0.0.0.0" });
});

test("GET /health returns only the public health envelope", async () => {
  await withServer(async baseUrl => {
    const response = await fetch(`${baseUrl}/health`, {
      headers: { Authorization: "must-not-echo" }
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
  });
});
