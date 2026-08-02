# Phase 3 — Finalization (Stages 4–9) Implementation Tracker

## Stage 4 — Accessibility
- [ ] Keyboard navigation for Memory items
- [ ] Keyboard navigation for Files page
- [ ] Roving tabindex
- [ ] `@media (forced-colors: active)` CSS support
- [ ] Developer Diagnostics page (`/devtools`, resolves broken sidebar link)
- [ ] Add `/devtools` route to App.tsx
- [ ] Validate: tsc --noEmit, eslint, build

## Stage 5 — Native Desktop
- [ ] File associations (package.json electron-builder config)
- [ ] Open With Astra (single-instance + open-file handlers in electron/main.js)
- [ ] Desktop shortcut creation IPC
- [ ] Taskbar progress integration
- [ ] Dock/taskbar badge counts
- [ ] Native desktop settings in Settings page
- [ ] Validate: tsc --noEmit, eslint, build

## Stage 6 — Stability
- [ ] Recovery Center UI in Settings
- [ ] Backup management UI
- [ ] Crash log viewer
- [ ] Shutdown confirmation with active tasks
- [ ] SIGTERM/SIGINT handling
- [ ] Active task tracking IPC
- [ ] Validate: tsc --noEmit, eslint, build

## Stage 7 — Desktop UX
- [ ] EmptyState component
- [ ] OfflineState component
- [ ] Skeleton integration across pages
- [ ] Consistent loading/empty/error states
- [ ] Animation polish + reduced-motion
- [ ] Validate: tsc --noEmit, eslint, build

## Stage 8 — Documentation
- [ ] Accessibility Report
- [ ] Native Desktop Report
- [ ] Electron Security Report
- [ ] Technical Debt Report
- [ ] Production Readiness Report
- [ ] Phase 3 Completion Report

## Stage 9 — Final Validation
- [ ] Electron launch test
- [ ] Runtime smoke test
- [ ] Memory stability verification
- [ ] WebSocket interruption test
- [ ] Session recovery test
- [ ] Accessibility verification
- [ ] Native desktop verification
- [ ] Update all TODO trackers

