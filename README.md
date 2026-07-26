# 🚀 Astra AI Operating System

> **A personal AI operating system** — an extensible, offline-first desktop platform that uses open-weight language models as one component while implementing its own architecture, reasoning pipeline, memory, tools, interface, and capabilities.

![Status](https://img.shields.io/badge/status-alpha-blue)
![Python](https://img.shields.io/badge/python-3.13-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green)
![License](https://img.shields.io/badge/license-MIT-orange)

---

## ✨ Features

### 🧠 Core AI
- **Multi-model support**: Qwen, Llama, Mistral, DeepSeek, Gemma via Ollama
- **Cloud model fallback**: OpenAI, Anthropic when offline models aren't enough
- **Streaming responses**: Real-time token-by-token generation
- **Conversation management**: Full CRUD with context window management

### 🧩 Three-Layer Memory
| Layer | Type | Storage |
|-------|------|---------|
| **Short-term** | Current conversation | In-memory cache |
| **Long-term** | Preferences, projects, history | SQLite + Embeddings |
| **Knowledge** | Documents, imports, KB | ChromaDB vector store |

### 🎭 Personality System
6 built-in personalities + custom:
- Professional, Friendly, Technical, Creative, Researcher, Minimal

### 🔌 Plugin System
- Add tools, commands, APIs, workflows, UI extensions
- Sandboxed execution for security
- Install/uninstall safely

### 🎤 Voice Assistant
- Wake words: "Hey Astra", "Okay Astra"
- Speech-to-text (Whisper)
- Text-to-speech (Piper)
- Continuous conversation with interruptions

### 👁️ Vision
- Image analysis & OCR
- Screenshot reading
- UI element identification
- Chart & diagram understanding

### 💻 Code Assistant
- Project creation & refactoring
- Debugging & error explanation
- Git management
- Documentation generation

### 🔒 Security
- Encrypted local memory
- Password protection
- API key vault
- Permission management
- Sandboxed execution
- Audit logs

---

## 🏗️ Architecture

```
astra/
├── backend/                    # Python FastAPI backend
│   ├── core/                   # Core AI engines
│   │   ├── ai_engine.py        # Central orchestration
│   │   ├── reasoning_engine.py # Chain-of-thought reasoning
│   │   ├── planning_engine.py  # Task planning & decomposition
│   │   ├── memory_engine.py    # 3-layer memory system
│   │   └── conversation_engine.py  # Conversation management
│   ├── managers/               # System managers
│   │   ├── model_manager.py    # Local & cloud model management
│   │   ├── tool_manager.py     # Tool registry & execution
│   │   ├── plugin_manager.py   # Plugin loader & sandbox
│   │   ├── security_manager.py # Encryption & permissions
│   │   ├── settings_manager.py # Configuration management
│   │   └── update_manager.py   # Auto-update system
│   ├── systems/                # Capability systems
│   │   ├── vision_system.py    # Image analysis, OCR
│   │   ├── voice_system.py     # STT (Whisper), TTS (Piper)
│   │   ├── automation_system.py # Playwright + PyAutoGUI
│   │   └── file_manager.py     # File operations
│   ├── database/               # Data layer
│   │   ├── models.py           # 9 SQLAlchemy ORM models
│   │   ├── database.py         # SQLite + async sessions
│   │   └── vector_store.py     # ChromaDB embeddings
│   ├── api/                    # API layer
│   │   ├── routes.py           # 20+ REST endpoints
│   │   └── websocket.py        # Real-time communication
│   ├── plugins/                # Plugin system
│   └── main.py                 # FastAPI entry point
├── frontend/                   # Electron + React + TypeScript
│   ├── src/                    # React components & pages
│   └── electron/               # Electron main process
├── docs/                       # Documentation
└── tests/                      # Test suites
```

---

## 🚦 Quick Start

### Prerequisites
```bash
# Python 3.13+
python --version

# Node.js 22+
node --version

# Install Ollama for local models
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model
ollama pull qwen2.5:7b
```

### Backend Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/astra.git
cd astra

# Install Python dependencies
pip install -r astra/requirements.txt

# Start the server
python -m uvicorn astra.backend.main:app --host 127.0.0.1 --port 8642 --reload
```

### Frontend Setup (Coming Soon)
```bash
cd astra/frontend
npm install
npm run dev
```

### Verify Installation
```bash
curl http://127.0.0.1:8642/api/health
# {"status":"healthy","app":"Astra AI","version":"0.1.0"}
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Root health check |
| `GET` | `/docs` | OpenAPI documentation |
| `GET` | `/api/health` | System health |
| `GET` | `/api/status` | Engine status & config |
| `POST` | `/api/conversations` | Create conversation |
| `GET` | `/api/conversations` | List conversations |
| `GET` | `/api/conversations/{id}` | Get conversation |
| `DELETE` | `/api/conversations/{id}` | Delete conversation |
| `GET` | `/api/conversations/{id}/messages` | Get messages |
| `POST` | `/api/chat` | Send message (streaming) |
| `POST` | `/api/memory/search` | Semantic memory search |
| `GET` | `/api/models` | List available models |
| `GET` | `/api/tools` | List available tools |
| `POST` | `/api/tools/execute` | Execute a tool |
| `GET` | `/api/personalities` | List personalities |
| `GET` | `/api/plugins` | List installed plugins |
| `POST` | `/api/plan` | Create a plan |
| `GET` | `/api/settings` | Get settings |
| `POST` | `/api/settings` | Update setting |
| `POST` | `/api/files/read` | Read file |
| `POST` | `/api/files/list` | List directory |
| `POST` | `/api/vision/screenshot` | Capture screenshot |
| `WS` | `/ws` | WebSocket for real-time AI |

---

## 🧪 Testing
```bash
pytest astra/tests/ -v --cov=astra.backend
```

---

## 📚 Documentation
- [Architecture Guide](docs/architecture.md) *(coming soon)*
- [API Reference](docs/api.md) *(coming soon)*
- [Plugin Development Guide](docs/plugins.md) *(coming soon)*
- [Installation Guide](docs/installation.md) *(coming soon)*

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| **Language** | Python 3.13 |
| **Desktop** | Electron + React + TypeScript |
| **Backend** | FastAPI + Uvicorn |
| **Database** | SQLite (SQLAlchemy ORM) |
| **Vector DB** | ChromaDB |
| **Local AI** | Ollama |
| **Speech** | Whisper (STT) + Piper (TTS) |
| **Image Gen** | Stable Diffusion |
| **Vision** | Qwen-VL |
| **Automation** | Playwright + PyAutoGUI |

---

## 🤝 Contributing
Contributions are welcome! Please read our [contributing guidelines](CONTRIBUTING.md) before submitting PRs.

---

## 📄 License
MIT License — see [LICENSE](LICENSE) for details.

---

## 🏗️ Project Status

**Current Phase: Alpha** — Backend core is operational. Frontend is in development.

✅ Phase 1 — Foundation & Project Structure  
✅ Phase 2 — Core AI Engine & Memory System  
✅ Phase 3 — Manager Systems (Model, Tool, Plugin, Security, Settings, Update)  
✅ Phase 4 — Capability Systems (Vision, Voice, Automation, File)  
✅ Phase 5 — API Layer (REST + WebSocket)  
⬜ Phase 6 — Electron Frontend (React + TypeScript)  
⬜ Phase 7 — Testing & Documentation  
⬜ Phase 8 — Release & Distribution  

---

<div align="center">
  <sub>Built with ❤️ by the Astra team</sub>
</div>
