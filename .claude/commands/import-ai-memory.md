# /import-ai-memory

> Pulls everything ChatGPT or Claude already knows about you into this workspace, without waiting on a data export. Months of you explaining your own business, in your own words, in about two minutes.

## Variables

args: $ARGUMENTS (optional: `chatgpt` or `claude` to skip the question)

---

## FOR CLAUDE, how to run this

The official data export is the slow path and on a business or enterprise plan it's often locked behind an admin who isn't in the room. This gets most of the same value in two minutes: the model writes its own memory out, they paste it back here.

Explain that in one line before you do anything, so they know why they're not being sent to a settings page.

### 1. Which one

Ask which they've used more, ChatGPT or Claude. If they've genuinely used both a lot, do both, one at a time. Two dumps is better than one and it costs them another two minutes.

### 2. Hand them the prompt

Give them the block below **on its own, in a code block, with nothing after it**, so the copy button grabs exactly the right thing. Tell them: open a new chat in that app, paste this, send it.

For ChatGPT, tell them to turn on the memory-heavy path if they have it: use their normal account in the browser or desktop app, not a temporary chat, because a temporary chat can't see memory.

```
Write out everything you know about me and my business into one long document.

Go through our whole history together, not just this conversation. Include:

- Who I am, what I do, and how I describe myself
- My business: what it sells, who buys it, how it makes money, roughly what size
- My customers and the ideal one specifically
- My offers, pricing, and how I position them
- My team, who does what, anyone I mention often
- The tools and software I use
- My goals, current priorities, and what I keep saying I want to fix
- Problems I've raised more than once
- Decisions I've made and the reasoning behind them
- How I write and talk: tone, phrases I use, things I avoid
- Anything else about me you'd want a new assistant to know on day one

Write it as a plain document with headings, not a summary and not bullet
soup. Be specific: real names, real numbers, real examples, exactly as I
gave them to you. Length is not a problem, longer is better. If you are
unsure about something, include it and mark it as uncertain.
```

### 3. Get it back into the folder

Two ways, whichever suits them:

- **Paste it straight into the chat here.** Fine even if it's long. Write it to `context/import/ai-memory-<source>.md` yourself.
- **Save it as a file** into `context/import/`. Better on a phone or if it's very long.

Either way it lands in `context/import/`, which is git-ignored, so it never reaches the backup or a teammate. Say that as you ask, because they're about to hand over a lot.

### 4. Read it and say what you found

Don't just file it. Read it and tell them, in a few sentences, what you now know that you didn't. Two reasons: it proves it worked, and it surfaces whatever the model got wrong so they can correct it now rather than living with it.

Flag anything that reads as private (real margins, what people are paid, deal terms, personal matters) and offer to move it to `private/`.

### 5. Fold it in

- **Running inside `/install` Step 2:** don't write context docs yet. This is raw material for the analysis pass; carry on with the step.
- **Running on its own, after the workspace exists:** work out what it changes. Propose specific edits to the context docs, apply on approval, never silently. If it contradicts something already written, say so and ask which is current, because the dump can be months out of date.

### 6. Mention the real export once

At the end, one line, no pressure: the official export has the full text of every conversation and is worth requesting if they ever want it, but this covers most of it and they've got it now. If they're on a business or enterprise plan, note that the export usually needs a workspace admin.

Then write a ledger row and stop.

---

## Notes

- **The dump is the model's memory, not a transcript.** It's confident, compressed, and sometimes wrong. Treat it as a strong first draft of who they are, not as fact.
- **Do this before the interview, not after.** The whole point is that you stop asking about things you could have read.
- **Nothing to install and no key needed.** Works on any plan, including the ones where the export is locked down.
