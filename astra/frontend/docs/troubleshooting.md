# Astra AI — Troubleshooting Guide

**Phase 4 — Milestone 6 (Release Engineering)**

Common problems and their resolutions.

---

## Application Won't Launch

| Symptom | Likely Cause | Resolution |
|---------|--------------|------------|
| App closes immediately | Backend missing or port `8642` in use | Start the backend, free the port, relaunch |
| Nothing happens on double-click | Corrupt install | Reinstall; Windows: check Event Viewer; macOS: check Console |
| macOS "cannot be opened" | Unnotarized build | Right-click → **Open**; or see Gatekeeper section below |

**Crash log:** The app writes `crash.log` (with version, platform, Electron,
Node, and timestamp) to the userData directory:

| OS | Path |
|----|------|
| Windows | `%APPDATA%\astra-ai\crash.log` |
| macOS | `~/Library/Application Support/astra-ai/crash.log` |
| Linux | `~/.config/astra-ai/crash.log` |

You can view logs inside the app at **Settings → Stability & Recovery →
Crash log viewer**.

---

## "Backend Disconnected" / OfflineState Shown in Chat

This is expected behavior: the Chat page shows `OfflineState` whenever the
backend/WebSocket is unavailable.

| Check | Action |
|-------|--------|
| Is the backend running? | Start it, then click **Retry** in OfflineState |
| Is the WebSocket port correct? | Backend listens on `8642` |
| Did the connection drop? | Retry calls `wsService.reconnect()`; UI auto-restores on reconnect |
| Is chat history gone? | It isn't — history is preserved in the store while offline |

---

## Streaming / Chat Issues

| Symptom | Resolution |
|---------|------------|
| Streaming freezes | Wait up to 10s (heartbeat timeout) and verify the backend responds |
| Message stuck "Thinking..." | Send **Cancel** or reload; reconnect if offline |
| No model available | Check **Models** page; pull a model via Ollama |

---

## Auto-Update Issues

| Symptom | Resolution |
|---------|------------|
| "No update available" in dev | `electron-updater` requires a packaged app + published release |
| Update download stuck | Check network/firewall; GitHub releases must be reachable |
| Update fails to install | Ensure enough disk space; retry; check `release.log` |
| Want to disable auto-update | **Settings → Updates → autoDownload off** |

---

## Gatekeeper (macOS)

Until builds are signed and notarized (requires Apple Developer account):

- Right-click the app → **Open** to add a one-time exception, or
- `xattr -cr "/Applications/Astra AI.app"` from the terminal.

---

## SmartScreen (Windows)

Until Authenticode signing is configured, Windows may warn "Windows protected
your PC." Click **More info → Run anyway**.

---

## Performance

| Symptom | Resolution |
|---------|------------|
| High memory | Use **Settings → System → Memory** monitor; close unused pages |
| Slow UI | Ensure GPU acceleration; check `DevDiagnostics` page |
| Backend CPU spikes | Model inference is local — expect high CPU during generation |

---

## Getting Help

- GitHub Issues: https://github.com/thesaint-vin0/ASTRA-v1.0/issues
- Include: app version, OS, architecture, `crash.log`, and steps to reproduce.
