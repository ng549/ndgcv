# Approved Product Decision Registry

Status: HISTORICALLY APPROVED / requires V2 revalidation where architecture changed.
Rule: this file records product behavior that should survive as requirements; it does not preserve V1 code.

| ID | Decision / behavior | Historical evidence | V2 treatment |
|---|---|---|---|
| APD-01 | Agency View shows Nexus as an internal project plus customer projects; Merchant PRO contains MHC; Cabinet is a separate project. | Merchant-PRO `src/index.js` project catalog/default records; repeated operator decisions. | Preserve concept; Worker 6 owns tenancy/project model. |
| APD-02 | Agency/operator sees all authorized projects; customers see only assigned projects. | `projectAccess`, `resolveProjectAccess`, project routes. | Preserve requirement; rebuild authorization. |
| APD-03 | Invitations are email-specific, project-specific, reusable for 48 hours, and require explicit project selection. | commit `9db04d38...`; branch `feature/nexus-invitations-48h-project`; commit `a0dab5d6...` future email wording. | Preserve requirement; rebuild on managed identity. |
| APD-04 | Project admins can manage members; owner-only restrictions apply to administrator management. | `handleMemberships`, account UI. | Preserve least-privilege concept. |
| APD-05 | Task search must accept arbitrary task text, not only IDs. | `feature/nexus-task-search`, tip `b4884cca...`; operator requirement. | Preserve requirement; choose V2 search mechanism. |
| APD-06 | Tasks are clickable and open into the workspace where work is performed. | Nexus task board requirements and operator decisions. | Preserve; Worker 9 owns Work Packet execution. |
| APD-07 | “Implemented”, “Tested”, “Deployed”, and “Accepted” are separate states; human acceptance is explicit. | `nexus-tasks.js`, acceptance/revision gate branch `7ba0f040...`. | Preserve strongly. |
| APD-08 | Parallel Codex and Grok build paths; neither is mandatory intermediary for the other; draft changes require human release/acceptance. | `grok/nexus-operator-control` tip `ee5849be...`; NX-028/029 definitions. | Preserve as execution-policy input to Worker 9. |
| APD-09 | Control Panel consolidates profile, invitations, explanation level, BYOK, preferences, shortcuts; items have icons. | `feature/nexus-control-panel-menu` and operator decisions. | Preserve product IA; Worker 11 UI, Worker 6/8 domain ownership. |
| APD-10 | Quark is dormant until opened, bottom-right, non-obstructive, context-aware, provider-neutral, project-memory isolated, optional authorized global scope. | `assistant.js`; task NX-007/NX-027; operator decisions. | Preserve behavior; rebuild architecture. |
| APD-11 | Quark supports idle/thinking/working/listening/waiting/success/error plus angry, surprised, wink, hands-up, clapping, mouth motion; reduced-motion support required. | `quark-character.js`; NX-007/NX-025/NX-027 criteria. | Preserve behavior and approved asset; do not inherit renderer wholesale. |
| APD-12 | Customer/collaborator BYOK must never fall back to Nicolas’s providers. | `assistant.js` Quark law; V2 canonical invariant. | Binding V2 requirement; Worker 8. |
| APD-13 | Header left: nucleus + Nexus + stacked tagline. Right: date/time; location + weather same row; account/name + sign out; menu below/within controlled layout; equal visual height. | foundation tip `8893eb98...`; header browser assertions; operator decisions. | Preserve visual requirement; Worker 11 rebuild. |
| APD-14 | Location/weather spacing is compact; foundation merge asserts ~8–9px maximum gap and tight account spacing. | commit `8893eb98...`. | Reference as historical acceptance target, not pixel law if Worker 11 re-systematizes. |
| APD-15 | Buttons should have dimensional/3D feel; selected state uses purple working color; task outlines show status. | `feature/nexus-button-depth-mobile-header`; operator decisions. | Preserve visual semantics; rebuild tokens/components. |
| APD-16 | Mobile/accessibility are first-class, including keyboard, contrast, reduced motion, and phone header/menu behavior. | `fix/mobile-menu-accessibility`; NX-016; responsive CSS. | Preserve requirement. |
| APD-17 | Customer intake/update forms are generated from open tasks, adjustable burden/depth, admin-approved before delivery, and appear in Nexus operator task flow. | Operator-approved requirement; V1 task NX-010 only shows planning, no verified complete implementation found. | Preserve requirement; REBUILD. |
| APD-18 | Costs appear in operator/project context, with project allocation, AI usage, invoice/provider reconciliation and honest exact-vs-estimated status. | `handleCosts`, Cost Ledger functions, reconciliation commits `c072e790...`, `7e057999...`, `3d8f1d4...`. | Preserve concepts; Worker 8/10 redesign normalized cost events. |
| APD-19 | Nexus must build/manage Nexus through governed tasks, approvals and evidence rather than invisible agent work. | NX-024 and executor workflows. | Preserve governance concept; Worker 9/13. |
| APD-20 | Production/source-of-truth must be explicit; older `broad-cherry` deployment is not production authority. | `NEXUS-SOURCE-MANIFEST.md`; operator directives. | Preserve governance; Control Tower. |
