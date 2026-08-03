# Astra AI — Installation Guide

**Phase 4 — Milestone 6 (Release Engineering)**

This guide covers installing Astra AI on Windows, macOS, and Linux.

---

## System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| OS | Windows 10 / macOS 12 / Ubuntu 20.04 | Windows 11 / macOS 14 / Ubuntu 24.04 |
| CPU | 2 cores | 4+ cores |
| RAM | 4 GB | 8+ GB |
| Disk | 500 MB free | 2 GB free |
| Display | 1280×800 | 1920×1080 |

### Optional — Local AI Models
- **Ollama** for local model inference (`ollama.com`).
- **Python 3.10+** for the backend (bundled instructions in the repo).

---

## Windows

1. Download `Astra-AI-Setup-<version>.exe`.
2. Double-click the installer.
3. Choose destination folder (default `%LOCALAPPDATA%\Programs\Astra AI`).
4. Select whether to create a **desktop shortcut** and **start menu** entry.
5. Click **Install**, then **Finish** to launch.

**Portable:** Download `Astra-AI-Portable-<version>.exe` and run directly —
no installation required.

### Uninstall
- Start menu → Astra AI → Uninstall, **or**
- Settings → Apps → Astra AI → Uninstall.

---

## macOS

1. Download `Astra-AI-<version>-<arch>.dmg`.
2. Open the DMG and drag **Astra AI** into the **Applications** folder.
3. Launch from Applications.
4. If Gatekeeper warns about an unidentified developer, right-click the app
   and select **Open** (required until notarization is configured).

> **arm64** builds are for Apple Silicon; **x64** builds are for Intel.

### Uninstall
- Drag `Astra AI.app` from Applications to the Trash.

---

## Linux

### AppImage
1. Download `Astra-AI-<version>.AppImage`.
2. `chmod +x Astra-AI-<version>.AppImage`
3. Run: `./Astra-AI-<version>.AppImage`

### Debian/Ubuntu (.deb)
1. `sudo apt install ./astra-ai_<version>_amd64.deb`
2. Launch from the applications menu or `astra-ai`.

### Uninstall
- AppImage: delete the file.
- DEB: `sudo apt remove astra-ai`.

---

## First Run

1. Splash screen → Onboarding wizard.
2. The app checks the backend WebSocket. If the backend isn't running, the
   Chat page shows **OfflineState** with a **Retry** button.
3. Start chatting. All features (Memory, Files, Models, Plugins) are accessible
   from the sidebar.

---

## Verifying the Installation

- **Version:** `Settings → About` (or check `release-metadata.json` in the
  build output).
- **Smoke test (developers):** `npm run smoke` in `astra/frontend` after a build.

---

## Troubleshooting

See `troubleshooting.md`. Common issues:

| Symptom | Fix |
|---------|-----|
| "Backend Disconnected" in Chat | Start the backend, then click **Retry**. |
| App won't launch | Check `crash.log` (userData dir) — see troubleshooting guide. |
| macOS "unidentified developer" | Right-click → Open (until signed builds exist). |
