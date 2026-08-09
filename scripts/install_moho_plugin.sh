#!/bin/bash
# install_moho_plugin.sh — Idempotent MohoMCP plugin installer (macOS / Unix).
#
# Copies MohoMCP_Server.lua, MohoMCP_Poller.lua, json.lua and the moho_mcp/
# core into Moho's user scripts directory.
#
# Never uses `chmod 777`. Never writes outside your home directory (the optional
# /Applications step is skipped unless that bundle is already user-writable).
# Existing files that we did not install are backed up, never silently clobbered.

set -euo pipefail

# ---------------------------------------------------------------------------
# Locate the plugin source.
#
# This script lives in <repo>/scripts/ but the plugin lives in
# <repo>/moho-plugin/. Resolving relative to the script (not to the caller's
# working directory) means `bash scripts/install_moho_plugin.sh` works from
# anywhere, including from inside scripts/ itself.
#
# Symlinks are resolved first, so a symlinked copy of this script still finds
# the real repository rather than the symlink's own directory.
# ---------------------------------------------------------------------------
resolve_script_dir() {
    local target="${BASH_SOURCE[0]}"
    local dir
    while [[ -L "${target}" ]]; do
        dir="$(cd "$(dirname "${target}")" && pwd)"
        target="$(readlink "${target}")"
        # A relative link is relative to the directory holding the link.
        [[ "${target}" != /* ]] && target="${dir}/${target}"
    done
    (cd "$(dirname "${target}")" && pwd)
}

SCRIPT_DIR="$(resolve_script_dir)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SRC="${REPO_ROOT}/moho-plugin"

DRY_RUN=0
for arg in "$@"; do
    case "$arg" in
        --dry-run) DRY_RUN=1 ;;
        -h|--help)
            cat <<USAGE
Usage: bash scripts/install_moho_plugin.sh [--dry-run]

  --dry-run   Show what would be copied and where, then exit without writing.

Installs the MohoMCP Lua plugin into Moho's user scripts directory.
USAGE
            exit 0
            ;;
        *)
            echo "Unknown option: $arg (try --help)" >&2
            exit 2
            ;;
    esac
done

echo "============================================"
echo " MohoMCP Plugin Installer (macOS / Unix)"
echo "============================================"
echo

if [[ ! -d "${SRC}" ]]; then
    echo "ERROR: cannot find the plugin source directory." >&2
    echo "  Expected: ${SRC}" >&2
    echo "  This script must stay inside the repository, in the scripts/ folder," >&2
    echo "  alongside a sibling moho-plugin/ directory." >&2
    exit 1
fi

# Everything the plugin needs at runtime. Missing any one of these means the
# plugin half-loads and fails at an unhelpful moment, so verify up front.
REQUIRED_FILES=(
    "MohoMCP_Server.lua"
    "MohoMCP_Poller.lua"
    "json.lua"
    "moho_mcp/protocol.lua"
    "moho_mcp/validator.lua"
    "moho_mcp/server.lua"
    "moho_mcp/tools/document.lua"
    "moho_mcp/tools/layer.lua"
    "moho_mcp/tools/bone.lua"
    "moho_mcp/tools/animation.lua"
    "moho_mcp/tools/mesh.lua"
    "moho_mcp/tools/batch.lua"
    "moho_mcp/tools/workflow.lua"
)

missing=()
for rel in "${REQUIRED_FILES[@]}"; do
    [[ -f "${SRC}/${rel}" ]] || missing+=("${rel}")
done
if (( ${#missing[@]} > 0 )); then
    echo "ERROR: the plugin source is incomplete. Missing:" >&2
    for m in "${missing[@]}"; do echo "  - moho-plugin/${m}" >&2; done
    echo "Nothing was installed." >&2
    exit 1
fi

# ---------------------------------------------------------------------------
# Find Moho.
#
# Presence of the app is informational: scripts install into your user scripts
# directory, which works even when Moho lives somewhere unusual.
# ---------------------------------------------------------------------------
MOHO_APP=""
for candidate in /Applications/Moho.app /Applications/Moho\ Pro*.app "${HOME}/Applications/Moho.app" "${HOME}/Applications/Moho Pro"*.app; do
    if [[ -d "${candidate}" ]]; then MOHO_APP="${candidate}"; break; fi
done

if [[ -n "${MOHO_APP}" ]]; then
    MOHO_VERSION="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' \
        "${MOHO_APP}/Contents/Info.plist" 2>/dev/null || echo "unknown")"
    echo "Found Moho:  ${MOHO_APP} (version ${MOHO_VERSION})"
else
    echo "NOTE: no Moho application found in /Applications or ~/Applications."
    echo "      Installing into your user scripts directory anyway — that is the"
    echo "      correct location regardless of where Moho itself is installed."
fi

# Moho reads user scripts from ~/Library/Application Support/Moho/scripts.
USER_SCRIPTS="${HOME}/Library/Application Support/Moho/scripts"
MENU_DEST="${USER_SCRIPTS}/menu"
SUB_DEST="${MENU_DEST}/MohoMCP"
TOOL_DEST="${USER_SCRIPTS}/tool"
IPC_DEST="${HOME}/Library/Application Support/MohoMCP/ipc"
LEGACY_TMP="/tmp/moho-mcp"
STAMP=".mohomcp_installed"

echo "Source:      ${SRC}"
echo "Destination: ${USER_SCRIPTS}"
echo "Spool (IPC): ${IPC_DEST}"
echo

if (( DRY_RUN )); then
    echo "--dry-run: the following files would be installed:"
    for rel in "${REQUIRED_FILES[@]}"; do
        echo "  moho-plugin/${rel}  ->  ${SUB_DEST}/${rel}"
    done
    # Both menu destinations are listed on purpose. An earlier version of this
    # preview showed only SUB_DEST, so the plugin appeared to be installed once
    # while two copies landed on disk. Anyone auditing the install then found an
    # unexplained second tree and had to guess whether it was stale.
    for rel in "${REQUIRED_FILES[@]}"; do
        echo "  moho-plugin/${rel}  ->  ${MENU_DEST}/${rel}"
    done
    echo "  moho-plugin/MohoMCP_Poller.lua  ->  ${TOOL_DEST}/MohoMCP_Poller.lua"
    echo
    echo "Note: menu files are installed TWICE, into both:"
    echo "  ${MENU_DEST}"
    echo "  ${SUB_DEST}"
    echo "Moho versions differ in whether the Scripts menu scans menu/ or a"
    echo "subfolder of it, and there is no reliable way to detect which. Both"
    echo "copies are written and refreshed on every run, so they cannot drift"
    echo "apart. Each copy resolves its own modules from its own directory."
    echo "The Scripts menu may therefore list MohoMCP Server twice — either"
    echo "entry works."
    echo
    echo "No changes made."
    exit 0
fi

# 0755: owner rwx, others rx. Never 0777.
mkdir -p "${MENU_DEST}/moho_mcp/tools"
mkdir -p "${SUB_DEST}/moho_mcp/tools"
mkdir -p "${TOOL_DEST}"
mkdir -p "${IPC_DEST}"
chmod 0755 "${MENU_DEST}" "${SUB_DEST}" "${TOOL_DEST}" 2>/dev/null || true
# The spool carries scene data; keep it owner-only.
chmod 0700 "${IPC_DEST}" 2>/dev/null || true

# ---------------------------------------------------------------------------
# Copy with care.
#
# If a destination file exists, was not installed by us, and differs from what
# we are about to write, move it to <name>.bak-<timestamp> first. A previous
# MohoMCP install (marked by the stamp file) is upgraded in place silently.
# ---------------------------------------------------------------------------
BACKUP_SUFFIX="bak-$(date +%Y%m%d_%H%M%S)"
backed_up=()
copied=0
unchanged=0

install_file() {
    local src="$1" dest="$2" dest_root="$3"
    if [[ -f "${dest}" ]]; then
        if cmp -s "${src}" "${dest}"; then
            unchanged=$(( unchanged + 1 ))
            return 0
        fi
        # Differs. Was this tree installed by us before?
        if [[ ! -f "${dest_root}/${STAMP}" ]]; then
            mv "${dest}" "${dest}.${BACKUP_SUFFIX}"
            backed_up+=("${dest}.${BACKUP_SUFFIX}")
        fi
    fi
    cp -f "${src}" "${dest}"
    copied=$(( copied + 1 ))
}

echo "Installing plugin files..."
for rel in "${REQUIRED_FILES[@]}"; do
    install_file "${SRC}/${rel}" "${SUB_DEST}/${rel}" "${SUB_DEST}"
done

# Moho versions differ in whether they scan menu/ or menu/<subdir>/. Install to
# both so the Scripts menu entry appears either way.
for rel in "${REQUIRED_FILES[@]}"; do
    install_file "${SRC}/${rel}" "${MENU_DEST}/${rel}" "${MENU_DEST}"
done

# The Poller is a *tool*; it must also live under tool/ to appear in the toolbar.
install_file "${SRC}/MohoMCP_Poller.lua" "${TOOL_DEST}/MohoMCP_Poller.lua" "${TOOL_DEST}"

# Mark these trees as ours so a re-run upgrades instead of making backups.
for root in "${SUB_DEST}" "${MENU_DEST}" "${TOOL_DEST}"; do
    printf 'MohoMCP installed %s from %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "${SRC}" \
        > "${root}/${STAMP}"
done

# ---------------------------------------------------------------------------
# Verify what actually landed, rather than trusting that cp worked.
# ---------------------------------------------------------------------------
echo
echo "Verifying installation..."
verify_failed=0
for rel in "${REQUIRED_FILES[@]}"; do
    if ! cmp -s "${SRC}/${rel}" "${SUB_DEST}/${rel}"; then
        echo "  MISMATCH: ${SUB_DEST}/${rel}" >&2
        verify_failed=1
    fi
done
if ! cmp -s "${SRC}/MohoMCP_Poller.lua" "${TOOL_DEST}/MohoMCP_Poller.lua"; then
    echo "  MISMATCH: ${TOOL_DEST}/MohoMCP_Poller.lua" >&2
    verify_failed=1
fi

if (( verify_failed )); then
    echo "ERROR: verification failed. The plugin may be partially installed." >&2
    exit 1
fi
echo "  All ${#REQUIRED_FILES[@]} files verified byte-for-byte."

# Optional syntax check when a Lua interpreter happens to be available.
LUA_BIN="$(command -v lua5.4 || command -v lua || command -v luajit || true)"
if [[ -n "${LUA_BIN}" ]]; then
    syntax_failed=0
    for rel in "${REQUIRED_FILES[@]}"; do
        if ! "${LUA_BIN}" -e "assert(loadfile('${SUB_DEST}/${rel}'))" 2>/dev/null; then
            echo "  SYNTAX ERROR in ${rel}" >&2
            syntax_failed=1
        fi
    done
    if (( syntax_failed )); then
        echo "ERROR: installed files contain Lua syntax errors." >&2
        exit 1
    fi
    echo "  Lua syntax check passed (${LUA_BIN})."
fi

# ---------------------------------------------------------------------------
# Report anything the human needs to know.
# ---------------------------------------------------------------------------
echo
if (( ${#backed_up[@]} > 0 )); then
    echo "IMPORTANT: pre-existing files were NOT overwritten silently."
    echo "These were moved aside first:"
    for b in "${backed_up[@]}"; do echo "  ${b}"; done
    echo
fi

if [[ -d "${LEGACY_TMP}" ]]; then
    echo "NOTE: a spool directory exists at ${LEGACY_TMP}."
    echo "      /tmp is readable by every user on this machine. The private"
    echo "      ${IPC_DEST}"
    echo "      is preferred. Nothing was deleted."
    echo "      If your Claude config sets MOHO_MCP_IPC_DIR=${LEGACY_TMP},"
    echo "      the plugin will use that path — bridge and plugin must agree."
    echo
fi

echo "============================================"
echo " Installation complete."
echo "   ${copied} file(s) written, ${unchanged} already up to date."
echo "============================================"
echo
echo "To start it:"
echo "  1. Launch Moho (restart it if it was already running)."
echo "  2. Scripts menu -> MohoMCP -> MohoMCP Server."
echo "     The label shows a green dot when the server is running."
echo
echo "To confirm it is working:"
echo "  A file named health.json appears in the spool directory within"
echo "  a few seconds of starting the server:"
echo "    ls -l \"${IPC_DEST}/health.json\""
echo
echo "Spool directory:"
echo "  Default: ${IPC_DEST}"
echo "  Override with MOHO_IPC_DIR, or MOHO_MCP_IPC_DIR if that is unset."
echo "  The MCP bridge and this plugin must resolve the SAME directory,"
echo "  otherwise requests are written where nobody reads them."
