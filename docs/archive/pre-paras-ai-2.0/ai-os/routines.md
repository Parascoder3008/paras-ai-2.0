# Routines — the OS's daily heartbeat

Every scheduled routine writes to **`ai-os/inbox/`**. One folder, checked once a day.

```bash
ls -1t "D:/Claude code/ai-os/inbox" | head -10
```

## The set

| Time (local) | Routine | Writes | Purpose |
|---|---|---|---|
| 07:43 daily | `daily-business-pulse` | `YYYY-MM-DD-pulse.md` | Real GHL funnel numbers — what moved, what stalled, what needs Paras |
| 08:10 daily | `os-learning-scout` | `YYYY-MM-DD-scout.md` | New repos/tools worth adopting, RECOMMEND or SKIP |
| 09:08 daily | `daily-ai-job-hunt` | `YYYY-MM-DD-jobs.md` + `shortlists/` | A/B-graded roles, then tailored CVs + pre-filled forms |
| 09:37 daily | `daily-distribution-task` | `YYYY-MM-DD-distribution.md` | Today's record/publish/repurpose/engage list |
| 21:01 daily | `recording-accountability` | `SuperComputer/content/streak.md` | Footage check + streak, confronts misses |
| 09:09 Friday | `ewai-friday-review` | `YYYY-MM-DD-friday-review.md` | 7 numbers, gate verdict, next week's #1 task |

---

## Why they were silent (fixed 2026-08-03)

All four original routines **ran**. Three produced **nothing**.

| Routine | Root cause |
|---|---|
| `os-learning-scout` | Step 5 asked "which do you want to adopt?" and step 6 only logged **adopted** items. Headless, nobody answers, so nothing was ever written. The log sat untouched from Aug 2 while the scout ran daily. |
| `daily-ai-job-hunt` | Scanned **143 jobs** successfully, then died during CV-tailoring/browser pre-fill — *before* its first write. All that work, zero output. |
| `ewai-friday-review` | "Ask Paras for any numbers you can't get" stalled it before the write step. Last Decision note: Jul 7. |
| `recording-accountability` | **Worked** — because it writes `streak.md` unconditionally and asks nothing. |

**The fix, applied to all of them:** write the output file *before* the fragile or optional work, and never block on a question. Open items become a checklist in the file.

---

## Two operational gotchas

**1. Routines only run while the app is open.** If it's closed when one is due, it fires on next launch. That's why three tasks show `lastRunAt` within the same three seconds (`05:18:04–06` on Aug 4) — that's catch-up-on-launch, not their real schedule. A day with the app closed is a day with no routines.

**2. A permission prompt with nobody there stalls the run.** Tool approvals are stored per-task and reused, but the *first* run of a routine that hits an unapproved tool (WebSearch, Bash/curl, browser) can pause waiting for a click. **Hit "Run now" once on each new routine** to pre-approve its tools — after that it runs clean.

---

## Rules for writing a new routine

1. Claim the output file **first**, with `status: running`, before any work that can fail.
2. Never ask and wait. Questions become one-line items in an **Open questions** section.
3. Degrade, don't crash — a dead source gets `⚠️ unavailable`, and the routine continues.
4. Never invent a number. Label figures `known` / `calculated` / `unavailable`.
5. **Routines report and draft. They never send, publish, or spend** — Constitution §5.
6. Compliance §4 binds every drafted line: education only, no income or return claims.
