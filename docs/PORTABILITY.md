# Portability: what must move together

The new repository makes curated code and knowledge relocatable. It doesn't carry authenticated SaaS accounts, workflow state, customer data or personal secrets. A full business restore hasn't been demonstrated on a second machine.

| Layer | Package or backup | Restore proof |
|---|---|---|
| Code and curated decisions | Private repository and exact commit | Clone into an empty directory, install locked dependencies, run tests |
| Private memory | Encrypted backup of selected vault/capture files | Restore notes and links without overwriting newer work |
| Runtime configuration | Empty template plus separate secret storage | Verify account identity, required variables and model availability |
| Workflow definitions | Reviewed n8n exports without secrets | Import inactive on a test instance; map credentials/webhooks |
| Automation state | Database backup and matching encryption configuration | Recover credentials and workflow state in isolation |
| Customer/payment records | Provider backup policy and record mapping | Reconcile payment, access and consent using stable identifiers |
| Schedules/monitoring | Service definitions, owners and alert routes | Restart, fail deliberately, recover without duplicate actions |

Protect n8n's database and encryption configuration together. Its documentation explains how instance keys protect credential encryption and database state. Verify the deployed version's process before migration; this cleanup performs no key rotation. [n8n encryption documentation](https://docs.n8n.io/deploy/host-n8n/configure-n8n/security/rotate-encryption-keys).

Keep an independent Obsidian backup. Sync copies changes, including unwanted changes; a recovery copy serves a different purpose. [Obsidian backup guidance](https://obsidian.md/help/backup).

## Proposed restore exercise

1. Choose an empty test machine or isolated environment; record commit and dependency versions.
2. Restore source and curated notes. Run local tests before supplying credentials.
3. Provide test credentials through separate configuration and verify account identity.
4. Import one workflow inactive; use synthetic contacts and a payment sandbox.
5. Test success, duplicate events, timeouts, expired credentials and a restart midway through work.
6. Verify destination records and the exception queue. Confirm no duplicate access grants, messages or charges.
7. Record the exact steps, recovery time and data loss window before planning production migration.

Use the existing n8n host and a small runtime first. Package a proven workflow with containers or provisioning later. Docker isn't available here; no container build or cross-platform restore is claimed.
