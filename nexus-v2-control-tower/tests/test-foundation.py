"""Validate canonical/ACR structure and regression behavior; no runtime claims."""
import copy,json
from pathlib import Path
from jsonschema import Draft202012Validator, FormatChecker
root=Path(__file__).resolve().parents[1]
def read(p):return json.loads((root/p).read_text())
def validator(p):
 s=read(p);Draft202012Validator.check_schema(s)
 return Draft202012Validator(s,format_checker=FormatChecker())
canonical=read('tests/fixtures/canonical-valid.json')
v=validator('schemas/canonical.schema.json')
v.validate(canonical)
checks=1
def reject(value,mutate,validation):
 global checks
 x=copy.deepcopy(value);mutate(x)
 assert list(validation.iter_errors(x)), 'negative fixture unexpectedly accepted'
 checks+=1
reject(canonical,lambda x:x.pop('golden_rule'),v)
reject(canonical,lambda x:x['repository'].update(integration_branch='main'),v)
reject(canonical,lambda x:x['phase_one'].update(workstreams=12),v)
reject(canonical,lambda x:x['golden_rule'].update(status_ladder=['Complete']),v)
reject(canonical,lambda x:x.update(updated_at='2026-99-99'),v)
reject(canonical,lambda x:x.update(unreviewed_policy=True),v)
a=validator('schemas/architecture-change-request.schema.json')
for p in sorted((root/'architecture/acrs').glob('*.json')):
 a.validate(json.loads(p.read_text()));checks+=1
sample=read('architecture/acrs/ACR-0001.json')
a.validate(read('templates/ACR.json'));checks+=1
reject(sample,lambda x:x.update(acr_id='ACR-02-001'),a)
reject(sample,lambda x:x.pop('rollback'),a)
reject(sample,lambda x:x.update(date='not-a-date'),a)
ids={m['id'] for m in read('module-registry.json')['modules']}
for p in (root/'architecture/acrs').glob('*.json'):
 assert set(json.loads(p.read_text())['affected_modules'])<=ids
 checks+=1
print(f'Foundation structure checks passed: {checks}')
