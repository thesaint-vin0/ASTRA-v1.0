# Astra AI — Upgrade Guide

**Phase 4 — Milestone 6 (Release Engineering)**

This guide explains how existing Astra AI installations are upgraded, both
automatically and manually.

---

## Auto-Update

Astra AI ships with an auto-update service based on `electron-updater`,
configured to publish/check against the GitHub release feed
(`thesaint-vin0/ASTRA-v1.0`).

### Stable / Beta Channels

Two channels are supported:

| Channel | Default | Use |
|---------|---------|-----|
| `stable` | ✅ | Production releases for all users |
| `beta` | — | Pre-release validation builds |

Switching channels is done in **Settings → Updates → Update channel**.

### Flow

1. App launch (or `Check for updates`) calls the updater.
2. `autoDownload` (default on) downloads the new version in the background.
3. When the download finishes, the renderer shows **Install update**.
4. Clicking install quits, runs the installer/updater, and relaunches.

### Rollback

If an update fails to launch, the bundled `electron-updater` cache preserves
the previous version. Reinstalling the previous installer from the
[release page](https://github.com/thesaint-vin0/ASTRA-v1.0/releases) recovers
the prior version. (Differential/delta update rollback is managed via
`electron-updater` update cache.)

---

## Manual Upgrade by Platform

### Windows
- **NSIS:** Run the new `Astra-AI-Setup-<version>.exe`. The installer upgrades
  in place, preserving user data (`deleteAppDataOnUninstall=false`).
- **Portable:** Download the new portable exe and replace the old file.
  `appData` lives in `%APPDATA%` so data is preserved.

### macOS
- Download the new DMG, drag **Astra AI** over the existing app in
  **Applications** to replace it. User data in `~/Library/Application Support`
  is preserved.

### Linux
- **AppImage:** Download the new `.AppImage` and run that instead (data in
  `~/.config` is preserved).
- **DEB:** `sudo apt install ./astra-ai_<version>_amd64.deb` upgrades in place.

---

## Post-Upgrade Verification

1. Launch the app.
2. Check **Settings → About** shows the new version.
3. Confirm chat history is present.
4. Confirm the backend connects (Chat page not stuck on OfflineState).
5. Run `npm run smoke` (developers) to validate artifacts.

---

## Rollback (if an update regresses)

1. Uninstall the current version (or reinstall the previous installer).
2. Data is preserved in the app's userData directory; no manual backup
   restore is required for installed-package upgrades.

For **stability-sensitive users**, set `autoDownload` to **off** in
Settings → Updates and install only versions you choose.
