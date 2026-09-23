// Worker 9 launch contract for POST /v1/worker-executions.
// Mirrors nexus-v2/worker-supervisor launchGateway() request and
// nextStateAfterExecution() result handling exactly.

export interface WorkerExecutionRequest {
  request_id: string;
  idempotency_key: string;
  worker_id: string;
  capability: string;
  preferred_model?: string;
  budget_remaining_micros: number;
  branch: string;
  allowed_files: string[];
  context_refs?: string[];
  acceptance_criteria: string[];
  checkpoint_sha?: string | null;
  canonical_sha?: string;
}

export interface WorkerExecutionResult {
  cancelled?: boolean;
  failed?: boolean;
  blocker?: { kind: string; detail: string };
  acceptance?: { all_satisfied: boolean; evidence?: string[] };
  verification?: { passed: boolean; detail?: string };
  checkpoint_sha?: string | null;
  work_remaining?: boolean;
  provider?: { name: string; ref: string };
  usage?: {
    elapsed_seconds: number;
    cost_state: "ESTIMATED" | "UNKNOWN";
    note?: string;
  };
}

export class ContractError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "ContractError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new ContractError(`invalid_${key}`, `${key} must be a non-empty string`);
  }
  return value;
}

function optionalString(body: Record<string, unknown>, key: string): string | undefined {
  const value = body[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new ContractError(`invalid_${key}`, `${key} must be a string`);
  }
  return value;
}

function requireStringArray(body: Record<string, unknown>, key: string): string[] {
  const value = body[key];
  if (!Array.isArray(value) || value.length === 0 || !value.every((v) => typeof v === "string")) {
    throw new ContractError(`invalid_${key}`, `${key} must be a non-empty string array`);
  }
  return value as string[];
}

function optionalStringArray(body: Record<string, unknown>, key: string): string[] | undefined {
  const value = body[key];
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || !value.every((v) => typeof v === "string")) {
    throw new ContractError(`invalid_${key}`, `${key} must be a string array`);
  }
  return value as string[];
}

export function parseWorkerExecutionRequest(raw: unknown): WorkerExecutionRequest {
  if (!isRecord(raw)) {
    throw new ContractError("invalid_body", "request body must be a JSON object");
  }
  const budget = raw["budget_remaining_micros"];
  if (!Number.isSafeInteger(budget) || (budget as number) < 0) {
    throw new ContractError(
      "invalid_budget_remaining_micros",
      "budget_remaining_micros must be a non-negative safe integer"
    );
  }
  const checkpoint = raw["checkpoint_sha"];
  if (checkpoint !== undefined && checkpoint !== null && typeof checkpoint !== "string") {
    throw new ContractError("invalid_checkpoint_sha", "checkpoint_sha must be a string or null");
  }
  return {
    request_id: requireString(raw, "request_id"),
    idempotency_key: requireString(raw, "idempotency_key"),
    worker_id: requireString(raw, "worker_id"),
    capability: requireString(raw, "capability"),
    preferred_model: optionalString(raw, "preferred_model"),
    budget_remaining_micros: budget as number,
    branch: requireString(raw, "branch"),
    allowed_files: requireStringArray(raw, "allowed_files"),
    context_refs: optionalStringArray(raw, "context_refs"),
    acceptance_criteria: requireStringArray(raw, "acceptance_criteria"),
    checkpoint_sha: (checkpoint as string | null | undefined) ?? null,
    canonical_sha: optionalString(raw, "canonical_sha")
  };
}

// Outcome marker the launched worker must print in its final message.
export const OUTCOME_MARKER = "OUTCOME_JSON:";

export interface WorkerOutcome {
  status: "complete" | "work_remaining" | "blocked";
  checkpoint_sha?: string | null;
  acceptance?: { all_satisfied: boolean; evidence?: string[] };
  verification?: { passed: boolean; detail?: string };
  blocker?: { kind: string; detail: string };
}

export function extractOutcome(texts: string[]): WorkerOutcome | null {
  for (let i = texts.length - 1; i >= 0; i -= 1) {
    const text = texts[i] ?? "";
    const markerAt = text.lastIndexOf(OUTCOME_MARKER);
    if (markerAt === -1) continue;
    const after = text.slice(markerAt + OUTCOME_MARKER.length);
    const braceAt = after.indexOf("{");
    if (braceAt === -1) continue;
    // Scan for the balanced closing brace so trailing prose cannot corrupt parsing.
    let depth = 0;
    let end = -1;
    for (let j = braceAt; j < after.length; j += 1) {
      const ch = after[j];
      if (ch === "{") depth += 1;
      else if (ch === "}") {
        depth -= 1;
        if (depth === 0) {
          end = j;
          break;
        }
      }
    }
    if (end === -1) continue;
    try {
      const parsed = JSON.parse(after.slice(braceAt, end + 1)) as WorkerOutcome;
      if (
        parsed &&
        (parsed.status === "complete" ||
          parsed.status === "work_remaining" ||
          parsed.status === "blocked")
      ) {
        return parsed;
      }
    } catch {
      // keep scanning earlier messages
    }
  }
  return null;
}

export function outcomeToResult(outcome: WorkerOutcome): WorkerExecutionResult {
  const result: WorkerExecutionResult = {
    checkpoint_sha: outcome.checkpoint_sha ?? null
  };
  if (outcome.status === "blocked") {
    result.blocker = outcome.blocker ?? { kind: "unspecified", detail: "worker reported blocked" };
    return result;
  }
  if (outcome.status === "work_remaining") {
    result.work_remaining = true;
    return result;
  }
  result.acceptance = outcome.acceptance ?? { all_satisfied: false };
  result.verification = outcome.verification ?? { passed: false, detail: "no verification reported" };
  return result;
}
