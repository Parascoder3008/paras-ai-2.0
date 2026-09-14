---
name: ghl
description: Drive the GoHighLevel sub-account (contacts, conversations/WhatsApp+SMS, calendars, opportunities, workflows, forms, payments) from the terminal via the installed `ghl` CLI (Lead Gen Jay's cli-anything-gohighlevel). Use for any GHL action in the AI OS — log/route/tag leads, read or send conversation messages, manage webinar calendar events, track opportunities/conversions, and build nurture workflows. The CRM backbone for the AI OS.
---

# GoHighLevel (GHL)

The CRM/funnel/automation backbone of the [AI OS](../../../CLAUDE.md). Drive it with the installed `ghl` CLI (v2.0.0, by Lead Gen Jay).

## The command

`ghl` is on PATH in new terminals. In this/pre-existing sessions use the full path:
```
"C:\Users\PARAS ARORA\AppData\Roaming\Python\Python314\Scripts\ghl.exe"
```
Source repo (with workflow builders + docs): `tools/gohighlevel-cli`. Bare `ghl` opens an interactive REPL — for scripting always pass a command, and add `--json` for parseable output.

## Credentials (environment variables)

The CLI reads creds from env vars (no .env auto-load in code):
- `GHL_API_KEY` — Private Integration Token (`pit-…`)  **(required)**
- `GHL_LOCATION_ID` — the sub-account ID  **(required — there's a wrong hardcoded default otherwise)**
- `GHL_FIREBASE_REFRESH_TOKEN` — optional; only needed to **create/update workflows** via the internal API (public API is read-only for workflows). Get it via `tools/gohighlevel-cli/docs/get-firebase-token.md`.

These are set as **persistent user env vars** on this machine. If a command errors with "GHL_API_KEY not set", set them inline: `GHL_API_KEY=pit-… GHL_LOCATION_ID=… ghl …`, or re-set the user env vars.

## Command groups

| Group | Key commands |
|-------|--------------|
| `contacts` | list, get, create, update, delete, search, add-tag, remove-tag |
| `conversations` | list, get, messages, **send** (SMS / WhatsApp / email) |
| `calendars` | list, get, slots, appointments, book, groups |
| `opportunities` | list, get, create, update, delete, pipelines |
| `workflows` | list (create/update need the Firebase token + `--experimental`) |
| `forms` | list, submissions |
| `payments` | transactions, orders, invoices, create-invoice |
| `emails` | list-campaigns |
| `social` | accounts, posts, create-post |
| `locations` | get, search, tags, custom-fields, custom-values |

## Common AI OS recipes

```bash
ghl --json contacts list --limit 5                      # smoke test
ghl --json forms submissions                            # new webinar registrants
ghl contacts add-tag --contact-id <id> --tag webinar-registered
ghl --json calendars list                               # find the webinar event/calendar
ghl --json conversations list --contact-id <id>         # read a lead's thread
ghl conversations send <conversation_id> --type SMS --message "..."   # GATED: see below
ghl --json opportunities list --status open             # who's converting
```

## Rules (AI OS guardrails)

- **Sending messages is approval-gated** (CLAUDE.md §5). NEVER send WhatsApp/SMS/email broadcasts to real leads without Paras's explicit OK. Test sends go to **Paras's own number first**. Logging/tagging/reading is auto-OK.
- **Compliance (hard):** education only — no income/return/guarantee claims; trading = portfolio skills only, never signals. Pass outbound copy through the compliance guardrail before sending.
- **Money actions** (invoices, payments, refunds) = always ask Paras.
- Built to **clone per client** — the same CLI + a client's PIT/Location ID runs their sub-account (the DFY product).
- Prefer the `ghl` CLI for GHL work over raw API calls; append `--help` to any group for exact flags.
