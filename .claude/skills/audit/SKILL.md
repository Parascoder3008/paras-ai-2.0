---
name: audit
description: Audit the structure, memory, agent and skill registries, commands, connections and operational evidence of Paras AI 2.0. Use for an AIOS audit or setup health check. Diagnose by default; apply cleanup when the user asks for it.
---

# Workspace audit

Resolve the project from the current workspace, never a hardcoded machine path. Read AGENTS.md, CLAUDE.md, MEMORY.md, ai-os/README.md and the relevant current plan. The current user's cleanup authorization includes local repairs; don't add a second approval gate for them.

Run `node scripts/audit-workspace.cjs`. It inventories every role and skill entrypoint, checks manifest references, shared context, stale paths, broad Git instructions and core memory files. Use `--write` when an audit report is requested. Inspect the reported files and any relevant executable paths; metadata alone doesn't certify behavior.

Assess four areas with evidence: context consistency, connection freshness, usable capabilities, and actual cadence. Report findings and limits instead of inferring autonomy from file counts or skill names. A schedule description or hook is not a verified running scheduler. An old receipt isn't a fresh connection test.

Keep current status and historical reference separate. Validate changes with the relevant tests in AGENTS.md. Preserve originals before broad document replacement. Don't remove useful roles merely to reduce a count. Don't spawn subagents unless Paras explicitly asks for delegation.

Secret checks report file paths and line numbers only, never credential values. Use the release allowlist for a new repository; exclude local settings, raw memory, customer data, caches and other projects. GitHub pushes and Obsidian writes follow the user's actual scope and the applicable tool permissions.
