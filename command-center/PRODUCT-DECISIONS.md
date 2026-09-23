# Product decisions — 23 September 2026

Approved by Nicolas: build the private CV job-search command center; track the whole process in one hub; use Drive with a Sheet that can also control records; integrate ngoureau@mac.com for reading, search, analysis, drafts and explicitly approved sending; design for resale, customer isolation, easy configuration and fewer than three onboarding steps.

The owner's connected Drive account is ng@moremarginco.com. This is distinct from the requested mail sender. Never infer that mailbox access is granted by Drive login.

Private Drive folder (owner-only permissions verified):
https://drive.google.com/drive/folders/1O9F6rzHKxiZNuUtPtULusCTvp45QpDpI

Control workbook (owner-only permissions verified):
https://docs.google.com/spreadsheets/d/1_btxq-2-8yfq1FB67SGjJjEbVcTVVfYTvtI4ATAuoBc/edit

Current state: workbook created; isolated web/backend source authored and core tests passed; runtime integrations not connected; no production deployment. The first D1 sketch was superseded and removed before any deployment. Main Interactive CV and Nexus unchanged.

Next release gates in order:
1. Finish safe two-way Sheet updates and automatic record IDs; verify manual sorts, simultaneous edits, write recovery and duplicate prevention.
2. Provision separate private hosting, Access login and product Google OAuth. Verify actual runtime access with the owner account.
3. Test mobile and desktop interactions, keyboard/focus, full CRUD/history/export workflows and session expiry in the deployed private app.
4. Connect iCloud through a private credential entry flow. Verify read and draft behavior before authorizing a test send.
5. Build customer signup/provisioning and test tenant isolation with two real test accounts. Add revoke/delete/export and subscription controls before sale.

No new product name or pricing has been approved. No outreach, applications, messages or reference releases have been sent.
