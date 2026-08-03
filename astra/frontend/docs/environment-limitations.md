# Environment Limitations & Honest Status

**Phase 4 — Milestone 5**
**Application:** Astra AI — Desktop

This document records what has been **verified**, what is **implemented but
untested**, and what is **blocked by the current environment**. It is the
source of truth for honest labeling — nothing is marked complete without
evidence.

---

## 1. Build & Validation Pipeline (Verified)

| Item | Status | Evidence |
|------|--------|----------|
| TypeScript (`npx tsc --noEmit`) | ✅ Verified | `TSC_EXIT=0` |
| ESLint (`npm run lint`) | ✅ Verified | `LINT_EXIT=0` |
| Production build (`npm run build`) | ✅ Verified | vite 2036 modules, ~13.5s |
| Release metadata generation | ✅ Verified | `release-metadata.json` written |
| Automated smoke test | ✅ Verified | `SMOKE_EXIT=0` (all checks pass) |
| Electron main/preload/updater parse | ✅ Verified | smoke test syntax check |

## 2. Code Signing (Blocked by Environment)

| Item | Status | Notes |
|------|--------|-------|
| Windows Authenticode signing | ❌ Blocked | Requires a code-signing certificate; not available in this environment. Config is env-based (`CSC_LINK`/`CSC_KEY_PASSWORD`) and ready for CI. |
| macOS Developer ID signing | ❌ Blocked | Requires an Apple Developer account + certificate. |
| macOS notarization | ❌ Blocked | `electron/notarize.cjs` + `afterSign` configured; needs `APPLE_ID`/`APPLE_APP_SPECIFIC_PASSWORD`/`APPLE_TEAM_ID` secrets. |
| Signed binary verification | ⚠️ Implemented but untested | No signed binaries exist yet to verify. |

## 3. Auto-Update (Implemented, untested end-to-end)

| Item | Status | Notes |
|------|--------|-------|
| `electron-updater` installed | ✅ Verified | `electron-updater@^6.8.9` |
| Updater module + IPC | ✅ Verified | `electron/updater.js` ↔ preload ↔ types consistency passed smoke test |
| Settings update UI | ✅ Implemented | Check / download / install / auto-update toggle / channel |
| Offline-safe behavior | ✅ Implemented | Dev-mode graceful "not available", failures surfaced as status, never thrown |
| Structured release logging | ✅ Implemented | `logRelease` (main.js) + `logUpdate` (updater.js) → `release.log` |
| Crash-log enrichment | ✅ Implemented | version/platform/electron/node/timestamp/channel in `crash.log` |
| End-to-end update on a real channel | ❌ Blocked | Requires a published release + GitHub releases; not exercised in this environment. |

## 4. Cross-Platform Packaging (Blocked by Environment)

| Item | Status | Notes |
|------|--------|-------|
| Windows NSIS + portable build | ⚠️ Implemented but untested | Config present; building a full installer requires `electron-builder` to download tooling. |
| macOS DMG (x64 + arm64) | ⚠️ Implemented but untested | Only buildable on macOS. |
| Linux AppImage + deb | ⚠️ Implemented but untested | Only buildable on Linux. |
| GitHub Actions matrix | ✅ Implemented | `.github/workflows/package.yml` + `release.yml`; requires repo secrets + runner time. |

## 5. CI/CD (Implemented, awaiting first run)

| Item | Status | Notes |
|------|--------|-------|
| `validate.yml` | ✅ Implemented | tsc / lint / build / metadata / dist artifact |
| `package.yml` | ✅ Implemented | win/mac/linux matrix on tag push |
| `release.yml` | ✅ Implemented | Draft release + artifact upload |
| First CI run | ❌ Blocked | Requires pushing to GitHub; not run in this session. |

## 6. Known Non-Blocking Gaps

| Item | Status | Notes |
|------|--------|-------|
| `settings:get` misnamed handler | ⚠️ Noted | `ipcMain.handle('settings:get', ...)` is actually SET behavior; non-blocking, listed in technical debt. |
| `publish` repo now exists | ✅ Resolved | `thesaint-vin0/ASTRA-v1.0` confirmed reachable (pushed + tagged `v0.9.0-rc1`). |

---

## Summary

| Requirement | Status |
|-------------|--------|
| Builds + packaging complete | ⚠️ Packaging config complete; full cross-platform installers untested (blocked) |
| Updater implemented | ✅ Implemented; end-to-end update untested (blocked) |
| CI + release pipelines operational | ✅ Implemented; first run pending (blocked) |
| Docs complete | ✅ Complete |
| Platform validation + env limitations documented | ✅ This document |
| Zero TS/ESLint/build failures | ✅ Verified |
