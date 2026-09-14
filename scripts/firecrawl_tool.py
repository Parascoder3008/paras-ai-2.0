#!/usr/bin/env python3
"""Small, local Firecrawl v2 client for the AIOS workspace.

Run through the workspace environment:
    uv run python scripts/firecrawl_tool.py scrape "https://example.com"
    uv run python scripts/firecrawl_tool.py search "customer onboarding software"
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Any

import requests

from utils.config import get_env

BASE_URL = "https://api.firecrawl.dev/v2"


class FirecrawlError(RuntimeError):
    """A plain-English Firecrawl failure that is safe to show the founder."""


class FirecrawlClient:
    def __init__(self, api_key: str | None = None, timeout: int = 60):
        self.api_key = api_key or get_env("FIRECRAWL_API_KEY")
        self.timeout = timeout
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def _request(
        self, method: str, path: str, *, payload: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        try:
            response = requests.request(
                method,
                f"{BASE_URL}{path}",
                headers=self.headers,
                json=payload,
                timeout=self.timeout,
            )
            response.raise_for_status()
            data = response.json()
        except requests.RequestException as exc:
            detail = ""
            if getattr(exc, "response", None) is not None:
                try:
                    detail = exc.response.json().get("error", "")
                except (ValueError, AttributeError):
                    detail = exc.response.text[:240]
            raise FirecrawlError(detail or str(exc)) from exc
        except ValueError as exc:
            raise FirecrawlError("Firecrawl returned a response that was not JSON.") from exc
        if data.get("success") is False:
            raise FirecrawlError(data.get("error") or "Firecrawl did not complete the request.")
        return data

    def credit_usage(self) -> dict[str, Any]:
        return self._request("GET", "/team/credit-usage")

    def scrape(self, url: str) -> dict[str, Any]:
        return self._request(
            "POST", "/scrape", payload={"url": url, "formats": ["markdown"]}
        )

    def search(self, query: str, limit: int = 5) -> dict[str, Any]:
        return self._request(
            "POST",
            "/search",
            payload={
                "query": query,
                "limit": limit,
                "scrapeOptions": {"formats": ["markdown"]},
            },
        )

    def map(self, url: str, limit: int = 100) -> dict[str, Any]:
        return self._request("POST", "/map", payload={"url": url, "limit": limit})

    def crawl(
        self, url: str, limit: int = 20, poll_seconds: int = 3, max_wait: int = 180
    ) -> dict[str, Any]:
        started = self._request(
            "POST",
            "/crawl",
            payload={
                "url": url,
                "limit": limit,
                "scrapeOptions": {"formats": ["markdown"]},
            },
        )
        job_id = started.get("id")
        if not job_id:
            raise FirecrawlError("Firecrawl did not return a crawl job ID.")
        deadline = time.monotonic() + max_wait
        while time.monotonic() < deadline:
            status = self._request("GET", f"/crawl/{job_id}")
            if status.get("status") == "completed":
                return status
            if status.get("status") in {"failed", "cancelled"}:
                raise FirecrawlError(status.get("error") or f"Crawl {status.get('status')}.")
            time.sleep(poll_seconds)
        raise FirecrawlError(f"Crawl is still running after {max_wait} seconds. Job: {job_id}")


def _write(value: str, output: str | None) -> None:
    if output:
        Path(output).parent.mkdir(parents=True, exist_ok=True)
        Path(output).write_text(value, encoding="utf-8")
        print(f"Saved {output}")
    else:
        print(value)


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("status", help="Show current Firecrawl credit usage")

    scrape = commands.add_parser("scrape", help="Turn one URL into Markdown")
    scrape.add_argument("url")
    scrape.add_argument("-o", "--output")
    scrape.add_argument("--json", action="store_true", help="Keep the full JSON response")

    search = commands.add_parser("search", help="Search and scrape the top results")
    search.add_argument("query")
    search.add_argument("--limit", type=int, default=5)
    search.add_argument("-o", "--output")

    map_command = commands.add_parser("map", help="List URLs found on a site")
    map_command.add_argument("url")
    map_command.add_argument("--limit", type=int, default=100)
    map_command.add_argument("-o", "--output")

    crawl = commands.add_parser("crawl", help="Scrape a small site section")
    crawl.add_argument("url")
    crawl.add_argument("--limit", type=int, default=20)
    crawl.add_argument("--max-wait", type=int, default=180)
    crawl.add_argument("-o", "--output")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    try:
        client = FirecrawlClient()
        if args.command == "status":
            result = client.credit_usage()
            _write(json.dumps(result, indent=2), None)
        elif args.command == "scrape":
            result = client.scrape(args.url)
            if args.json:
                rendered = json.dumps(result, indent=2)
            else:
                rendered = result.get("data", {}).get("markdown", "")
                if not rendered:
                    raise FirecrawlError("The page returned no Markdown.")
            _write(rendered, args.output)
        elif args.command == "search":
            result = client.search(args.query, args.limit)
            _write(json.dumps(result, indent=2), args.output)
        elif args.command == "map":
            result = client.map(args.url, args.limit)
            _write(json.dumps(result, indent=2), args.output)
        else:
            result = client.crawl(args.url, args.limit, max_wait=args.max_wait)
            _write(json.dumps(result, indent=2), args.output)
        return 0
    except (FirecrawlError, RuntimeError) as exc:
        print(f"Firecrawl: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
