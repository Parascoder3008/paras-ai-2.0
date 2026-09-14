#!/usr/bin/env python3
"""On-brand carousel renderer — slide copy -> 1080x1350 PNGs.
Reusable + brand-parametrized (change PALETTE to clone for a DFY client).
Schedule the output via GHL Social Planner. No SaaS needed.
Usage: edit SLIDES + OUT_DIR below, run: python carousel_render.py
"""
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import os, sys

# ---- BRAND (clone per client by editing this block) ----
# Exponential World AI brand (re-extracted 2026-08-03) — see ai-os/brand-guidelines.md.
# Keys keep their legacy names so callers don't break; the VALUES are the current blue brand.
PALETTE = dict(
    void="#0C0E0F", card="#151b1f", violet="#1A9FD1", violet_b="#3AB0D8",
    cyan="#11324C", text="#FFFFFF", mute="#DFDDDF", wordmark="EXPONENTIAL WORLD AI",
)
W, H = 1080, 1350
FDIR = "C:/Windows/Fonts/"
def font(name, sz): return ImageFont.truetype(FDIR + name, sz)
def hexrgb(h): h=h.lstrip("#"); return tuple(int(h[i:i+2],16) for i in (0,2,4))

def glow(canvas, xy, r, hexcol, alpha):
    layer = Image.new("RGBA", canvas.size, (0,0,0,0)); d = ImageDraw.Draw(layer)
    x,y = xy; d.ellipse([x-r,y-r,x+r,y+r], fill=hexrgb(hexcol)+(alpha,))
    canvas.alpha_composite(layer.filter(ImageFilter.GaussianBlur(r//2)))

def wrap(draw, text, fnt, maxw):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t=(cur+" "+w).strip()
        if draw.textlength(t, font=fnt) > maxw and cur: lines.append(cur); cur=w
        else: cur=t
    if cur: lines.append(cur)
    return lines

def render_slide(i, n, text, kind, out):
    P = PALETTE
    c = Image.new("RGBA", (W,H), hexrgb(P["void"])+(255,))
    glow(c, (200,260), 420, P["violet"], 80)
    glow(c, (900,1150), 380, P["cyan"], 45)
    d = ImageDraw.Draw(c)
    # progress bar (segments)
    seg_w=(W-160)/n; y=90
    for k in range(n):
        x0=80+k*seg_w+6; x1=80+(k+1)*seg_w-6
        col = P["violet"] if k<=i else "#2a2a36"
        d.rounded_rectangle([x0,y,x1,y+9], 4, fill=hexrgb(col)+(255,))
    # slide number
    d.text((80,140), f"{i+1:02d} / {n:02d}", font=font("segoeuib.ttf",34), fill=hexrgb(P["mute"]))
    # headline (centered block)
    hf = font("segoeuib.ttf", 88 if len(text)<70 else 68)
    lines = wrap(d, text, hf, W-200)
    lh = hf.size + 22
    total = len(lines)*lh
    ty = (H-total)//2 - 40
    accent = kind=="cta"
    for ln in lines:
        lw = d.textlength(ln, font=hf)
        d.text(((W-lw)/2, ty), ln, font=hf, fill=hexrgb(P["violet_b"] if accent else P["text"]))
        ty += lh
    # swipe cue / cta (draw a triangle instead of an arrow glyph)
    def tri(x, y, col, s=16):
        d.polygon([(x,y-s),(x,y+s),(x+s*1.4,y)], fill=hexrgb(col)+(255,))
    cf = font("segoeuib.ttf", 40)
    if kind=="cta":
        cue="Comment REVIVE"; cw=d.textlength(cue, font=cf)
        bx0,bx1=(W-cw)/2-70,(W+cw)/2+70
        d.rounded_rectangle([bx0, H-262, bx1, H-178], 42, fill=hexrgb(P["violet"])+(255,))
        d.text((bx0+40, H-250), cue, font=cf, fill=hexrgb(P["text"]))
        tri(bx1-46, H-220, P["text"])
    else:
        cue="swipe"; cw=d.textlength(cue, font=cf)
        d.text((W-cw-130, H-250), cue, font=cf, fill=hexrgb(P["violet_b"]))
        tri(W-118, H-232, P["violet_b"])
    # wordmark
    wf = font("segoeui.ttf", 30)
    d.text((80, H-120), P["wordmark"], font=wf, fill=hexrgb(P["mute"]))
    c.convert("RGB").save(out, quality=95)
    return out

def render_carousel(slides, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    n=len(slides); paths=[]
    for i,(text,kind) in enumerate(slides):
        p=os.path.join(out_dir, f"slide-{i+1:02d}.jpg")
        render_slide(i,n,text,kind,p); paths.append(p)
    print("rendered", n, "slides ->", out_dir)
    return paths

if __name__ == "__main__":
    # Video #1 carousel (emoji stripped — PIL can't render color emoji; keep text clean)
    SLIDES = [
        ("Aapke phone mein CHHUPA hua PAISA", "hook"),
        ("500 dead customers. 40 wapas. 3 din. Zero messages khud bheje.", "body"),
        ("Naya customer 5x mehnga. Purana almost zero. Phir bhi 90% ulta karte hain.", "body"),
        ("3-part system: List. AI personal message. Auto-send jab aap so rahe ho.", "body"),
        ("Secret: koi discount nahi. 'Sirf aapke liye rakha' = izzat. Izzat paisa laata hai.", "body"),
        ("Comment REVIVE for the free kit", "cta"),
    ]
    render_carousel(SLIDES, "D:/Claude code/ai-os/content/video-01-carousel")
