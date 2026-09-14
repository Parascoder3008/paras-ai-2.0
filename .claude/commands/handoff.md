# Handoff

> For when a session gets long and the thread starts to fray. Packages where things stand and hands you the exact text to start a fresh session with. Nothing is lost.

## What to do

1. **Run /log first**, internally: ledger rows, drift check, save + backup. The handoff sits on top of a clean save.

2. **Write the handoff note** to `outputs/handoffs/YYYY-MM-DD-<topic>.md`:
   - What we were working on and why
   - Where we got to (done, in progress, not started)
   - The decisions made along the way
   - Exactly what to do next, in order
   - Any gotchas the next session should know

3. **Hand over the baton.** Print this for the person to copy:

```
Open a new session and paste this:

/prime, then read outputs/handoffs/<the file you just wrote> and continue from "what to do next".
```

That's it. The new session primes into full context, reads the note, and picks up mid-stride.
