# Nexus V2 — Licensing Risk Register

Date: 2026-09-19

## Risk levels

**RED — legal/commercial decision before adoption in shared/client product**
- **n8n** — Sustainable Use License + commercial licenses. n8n explicitly states that hosting/managing client workflows and credentials in Nexus requires Enterprise; embedding for clients requires Embed/commercial rights.
- **Windmill** — AGPLv3 core plus commercial self-host terms. Treat proprietary multi-tenant embedding or managed-client exposure as legal/commercial review.
- **Lago** — AGPLv3 main platform plus commercial/embedded options. Do not embed the AGPL platform into proprietary Nexus without an intentional compliance or commercial decision.
- **Documenso** — AGPL-3.0 Community plus commercial Enterprise. Official docs distinguish API-only SaaS use from modified/white-label proprietary use; latter belongs on commercial licensing.
- **Airbyte** — Elastic License 2.0 platform/strategic connectors. Internal integration is different from offering Airbyte itself as a managed service.
- **Nango** — Elastic License 2.0/open product plus commercial cloud/enterprise. Nexus may use it as integration infrastructure, but do not treat it as a freely redistributable component.
- **Appsmith Enterprise** — Community is Apache-2.0, but current Enterprise terms state internal-business-purpose use and no resale/third-party benefit. Using Enterprise to power client-facing deliverables requires written commercial fit.
- **Renovate self-host** — AGPL licensing should be reviewed if Nexus operates it as a service for third parties; GitHub-native Dependabot is lower-friction where adequate.

**AMBER — pin exact version/edition and preserve notices**
- **Formbricks main application** — repository root is AGPLv3; specific JS/Android/iOS/API packages are MIT and EE code is separately licensed. Main-app embedding/modification requires AGPL/commercial analysis.
- **Renovate self-host** — repository license is AGPL-3.0. Running it for Nexus internally is different from distributing/modifying/operating it as a customer-facing service; prefer GitHub-native Dependabot where it is sufficient.
- **Cal.com / Portkey** — exact selected edition/version/license and enterprise-feature boundary must still be pinned before embedding or transfer.
- **Sentry self-host** — use managed cloud initially unless current self-host/source terms are deliberately accepted.
- **Grafana** — AGPL core; cloud is straightforward, but proprietary redistribution/embedding of core needs review.
- **AG Grid Enterprise** — paid developer license/EULA. Community edition is permissive; advanced enterprise features carry license obligations.

**GREEN — generally suitable permissive licenses, still retain notices**
- Temporal (MIT)
- LiteLLM core outside the enterprise directory (MIT)
- Helicone core (Apache-2.0)
- Refine (MIT)
- PostgreSQL / pgvector (permissive PostgreSQL-style)
- OpenTelemetry (Apache-2.0)
- Qdrant (Apache-2.0)
- Appsmith Community (Apache-2.0)
- TanStack Table (MIT)
- Chart.js (MIT)
- React Hook Form (MIT)
- Langfuse product/core (MIT; enterprise governance modules remain commercial)
- OpenMeter (Apache-2.0; pin exact release)

## Commercial-use matrix

| License/terms | Nexus internal | Shared multi-tenant platform | Dedicated client deployment | Software licensed to customer | Code transferred to customer |
|---|---|---|---|---|---|
| MIT/BSD/Apache-2.0 | Usually low risk | Usually low risk | Usually low risk | Usually low risk | Preserve notices/attribution |
| MPL/LGPL | Usually workable | Usually workable | Usually workable | Review linking/modification boundaries | Provide required source for covered modifications/libraries |
| GPL | Internal use straightforward | Network use alone may not trigger GPL distribution, but packaging/distribution can | Review distribution model | High review | Source obligations likely if distributed derivative |
| AGPL | Internal use possible | **High review** because network interaction can trigger source-offer obligations for modified program | Review | **High review** | Strong copyleft obligations |
| ELv2 / source-available | Depends on restrictions | Review managed-service/competitive offering restrictions | Review | Review | May prohibit certain redistribution/service models |
| BSL | Depends on change date/use grant | Review production/commercial restrictions | Review | Review | Version-specific |
| Commercial SaaS | Per contract | Per contract | Per contract | Resale generally not implied | No code rights unless contract grants them |

## Required operating rule

Every adopted third-party component must have an Architecture/Reuse Record with:
1. exact repo/package/product;
2. exact version or commit;
3. exact license/terms URL;
4. deployment model;
5. Nexus internal-use conclusion;
6. shared-platform conclusion;
7. dedicated-client conclusion;
8. resale/transfer conclusion;
9. required notices;
10. legal-review flag;
11. replacement path.

## Evidence
- n8n commercial-use guidance: https://support.n8n.io/article/can-i-use-your-license-for-my-use-case
- n8n EULA effective 2026-08-27: https://n8n.io/legal/eula/
- Windmill terms: https://www.windmill.dev/terms/2025-12-01
- Airbyte ELv2 explanation: https://airbyte.com/blog/move-to-elv2
- Documenso license: https://docs.documenso.com/docs/policies/licenses
- Documenso enterprise guidance: https://docs.documenso.com/docs/policies/enterprise-edition
- Langfuse license/self-host: https://langfuse.com/pricing-self-host
- Appsmith terms: https://www.appsmith.com/terms-and-conditions
- AG Grid EULA/pricing: https://www.ag-grid.com/eula/commercial/ and https://www.ag-grid.com/license-pricing/


## License pins verified directly from GitHub on 2026-09-19

- LiteLLM `BerriAI/litellm`: root LICENSE states MIT for content outside `enterprise/`; enterprise code has separate license.
- Helicone `Helicone/helicone`: Apache License 2.0.
- Refine `refinedev/refine`: MIT.
- Semgrep `semgrep/semgrep`: LGPL-2.1.
- Renovate `renovatebot/renovate`: AGPL-3.0.
- Formbricks `formbricks/formbricks`: AGPLv3 for main content, MIT for listed JS/mobile/API packages, EE directory separately licensed.
