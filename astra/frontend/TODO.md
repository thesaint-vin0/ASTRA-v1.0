# Phase 3 — Finalization Implementation TODO

## Priority 1 — Performance Optimization

### 1.1 React.memo
- [x] Add React.memo to ConversationList export
- [x] Add React.memo to ChatInput
- [x] Add React.memo to Dashboard sub-components (AiStatusWidget, SystemStatusWidget, etc.)

### 1.2 useMemo
- [x] Add useMemo for computed values in Dashboard
- [x] Add useMemo for filtered items in Memory page
- [x] Add useMemo for file operations in Files page
- [x] Add useMemo for model count in Models page

### 1.3 useCallback
- [x] Optimize event handlers in Memory page
- [x] Optimize event handlers in Files page
- [x] Optimize event handlers in Models page

### 1.4 Zustand Selector Optimization
- [x] Add `useShallow` to all store subscriptions in Dashboard
- [x] Add `useShallow` to all store subscriptions in Chat
- [x] Add `useShallow` to all store subscriptions in Layout/Sidebar
- [x] Add `useShallow` to all store subscriptions in Settings
- [x] Add `useShallow` to NotificationCenter (Memory page has no store subscription — uses direct API)

### 1.5 Dashboard Refresh Optimization
- [x] Debounce fetchData with 200ms debounce
- [ ] Add stale-while-revalidate pattern

### 1.6 WebSocket Batching
- [x] Add message priority queue (high/medium/low)
- [x] Add persistent queue during reconnect
- [x] Add exponential backoff with jitter
- [x] Concatenate batched chunk events to avoid streaming content loss

### 1.7 Lazy Loading Improvements
- [x] Lazy-loaded routes (all 11 pages converted to React.lazy)
- [x] Route-level code splitting verified (each page = separate chunk)
- [ ] Preload critical routes (chat, dashboard) in index.html
- [ ] Defer non-critical initializations in App.tsx

### 1.8 Bundle Optimization
- [x] Verify manualChunks configuration is optimal (react, state, animation, icons, charts, markdown, query, utils vendors)
- [x] Measure bundle size after optimization (see performance report)

---

## Priority 2 — Accessibility Completion

### 2.1 Focus Management
- [ ] Add focus trap in CommandPalette
- [ ] Ensure focus returns to trigger after modal close
- [ ] Add focus management on route changes

### 2.2 Keyboard Navigation
- [ ] Add keyboard navigation for Memory list items
- [ ] Add treegrid roles + keyboard nav for Files page
- [ ] Add Shift+F10 context menu trigger for ChatMessage
- [ ] Audit all pages for keyboard-only operability

### 2.3 ARIA Enhancements
- [ ] Add aria-live region for streaming content in Chat
- [ ] Add aria-live for toast notifications (already partial)
- [ ] Add aria-describedby for form inputs in Settings

### 2.4 Screen Reader Improvements
- [ ] Add aria-hidden to decorative icons
- [ ] Add proper heading hierarchy on all pages
- [ ] Add screen reader announcements for state changes

### 2.5 Accessible Context Menus
- [ ] Make ContextMenu keyboard-accessible (Arrow keys, Enter, Escape)
- [ ] Add accessible context menu integration in ChatMessage

### 2.6 Accessibility Audit
- [ ] Run axe-core audit on every page
- [ ] Fix all violations found
- [ ] Verify keyboard-only navigation end-to-end

---

## Priority 3 — State Management Optimization

### 3.1 Zustand Profiling
- [ ] Profile Zustand subscriptions with React DevTools
- [ ] Identify unnecessary re-renders

### 3.2 Atomic Selectors
- [ ] Split large selectors in chatStore
- [ ] Add atomic selectors for each piece of state

### 3.3 Store Splitting (if beneficial)
- [ ] Evaluate if chatStore should be split
- [ ] Implement store splitting if beneficial

### 3.4 Persistence Optimization
- [ ] Review partialize in appStore
- [ ] Ensure only required state is persisted

---

## Priority 4 — WebSocket Improvements

### 4.1 Message Prioritization
- [x] Implement priority queue (high: cancel, normal: chat, low: ping)
- [x] Add priority-based dispatching (sorted flush on reconnect)

### 4.2 Reconnection Improvements
- [x] Add exponential backoff with jitter
- [x] Persist message queue during reconnects
- [x] Ensure no messages lost during disconnection

### 4.3 Heartbeat & Timeout
- [ ] Improve heartbeat timeout detection
- [ ] Add connection quality monitoring

---

## Priority 5 — Native Desktop Experience

### 5.1 File Associations
- [ ] Configure file associations in package.json build config
- [ ] Handle "Open with Astra" on Windows

### 5.2 Taskbar Integration
- [ ] Add progress indicator for long operations
- [ ] Add badge count for unread notifications

### 5.3 Desktop Shortcut
- [ ] Add "Create Desktop Shortcut" option in Settings
- [ ] Wire to Electron API

### 5.4 Drag-and-Drop Polish
- [ ] Ensure drag-and-drop works with all file types
- [ ] Add progress feedback during import

---

## Priority 6 — Stability

### 6.1 Session Recovery
- [ ] Add session recovery UI in Settings
- [ ] Wire restore buttons to Electron session APIs

### 6.2 Automatic Backups
- [ ] Add backup configuration in Settings
- [ ] Add backup restore UI
- [ ] Add backup list display

### 6.3 Crash Reports
- [ ] Add crash log viewer in Settings
- [ ] Add "Copy diagnostics" button

### 6.4 Graceful Shutdown
- [ ] Add confirmation dialog on quit with active tasks
- [ ] Save state before quit

---

## Priority 7 — Desktop UX Polish

### 7.1 Skeleton Loaders
- [ ] Integrate SkeletonDashboard into Dashboard
- [ ] Add skeleton loader for Memory page
- [ ] Add skeleton loader for Files page
- [ ] Add skeleton loader for Models page
- [ ] Add skeleton loader for Settings page

### 7.2 Empty States
- [ ] Create reusable EmptyState component
- [ ] Add empty states for all list views

### 7.3 Offline/Error States
- [ ] Add dedicated offline state UI
- [ ] Add retry mechanisms for failed operations

### 7.4 Transitions
- [ ] Improve page transition animations
- [ ] Add consistent animation timing

---

## Priority 8 — Security Review

### 8.1 Electron Security Audit
- [ ] Verify contextIsolation: true
- [ ] Verify nodeIntegration: false
- [ ] Verify sandbox configuration
- [ ] Audit preload bridge exposure
- [ ] Validate all IPC input
- [ ] Verify CSP enforcement
- [ ] Document security posture

### 8.2 Security Report
- [ ] Generate Electron Security Report

---

## Priority 9 — Developer Diagnostics Page

### 9.1 Create DevDiagnostics Page
- [ ] Create /devtools route and page component
- [ ] Display: Electron/Chromium/Node/Python/Ollama versions
- [ ] Display: Backend health, WebSocket latency, CPU/RAM/GPU
- [ ] Display: Database + ChromaDB status, plugin status
- [ ] Display: Active conversations, app logs
- [ ] Add "Copy Diagnostic Report" button
- [ ] Add route to App.tsx and Sidebar navigation

---

## Priority 10 — Documentation

### 10.1 Performance Report
- [ ] Measure and document before/after metrics
- [ ] Update docs/performance-report.md

### 10.2 Accessibility Report
- [ ] Document accessibility compliance
- [ ] Generate docs/accessibility-report.md

### 10.3 Native Desktop Report
- [ ] Document native feature implementation
- [ ] Generate docs/native-desktop-report.md

### 10.4 Security Report
- [ ] Generate docs/electron-security-report.md

### 10.5 Technical Debt Report
- [ ] Generate docs/technical-debt.md

### 10.6 Production Readiness Report
- [ ] Generate docs/production-readiness.md

---

## Priority 11 — Validation

### 11.1 TypeScript Check
- [x] Run `tsc --noEmit` and fix errors (passes with exit code 0)

### 11.2 ESLint Check
- [ ] Run ESLint and fix warnings

### 11.3 Production Build
- [x] Run `npm run build` successfully (vite build: 2022 modules, 19.37s, 22 chunks)

### 11.4 Runtime Verification
- [ ] Launch Electron and verify no console errors
- [ ] Verify no React warnings
- [ ] Verify WebSocket reconnection
- [ ] Verify session recovery
- [ ] Verify all native integrations

### 11.5 Completion Report
- [ ] Generate Phase 3 Completion Report

---

## Phase 4 Preparation
- [ ] Project ready for packaging, installers, auto-updates
- [ ] Cross-platform validation readiness
- [ ] Release engineering prerequisites documented

