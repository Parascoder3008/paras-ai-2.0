# The Exponential AI OS — three operating systems, one brain

> Canonical structure: [`os-manifest.json`](os-manifest.json). The dashboard, the router and the clone kit all read that file. **Adding an agent means adding it to the manifest** — nothing here is hardcoded, so nothing drifts.

Live at `/api/os`. Rendered in the deck at `/ultron/`.

---

## Why three

One flat pile of 53 agents is not a product. Three named systems are — each with a promise a buyer recognises, and each sellable on its own.

| | Pillar | Promise | Agents | North star |
|---|---|---|---|---|
| ◈ | **Content OS** | Create once. Publish everywhere. Never invent the same idea twice. | 11 | assets published per idea |
| ◆ | **Business OS** | A lead never goes cold because someone forgot. | 17 | captured contacts → booked calls |
| ◇ | **Invest OS** | Understand your own portfolio better than the person selling to you. | 11 | decisions with a written thesis and a defined risk |
| ⬡ | *Platform* | *the substrate all three run on* | 14 | — |

---

## ◈ Content OS
**Job:** turn one idea into a week of native content across every platform, on-brand and compliant.

`content-creator` (brain) · `growth-strategist` · `instagram-curator` · `linkedin-content-creator` · `carousel-creator` · `email-strategist` · `ad-creative-strategist` · `brand-guardian` · `ai-citation-strategist` · `aeo-foundations` · `agentic-search-optimizer`

The last three are the AI-search layer: whether ChatGPT/Claude/Gemini/Perplexity can find, parse and cite this business at all.

The hybrid model holds: **one** content brain creates the master asset, platform agents repurpose it natively. Nothing is invented six times.

---

## ◆ Business OS
**Job:** first touch → signed deal → referral. Capture, score, route, nurture, book, close, repeat.

`funnel-architect` (lead) · `landing-vsl-builder` · `lead-scorer-router` · `nurture-sequencer` · `appointment-setter-ops` · `referral-loop-engineer` · `offer-leadgen-strategist` · `discovery-coach` · `deal-strategist` · `proposal-strategist` · `paid-social-strategist` · `paid-media-auditor` · `tracking-specialist` · `analytics-reporter` · `pipeline-analyst` · `pricing-analyst` · `executive-summary-generator`

This is the Funnel Engine, and it is also **the DFY product** — the thing that gets cloned into a client's own GHL.

---

## ◇ Invest OS  🔒
**Job:** research, portfolio structure, risk sizing and strategy testing — as education and analysis.

`portfolio-analyst` (lead) · `market-researcher` · `risk-manager` · `strategy-backtester` · `investor-educator` · `value-research-analyst` · `stock-screener` · `chart-analyst` · `pine-script-generator` · `pine-code-fixer` · `trading-journal-coach`

### The constraint is the design
Constitution §4 binds this pillar: **education and analysis only.** No buy/sell calls, no price targets, no projected returns, no personalised advice — for Paras *or* for anyone this OS is installed for. Advice without a licence is a legal problem, not a tone problem, and this ships to third parties.

So the constraint is built into each agent's instructions rather than bolted on, and each one carries the trap specific to its job:

| Agent | The trap it is written against |
|---|---|
| `portfolio-analyst` | describing a concentration slides into "reduce it" |
| `risk-manager` | sizing arithmetic *sounds* like maths, *functions* as an instruction |
| `market-researcher` | a forecast arrives dressed as a fact |
| `strategy-backtester` | a backtest reads as a promise; **assume look-ahead bias until disproved** |
| `investor-educator` | teaching a method slides into teaching what to buy |

Refusing cleanly is a correct output. Hedging into a soft recommendation is the failure.

Two rules here came from real failures, recorded in memory: define the whole ruleset *before* writing Pine (`strategy-define-before-code`), and treat a beautiful backtest as suspicious — a prior indicator printed labels 10 bars late and made a losing setup look prescient (`magic-trading-pro-backtest`).

---

## ⬡ Platform
Not a pillar — what the three run on, cloned with every install.

- **Conductor:** `orchestrator` — the single point of contact; routes across pillars
- **Executors:** `ghl-operator` · `aisensy-operator` · `n8n-operator` — these *act*
- **Builders:** `ai-engineer` · `backend-architect` · `ui-designer` · `secrets-credential-engineer` · `ai-generated-code-auditor` · `test-automation-engineer` · `mcp-builder` · `workflow-architect` · `legal-compliance-checker` · `document-generator`
- **Surfaces:** `/ultron/` deck · `/mind/` living map · `/` console · `jarvis/listener.py` voice

**Guardrails, all three pillars:** education only, no income or guaranteed-results claims · publishing, sends, money and ad spend stop for explicit human confirmation · a source that is down is reported as down, never faked.

---

## Selling it

| Tier | Pillars | For |
|---|---|---|
| Content OS | ◈ | creators, personal brands |
| Business OS | ◆ | service businesses with a lead problem |
| **Growth OS** | ◈ + ◆ | **most SMBs — the default** |
| Full OS | ◈ + ◆ + ◇ | operators who also manage their own capital |

Per client, an install needs: brand profile · CRM credentials · channel connections · compliance vertical.

---

## Adding to the OS
1. Write the agent in `.claude/agents/<id>.md`
2. Add its id to the right pillar in `os-manifest.json`
3. Nothing else — the deck, `/api/os` and the Living Mind pick it up from disk

`/api/os` reports `missing` for any agent the manifest claims but disk lacks, and `unassigned` for any agent on disk that no pillar claims. Both should read empty.
