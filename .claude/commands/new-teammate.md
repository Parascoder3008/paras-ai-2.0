# /new-teammate

> Bring a person into the workspace, properly. One shared brain, their own seat. This command makes the tough calls with the founder (what's shared, what's not, what the role owns), then mints a small onboarding pack to send over. The teammate never gets a copy of the workspace; they get a seat in it.

## Variables

args: $ARGUMENTS (optionally the person's name to start with)

---

## FOR CLAUDE, how to run this

- Same rules as /install: conversation not script, explain before doing, no jargon, no error dumps, confirm between phases.
- Default open on direction (strategy, offers, how things work), default closed on money and people (compensation, margins, deal terms, personal). The founder can override anything.
- Requires the backup phase (GitHub) to be live. If it isn't, say so and run that setup first, the shared brain needs the meeting point.

---

## PHASE 1, The role (~5-10 min)

"Tell me about this person. Name, and what are you bringing them in to own?"

Interview until you can write a sharp seat profile: what they own, what success in the seat looks like, how they'll work with the founder, anything from context/team.md already known about them (read it first, they're probably in it).

Write `team/<name>.md`: role, mandate, what they own, working notes. Read it back; correct until approved.

## PHASE 2, The sharing audit (the tough decisions)

Walk EVERY doc in `context/` (and roles/), one at a time, fast:

- **Shared**: every seat reads it. Default yes: business, offer, strategy, team, tech-stack, roles.
- **Role-scoped**: only this seat needs it (their function's docs).
- **Owner-only**: stays with the founder. Default: anything with real margins, compensation, deal terms, personal matters. If such a thing is sitting in a tracked file, move it to `private/` NOW.

Be honest about history: "if something sensitive was ever saved in a shared file, moving it now protects the future, but the old save points still hold the past. For a trusted hire that's usually fine. For a cold hire, we can start a fresh repository instead, say the word."

Write `context/shared-manifest.md`: the list of docs every seat loads, plus per-seat extras. This is what a teammate's /prime reads instead of "everything".

## PHASE 3, The seat

1. Create `ledger/<name>.md` with a header row explaining the format.
2. Their `.seat` file contents (goes in the pack, not this repo): `person: <name>`.
3. Confirm /prime's seat behaviour: a teammate seat loads CLAUDE.md + the shared manifest's list + `team/<name>.md` + the ledger tail. Never `private/` (it won't exist in their clone anyway, it never syncs).

## PHASE 4, Access

1. GitHub: repo → Settings → Collaborators → Add people → their GitHub username or email. Walk the founder through the clicks. (No account yet? The pack's install handles that on the teammate's side, the invite can be sent to their email.)
2. Keys: their pack gets a `.env.example` with ONLY the keys their role needs, each with its URL. **The founder's .env never leaves this machine.** The teammate mints their own keys during their install.

## PHASE 5, Mint the pack

Create `outputs/onboarding/welcome-<name>/` with three files, then zip it (`welcome-<name>.zip`) for the founder to send however they like.

**1. WELCOME.md**: written to the person, by name. Short: what this is ("[Company] runs on a shared AI workspace, one brain the whole team works out of"), what they'll have in ~20 minutes (a seat in it: every session starts knowing the company, their role, and what everyone's been doing), and the three steps: install the Claude Desktop app (claude.ai/download, sign in with the account [Company] set up or their own), open Claude Code, open this folder, then say: **"Read INSTALL.md and set me up."** Recommend Glaido for voice: https://get.glaido.com/worklessai

**2. INSTALL.md**: written FOR the Claude session that will run it. Personalised with their name, the company, the repo address, and their role summary. It walks, in order, with the same conversational rules as the founder's install:
   1. Welcome them by name; one paragraph on the workspace and their seat.
   2. GitHub: account if needed, accept the collaborator invite (check email), sign in via device flow so Claude does all git work.
   3. Clone the company repo to a sensible location; tell them plainly: "this is your copy of the company brain, it syncs with everyone else's."
   4. Write `.seat` (`person: <name>`) into the clone. Copy the pack's `.env.example` in as `.env` and walk each key they need, with a live test each.
   5. The handover moment: "now open the cloned folder in Claude Code, that's your workspace from here on. This pack folder is done. When you're in, type /prime."
   6. (Continues in the workspace:) /prime loads their seat, have them ask the company brain anything as proof. One small real task from their role. First /log: their first row lands in the shared ledger, visible to the whole team.
   7. The rhythm contract: /prime to start, /log to end, /handoff when long. "Your work shows up in the ledger, not in status meetings."

**3. .env.example**: the role-scoped key list from Phase 4.

## PHASE 6, The founder brief

Print a short brief for the founder (and save to `outputs/onboarding/<name>-brief.md`):
- What <name> can see (the shared manifest) and what they can't (private/, owner-only docs)
- What to send them: the zip + one line ("unzip, open in Claude Code, it takes it from there")
- What to expect: their rows appearing in `ledger/<name>.md`; /prime shows you their work every session
- The one thing to tell them in person: prime to start, log to end
- Costs: their own Claude subscription; everything else is free

Then run `/log` automatically to close this out. Don't ask; a new seat is absolutely ledger-worthy.
