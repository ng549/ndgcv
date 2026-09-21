// handoff/worker9-auth-reference.mjs — Worker C (Factory Test #6)
// PROPOSED — NOT INTEGRATED — REQUIRES WORKER 9 OWNER ACCEPTANCE.
// Reference implementation for handoff/WORKER-9-AUTH-PROPOSAL.md.
// Target host: nexus-v2/worker-supervisor/src/index.mjs (Worker 9-owned; Factory does NOT modify it).
// Runtime-compatible with both Cloudflare Workers and Node 22 (tests).

const encoder = new TextEncoder();

/**
 * Constant-time string equality.
 * Prefers crypto.subtle.timingSafeEqual (WebCrypto). Falls back to
 * node:crypto timingSafeEqual under Node runtimes lacking the subtle variant.
 * Length is checked first (length itself is not considered secret here —
 * tokens are operator-managed secrets of fixed documented length).
 */
async function timingSafeStringEqual(a, b) {
  const ab = encoder.encode(a);
  const bb = encoder.encode(b);
  if (ab.byteLength !== bb.byteLength) return false;
  if (crypto.subtle && typeof crypto.subtle.timingSafeEqual === "function") {
    return crypto.subtle.timingSafeEqual(ab, bb);
  }
  const { timingSafeEqual } = await import("node:crypto");
  return timingSafeEqual(ab, bb);
}

/**
 * Authorize an inbound Worker 9 request.
 *
 * @param {Request} request  incoming request (Fetch API Request or compatible)
 * @param {object}  env      Worker 9 env; reads env.SUPERVISOR_TOKEN
 * @returns {Promise<{ok:true, warning?:string} | {ok:false, status:number, code:string}>}
 *
 * Semantics:
 *  - env.SUPERVISOR_TOKEN unset        → { ok:true, warning:"TOKEN_UNSET" }
 *    (current behavior preserved; loud warning — acceptable ONLY pre-production)
 *  - Authorization header missing/malformed → { ok:false, status:401, code:"AUTH_REQUIRED" }
 *  - Bearer token mismatch             → { ok:false, status:403, code:"AUTH_FORBIDDEN" }
 *  - Bearer token matches              → { ok:true }
 */
export async function authorizeWorker9Request(request, env) {
  const expected = env && env.SUPERVISOR_TOKEN;
  if (!expected) {
    return { ok: true, warning: "TOKEN_UNSET" };
  }
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer (.+)$/);
  if (!match) {
    return { ok: false, status: 401, code: "AUTH_REQUIRED" };
  }
  const presented = match[1];
  // Length check first, then constant-time compare — never throws on length mismatch.
  const equal = await timingSafeStringEqual(presented, expected);
  if (!equal) {
    return { ok: false, status: 403, code: "AUTH_FORBIDDEN" };
  }
  return { ok: true };
}

/**
 * Mounting helper showing how Worker 9 would wrap its existing fetch handler.
 * No route or response-shape changes; auth runs before routing for ALL /api/* paths.
 *
 *   export default { fetch: wrapFetch(existingFetch) }
 */
export function wrapFetch(fetchHandler) {
  return async function wrappedFetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      const decision = await authorizeWorker9Request(request, env);
      if (!decision.ok) {
        // Worker 9 should also emit audit(env, null, null, "AUTH_REJECTED", { code: decision.code })
        // using its existing audit() helper. Omitted here because this module is env-DB-agnostic.
        return new Response(JSON.stringify({ error: decision.code }), {
          status: decision.status,
          headers: { "content-type": "application/json; charset=utf-8" }
        });
      }
      if (decision.warning === "TOKEN_UNSET") {
        console.warn(
          "[worker-supervisor] SUPERVISOR_TOKEN is NOT set — all /api/* routes are UNAUTHENTICATED. " +
          "Acceptable only for pre-production local development. Set SUPERVISOR_TOKEN before any non-localhost exposure."
        );
      }
    }
    return fetchHandler(request, env, ctx);
  };
}
