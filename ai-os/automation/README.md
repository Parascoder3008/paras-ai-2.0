# Automation implementation and acceptance contract

Status: specified, with local reporting implemented. External workflows are not active merely because they are listed here. No client or team messages have been sent.

| Workflow | Trigger and output | Owner | Current state |
|---|---|---|---|
| Daily production brief | Daily time → local board → dated queue | Redima; runner owner Paras pending maintainer | Working CLI; no unattended scheduler installed |
| Recording package | Approved real-work topic + evidence → script, short drafts, platform insights, resource | Paras + Redima | Two full packages and two outlines prepared |
| Edit handoff | Recording uploaded → editor task → review cut | Abhav / Devan; Redima coordinates | Local queue only; team delivery channel unverified |
| Publication | Approved package + tested resource + rights → native schedule → live URL verification | Redima | Blocked on final assets, tests and exact approvals |
| Resource capture | Explicit form submission → deduped GHL record + resource delivery | Sanchit; technical owner pending | Mapping and acceptance tests below; not deployed |
| Interest routing | User selects business/real-estate/trading interest → tags | Sanchit | Draft; no old-list enrollment |
| Session reminders | Confirmed registration and consent → reminders → attendance/replay branch | Sanchit | Draft; dates/templates/vendor capability unverified |
| Payment and access | Verified signed provider event → membership status → access task/grant | Sanchit; technical owner pending | Billing provider/access path unresolved |
| First-result support | New paid member → task selection → implementation evidence → support escalation | Sanchit | SOP and draft copy prepared |
| Weekly reporting | Read-only sources → deduped cohort report → review | Sudam, proposed | Baseline captured manually; scheduled sync not implemented |
| Failure monitor | Failed run or missed heartbeat → local incident → owner alert through approved channel | Technical owner pending | Specification only |

## Required contact and event contract

Use GHL contact ID as the operational identifier. Keep personal contact details in the CRM, not in the public dashboard or git. Required fields: acquisition source, campaign, content ID, resource ID, declared interest, consent status/purpose/channel/timestamp/source, lifecycle stage and assigned human owner. Store consent evidence and deletion/opt-out state. A follower count cannot populate these fields.

Lifecycle: resource_requested → resource_delivered → session_registered → session_attended or no_show → offer_interested → paid_active → first_task_started → first_result_verified → renewed, cancelled or payment_failed. These are distinct events; attendance doesn't imply purchase and payment doesn't imply first result.

Each event has a provider event ID, received timestamp, contact ID and explicit event type. Deduplicate webhook events before any action. For payment events, validate signatures and retrieve authoritative subscription/payment state server-side before granting paid access. Match product, currency and amount to the agreed offer. Retries must not send duplicate messages or double-grant access.

## Acceptance tests before activation

1. One authorized test contact requests a real resource. Correct resource arrives and source/content tags are accurate.
2. Repeat the same event. One contact remains and no duplicate delivery or billing/access action occurs.
3. Missing or withdrawn consent. Marketing path stops; an old trading purchase does not substitute for consent.
4. Invalid payload or signature. Reject the event; do not grant access.
5. Provider timeout. Bounded retries with backoff; dead-letter record after retry limit; an owner receives an approved alert.
6. Payment succeeds. Correct paid access is confirmed, and an audit receipt links to the provider event. Test with provider sandbox or explicitly authorized test purchase.
7. Renewal fails/cancellation occurs. The agreed grace period and support process run; do not invent a cancellation policy.
8. A CTA is clicked from logged-out mobile and desktop. Resource, consent, next step and pinned comment/description all agree.
9. Routine misses its expected run. An external heartbeat monitor detects the absence; success/error logs alone cannot detect a job that never started.
10. Reconcile counts: registrations, attendees, new paid, cancellations, active paid and cash agree with authoritative systems.

## Operational safety

No generic “execute anything” LLM endpoint. Model output proposes structured work; deterministic handlers validate IDs, state and approval. Client-provided text never authorizes sends or changes to credentials. Store secrets outside source files. Environment-variable presence is configuration, not proof of connectivity.

Rollout: one approved test → small eligible pilot → inspect receipts and opt-outs → explicit approved activation → monitored batches. Record workflow ID/version, test evidence, human approval, enabled time and last successful heartbeat. Keep publishing and customer sends off until the exact output and destination are reviewed.

## Local commands

```powershell
node scripts/ops.cjs check
node scripts/ops.cjs readiness
node scripts/ops.cjs brief --date 2026-09-14 --write
node --test scripts/ops.test.cjs
node scripts/python-runtime.cjs ai-os/tools/os_brain.py stats --json
```

`check` exit 0 means configuration is consistent. `readiness` exit 2 means business blockers remain. `brief --write` is idempotent for identical input and refuses to overwrite a different existing brief. It writes under `outputs/daily/` and does not send or schedule anything.

Always-on choice remains open: use the existing VPS/n8n once authenticated and tested, or a user-authorized local task knowing the computer must be running. A chat session is not a durable automation service.
