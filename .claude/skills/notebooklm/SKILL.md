---
name: notebooklm
description: Drive Google NotebookLM from the CLI via the notebooklm-py library — add sources (PDFs, links, YouTube, text) to a notebook, generate summaries / study guides / reports and other artifacts, and export the results into the local project folder. Use when the user asks to add sources to NotebookLM, summarize or build study material from their notebook, generate a report/quiz/flashcards/mind-map, or save NotebookLM output to disk.
---

# NotebookLM

Automate Google NotebookLM through the `notebooklm-py` CLI (v0.7.x). Already installed and authenticated as `parasestatelabs@gmail.com`.

## The `notebooklm` command

The Scripts dir is on the **user** PATH, but it only applies to terminals opened *after* the PATH change. In this and any pre-existing session, call the binary by full path:

```
"C:\Users\PARAS ARORA\AppData\Roaming\Python\Python314\Scripts\notebooklm.exe"
```

If `notebooklm` resolves on PATH (new terminal), use the bare name. To test: `notebooklm --version`. Add `--json` to most read commands for machine-readable output you can parse or redirect to a file.

## Core workflow

1. **Pick the notebook.** `notebooklm list` to see notebooks (IDs support partial prefixes). Set the active one with `notebooklm use <partial-id>`, or pass `-n <id>` per command. `notebooklm create "Title"` makes a new one.
2. **Add sources.** Type is auto-detected (url / file / youtube / text).
   - `notebooklm source add "https://example.com/article"`
   - `notebooklm source add "C:\path\to\paper.pdf" --title "Paper"`
   - `notebooklm source add "https://youtu.be/<id>"`
   - `notebooklm source add "raw text..." --type text --title "Notes"`
   - List/inspect: `notebooklm source list` (has a `Status` column: `ready` vs pending), `notebooklm source get <id>`. Adding ingests asynchronously — if a source was just added, confirm it before generating: either check `source list` shows `ready`, or block on `notebooklm source wait <source-id>` (the source ID is **required**).
3. **Generate.** `notebooklm generate <type>`:
   - `generate report` (default briefing-doc) — also `--format study-guide | blog-post | custom`, and an optional `"custom prompt"` or `--append "extra instructions"`.
   - `generate quiz | flashcards | mind-map | infographic | data-table | slide-deck | audio | video`.
   - Scope to specific sources with repeated `-s <source-id>`. Generation is async — poll with `notebooklm artifact wait <id>` (or `artifact poll`).
4. **Read / quick answers.** `notebooklm summary --topics` for an AI summary; `notebooklm ask "question"` to chat the notebook.

## Exporting output to the project folder

`notebooklm artifact export` only targets **Google Docs/Sheets** — it does NOT write local files. For the user's project folder, redirect command output to disk:

- Generated artifact (Markdown/JSON content):
  `notebooklm artifact get <artifact-id> --json > "<project>\notebooklm\report.json"`
- Notebook summary:
  `notebooklm summary --topics --json > "<project>\notebooklm\summary.json"`
- A chat answer:
  `notebooklm ask "Summarize the key findings" > "<project>\notebooklm\answer.md"`
- Conversation history as a saved note: `notebooklm history --save`.

Default export location is a `notebooklm/` subfolder of the current project (`notebooklm/`) unless the user names another path. Create the folder if missing. Prefer `.md` for prose, `.json` for structured/parseable output.

## Rules

- **Confirm before large batches.** Adding many sources at once, or generating multiple artifacts in one go, consumes NotebookLM quota and time — list exactly what will be added/generated and get a yes before running more than ~3 operations.
- **Never handle the user's Google credentials.** Auth is already saved; if re-login is ever needed, run `notebooklm login` (opens a browser for the user to sign in) and let them complete it.
- Respect SSRF/symlink guards: `source add` rejects internal hosts and symlinks by default. Only pass `--allow-internal` / `--follow-symlinks` when the user explicitly intends it.
- Sources and artifacts are **async** — wait for them (`source wait`, `artifact wait`) before depending on the result.
- Run `notebooklm doctor` if anything seems off (auth, profile). The `0o777 vs 0o700` profile-dir warning on Windows is harmless.
- Useful command groups: `source`, `artifact`, `note`, `share`, `profile`, `language`. Append `--help` to any command for exact options.
