# Quark Audit

Status: INSPECTED.

## 1. Approved product behavior
Preserve as requirements:
- stable name/identity: Quark;
- bottom-right floating presence;
- dormant until opened;
- contextual help/right-click summon concept;
- guided help/tours;
- project memory isolation;
- authorized global mode only from Nexus/operator context;
- provider-neutral assistant identity;
- explanation depth 0–5;
- BYOK non-fallback;
- status/activity indicator;
- reduced-motion accessibility;
- expressions/states including idle, thinking, working, listening, waiting, ready/success, error/attention, angry, surprised, wink;
- hand poses including hands-up and clapping;
- mouth movement when speaking;
- must not obstruct controls.

Classification: **ADAPT** as V2 product contract.

## 2. Visual assets
`quark-character.js` imports `QUARK_APPROVED_REFERENCE` and explicitly says it uses the exact approved screenshot, not generated replacement art.
Classification: approved source visual asset **ADAPT** / preserve provenance; verify rights/source in Worker 11 asset registry.

## 3. Animation implementation
The renderer clips body/ring/eyes/mouth/hands from a screenshot atlas and drives a large CSS custom-property state machine. It includes explicit reduced-motion handling and state transitions, but is DOM/CSS-coupled and complex.
Classification: **REBUILD** renderer; **REFERENCE ONLY** motion/state timings/acceptance tests.

## 4. AI/copilot behavior
`assistant.js` defines Quark law: friendly/plain-language output, explanation depth, read-only screen-context evidence, secret non-disclosure, approval/cost/access boundaries, BYOK non-fallback, provider neutrality.
Classification: **ADAPT** policy into Worker 8 gateway + Worker 13/11 UX.

## 5. Memory/context behavior
Historical namespace hashes project + email; Merchant PRO receives a special legacy namespace to retain MHC continuity. Global memory requires Nexus project + approver.
Good concept: explicit project isolation and separately authorized global scope.
Bad fit: email identity and Merchant-PRO special case.
Classification: **REBUILD** storage/context on stable V2 user/tenant/project IDs.

## 6. Project/global behavior
Preserve explicit capability boundary. Do not implement global as wildcard tenant access; Control Tower forbids tenant impersonation.
Classification: **ADAPT** authorization requirement.

## 7. BYOK
The policy is correct, but a complete tenant credential mechanism was not verified in the inspected V1 code. Server-level OpenAI/xAI provider credentials existed.
Classification: policy **REFERENCE ONLY**; credential execution **REBUILD** under Worker 8.

## Destination
- Worker 11: visual/motion/shell.
- Worker 8: provider/BYOK/routing.
- Worker 6: user/project authorization context.
- Worker 13: operator/global UX.
- Worker 10: audit/telemetry as needed.
