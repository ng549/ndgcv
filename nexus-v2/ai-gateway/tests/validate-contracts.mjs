import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const schemaDir = path.join(root, "schemas");
const requiredSchemas = [
  "ai-request.schema.json", "ai-usage-event.schema.json", "capability-bullpen.schema.json",
  "commercial-rights-record.schema.json", "cost-margin-event.schema.json", "development-bullpen.schema.json",
  "entitlement-decision.schema.json", "model-capability-manifest.schema.json", "operator-command.schema.json",
  "retail-price-quote.schema.json", "revenue-bullpen.schema.json", "tool-permission-grant.schema.json"
];

let failed = false;
for (const file of requiredSchemas) {
  const full = path.join(schemaDir, file);
  try {
    const schema = JSON.parse(fs.readFileSync(full, "utf8"));
    if (schema.$schema !== "https://json-schema.org/draft/2020-12/schema") throw new Error("wrong or missing draft");
    if (schema.type !== "object") throw new Error("top-level type must be object");
    if (!Array.isArray(schema.required) || schema.required.length === 0) throw new Error("required must be non-empty");
    if (schema.additionalProperties !== false) throw new Error("must fail closed on unknown top-level fields");
    console.log(`PASS ${file}`);
  } catch (error) {
    failed = true;
    console.error(`FAIL ${file}: ${error.message}`);
  }
}

for (const file of ["AI-GATEWAY-DESIGN-CANONICAL.json", "WORKER-8-HANDOFF.json"]) {
  try {
    JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
    console.log(`PASS ${file}`);
  } catch (error) {
    failed = true;
    console.error(`FAIL ${file}: ${error.message}`);
  }
}

if (failed) process.exit(1);
