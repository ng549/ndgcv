# MCP Strategy

## Use MCP when
- an agent/user is performing interactive discovery or bounded actions;
- an official or reviewed server provides meaningful reuse;
- auth can be isolated per tenant/project;
- tool schemas and permissions can be versioned and logged;
- failure can be surfaced without corrupting durable sync state.

## Prefer conventional API/webhook/sync when
- moving durable business records;
- exact delivery/retry/idempotency guarantees matter;
- high-volume/bulk data is involved;
- reconciliation and deterministic reprocessing are required;
- MCP server capability or release stability is insufficient.

## MCP integration contract
ServerRegistration: id, owner, source_url, deployment, trust_tier, version/commit, license, commercial_rights_status, auth_method, allowed_tenants, tools, resource_scopes, read_only_default, health_probe, last_reviewed_at.
McpConnection: server_registration_id, tenant_context, credential_reference_id, granted_tools/scopes, status, expires_at.
McpInvocationAudit: invocation_id, tenant_context, server/tool/version, actor, request_hash/redacted_args, approval_ref?, started_at, result_status, cost/latency, correlation_id.

## Security
No shared customer context. One invocation resolves one tenant context. Raw secrets never enter prompts. Treat tool output as untrusted content. Destructive/financial/deployment writes require policy approval. Pin versions for self-hosted servers; record remote server capability/version when exposed. Monitor reachability, auth failures, latency, tool-schema drift and error rate.

## Trust tiers
1. Official vendor remote MCP with documented auth/security.
2. Official vendor self-hosted MCP, pinned and reviewed.
3. Maintained community MCP after source/license/security review.
4. Reference-only; no production credentials.

MCP Registry inclusion is discovery metadata, not approval.
