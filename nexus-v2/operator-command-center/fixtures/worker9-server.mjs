// fixtures/worker9-server.mjs — Worker C (Factory Test #6)
// FIXTURE-BASED; NOT PRODUCTION VERIFICATION.
// In-process fake Worker 9 (worker-supervisor) over node:http.
// Mirrors the real routes observed at worker-supervisor HEAD 72389be:
//   GET  /api/workers
//   POST /api/workers/:id/commands
//   POST /api/run-all-ready
//   POST /api/run-phase/:phase
// Behavior is scriptable per route group. Optionally enforces the PROPOSED
// SUPERVISOR_TOKEN auth (see handoff/WORKER-9-AUTH-PROPOSAL.md) to demonstrate
// what Worker 13's AUTH_REJECTED path will look like once Worker 9 enforces auth.

import http from "node:http";

const json = (res, body, status = 200) => {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(payload);
};

function routeBehavior(script, key, fallback) {
  return (script && script[key]) || fallback;
}

/**
 * script = {
 *   authEnforced?: boolean,        // PROPOSED behavior: require Bearer === token on ALL /api/*
 *   token?: string,
 *   list?:     { mode: "ok", packets?: [] } | { mode: "malformed" }
 *              | { mode: "wrongShape", body?: any } | { mode: "http", status: number }
 *              | { mode: "hang" },
 *   command?:  { mode: "ok", commandId?: string } | { mode: "http", status: number } | { mode: "hang" },
 *   runAllReady?: { mode: "ok", accepted?: [] } | { mode: "http", status: number } | { mode: "hang" },
 *   runPhase?: { mode: "ok", accepted?: [] } | { mode: "http", status: number } | { mode: "hang" },
 * }
 *
 * Returns { url, close(), requests[] }.
 * Each recorded request: { method, path, tokenPresent, tokenLast4, xIdempotencyKey, body }.
 * Token values are NEVER logged — only presence and last 4 chars.
 */
export async function startFakeWorker9(script = {}) {
  const requests = [];

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://fake-worker9.local");
    const path = url.pathname;
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const rawBody = Buffer.concat(chunks).toString("utf8");
      const auth = req.headers.authorization || "";
      const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : null;
      requests.push({
        method: req.method,
        path,
        tokenPresent: bearer !== null,
        tokenLast4: bearer ? bearer.slice(-4) : null,
        xIdempotencyKey: req.headers["x-idempotency-key"] ?? null,
        body: rawBody ? safeParse(rawBody) : null
      });

      // PROPOSED Worker 9 auth mode (not real Worker 9 behavior today).
      if (script.authEnforced && path.startsWith("/api/")) {
        if (!bearer) return json(res, { error: "AUTH_REQUIRED" }, 401);
        if (bearer !== script.token) return json(res, { error: "AUTH_FORBIDDEN" }, 403);
      }

      if (req.method === "GET" && path === "/api/workers") {
        const b = routeBehavior(script, "list", { mode: "ok", packets: [] });
        if (b.mode === "hang") return; // never respond; client timeout must fire
        if (b.mode === "malformed") {
          res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
          return res.end('{"workers": [ {broken json');
        }
        if (b.mode === "wrongShape") {
          return json(res, b.body !== undefined ? b.body : { workers: { not: "an array" } });
        }
        if (b.mode === "http") return json(res, { error: "scripted", status: b.status }, b.status);
        return json(res, { workers: b.packets ?? [] });
      }

      const cmdMatch = path.match(/^\/api\/workers\/([^/]+)\/commands$/);
      if (req.method === "POST" && cmdMatch) {
        const b = routeBehavior(script, "command", { mode: "ok" });
        if (b.mode === "hang") return;
        if (b.mode === "http") return json(res, { error: "scripted", status: b.status }, b.status);
        return json(res, { accepted: true, command_id: b.commandId ?? "cmd-fixture-1" }, 202);
      }

      if (req.method === "POST" && path === "/api/run-all-ready") {
        const b = routeBehavior(script, "runAllReady", { mode: "ok", accepted: [] });
        if (b.mode === "hang") return;
        if (b.mode === "http") return json(res, { error: "scripted", status: b.status }, b.status);
        return json(res, { accepted: b.accepted ?? [] }, 202);
      }

      if (req.method === "POST" && path.startsWith("/api/run-phase/")) {
        const b = routeBehavior(script, "runPhase", { mode: "ok", accepted: [] });
        if (b.mode === "hang") return;
        if (b.mode === "http") return json(res, { error: "scripted", status: b.status }, b.status);
        return json(res, {
          phase: decodeURIComponent(path.split("/").pop()),
          accepted: b.accepted ?? []
        }, 202);
      }

      return json(res, { error: "not_found" }, 404);
    });
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    close: () => new Promise((resolve) => server.close(resolve))
  };
}

function safeParse(raw) {
  try { return JSON.parse(raw); } catch { return raw; }
}
