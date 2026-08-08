# MohoMCP — Moho Pro Lua plugin

This is the half of the bridge that lives **inside Moho**. It watches a folder
for request files, runs the requested operation through Moho's Lua API, and
writes the answer back. The MCP server (TypeScript, in `src/`) writes those
requests. Neither half is useful without the other.

---

## Install

From the repository root:

```bash
bash scripts/install_moho_plugin.sh
```

On Windows, double-click `scripts\install_moho_plugin.bat`.

Want to see what it would do first? Add `--dry-run` (macOS/Linux):

```bash
bash scripts/install_moho_plugin.sh --dry-run
```

Re-running is safe. Files that are already correct are left alone. If you have
your own file where one of ours goes, yours is renamed to `<name>.bak-<date>`
and the installer tells you — it is never deleted or silently overwritten.

## Where it gets installed

The installer writes to your **user** scripts directory, which needs no
administrator rights and survives Moho upgrades:

| Platform | Location |
| --- | --- |
| macOS | `~/Library/Application Support/Moho/scripts/` |
| Windows | `%APPDATA%\Moho\scripts\` |

Inside that folder:

- `menu/MohoMCP/` — the server and all its modules (this is the Scripts menu entry)
- `menu/` — the same files again, because different Moho versions scan
  different levels
- `tool/MohoMCP_Poller.lua` — the Poller, which must live under `tool/` to show
  up in the toolbar

Nothing is written to `/Applications` or `C:\Program Files`.

## Turning it on

1. **Start Moho.** If it was already running, quit and reopen it — Moho only
   scans for scripts at launch.
2. Open the **Scripts** menu → **MohoMCP** → **MohoMCP Server**.

The menu label tells you the state:

- 🔴 `MohoMCP Server (Click to Start)` — stopped
- 🟢 `MohoMCP Server (Active - Click to Stop)` — running

Clicking toggles it.

## How to tell it is actually working

While the server runs it rewrites a heartbeat file every few seconds. Check for
it:

```bash
# macOS
ls -l ~/Library/Application\ Support/MohoMCP/ipc/health.json
```

```cmd
REM Windows
dir "%LOCALAPPDATA%\MohoMCP\ipc\health.json"
```

If that file exists and its timestamp keeps advancing, the plugin is alive and
polling. Look inside it for the version and protocol it reports:

```json
{ "running": true, "protocolVersion": "1.1.0", "lastProcessedSequence": 0 }
```

If the file is missing, or its timestamp is frozen, see Troubleshooting below.

## The spool directory

Both halves of the bridge exchange files through one directory. **They must
agree on which one**, or requests get written where nobody reads them and every
call just times out.

Defaults:

| Platform | Default spool directory |
| --- | --- |
| macOS | `~/Library/Application Support/MohoMCP/ipc` |
| Windows | `%LOCALAPPDATA%\MohoMCP\ipc` |
| Linux | `~/.moho_mcp/ipc` |

To override it, set an environment variable. Two names are accepted and checked
**in this order**:

1. `MOHO_IPC_DIR`
2. `MOHO_MCP_IPC_DIR`

The first one that is set wins. The TypeScript side reads the same two names in
the same order, so setting only one keeps both halves in sync.

> If your Claude config sets `MOHO_MCP_IPC_DIR` (for example to `/tmp/moho-mcp`),
> the plugin will use that path too — as long as `MOHO_IPC_DIR` is not also set
> to something else. Note that `/tmp` is readable by every account on the
> machine; the per-user default above is the private option.

The plugin creates the spool directory if it does not exist.

## Troubleshooting

**The Scripts menu has no MohoMCP entry.**
Moho only looks for scripts at startup. Quit Moho completely and reopen it.

**`health.json` never appears.**
The server is not running. Open Scripts → MohoMCP → MohoMCP Server and confirm
the label turns green. Moho prints plugin messages to its own console; look for
lines starting with `[MohoMCP]`.

**`health.json` exists but its timestamp is frozen, and calls time out.**
The plugin polls from Moho's redraw loop, so it needs the UI to be repainting.
Select the **MohoMCP Poller** tool from the toolbar (it is in the last tool
group) and leave it selected. That guarantees a steady poll even while you are
not touching anything.

**Calls time out and `health.json` is nowhere to be found.**
The two halves probably disagree about the spool directory. Print what each one
resolved: when the plugin starts it logs a line like
`[MohoMCP] Server started. IPC directory: ...` (and `[MohoMCP] Server STARTED!
IPC dir: ...`) to the Moho console. Compare that against the directory the MCP
server reports. If they differ, unset one of the two environment variables.

## Layout

```
moho-plugin/
├── MohoMCP_Server.lua      Scripts-menu entry. Loads modules, registers
│                           handlers, owns start/stop and the poll hooks.
├── MohoMCP_Poller.lua      Toolbar tool. Keeps the poll loop ticking.
├── json.lua                JSON encode/decode.
├── moho_mcp/
│   ├── server.lua          The file-based IPC loop: read request, dispatch,
│   │                       write response. Atomic writes, dead-letter
│   │                       quarantine, replay protection.
│   ├── protocol.lua        JSON-RPC 2.0 framing, error codes, version
│   │                       negotiation. Mirrors src/moho/protocol.ts.
│   ├── validator.lua       Allow-list plus per-method parameter schemas.
│   │                       Nothing outside the allow-list is ever dispatched.
│   └── tools/              The actual Moho API work.
│       ├── document.lua    ├── layer.lua     ├── bone.lua
│       ├── animation.lua   ├── mesh.lua      ├── batch.lua
│       └── workflow.lua
└── tests/                  Lua test suite (see below).
```

### A note on method names

The MCP tool names exposed to the model (`moho.document.get_info`) are **not**
the Lua method names used on the wire (`document.getInfo`). The renaming happens
entirely on the TypeScript side. The Lua method strings in `validator.lua`,
`MohoMCP_Server.lua`, and `tools/*.lua` must stay exactly as they are — rename
one and Moho stops answering that call with no visible error.

Three lists have to agree, and the test suite enforces it:

1. the allow-list in `moho_mcp/validator.lua`
2. the registration table in `MohoMCP_Server.lua`
3. the functions actually defined in `moho_mcp/tools/*.lua`

## Running the tests

The tests are plain Lua and need no Moho. Any Lua 5.4 interpreter works:

```bash
cd moho-plugin/tests
lua run_tests.lua
```

Expected tail:

```
Results: 181 passed, 0 failed, 181 total
```

macOS ships no `lua` binary. Install one with `brew install lua`, or build it:

```bash
curl -sSLO https://www.lua.org/ftp/lua-5.4.6.tar.gz
tar xzf lua-5.4.6.tar.gz && cd lua-5.4.6 && make macosx
# then use ./src/lua to run the suite
```

The suite covers `json.lua`, `protocol.lua`, `validator.lua` and `server.lua`,
including the three-way method-name parity check described above.
