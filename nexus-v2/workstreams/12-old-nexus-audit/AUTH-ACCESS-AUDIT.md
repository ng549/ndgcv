# Auth / Access Audit

Status: INSPECTED / REQUIRES V2 REVALIDATION.
Recommendation for V1 auth implementation: **REBUILD**.

## What V1 did
- Google OAuth identity, verified email.
- AES-GCM encrypted session cookie, HttpOnly, SameSite=Lax, seven-day TTL.
- Identity-only vs operator integration consent.
- Access composed from allowlist, project assignment env JSON, project records, and membership Durable Object.
- Project roles: owner/admin/collaborator/viewer in surrounding logic.
- Project-scoped member administration.
- Invitation token is random UUID pair; only SHA-256 hash stored.
- Same-origin checks on mutations.
- Owner/admin restrictions for managing administrators.
- Project-scoped assistant memory namespace.

## Security-positive patterns worth referencing
- Hash invitation tokens at rest.
- Explicit same-origin mutation guard.
- Recheck authorization on requests instead of trusting UI.
- Separate operator integration consent from normal identity login.
- Encrypt sensitive session payload rather than signing plaintext.
- Deny mutations outside authorized project.
- Protect owner/operator membership from ordinary admin mutation.
These are **REFERENCE ONLY** patterns, not reasons to keep the implementation.

## Security findings
1. **Over-broad Google integration scopes — HIGH.** The code comment claims read-only, but `SCOPES` requests full `drive` and `spreadsheets` scopes. This is a concrete least-privilege mismatch.
2. **Portable credential cookie — HIGH.** Access and refresh tokens are inside the encrypted cookie. AES-GCM protects contents, but possession of the cookie plus application acceptance can confer session/token power. Prefer server-side token custody and an opaque short session cookie.
3. **Authorization has multiple authorities — HIGH.** env allowlists, env project JSON, hardcoded records and membership DO can disagree.
4. **Invitation semantics drift — HIGH.** Foundation logic is seven-day/single-use; later approved requirement is email-specific, project-specific, reusable 48 hours.
5. **Email as identity key — MEDIUM/HIGH.** Email is mutable and should not be the stable user subject.
6. **Hardcoded operator/customer data — MEDIUM.**
7. **No verified enterprise identity lifecycle — MEDIUM.** SSO/MFA/passkeys/session/device controls are not a reusable mature subsystem.
8. **Role labels are not a full authorization model — MEDIUM.** V2 Control Tower correctly states role label alone is not authorization.

## External reuse comparison
Worker 2 is available. It identifies WorkOS AuthKit and Clerk as low-integration-effort B2B identity options with organizations/invitations/RBAC, and Keycloak as a self-hosted reference. This materially weakens the case for salvaging custom V1 auth.

### Recommendation
- Authentication/invitations/session layer: **REBUILD** using maintained identity provider primitives (Worker 6 chooses provider after spike).
- Authorization concepts: **ADAPT** into explicit tenant/project membership + permission grants.
- Invitation token hashing and same-origin patterns: **REFERENCE ONLY**.
- V1 encrypted-cookie token custody: **DISCARD** as architecture.

No auth component qualifies KEEP AS-IS.
