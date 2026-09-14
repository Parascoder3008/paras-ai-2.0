---
name: viral-teardown
description: Reverse-engineers viral short-form videos (Instagram/TikTok/YouTube) to extract WHY they worked, then distills cross-video patterns into ready-to-film concepts for @parasarora_ai (or a DFY client). Pulls metadata/transcript via Apify (APIFY_API_TOKEN). Feeds paras-research + paras-script-writer; every derived concept must pass the 3E law + paras-script-auditor before production. Trigger on "analyze this video", "teardown", "why did this go viral", "study viral videos", or a pasted reel/short/tiktok link.
---

# Viral Teardown — reverse-engineer what's working in the niche

Turn "I follow good creators" into "I know exactly what my niche rewards right now, and I have the templates." Studies OTHER people's winners; the `paras-script-auditor` grades OURS. Together they close the loop: **scout finds → teardown decodes → research + script-writer build → auditor gates → publish → calibration learns.**

## Inputs
1+ video URLs (IG reel, TikTok, YouTube short/long). More videos = a stronger pattern report. If the user pastes a transcript, use it; otherwise pull it (below).

## Step 1 — pull metadata + transcript (Apify)
`APIFY_API_TOKEN` is set. Pull engagement + caption (to judge if it's actually an outlier) and transcript:
- **Instagram:** `apify/instagram-scraper` (proven working) — `resultsType:"posts"`, `directUrls:[url]` → caption, likesCount, timestamp, videoUrl.
- **TikTok:** `clockworks/tiktok-scraper` or `apify/tiktok-scraper` → caption, playCount, diggCount.
- **YouTube:** a transcript actor (e.g. `pintostudio/youtube-transcript-scraper`) or the video's captions.
- **Spoken transcript** (the words said): if the scraper doesn't return it, use platform captions; else ask the user to paste it (Supadata/TokScript). Don't fabricate a transcript.
- **Outlier check:** compare engagement to the creator's median. A post far above their norm is the real signal — a normal post is not "viral." Note the multiple (e.g. "8× their median").
API pattern: `POST https://api.apify.com/v2/acts/<actor>/run-sync-get-dataset-items?token=$APIFY_API_TOKEN` with the directUrls body.

## Step 2 — single-video teardown (per video)
Produce, in order:
1. **Snapshot:** creator · platform · length · format · outlier multiple (vs their median).
2. **Full transcript** with the **hook (0–3s) bolded** and the **CTA bolded**.
3. **Hook analysis — 3 layers + alignment:** verbal (what's said), visual (what's shown), text (on-screen) — and do they *reinforce* each other or fight? Misalignment kills hooks.
4. **Beat-by-beat structure:** map each beat; mark **open loops** and where each **pays off**. Note dead air.
5. **Retention mechanics:** pacing (cuts/sec feel), pattern interrupts, payoff density (value per 10s), re-engagement cadence.
6. **Visual layout & format:** talking-head / screen-record / b-roll / text-on-screen / motion-graphic — and why that format fit the message.
7. **Caption + CTA:** what the caption does (context vs curiosity), the CTA mechanism (keyword/DM/link-in-bio), the ask.
8. **Ranked causal factors:** the top 3–5 reasons it worked, most-decisive first. Be honest — sometimes it's the topic/timing, not the craft.
9. **Remix template:** a fill-in-the-blank script adapting the winning structure to Paras's niche (Indian SMB/consultant/creator, Hinglish) — **3 angles**. Tag each with its **3E** (Emotion/Education/Entertainment).

## Step 3 — batch pattern report (2+ videos)
Compressed teardown per video, then a **pattern report**:
- **Dominant hook types** (side-by-side) — which structure recurs in the winners.
- **Winning format + length clusters.**
- **Common beat sequences + open-loop placement.**
- **Shared topic angles** the niche is rewarding *right now*.
- **CTA/conversion patterns.**
- **5 ready-to-film concepts for @parasarora_ai** — each with: hook line (Hinglish), format, the pattern it borrows, the 3E it hits, and the keyword CTA.
> Distill into **"what my niche rewards right now"** rules — testable, not vague.

## Step 4 — wire into the engine (don't let insight rot)
- Append confirmed patterns to `ai-os/content/viral-patterns-log.md` (compounds into a niche playbook).
- The 5 concepts → feed `paras-research` (topic selection) + `paras-script-writer` (structure/hook).
- **Every concept must still pass `paras-script-auditor` (3E + format bar) before it's produced.** A borrowed pattern is a hypothesis, not a guarantee.
- Weekly: the `os-learning-scout` can run this on the top-performing posts from the 19 followed creators.

## Rules
- **Study, don't steal.** Extract the *structure/mechanism* (hook type, beat order, loop placement) — never copy their exact words, footage, or claims. Our copy is original, our examples are Paras's (Meera, his systems).
- **Outlier or it doesn't count.** Analyze posts that beat the creator's median; a normal post teaches nothing.
- **Honesty over pattern-worship.** If a video won on topic/timing/luck, say so — don't invent a craft lesson that isn't there.
- **Compliance (§4):** no income-claim hooks even if a competitor uses them; flag + replace with a compliant angle.
- **Cloneable:** swap the niche + handle at the top to run this for a DFY client's vertical.
