import {
  ContractError,
  extractOutcome,
  outcomeToResult,
  parseWorkerExecutionRequest,
  type WorkerExecutionRequest,
  type WorkerExecutionResult
} from "./contract";
import {
  FactoryProvider,
  type ExecutionProvider,
  type ProviderExecution
} from "./provider";
import { renderWorkerPrompt } from "./prompt";

export interface GatewayConfig {
  bearerToken: string; // shared secret with the supervisor (Worker 9)
  factoryApiBaseUrl: string;
  factoryApiKey: string;
  factoryComputerId: string;
  factoryAutonomy: string;
  repoCwd: string;
  repoOwner: string;
  repoName: string;
  brokerUrl: string;
  sliceSeconds: number;
  pollIntervalMs: number;
}

export interface ExecutionStore {
  get(key: string): Promise<StoredExecution | null>;
  put(key: string, value: StoredExecution): Promise<void>;
}

export interface StoredExecution {
  exec: ProviderExecution;
  worker_id: string;
  created_at: string;
  terminal?: WorkerExecutionResult;
}

export interface GatewayDependencies {
  provider: ExecutionProvider;
  store: ExecutionStore;
  sleep: (ms: number) => Promise<void>;
  nowMs: () => number;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store"
    }
  });
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function bearerValid(request: Request, expected: string): Promise<boolean> {
  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ") || expected.length === 0) return false;
  // Hash both sides so the comparison is length-independent and timing-safe.
  return (await sha256Hex(header.slice(7))) === (await sha256Hex(expected));
}

function usageNote(startedMs: number, nowMs: number): WorkerExecutionResult["usage"] {
  return {
    elapsed_seconds: Math.max(0, Math.round((nowMs - startedMs) / 1000)),
    cost_state: "ESTIMATED",
    note: "Factory session usage is not settled invoiced cost; reconcile in the Agency Cost Ledger"
  };
}

export async function handleGatewayRequest(
  request: Request,
  config: GatewayConfig,
  dependencies: GatewayDependencies
): Promise<Response> {
  const url = new URL(request.url);
  const requestId = crypto.randomUUID();

  if (url.pathname === "/health") {
    return jsonResponse({ status: "ok", service: "agency-execution-gateway", request_id: requestId });
  }

  if (!(await bearerValid(request, config.bearerToken))) {
    return jsonResponse({ error: "unauthorized", request_id: requestId }, 401);
  }

  const cancelMatch = url.pathname.match(/^\/v1\/worker-executions\/([^/]+)\/cancel$/);
  if (request.method === "POST" && cancelMatch) {
    return handleCancel(cancelMatch[1] as string, dependencies, requestId);
  }

  if (url.pathname === "/v1/worker-executions" && request.method === "POST") {
    return handleLaunch(request, config, dependencies, requestId);
  }

  return jsonResponse({ error: "not_found", request_id: requestId }, 404);
}

async function handleCancel(
  executionKey: string,
  dependencies: GatewayDependencies,
  requestId: string
): Promise<Response> {
  const stored = await dependencies.store.get(`req:${executionKey}`);
  if (!stored) {
    return jsonResponse({ error: "not_found", request_id: requestId }, 404);
  }
  try {
    await dependencies.provider.cancel(stored.exec);
  } catch (error) {
    return jsonResponse(
      { error: "provider_cancel_failed", detail: String(error), request_id: requestId },
      502
    );
  }
  const terminal: WorkerExecutionResult = { cancelled: true };
  await dependencies.store.put(`req:${executionKey}`, { ...stored, terminal });
  return jsonResponse({ cancelled: true, request_id: requestId });
}

async function handleLaunch(
  request: Request,
  config: GatewayConfig,
  dependencies: GatewayDependencies,
  requestId: string
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "invalid_json", request_id: requestId }, 400);
  }

  let parsed: WorkerExecutionRequest;
  try {
    parsed = parseWorkerExecutionRequest(body);
  } catch (error) {
    if (error instanceof ContractError) {
      return jsonResponse({ error: error.code, request_id: requestId }, 400);
    }
    throw error;
  }

  const idemKey = `idem:${parsed.idempotency_key}`;
  const existing = await dependencies.store.get(idemKey);
  if (existing?.terminal) {
    return jsonResponse({ ...existing.terminal, idempotent_replay: true, request_id: requestId });
  }

  const startedMs = dependencies.nowMs();
  const deadline = startedMs + config.sliceSeconds * 1000;
  let exec: ProviderExecution;

  if (existing) {
    // Continuation of an in-flight slice: same idempotency key, same session.
    exec = existing.exec;
    const signal = await dependencies.provider.signal(exec);
    if (signal.kind === "idle") {
      await dependencies.provider.nudge(
        exec,
        "Continue your work packet. Commit and push your checkpoint, then print your OUTCOME_JSON line."
      );
    }
  } else {
    const prompt = renderWorkerPrompt(parsed, {
      repoOwner: config.repoOwner,
      repoName: config.repoName,
      brokerUrl: config.brokerUrl,
      sliceSeconds: config.sliceSeconds
    });
    try {
      exec = await dependencies.provider.launch({
        prompt,
        cwd: config.repoCwd,
        autonomy: config.factoryAutonomy,
        workerId: parsed.worker_id
      });
    } catch (error) {
      return jsonResponse(
        { error: "provider_launch_failed", detail: String(error), request_id: requestId },
        502
      );
    }
    const stored: StoredExecution = {
      exec,
      worker_id: parsed.worker_id,
      created_at: new Date(startedMs).toISOString()
    };
    await dependencies.store.put(idemKey, stored);
    await dependencies.store.put(`req:${parsed.request_id}`, stored);
  }

  // Bounded slice: poll for the worker's outcome until the deadline.
  for (;;) {
    const texts = await dependencies.provider.recentAssistantTexts(exec, 5);
    const outcome = extractOutcome(texts);
    if (outcome) {
      const result: WorkerExecutionResult = {
        ...outcomeToResult(outcome),
        provider: { name: exec.provider, ref: exec.ref },
        usage: usageNote(startedMs, dependencies.nowMs())
      };
      const terminal =
        outcome.status === "complete" || outcome.status === "blocked" ? result : undefined;
      if (terminal) {
        const stored = await dependencies.store.get(idemKey);
        if (stored) {
          await dependencies.store.put(idemKey, { ...stored, terminal });
          await dependencies.store.put(`req:${parsed.request_id}`, { ...stored, terminal });
        }
      }
      return jsonResponse({ ...result, request_id: requestId });
    }

    const signal = await dependencies.provider.signal(exec);
    if (signal.kind === "error" || signal.kind === "ended") {
      const result: WorkerExecutionResult = {
        failed: true,
        provider: { name: exec.provider, ref: exec.ref },
        usage: usageNote(startedMs, dependencies.nowMs())
      };
      return jsonResponse({ ...result, detail: signal.kind === "error" ? signal.detail : "execution ended without outcome", request_id: requestId });
    }

    if (dependencies.nowMs() >= deadline) {
      // Slice over: work remains; the supervisor requeues and the same
      // idempotency key resumes this session.
      const result: WorkerExecutionResult = {
        work_remaining: true,
        provider: { name: exec.provider, ref: exec.ref },
        usage: usageNote(startedMs, dependencies.nowMs())
      };
      return jsonResponse({ ...result, request_id: requestId });
    }

    await dependencies.sleep(config.pollIntervalMs);
  }
}

function configFromEnv(env: ExecGatewayEnv): GatewayConfig {
  return {
    bearerToken: env.GATEWAY_BEARER_TOKEN,
    factoryApiBaseUrl: env.FACTORY_API_BASE_URL,
    factoryApiKey: env.FACTORY_API_KEY,
    factoryComputerId: env.FACTORY_COMPUTER_ID,
    factoryAutonomy: env.FACTORY_AUTONOMY,
    repoCwd: env.REPO_CWD,
    repoOwner: env.GITHUB_REPOSITORY_OWNER,
    repoName: env.GITHUB_REPOSITORY_NAME,
    brokerUrl: env.BROKER_URL,
    sliceSeconds: Number.parseInt(env.SLICE_SECONDS, 10) || 240,
    pollIntervalMs: Number.parseInt(env.POLL_INTERVAL_MS, 10) || 8000
  };
}

function kvStore(namespace: KVNamespace): ExecutionStore {
  return {
    async get(key) {
      return (await namespace.get(key, "json")) as StoredExecution | null;
    },
    async put(key, value) {
      await namespace.put(key, JSON.stringify(value));
    }
  };
}

export default {
  fetch(request: Request, env: ExecGatewayEnv): Promise<Response> {
    const config = configFromEnv(env);
    const provider = new FactoryProvider(
      {
        apiBaseUrl: config.factoryApiBaseUrl,
        apiKey: config.factoryApiKey,
        computerId: config.factoryComputerId,
        repoCwd: config.repoCwd,
        autonomy: config.factoryAutonomy
      },
      { fetch: (input, init) => fetch(input, init) }
    );
    return handleGatewayRequest(request, config, {
      provider,
      store: kvStore(env.EXECUTIONS),
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      nowMs: () => Date.now()
    });
  }
} satisfies ExportedHandler<ExecGatewayEnv>;
