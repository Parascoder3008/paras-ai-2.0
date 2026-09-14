---
name: task-audit
description: Map where a founder's working week actually goes, correct the estimate with them, and identify the best tasks to remove, delegate, augment or automate. Use when the user runs /task-audit or asks what to automate, where their time goes, which work AI should take over, or what they should build first.
user-invocable: true
---

# Task Audit

Turn a messy week into one useful decision: what should this workspace help with first?

This is a guided conversation for a non-technical founder. Ask one question at a time, use plain language, and show the evidence behind every estimate. The founder's correction always beats an inference from their calendar.

## 1. Establish the week

Read `context/business.md`, `context/you.md`, `context/team.md`, `context/strategy.md` and `context/tech-stack.md` when they exist.

Ask which period best represents a normal week. Then gather the work in either of these ways:

- If Calendar is already connected, ask permission to read the last four complete working weeks. Treat meetings as evidence, not the whole job.
- If Calendar is not connected or the founder prefers not to use it, reconstruct a typical week conversationally.

Do not turn connector setup into a prerequisite. Never imply that an empty calendar means an empty week.

## 2. Correct the picture together

Draft the main work categories and a first hours-per-week estimate. Include work calendars routinely miss: preparation, follow-up, admin, messages, travel, thinking time and tasks that overrun their booking.

Walk through the draft one category at a time. Ask what is missing, what is overstated, and what has changed recently. Keep a confidence label of high, medium or low for each estimate.

## 3. Classify the work

For each meaningful task, record:

- owner and frequency;
- estimated hours per week;
- what makes it slow, repetitive or frustrating;
- the evidence and confidence level;
- the best direction: keep, remove, delegate, augment or automate.

Do not recommend automation merely because a task repeats. Protect work that depends on judgment, trust, taste or an important human relationship. Prefer augmentation when the person should stay in control.

## 4. Choose the first move

Rank the top three opportunities by time returned, business value, ease and risk. Recommend one first move that can show a useful result quickly with the context and tools already connected.

For that first move, write one ready-to-run `/explore` prompt in the founder's language. Keep it specific enough to start, but leave solution design to `/explore`.

## 5. Save the result

Write `outputs/task-audit-YYYY-MM-DD.md` with:

1. the corrected weekly picture and total hours;
2. the task table;
3. the top three opportunities and why they rank there;
4. the recommended first move;
5. the exact `/explore` prompt;
6. assumptions and low-confidence estimates that still need checking.

Show the founder the saved path and the single recommended next command. If the conversation revealed a durable change to their role or priorities, propose the smallest matching update to `context/` and wait for approval before changing it.

Finish with `/log` so the audit and decision survive the session.

---

## Maintenance

> **Self-improvement rule:** If this skill reveals a recurring audit mistake or a materially better way to estimate founder time, add one concise line below before finishing. Refactor the section if it grows beyond ten items.

### Known Gotchas

- Calendar blocks routinely omit operational work and underestimate meetings that run past their booked length.
