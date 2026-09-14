---
name: connectors
description: Reach the business's own tools. Gmail, Calendar, Drive, Slack, Notion, HubSpot, Stripe, Google Sheets, Linear, Asana and the rest, through the connectors built into the Claude app. Use whenever the user asks to do something in a platform they run their business on. Triggers on - send an email, check my inbox, what's in my calendar, look at my CRM, my deals, my customers, pull from my spreadsheet, post to Slack, add to Notion, my Stripe payments, my bookings, my orders, update that record, message them, schedule it, "can you check my [tool]", "in my [tool]", any named SaaS product. Also the first thing to try before building a custom integration.
---

# Connectors

The tools the business actually runs on, reachable from this folder. Connectors are built into the Claude app, so there's nothing to install here and no API key to paste.

## Before you promise anything, look

Check what's actually connected before you tell the user you can do something. A connector that isn't switched on is not a capability, and saying "I'll pull that from your CRM" and then failing is worse than asking them to spend thirty seconds turning it on.

If the tool you need isn't there, say so plainly and offer to walk them through adding it.

## Turning one on

In the **Claude Desktop app**: Settings → Connectors → Browse or Add. They sign in to the tool once in a normal OAuth window and it's on. Same path on Mac and Windows.

Two things that trip people up:

- **It's an app setting, not a folder setting.** Once it's on, it's on everywhere, not just this workspace.
- **Some need the app restarted** before the tool shows up here. If you've just watched them add one and you still can't see it, that's the reason. Say so and wait rather than deciding it's broken.

## How to work with them

- **Read before you write.** Pull the record, show the user what you found, then act. Especially for anything that sends, posts, or changes someone else's view of the world.
- **Confirm before anything outward-facing.** Sending an email, posting to a channel, creating a calendar invite, changing a CRM record someone else relies on. Say exactly what you're about to do and wait for a yes. This holds even when permissions are set to bypass; that setting is about not interrupting on file reads, not a licence to send things on someone's behalf.
- **Real data means real care.** These are live business systems, not a sandbox. No bulk deletes, no mass updates, no "I'll just tidy this up while I'm here."
- **Write what you learn into context.** If a connector run reveals something durable about how the business works (their pipeline stages, the shape of their client list, what their booking flow looks like), that belongs in `context/`, not just in the chat.

## Keeping tech-stack.md honest

`context/tech-stack.md` is the list of what the business runs on and what's reachable. Keep each tool marked as connected, available but not yet on, or not covered. When you turn one on, update the row in the same session. A stale list means future sessions either miss a tool that's there or promise one that isn't.

## When there's no connector

Some tools won't have one: niche platforms, regional software, internal systems, anything bespoke. That's what `/new-capability` is for. It researches the platform's API and builds a custom integration.

Check for a connector first, every time. It's one sign-in against an afternoon of work.
