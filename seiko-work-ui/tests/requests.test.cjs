const { test } = require("node:test");
const assert = require("node:assert/strict");
const load = require("./loadTypeScript.cjs");
const tick = () => new Promise(resolve => setImmediate(resolve));
function setup() {
  const storage = new Map([["token", "account-a"]]);
  global.localStorage = { getItem: k => storage.get(k) ?? null, removeItem: k => storage.delete(k) };
  global.window = { localStorage: global.localStorage };
  const { http, request } = load("lib/axios.ts", { "@/lib/inFlight": load("lib/inFlight.ts"), "@/lib/toast": { toast: { error: () => assert.fail("Unexpected redirect") } } });
  const pending = [];
  http.defaults.adapter = config => new Promise(resolve => pending.push({ config, finish(data) { resolve({ data: { code: 200, data }, status: 200, statusText: "OK", config, headers: {} }); } }));
  return { pending, request, storage };
}
test("GET deduplication includes params and current account and preserves explicit headers", async () => {
  const { pending, request, storage } = setup();
  const a = request({ url: "/query", params: { month: 1 } });
  const b = request({ url: "/query", params: { month: 1 } });
  const c = request({ url: "/query", params: { month: 2 } });
  await tick(); assert.equal(pending.length, 2);
  storage.set("token", "account-b");
  const staleA = assert.rejects(a, { name: "AbortError" }), staleB = assert.rejects(b, { name: "AbortError" });
  const d = request({ url: "/query", params: { month: 1 } });
  const staleC = assert.rejects(c, { name: "AbortError" });
  await tick(); assert.equal(pending.length, 3); assert.equal(pending[2].config.headers.get("token"), "account-b");
  pending[0].finish("a"); pending[1].finish("c"); pending[2].finish("b");
  await Promise.all([staleA, staleB, staleC]); assert.equal(await d, "b");
});
test("writes are never shared and reads after a write do not reuse pre-write requests", async () => {
  const { pending, request } = setup();
  const a = request({ url: "/query" }); await tick();
  const writeA = request({ method: "POST", url: "/query", data: { x: 1 } });
  const writeB = request({ method: "POST", url: "/query", data: { x: 1 } });
  await tick(); assert.equal(pending.length, 3); pending[1].finish(null); pending[2].finish(null); await Promise.all([writeA, writeB]);
  const b = request({ url: "/query" }); await tick(); assert.equal(pending.length, 4);
  pending[0].finish("old"); pending[3].finish("new"); assert.equal(await a, "old"); assert.equal(await b, "new");
});
test("canceling one component does not cancel the shared query for another component", async () => {
  const { pending, request } = setup(); const controller = new AbortController();
  const a = request({ url: "/query", signal: controller.signal }); const b = request({ url: "/query" });
  const canceled = assert.rejects(a, { name: "AbortError" }); await tick(); controller.abort(); await canceled;
  assert.equal(pending.length, 1); assert.equal(pending[0].config.signal.aborted, false);
  pending[0].finish("shared"); assert.equal(await b, "shared");
});
