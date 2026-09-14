# Getting your keys

> Every platform this workspace connects to, with the exact route. Claude walks you through these one at a time, so you never need to read this cover to cover. It's here for the day you add something later.
>
> **Core links and tests re-verified: 2026-08-26.**

## For Claude: how to run any block below

**Two stages, always. Never hand over both links at once.**

1. **Send the sign-up link first, on its own.** Then stop and wait for them to say they're signed in. Don't give them the key page yet, don't explain the next step, just wait. The sign-up link is the one that has to be clicked first.
2. **Once they confirm, give the key page.** Most consoles make it obvious from there. The direct link is in each block for anyone who gets lost.
3. **Open `.env` and point to the empty variable.** They paste the key into that local file themselves and tell you when it is saved. A key never belongs in chat, a ledger, a command, or a screenshot. Never print or repeat it during a test.
4. **Then test it.** Every block has a verified test. Run it without echoing the key, and only call the step done when it comes back clean. A key that was mistyped or copied half-way is the single most common thing that breaks a workspace a week later, and thirty seconds here saves that.

The Glaido, Firecrawl, Supadata and Apify signup URLs below are Liam Ottley's affiliate links. Before sharing one, say that Liam may earn a commission at no extra cost to the founder. Firecrawl's current program also gives a new customer 10% off. Do not imply a discount for the other tools, and never replace these URLs with untracked versions.

## For Claude: keep this file true

Console UIs move. Before walking anyone through a block, check the page still matches. If it doesn't:

1. Search for the current route, use it, finish the setup.
2. Update the block with the new path and a fresh `verified` date.
3. Add a line to the Changelog at the bottom.

Never delete a Changelog entry. A `verified` date more than a couple of months old is itself a reason to check first.

Two real examples of why, both found on 2026-07-28: Anthropic renamed its whole console from `console.anthropic.com` to `platform.claude.com`, and this file's own Supadata path was wrong before anyone used it.

---

## The one thing you can't skip

**Claude Pro or Max.** Claude Code runs on your Claude subscription. Without a paid plan it won't start. `claude.ai/upgrade`.

No API key involved. If you're reading this inside Claude Code, you already have it.

---

## GitHub is optional

The workspace runs without a GitHub account. The installer offers GitHub later as a private backup and team handoff. If they take that option, **use "Continue with GitHub" on developer tools where it is available.** If they skip it, email or Google sign-in is fine and must not block the setup.

- One identity instead of eight passwords, so no reset spiral six weeks from now.
- Turn on two-factor once, on GitHub, and it covers everything behind it.
- Your teammates already go through GitHub for repository access, so the pattern carries.

The model consoles are separate and are not needed for the base workspace.

---

## Integrations: your business tools

### Connectors (built into the Claude app)
*Gmail, Calendar, Drive, Slack, Notion, HubSpot, Stripe, Sheets, Linear and most other SaaS a business runs on. No install, no key, no CLI.*

**1. Open the connector list:** in the **Claude Desktop app**, Settings, then Connectors. Browse or Add.

**2. Add the one they need.** They sign in to that tool once in a normal OAuth window. That's the whole setup.

**3. Restart the app if the tool doesn't show up here yet.** Some connectors only register after a restart. If you've just watched them add one and still can't see it, that's why. Don't conclude it's broken.

**Test:** ask for something real from that tool, not a demo. Their last five emails, this week's calendar, the most recent record in their CRM. If it comes back with their actual data, it's on.

Same path on Mac and Windows, and nothing here depends on Git Bash or a terminal.

**Scope note:** connectors are an app-level setting, not a per-folder one. Turning one on makes it available everywhere they use Claude, not only in this workspace. Worth saying once so nobody is surprised.

**When there's no connector:** niche platforms, regional software, internal systems. Note it in `context/tech-stack.md` as not covered and use `/new-capability`, which researches that platform's API and builds the integration. Check the connector list first, every time.

**Git on Windows** (needed for Step 4, not for connectors): `winget install --id Git.Git -e --source winget` installs it silently, no dialog. If winget isn't recognised, use https://git-scm.com/download/win and accept every default. Close and reopen PowerShell afterwards or `git` still won't be found.

`verified: 2026-07-30`

---

## Core research powerups

Firecrawl and Supadata do different jobs. Add the one that matches the sources they use, or both. Neither is required for the five beginner commands.

### Firecrawl
*Reads any website properly. JavaScript-heavy pages, bot-protected sites, PDFs, and far cleaner content than basic tools.*

**1. Sign up:** https://firecrawl.link/liam-ottley
Wait until they're in.

**Affiliate disclosure:** Liam may earn a commission at no extra cost to them. New customers currently receive 10% off.

**2. Get the key:** Dashboard → API Keys → create one.

**3. They paste it into `.env`.** Use `FIRECRAWL_API_KEY`.

**Test:** run `uv run python scripts/check_research.py firecrawl`. It loads `.env` locally and reports the account without displaying the key. Then run `uv run python scripts/firecrawl_tool.py scrape "https://example.com"` and confirm the page comes back as Markdown.

`verified: 2026-08-26`

### Supadata
*Turns video into text. YouTube, TikTok, Instagram, X. Also searches YouTube, so every video in your market becomes readable.*

**1. Sign up:** https://supadata.ai/?ref=liam
Wait until they're in.

**Affiliate disclosure:** Liam may earn a commission at no extra cost to them.

**2. Get the key:** Dashboard at https://dash.supadata.ai → API Keys.

**3. They paste it into `.env`.** Use `SUPADATA_API_KEY`.

**Test:** run `uv run python scripts/check_research.py supadata`. It loads `.env` locally and reports the account without displaying the key. Then do a real one: pull the transcript of a video in their niche.

`verified: 2026-08-26`

---

## Model keys: for what you build

Not for the workspace itself. These power the apps, scripts and agents built inside it. Get one the day it's needed.

### Anthropic
*The strong models. Behind anything that has to reason well, and what agents run on.*

**1. Sign up:** https://platform.claude.com
Wait until they're in. (The console used to be `console.anthropic.com`, which now redirects here.)

**2. Get the key:** https://platform.claude.com/settings/keys → Create Key.

**3. They paste it into `.env`.** Use `ANTHROPIC_API_KEY`. It starts with `sk-ant-`.

**Test:**
```
curl -s -o /dev/null -w "%{http_code}\n" https://api.anthropic.com/v1/models \
  -H "x-api-key: $ANTHROPIC_API_KEY" -H "anthropic-version: 2023-06-01"
```
`200` means the key is live.

`verified: 2026-07-28`

### OpenAI
*Mainly Whisper, for turning audio into text. Call recordings, voice notes, dictation.*

**1. Sign up:** https://platform.openai.com
Wait until they're in.

**2. Get the key:** https://platform.openai.com/api-keys → Create new secret key.

**3. They paste it into `.env`.** Use `OPENAI_API_KEY`. It starts with `sk-`, and it is shown once, so it has to be copied before the dialog closes.

**Test:**
```
curl -s -o /dev/null -w "%{http_code}\n" https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```
`200` means the key is valid. Worth knowing this one still returns `200` when the account has no credit left, so if a real call later fails with a quota error, the key is fine and the billing isn't.

`verified: 2026-07-28`

### Gemini
*Cheap and multimodal. Good for volume, and for reading images, audio and video directly.*

**1. Sign up:** https://aistudio.google.com
Wait until they're in.

**2. Get the key:** https://aistudio.google.com/apikey → Create API key.

**3. They paste it into `.env`.** Use `GEMINI_API_KEY`.

**Test:**
```
curl -s -o /dev/null -w "%{http_code}\n" \
  "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY"
```

`verified: 2026-07-28`

---

## Your data

### Supabase
*A real database instead of fifteen spreadsheets. Once the data is here, you can ask it things a spreadsheet can't answer.*

**1. Sign up:** https://supabase.com → Start your project. Use GitHub if they connected it earlier; otherwise use an available email or Google sign-in.

**2. Create an organisation, then a project.** Provisioning takes a couple of minutes.

**Test:** ask it to list the tables. Empty is the right answer on a fresh project, and it proves the connection.

Two projects free, no card. They won't touch Supabase again after this. Claude builds the tables and moves the data in.

`verified: 2026-07-28`

### GitHub
*Backup, version history, and where teammates connect later.*

**1. Sign up:** https://github.com
**2. Claude checks for the GitHub CLI, installs it only with permission if needed, then runs** `gh auth login --web --git-protocol https`. The browser handles the sign-in; no personal access token goes into chat.

**Test:** push, then open the repo in a browser. Files there, `private/` absent.

Free plan covers unlimited private repositories and collaborators.

`verified: 2026-07-28`

---

## Talk instead of type

### Glaido
*Voice dictation that works in any text field. It is especially useful during the forty-minute business interview, where talking is easier than typing every answer.*

**1. Sign up and install:** https://get.glaido.com/liam-ottley
**2. On Mac or Windows,** follow Glaido's setup wizard and grant the microphone and typing permissions it requests.

**Affiliate disclosure:** Liam may earn a commission at no extra cost to them.

**Test:** have them dictate their next answer instead of typing it.

`verified: 2026-08-26`

---

## Everything else, when you want it

### Apify
*Scrapes what nothing else reaches. Instagram, TikTok, LinkedIn, Google Maps, marketplaces, review sites.*

**1. Sign up:** https://apify.com?fpr=8txghh
Wait until they're in.

**Affiliate disclosure:** Liam may earn a commission at no extra cost to them.

**2. Get the token:** https://console.apify.com/settings/integrations → API tokens.

**3. They paste it into `.env`.** Use `APIFY_API_TOKEN`.

**Test:**
```
curl -s -o /dev/null -w "%{http_code}\n" "https://api.apify.com/v2/users/me?token=$APIFY_API_TOKEN"
```

Sets itself up the first time someone asks to scrape one of those platforms.

`verified: 2026-08-26`

### xAI, for searching X
*What's being said in your market on X, right now.*

**1. Sign up:** https://console.x.ai
**2. Get the key:** API Keys. Write to `.env` as `XAI_API_KEY`.

Paid, no free tier. There's an optional `X_BEARER_TOKEN` from `developer.x.com` that adds engagement numbers, but it needs a developer account and an app, so skip it unless likes and impressions are the point.

`verified: 2026-07-28`

### Gmail, Calendar and Drive
Connectors in the Claude app, not a Google Cloud project. Settings, Connectors, sign in once for each.

The older Google Cloud OAuth scripts remain in `scripts/` for a custom build, but they are not part of the standard install.

`verified: 2026-07-30`

---

## Changelog

- **2026-08-26.** Updated the AI Makeover giveaway links. Glaido, Firecrawl, Supadata and Apify use Liam Ottley's disclosed affiliate links. Keys go straight into the local `.env`, never into chat. GitHub is optional. Firecrawl and Supadata are separate powerups; Apify and X search are on-demand.
- **2026-07-30.** Business tools moved to the connectors built into the Claude app: no CLI install, no Git Bash dependency on Windows, one sign-in per tool. Gmail, Calendar and Drive use the same route.
- **2026-07-28.** File created, every link and test verified live. Two-stage flow added (sign-up link first, wait for confirmation, then the key page). A tested check added to every block. Corrected Supadata's dashboard to `dash.supadata.ai` (was `supadata.ai/dashboard`). Recorded Anthropic's console move to `platform.claude.com`. Routed Gmail and Calendar away from Google Cloud.
