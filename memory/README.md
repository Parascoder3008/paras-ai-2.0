# Memory workflow

The repository holds curated operating knowledge. Obsidian holds linked notes for human review. Business source records remain in their own systems. Don't copy an entire vault or customer database into prompts or GitHub.

## Daily use

1. Start with `node scripts/brain.cjs status` and the memory index.
2. Capture an idea or task with `node scripts/brain.cjs capture "text" --pillar content` (content, business, invest or personal). Capture writes only to ignored `memory/inbox.jsonl`.
3. Review with `node scripts/brain.cjs inbox`. Turn a useful item into a sourced note, a decision, or work on the existing content board. Mark handled items using `node scripts/brain.cjs resolve ID`. Resolution records review, not task completion.
4. End by updating `memory/last-session.md` and `ledger/paras.md` with actual work, validation, uncertainties and next actions. No automatic Git action.

## Obsidian synchronization

`node scripts/sync-obsidian.cjs plan` prepares a reviewable note bundle in `outputs/obsidian-sync/`. `node scripts/sync-obsidian.cjs apply` writes it to the configured existing vault and verifies each write. It uses `OBSIDIAN_VAULT_PATH`; an explicit `--vault PATH` overrides it.

New notes use frontmatter and wikilinks. Generated sections have explicit Paras AI markers. Existing handwritten content is retained, conflicting managed edits stop the sync, and changed files are backed up locally before mutation. The existing AI OS Master Map gets a current-project pointer; old dated notes remain historical. The sync never edits vault configuration or plugins, never uploads raw notes, and never deletes notes.

The command is manually invoked during authorized memory updates. No MCP connection or background sync is implied. The receipt lives in ignored `outputs/obsidian-sync-receipt.json`; a missing receipt means sync hasn't been verified on this machine. File access can work even when no Obsidian MCP server is exposed.

## Source precedence

Direct current user decisions → current operating plan → dated verified system records → curated memory → historical reference. An old note cannot override a current decision. Every claim should be identifiable as observed, user-confirmed, an assumption, or unknown.
