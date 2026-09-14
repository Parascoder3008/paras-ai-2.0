# Test

> Claude checks its own work by actually using it. The substance lives in the **test skill** (`.claude/skills/test/`), which also fires on its own whenever you ask "is this working?" or after /implement builds something.

Run the test skill now against whatever was just built or changed this session: identify the deliverable, pick the matching playbook (script, app, integration, document, or workspace change), exercise it for real, try to break it gently, fix what fails, and report plainly. Never report "done" on work that wasn't exercised.

---

## Finish with /log (automatic)

Don't ask, don't wait to be told. Run `/log` as the final step of this command: it sweeps anything unlogged, checks whether a context doc drifted, then saves and backs up. The person should never have to remember to do it after a build.
