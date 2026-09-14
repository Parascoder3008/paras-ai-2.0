#!/usr/bin/env python3
"""OS Brain — one shared knowledge layer + one shared run log for every agent.

Borrowed discipline (FounderOS, MIT), adapted:
  * Markdown is the source of truth (ai-os/, .claude/agents/, memory/, Obsidian).
  * Retrieval is grep-first so it ALWAYS works with zero infrastructure.
    Embeddings can be layered on later without changing this interface.
  * Every agent queries the SAME store, so the OS has one memory, not 28.
  * Every agent run is logged, so autonomy is observable.

Usage:
    python os_brain.py search "dead lead reactivation"      # hybrid-ish search
    python os_brain.py search "DFY price" --json
    python os_brain.py log <agent> <status> "<summary>"     # record a run
    python os_brain.py runs [n]                             # recent runs
    python os_brain.py stats                                # corpus + run stats
"""
import json, os, re, sys, glob, datetime

# Portable: AIOS_ROOT wins (set it in Docker/VPS), else the repo root two levels up,
# else the Windows dev path. Missing dirs are skipped, so the same file runs everywhere.
ROOT = os.environ.get("AIOS_ROOT") or os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
VAULT = os.environ.get("OBSIDIAN_VAULT_PATH", "")
MEMORY = os.environ.get("AIOS_MEMORY", os.path.join(ROOT, "memory"))
RUN_LOG = os.environ.get("AIOS_RUN_LOG") or os.path.join(ROOT, "ai-os", "agent-runs.jsonl")

SOURCES = [
    (os.path.join(ROOT, "ai-os"), "ai-os"),
    (os.path.join(ROOT, ".claude", "agents"), "agents"),
    (os.path.join(ROOT, ".claude", "skills"), "skills"),
    (os.path.join(ROOT, ".agents", "skills"), "skills"),
    (MEMORY, "memory"),
    (os.path.join(VAULT, "projects", "Paras AI 2.0") if VAULT else "", "obsidian"),
    (ROOT, "root"),
]
STOP = {"the","a","an","and","or","of","to","in","is","it","for","on","with","that","this","my","i"}

# Vendored third-party text. ai-os/references/ alone holds ~1243 of the ~1301
# markdown files under ai-os/ (95.5%), so without this the brain answers a
# question about Paras's business out of somebody else's README. These are
# reference material to read deliberately, never corpus to search by default.
EXCLUDE_DIRS = (".git", "node_modules", "__pycache__", "archive", "private", "inbox", "references", "assets", "templates", "vault-template", "ec-system", "seo-audits", "audits")


def _docs():
    seen = set()
    for base, label in SOURCES:
        if not os.path.isdir(base):
            continue
        pattern = os.path.join(base, "*.md") if label == "root" else os.path.join(base, "**", "*.md")
        for path in glob.glob(pattern, recursive=(label != "root")):
            rp = os.path.realpath(path)
            if rp in seen or os.path.islink(path) or any(os.path.sep + d + os.path.sep in rp + os.path.sep for d in EXCLUDE_DIRS):
                continue
            if label == "ai-os" and os.path.dirname(path) == base and os.path.basename(path) not in {
                "README.md", "CURRENT-PLAN.md", "VISION.md", "OS-STRUCTURE.md", "CAPABILITIES.md", "agent-context.md", "brand-guidelines.md", "course-and-mentorship-offer.md"
            }:
                continue
            seen.add(rp)
            yield path, label


def search(query, limit=8):
    """Score = term frequency + title hit bonus + phrase-match bonus.
    Crude but honest, and it never depends on a service being up."""
    terms = [t for t in re.findall(r"[a-z0-9]+", query.lower()) if t not in STOP and len(t) > 2]
    phrase = query.lower().strip()
    hits = []
    for path, label in _docs():
        try:
            text = open(path, encoding="utf-8", errors="ignore").read()
        except Exception:
            continue
        low = text.lower()
        name = os.path.basename(path).lower()
        score = sum(low.count(t) for t in terms)
        score += sum(6 for t in terms if t in name)         # title hits weigh more
        if name in {"current-plan.md", "vision.md", "decisions.md", "last-session.md"}:
            score += 10 if score else 0
        if phrase and phrase in low:
            score += 25                                      # exact phrase = strong signal
        if not score:
            continue
        # best matching line for a human-readable snippet
        best, bl = "", 0
        for line in text.splitlines():
            ll = line.lower()
            s = sum(ll.count(t) for t in terms)
            if s > bl and len(line.strip()) > 25:
                bl, best = s, line.strip()
        hits.append({"path": path.replace("\\", "/"), "source": label, "score": score,
                     "snippet": (best or text.strip().splitlines()[0] if text.strip() else "")[:220]})
    hits.sort(key=lambda h: -h["score"])
    return hits[:limit]


def log_run(agent, status, summary):
    rec = {"ts": datetime.datetime.now().isoformat(timespec="seconds"),
           "agent": agent, "status": status, "summary": summary[:400]}
    os.makedirs(os.path.dirname(RUN_LOG), exist_ok=True)
    with open(RUN_LOG, "a", encoding="utf-8") as f:
        f.write(json.dumps(rec) + "\n")
    return rec


def runs(n=20):
    if not os.path.exists(RUN_LOG):
        return []
    out = []
    for line in open(RUN_LOG, encoding="utf-8"):
        try:
            out.append(json.loads(line))
        except Exception:
            pass
    return out[-n:][::-1]


def stats():
    docs = list(_docs())
    by = {}
    words = 0
    for p, label in docs:
        by[label] = by.get(label, 0) + 1
        try:
            words += len(open(p, encoding="utf-8", errors="ignore").read().split())
        except Exception:
            pass
    r = runs(10000)
    return {"documents": len(docs), "by_source": by, "words": words,
            "runs_logged": len(r), "last_run": r[0] if r else None}


# The six scheduled routines, keyed by the inbox filename suffix each one writes.
# Kept here rather than in the dashboard so the deck panel and the voice command
# read one definition — a staleness rule with two homes drifts into two answers.
ROUTINES = [
    ("daily-business-pulse",    "pulse",         "07:43 daily",  1),
    ("os-learning-scout",       "scout",         "08:10 daily",  1),
    ("daily-ai-job-hunt",       "jobs",          "09:08 daily",  1),
    ("daily-distribution-task", "distribution",  "09:37 daily",  1),
    ("ewai-friday-review",      "friday-review", "09:09 Friday", 7),
]


def routine_health(today=None):
    """What each routine last wrote and how long ago — the thing no surface showed.

    A routine going dark used to be invisible: nothing on any dashboard read
    ai-os/inbox/, so pulse could stop for 19 days and the only trace was a line
    of prose inside a scout file nobody opened. Status is deliberately blunt:
    a routine that has never written once is 'never', not 'stale'.
    """
    import datetime as _dt
    inbox = os.path.join(ROOT, "ai-os", "inbox")
    today = today or _dt.date.today()
    out = []
    for name, suffix, schedule, grace in ROUTINES:
        newest, newest_date = None, None
        for path in glob.glob(os.path.join(inbox, f"*-{suffix}.md")):
            stem = os.path.basename(path)[:10]
            try:
                d = _dt.date.fromisoformat(stem)
            except ValueError:
                continue
            if newest_date is None or d > newest_date:
                newest, newest_date = path, d
        if newest_date is None:
            out.append({"routine": name, "schedule": schedule, "last": None,
                        "days": None, "status": "never",
                        "note": "has never written a file"})
            continue
        days = (today - newest_date).days
        status = "ok" if days <= grace else ("late" if days <= grace * 3 else "dark")
        out.append({"routine": name, "schedule": schedule,
                    "last": newest_date.isoformat(), "days": days, "status": status,
                    "file": os.path.relpath(newest, ROOT).replace("\\", "/"),
                    "note": f"last wrote {days}d ago" if days else "wrote today"})
    order = {"never": 0, "dark": 1, "late": 2, "ok": 3}
    out.sort(key=lambda r: (order[r["status"]], -(r["days"] or 9999)))
    healthy = sum(1 for r in out if r["status"] == "ok")
    return {"routines": out, "total": len(out), "healthy": healthy,
            "unhealthy": len(out) - healthy, "as_of": today.isoformat()}


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "stats"
    as_json = "--json" in sys.argv
    if cmd == "search":
        q = sys.argv[2] if len(sys.argv) > 2 else ""
        res = search(q)
        if as_json:
            print(json.dumps(res, indent=1))
        else:
            print(f"query: {q!r} - {len(res)} hits\n" + "-" * 78)
            for h in res:
                print(f"[{h['score']:>4}] {h['source']:9} {h['path'].split('/')[-1]}")
                print(f"        {h['snippet']}")
    elif cmd == "log":
        print(json.dumps(log_run(sys.argv[2], sys.argv[3], " ".join(sys.argv[4:])), indent=1))
    elif cmd == "routines":
        h = routine_health()
        if as_json:
            print(json.dumps(h, indent=1))
        else:
            print(f"{'ROUTINE':26} {'SCHEDULE':14} {'LAST':12} STATUS")
            print("-" * 70)
            for r in h["routines"]:
                print(f"{r['routine']:26} {r['schedule']:14} {(r['last'] or '-'):12} "
                      f"{r['status'].upper():6} {r['note']}")
            print(f"\n{h['healthy']}/{h['total']} healthy as of {h['as_of']}")
    elif cmd == "runs":
        n = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2].isdigit() else 20
        r = runs(n)
        if as_json:
            print(json.dumps(r, indent=1))
        else:
            print(f"{'WHEN':20} {'AGENT':24} {'STATUS':10} SUMMARY")
            print("-" * 90)
            for x in r:
                print(f"{x['ts']:20} {x['agent'][:24]:24} {x['status'][:10]:10} {x['summary'][:40]}")
            if not r:
                print("(no runs logged yet)")
    else:
        s = stats()
        print(json.dumps(s, indent=1) if as_json else
              f"documents: {s['documents']}  words: {s['words']:,}\nby source: {s['by_source']}\n"
              f"runs logged: {s['runs_logged']}")
