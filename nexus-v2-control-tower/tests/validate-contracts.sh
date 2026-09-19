#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"

for schema in "$root"/schemas/*.json; do
  uvx check-jsonschema --check-metaschema "$schema"
done

uvx check-jsonschema --schemafile "$root/schemas/module-registry.schema.json" "$root/module-registry.json"
uvx check-jsonschema --schemafile "$root/schemas/module-contract.schema.json" "$root/control-tower.module-contract.json"
uvx check-jsonschema --schemafile "$root/schemas/domain-event.schema.json" \
  "$root/tests/fixtures/event-tenant-valid.json" \
  "$root/tests/fixtures/event-system-valid.json"

if uvx check-jsonschema --schemafile "$root/schemas/domain-event.schema.json" \
  "$root/tests/fixtures/event-tenant-invalid-missing-tenant.json" \
  "$root/tests/fixtures/event-system-invalid-tenant.json"; then
  echo "invalid event fixture unexpectedly passed" >&2
  exit 1
fi

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
const falseComplete=structuredClone(contract);
falseComplete.status='Complete'; falseComplete.reviewer=falseComplete.owner;
falseComplete.handoff.commit='pending'; falseComplete.handoff.remaining_work=['still open'];
falseComplete.acceptance_criteria[0].status='Failed'; falseComplete.acceptance_criteria[0].evidence='';
let falseCompleteRejected=false;
try { validateSemanticContract(falseComplete); } catch { falseCompleteRejected=true; }
if(!falseCompleteRejected) throw new Error('false completion fixture passed');
console.log('semantic contract gates passed');
NODE

forbidden_term="play""book"
if rg -n -i "$forbidden_term" "$root"; then
  echo "forbidden term found" >&2
  exit 1
fi
