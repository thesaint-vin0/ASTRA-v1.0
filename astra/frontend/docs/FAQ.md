# Astra AI — Frequently Asked Questions

**Phase 4 — Milestone 6 (Release Engineering)**

---

## General

### What is Astra AI?
Astra AI is a local-first AI operating system desktop app. It combines chat,
memory, file management, models, and plugins in a native Electron shell with a
Python backend.

### Is my data stored locally?
Yes. Conversations, memory, and settings are stored locally (SQLite/ChromaDB).
There is no mandatory cloud dependency.

### Does it require cloud AI APIs?
No. It works with local models via Ollama by default. Cloud providers
(OpenAI/Anthropic) can be configured in Settings.

---

## Installation

### Which platforms are supported?
Windows 10/11 (x64), macOS 12+ (Intel + Apple Silicon), and Linux (Ubuntu,
Fedora, Arch via AppImage/DEB).

### Do I need Python?
The backend is Python. The installer packages the frontend and Electron shell;
the backend is started separately or bundled depending on the release channel.
Check the installation guide for current backend startup instructions.

### Why does Windows show a SmartScreen warning?
Builds are not yet Authenticode-signed. Click **More info → Run anyway**.
Code signing is planned (blocked by no certificate in the dev environment).

---

## Offline / Connectivity

### Why do I see "Backend Disconnected"?
The Chat page shows OfflineState when the backend/WebSocket is unavailable.
Start the backend and click **Retry** (calls `wsService.reconnect()`).

### Is my chat history lost when offline?
No. Chat history and UI state are preserved while offline. The normal chat
interface returns automatically once the connection is restored.

### Can I use Astra without internet?
Yes — local inference and storage work offline. Only cloud-model features and
auto-update need internet.

---

## Updates

### How do updates work?
`electron-updater` checks the GitHub release feed. Stable and beta channels
are supported. Downloads happen in the background (if `autoDownload` is on),
then you're prompted to install.

### Why does "Check for updates" say not available?
In development (unpackaged) the updater is unavailable by design. It only
works in packaged builds with a published release.

### How do I roll back a bad update?
Reinstall the previous installer. User data is preserved.

---

## Models

### Which models are supported?
Any model available in Ollama. See the **Models** page. Cloud providers can
also be added in Settings.

### How do I add a model?
`ollama pull <model>` via terminal, then refresh the Models page.

---

## Security

### Is the Electron shell secure?
Yes — `contextIsolation: true`, `nodeIntegration: false`, a strict CSP,
validated IPC inputs, and a minimal preload bridge. See
`docs/electron-security-report.md`.

### Do I need to trust third-party plugins?
Treat plugins as code. Only install plugins you trust.

---

## Troubleshooting

See `docs/troubleshooting.md` for detailed fixes. Common quick hits:

- **Chat offline** → start backend + Retry.
- **App won't start** → check `crash.log`.
- **macOS blocked** → right-click → Open.
- **Slow** → check DevDiagnostics for memory/CPU.

---

## Development

### How do I run the dev environment?
```bash
# backend
python init_astra.py
python -m uvicorn app.main:app --port 8642   # (see README for exact cmd)

# frontend
cd astra/frontend
npm install
npm run dev
```

### How do I build production?
```bash
cd astra/frontend
npm run build
npm run release:metadata
npm run smoke
```

### How do I package installers?
```bash
npm run electron:build       # current OS, all configured targets
npm run electron:dir         # unpacked directory (fast check)
```

### How does CI work?
GitHub Actions runs `validate.yml` on every push/PR and `package.yml` +
`release.yml` on version tags. See `.github/workflows/`.
