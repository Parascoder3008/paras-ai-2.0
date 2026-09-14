# Exponential World AI — Brand Guidelines

Source: **exponentialworld.ai (live site, re-extracted 2026-08-03).** Every visual/creative follows this. brand-guardian enforces.

> ⚠️ **Rebrand note:** the palette changed from the earlier **violet/purple + Fraunces serif** identity to the current **blue + Inter sans** identity. The site's CSS variables are still *named* `--violet` / `--cyan` for legacy reasons, but their **values are blue**. Always go by the hex, never the variable name. Anything produced before 2026-08-03 (old carousels, thumbnails, motion inserts) is off-brand and should be re-rendered.

## Palette (current)
| Token | Hex | Use |
|-------|-----|-----|
| **Void / Deep** (bg) | `#0C0E0F` | primary background (near-black) |
| **Blue** (primary accent) | `#1A9FD1` | brand primary, CTAs, links, glow |
| Blue bright | `#3AB0D8` | hovers, highlights, accent-2 |
| **Navy** (secondary) | `#11324C` | secondary surfaces, depth, gradients |
| Blue glow | `rgba(26,159,209,.35)` | glows/shadows around elements |
| Navy glow | `rgba(17,50,76,.45)` | ambient depth |
| Text primary | `#FFFFFF` | headings + body |
| Text secondary / muted | `#DFDDDF` | muted copy |

**Glassmorphism (unchanged):** bg `rgba(255,255,255,.045)` · border `rgba(255,255,255,.09)` · highlight `rgba(255,255,255,.12)` · **radius 28px** (inner 27px) · blur ~24px.

**Signature look:** near-black void base + **blue↔navy depth**, glass panels, soft blue glow. Cool, technical, premium.

## Typography
- **Inter** (sans) — headings AND body. `Inter, system-ui, sans-serif`.
- Vibe: clean, modern, technical, confident. *(Fraunces serif is retired.)*

## Logo & assets
- Logo: `https://exponentialworld.ai/logo.png`
- Founder photo (Paras): `https://exponentialworld.ai/Paras_Founder.png`

## Voice
"AI-Driven Excellence. Redefining Your Future." Premium, credible, education-first. Helping businesses actually USE AI. Compliance: no income/return claims.

## Creative rules (all generated images, ads, thumbnails, motion, dashboards)
1. Background = dark void `#0C0E0F` — not white, not pure black.
2. Primary accent = **blue `#1A9FD1`**, secondary = **navy `#11324C`**. **NO violet/purple** (retired), no random teal/orange.
3. Type = **Inter sans** (not serif).
4. Glassmorphism panels + soft blue glow, 28px radius.
5. Founder's real face from `Paras_Founder.png` — never an AI-drifted face.
6. Text `#FFFFFF` / muted `#DFDDDF`. Premium, minimal, high-contrast. Never cheesy.
7. **Status colors are separate from brand:** ok `#3ddc97` · warn `#ffc53d` · error `#ff6259`. Use only to signal state, never as decoration.

## Where this is applied
- Operator dashboard (`dashboard/index.html`) — theme tokens
- Carousel renderer (`ai-os/tools/carousel_render.py` → `PALETTE`)
- Motion graphics (Remotion, `video-engine/`)
- Thumbnails + all creative
