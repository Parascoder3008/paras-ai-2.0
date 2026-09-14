# Business System Starter Kit — resource draft

The single shared resource for the Sep 14–27 sprint. OS01 and OS02 both point here, and OS03/OS04 should point here too until there is measured reason to split destinations. `CURRENT-PLAN.md`: draft **one** primary resource CTA and test it before replacing live profile links.

Status: **written, not hosted, not delivered.** `resource-delivery` is an open blocker owned by Redima. Nothing in the sprint may carry this as a link CTA until a real form submission from a logged-out phone delivers this file and writes the source, content ID and consent fields into GHL.

Promise, stated exactly: *one recurring task, mapped into a testable AI workflow, with the human review boundary written down.* Not a system that runs your business. Not a template pack of fifty documents.

---

## Page 1 — Task Worksheet

Fill this for **one** task. If you cannot fill a field, write `unknown` and leave it visible.

| Field | Your answer |
|---|---|
| Task name | |
| How often it repeats | |
| Who does it today | |
| Input — what information the task starts from | |
| Output — what "done" looks like, concretely | |
| Reviewer — the person who checks before anything leaves | |
| What the system must **never** do | |
| What happens when information is missing | |

**The four selection checks.** If any answer is no, pick a different task to start with.

1. Does this repeat? A one-off is not worth systemising.
2. Is the input already available somewhere you can point at?
3. Can you tell a good output from a bad one in under a minute?
4. If it gets it wrong, can you catch it **before** it reaches a customer?

Start where the output is easy to review. A draft or an internal report is a better first system than anything touching payment, public promises or customer access.

**Worked example (synthetic — this is not a real customer).**

| Field | Example |
|---|---|
| Task name | First-response draft for a training inquiry |
| Repeats | Several times a week |
| Today | Owner, between other work |
| Input | The inquiry message + our approved course information |
| Output | Short relevant reply + two questions for the missing details |
| Reviewer | Owner, before sending |
| Never | Invent a price. Offer a discount. Confirm an unconfirmed date. Send by itself. |
| Missing info | Reply says "pricing confirmation pending" — no confident-looking number |

---

## Page 2 — One-Page Business Context

Your AI assistant cannot infer any of this. Five fields, one page, dated.

```
Dated: ____________________

BUSINESS        Who you help, and with what specific problem.
                Narrower is more useful than broader.

CURRENT OFFER   What you actually sell today, with its current price.
                An old price and a new price cannot both be current.

APPROVED FACTS  What may be stated without checking. Everything else
                is unknown until a human confirms it.

REVIEWER        The person, by name, who checks output before it leaves.
                "The team" is not a reviewer.

BOUNDARIES      What may be drafted. What needs review. What must never
                happen automatically.
```

Two rules that do most of the work:

- **Keep current separate from archived.** When strategy changes, move the old version to an archive file rather than editing it into ambiguity. Calling a file "final final" does not resolve which decision is live.
- **Give only task-relevant context.** Context does not mean handing over every document. It certainly never means pasting credentials, API keys or customer records into a prompt.

---

## Page 3 — Three Tests Before You Trust It

Run these against the actual tool, on the actual task. Write down what you expected and what happened.

1. **Old information test.** Give it an outdated fact — a stale price, a closed offer. Does it use your current approved information, or repeat what you fed it?
2. **Unknown test.** Ask something whose answer genuinely is not in the context. Does it report the gap, or manufacture a confident answer?
3. **Approval test.** Ask for an action that requires sign-off — a send, a commitment, a discount. Does it stop and hand over, or proceed?

Then three input shapes: normal, incomplete, and the **same input twice**. The repeat is the one people skip, and it is where duplicate messages and double-counted contacts come from.

One successful run is not a working system. Record the weak results; that is where the next version comes from.

---

## Page 4 — What This Kit Does Not Claim

Written plainly, because the sprint's whole positioning depends on it.

This is an educational worksheet. It does not promise revenue, savings, leads or any business outcome. It contains no client case study, because using one requires that client's permission and documented evidence.

The examples are synthetic. Building the system is your work; this structures the first decision.

Capital, time, software cost and operating discipline are all still required. Automation reduces some labour; it does not remove the need to run the business.

---

## Delivery and hosting checklist — Redima

Blocking. Every item must be true before any published content links here.

- [ ] Destination decided and hosted (not a raw file on disk, not an unrouted Drive link).
- [ ] Capture form live, with explicit opt-in wording naming the purpose and the channel.
- [ ] Submission from a **logged-out phone** delivers the kit; screen-recorded as evidence.
- [ ] Same again on desktop.
- [ ] Submitting twice produces one contact and one delivery — no duplicate record, no duplicate send.
- [ ] GHL record carries acquisition source, content ID, resource ID and consent purpose/channel/timestamp.
- [ ] URL, `tested_on`, `tested_by` and `delivery_verified` written into `../production-board.json` for the item that will carry it.
- [ ] Pinned comment and video description agree with the on-screen CTA.

Only then does `node scripts/ops.cjs check` count the item as passing its local prerequisites — and passing prerequisites is still not authorization to publish. That remains Paras's explicit approval.
