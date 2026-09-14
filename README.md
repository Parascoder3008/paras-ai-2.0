# Paras AI 2.0

Paras Arora's personal second brain and operating system for learning, creating, running a small business with a small team, and studying capital allocation.

**Content earns attention. Useful work earns trust. Community supports implementation. Businesses grow around verified needs. Invest OS is a separate research project.**

## Start here

1. Read [the vision](ai-os/VISION.md) and [current status](ai-os/README.md).
2. Open [MEMORY.md](MEMORY.md) for decisions, open loops and the last session.
3. Use [the three-pillar map](ai-os/OS-STRUCTURE.md) and [capability catalog](ai-os/CAPABILITIES.md) to find an existing role or skill.
4. Read [the current business plan](ai-os/CURRENT-PLAN.md) before commercial work. Historical campaigns are reference material.

## Three pillars, shared memory

| Pillar | Purpose | Current use |
|---|---|---|
| Content OS | Turn real learning and demonstrations into useful distribution | Hinglish, two long videos/week, 1–2 shorts/day |
| Business OS | Turn permission-based interest into delivery, community, customers and retention | Course plus mentorship; 200 active paid members in 90 days |
| Invest OS / Money OS | Study portfolio decisions, rules, risk and trading systems | Separate research and simulation project; no trading activated here |

The shared foundation holds memory, planning, tools, review, and the dashboard. It isn't a fourth business. Role files are capabilities to use when needed, not 53 employees running continuously.

## Run locally

Requires Node.js 20 or newer. The local operating and memory commands have no npm dependencies.

```powershell
node scripts/brain.cjs status
node scripts/brain.cjs capture "A question or task to review" --pillar business
node scripts/audit-workspace.cjs --write
node scripts/ops.cjs check
node scripts/ops.cjs brief --date 2026-09-14 --write
npm test
```

Dashboard: install its locked dependencies with `npm ci --prefix dashboard`, then run `node dashboard/server.js`. It binds to localhost unless credentials are configured. Model calls require your own provider configuration and generate drafts. See [setup](docs/SETUP.md).

## Where things belong

| Location | Owns |
|---|---|
| `memory/` | Curated decisions, project index and session continuity |
| `Other Worlds/` | Astrology, trading bots, listing software, apps and other projects outside the main business |
| `ai-os/` | Current business plan, content board, manifests and audits |
| `.claude/agents/` | Existing specialist role definitions |
| `.claude/skills/` and `.agents/skills/` | Workspace and media capabilities |
| `dashboard/`, `scripts/`, `ai-os/tools/` | Runnable software and local diagnostics |
| `docs/archive/` | Superseded reference material, outside default memory retrieval |
| Obsidian | Linked knowledge notes and the human-readable project map |
| `private/`, local inbox and `outputs/` | Owner-only material and disposable artifacts, excluded from the new repository |

## Operating boundaries

Local drafts, code, diagnostics and memory preparation are authorized. External messages, publishing, spending, purchases and activations require authorization for the concrete action. No mass-send permission is inherited from older files. Preserve user edits. Never commit credentials, customer lists or raw personal memory.

The architecture is intended for a person or small team and can be adapted per industry. It is not certified for enterprise deployment. Enterprise use would need verified access controls, isolation, audit logs, reliability and operating ownership. The [audit](ai-os/audits/2026-09-14-paras-ai-2.0.md) distinguishes what works locally from what remains unverified.
