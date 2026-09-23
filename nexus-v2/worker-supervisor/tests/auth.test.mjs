// tests/auth.test.mjs — supervisor API authentication.
// Ported from the Factory Test #6 handoff test suite
// (operator-command-center/tests/worker9-auth-proposal.test.mjs, Worker C),
// now exercising the integrated src/auth.mjs and the mounted gate in src/index.mjs.

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { authorizeWorker9Request } from "../src/auth.mjs";
import supervisor from "../src/index.mjs";

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
    fileURLToPath(new URL("../src/auth.mjs", import.meta.url)), "utf8");
  assert.match(src, /timingSafeEqual/);
  // Length check must precede the constant-time compare.
  assert.ok(src.indexOf("byteLength !== ") < src.indexOf("timingSafeEqual("));
});

test("mounted gate rejects before routing even when the audit write fails", async () => {
  // The proposal requires an AUTH_REJECTED audit event, but the rejection
  // response must be returned even if that DB write fails. Simulate a broken
  // DB: prepare() throws, the gate must still answer 401/403.
  const env = {
    SUPERVISOR_TOKEN: ENV.SUPERVISOR_TOKEN,
    DB: {
      prepare() { throw new Error("simulated audit write failure"); }
    }
  };
  const res = await supervisor.fetch(new Request("https://worker9.example/api/workers"), env);
  assert.equal(res.status, 401);
  assert.deepEqual(await res.json(), { error: "AUTH_REQUIRED" });

  const forbidden = await supervisor.fetch(
    new Request("https://worker9.example/api/workers",
      { headers: { authorization: "Bearer wrong-token" } }), env);
  assert.equal(forbidden.status, 403);
  assert.deepEqual(await forbidden.json(), { error: "AUTH_FORBIDDEN" });
});

test("mounted gate does not gate non-/api paths", async () => {
  const res = await supervisor.fetch(new Request("https://worker9.example/health"), {});
  assert.equal(res.status, 404); // router's not_found, not an auth error
});
