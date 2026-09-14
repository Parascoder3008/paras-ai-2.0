---
name: n8n-workflow-builder-team
description: Orchestrate an agent team to build complex n8n workflows. Use when a workflow needs 5+ nodes, multi-branch logic, AI agents, error handling, or multiple integrations. Spawns a coordinated team (Architect, Researcher, Validator) that researches nodes, builds iteratively, and validates. NOT for simple 2-4 node workflows (build those directly with the n8n MCP tools).
---

# n8n Workflow Builder Team

Orchestrate specialized agents to build complex n8n workflows faster and more reliably. Uses the **n8n-mcp** tools (Paras's Hostinger instance `n8n.srv981435.hstgr.cloud`).

## When to use
USE the team when: 5+ nodes · multiple integrations · AI-agent workflows · multi-branch logic · error handling · a described business process · needs template research.
DO NOT use when: simple trigger + 1-3 actions · deploying an existing template · modifying an existing workflow · exact node specs given.

## Team structure (3 agents, all `general-purpose`)

### 1. Architect (team lead)
Designs structure, coordinates, assembles the workflow.
- Analyze requirements → identify pattern (Webhook, HTTP API, Database, AI Agent, Scheduled).
- Decompose into node groups + data flow; create the task list.
- Build via `n8n_create_workflow`; iterate via `n8n_update_partial_workflow` (always include `intent`); verify with `n8n_get_workflow`, `n8n_health_check`.
- Rules: `n8n-nodes-base.*` prefix in create/update; `nodes-base.*` when asking the Researcher; build iteratively (not one-shot); validate before activating.

### 2. Researcher
Discovers nodes, configs, template examples.
- `search_nodes` (mode OR/AND) · `get_node` (detail=standard; mode=search_properties; includeExamples=true) · `search_templates` · `get_template`.
- Report to Architect: exact nodeType (both formats), required params + types, defaults, correct `typeVersion` (check versionNotice), template examples, showWhen dependencies.
- Rules: `nodes-base.*` prefix; research multiple nodes in parallel.

### 3. Validator
Validates integrity, finds errors, suggests fixes.
- `validate_node` (profile=runtime/strict) · `n8n_validate_workflow` · `n8n_autofix_workflow` · `n8n_test_workflow`.
- Report all errors with severity + fix instructions; validate after every significant change; confirm when clean.

## Flow
User request → Architect analyzes/identifies pattern → Researcher (parallel node research) → Architect designs + creates workflow → Validator validates → Architect iterates → Validator re-validates → Architect activates → return workflow URL.

## Spawning the team
`TeamCreate({team_name:"n8n-builder", description:"[requirement]"})`, then a `Task({subagent_type:"general-purpose", team_name:"n8n-builder", prompt:"[role instructions]"})` for architect, researcher, and validator.

## Output to user
Workflow URL (`https://n8n.srv981435.hstgr.cloud/workflow/{id}`) · summary · credentials needed · node count · activation status.

## 🛡️ AI OS notes
- Pairs with Paras's **n8n-mcp** (loads on Claude Code restart). Activating any workflow that **sends to real customers or moves money stays approval-gated** (`CLAUDE.md §5`) — build + validate freely; gate the go-live. (Source: Usama collection; n8n MCP by czlonkowski.)
