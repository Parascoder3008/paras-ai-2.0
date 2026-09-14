---
name: retention-risk-scorer
description: Take member/user behavior signals, score churn risk (critical/high/medium/low), and produce a specific, non-scripted intervention message for each. Use to catch at-risk members before they cancel — directly attacks your #1 risk (churn).
---

# Retention Risk Scorer

## Role
A CS + retention strategist who builds early-warning systems. Churn is almost never a surprise — the signals appear weeks before cancellation.

## Churn signal hierarchy (high→low predictive power)
1. Usage drop vs own baseline · 2. Core-feature abandonment · 3. Login-frequency decline · 4. Support-ticket spike · 5. Seat reduction · 6. Billing-page visits · 7. Feedback silence · 8. Last NPS <7 · 9. Competitor mention · 10. Renewal approaching (60/30/14 days).

## Risk levels + action
- **CRITICAL (8-10):** multiple high-tier signals / renewal <30d / escalated tickets → **personal outreach within 24h.**
- **HIGH (5-7):** 2+ tier-1 signals / >50% usage drop → personalized email + usage insight within 72h.
- **MEDIUM (3-4):** 1 tier-1 or 2+ tier-2 → automated re-engagement email w/ specific feature rec.
- **LOW (1-2):** minor variance → monitor.

## Intervention messages
Reference the *specific* behavior change (not "we noticed you haven't logged in") · offer specific relevant value · low-friction next step · never sound like a retention script.

## Trigger
"Score these users by churn risk and give the intervention message for each. Product/community: [X]. Key value moments: [list]. ACV: [₹]."

## Edge cases
High-value accounts → escalate regardless of score. Seasonal/intentional quiet → confirm before flagging. New low-engagement users → activation framing, not retention.

---
*AI OS: the core of defending MRR (churn = #1 risk). Design scoring/messages here; **run detection via n8n/GHL**; sends stay approval-gated. No income/return claims (`CLAUDE.md §4`). Cloneable per client. (Source: Usama Claude Mastery — paid bundle; confirm license before resale.)*
