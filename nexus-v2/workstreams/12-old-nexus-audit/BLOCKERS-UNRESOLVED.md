# Blockers and Unresolved Questions

Status: none block further Worker 12 documentation; these require downstream owner decisions or production access.

1. Exact live production behavior of historical V1 is not being re-tested in this audit. Historical verification is labeled as such.
2. Some V1 branch commit histories are fragmented/divergent; provenance records identify exact tips/known commits where obtained and mark other status unknown.
3. Exact origin/licensing/provenance of approved Quark image/brand assets must be confirmed by Worker 11 before production reuse.
4. Worker 6 must choose final identity provider and authorization implementation after WorkOS/Clerk spike.
5. Worker 9 must choose durable execution substrate; Temporal is a Worker 2 candidate, not an accepted architecture.
6. Worker 10 must choose billing/metering combination and validate pricing/financial reconciliation.
7. Current Cloudflare production configuration/secrets were not inspected and were not required to modify; only names/dependencies from source were cataloged.
8. Historical `mhc-hud` production source has multiple eras: recovered Nexus repo package then later Merchant-PRO deployment path. V2 should not treat either as current architecture.
9. Customer adaptive forms were approved as behavior but no complete V1 implementation was verified.
10. BYOK non-fallback exists as policy, but a complete tenant-isolated V1 credential subsystem was not verified.
11. Some project-specific Cabinet/MHC behavior may contain useful module logic not necessary for V2 core Phase One; it is intentionally separated for future module-specific review.
