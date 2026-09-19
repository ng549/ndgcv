import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { performance } from "node:perf_hooks";

const here = import.meta.dirname;
const tasks = JSON.parse(fs.readFileSync(path.join(here, "tasks.json"), "utf8"));
const args = Object.fromEntries(process.argv.slice(2).map((v, i, a) => v.startsWith("--") ? [v.slice(2), a[i + 1]?.startsWith("--") ? true : a[i + 1] ?? true] : null).filter(Boolean));
const providers = {
  plugsky: { base: process.env.PLUGSKY_BASE_URL || "https://api.plugsky.com/v1", key: process.env.PLUGSKY_API_KEY, model: process.env.PLUGSKY_MODEL },
  openrouter: { base: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1", key: process.env.OPENROUTER_API_KEY, model: process.env.OPENROUTER_MODEL }
};

function assertion(text, spec) {
  try {
    if (spec.type === "contains_all") return spec.values.every(v => text.toLowerCase().includes(v.toLowerCase()));
    const parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ""));
    if (spec.type === "json_keys") return spec.keys.every(k => Object.hasOwn(parsed, k));
    if (spec.type === "json_array_min") return Array.isArray(parsed) && parsed.length >= spec.min;
  } catch { return false; }
  return false;
}

if (args.validate) {
  if (!Array.isArray(tasks) || tasks.length < 7 || tasks.some(t => !t.id || !t.category || !t.prompt || !t.assert)) throw new Error("invalid task fixture");
  console.log(`PASS benchmark fixture (${tasks.length} tasks)`);
  process.exit(0);
}

const selected = args.provider === "all" || !args.provider ? Object.keys(providers) : [args.provider];
const concurrency = Number(args.concurrency || 1);
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 200) throw new Error("concurrency must be an integer from 1 to 200");
for (const name of selected) {
  const p = providers[name];
  if (!p) throw new Error(`unknown provider: ${name}`);
  if (!p.key || !p.model) throw new Error(`${name} live run requires its API key and exact model environment variable`);
}

const jobs = selected.flatMap(provider => tasks.map(task => ({ provider, task })));
const output = path.join(here, `results-${new Date().toISOString().replaceAll(":", "-")}.jsonl`);
let cursor = 0;

async function worker() {
  while (cursor < jobs.length) {
    const job = jobs[cursor++];
    const p = providers[job.provider];
    const started = performance.now();
    let record;
    try {
      const response = await fetch(`${p.base}/chat/completions`, {
        method: "POST",
        headers: { authorization: `Bearer ${p.key}`, "content-type": "application/json" },
        body: JSON.stringify({ model: p.model, temperature: 0, messages: [{ role: "user", content: job.task.prompt }] })
      });
      const body = await response.json();
      const text = body?.choices?.[0]?.message?.content || "";
      record = { provider: job.provider, model: p.model, task_id: job.task.id, category: job.task.category, ok: response.ok, http_status: response.status, assertion_pass: response.ok && assertion(text, job.task.assert), latency_ms: Math.round(performance.now() - started), usage: body.usage ?? null, provider_request_id: response.headers.get("x-request-id") ?? body.id ?? null, error: response.ok ? null : String(body?.error?.message || "provider error").slice(0, 500), run_at: new Date().toISOString() };
    } catch (error) {
      record = { provider: job.provider, model: p.model, task_id: job.task.id, category: job.task.category, ok: false, assertion_pass: false, latency_ms: Math.round(performance.now() - started), usage: null, error: error.message, run_at: new Date().toISOString() };
    }
    fs.appendFileSync(output, `${JSON.stringify(record)}\n`, { mode: 0o600 });
    console.log(`${record.ok && record.assertion_pass ? "PASS" : "FAIL"} ${job.provider}/${job.task.id} ${record.latency_ms}ms`);
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, worker));
console.log(`Results: ${output}`);
