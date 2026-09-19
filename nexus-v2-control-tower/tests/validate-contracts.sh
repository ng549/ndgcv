#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"

for schema in "$root"/schemas/*.json; do
  uvx check-jsonschema==0.38.0 --check-metaschema "$schema"
done

uvx check-jsonschema==0.38.0 --schemafile "$root/schemas/module-registry.schema.json" "$root/module-registry.json"
uvx check-jsonschema==0.38.0 --schemafile "$root/schemas/module-contract.schema.json" "$root/control-tower.module-contract.json"
uvx check-jsonschema==0.38.0 --schemafile "$root/schemas/domain-event.schema.json" \
  "$root/tests/fixtures/event-tenant-valid.json" \
  "$root/tests/fixtures/event-system-valid.json"

expect_schema_failure() {
  local fixture="$1"
  if uvx check-jsonschema==0.38.0 --schemafile "$root/schemas/domain-event.schema.json" "$fixture"; then
    echo "invalid event fixture unexpectedly passed: $fixture" >&2
    exit 1
  fi
}
expect_schema_failure "$root/tests/fixtures/event-tenant-invalid-missing-tenant.json"
expect_schema_failure "$root/tests/fixtures/event-system-invalid-tenant.json"

node - "$root" <<'NODE'
const fs=require('fs'), path=require('path');
const root=process.argv[2];
const registry=JSON.parse(fs.readFileSync(path.join(root,'module-registry.json'),'utf8'));
function validateRegistry(modules){
  if(modules.length!==13) throw new Error('expected exactly 13 modules');
  for(const field of ['id','number','branch']){
    const values=modules.map(m=>m[field]);
    if(new Set(values).size!==values.length) throw new Error('duplicate '+field);
  }
  const ids=new Set(modules.map(m=>m.id));
  for(const m of modules) for(const d of m.depends_on) if(!ids.has(d)) throw new Error('unknown dependency '+m.id+' -> '+d);
  const visiting=new Set(), visited=new Set(), byId=new Map(modules.map(m=>[m.id,m]));
  function visit(id){
    if(visiting.has(id)) throw new Error('dependency cycle at '+id);
    if(visited.has(id)) return;
    visiting.add(id); for(const d of byId.get(id).depends_on) visit(d); visiting.delete(id); visited.add(id);
  }
  for(const id of ids) visit(id);
}
validateRegistry(registry.modules);
let duplicateRejected=false;
try { validateRegistry(Array.from({length:13},()=>registry.modules[0])); } catch { duplicateRejected=true; }
if(!duplicateRejected) throw new Error('duplicate registry fixture passed');
const contract=JSON.parse(fs.readFileSync(path.join(root,'control-tower.module-contract.json'),'utf8'));
function validateSemanticContract(value){
  if(value.owner===value.reviewer) throw new Error('owner and reviewer must differ');
  if(value.status==='Complete'){
    if(value.handoff.commit==='pending'||value.handoff.remaining_work.length) throw new Error('false completion');
    for(const c of value.acceptance_criteria) if(c.status!=='Passed'||!c.evidence) throw new Error('false completion criterion');
  }
}
validateSemanticContract(contract);
const validComplete=structuredClone(contract);
validComplete.status='Complete';
validComplete.handoff.commit='a'.repeat(40);
validComplete.handoff.remaining_work=[];
for(const c of validComplete.acceptance_criteria){ c.status='Passed'; c.evidence=c.evidence||'verified'; }
validateSemanticContract(validComplete);
function expectSemanticFailure(label, mutate){
  const value=structuredClone(validComplete); mutate(value);
  let rejected=false; try { validateSemanticContract(value); } catch { rejected=true; }
  if(!rejected) throw new Error('semantic negative passed: '+label);
}
expectSemanticFailure('same owner and reviewer', v=>{v.reviewer=v.owner});
expectSemanticFailure('pending commit', v=>{v.handoff.commit='pending'});
expectSemanticFailure('remaining work', v=>{v.handoff.remaining_work=['still open']});
expectSemanticFailure('failed criterion', v=>{v.acceptance_criteria[0].status='Failed'});
expectSemanticFailure('empty evidence', v=>{v.acceptance_criteria[0].evidence=''});
console.log('semantic contract gates passed');
NODE

forbidden_term="play""book"
# The unmodified canonical fixture necessarily contains the policy's prohibited term.
# Only that exact source snapshot is excluded from prose scanning.
if rg -n -i --glob '!canonical-valid.json' "$forbidden_term" "$root"; then
  echo "forbidden term found" >&2
  exit 1
fi

uvx --from check-jsonschema==0.38.0 python "$root/tests/test-foundation.py"
