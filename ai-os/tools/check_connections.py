#!/usr/bin/env python3
"""Honest connection status for the AI OS.

Borrowed discipline (FounderOS, MIT): a connector NEVER reports a fake green light.
Every integration returns exactly one of:
    connected        - verified with a real authenticated call
    not_configured   - no credential present
    error            - credential present but the call failed (with the reason)

Run:  python ai-os/tools/check_connections.py           (human table)
      python ai-os/tools/check_connections.py --json    (machine/dashboard)
Never prints secret values - only whether they exist and whether they work.
"""
import json, os, sys, urllib.request, urllib.error

TIMEOUT = 12
CONNECTED, NOT_CONFIGURED, ERROR = "connected", "not_configured", "error"


def _get(url, headers, method="GET", data=None):
    # A real User-Agent is required: some APIs (GHL behind Cloudflare) 403 the
    # default Python-urllib UA, which would report a false "error" on a healthy link.
    headers = {"User-Agent": "AI-OS-ConnectionCheck/1.0", **headers}
    req = urllib.request.Request(url, headers=headers, method=method, data=data)
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return r.status, r.read(400)


def _result(name, group, status, detail):
    return {"name": name, "group": group, "status": status, "detail": detail}


def check_ghl():
    key = os.environ.get("GHL_API_KEY")
    loc = os.environ.get("GHL_LOCATION_ID")
    if not key or not loc:
        return _result("GoHighLevel", "crm", NOT_CONFIGURED, "GHL_API_KEY / GHL_LOCATION_ID not set")
    try:
        code, _ = _get(
            f"https://services.leadconnectorhq.com/contacts/?locationId={loc}&limit=1",
            {"Authorization": f"Bearer {key}", "Version": "2021-07-28", "Accept": "application/json"},
        )
        return _result("GoHighLevel", "crm", CONNECTED, f"HTTP {code} - contacts readable")
    except urllib.error.HTTPError as e:
        return _result("GoHighLevel", "crm", ERROR, f"HTTP {e.code} - token rejected or scope missing")
    except Exception as e:
        return _result("GoHighLevel", "crm", ERROR, str(e)[:120])


def check_n8n():
    """Deliberately hits the AUTHENTICATED endpoint, not /healthz.
    /healthz answers without a key, which is exactly how a placeholder key
    looked 'connected' while every real call 401'd."""
    url = os.environ.get("N8N_API_URL")
    key = os.environ.get("N8N_API_KEY")
    if not url or not key:
        # fall back to the project .mcp.json (where the key actually lives)
        try:
            root = os.environ.get("AIOS_ROOT") or os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
            with open(os.path.join(root, ".mcp.json"), encoding="utf-8-sig") as handle:
                cfg = json.load(handle)
            env = cfg["mcpServers"]["n8n-mcp"]["env"]
            url, key = url or env.get("N8N_API_URL"), key or env.get("N8N_API_KEY")
        except Exception:
            pass
    if not url or not key:
        return _result("n8n", "automation", NOT_CONFIGURED, "N8N_API_URL / N8N_API_KEY not set")
    if "PASTE" in key or len(key) < 40:
        return _result("n8n", "automation", NOT_CONFIGURED, "key looks like a placeholder")
    try:
        code, _ = _get(f"{url.rstrip('/')}/api/v1/workflows?limit=1", {"X-N8N-API-KEY": key})
        return _result("n8n", "automation", CONNECTED, f"HTTP {code} - workflows readable")
    except urllib.error.HTTPError as e:
        return _result("n8n", "automation", ERROR, f"HTTP {e.code} - API key rejected")
    except Exception as e:
        return _result("n8n", "automation", ERROR, str(e)[:120])


def check_aisensy():
    key = os.environ.get("AISENSY_API_KEY")
    if not key:
        return _result("AiSensy (WhatsApp)", "messaging", NOT_CONFIGURED, "AISENSY_API_KEY not set")
    # No safe unauthenticated read endpoint, and we never fire a send to test.
    return _result("AiSensy (WhatsApp)", "messaging", ERROR,
                   "key present, UNVERIFIED - no read-only probe; session-send endpoint still unconfirmed")


def check_apify():
    key = os.environ.get("APIFY_API_TOKEN")
    if not key:
        return _result("Apify (scraping)", "research", NOT_CONFIGURED, "APIFY_API_TOKEN not set")
    try:
        code, _ = _get(f"https://api.apify.com/v2/users/me?token={key}", {})
        return _result("Apify (scraping)", "research", CONNECTED, f"HTTP {code} - account readable")
    except urllib.error.HTTPError as e:
        return _result("Apify (scraping)", "research", ERROR, f"HTTP {e.code}")
    except Exception as e:
        return _result("Apify (scraping)", "research", ERROR, str(e)[:120])


def check_anthropic():
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        return _result("Anthropic API", "llm", NOT_CONFIGURED, "ANTHROPIC_API_KEY not set (dashboard needs it)")
    return _result("Anthropic API", "llm", ERROR, "key present, UNVERIFIED - no authenticated model availability check performed")


def check_local(name, group, path, detail_ok):
    return _result(name, group, CONNECTED if os.path.exists(path) else NOT_CONFIGURED,
                   detail_ok if os.path.exists(path) else f"missing: {path}")


def run_all():
    # Portable root: AIOS_ROOT (Docker/VPS) → repo root → Windows dev path.
    root = os.environ.get("AIOS_ROOT") or os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    if not os.path.isdir(os.path.join(root, "ai-os")):
        root = "D:/Claude code"
    vault = os.environ.get("OBSIDIAN_VAULT_PATH", "C:/Users/PARAS ARORA/Documents/Obsidian Vault")
    return [
        check_ghl(),
        check_n8n(),
        check_aisensy(),
        check_apify(),
        check_anthropic(),
        check_local("Obsidian vault", "knowledge", vault, "vault reachable"),
        check_local("Remotion engine", "content", os.path.join(root, "video-engine", "package.json"),
                    "video-engine present"),
        check_local("Agent roster", "agents", os.path.join(root, ".claude", "agents"), "agents dir present"),
    ]


if __name__ == "__main__":
    res = run_all()
    if "--json" in sys.argv:
        print(json.dumps(res, indent=1))
    else:
        mark = {CONNECTED: "[ OK ]", NOT_CONFIGURED: "[ -- ]", ERROR: "[FAIL]"}
        print(f"{'STATUS':8} {'INTEGRATION':22} DETAIL")
        print("-" * 78)
        for r in res:
            print(f"{mark[r['status']]:8} {r['name']:22} {r['detail']}")
        bad = [r for r in res if r["status"] == ERROR]
        print("-" * 78)
        print(f"{sum(1 for r in res if r['status']==CONNECTED)} connected, "
              f"{sum(1 for r in res if r['status']==NOT_CONFIGURED)} not configured, {len(bad)} error")
        sys.exit(1 if bad else 0)
