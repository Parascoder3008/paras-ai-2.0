# Connections

Registry of every system this AI OS can reach. Domain model + audit criteria adapted from [nateherkai/AIS-OS](https://github.com/nateherkai/AIS-OS) (imported 2026-07-26). `/audit` reads this file for domain coverage and freshness; `/level-up` reads it before proposing new automations.

**Mechanism key:** `mcp` (Claude MCP server) · `cli` (dedicated CLI + skill) · `script` (API script) · `direct-file` (plain folder Claude reads/writes with file tools) · `not yet connected`.

| # | Domain | Tool | Mechanism | Auth | Last verified |
|---|---|---|---|---|---|
| 1 | Revenue / Financials | Razorpay, Stripe | not yet connected | — | — |
| 2 | Customer interactions | GoHighLevel (all 3 communities, one sub-account) | `cli` — `ghl` CLI ([[ghl-cli-setup]]) | env vars `GHL_API_KEY` / `GHL_LOCATION_ID` | 2026-06-29 |
| 3 | Calendar | GHL calendars ("FREE WEBINAR", "5-Day Event Kickoff") + Google Calendar | `cli` (GHL) + `mcp` (Google Calendar) | GHL env vars; Google Calendar OAuth (connected) | 2026-06-29 (GHL) |
| 4 | Communication | AiSensy (WhatsApp), Gmail, GHL conversations | `script` (AiSensy send recipe, [[aisensy-setup]]) + `mcp` (Gmail) + `cli` (GHL) | env vars `AISENSY_API_KEY` / `AISENSY_PROJECT_KEY`; Gmail OAuth (connected) | 2026-06-29 (AiSensy) |
| 5 | Project / task tracking | Notion (source of truth, §7) | `mcp` | Notion OAuth (connected) | not tracked |
| 6 | Meeting intelligence | Fireflies | `mcp` — **needs-auth** | not yet authorized via claude.ai connector settings | — |
| 7 | Knowledge / files | Google Drive, Obsidian vault (second brain) | `mcp` (Drive) + `direct-file` (Obsidian, [[obsidian-second-brain]]) | Google Drive OAuth (connected); Obsidian = local files, no auth | 2026-06-29 (Obsidian seeded) |

## Tier-2 (bonus, not scored against the 7 domains) — CONNECTED

| Tool | Purpose | Mechanism | Auth | Last verified |
|---|---|---|---|---|
| n8n (self-hosted, Hostinger) | Orchestration glue — deterministic loops (lead capture, scoring, reminders) | `mcp` (`n8n-mcp`) + REST | `N8N_API_KEY` in `.mcp.json` (git-ignored; verified 2026-08-30 — it is not in `.claude/settings.json`), non-expiring ([[n8n-setup]]) | 2026-06-29 |
| Obsidian `Decision/` folder | Append-only decisions log (this project's equivalent of a `decisions/log.md`) | `direct-file` | none | 2026-06-29 |
| TradingView (personal, not business-facing) | Chart control for trading strategy work | `mcp` | connected | — |
| Meta Ads | Paid campaign data/creative (plan/analyze only — spend stays human, §5) | `mcp` | connected | — |
| **Supermetrics Marketing Analytics** | 150+ source aggregator (ads, social, CRM) — **fills the "Analytics & Reports" enabler flagged as still-to-build in `ai-os/README.md`** | `mcp` | connected | — |
| Canva | Design generation/editing for social + brand assets | `mcp` | connected | — |
| Gamma | Presentation/deck generation — pitch decks, proposals | `mcp` | connected | — |
| Higgsfield | AI image/video/avatar generation, ads (Marketing Studio) | `mcp` | connected | — |
| Netlify | Web hosting/deploy — landing pages | `mcp` | connected | — |
| Indeed | Job search — hiring for the 7-person freelance team | `mcp` | connected | — |
| EULER | Partner-program queries | `mcp` | connected | — |

## Not yet connected / needs auth (available connectors, unwired)

Per session connector roster — authorize via claude.ai connector settings when a use case lands:

- **Aisensy** (claude.ai connector) — separate from the working manual API integration above; would give native tool calls instead of the raw HTTP recipe.
- **Dhan** — brokerage, personal trading side, not business-critical.
- **Figma** — could feed `ui-designer` agent directly for landing-page handoff.
- **Heygen** — AI avatar video; redundant with Higgsfield (already connected) for the "AI avatar short-form" content line (§3) — skip unless Higgsfield falls short.
- **Learning Commons Knowledge Graph** — unclear fit yet.
- **Madgicx** — paid-media analytics; overlaps with Supermetrics (now connected) — only add if Madgicx's Meta-specific optimization signals prove worth the second tool.

## Genuinely missing (no connector exists at all)

- **Razorpay, Stripe** (Revenue/Financials, domain 1) — no MCP in the roster. Only path is an API script (`scripts/razorpay_api.py`) + `references/razorpay-api.md`. This is the one real hole in domain coverage.

## Notes

- Sending/spend actions through any of the above stay approval-gated per root `CLAUDE.md` §5 regardless of connection mechanism.
- When a new tool gets wired in: add a row here AND save a `references/{tool}-api.md`-equivalent memory (`type: reference`) — researched-once-saved-forever, per `ai-os/references/3ms-framework.md`.
