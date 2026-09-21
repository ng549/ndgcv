// tests/worker9-auth-proposal.test.mjs — Worker C (Factory Test #6)
// FIXTURE-BASED; NOT PRODUCTION VERIFICATION.
// Tests for handoff/worker9-auth-reference.mjs (PROPOSED Worker 9 change — not integrated).
//
// Test-plan area mapping (of the 24 required areas):
//   - auth-missing        → "missing Authorization header → 401"
//   - auth-invalid        → "wrong token → 403", "different-length tokens rejected"
//   - worker-9-unavailable / worker-9-auth-enforced behavior → also exercised via
//     fixtures/worker9-server.mjs authEnforced mode in tests/adapter.test.mjs.
// Other areas (capability/core/ui, command flow) are covered in tests owned by
// Workers A/B and in adapter.test.mjs / integration.test.mjs.

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  authorizeWorker9Request,
  wrapFetch
} from "../handoff/worker9-auth-reference.mjs";

const ENV = { SUPERVISOR_TOKEN: "test-supervisor-secret-0123456789" };

const req = (headers = {}) =>
  new Request("https://worker9.example/api/workers", { headers });

test("missing Authorization header → 401 AUTH_REQUIRED", async () => {
  const d = await authorizeWorker9Request(req(), ENV);
  assert.equal(d.ok, false);
  assert.equal(d.status, 401);
  assert.equal(d.code, "AUTH_REQUIRED");
});

test("malformed Authorization scheme → 401 AUTH_REQUIRED", async () => {
  const d = await authorizeWorker9Request(req({ authorization: "Basic abc" }), ENV);
  assert.equal(d.ok, false);
  assert.equal(d.status, 401);
});

test("wrong token → 403 AUTH_FORBIDDEN", async () => {
  const d = await authorizeWorker9Request(
    req({ authorization: `Bearer ${"x".repeat(ENV.SUPERVISOR_TOKEN.length)}` }), ENV);
  assert.equal(d.ok, false);
  assert.equal(d.status, 403);
  assert.equal(d.code, "AUTH_FORBIDDEN");
});

test("correct token → ok", async () => {
  const d = await authorizeWorker9Request(
    req({ authorization: `Bearer ${ENV.SUPERVISOR_TOKEN}` }), ENV);
  assert.deepEqual(d, { ok: true });
});

test("token unset → ok with TOKEN_UNSET warning (pre-production pass-through)", async () => {
  const d = await authorizeWorker9Request(req(), {});
  assert.equal(d.ok, true);
  assert.equal(d.warning, "TOKEN_UNSET");
});

test("different-length token does not throw and is rejected", async () => {
  const d = await authorizeWorker9Request(req({ authorization: "Bearer short" }), ENV);
  assert.equal(d.ok, false);
  assert.equal(d.status, 403);
});

test("constant-time comparison is used (structure check)", async () => {
  const src = await readFile(
    fileURLToPath(new URL("../handoff/worker9-auth-reference.mjs", import.meta.url)), "utf8");
  assert.match(src, /timingSafeEqual/);
  // Length check must precede the constant-time compare.
  assert.ok(src.indexOf("byteLength !== ") < src.indexOf("timingSafeEqual("));
});

test("wrapFetch mounts auth before routing and preserves handler on success", async () => {
  let called = false;
  const handler = wrapFetch(async () => { called = true; return new Response("ok"); });
  const okRes = await handler(
    new Request("https://worker9.example/api/workers",
      { headers: { authorization: `Bearer ${ENV.SUPERVISOR_TOKEN}` } }), ENV);
  assert.equal(okRes.status, 200);
  assert.equal(called, true);

  called = false;
  const badRes = await handler(new Request("https://worker9.example/api/workers"), ENV);
  assert.equal(badRes.status, 401);
  assert.equal(called, false);
  assert.deepEqual(await badRes.json(), { error: "AUTH_REQUIRED" });
});

test("wrapFetch does not gate non-/api paths", async () => {
  const handler = wrapFetch(async () => new Response("health"));
  const res = await handler(new Request("https://worker9.example/health"), ENV);
  assert.equal(res.status, 200);
});
