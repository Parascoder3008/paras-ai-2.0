# Local setup

Start at the repository README. Use Node.js 20+ for the dependency-free brain, audit, operations and release commands. Install the dashboard dependency with `npm ci --prefix dashboard`. Run `npm test` after installation.

Run the console with `node dashboard/server.js`. Configure `DASHBOARD_USER` and `DASHBOARD_PASS` before exposing it beyond localhost; this project doesn't deploy a public service. Draft generation uses `ANTHROPIC_API_KEY` and a provider-supported `MODEL` supplied by your environment. No model call is required for local status, capture, audit or tests.

Python tools are optional for extended search/voice/mind-map features. Install a supported Python runtime and the existing requirements in an isolated environment. `scripts/python-runtime.cjs` selects an available interpreter; `PYTHON` can override it. The richer mind map may require model downloads and isn't certified by the basic test suite.

Set `OBSIDIAN_VAULT_PATH` to an existing vault. Run the sync plan before applying; review the receipt afterward. No Obsidian plugin is required for the direct-file method.

GHL, n8n, AiSensy, payments, social platforms and brokerage accounts aren't enabled by installation. Their keys stay in environment variables or ignored local secret files. Read `connections.md` and the relevant capability before use. Historical integration recipes need fresh verification.

The `paper-trader/`, `video-engine/` and `video-use/` projects are kept in the original workspace and excluded from the new release. Optional media skills may reference those external projects; install or configure them only for an actual media task.
