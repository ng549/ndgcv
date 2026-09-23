import { describe, expect, it, vi } from "vitest";
import {
  extractOutcome,
  parseWorkerExecutionRequest,
  OUTCOME_MARKER
} from "../src/contract";
import {
  handleGatewayRequest,
  type ExecutionStore,
  type GatewayConfig,
  type GatewayDependencies,
  type StoredExecution
} from "../src/index";
import type {
  ExecutionProvider,
  LaunchSpec,
  ProviderExecution,
  ProviderSignal
} from "../src/provider";
import { FactoryProvider } from "../src/provider";

const config: GatewayConfig = {
  bearerToken: "test-gateway-secret",
  factoryApiBaseUrl: "https://factory.test",
  factoryApiKey: "factory-key",
  factoryComputerId: "computer-1",
  factoryAutonomy: "high",
  repoCwd: "/home/factory-user/repos/ndgcv",
  repoOwner: "ng549",
  repoName: "ndgcv",
  brokerUrl: "https://broker.test/v1/github/installation-token",
  sliceSeconds: 240,
  pollIntervalMs: 8000
};

function memoryStore(): ExecutionStore & { data: Map<string, StoredExecution> } {
  const data = new Map<string, StoredExecution>();
  return {
    data,
    async get(key) {
      return data.get(key) ?? null;
    },
    async put(key, value) {
      data.set(key, value);
    }
  };
}

class FakeProvider implements ExecutionProvider {
  readonly name = "fake";
  launches: LaunchSpec[] = [];
  nudges: string[] = [];
  cancelled: string[] = [];
  texts: string[] = [];
  signalSequence: ProviderSignal[] = [];

  async launch(spec: LaunchSpec): Promise<ProviderExecution> {
    this.launches.push(spec);
    return { provider: this.name, ref: `session-${this.launches.length}` };
  }
  async signal(): Promise<ProviderSignal> {
    return this.signalSequence.shift() ?? { kind: "running" };
  }
  async recentAssistantTexts(): Promise<string[]> {
    return this.texts;
  }
  async nudge(_exec: ProviderExecution, text: string): Promise<void> {
    this.nudges.push(text);
  }
  async cancel(exec: ProviderExecution): Promise<void> {
    this.cancelled.push(exec.ref);
  }
}

function depsWith(
  provider: FakeProvider,
  store: ReturnType<typeof memoryStore>,
  clock?: { now: number }
): GatewayDependencies {
  const c = clock ?? { now: 1_000_000 };
  return {
    provider,
    store,
    sleep: async (ms) => {
      c.now += ms;
    },
    nowMs: () => c.now
  };
}

function validPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    request_id: "worker-7:v1:root",
    idempotency_key: "worker-7:v1:root",
    worker_id: "worker-7",
    capability: "coding",
    preferred_model: "frontier",
    budget_remaining_micros: 500_000,
    branch: "worker-7/example",
    allowed_files: ["nexus-v2/example/"],
    context_refs: ["nexus-v2/packets/worker-7.md"],
    acceptance_criteria: ["tests pass"],
    checkpoint_sha: null,
    canonical_sha: "abc123",
    ...overrides
  };
}

function post(body: unknown, token = config.bearerToken): Request {
  return new Request("https://gw.test/v1/worker-executions", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("auth and validation", () => {
  it("rejects missing and wrong bearer tokens, health stays open", async () => {
    const provider = new FakeProvider();
    const store = memoryStore();
    const deps = depsWith(provider, store);

    const noAuth = await handleGatewayRequest(post(validPayload(), ""), config, deps);
    expect(noAuth.status).toBe(401);

    const wrong = await handleGatewayRequest(post(validPayload(), "nope"), config, deps);
    expect(wrong.status).toBe(401);
    expect(provider.launches).toHaveLength(0);

    const health = await handleGatewayRequest(
      new Request("https://gw.test/health"),
      config,
      deps
    );
    expect(health.status).toBe(200);
  });

  it("rejects invalid payloads with specific codes", async () => {
    const provider = new FakeProvider();
    const deps = depsWith(provider, memoryStore());

    const noFiles = await handleGatewayRequest(
      post(validPayload({ allowed_files: [] })),
      config,
      deps
    );
    expect(noFiles.status).toBe(400);
    expect(await noFiles.json()).toMatchObject({ error: "invalid_allowed_files" });

    const badBudget = await handleGatewayRequest(
      post(validPayload({ budget_remaining_micros: -5 })),
      config,
      deps
    );
    expect(badBudget.status).toBe(400);
    expect(await badBudget.json()).toMatchObject({ error: "invalid_budget_remaining_micros" });

    expect(parseWorkerExecutionRequest(validPayload()).worker_id).toBe("worker-7");
  });
});

describe("launch slice", () => {
  it("runs to a verified complete outcome and replays idempotently", async () => {
    const provider = new FakeProvider();
    provider.texts = [
      `Done. ${OUTCOME_MARKER} {"status":"complete","checkpoint_sha":"deadbeef","acceptance":{"all_satisfied":true,"evidence":["vitest: 5/5"]},"verification":{"passed":true,"detail":"vitest run"}}`
    ];
    const store = memoryStore();
    const deps = depsWith(provider, store);

    const response = await handleGatewayRequest(post(validPayload()), config, deps);
    expect(response.status).toBe(200);
    const result = (await response.json()) as Record<string, unknown>;
    expect(result["checkpoint_sha"]).toBe("deadbeef");
    expect(result["acceptance"]).toMatchObject({ all_satisfied: true });
    expect(result["verification"]).toMatchObject({ passed: true });
    expect(result["provider"]).toMatchObject({ name: "fake", ref: "session-1" });
    expect(provider.launches).toHaveLength(1);
    expect(provider.launches[0]?.prompt).toContain("worker-7");
    expect(provider.launches[0]?.prompt).toContain(OUTCOME_MARKER);

    // Replay: same idempotency key returns the terminal result without relaunch.
    const replay = await handleGatewayRequest(post(validPayload()), config, deps);
    expect(replay.status).toBe(200);
    const replayed = (await replay.json()) as Record<string, unknown>;
    expect(replayed["idempotent_replay"]).toBe(true);
    expect(provider.launches).toHaveLength(1);
  });

  it("maps a blocker outcome to the supervisor BLOCKED shape", async () => {
    const provider = new FakeProvider();
    provider.texts = [
      `${OUTCOME_MARKER} {"status":"blocked","checkpoint_sha":null,"blocker":{"kind":"missing_context","detail":"no packet doc"}}`
    ];
    const deps = depsWith(provider, memoryStore());
    const response = await handleGatewayRequest(post(validPayload()), config, deps);
    const result = (await response.json()) as Record<string, unknown>;
    expect(result["blocker"]).toMatchObject({ kind: "missing_context" });
    expect(result["failed"]).toBeUndefined();
  });

  it("returns work_remaining on slice timeout and resumes the same session", async () => {
    const provider = new FakeProvider();
    provider.texts = []; // no outcome yet
    const clock = { now: 1_000_000 };
    const store = memoryStore();
    const deps = depsWith(provider, store, clock);

    const first = await handleGatewayRequest(post(validPayload()), config, deps);
    const firstResult = (await first.json()) as Record<string, unknown>;
    expect(firstResult["work_remaining"]).toBe(true);
    expect(provider.launches).toHaveLength(1);

    // Second call with the same idempotency key: no new session; an idle
    // session gets a continue nudge instead.
    provider.signalSequence = [{ kind: "idle" }];
    const second = await handleGatewayRequest(post(validPayload()), config, deps);
    expect(second.status).toBe(200);
    expect(provider.launches).toHaveLength(1);
    expect(provider.nudges.some((n) => n.startsWith("Continue your work packet"))).toBe(true);
  });

  it("reports failed when the provider signals an error", async () => {
    const provider = new FakeProvider();
    provider.texts = [];
    provider.signalSequence = [{ kind: "error", detail: "provider_signal_500" }];
    const deps = depsWith(provider, memoryStore());
    const response = await handleGatewayRequest(post(validPayload()), config, deps);
    const result = (await response.json()) as Record<string, unknown>;
    expect(result["failed"]).toBe(true);
  });

  it("cancels a running execution by request id", async () => {
    const provider = new FakeProvider();
    provider.texts = [];
    const store = memoryStore();
    const deps = depsWith(provider, store);
    await handleGatewayRequest(post(validPayload()), config, deps);

    const cancel = await handleGatewayRequest(
      new Request("https://gw.test/v1/worker-executions/worker-7:v1:root/cancel", {
        method: "POST",
        headers: { authorization: `Bearer ${config.bearerToken}` }
      }),
      config,
      deps
    );
    expect(cancel.status).toBe(200);
    expect(await cancel.json()).toMatchObject({ cancelled: true });
    expect(provider.cancelled).toEqual(["session-1"]);
  });
});

describe("outcome parsing", () => {
  it("extracts the latest valid outcome with balanced braces and trailing prose", () => {
    const texts = [
      `${OUTCOME_MARKER} {"status":"blocked","blocker":{"kind":"x","detail":"y"}}`,
      `noise ${OUTCOME_MARKER} {"status":"complete","checkpoint_sha":"abc","acceptance":{"all_satisfied":true}} trailing words`
    ];
    expect(extractOutcome(texts)).toMatchObject({ status: "complete", checkpoint_sha: "abc" });
  });

  it("ignores malformed outcomes", () => {
    expect(extractOutcome([`${OUTCOME_MARKER} {not json}`])).toBeNull();
    expect(extractOutcome(["no marker here"])).toBeNull();
    expect(extractOutcome([`${OUTCOME_MARKER} {"status":"bogus"}`])).toBeNull();
  });
});

describe("FactoryProvider API shapes", () => {
  it("creates a session then posts the prompt; signal maps 404 to ended", async () => {
    const calls: Array<{ url: string; method: string; body?: string }> = [];
    const mockFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, method: init?.method ?? "GET", body: init?.body as string });
      if (url.endsWith("/api/v0/sessions") && init?.method === "POST") {
        return Response.json({ sessionId: "s-123" });
      }
      if (url.includes("/messages") && init?.method === "POST") {
        return Response.json({ ok: true });
      }
      if (url.includes("/api/v0/sessions/s-123") && !init?.method) {
        return new Response("gone", { status: 404 });
      }
      return Response.json({});
    });

    const provider = new FactoryProvider(
      {
        apiBaseUrl: "https://factory.test",
        apiKey: "k",
        computerId: "computer-1",
        repoCwd: "/repo",
        autonomy: "high"
      },
      { fetch: mockFetch as typeof fetch }
    );

    const exec = await provider.launch({
      prompt: "do the thing",
      cwd: "/repo",
      autonomy: "high",
      workerId: "worker-7",
      model: "claude-sonnet-4-5"
    });
    expect(exec).toEqual({ provider: "factory", ref: "s-123" });
    expect(calls[0]).toMatchObject({ method: "POST" });
    const createBody = JSON.parse(calls[0]?.body ?? "{}") as Record<string, unknown>;
    // CreateSessionRequestBody has additionalProperties: false; only these
    // three keys are accepted. A stray key (e.g. title) earns a 400.
    expect(Object.keys(createBody).sort()).toEqual(["computerId", "cwd", "sessionSettings"]);
    expect(createBody).toMatchObject({ computerId: "computer-1", cwd: "/repo" });
    // The supervisor's chosen model must reach the session settings.
    expect((createBody.sessionSettings as Record<string, unknown>).model).toBe("claude-sonnet-4-5");
    expect(calls[1]?.url).toContain("/api/v0/sessions/s-123/messages");
    expect(JSON.parse(calls[1]?.body ?? "{}")).toMatchObject({ text: "do the thing" });

    const signal = await provider.signal(exec);
    expect(signal).toEqual({ kind: "ended" });
  });

  it("maps session status enum: pending/running -> running, idle -> idle", async () => {
    const statuses = ["pending", "running", "idle"];
    const mockFetch = vi.fn(async () => {
      const status = statuses.shift() ?? "idle";
      return Response.json({ status });
    });
    const provider = new FactoryProvider(
      {
        apiBaseUrl: "https://factory.test",
        apiKey: "k",
        computerId: "computer-1",
        repoCwd: "/repo",
        autonomy: "high"
      },
      { fetch: mockFetch as typeof fetch }
    );
    const exec: ProviderExecution = { provider: "factory", ref: "s-9" };
    expect(await provider.signal(exec)).toEqual({ kind: "running" });
    expect(await provider.signal(exec)).toEqual({ kind: "running" });
    expect(await provider.signal(exec)).toEqual({ kind: "idle" });
  });
});
