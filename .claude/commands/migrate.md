# /migrate

> For someone who already has an AI workspace and doesn't need building from scratch. Points at what they've got, compares it against this one, and walks them through what's worth taking, one decision at a time.

## Variables

args: $ARGUMENTS (a path to their existing workspace, or empty to ask)

---

## FOR CLAUDE, how to run this

- **You are advising, not converting.** They built something that works. The job is to show them what's missing and let them choose, not to talk them into this structure.
- **Read-only until they approve a specific change.** Never write into their existing workspace before they've said yes to that exact thing.

- **Two workspaces, and never mix them up.** **Accepted changes are written into THEIR workspace. The analysis doc, the ledger row and `/log` are written into THIS one.** Every path in Phase 3 and Phase 5 is relative to this workspace; every path in Phase 4 belongs to theirs. Always address theirs with `git -C "$TARGET"` rather than `cd`, so you can't lose track of which one you're in.

- **Read their workspace's content. Read this one's structure only.** Their context, notes and docs are the subject. On this side, read the **commands, rules and shape** (`.claude/commands/`, `CLAUDE.md`, `reference/`), never the contents of `context/`, `private/` or `data/`. Those belong to whoever installed this copy, and nothing from `private/` goes into the analysis doc under any circumstances. The comparison worth making is their workspace against what this one's commands **enforce**, not a file-tree diff against a set of empty folders.

- **Three hard safety rules.** Check these before touching anything, with these exact commands, because the obvious ones give wrong answers:

  1. Their workspace must be a **git repository, and its own root**:
     ```bash
     top=$(git -C "$TARGET" rev-parse --show-toplevel 2>/dev/null)
     ```
     Empty means it isn't a repo. A `$top` that differs from `$TARGET` means their folder is **nested inside somebody else's repo** and has no undo of its own: treat that exactly like "not a repo". Never `cd` into their folder and run bare `git status`, because git walks up to parent repositories and will cheerfully tell you a plain folder is a clean repo. `git status` also exits 0 on that fatal error when piped, so don't trust its exit code either. Either way, do the analysis, write it up, change nothing, and say so plainly.
  2. It must have **no uncommitted changes**:
     ```bash
     git -C "$TARGET" status --porcelain=v1 -uall
     ```
     Any output at all means stop and tell them to commit or stash first. Do not offer to do it for them. `-uall` matters: without it, a founder whose only mess is an untracked folder full of drafts reads as clean.
  3. Rules 1 and 2 are hard stops, but **stop like a person, not a program**: name what you found, say what they need to do, offer to keep talking. Everything *else* unexpected degrades into conversation rather than erroring.

- **Resolve the path before any of that.** Expand `~`, resolve relative paths and symlinks, quote everything (a path with a space is the likeliest failure in the first thirty seconds), and confirm it exists and is a directory. **Refuse if it resolves to this workspace or to a parent of it.** Explain what you found and ask.
- **Never delete anything of theirs.** Every change is additive or a clearly-labelled proposal.
- All prose follows `reference/writing-style.md`.

---

## PHASE 0, Use the horsepower you've got (no questions asked)

This is a heavy piece of analysis: two entire workspaces, compared across four layers, reasoning about what's worth moving. **Don't open by asking them to change settings.** These are the people who ejected out of `/install` for already knowing what they're doing, and the first thing they meet shouldn't be a settings tour. You can't verify a "yes" anyway, and an unverifiable confirmation is worse than none, because it turns an unknown into a false certainty.

So: **fan the reading out across parallel agents if you can.** Their context layer, their commands and skills, their work record and integrations, all at once, then synthesise. That's the difference between "you're missing a ledger" and "you're missing a ledger, and given you're running three client projects out of one folder, here's specifically what that costs you every Monday".

If you're on a weaker model or can't parallelise, carry on and **say so in the report at the end**: "this was a lighter read than it should have been." An honest note afterwards beats a permission slip up front.

**One rule regardless of horsepower:** the analysis doc can be as long and as thorough as it needs to be, but **what you say in the chat stays simple**. Walk them through it one plain-English step at a time. They should never have to read the doc to follow the conversation.

---

## PHASE 1, Find it (2 min)

If a path was passed, use it. Otherwise: *"Where does your existing workspace live? Give me the folder path."*

Then check the safety rules above. Report what you found in one line: the path, whether it's a git repo, whether it's clean.

**Send them back to `/install` only if both of these are true:** nothing in the folder encodes how the business actually works beyond preferences, **and** there's no record of work that survives a session. A folder with a few prompt files isn't a workspace, and the normal path will serve them better.

If only the second is true, so they've got real context but no durable record, **that's the most common case in the room and it belongs here, not in `/install`.** Say so and carry on. Don't bounce them: `/install` Step 0 sends people this way when they have both, so anyone landing here with one of the two is exactly who this command is for.

---

## PHASE 2, Read both sides (5 min)

Read their workspace properly, don't skim the folder names.

- Their constitution file, whatever it's called: `CLAUDE.md`, `AGENTS.md`, `.cursorrules`, a README.
- Every command and skill they have, and what each actually does.
- Their context or memory files: what's documented about the business, and what's stale.
- How they record work, if they do. Is there any record that survives a session.
- Their integrations and keys.
- Their folder structure and what it implies about how they work.

Then read this workspace's equivalents so the comparison is real rather than from memory.

---

## PHASE 3, The delta (write it down)

Write `outputs/migrate-analysis.md`. This is the artifact they keep, so make it good.

Four layers, and for each, three buckets: **what they have that this doesn't**, **what both have**, **what this has that they're missing**.

1. **Context.** A constitution loaded every session. Docs on the business, the founder, strategy, the team, the workspace's own shape. A private boundary for what shouldn't be shared.
2. **Rhythm.** Something that loads context at session start. Something that records work at the end. A durable record across sessions. Version control and an off-machine backup.
3. **Capability.** Web, video, social. The business tools actually connected. A way to add a capability without hand-writing it. A way for it to check its own work.
4. **Team.** Can a second person get a seat. Is there a sharing boundary if they do.

For every row where they're missing something, write **one sentence on what it actually buys them**, in terms of their work rather than in terms of features. "You'd stop losing what you decided last Tuesday" beats "adds a ledger".

**For each gap, say what it depends on.** Some of these aren't takeable on their own and the ranked list hides that. `/prime` reads `context/`, `docs/_index.md`, `reference/writing-style.md` and `ledger/`; drop it into a workspace without those and it's a command that reports on nothing. The ledger isn't a folder, it's a folder plus the standing rule in `CLAUDE.md` plus `/log` as the backstop plus `/prime` reading the tail. Where a gap has prerequisites, say so **at the point you ask**, and offer the whole bundle or nothing rather than a piece that can't work.

**Don't grade against empty folders.** Compare their workspace to what this one's commands *enforce*, not to a file tree. A row that only says "they don't have `data/`" is noise. If a bucket has nothing real in it, write one honest line and move on rather than filling cells: three buckets times four layers is a grid, and grids reward completeness over insight. The findings worth their time usually come from noticing two things that don't add up (a note's date against a window in one of their own commands, a claim in their README against what `git remote -v` actually says), and nothing in this structure will hand you those. Go looking.

Close with **the three highest-value gaps**, ranked, and be opinionated about the order.

**Also record what they do better.** They will have things worth stealing in the other direction, and saying so is what makes the rest credible. Flag those clearly; they're the ones worth contributing back to the room.

---

## PHASE 4, Walk it, one decision at a time

Go through the ranked gaps **one at a time**. Never bulk-apply. **Walk at most the top three in this session** and offer the rest as a list to come back to; there are usually ten or more and this runs before an afternoon of tables.

**Keep the chat simple even though the doc is dense.** They shouldn't need to read `migrate-analysis.md` to follow you. One system, explained in plain English, then a decision. If you catch yourself reading the document out loud, stop and say it in a sentence instead.

For each:
1. What it is, in a sentence.
2. What it changes about their week.
3. What it would cost to adopt: files added, habits changed, anything it might break.
4. **Then ask: take it, skip it, or come back to it?**

On **take it**: make that one change in **their** workspace, show them the diff, confirm it's what they wanted, commit it, then move to the next.

```bash
git -C "$TARGET" add -N .          # so brand-new files show up in the diff at all
git -C "$TARGET" diff
# after they confirm:
git -C "$TARGET" add -A && git -C "$TARGET" commit -m "migrate: <the change, in plain words>"
```

Both halves matter. A plain `git diff` shows **nothing** for a file that didn't exist before, so without `add -N` you show them an empty diff and tell them it landed. And if you don't commit, you leave their repo dirty, which means safety rule 2 blocks this command from ever running again on a mess this command made. Narrate the commit in one line, don't make a ceremony of it.

On **skip**: record why in the analysis doc. That reasoning matters more than the decision.

Take it in either direction. If something of theirs is better, port it into this workspace instead.

---

## PHASE 5, Close and point them forward

1. Update `outputs/migrate-analysis.md` with what was taken, what was skipped and why.
2. Confirm nothing broke **on their side**, since that's where the changes went: `git -C "$TARGET" status` clean, and anything you added actually runs. Running `/prime` here proves nothing about their workspace.
3. If you were on a weaker model or couldn't parallelise, say so in one line now.

Then the handoff into the rest of the day:

```
Your workspace now has [what they took]. The analysis is in
outputs/migrate-analysis.md if you want to revisit the ones you skipped.

Next: /pack-review walks the pack folders one at a time and works out
how each one maps to your business, so you arrive this afternoon knowing
exactly what to ask.
```

---

## Finish with /log (automatic)

Run `/log` as the final step. Don't ask.
