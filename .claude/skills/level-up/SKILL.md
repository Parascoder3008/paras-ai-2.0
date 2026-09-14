---
name: level-up
description: Use weekly to find and ship one new automation for the AI OS. Walks the 3Ms interview — Mindset (find the candidate) → Method (scope one) → Machine (build it). Trigger on "let's level up", "what should I automate next", "find me leverage this week", or as a Friday ritual. One run = one shipped artifact.
---

> *Adapted from The Three Ms of AI™. © 2026 Nate Herk. All rights reserved.* Imported from [nateherkai/AIS-OS](https://github.com/nateherkai/AIS-OS) 2026-07-26, rewired for this project.

## What this skill does

Walks Paras through the 3Ms (see `ai-os/references/3ms-framework.md`) each week to surface and ship one new automation across any department (Funnel Engine, Content, Paid Media, Ops & Intelligence). **One interview = one artifact.** After several runs the Mindset questions become internal defaults.

## What `/level-up` is NOT

- Not `/audit` (structural — "is the AI OS built right?"). Run `/audit` first if structure looks messy.
- Not a multi-candidate planner. One run = one shipped artifact.
- Not a coach — Paras does the thinking, the skill runs the interview.

## When it runs

- On-demand any time a manual task itches.
- Suggested cadence: weekly, Friday — review the week, surface one automation, ship Monday.

## Inputs the skill reads

- Root `CLAUDE.md` §2 (business legs, north-star metrics), §5 (approval gates)
- `connections.md` — what's reachable, by what mechanism
- `ai-os/references/3ms-framework.md` — the framework, quote principles back
- Obsidian vault `Decision/` folder — recent decisions (what's already shipped/considered) — **this project logs decisions there, not to a local `decisions/log.md`**
- `.claude/agents/*.md` and `.claude/skills/*/SKILL.md` frontmatter — what capabilities already exist (check before proposing something that duplicates an existing agent)
- `ai-os/README.md` build status

## Execution — three phases

### Phase 1 — Mindset interview (find the candidate)

Ask conversationally, in order:

1. *"Walk me through this week. What did you do 3+ times?"*
2. *"Anything that felt manual, boring, or copy-paste?"*
3. *"Anything where a smart intern could've handled it?"*
4. *"If 500 new members showed up tomorrow across the 3 communities, what breaks first?"* (constraint)
5. *"What would give you 500 more members tomorrow?"* (growth lever)

Quote Mindset principles when they fit ("Default Shift applies here — to what extent could AI be leveraged?"; "This is Function Breakdown, not the whole job").

**Output:** 1-3 candidates ranked by leverage, one-line "why" each. Ask Paras to pick one.

### Phase 2 — Method interview (scope one)

Walk the 5-step pipeline:

1. **Find the constraint** — which bottleneck or growth lever, tied back to Phase 1.
2. **EAD.**
   - **Eliminate first:** *"What happens if we just stop doing this?"* If nothing breaks → exit cheerfully, log the win, stop. Don't automate waste.
   - **Automate second:** 60/30/10 framing (~60% deterministic, ~30% AI-assisted human-reviewed, ~10% manual).
   - **Delegate third:** if too complex/variable/judgment-heavy, suggest handing to Paras's 7-person freelance team instead of automating.
3. **Map the process** — Trigger / Data sources / Data transformations / Decision points / Destination. If Paras can't name all five: *"If you can't explain it to a person, you can't explain it to an AI — sketch it first."* Stop.
4. **Pick the autonomy level** (L0-L4, see framework doc). **Default = lowest level that works** — and it must not conflict with root `CLAUDE.md` §5 Approval Gates (money movement / ad spend / compliance-touching stay human or block regardless of what this interview would otherwise pick).
5. **Tie to a KPI** — one of the Three Buckets (more members, more value per member, cut cost) + a specific number from CLAUDE.md §2's north-star metrics (leads, signups, webinar show-up rate, MRR, ROAS) or a department-specific one. If Paras can't name bucket + metric, stop.

**Output:** scoped spec appended to Obsidian `Decision/YYYY-MM-DD — {title}.md` (or as a dated entry there) with all five answers + autonomy level + KPI, `[[wikilinks]]` to related notes.

### Phase 3 — Machine handoff (build it)

Ask: *"How do you want to ship this?"* — ordered by Boring-is-Beautiful default:

1. **Prompt-only** — saved prompt Paras runs by hand.
2. **Deterministic skill** — SKILL.md running a script, no AI step.
3. **AI-assisted skill** — SKILL.md with one AI call (drafts/classifies/summarizes).
4. **New or extended agent** — only if the work genuinely needs multi-step reasoning + tool use. Check first whether an existing department agent (funnel-architect, ghl-operator, n8n-operator, etc.) should just absorb this instead of spawning a new one.

**Default = highest non-AI option that solves the problem.**

Every scaffolded artifact ships with:

```markdown
---
bike-method-phase: 1  # Phase 1 — Training wheels. Run manually first.
three-ms-attribution: |
  Adapted from The Three Ms of AI™ © 2026 Nate Herk.
---
```

This locks Phase 1 (manual validation) until Paras explicitly advances it — same spirit as the §5 "Approve once → then auto" gates already in place.

## Output contract

Every run produces:

1. One Obsidian `Decision/` entry — dated, with the Method spec
2. One scaffolded artifact — prompt, skill, or agent update
3. A one-screen close: what was scoped, what was built, Bike Method Phase 1 reminder

## Critical implementation rules

1. One interview = one artifact. No multi-candidate parallel scoping.
2. Mindset phase always runs first, even with a pre-formed idea.
3. EAD enforces "eliminate first" — an Eliminate outcome is a win, not a failure.
4. Default to lowest autonomy level; never let this skill override root `CLAUDE.md` §5 gates (compliance-blocked or money-movement items stay human no matter what autonomy level Method would otherwise pick).
5. Boring-is-Beautiful default in Machine handoff.
6. Tie-to-KPI mandatory.
7. Bike Method frontmatter ships into every artifact.
8. Read-only on existing project files except the new Obsidian decision entry and the new artifact itself.
9. Keep the Three Ms trademark/attribution line on any output that quotes the framework.
