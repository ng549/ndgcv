// src/auth.mjs — supervisor API authentication.
// Integrated from the Factory Test #6 handoff proposal
// (operator-command-center/handoff/WORKER-9-AUTH-PROPOSAL.md, reference
// implementation by Worker C). Semantics per that proposal:
//   - SUPERVISOR_TOKEN unset           -> pass-through + TOKEN_UNSET warning
//     (pre-production only)
//   - Authorization header missing/bad -> 401 AUTH_REQUIRED
//   - Bearer token mismatch            -> 403 AUTH_FORBIDDEN
//   - Bearer token matches             -> proceed
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
 * Authorize an inbound supervisor request.
 *
 * @param {Request} request  incoming request
 * @param {object}  env      supervisor env; reads env.SUPERVISOR_TOKEN
 * @returns {Promise<{ok:true, warning?:string} | {ok:false, status:number, code:string}>}
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
