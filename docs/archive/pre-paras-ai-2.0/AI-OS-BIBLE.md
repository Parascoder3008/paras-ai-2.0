# AIOS Bible: current reading order

**Updated 2026-09-13:** [CURRENT-PLAN.md](ai-os/CURRENT-PLAN.md) and [operating-plan.json](ai-os/operating-plan.json) are authoritative for strategy, cadence, team, goals and offer assumptions. Training membership is primary. Old 28-agent, automatic-memory and go-live claims below are historical and must not be reported as current. There are 53 role files; dashboard calls draft rather than execute external tasks.

The earlier Bible remains below for historical asset IDs and context. Its campaign dates and priorities are superseded. Current readiness: [ai-os/README.md](ai-os/README.md).

---

# Exponential World AI — The OS Bible

The single source of truth for Paras + the AI OS. Where we are, how it works, what exists, what's next. Read this first, every session.

_Last updated: this session._

---

## 1. THE VISION (north-star — every agent designs from this)

### The Route (ascension ladder)
**Learn skill → implement → help people → build personal brand → then trade & invest the money.**

Money is the **last rung**, earned downstream of skill + service — never the front-end promise. This is *why* the whole thing stays compliant: we sell the skill and the system; income is a consequence, never a guarantee. One person can walk the entire ladder inside the ecosystem.

### The Future (4 pillars)
**Content + AI Systems + Community + Industry.**
- **Content** — distribution + personal-brand engine (top of funnel, attention, trust)
- **AI Systems** — the product/skill: people *build working systems*, not watch theory
- **Community** — continuity, retention, trust, the place the ladder happens (#1 churn defense)
- **Industry** — verticalization: systems pointed at real industries (realty, trading, DFY clients) = the money leg

The loop: Content pulls people → they build AI Systems → inside a Community → applied to an Industry → produces income → funds trading/investing → creates more Content.

### The 4C Framework
**Content · Code · Capital · Collaboration** — the four levers every offer, message, and system is built on.
- **Content** — what earns attention and teaches
- **Code** — the AI systems people build (the skill made real)
- **Capital** — the money outcome, earned then invested (last, never promised)
- **Collaboration** — community + partnerships + DFY, done *with* people

---

## 2. THE BUSINESS

Operator: **Paras Arora** — Exponential World AI (exponentialworld.ai), Dubai. Solo + ~7 freelancers. Paras's only human job = teaching.

| Leg | Model | Price |
|-----|-------|-------|
| **AI Entrepreneurs Club** (flagship) | Continuity membership | Founding ₹2,499/mo · ₹19,999/yr (standard ₹2,999 · ₹29,999) |
| **AI Realtor Launchpad** | DFY vertical | ₹99 event front-end → high-ticket DFY |
| **AI Traders Mastermind** | Education (skills only) | monthly sub |
| **DFY Services** | High-ticket | per-project, "raise hand" ascension |

- North-star metrics: leads · signups · webinar signups · **MRR** · **ROAS**
- #1 risk: **churn** on continuity → defend with annual plans + community + live events
- Past communities (the migrated data): trading — AI Powered Stock Market Mastery, Financial Freedom Path/Blueprint, Stock Market with AI

---

## 3. COMPLIANCE — HARD RULES (never override)

- **Education only. NO income / return / profit / guarantee claims** — any leg. Money is downstream of skill (the ladder), never a promise.
- **Trading:** portfolio management & skills ONLY. NEVER buy/sell signals, tips, "X% returns." Disclaimers.
- **Realty:** no guaranteed-results / earnings claims.
- Can't be made compliant → **block + flag Paras.**

### Approval gates (staged autonomy)
| Action | Mode |
|--------|------|
| Log/route/tag leads, draft copy, build reports | **Auto** |
| Publish content · send WhatsApp broadcasts | **Approve once → then automated** |
| Ad spend / budget | **Human** (ads manager) |
| Money movement, refunds | **Always ask Paras** |
| Anything touching compliance | **Block + flag** |

WhatsApp sends: **draft → test to Paras (919999871208) → approve → send.** Enforced by safety hooks.

---

## 4. HOW THE OS WORKS

- **Hierarchy, not swarm.** Paras talks to **ONE Orchestrator** → it delegates to departments → specialists.
- **Agent ≠ Automation.** Agents *think & create* (design a page, a sequence, an offer). **n8n + GHL *run* the deterministic repeats** (sending, logging, reminders). Design with an agent; run with n8n/GHL.
- **Everything cloneable per client** — the OS itself is the DFY product.
- **Two surfaces to drive it:**
  1. **Claude Code** (this) — full power, builds + executes
  2. **The Dashboard** — `https://ai-os.content.exponentialworld.in` (login `paras`) — click any agent to run it, or chat with the orchestrator (has memory)

---

## 5. AGENT ROSTER (53)

**`ai-os/os-manifest.json` is the source of truth — the dashboard, the router, `/api/os` and the clone kit all read it. Adding an agent means adding it there, not here.** Verified against disk 2026-08-30: 53 files, 53 in the manifest, zero drift. Structure explained in `ai-os/OS-STRUCTURE.md`.

**⬡ Platform (14)** — the substrate all three pillars run on, cloned with every install.
Conductor: `orchestrator` (start here). Executors (they DO, not just design): `ghl-operator` · `aisensy-operator` · `n8n-operator`. Builders: `ai-engineer` · `backend-architect` · `ui-designer` · `secrets-credential-engineer` · `ai-generated-code-auditor` · `test-automation-engineer` · `mcp-builder` · `workflow-architect` · `legal-compliance-checker` · `document-generator`.

**◈ Content OS (11)** — create once, publish everywhere. Entry: `content-creator`.
`content-creator` · `growth-strategist` · `instagram-curator` · `linkedin-content-creator` · `carousel-creator` · `email-strategist` · `ad-creative-strategist` · `brand-guardian` · `ai-citation-strategist` · `aeo-foundations` · `agentic-search-optimizer`

**◆ Business OS (17)** — a lead never goes cold because someone forgot. Entry: `funnel-architect`. This is the Funnel Engine and the DFY product.
`funnel-architect` · `landing-vsl-builder` · `lead-scorer-router` · `nurture-sequencer` · `appointment-setter-ops` · `referral-loop-engineer` · `offer-leadgen-strategist` · `discovery-coach` · `deal-strategist` · `proposal-strategist` · `paid-social-strategist` · `paid-media-auditor` · `tracking-specialist` · `analytics-reporter` · `executive-summary-generator` · `pipeline-analyst` · `pricing-analyst`

**◇ Invest OS (11)** — understand your own portfolio better than the person selling to you. Entry: `portfolio-analyst`. Constitution §4 binds this pillar hardest: education and analysis only.
`portfolio-analyst` · `value-research-analyst` · `stock-screener` · `chart-analyst` · `market-researcher` · `pine-script-generator` · `pine-code-fixer` · `strategy-backtester` · `risk-manager` · `trading-journal-coach` · `investor-educator`

---

## 6. SKILLS LIBRARY

- **Project skills (54 in `.claude/skills/`):** sales suite (objection-predictor, prospect-research-activator, cta-optimizer, win-loss-pattern-analyzer, pitch-craft, meeting-prep, billion-dollar-board), marketing (hook-engineer, ab-copy-variants-generator, seo-intent-analyzer, campaign-retrospective-builder, persona-language-mirror), webinar-marketing, content-production/strategy, email-sequence, paid-ads, retention (churn-prevention, lifecycle-stage-mapper, retention-risk-scorer, activation-funnel-diagnostician, upgrade-moment-architect, feature-launch-copywriter), automation (n8n-workflow-builder-team, ghl, google-workspace-cli), memory (obs-memory), video (viral-teardown, paras-script-auditor, motion-graphics, cinematic-camera, terminal-inserts, article-highlights), OS (audit, level-up)
- **Research stack (merged from the AIOS template, 2026-08-30):** deep-research · firecrawl · supadata · apify · x-search · academic · substack · podcast-search · connectors · diagram · new-capability · task-audit · test · writing-style. Needs `.env` keys and the `uv` runtime — see `reference/getting-keys.md`.
- **Animation/render pack (19, in `.agents/skills/`):** hyperframes suite, higgsfield suite, gsap, animejs, lottie, three, typegpu, tailwind, waapi, css-animations, remotion-to-hyperframes, website-to-hyperframes. ⚠️ 19 empty duplicate directories of these exist in `.claude/skills/` — noise, pending cleanup.
- **Plugins installed:** marketing (45 — coreyhaines) · small-business (31) · superpowers (14) · meta-ads (16 skills + 12 agents) · HR (9) · caveman · ponytail · humanizer

Principle: **cherry-pick, stay lean.** Skills are capabilities; more ≠ better. Compliance wraps every one.

---

## 7. TECH STACK

| Layer | Tool | Key IDs / notes |
|-------|------|-----------------|
| CRM / funnels / community | **GoHighLevel** (white-label **ProspectFlow**, `app.prospectflow.in`) | sub-account `0CvgHbz78XWc1adBxmLV` · driven by `ghl` CLI · reg form `U6TElTXlKUld8tZDpBmX` · FREE WEBINAR cal `zAkfmv3XY1vwMfh3p8VJ` |
| WhatsApp | **AiSensy** (Estate Labs project, Tier 2 ~10K/day) | verified send recipe · sender "Paras Arora Consultant" · **only realtor templates approved so far** |
| Automation | **n8n** (self-hosted Hostinger) | `n8n.srv981435.hstgr.cloud` · non-expiring key · ~50 workflows |
| Payments | **Razorpay** + Stripe | founding page ready |
| Dashboard host | **Hostinger VPS** `srv1425597` (`187.77.185.47`) | Docker + Traefik + Let's Encrypt · also runs Hermes/OpenClaw |
| Others | Zoom · Meta ads · YouTube/IG · Notion · Obsidian (second brain) | |

Memory: `MEMORY.md` (auto-loaded) + Obsidian vault. Safety hooks enforce compliance on every Bash call.

---

## 8. WHAT WE BUILT (milestones)

1. Constitution (`CLAUDE.md`) + shared agent context
2. 28 agents across 6 departments (business-aware, cloneable)
3. Deep skill library + plugins
4. Integrations verified LIVE: GHL, AiSensy (real WhatsApp delivered), n8n
5. Memory system + Obsidian second brain
6. Safety hooks layer (blocks destructive cmds, secret leaks, un-approved sends)
7. **Dashboard deployed to VPS** — HTTPS, auth, all 28 agents, **orchestrator chat with conversation memory**, runs 24/7
8. Funnel Engine department (universal funnel = DFY product)
9. EC funnel + webinar/challenge campaign designs
10. **Past-member data: 53,672 contacts imported + tier-tagged into GHL**

---

## 9. WHERE WE ARE NOW

### ✅ Live / done
- OS complete: constitution, 28 agents, skills, memory, hooks
- Dashboard live 24/7 with memory chat
- GHL + AiSensy + n8n connected
- **53,672 past contacts in GHL, tagged 4 tiers:**
  - `tier:most-loyal` 226 · `tier:good` 724 · `tier:paid` 14,540 · `tier:interested` 38,182
  - all tagged `source:past-member campaign:ec-jul15` + community
- Campaign master plan + funnel designs written

### ⏳ Pending / blockers
- **AiSensy EC/reactivation templates NOT submitted → zero WhatsApp sends possible until approved (~24h Meta).** THIS is the critical path.
- n8n campaign workflows: designed, not built/activated
- Event dates: need reconfirm (Jul 15–16 may have passed — verify real date)
- Sequences + promo-content agents: died on session-limit, need relaunch
- 1:1 loyal-reactivation booking calendar: not built yet

### 🎯 LOCKED PLAN — H2 2026 (two engines, till Dec 31)
Set by the Executive Growth Council 2026-07-31. See **`ai-os/100k-roadmap.md`** (top) for the full lock.
- **Engine 1 — REVIVE (priority #1, runway):** the ~15,500 warm past-buyers → 1:1s → close into the offer. Runway **through Dec 2026 (~5 mo)**. Delivery **5–8 customers/mo** → **PRECISION revive: fill 5–8 slots, do NOT mass-blast** (need only ~0.05% of the list). Execution detail = `ai-os/90-day-execution-plan.md` (Prove→Repeatable→Scale, hard gates, Friday review).
- **Engine 2 — DISTRIBUTION (main game, positioning/2027):** content → 100K across platforms, LinkedIn hero, 3E-gated (`ai-os/distribution-plan-aug.md`, `100k-roadmap.md`). Parallel but **disciplined** — never eats revive calls/delivery while runway is 5 mo.
- **Offer:** free 1:1 → **DFY (high-ticket = runway engine)** or **Accelerator (recurring base)**. **Flywheel:** revive → results → content → more revive.
- **PARKED:** Traders relaunch, Realtor ad-scaling, new agents. Re-decide only via `/executive-growth-council`. Open: monthly burn + DFY price (to model cash), offer risk-reversal audit.

---

## 10. DATA ASSETS

`ai-os/ec-system/campaign-jul15/data/`
- `ghl-import-clean.csv` — all 53,672 deduped
- `import-most-loyal.csv` (226) · `import-good.csv` (724) · `import-paid.csv` (14,540) · `import-interested.csv` (38,182)
- All imported to GHL + tagged. `50002` legacy tag preserved.

**Messaging rule (protects the AiSensy number that runs ALL verticals):** warm-first, tiny batches. loyal → good → paid (1–2k/day). **NEVER blast interested 38k** (cold trading leads = ban risk). Email-only for them.

---

## 11. NEXT ACTIONS (priority order)

1. **Reactivate 226 loyal → 1:1 calls:** build GHL booking calendar + discovery script + email (today) + WhatsApp template (submit, ~24h)
2. **Submit AiSensy template batch** — unblocks all WhatsApp
3. **Confirm real date + event plan**
4. Build + validate n8n workflows (reminders, reactivation, challenge engine)
5. Test every send to Paras's number first
6. Relaunch sequences + promo-content agents

---

## 12. HOW PARAS OPERATES IT

1. Talk to the **orchestrator** in plain language ("reactivate my 226 loyal for 1:1 calls").
2. It plans → routes to the right agent(s) → respects compliance + gates → reports back.
3. Anything outward-facing (send, publish, spend, money) waits for your approval.
4. Use the **dashboard** for quick agent runs + orchestrator chat; use **Claude Code** for building/executing.

---

*This bible is the map. When lost, start here.*
