#!/usr/bin/env python3
"""Mind-map skeleton builder — the data layer for /mind (the Living Mind page).

Assembles a flat {regions, nodes, edges, stats} skeleton from the OS's real
sources. HARD RULE: never emit anything that isn't true. A broken source
empties ITS region only and records "error" in stats — it never fakes nodes
and never fails the whole build.

Usage:
  python mind_map.py build            # skeleton JSON on stdout
  python mind_map.py node <id>        # lazy detail for one node (404 -> exit 4)

Embeddings: fastembed BAAI/bge-small-en-v1.5 (ONNX, local, no torch), cached
incrementally in mind-embeddings.npz keyed by content hash. bge-small has a
compressed cosine range (unrelated ~0.55), so SIM_FLOOR is calibrated from the
corpus (mean + 0.5*std), not the reference build's 0.35.
"""
import hashlib
import json
import math
import os
import re
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent          # ai-os/tools
ROOT = HERE.parent.parent
MEMORY_DIR = Path(os.environ.get(
    "AIOS_MEMORY_DIR",
    str(ROOT / "memory")))
AGENTS_DIR = ROOT / ".claude" / "agents"
SKILLS_DIR = ROOT / ".claude" / "skills"
INBOX_DIR = ROOT / "ai-os" / "inbox"
RUNS_FILE = ROOT / "ai-os" / "agent-runs.jsonl"
VOICE_REG = ROOT / "dashboard" / "voice-commands.json"
_vault_path = os.environ.get("OBSIDIAN_VAULT_PATH")
OBSIDIAN = Path(_vault_path) / "projects" / "Paras AI 2.0" if _vault_path else None
EMB_CACHE = HERE / "mind-embeddings.npz"
FE_CACHE = HERE / ".fastembed-cache"
MANIFEST = HERE / "mind-manifest.json"           # id -> path; detail serves ONLY these

# Region palette. Core is BRAND blue (constitution: trust the hex);
# the other regions keep the reference palette as functional data-viz colors.
REGIONS = {
    "core":      {"label": "Paras AI 2.0", "color": "#1A9FD1"},
    "memory":    {"label": "Memory",       "color": "#A78BFA"},
    "working":   {"label": "Working",      "color": "#67E8F9"},
    "agents":    {"label": "Agents",       "color": "#E88FB3"},
    "knowledge": {"label": "Knowledge",    "color": "#F5A524"},
    "rim":       {"label": "Capability",   "color": "#8B93A1"},
}

# Load-bearing constants (tunable; reported in stats.tuning)
SIM_TOP_K = 3          # neighbors per memory node
KNOW_TOP_K = 2         # neighbors per knowledge node (264 docs -> keep sparser)
CROSS_TOP_K = 1        # memory <-> knowledge bridges
TRUNKS = 3             # highest-degree memories wired to the core
KNOW_CAP = 300         # hard cap on knowledge nodes (currently ~264)
WORKING_CAP = 14       # recent inbox files + runs
PREVIEW_CHARS = 1200   # embedded text / detail preview length

MODEL = "BAAI/bge-small-en-v1.5"


# ---------- small helpers ----------

def _fnv(s: str) -> float:
    h = 2166136261
    for c in s:
        h = ((h ^ ord(c)) * 16777619) & 0xFFFFFFFF
    return h / 0xFFFFFFFF


def freshness(mtime: float) -> float:
    age_days = max(0.0, (time.time() - mtime) / 86400)
    return max(0.15, 0.5 ** (age_days / 30))


def frontmatter(text: str) -> dict:
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n", text, re.S)
    out = {}
    if m:
        for line in m.group(1).splitlines():
            # leading whitespace allowed so nested keys (metadata: / type:) resolve;
            # a later nested `type:` deliberately wins over the empty parent line
            kv = re.match(r"^\s*([A-Za-z_-]+)\s*:\s*(.*)$", line)
            if kv and kv.group(2).strip():
                out[kv.group(1).strip().lower()] = kv.group(2).strip()
    return out


def read(p: Path, n: int = 200_000) -> str:
    return p.read_text(encoding="utf-8", errors="replace")[:n]


def body_of(text: str) -> str:
    return re.sub(r"^---\s*\n.*?\n---\s*\n", "", text, count=1, flags=re.S).strip()


# ---------- embeddings (incremental cache) ----------

def embed_corpus(items):
    """items: list of (id, text). Returns {id: unit vector}. Incremental via
    content-hash cache so a rebuild embeds only new/changed nodes."""
    import numpy as np
    want = {i: hashlib.sha1(t.encode("utf-8", "replace")).hexdigest() for i, t in items}
    cached_v, cached_h = {}, {}
    if EMB_CACHE.exists():
        z = np.load(EMB_CACHE, allow_pickle=True)
        ids, hs, vecs = list(z["ids"]), list(z["hashes"]), z["vecs"]
        for k, (i, h) in enumerate(zip(ids, hs)):
            cached_v[str(i)], cached_h[str(i)] = vecs[k], str(h)
    todo = [(i, t) for i, t in items if cached_h.get(i) != want[i]]
    if todo:
        from fastembed import TextEmbedding
        model = TextEmbedding(MODEL, cache_dir=str(FE_CACHE))
        new = list(model.embed([t for _, t in todo]))
        for (i, _), v in zip(todo, new):
            cached_v[i] = np.asarray(v, dtype=np.float32)
            cached_h[i] = want[i]
    keep = [i for i, _ in items]
    vecs = np.stack([cached_v[i] for i in keep]).astype(np.float32)
    vecs /= (np.linalg.norm(vecs, axis=1, keepdims=True) + 1e-9)
    np.savez_compressed(
        EMB_CACHE,
        ids=np.array(keep), hashes=np.array([want[i] for i in keep]), vecs=vecs)
    return {i: vecs[k] for k, i in enumerate(keep)}


def top_neighbors(mat, row_ids, col_ids, k, floor):
    """Yield (a, b, weight) for each row's top-k columns above floor."""
    import numpy as np
    for r, a in enumerate(row_ids):
        order = np.argsort(mat[r])[::-1]
        n = 0
        for c in order:
            if n >= k:
                break
            w = float(mat[r][c])
            if w < floor:
                break
            b = col_ids[int(c)]
            if b == a:
                continue
            yield a, b, w
            n += 1


# ---------- region builders (each isolated by the caller) ----------

def build_memory(nodes, edges, stats):
    if not MEMORY_DIR.is_dir():
        # a vanished store is an ERROR, not "zero memories" — never fail silent
        raise FileNotFoundError(f"memory dir missing: {MEMORY_DIR}")
    files = sorted(p for p in MEMORY_DIR.glob("*.md") if p.name != "MEMORY.md")
    for p in files:
        text = read(p)
        fm = frontmatter(text)
        mid = f"mem:{p.stem}"
        nodes.append({
            "id": mid, "type": "memory", "region": "memory",
            "label": fm.get("name", p.stem),
            "color": REGIONS["memory"]["color"], "size": 1.0,
            "freshness": round(freshness(p.stat().st_mtime), 3),
            "extra": {"mtype": fm.get("type", ""), "desc": fm.get("description", "")},
        })
    stats["memory_total"] = stats["memory_shown"] = len(files)
    return {f"mem:{p.stem}": p for p in files}


def build_knowledge(nodes, edges, stats):
    # reuse os_brain's own corpus definition so the map and the brain agree
    try:
        sys.path.insert(0, str(HERE))
        import os_brain
        docs = [Path(p) for p, _label in os_brain._docs()]
    except Exception:
        docs = list((ROOT / "ai-os").rglob("*.md"))   # honest fallback, ai-os tree only
    # Obsidian notes live in the memory web, not here — avoid double-placing them
    docs = [p for p in docs if OBSIDIAN is None or OBSIDIAN not in p.parents]
    paths = [p for p in docs[:KNOW_CAP] if p.is_file()]
    mapping = {}
    for p in paths:
        kid = "know:" + hashlib.sha1(str(p).encode()).hexdigest()[:12]
        mapping[kid] = p
        nodes.append({
            "id": kid, "type": "knowledge", "region": "knowledge",
            "label": p.stem[:48],
            "color": REGIONS["knowledge"]["color"], "size": 0.8,
            "freshness": round(freshness(p.stat().st_mtime), 3),
            "extra": {"path": str(p.relative_to(ROOT)) if str(p).startswith(str(ROOT)) else p.name},
        })
    stats["knowledge_total"] = len(docs)
    stats["knowledge_shown"] = len(paths)
    return mapping


def build_obsidian(nodes, edges, stats):
    """Second-brain notes join the memory web. Their [[wikilinks]] become
    explicit edges — human-made links, drawn as-is, no inference."""
    if OBSIDIAN is None or not OBSIDIAN.is_dir():
        raise FileNotFoundError(f"obsidian vault missing: {OBSIDIAN}")
    notes = [p for p in OBSIDIAN.rglob("*.md")
             if ".obsidian" not in p.parts and ".trash" not in p.parts]
    by_name = {}
    for p in notes:
        oid = "obs:" + hashlib.sha1(str(p).encode()).hexdigest()[:12]
        by_name[p.stem.lower()] = oid
        by_name["projects/paras ai 2.0/" + p.relative_to(OBSIDIAN).with_suffix("").as_posix().lower()] = oid
        folder = p.parent.name if p.parent != OBSIDIAN else ""
        nodes.append({
            "id": oid, "type": "obsidian", "region": "memory",
            "label": p.stem[:48], "color": "#C4B5FD", "size": 0.9,  # lighter violet
            "freshness": round(freshness(p.stat().st_mtime), 3),
            "extra": {"folder": folder},
        })
    seen = set()
    links = 0
    for p in notes:
        src = by_name[p.stem.lower()]
        for m in re.finditer(r"\[\[([^\]|#]+)", read(p, 50_000)):
            tgt = by_name.get(m.group(1).strip().lower())
            if not tgt or tgt == src:
                continue
            key = "|".join(sorted((src, tgt)))
            if key in seen:
                continue
            seen.add(key)
            edges.append({"source": src, "target": tgt, "kind": "wikilink", "weight": 1.0})
            links += 1
    stats["obsidian"] = {"notes": len(notes), "wikilinks": links}
    return {("obs:" + hashlib.sha1(str(p).encode()).hexdigest()[:12]): p for p in notes}


def build_agents(nodes, edges, stats):
    files = sorted(AGENTS_DIR.glob("*.md"))
    for p in files:
        fm = frontmatter(read(p, 4000))
        aid = f"agent:{p.stem}"
        nodes.append({
            "id": aid, "type": "agent", "region": "agents",
            "label": fm.get("name", p.stem),
            "color": REGIONS["agents"]["color"], "size": 1.9, "freshness": 0.8,
            "extra": {"specialty": (fm.get("description", "") or "")[:140]},
        })
        edges.append({"source": "core", "target": aid, "kind": "dispatch", "weight": 1.0})
        tools = [t.strip() for t in re.split(r"[,\s]+", fm.get("tools", "")) if t.strip()]
        for t in tools[:8]:  # moons; cap so a '*' agent doesn't sprout 50
            tid = f"tool:{p.stem}.{t}"
            nodes.append({
                "id": tid, "type": "agent-tool", "region": "agents",
                "label": t, "color": REGIONS["agents"]["color"], "size": 0.45,
                "freshness": 0.6, "extra": {"host": aid},
            })
            edges.append({"source": aid, "target": tid, "kind": "moon", "weight": 0.6})
    stats["agents"] = len(files)


def build_rim(nodes, edges, stats):
    count = 0
    cats = {}
    for skill_root in [SKILLS_DIR, ROOT / ".agents" / "skills"]:
        if not skill_root.is_dir():
            continue
        for d in sorted(skill_root.iterdir()):
            if not d.is_dir() or not (d / "SKILL.md").is_file():
                continue
            cat = d.name.split("-")[0] if "-" in d.name else "misc"
            cats.setdefault(cat, []).append(("skill:" + d.name, d.name))
    if VOICE_REG.is_file():
        reg = json.loads(read(VOICE_REG))
        cmds = reg if isinstance(reg, list) else reg.get("commands", [])
        for c in cmds:
            cats.setdefault("voice", []).append(("voice:" + c["id"], c["id"]))
    for cat, members in cats.items():
        cid = f"toolcat:{cat}"
        nodes.append({
            "id": cid, "type": "tool-category", "region": "rim",
            "label": cat, "color": REGIONS["rim"]["color"], "size": 1.1,
            "freshness": 0.7, "extra": {"count": len(members)},
        })
        edges.append({"source": "core", "target": cid, "kind": "capability", "weight": 1.0})
        for tid, label in members:
            nodes.append({
                "id": tid, "type": "tool", "region": "rim",
                "label": label, "color": REGIONS["rim"]["color"], "size": 0.5,
                "freshness": 0.7, "extra": {"category": cat},
            })
            edges.append({"source": cid, "target": tid, "kind": "member", "weight": 0.5})
            count += 1
    stats["tools"] = count


def build_working(nodes, edges, stats):
    items = []
    if INBOX_DIR.is_dir():
        files = sorted(INBOX_DIR.glob("*-*.md"), key=lambda p: p.stat().st_mtime, reverse=True)
        items += [("thread:inbox." + p.stem, p.stem, p.stat().st_mtime) for p in files[:WORKING_CAP - 4]]
    if RUNS_FILE.is_file():
        lines = [l for l in read(RUNS_FILE).splitlines() if l.strip()][-4:]
        for k, l in enumerate(lines):
            try:
                r = json.loads(l)
                items.append((f"thread:run.{k}", f"{r.get('agent')}: {r.get('summary','')[:40]}",
                              time.time()))
            except Exception:
                pass
    for tid, label, mt in items:
        nodes.append({
            "id": tid, "type": "thread", "region": "working",
            "label": label[:52], "color": REGIONS["working"]["color"], "size": 0.7,
            "freshness": round(freshness(mt), 3), "extra": {},
        })
        edges.append({"source": tid, "target": "core", "kind": "attention", "weight": 0.5})
    stats["working"] = len(items)


def build_similarity(nodes, edges, stats, mem_map, know_map, obs_map):
    import numpy as np
    texts = []
    for mid, p in mem_map.items():
        texts.append((mid, body_of(read(p, PREVIEW_CHARS))))
    for kid, p in know_map.items():
        texts.append((kid, p.stem + "\n" + body_of(read(p, PREVIEW_CHARS))))
    for oid, p in obs_map.items():
        texts.append((oid, p.stem + "\n" + body_of(read(p, PREVIEW_CHARS))))
    if not texts:
        stats["similarity"] = "empty"
        return
    vec = embed_corpus(texts)
    ids = [i for i, _ in texts]
    V = np.stack([vec[i] for i in ids])
    sim = V @ V.T
    np.fill_diagonal(sim, -1.0)
    tri = sim[np.triu_indices_from(sim, 1)]
    floor = float(tri.mean() + 0.5 * tri.std())      # calibrated, not the paper 0.35
    mem_ids = [i for i in ids if i.startswith("mem:")]
    know_ids = [i for i in ids if i.startswith("know:")]
    obs_ids = [i for i in ids if i.startswith("obs:")]
    index = {i: k for k, i in enumerate(ids)}

    seen, degree = set(), {}
    def add(a, b, w, kind):
        key = "|".join(sorted((a, b)))
        if key in seen:
            return
        seen.add(key)
        edges.append({"source": a, "target": b, "kind": kind, "weight": round(w, 3)})
        degree[a] = degree.get(a, 0) + 1
        degree[b] = degree.get(b, 0) + 1

    def block(rows, cols, k, kind):
        if not rows or not cols:
            return
        M = sim[np.ix_([index[r] for r in rows], [index[c] for c in cols])]
        for a, b, w in top_neighbors(M, rows, cols, k, floor):
            add(a, b, w, kind)

    block(mem_ids, mem_ids, SIM_TOP_K, "sim")
    block(know_ids, know_ids, KNOW_TOP_K, "sim-know")
    block(mem_ids, know_ids, CROSS_TOP_K, "sim-cross")
    # obsidian: wikilinks already wire obs-obs (explicit, human-made) — similarity
    # only bridges obs notes to memories, top-1, so the two webs interweave
    block(obs_ids, mem_ids, CROSS_TOP_K, "sim-cross")

    # degree -> size; top-degree memories get recall trunks (pad with freshest)
    by_id = {n["id"]: n for n in nodes}
    for i, d in degree.items():
        if i in by_id:
            by_id[i]["size"] = round(min(2.2, by_id[i]["size"] + 0.28 * d), 2)
    ranked = sorted(mem_ids, key=lambda i: degree.get(i, 0), reverse=True)
    trunks = ranked[:TRUNKS]
    if len(trunks) < TRUNKS:
        fresh = sorted(mem_ids, key=lambda i: by_id[i]["freshness"], reverse=True)
        trunks += [i for i in fresh if i not in trunks][:TRUNKS - len(trunks)]
    for t in trunks:
        edges.append({"source": t, "target": "core", "kind": "recall", "weight": 1.0})
    stats["similarity"] = "semantic"
    stats["tuning"] = {"model": MODEL, "floor": round(floor, 3),
                       "top_k": [SIM_TOP_K, KNOW_TOP_K, CROSS_TOP_K]}


# ---------- assembly ----------

def assemble():
    nodes = [{
        "id": "core", "type": "core", "region": "core", "label": "Paras AI 2.0",
        "color": REGIONS["core"]["color"], "size": 3.2, "freshness": 1.0,
        "extra": {"rings": ["CLAUDE.md constitution", "MEMORY.md index"]},
    }]
    edges, stats = [], {"sources": {}}
    mem_map, know_map, obs_map = {}, {}, {}
    for name, fn in (("memory", build_memory), ("knowledge", build_knowledge),
                     ("obsidian", build_obsidian), ("agents", build_agents),
                     ("rim", build_rim), ("working", build_working)):
        try:
            r = fn(nodes, edges, stats)
            if name == "memory":
                mem_map = r or {}
            if name == "knowledge":
                know_map = r or {}
            if name == "obsidian":
                obs_map = r or {}
            stats["sources"][name] = "ok"
        except Exception as e:
            stats["sources"][name] = "error"
            stats[name + "_error"] = str(e)[:160]
    try:
        build_similarity(nodes, edges, stats, mem_map, know_map, obs_map)
        stats["sources"]["similarity"] = "ok"
    except Exception as e:
        stats["sources"]["similarity"] = "error"
        stats["similarity_error"] = str(e)[:160]

    MANIFEST.write_text(json.dumps(
        {i: str(p) for i, p in {**mem_map, **know_map, **obs_map}.items()}),
        encoding="utf-8")
    return {"regions": [dict(id=k, **v) for k, v in REGIONS.items()],
            "nodes": nodes, "edges": edges, "stats": stats}


def detail(node_id: str):
    if node_id == "core":
        return {"id": "core", "type": "core", "label": "Paras AI 2.0",
                "body": read(ROOT / "CLAUDE.md", PREVIEW_CHARS)}
    if not MANIFEST.is_file():
        return None
    man = json.loads(read(MANIFEST))
    kind = node_id.split(":", 1)[0]
    if kind in ("mem", "know", "obs"):
        p = man.get(node_id)
        if not p or not Path(p).is_file():
            return None                     # manifest only — no traversal
        text = read(Path(p), 20_000)
        fm = frontmatter(text)
        out = {"id": node_id, "type": "memory" if kind == "mem" else "knowledge",
               "label": fm.get("name", Path(p).stem), "mtype": fm.get("type", ""),
               "source": str(Path(p)), "modified": time.strftime(
                   "%Y-%m-%d %H:%M", time.localtime(Path(p).stat().st_mtime)),
               "body": body_of(text)[:6000]}
        try:  # live nearest-neighbor query — what makes the inspector feel alive
            import numpy as np
            z = np.load(EMB_CACHE, allow_pickle=True)
            ids = [str(i) for i in z["ids"]]
            if node_id in ids:
                V = z["vecs"]
                V = V / (np.linalg.norm(V, axis=1, keepdims=True) + 1e-9)
                q = V[ids.index(node_id)]
                simv = V @ q
                order = simv.argsort()[::-1]
                out["neighbors"] = [
                    {"id": ids[int(k)], "weight": round(float(simv[int(k)]), 3)}
                    for k in order if ids[int(k)] != node_id][:5]
        except Exception:
            pass
        return out
    if kind == "agent":
        p = AGENTS_DIR / (node_id.split(":", 1)[1] + ".md")
        if not p.is_file():
            return None
        fm = frontmatter(read(p, 6000))
        return {"id": node_id, "type": "agent", "label": fm.get("name", p.stem),
                "specialty": fm.get("description", ""), "tools": fm.get("tools", ""),
                "body": body_of(read(p, 4000))[:3000]}
    return None


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "build"
    if cmd == "build":
        print(json.dumps(assemble()))
    elif cmd == "node" and len(sys.argv) > 2:
        d = detail(sys.argv[2])
        if d is None:
            print(json.dumps({"error": "not found"}))
            sys.exit(4)
        print(json.dumps(d))
    else:
        sys.exit("usage: mind_map.py build | node <id>")
