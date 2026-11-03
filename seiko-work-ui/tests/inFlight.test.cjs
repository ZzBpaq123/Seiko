const { test } = require("node:test");
const assert = require("node:assert/strict");
const load = require("./loadTypeScript.cjs");
const { InFlightRequests, LatestRequest } = load("lib/inFlight.ts");
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };

test("identical pending reads are shared but completed values are not cached", async () => {
  const pool = new InFlightRequests(), pending = deferred(); let calls = 0;
  const loader = () => { calls++; return pending.promise; };
  const a = pool.run("same", loader), b = pool.run("same", loader);
  await tick(); assert.equal(calls, 1);
  pending.resolve(7); assert.deepEqual(await Promise.all([a, b]), [7, 7]);
  assert.equal(await pool.run("same", () => { calls++; return Promise.resolve(8); }), 8);
  assert.equal(calls, 2);
});
test("one consumer can cancel without aborting another consumer", async () => {
  const pool = new InFlightRequests(), pending = deferred(), controller = new AbortController(); let transportSignal;
  const loader = signal => { transportSignal = signal; return pending.promise; };
  const a = pool.run("same", loader, controller.signal), b = pool.run("same", loader);
  const rejected = assert.rejects(a, { name: "AbortError" });
  await tick(); controller.abort(); await rejected;
  assert.equal(transportSignal.aborted, false); pending.resolve(9); assert.equal(await b, 9);
});
test("last cancellation aborts transport and a new subscriber starts a fresh read", async () => {
  const pool = new InFlightRequests(), pending = deferred(), controller = new AbortController(); let signal;
  const a = pool.run("same", s => { signal = s; return pending.promise; }, controller.signal);
  const rejected = assert.rejects(a, { name: "AbortError" }); await tick(); controller.abort(); await rejected;
  assert.equal(signal.aborted, true);
  assert.equal(await pool.run("same", () => Promise.resolve("new")), "new"); pending.resolve("old");
});
test("invalidating pending reads does not let an old completion remove a newer entry", async () => {
  const pool = new InFlightRequests(), old = deferred(), fresh = deferred(); let calls = 0;
  const a = pool.run("same", () => old.promise); pool.clear();
  const b = pool.run("same", () => { calls++; return fresh.promise; });
  old.resolve("old"); await a;
  const c = pool.run("same", () => { calls++; return Promise.resolve("wrong"); });
  fresh.resolve("fresh"); assert.deepEqual(await Promise.all([b, c]), ["fresh", "fresh"]); assert.equal(calls, 1);
});
test("failed requests can be retried and already canceled callers never start work", async () => {
  const pool = new InFlightRequests();
  await assert.rejects(pool.run("same", () => Promise.reject(new Error("offline"))), /offline/);
  assert.equal(await pool.run("same", () => Promise.resolve(1)), 1);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(pool.run("canceled", () => assert.fail(), controller.signal), { name: "AbortError" });
});
test("a superseded or closed panel request can never commit, even if its transport resolves", () => {
  const requests = new LatestRequest(), a = requests.start(), b = requests.start();
  assert.equal(a.signal.aborted, true); assert.equal(a.isCurrent(), false); assert.equal(b.isCurrent(), true);
  requests.cancel(); assert.equal(b.isCurrent(), false); assert.equal(b.signal.aborted, true);
});
