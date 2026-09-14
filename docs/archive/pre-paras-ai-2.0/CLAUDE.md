# Paras AI OS — Operating Constitution

This file is the **constitution** for Paras's business AI OS. Every agent and automation reads and obeys it. Detailed context lives in `ai-os/`, the vision and live asset IDs in `AI-OS-BIBLE.md`, and cross-session notes in the user memory index.

> **Merged 2026-08-30.** This workspace is the AI OS with the AIOS starter template (Liam Ottley) merged into it. The AI OS is the system; the template contributed the session rhythm (§10), the ledger, docs routing, and the research stack (§7). Where the two disagreed, this constitution wins. The template's `/install` beginner path was removed — it is for someone with no system, and that is not this workspace.

---

## 1. Current operator and goal

**2026-09-13 user direction supersedes prior strategy locks.** Read `ai-os/CURRENT-PLAN.md` and `ai-os/operating-plan.json` before planning or execution. Primary goal: 200 active paid course-plus-mentorship members in the entrepreneurs implementation membership over the next 90 days. Social ambitions are separately 100K YouTube subscribers and over 100K Instagram followers.

Paras records daily in a two-hour morning block; two evening hours are available for teaching and feedback. Publish two YouTube videos/week and 1–2 shorts/day. Primary language Hinglish. Team: Sanchit, Sudam, Redima, Abhav and Devan. Role capacities and the automation-maintenance owner remain open.

## 2. Current business

Training membership for service-business owners is primary. Organic content → resource → explicit WhatsApp opt-in → practical session → paid implementation membership → first result and renewal. Keep existing accounts. No current paid Meta acquisition. Real estate and algorithmic trading remain secondary; maintain already-promised client work, but don't expand the agency during this proof phase.

India pricing, confirmed: ₹19,999 paid once for 12 months or ₹3,999/month. A selected ₹500 discount gives ₹3,499/month; ₹2,499 remains an unselected deeper-discount candidate. See `ai-os/course-and-mentorship-offer.md`. The 400+ free Skool audience is not a paid-member baseline. As observed 2026-09-13, the linked Skool group is archived. Source-of-truth separation: GHL for structured contacts/consent, payment provider for billing, Skool for learning, WhatsApp for communication, local plan for operating decisions.

Do not invent client outcomes or first-person experience. Capital and business outcomes remain uncertain; the 4Cs are a framework, not an income promise. The seven-stage learning-to-business philosophy is in CURRENT-PLAN.md.

## 3. Voice & Tone (per community)

> **BRAND — every design, always.** Full spec: `ai-os/brand-guidelines.md` (re-extracted from exponentialworld.ai 2026-08-03).
> **Void `#0C0E0F` · Blue `#1A9FD1` (primary) · Blue-bright `#3AB0D8` · Navy `#11324C` · Text `#FFFFFF` / muted `#DFDDDF` · Inter sans · glass panels, 28px radius.**
> ⚠️ The **violet/purple + Fraunces serif** identity is RETIRED — never use it. The live site's CSS vars are still *named* `--violet`/`--cyan` but hold blue values, so **trust the hex, never the variable name**. Status colors (ok/warn/err) signal state only and are not brand colors.

- **Entrepreneurs Club:** friendly, organic, approachable.
- **Realtor Launchpad & Traders Mastermind:** professional, credible, education-led.
- **Content design = Hybrid:** ONE content brain (Strategist + Repurposer) creates once; YouTube (long-form) and Instagram/Avatar (short-form) get heavier dedicated agents; LinkedIn / X / Facebook / GMB stay light per-platform formatters. Never invent content six times; create once, repurpose, format.
- **All prose follows `reference/writing-style.md`.** It applies to everything produced here, not just marketing copy.

## 4. Compliance Guardrails — HARD RULES (never override)

> Every outbound asset (ad, post, script, message, page) passes the **Compliance Guardrail** before publish/send.

- **Education only.** NO income claims, NO return/profit promises, NO guarantees — across ALL legs.
- **Trading (Traders Mastermind / Invest OS):** teach **portfolio management & skills only.** NEVER give buy/sell signals, tips, or "X% returns" language. Add educational disclaimers. Refusing cleanly is a correct output; hedging into a soft recommendation is the failure.
- **Realty (Realtor Launchpad):** no guaranteed-results or earnings claims.
- If an asset can't be made compliant, **block it and flag Paras** — do not publish.

## 5. Approval Gates (staged autonomy)

| Action | Mode |
|--------|------|
| Log/route/tag leads, draft sequences & copy, build reports | **Auto** (unattended OK) |
| Publish content | **Approve once** (Paras reviews) → then auto-publish |
| Send WhatsApp broadcasts | **Approve once** (tap rates) → then automated |
| Ad spend / budget changes | **Human** — owned by the ads manager, never auto |
| Any money movement, refunds, paid commitments | **Always ask Paras** |
| Anything touching compliance rules (§4) | **Block + flag** |

Task budgets cap autonomous cost; exceeding a budget pauses and asks.

WhatsApp sends: **draft → test to Paras (919999871208) → approve → send.** Enforced by the safety hooks in §11.

## 6. Agent Roster & Operating Principles

**`ai-os/os-manifest.json` is the source of truth for the roster.** The dashboard, the router, `/api/os` and the clone kit all read that file. Adding an agent means adding it there. This section describes the *shape*; never hand-maintain a count here that the manifest already knows.

**As of 2026-08-30: 53 agents on disk, 53 in the manifest, zero drift.** `/api/os` reports `missing` for anything the manifest claims and disk lacks, `unassigned` for anything on disk no pillar claims. Both should read empty.

**Hierarchy, not a swarm.** Paras talks to **one Orchestrator**; it delegates to pillar leads → specialists. See `.claude/agents/`.

**Agent ≠ automation.** Agents *think & create* (write a page, analyze ads, design a sequence). **n8n + GHL run the deterministic, repeating work** (sending drips, logging leads, reminders). Design with an agent; *run* with n8n/GHL.

**Every agent is built to clone** — pointable at a client's GHL sub-account later (this is the DFY product).

### The three pillars + the platform

Full description: `ai-os/OS-STRUCTURE.md`. One flat pile of agents is not a product; three named systems are, each sellable on its own.

| | Pillar | Promise | Agents | Entry |
|---|---|---|---|---|
| ◈ | **Content OS** | Create once. Publish everywhere. | 11 | `content-creator` |
| ◆ | **Business OS** | A lead never goes cold because someone forgot. | 17 | `funnel-architect` |
| ◇ | **Invest OS** | Understand your own portfolio better than the person selling to you. | 11 | `portfolio-analyst` |
| ⬡ | **Platform** | the substrate all three run on | 14 | `orchestrator` |

**Business OS is the Funnel Engine, and it is also the DFY product** — the thing cloned into a client's own GHL. Blueprint: `D:\Estate Labs  ( AI in Real Estate )\Real-Estate-Funnel-Visualization_2.html` — sources (referral/organic/paid) → AI landing page → capture + 5-signal qualification → CRM scoring → HOT(70–100)/WARM(40–69)/COLD(<40) routing → nurture → close → re-referral loop. Wired to GHL (`ghl` CLI) · AiSensy · n8n (`n8n-workflow-builder-team`).

**Platform layer:** `orchestrator` (conductor) · executors that *act* — `ghl-operator`, `aisensy-operator`, `n8n-operator` · builders — `ai-engineer`, `backend-architect`, `ui-designer`, `secrets-credential-engineer`, `ai-generated-code-auditor`, `test-automation-engineer`, `mcp-builder`, `workflow-architect`, `legal-compliance-checker`, `document-generator`. Designers design; operators execute — sends and activations stay approval-gated (§5, enforced by hooks).

**Business-model note (2026-07-06):** **AI Entrepreneurs Club = the flagship/topmost community** (education + onboarding point). **Realtor + Traders = DFY service verticals** (done-for-you, not training). The Funnel Engine deploys for Paras first, then clones per DFY client.

**Operator vocabulary:** `ai-os/references/3ms-framework.md` (Mindset/Method/Machine — EAD, autonomy spectrum L0-L4, Bike Method rollout, Kill Switch; imported from AIS-OS 2026-07-26). `/audit` scores this OS's Four Cs (Context/Connections/Capabilities/Cadence) structurally; `/level-up` runs the weekly 3Ms interview to scope and ship one automation. `connections.md` (root) is the live registry of every reachable system, domain-mapped, replacing the plain stack list for anything needing auth/freshness tracking.

*(Reference library kept at `reference/agency-agents` — mine more as needed. It is git-ignored: large and not ours.)*

## 7. Stack Reference

- **CRM / funnels / community / payments:** GoHighLevel (one sub-account; all 3 communities).
- **WhatsApp:** AiSensy (API plan).
- **Orchestration:** n8n (cloud-hosted, always-on).
- **Source of truth:** Notion. Build docs: `ai-os/`. Live asset IDs (sub-account, form, calendar, VPS, dashboard): `AI-OS-BIBLE.md` §7.
- **Second brain (Obsidian vault):** `C:\Users\PARAS ARORA\Documents\Obsidian Vault`. Hub note: `MOCS/AI OS - Master Map`. Log decisions to `Decision/`, evergreen concepts to `Knowledge/`, a daily note to `Daily/`, business notes to `Companies/`. Link notes with `[[wikilinks]]`. This vault is the *thinking/knowledge* layer; this workspace is the *running* layer.
- **Webinars:** Zoom. **Ads:** Meta. **Organic:** YouTube (long and short led by Paras’s real demonstrations), IG, LinkedIn, X, Facebook, GMB.
- **Payments:** Razorpay, Stripe. **Leads (legacy):** Google Sheets.

### Research stack (merged in from the template)

- **Web research and scraping: Firecrawl**, not the default fetch tools — JavaScript-heavy sites, bot-protected pages, PDFs, cleaner content. `uv run python scripts/firecrawl_tool.py`.
- **Video and YouTube: Supadata.** Transcripts across YouTube, TikTok, Instagram, X, plus YouTube search.
- **Walled platforms Firecrawl and Supadata can't reach** (Instagram, TikTok, LinkedIn, Google Maps, marketplaces): **Apify**.
- **X/Twitter discourse: x-search.** **Papers: academic.** **Newsletters: substack.** **Podcasts: podcast-search.** These need no key beyond what `.env` already names.
- **Big multi-platform questions: `deep-research`** — parallel topic-scoped agents across all of the above, then synthesis. The strongest research capability in this workspace.
- Runtime: `uv` + `.venv` on Python 3.12. Keys live in `.env` (git-ignored, never printed). Signup routes and per-key tests: `reference/getting-keys.md`.

### Near-neighbour routing (the merge left three pairs that sound alike)

- **`/audit` vs `/task-audit` vs `/level-up`.** `audit` scores *this OS* against the Four Cs. `task-audit` maps *Paras's week* and finds what to automate. `level-up` runs the weekly 3Ms interview and *ships one automation*. Different subject each time: the system, the week, the next build.
- **`new-capability` vs the `mcp-builder` agent.** `new-capability` researches a platform's API and writes a Context Skill. `mcp-builder` writes an MCP server exposing this OS's own systems as typed tools. Integration in, tools out.
- **Three routes to Google, pick one per job.** The **connectors** built into the Claude app (Gmail, Calendar, Drive are already signed in per `connections.md`) are the default. **`google-workspace-cli`** (`gws`) is for admin and bulk work. The template's `scripts/gmail_tool.py` and `scripts/calendar_tool.py` are a *third* path that needs its own Google Cloud OAuth project — **don't set that up**; the connectors already cover it. Those scripts stay only in case a future custom integration needs them.

## 8. How to Operate

1. Talk to the **Orchestrator** in plain language ("set up the webinar nurture for next Saturday's Entrepreneurs webinar").
2. It plans → routes to the right agent(s) → respects §4 compliance and §5 gates → reports back.
3. Anything irreversible or outward-facing waits for an approval gate.
4. Update `ai-os/README.md` build status as agents go live.

**Stuck, unsure, or don't know what's possible? Ask in plain English.** No command needed. The commands are for Claude to reach for, not for Paras to memorise. Never answer "you could use X" and stop — if a request maps to a command or an agent, say which one in half a sentence and run it.

## 9. Two surfaces

1. **Claude Code** (here) — full power, builds and executes.
2. **The Dashboard** — `https://ai-os.content.exponentialworld.in` — click any agent to run it, or chat with the orchestrator (has memory). Surfaces: `/ultron/` deck · `/mind/` living map · `/` console · `jarvis/listener.py` voice.

## 10. Session rhythm

- **Start every session with `/prime`.** Loads this constitution, `AI-OS-BIBLE.md`, `ai-os/README.md` (the roadmap), `reference/writing-style.md` and the tail of the ledger; catches up anything a previous session left unfinished; reports where things stand.
- **End with `/log`.** Records the session's work in `ledger/paras.md`, checks whether a context doc drifted, saves and backs up. It mostly runs itself — it fires at the end of `/implement`, `/create-plan`, `/explore`, `/test`, `/new-teammate` and `/handoff`.
- **`/handoff`** when a session gets long and the thread frays. Packages the state and hands over the exact text to open a fresh session with.
- **The ledger** (`ledger/<name>.md`) is the human-readable decision record — rows written as work happens, not at the end. It answers "what did we decide about pricing in July" in six months. Distinct from `ai-os/agent-runs.jsonl`, which is machine run-history for the dashboard and is git-ignored.
- If a session ends without `/log`, nothing is lost: the next `/prime` notices and catches up.

**Building things:** `/explore` to think it through → `/create-plan` to write the plan → `/implement` to build → `/test` to check it works. `/new-capability` when a tool has no connector. `/document` files a doc and updates `docs/_index.md` so later sessions load the right doc rather than everything.

## 11. Session Start & Safety Layer

**Session start (memory-first).** `/prime` is the ritual — it loads this file, `AI-OS-BIBLE.md`, `ai-os/README.md`, the writing rules, `docs/_index.md` and the ledger tail, then reports where things stand. See §10.

**On `MEMORY.md`:** this section used to claim it was auto-loaded. Checked 2026-08-30 — the project memory directory is empty and no `MEMORY.md` exists, so nothing was being loaded. The durable record today is `ledger/` (human decisions) plus `ai-os/agent-runs.jsonl` (machine run history, git-ignored). The Obsidian vault stays the thinking layer; the `obs-memory` skill reaches it via `OBSIDIAN_VAULT_PATH`, which is set. If cross-session memory files get written later, say so here rather than leaving a promise the workspace doesn't keep.

**Safety hooks (enforced, not just advised).** `.claude/settings.json` runs `.claude/hooks/block_dangerous.py` on every Bash call. It blocks: destructive commands (`rm -rf`, `curl|sh`, force-push), secret-printing (`cat .env`, `echo $KEY`), and **un-approved outbound sends/charges** (AiSensy, Razorpay, WhatsApp). Sends are **denied by default** — the draft-always rule from §5. To fire an *approved* send: test to Paras's own number first, then re-run that single command with `AI_OS_ALLOW_SEND=1`. Secret files (`.env`, keys) are deny-listed from reads.

**Git and secrets.** `.mcp.json` holds a live n8n API key and is git-ignored, as are every `.env`, all PII CSV patterns, the run logs, the vendored `reference/` libraries and the nested projects (`video-engine/`, `video-use/`). Anything that runs `git add -A` — `/log` does — depends on that file being right. Check `git check-ignore` before adding a new source of secrets.

## 12. The map

```
CLAUDE.md            this file — the constitution, loaded every session
AI-OS-BIBLE.md       vision, business, live asset IDs, inventory
connections.md       registry of every reachable system, with auth/freshness
ai-os/               the build layer: roadmap, structure, manifest, brand, content, DFY
  os-manifest.json     canonical agent roster — the dashboard and router read this
  OS-STRUCTURE.md      the three pillars explained
  README.md            build status and what's next
.claude/agents/      53 agents (see os-manifest.json)
.claude/skills/      capabilities
.claude/commands/    the rhythm and build loop
.claude/hooks/       the enforced safety layer
context/             template context skeleton — see note below
ledger/              human-readable work record, one file per person
dashboard/           the live web app (Node + Anthropic API)
jarvis/              voice listener
video-engine/        Remotion render pipeline (own git repo, ignored here)
video-use/           video tooling (own git repo, ignored here)
paper-trader/        standalone trading bot
tools/               ghl CLI, composio
scripts/             python research clients (firecrawl, supadata, x-search, academic…)
reference/           workspace docs + vendored agent/skill libraries (libs ignored)
docs/                documentation, routed by docs/_index.md
plans/               build plans from /create-plan
outputs/             everything produced
private/             owner-only drawer, git-ignored, this machine only
```

> **`context/` holds pointer files, not content.** Six of the seven say where the real thing lives (`AI-OS-BIBLE.md`, `ai-os/`, `connections.md`) rather than copying it, so there is nothing to keep in sync. The commands and skills that read `context/` still work; they land on a pointer and follow it. The exception is **`context/team.md`, which is a real and expensive gap** — the roles are documented, the seven people are not, and `ai-os/100k-roadmap.md` calls delivery on those seven the binding constraint on the whole business.

Anything that smells private (real margins, compensation, deal terms, personal matters) belongs in `private/`, which never syncs anywhere. If it shows up in a shared folder, say so and offer to move it.
