// ExecutionProvider seam. Factory is the first approved provider; the
// supervisor contract never sees provider details beyond an opaque ref.

export interface LaunchSpec {
  prompt: string;
  cwd: string;
  autonomy: string;
  workerId: string;
}

export interface ProviderExecution {
  provider: string;
  ref: string; // opaque provider reference (Factory session id)
}

export type ProviderSignal =
  | { kind: "running" }
  | { kind: "idle" }
  | { kind: "ended" } // provider says the execution process is gone
  | { kind: "error"; detail: string };

export interface ExecutionProvider {
  readonly name: string;
  launch(spec: LaunchSpec): Promise<ProviderExecution>;
  signal(exec: ProviderExecution): Promise<ProviderSignal>;
  recentAssistantTexts(exec: ProviderExecution, limit: number): Promise<string[]>;
  nudge(exec: ProviderExecution, text: string): Promise<void>;
  cancel(exec: ProviderExecution): Promise<void>;
}

export interface FactoryProviderConfig {
  apiBaseUrl: string; // e.g. https://api.factory.ai
  apiKey: string; // Worker secret
  computerId: string;
  repoCwd: string;
  autonomy: string;
}

interface FactoryDependencies {
  fetch: typeof fetch;
}

async function factoryFetch(
  deps: FactoryDependencies,
  config: FactoryProviderConfig,
  path: string,
  init?: RequestInit
): Promise<Response> {
  const response = await deps.fetch(`${config.apiBaseUrl.replace(/\/+$/, "")}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      "content-type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  return response;
}

async function readJsonSafe(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`provider_unparseable_${response.status}`);
  }
}

export class FactoryProvider implements ExecutionProvider {
  readonly name = "factory";

  constructor(
    private readonly config: FactoryProviderConfig,
    private readonly deps: FactoryDependencies
  ) {}

  async launch(spec: LaunchSpec): Promise<ProviderExecution> {
    const createResp = await factoryFetch(this.deps, this.config, "/api/v0/sessions", {
      method: "POST",
      // NOTE: CreateSessionRequestBody allows only computerId, cwd, and
      // sessionSettings (additionalProperties: false in the OpenAPI spec).
      // Do not add a title field here; the API rejects unknown keys with 400.
      body: JSON.stringify({
        computerId: this.config.computerId,
        cwd: this.config.repoCwd,
        sessionSettings: {
          autonomyLevel: spec.autonomy,
          interactionMode: "auto",
          tags: [{ name: "agency-worker", metadata: { worker_id: spec.workerId } }]
        }
      })
    });
    if (!createResp.ok) {
      throw new Error(`provider_launch_${createResp.status}`);
    }
    const created = await readJsonSafe(createResp);
    const sessionId = created["sessionId"];
    if (typeof sessionId !== "string" || sessionId.length === 0) {
      throw new Error("provider_launch_no_session");
    }
    const exec: ProviderExecution = { provider: this.name, ref: sessionId };
    await this.nudge(exec, spec.prompt);
    return exec;
  }

  async signal(exec: ProviderExecution): Promise<ProviderSignal> {
    const response = await factoryFetch(this.deps, this.config, `/api/v0/sessions/${exec.ref}`);
    if (response.status === 404) return { kind: "ended" };
    if (!response.ok) return { kind: "error", detail: `provider_signal_${response.status}` };
    const body = await readJsonSafe(response);
    // GetSession200ResponseBody.status enum: idle | pending | running.
    const status = typeof body["status"] === "string" ? (body["status"] as string) : "";
    if (status === "running" || status === "pending") {
      return { kind: "running" };
    }
    return { kind: "idle" };
  }

  async recentAssistantTexts(exec: ProviderExecution, limit: number): Promise<string[]> {
    const response = await factoryFetch(
      this.deps,
      this.config,
      `/api/v0/sessions/${exec.ref}/messages?limit=${limit}&role=assistant`
    );
    if (!response.ok) return [];
    const body = (await readJsonSafe(response)) as {
      messages?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
    };
    const texts: string[] = [];
    for (const message of body.messages ?? []) {
      for (const part of message.content ?? []) {
        if (part.type === "text" && typeof part.text === "string") {
          texts.push(part.text);
        }
      }
    }
    return texts;
  }

  async nudge(exec: ProviderExecution, text: string): Promise<void> {
    const response = await factoryFetch(
      this.deps,
      this.config,
      `/api/v0/sessions/${exec.ref}/messages`,
      { method: "POST", body: JSON.stringify({ text }) }
    );
    if (!response.ok) {
      throw new Error(`provider_nudge_${response.status}`);
    }
  }

  async cancel(exec: ProviderExecution): Promise<void> {
    await factoryFetch(this.deps, this.config, `/api/v0/sessions/${exec.ref}/interrupt`, {
      method: "POST"
    });
  }
}
