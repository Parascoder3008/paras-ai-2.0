#!/usr/bin/env python3
"""Verify a research account without printing its secret."""

from __future__ import annotations

import argparse
import json
import sys

from firecrawl_tool import FirecrawlClient
from utils.supadata import SupadataClient


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("service", choices=("firecrawl", "supadata"))
    args = parser.parse_args()
    try:
        if args.service == "firecrawl":
            data = FirecrawlClient().credit_usage()
            print("Firecrawl ready")
        else:
            data = SupadataClient().me()
            print("Supadata ready")
        safe = {
            key: value
            for key, value in data.items()
            if key.lower() not in {"key", "api_key", "apikey", "token"}
        }
        print(json.dumps(safe, indent=2)[:2000])
        return 0
    except Exception as exc:
        print(f"{args.service.title()}: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
