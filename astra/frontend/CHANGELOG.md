# Changelog

All notable changes to Astra AI are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Phase 4 release engineering infrastructure:
  - GitHub Actions workflows: validate, package (win/mac/linux matrix), release.
  - Auto-update service (`electron-updater`) with stable/beta channels.
  - Release metadata generation (`release-metadata.json`).
  - Structured release logging (`release.log`) and enriched crash logs.
  - Automated smoke test (`npm run smoke`).
  - Release docs: installation, upgrade, troubleshooting, FAQ, distribution checklist.

## [0.1.0] — 2025-01-10

### Added
- Phase 3 native desktop features & production optimization.
- Electron integration: system tray, native notifications, window management,
  file associations, drag-and-drop, native dialogs, launch on startup,
  desktop shortcut, taskbar progress, dock badges.
- Performance: route lazy loading, bundle splitting, memoization, Zustand
  selector optimization, WebSocket batching, virtual scrolling.
- Accessibility: keyboard navigation, ARIA, forced-colors, reduced motion,
  axe-core audit (dev-only).
- Stability: crash recovery, session restore, automatic backups, graceful
  shutdown, memory leak detection, structured error logging.
- OfflineState in Chat (backend/WebSocket unavailable → OfflineState with
  Retry calling `wsService.reconnect()`; UI auto-restores on reconnect).

### Fixed
- WebSocket reconnect backoff with jitter and persistent priority queue.
- Streaming content integrity via batched chunk concatenation.

---

[0.1.0]: https://github.com/thesaint-vin0/ASTRA-v1.0/releases/tag/v0.1.0
