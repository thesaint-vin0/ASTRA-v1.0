# Phase 3 — Native Desktop Features & Production Optimization

## Engineering Requirements (Approved)

1. Measure before optimizing — capture baseline performance metrics.
2. Feature flags for new native desktop features.
3. Cross-platform design — test on Windows, Linux, macOS.
4. Electron security best practices.
5. Unified native file handling pipeline.
6. Crash recovery with session restore.
7. Accessibility validation on every screen.
8. Performance targets with before/after metrics.
9. Automated testing for major features.
10. Phase completion verification checklist.

---

## Step 0: Baseline Measurement

- [ ] Record startup time (frontend + backend)
- [ ] Record memory usage (initial + idle)
- [ ] Record bundle size (vite build output)
- [ ] Record CPU usage during loading
- [ ] Record route loading times for each page
- [ ] Generate baseline performance report → `docs/baseline-performance.md`

---

## Part 1 — Performance Optimization

### 1.1 Install New Dependencies
- [ ] Add `react-window` + `@types/react-window` for virtual scrolling
- [ ] Add `vite-plugin-visualizer` for bundle analysis

### 1.2 Route Lazy Loading
- [ ] Convert all static page imports in `App.tsx` to `React.lazy()`
- [ ] Wrap routes in `<Suspense>` with `LoadingScreen` fallback
- [ ] Add page-level loading states

### 1.3 Bundle Splitting
- [ ] Configure `manualChunks` in `vite.config.ts`
- [ ] Separate vendor chunks (react, framer-motion, recharts)
- [ ] Add `vite-plugin-visualizer` for bundle analysis

### 1.4 Virtual Scrolling
- [ ] Implement virtual scrolling in `ConversationList` component
- [ ] Implement virtual scrolling in `Memory` page
- [ ] Implement virtual scrolling in `Dashboard` activity feed
- [ ] Implement virtual scrolling in `Notifications` list

### 1.5 Memoization
- [ ] Add `React.memo` to `ChatMessage` component
- [ ] Add `React.memo` to `ConversationList` component
- [ ] Add `useMemo` for computed values in `Dashboard`
- [ ] Add `useCallback` for event handlers across components
- [ ] Optimize Zustand selectors with shallow equality checks

### 1.6 WebSocket Optimization
- [ ] Batch frequent state updates from WebSocket messages
- [ ] Reduce unnecessary re-renders from WebSocket events
- [ ] Optimize reconnection backoff strategy

### 1.7 Zustand Subscription Optimization
- [ ] Use atomic selectors instead of full state subscriptions
- [ ] Implement `shallow` equality checks in stores
- [ ] Split large stores where beneficial

### 1.8 Dashboard Refresh Optimization
- [ ] Implement stale-while-revalidate pattern
- [ ] Reduce refresh interval when tab is not focused
- [ ] Cache metrics data and only update when changed
- [ ] Add request deduplication

### 1.9 Image & Asset Optimization
- [ ] Optimize SVG icons for inline usage
- [ ] Lazy load images and icons
- [ ] Implement proper image dimensions

### 1.10 Startup Optimization
- [ ] Defer non-critical initialization
- [ ] Lazy load heavy dependencies
- [ ] Optimize WebSocket connection timing

### 1.11 Performance Validation
- [ ] Measure startup time after optimization
- [ ] Measure bundle size after optimization
- [ ] Measure memory usage after optimization
- [ ] Measure CPU usage after optimization
- [ ] Compare with baseline
- [ ] Generate Performance Comparison Report → `docs/performance-report.md`

---

## Part 2 — Accessibility

### 2.1 CSS & Theme
- [ ] Add `prefers-reduced-motion` media query to `globals.css`
- [ ] Add high contrast mode styles
- [ ] Add font scaling CSS custom properties
- [ ] Add focus-visible improvements across all interactive elements
- [ ] Add `aria-hidden` to decorative elements
- [ ] Update `tailwind.config.js` with accessibility variants

### 2.2 Navigation
- [ ] Add skip-to-content link in `Layout` component
- [ ] Implement keyboard-only navigation for sidebar
- [ ] Add proper focus management on route changes (focus page heading)
- [ ] Add keyboard shortcuts panel accessibility

### 2.3 Components ARIA
- [ ] `Sidebar` — role=navigation, aria-label, aria-current
- [ ] `TitleBar` — ARIA labels for window controls
- [ ] `CommandPalette` — role=dialog, aria-modal, focus trap
- [ ] `Toast` / `NotificationCenter` — aria-live="polite"
- [ ] `ChatMessage` — aria labels, role
- [ ] `ConversationList` — aria labels, keyboard navigation
- [ ] `ChatInput` — aria labels for buttons, textarea
- [ ] `ErrorBoundary` — role=alert

### 2.4 Pages ARIA
- [ ] `Dashboard` — heading hierarchy, widget aria-labels
- [ ] `Settings` — form ARIA, fieldset/legend, aria-describedby
- [ ] `Chat` — aria-live region for streaming content
- [ ] `Memory` — list ARIA, search role
- [ ] `Files` — treegrid role, keyboard navigation
- [ ] `Models` — grid role, aria-labels
- [ ] `Plugins` — list ARIA, status announcements

### 2.5 Reduced Motion
- [ ] Respect `prefers-reduced-motion` in Framer Motion animations
- [ ] Disable parallax and decorative animations
- [ ] Provide static alternatives for animated content

### 2.6 Screen Reader Testing
- [ ] Verify all pages with VoiceOver (macOS) / NVDA (Windows) / Orca (Linux)
- [ ] Verify focus order is logical
- [ ] Verify all interactive elements are reachable
- [ ] Verify error messages are announced

### 2.7 Accessibility Validation
- [ ] Run `axe-core` audits on every page
- [ ] Fix any violations found
- [ ] Verify keyboard-only navigation end-to-end
- [ ] Document accessibility compliance
- [ ] Generate Accessibility Report → `docs/accessibility-report.md`

---

## Part 3 — Native Electron Integration

### 3.1 Feature Flags
- [ ] Create feature flag utility in `electron/main.js` (process.env.FEATURE_* or config)
- [ ] Wrap tray features behind flag: `FEATURE_SYSTEM_TRAY`
- [ ] Wrap notifications behind flag: `FEATURE_NATIVE_NOTIFICATIONS`
- [ ] Wrap launch-on-startup behind flag: `FEATURE_LAUNCH_ON_STARTUP`
- [ ] Wrap desktop automation behind flag: `FEATURE_DESKTOP_AUTOMATION`
- [ ] Wrap experimental UI behind flag: `FEATURE_EXPERIMENTAL_UI`

### 3.2 Electron Security
- [ ] Verify `contextIsolation: true` (already set)
- [ ] Verify `sandbox: false` (needed for preload; document why)
- [ ] Verify `nodeIntegration: false` (already set)
- [ ] Add Content Security Policy header
- [ ] Add IPC argument validation on all handlers
- [ ] Never expose `shell` or `fs` modules directly to renderer
- [ ] Validate all IPC input with schema checking
- [ ] Secure external link handling (already implemented)
- [ ] Review preload bridge for security gaps

### 3.3 Enhanced System Tray
- [ ] Add tray icon with proper cross-platform sizing (16x16 macOS, 32x32 Win/Linux)
- [ ] Implement "Restore Window" option
- [ ] Implement "Quick Chat" — opens chat page directly
- [ ] Implement "Start Voice Mode" — triggers voice input
- [ ] Implement "Open Dashboard" — navigates to dashboard
- [ ] Implement "Quit Astra" — clean quit
- [ ] Support minimize-to-tray on close (already partially implemented)
- [ ] Add tray tooltip with connection status

### 3.4 Native Notifications
- [ ] Implement notification for AI responses completion
- [ ] Implement notification for long-running tasks
- [ ] Implement notification for plugin updates
- [ ] Implement notification for model downloads
- [ ] Implement notification for update availability
- [ ] Implement notification for automation completion
- [ ] Implement notification for errors and warnings
- [ ] Add notification preferences API
- [ ] Wire notification preferences to Settings UI
- [ ] Add notification grouping/category filtering

### 3.5 Window Management
- [ ] Save and restore window size (already partially done)
- [ ] Save and restore window position (already partially done)
- [ ] Multi-monitor support — remember which monitor
- [ ] Fullscreen support with IPC
- [ ] Minimize to tray on minimize button (configurable)
- [ ] Always-on-top toggle with IPC
- [ ] Restore previous session state
- [ ] Maximize/restore animations

### 3.6 Launch on Startup
- [ ] Implement enable/disable startup via `app.setLoginItemSettings()`
- [ ] Implement start minimized option
- [ ] Implement restore last session on startup
- [ ] Wire startup settings to Settings UI
- [ ] Persist startup preferences

### 3.7 File Drag-and-Drop
- [ ] Register drag-and-drop handlers in Electron main process
- [ ] Handle PDF import
- [ ] Handle DOCX import
- [ ] Handle XLSX import
- [ ] Handle PPTX import
- [ ] Handle TXT import
- [ ] Handle Markdown import
- [ ] Handle image imports (PNG, JPG, GIF, SVG, WebP)
- [ ] Handle ZIP archive import
- [ ] Handle source code folders (recursive import)
- [ ] Display upload progress in UI
- [ ] Use common import pipeline (same as file dialogs)

### 3.8 Native File Dialogs
- [ ] Implement "Open File" dialog (multiple file types)
- [ ] Implement "Open Folder" dialog
- [ ] Implement "Save Chat" dialog
- [ ] Implement "Export Memory" dialog
- [ ] Implement "Import Memory" dialog
- [ ] Set proper file filters for each dialog
- [ ] Use common import pipeline (same as drag-and-drop)

### 3.9 Common Import Pipeline
- [ ] Create unified `FileImportService` in Electron
- [ ] Process files through pipeline: validate → parse → import → notify
- [ ] Support all import methods (dialog, drag-drop, open-with)
- [ ] Unify progress reporting
- [ ] Handle errors gracefully

### 3.10 Window Management IPC
- [ ] Add `alwaysOnTop` IPC handler
- [ ] Add `setFullScreen` IPC handler
- [ ] Add `isFullScreen` IPC handler
- [ ] Add `getAllDisplays` IPC handler
- [ ] Add `getCurrentDisplay` IPC handler
- [ ] Add progress bar IPC handler
- [ ] Add badge count IPC handler
- [ ] Add `setLaunchOnStartup` with start-minimized option

### 3.11 Preload API Updates
- [ ] Expose file dialog methods
- [ ] Expose drag-and-drop events
- [ ] Expose always-on-top methods
- [ ] Expose fullscreen methods
- [ ] Expose display info methods
- [ ] Expose progress bar methods
- [ ] Expose badge count methods
- [ ] Expose common import pipeline events
- [ ] Expose notification preference events
- [ ] Expose crash recovery events

### 3.12 TypeScript Types Update
- [ ] Add new methods to `ElectronAPI` interface in `types/index.ts`
- [ ] Ensure all new APIs are typed

### 3.13 Native Desktop Feature Validation
- [ ] Test tray functionality on all platforms
- [ ] Test native notifications
- [ ] Test window management
- [ ] Test file drag-and-drop
- [ ] Test native file dialogs
- [ ] Test launch on startup
- [ ] Test common import pipeline
- [ ] Document any issues
- [ ] Generate Native Desktop Feature Report → `docs/native-desktop-report.md`

---

## Part 4 — Desktop Experience

### 4.1 Animations & Transitions
- [ ] Improve splash screen startup animation
- [ ] Add window transition animations (cross-fade)
- [ ] Add smooth page transitions (already partially using Framer Motion)
- [ ] Add skeleton loaders for every page

### 4.2 Skeleton Loaders
- [ ] Dashboard skeleton loader
- [ ] Chat skeleton loader
- [ ] Memory skeleton loader
- [ ] Models skeleton loader
- [ ] Files skeleton loader
- [ ] Plugins skeleton loader
- [ ] Settings skeleton loader
- [ ] Help/Tutorials skeleton loaders

### 4.3 Context Menus
- [ ] Implement right-click context menu on chat messages
- [ ] Implement right-click context menu in conversation list
- [ ] Implement right-click context menu in memory items
- [ ] Implement right-click context menu in file items
- [ ] Implement right-click context menu in dashboard widgets

### 4.4 Keyboard Shortcuts
- [ ] Register global keyboard shortcuts
- [ ] `Ctrl+N` / `Cmd+N` — New conversation
- [ ] `Ctrl+Shift+,` / `Cmd+Shift+,` — Open Settings
- [ ] `Ctrl+Shift+D` / `Cmd+Shift+D` — Open Dashboard
- [ ] `Ctrl+Shift+F` / `Cmd+Shift+F` — Toggle fullscreen
- [ ] `Ctrl+Shift+M` / `Cmd+Shift+M` — Toggle always-on-top
- [ ] `Ctrl+Q` / `Cmd+Q` — Quit app
- [ ] `Escape` — Cancel / Close modal
- [ ] Display keyboard shortcuts in a shortcuts panel

### 4.5 Recently Opened Files
- [ ] Track recently opened files in app store
- [ ] Display recent files in Files page sidebar
- [ ] Persist recent files list
- [ ] Allow clearing recent files
- [ ] Show recent files in system tray menu

### 4.6 Loading Indicators
- [ ] Improve loading indicators across all pages
- [ ] Add progress bars for long operations
- [ ] Add indeterminate progress for unknown durations

---

## Part 5 — System Integration

### 5.1 File Associations
- [ ] Register file associations in `package.json` (build config)
- [ ] Handle "Open with Astra" from OS file explorer
- [ ] Process opened files through common import pipeline
- [ ] Set up default document handlers

### 5.2 Desktop Shortcuts
- [ ] Verify installer creates desktop shortcut (electron-builder config)
- [ ] Add "Create Desktop Shortcut" option in Settings

### 5.3 Taskbar Integration
- [ ] Implement taskbar progress indicator (downloads, long tasks)
- [ ] Implement dock/taskbar badge counts (unread notifications, pending tasks)
- [ ] Support both Windows taskbar and macOS dock

### 5.4 Installer Preparation
- [ ] Configure `electron-builder` for proper installer
- [ ] Set application metadata (publisher, license, description)
- [ ] Configure NSIS installer options for Windows
- [ ] Configure DMG options for macOS
- [ ] Configure AppImage/deb options for Linux

---

## Part 6 — Stability

### 6.1 Crash Recovery
- [ ] Implement automatic crash log generation
- [ ] Implement session restore on restart
- [ ] Restore unsaved conversations after crash
- [ ] Restore window state after crash
- [ ] Restore pending downloads after crash
- [ ] Restore unfinished imports after crash
- [ ] Save periodic snapshots of application state

### 6.2 Automatic Backup
- [ ] Implement automatic backup of settings
- [ ] Implement automatic backup of conversation history
- [ ] Configurable backup interval
- [ ] Backup rotation (keep last N backups)
- [ ] Restore from backup option

### 6.3 Graceful Shutdown
- [ ] Save all state before quit
- [ ] Cancel pending operations
- [ ] Wait for active operations to complete (with timeout)
- [ ] Proper cleanup of resources
- [ ] Handle `SIGTERM` and `SIGINT` signals

### 6.4 Memory Leak Detection
- [ ] Add memory usage monitoring
- [ ] Detect abnormal memory growth
- [ ] Log memory statistics periodically
- [ ] Alert when memory exceeds thresholds
- [ ] Implement memory cleanup routines

### 6.5 Error Logging
- [ ] Implement structured error logging
- [ ] Log to file with rotation
- [ ] Include system info in crash reports
- [ ] Capture unhandled exceptions
- [ ] Capture unhandled promise rejections
- [ ] Add log viewer in Settings

---

## Part 7 — Validation & Deliverables

### 7.1 Testing
- [ ] Test Electron launches successfully
- [ ] Test system tray functions correctly
- [ ] Test notifications display correctly
- [ ] Test drag-and-drop works
- [ ] Test native dialogs function
- [ ] Test launch on startup works
- [ ] Test window state restores
- [ ] Test common import pipeline
- [ ] Test crash recovery
- [ ] Test all keyboard shortcuts
- [ ] Test all context menus
- [ ] Run automated accessibility checks
- [ ] Verify no performance regressions
- [ ] Verify no TypeScript errors
- [ ] Verify no lint errors
- [ ] Verify no console errors

### 7.2 Production Build
- [ ] Run `npm run build` (TypeScript + Vite)
- [ ] Verify production build succeeds
- [ ] Verify Electron loads production build
- [ ] Run `npm run electron:build` (electron-builder)

### 7.3 Deliverables
- [ ] Generate Baseline Performance Report → `docs/baseline-performance.md`
- [ ] Generate Performance Comparison Report → `docs/performance-report.md`
- [ ] Generate Accessibility Report → `docs/accessibility-report.md`
- [ ] Generate Native Desktop Feature Report → `docs/native-desktop-report.md`
- [ ] Generate Technical Debt Report → `docs/technical-debt.md`
- [ ] Generate Production Readiness Score → `docs/production-readiness.md`
- [ ] Update `TODO.md` with final progress

### 7.4 Phase Completion Checklist
- [ ] Production build succeeds
- [ ] No TypeScript errors
- [ ] No lint errors
- [ ] No runtime exceptions
- [ ] No console errors
- [ ] Performance targets documented
- [ ] Accessibility checks pass
- [ ] Native desktop features function correctly
- [ ] Electron security best practices implemented
- [ ] All cross-platform features verified
- [ ] Feature flags implemented
- [ ] Crash recovery implemented
- [ ] Baseline metrics recorded
- [ ] Detailed completion report generated

