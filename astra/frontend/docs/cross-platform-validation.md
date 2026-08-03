# Cross-Platform Validation Checklist

**Phase 4 — Milestone 5**
**Application:** Astra AI — Desktop

This checklist is the manual QA gate for a release build on each supported
platform. It should be executed by a human on real hardware (or CI runners for
the automated portions). Every column must be marked **✅ Pass** or **❌ Blocked
(limitation)** with a note before a release is considered complete.

> Honesty rule: label each item **Verified** / **Implemented but untested** /
> **Blocked by environment**.

---

## 1. Automated Checks (run in CI, all platforms)

| Check | Windows | macOS | Linux |
|-------|---------|-------|-------|
| `npx tsc --noEmit` | ✅ | ✅ | ✅ |
| `npm run lint` | ✅ | ✅ | ✅ |
| `npm run build` | ✅ | ✅ | ✅ |
| `npm run smoke` | ✅ | ✅ | ✅ |
| `npm run release:metadata` | ✅ | ✅ | ✅ |
| electron-builder packaging | ⬜ | ⬜ | ⬜ |

> The four header rows above are covered by `.github/workflows/validate.yml`.
> The smoke test verifies build artifacts, release metadata, Electron module
> syntax, and IPC surface consistency.

---

## 2. Installer Verification

| Check | Windows 10/11 | macOS | Ubuntu/Fedora |
|-------|---------------|-------|---------------|
| Installer launches | ⬜ | ⬜ | ⬜ |
| Install to non-default dir | ⬜ | — | — |
| Desktop shortcut created | ⬜ | — | — |
| Start menu / Launchpad entry | ⬜ | ⬜ | ⬜ |
| Uninstall removes app | ⬜ | ⬜ | ⬜ |
| Install upgrade over existing | ⬜ | ⬜ | ⬜ |
| App launches after install | ⬜ | ⬜ | ⬜ |

---

## 3. Application Launch

| Check | Status | Notes |
|-------|--------|-------|
| Splash screen shows and completes | ⬜ | |
| Onboarding (first run) appears | ⬜ | |
| Main window renders | ⬜ | |
| Backend WebSocket connects | ⬜ | |
| No console errors | ⬜ | |
| No React warnings | ⬜ | |
| No uncaught exceptions | ⬜ | |

---

## 4. Core Features

| Check | Status | Notes |
|-------|--------|-------|
| Chat sends and streams a message | ⬜ | |
| OfflineState shows when backend down | ⬜ | |
| Retry reconnects WebSocket | ⬜ | |
| Chat history preserved offline | ⬜ | |
| Memory loads and searches | ⬜ | |
| Files list + import pipeline | ⬜ | |
| Models list | ⬜ | |
| Plugins list | ⬜ | |
| Settings persist | ⬜ | |
| Keyboard shortcuts work | ⬜ | |

---

## 5. Native Desktop Features

| Check | Windows | macOS | Linux |
|-------|---------|-------|-------|
| System tray icon + menu | ⬜ | ⬜ | ⬜ |
| Tray → Restore / Quick Chat | ⬜ | ⬜ | ⬜ |
| Native notifications | ⬜ | ⬜ | ⬜ |
| File associations (open with) | ⬜ | ⬜ | ⬜ |
| Drag-and-drop import | ⬜ | ⬜ | ⬜ |
| Native file dialogs | ⬜ | ⬜ | ⬜ |
| Launch on startup | ⬜ | ⬜ | ⬜ |
| Create desktop shortcut | ⬜ | ⬜ | ⬜ |
| Taskbar progress / dock badge | ⬜ | ⬜ | ⬜ |
| Window state save/restore | ⬜ | ⬜ | ⬜ |

---

## 6. Auto-Update

| Check | Status | Notes |
|-------|--------|-------|
| Check for updates (stable) | ⬜ | |
| Check for updates (beta) | ⬜ | |
| Download progress shown | ⬜ | |
| Install and restart | ⬜ | |
| Version bump reflected after update | ⬜ | |
| Update failure surfaces gracefully | ⬜ | |
| Offline update check is safe | ⬜ | |

---

## 7. Cross-Platform Architecture Matrix

| Arch | x64 | arm64 |
|------|-----|-------|
| Windows | ✅ built | ❌ not configured |
| macOS | ✅ built | ✅ built |
| Linux | ✅ built | ❌ not configured |

---

## Sign-off

| Platform | Tester | Date | Result |
|----------|--------|------|--------|
| Windows 10/11 | | | |
| macOS (Intel + ARM) | | | |
| Ubuntu 22.04/24.04 | | | |
| Fedora | | | |

> This checklist is intentionally left incomplete until executed on real
> hardware during Phase 4 validation. See `environment-limitations.md` for
> what is blocked by the current environment.
