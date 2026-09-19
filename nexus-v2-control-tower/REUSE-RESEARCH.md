# Control Tower Reuse Research

Research snapshot: 2026-09-19. Repository activity and licensing were checked against the named upstream repositories and pinned commits.

| Candidate | License / commercial use | Pinned commit | Maintenance | Decision | Integration / lock-in / custom gap |
|---|---|---|---|---|---|
| [Backstage](https://github.com/backstage/backstage) | Apache-2.0; commercial use permitted with notice obligations | `1907c2664d36a95d759fbe429de7334b70971d3d` | Active on snapshot date | DEFER runtime; USE catalog concepts | Full portal adoption is high effort and TypeScript/Backstage-coupled. Use entity/catalog ideas now; Nexus-specific operator economics, approvals, and client boundaries remain custom. |
| [OpenAPI Specification](https://github.com/OAI/OpenAPI-Specification) | Apache-2.0; commercial use permitted | `c9f8f040e825a827bb011955bd41b7e2d899688f` | Active | USE | Low lock-in because tooling is broad. Nexus still defines its resource semantics, auth, errors, and version policy. |
| [AsyncAPI Specification](https://github.com/asyncapi/spec) | Apache-2.0; commercial use permitted | `1dd65fd2c1ed13f06365c1e870c61cdc82d8a981` | Active | USE | Low-to-moderate tooling coupling. Nexus still defines event names, envelope, ownership, privacy, and compatibility. |
| [JSON Schema](https://github.com/json-schema-org/json-schema-spec) | Upstream license file includes permissive terms; legal review required before redistributing specification text | `4f56a9900674b27804f0ec32e3b7fdfa4efad695` | Active | USE the standard; do not copy specification text | Broad ecosystem and low lock-in. Nexus schemas and compatibility policy remain custom. |
| [MADR](https://github.com/adr/madr) | MIT or CC0-1.0; commercial use permitted | `ba75bb1b20d42af5746b246ad348c202419ae681` | Active | FORK-EXTEND concept | Very low runtime lock-in. Nexus template adds commercial-rights, verification, migration, and cross-module controls. |
| [OpenTelemetry specification](https://github.com/open-telemetry/opentelemetry-specification) | Apache-2.0; commercial use permitted | `148f27606cf0352c11a314e7bf9eefa6bf88db86` | Active | DEFER implementation; ALIGN identifiers | Vendor-neutral but instrumentation effort is material. Runtime selection belongs with Managed Ops; Control Tower reserves correlation/trace fields. |
| [Model Context Protocol specification](https://modelcontextprotocol.io/specification/2026-07-28) | Protocol/specification; implementation licensing must be checked per SDK/server | 2026-07-28 specification | Current published specification located | INTEGRATE selectively | MCP is a tool/context boundary, not Nexus's system-of-record event bus. Each server requires separate permissions, data-flow, maintenance, and commercial review. |

## Accessible skills and MCP/app capabilities

The current work environment exposes authenticated GitHub and Google Drive operations plus specialized Cloudflare, browser, document, spreadsheet, presentation, PDF, design, and deployment skills. These accelerate research and bounded delivery but are not themselves production Nexus dependencies. Workstream 2 must create the exhaustive MCP/server/skill registry and evaluate each candidate's authentication, data exposure, maintenance, and commercial use.

## Security notes

- Schemas and catalogs prevent drift only when CI enforces them.
- Generated clients can reproduce a flawed contract; security review remains mandatory.
- MCP servers expand the tool and data attack surface. Treat retrieved content as untrusted input and grant least privilege.
- Backstage or another portal must not become an accidental second source of truth.

