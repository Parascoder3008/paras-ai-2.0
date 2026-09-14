# Ledger — Paras

The human-readable work record. Rows are written as work happens, newest at the top. `/log` is the backstop, not the mechanism.

Format: `- YYYY-MM-DD HH:MM · <seat> · <area>/<type> · <summary>`

Types: `build` · `decision` · `ship` · `research` · `note`. Distinct from `ai-os/agent-runs.jsonl`, which is machine run-history for the dashboard and is git-ignored.

---

- 2026-09-14 · paras · workspace/ship · Completed the authorized Paras AI 2.0 delivery: 16 curated Obsidian notes applied with read-back verification and historical Master Map backup. Confirmed the existing private Parascoder3008/paras-ai-2.0 repository and matching foundation commit, then prepared the final completion record. Exact final GitHub and Obsidian receipts stay in ignored outputs. Original workspace changes and separate project histories preserved; business execution remains separate.

- 2026-09-13 · paras · content/build · Finished the Sep 14–27 sprint pack the board already referenced but disk did not have: OS03 and OS04 outlines, 14 daily short drafts, the Business System Starter Kit resource, and community onboarding/moderation drafts. All drafts; no resource hosted, no send, no publication.
- 2026-09-13 · paras · ops/build · `ops.cjs check` was reporting configuration_valid with five board rows pointing at files that did not exist. `validate()` now fails on any package or evidence path missing from disk, with a test. Nine ops tests pass; readiness still exits 2 on eleven open business blockers.

- 2026-09-13 · paras · offer/decision · User clarified course plus long-term mentorship: INR 19,999 paid once for 12 months or INR 3,999/month base. INR 500 selected discount means INR 3,499/month; INR 2,499 remains a candidate. UAE AED 300/month and US USD 49/79 are future proposals. Annual value is not monthly MRR.

- 2026-09-13 · paras · strategy/decision · User clarified training-first entrepreneurs funnel, 200 active recurring members, two YouTube videos/week, daily shorts, Hinglish, ₹2 lakh monthly envelope, five named team members. Daily recording does not mean daily long-form publication.
- 2026-09-13 · paras · ops/build · Read-only channel/community audit and local operating-console implementation. YouTube 27,070; Instagram 3,054; linked Skool 411 and archived. No sends, posts, purchases or external activations performed. Price and paid baseline remain unresolved.

- 2026-08-30 13:05 · paras · workspace/build · Populated `docs/_index.md` with real routing rows across systems, integrations, offers, brand and apps. It had shipped saying "nothing built yet", which was true of the template and false here.
- 2026-08-30 13:00 · paras · workspace/decision · `MEMORY.md` claim in CLAUDE.md §11 corrected. Project memory directory is empty; nothing was being auto-loaded. Durable record is `ledger/` + `agent-runs.jsonl`.
- 2026-08-30 12:55 · paras · workspace/build · Rewrote `/prime` for this OS: loads constitution + bible + roadmap + writing style + docs index + ledger, names the on-demand files instead of pre-loading them, and never pre-loads `ai-os/inbox/`, `ai-os/content/` or the vendored `reference/` libraries. Added two standing checks — roster drift and `.mcp.json` still ignored.
- 2026-08-30 12:50 · paras · workspace/decision · Business keys stay as system environment variables, not copied into `.env`. GHL, AiSensy, Apify and the Obsidian path are already set there; `scripts/utils/config.py` calls `load_dotenv` without `override`, so system env wins and the scripts read them with no change. Keys never sit in a repo file.
- 2026-08-30 12:45 · paras · research/note · Research stack tested: `academic` and `substack` work with no key. Firecrawl and Supadata fail with a clean "not set" message — accounts don't exist yet, and both are paid signups Paras has to do himself.
- 2026-08-30 12:30 · paras · workspace/build · Phase 2 — deleted 19 empty duplicate skill directories in `.claude/skills` (73 → 54); real content in `.agents/skills` untouched. Rewrote the seven `context/` stubs as pointer files rather than filling or deleting them: filling would create a second copy to keep in sync, deleting would break the six commands and three skills that read the folder.
- 2026-08-30 12:30 · paras · workspace/note · `context/team.md` is the one real gap. Nine roles documented across the 90-day plan and deploy kit; only Paras is named. `ai-os/100k-roadmap.md` calls delivery on those seven freelancers the binding constraint on the business, and the §5 ad-spend gate can't route to a person until it's filled.
- 2026-08-30 12:15 · paras · workspace/build · Phase 1 — merged the AI OS constitution back into `CLAUDE.md`. Windows had renamed it `CLAUDE (2).md` on paste, so Claude Code was auto-loading the template's placeholder and every session started with no business context and no compliance guardrails.
- 2026-08-30 12:15 · paras · workspace/decision · Roster reconciled against `ai-os/os-manifest.json`, which turned out to be correct: 53 on disk, 53 in the manifest. The prose was stale — bible said 28, OS-STRUCTURE said 33. Both now match and name the manifest as the source of truth.
- 2026-08-30 12:00 · paras · workspace/decision · Removed the template's beginner installer (`/install`, `START-HERE.md`, `.install-state`). Its own Step 0 says to eject when a real system already exists. Pre-merge originals archived to `docs/archive/`.
- 2026-08-30 11:50 · paras · ops/ship · Closed a live secret exposure. `.mcp.json` holds the n8n API key and was not ignored — the AI OS gitignore had arrived as a stray `" (2).gitignore"` and was never in effect. Merged its protections into `.gitignore`; `/log` runs `git add -A`, so the next log would have committed the key.
- 2026-08-30 11:30 · paras · workspace/build · Installed the AIOS template prerequisites: `uv` via winget, `.venv` on Python 3.12, requirements installed, runtime verified. Flattened the double-nested unzip into the workspace root.
