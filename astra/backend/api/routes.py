"""
Astra AI - API Routes
REST endpoints for the Astra AI desktop application.
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json

from ..core.ai_engine import AIEngine
from ..config import settings

router = APIRouter(prefix="/api", tags=["Astra AI"])

ai_engine: Optional[AIEngine] = None


def get_engine():
    if ai_engine is None:
        raise HTTPException(status_code=503, detail="AI Engine not initialized")
    return ai_engine


class MessageRequest(BaseModel):
    conversation_id: Optional[str] = None
    message: str
    stream: bool = True
    personality: Optional[str] = None
    tools_enabled: bool = True


class ConversationCreate(BaseModel):
    title: str = "New Conversation"
    personality: str = "professional"
    system_prompt: Optional[str] = None


class MemorySearch(BaseModel):
    query: str
    memory_type: Optional[str] = None
    limit: int = 20


class SettingUpdate(BaseModel):
    key: str
    value: Any
    category: str = "general"


@router.get("/health")
async def health_check():
    return {"status": "healthy", "app": settings.APP_NAME, "version": settings.APP_VERSION, "environment": settings.ENVIRONMENT}


@router.get("/status")
async def get_status(engine: AIEngine = Depends(get_engine)):
    return {"engine": engine.get_status(), "config": settings.to_dict()}


@router.get("/system/metrics")
async def get_system_metrics(engine: AIEngine = Depends(get_engine)):
    """Get comprehensive system metrics including CPU, RAM, GPU, disk, and service status."""
    import psutil
    import time
    import platform

    uptime = time.time() - psutil.boot_time()

    # CPU metrics
    cpu_percent = psutil.cpu_percent(interval=0.1)
    cpu_count = psutil.cpu_count()
    cpu_freq = psutil.cpu_freq()
    cpu_model = f"{cpu_freq.max:.0f}MHz max" if cpu_freq else "Unknown"

    # Memory metrics
    mem = psutil.virtual_memory()
    mem_total_gb = mem.total / (1024 ** 3)
    mem_used_gb = mem.used / (1024 ** 3)
    mem_percent = mem.percent

    # Disk metrics
    disk = psutil.disk_usage('/')
    disk_total_gb = disk.total / (1024 ** 3)
    disk_free_gb = disk.free / (1024 ** 3)
    disk_percent = disk.percent

    # GPU metrics (try nvidia-smi)
    gpu_info = {"available": False}
    try:
        import subprocess
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,memory.total,memory.used,utilization.gpu", "--format=csv,noheader,nounits"],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0 and result.stdout.strip():
            parts = result.stdout.strip().split(", ")
            if len(parts) >= 4:
                gpu_info = {
                    "available": True,
                    "name": parts[0],
                    "vram_total_gb": float(parts[1]) / 1024 if parts[1] else 0,
                    "vram_used_gb": float(parts[2]) / 1024 if parts[2] else 0,
                    "usage_percent": float(parts[3]) if parts[3] else 0,
                }
    except Exception:
        pass

    # Ollama status
    ollama_status = {"status": "not_found", "models": []}
    try:
        import httpx
        resp = httpx.get(f"{settings.OLLAMA_HOST}/api/tags", timeout=3)
        if resp.status_code == 200:
            models_data = resp.json().get("models", [])
            ollama_status = {
                "status": "running",
                "version": resp.headers.get("ollama-version", "unknown"),
                "models": [m["name"] for m in models_data],
            }
    except Exception:
        ollama_status = {"status": "not_found", "models": []}

    # Database status
    db_status = {"status": "connected"}
    try:
        db_path = settings.DATA_DIR / "astra.db"
        if db_path.exists():
            db_status["size_mb"] = round(db_path.stat().st_size / (1024 * 1024), 2)
    except Exception:
        db_status = {"status": "error"}

    # ChromaDB status
    chroma_status = {"status": "initialized"}
    try:
        chroma_path = settings.CHROMA_PERSIST_DIR
        if chroma_path:
            chroma_status["document_count"] = 0  # Would need actual count from vector store
    except Exception:
        chroma_status = {"status": "error"}

    # Plugin status
    plugin_info = {"total": 0, "active": 0, "errors": 0}
    try:
        plugins = engine.plugin_manager.list_plugins()
        plugin_info["total"] = len(plugins)
        plugin_info["active"] = sum(1 for p in plugins if p.get("status") == "active")
        plugin_info["errors"] = sum(1 for p in plugins if p.get("status") == "error")
    except Exception:
        pass

    return {
        "cpu": {
            "usage_percent": cpu_percent,
            "cores": cpu_count,
            "model": cpu_model,
        },
        "memory": {
            "total_gb": round(mem_total_gb, 1),
            "used_gb": round(mem_used_gb, 1),
            "usage_percent": mem_percent,
        },
        "gpu": gpu_info,
        "disk": {
            "total_gb": round(disk_total_gb, 1),
            "free_gb": round(disk_free_gb, 1),
            "usage_percent": disk_percent,
        },
        "ollama": ollama_status,
        "database": db_status,
        "chroma": chroma_status,
        "plugins": plugin_info,
        "uptime": round(uptime),
        "version": settings.APP_VERSION,
        "platform": platform.platform(),
    }


@router.post("/conversations")
async def create_conversation(request: ConversationCreate, engine: AIEngine = Depends(get_engine)):
    async with engine.db_manager.get_async_session() as db:
        conv = await engine.conversation_engine.create_conversation(
            title=request.title, personality=request.personality,
            system_prompt=request.system_prompt, db_session=db,
        )
        return conv


@router.get("/conversations")
async def list_conversations(limit: int = 50, offset: int = 0, engine: AIEngine = Depends(get_engine)):
    async with engine.db_manager.get_async_session() as db:
        convs = await engine.conversation_engine.list_conversations(limit=limit, offset=offset, db_session=db)
        return {"conversations": convs, "total": len(convs)}


@router.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str, engine: AIEngine = Depends(get_engine)):
    async with engine.db_manager.get_async_session() as db:
        conv = await engine.conversation_engine.get_conversation(conversation_id, db_session=db)
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return conv


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, engine: AIEngine = Depends(get_engine)):
    async with engine.db_manager.get_async_session() as db:
        await engine.conversation_engine.delete_conversation(conversation_id, db_session=db)
        return {"success": True}


@router.get("/conversations/{conversation_id}/messages")
async def get_messages(conversation_id: str, limit: int = 50, engine: AIEngine = Depends(get_engine)):
    async with engine.db_manager.get_async_session() as db:
        msgs = await engine.conversation_engine.get_messages(conversation_id, limit=limit, db_session=db)
        return {"messages": msgs}


@router.post("/chat")
async def chat(request: MessageRequest, engine: AIEngine = Depends(get_engine)):
    if request.stream:
        async def generate():
            async for event in engine.process_message(
                conversation_id=request.conversation_id or "new",
                message=request.message, stream=True,
                tools_enabled=request.tools_enabled, personality=request.personality,
            ):
                yield f"data: {json.dumps(event)}\n\n"
        return StreamingResponse(generate(), media_type="text/event-stream",
                                 headers={"Cache-Control": "no-cache", "Connection": "keep-alive"})
    else:
        response_content = ""
        async for event in engine.process_message(
            conversation_id=request.conversation_id or "new",
            message=request.message, stream=False,
            tools_enabled=request.tools_enabled, personality=request.personality,
        ):
            if event["type"] == "complete":
                return event["message"]
            elif event["type"] == "chunk":
                response_content += event["content"]
            elif event["type"] == "error":
                raise HTTPException(status_code=500, detail=event["error"])
        return {"content": response_content}


@router.post("/memory/search")
async def search_memory(request: MemorySearch, engine: AIEngine = Depends(get_engine)):
    async with engine.db_manager.get_async_session() as db:
        results = await engine.memory_engine.recall(
            query=request.query, memory_type=request.memory_type,
            limit=request.limit, db_session=db,
        )
        return {"results": results, "total": len(results)}


@router.get("/models")
async def list_models(engine: AIEngine = Depends(get_engine)):
    models = await engine.model_manager.list_available_models()
    return {"models": models, "default": settings.DEFAULT_LOCAL_MODEL}


@router.get("/tools")
async def list_tools(engine: AIEngine = Depends(get_engine)):
    return {"tools": engine.tool_manager.list_tools()}


@router.post("/tools/execute")
async def execute_tool(tool_name: str, arguments: Dict[str, Any], engine: AIEngine = Depends(get_engine)):
    result = await engine.tool_manager.execute_tool(tool_name, arguments)
    return result


@router.get("/personalities")
async def list_personalities():
    return {"personalities": settings.PERSONALITIES}


@router.get("/plugins")
async def list_plugins(engine: AIEngine = Depends(get_engine)):
    return {"plugins": engine.plugin_manager.list_plugins()}


@router.post("/plan")
async def create_plan(goal: str, engine: AIEngine = Depends(get_engine)):
    plan = await engine.planning_engine.create_plan(goal=goal)
    return plan


@router.get("/settings")
async def get_settings(engine: AIEngine = Depends(get_engine)):
    async with engine.db_manager.get_async_session() as db:
        return await engine.settings_manager.get_all(db_session=db)


@router.post("/settings")
async def update_setting(request: SettingUpdate, engine: AIEngine = Depends(get_engine)):
    async with engine.db_manager.get_async_session() as db:
        await engine.settings_manager.set(key=request.key, value=request.value, category=request.category, db_session=db)
        return {"success": True}


@router.post("/files/read")
async def read_file(path: str, engine: AIEngine = Depends(get_engine)):
    result = await engine.file_manager.read_file(path)
    return result


@router.post("/files/list")
async def list_directory(path: str, engine: AIEngine = Depends(get_engine)):
    result = await engine.file_manager.list_directory(path)
    return result


@router.post("/vision/screenshot")
async def take_screenshot(engine: AIEngine = Depends(get_engine)):
    result = await engine.vision_system.capture_screenshot()
    return result


# ============================================================
# Phase 2: Onboarding & System Check
# ============================================================

@router.post("/onboarding/check")
async def onboarding_system_check(engine: AIEngine = Depends(get_engine)):
    """Run a comprehensive system check for onboarding."""
    import platform, psutil, shutil, subprocess, sys, time

    results = {}
    start = time.time()

    # Python
    py_ver = sys.version.split()[0]
    results["python"] = {
        "status": "healthy",
        "version": py_ver,
        "message": f"Python {py_ver} detected",
        "fix": None,
    }

    # Ollama
    try:
        import httpx
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(f"{settings.OLLAMA_HOST}/api/tags")
            if resp.status_code == 200:
                data = resp.json()
                models = data.get("models", [])
                results["ollama"] = {
                    "status": "healthy",
                    "version": "running",
                    "message": f"Ollama running with {len(models)} models",
                    "models": [m.get("name") for m in models],
                    "fix": None,
                }
            else:
                results["ollama"] = {
                    "status": "warning",
                    "message": "Ollama responded but with unexpected status",
                    "fix": "Restart Ollama with: ollama serve",
                }
    except Exception:
        results["ollama"] = {
            "status": "missing",
            "message": "Ollama is not running",
            "fix": "Install Ollama from https://ollama.com and run: ollama serve",
        }

    # GPU
    gpu_info = {"status": "missing", "message": "No GPU detected", "fix": None}
    try:
        import torch
        if torch.cuda.is_available():
            gpu_info = {
                "status": "healthy",
                "name": torch.cuda.get_device_name(0),
                "vram_gb": round(torch.cuda.get_device_properties(0).total_mem / 1e9, 1),
                "message": f"GPU: {torch.cuda.get_device_name(0)}",
                "fix": None,
            }
    except ImportError:
        # Try nvidia-smi
        try:
            result = subprocess.run(["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader"],
                                    capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                lines = result.stdout.strip().split("\n")
                if lines and lines[0]:
                    parts = lines[0].split(", ")
                    gpu_info = {
                        "status": "healthy",
                        "name": parts[0],
                        "vram_gb": parts[1].replace(" MiB", "").strip() if len(parts) > 1 else "Unknown",
                        "message": f"GPU: {parts[0]}",
                        "fix": None,
                    }
        except Exception:
            pass
    results["gpu"] = gpu_info

    # CPU
    cpu_count = psutil.cpu_count()
    cpu_percent = psutil.cpu_percent(interval=0.5)
    results["cpu"] = {
        "status": "healthy",
        "cores": cpu_count,
        "usage_percent": cpu_percent,
        "name": platform.processor() or "Unknown",
        "message": f"{cpu_count} cores @ {cpu_percent}% usage",
        "fix": None,
    }

    # RAM
    ram = psutil.virtual_memory()
    results["ram"] = {
        "status": "healthy" if ram.percent < 90 else "warning",
        "total_gb": round(ram.total / 1e9, 1),
        "available_gb": round(ram.available / 1e9, 1),
        "used_gb": round(ram.used / 1e9, 1),
        "percent": ram.percent,
        "message": f"{round(ram.used / 1e9, 1)}GB / {round(ram.total / 1e9, 1)}GB used ({ram.percent}%)",
        "fix": "Close unused applications to free memory" if ram.percent > 90 else None,
    }

    # Disk
    disk = psutil.disk_usage("/")
    results["disk"] = {
        "status": "healthy" if disk.percent < 90 else "warning",
        "total_gb": round(disk.total / 1e9, 1),
        "free_gb": round(disk.free / 1e9, 1),
        "used_gb": round(disk.used / 1e9, 1),
        "percent": disk.percent,
        "message": f"{round(disk.free / 1e9, 1)}GB free of {round(disk.total / 1e9, 1)}GB",
        "fix": "Free up disk space by removing unused files" if disk.percent > 90 else None,
    }

    # SQLite
    try:
        import sqlite3
        conn = sqlite3.connect(":memory:")
        ver = sqlite3.sqlite_version
        conn.close()
        results["sqlite"] = {
            "status": "healthy",
            "version": ver,
            "message": f"SQLite {ver} available",
            "fix": None,
        }
    except Exception as e:
        results["sqlite"] = {"status": "error", "message": str(e), "fix": "Install SQLite"}

    # ChromaDB
    try:
        import chromadb
        results["chroma"] = {
            "status": "healthy",
            "message": "ChromaDB available",
            "fix": None,
        }
    except ImportError:
        results["chroma"] = {
            "status": "missing",
            "message": "ChromaDB not installed",
            "fix": "pip install chromadb",
        }

    # Playwright
    try:
        import playwright
        results["playwright"] = {
            "status": "healthy",
            "message": "Playwright available",
            "fix": None,
        }
    except ImportError:
        results["playwright"] = {
            "status": "missing",
            "message": "Playwright not installed",
            "fix": "pip install playwright && playwright install chromium",
        }

    # Whisper
    try:
        import whisper
        results["whisper"] = {
            "status": "healthy",
            "message": "Whisper available",
            "fix": None,
        }
    except ImportError:
        results["whisper"] = {
            "status": "missing",
            "message": "Whisper not installed",
            "fix": "pip install openai-whisper",
        }

    # Piper
    try:
        import piper
        results["piper"] = {
            "status": "healthy",
            "message": "Piper TTS available",
            "fix": None,
        }
    except ImportError:
        results["piper"] = {
            "status": "missing",
            "message": "Piper TTS not installed",
            "fix": "pip install piper-tts",
        }

    # Internet
    try:
        import httpx
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get("https://google.com")
            results["internet"] = {
                "status": "healthy",
                "message": "Connected",
                "fix": None,
            }
    except Exception:
        results["internet"] = {
            "status": "warning",
            "message": "No internet connection (offline mode available)",
            "fix": None,
        }

    results["duration_ms"] = int((time.time() - start) * 1000)
    return results


# ============================================================
# Phase 2: Model Management
# ============================================================

class ModelAction(BaseModel):
    name: str


@router.post("/models/pull")
async def pull_model(request: ModelAction, engine: AIEngine = Depends(get_engine)):
    """Pull/download a model from Ollama."""
    from fastapi.responses import StreamingResponse
    import json

    async def generate():
        async for event in engine.model_manager.pull_model(request.name):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache"})


@router.post("/models/remove")
async def remove_model(request: ModelAction, engine: AIEngine = Depends(get_engine)):
    """Remove a downloaded model."""
    success = await engine.model_manager.remove_model(request.name)
    return {"success": success}


@router.get("/models/health")
async def model_health(engine: AIEngine = Depends(get_engine)):
    """Run health checks on all models."""
    return await engine.model_manager.health_check()


# ============================================================
# Phase 2: Activity Feed
# ============================================================

@router.get("/activity")
async def get_activity(limit: int = 20, engine: AIEngine = Depends(get_engine)):
    """Get recent activity across all systems."""
    import uuid
    from datetime import datetime, timezone, timedelta

    activities = []

    # Recent conversations
    async with engine.db_manager.get_async_session() as db:
        convs = await engine.conversation_engine.list_conversations(limit=5, offset=0, db_session=db)
        for c in convs:
            activities.append({
                "id": str(uuid.uuid4()),
                "type": "conversation",
                "title": c.get("title", "Conversation"),
                "description": f"Updated {c.get('updated_at', 'recently')}",
                "timestamp": c.get("updated_at", datetime.now(timezone.utc).isoformat()),
            })

    # Recent files
    try:
        files = await engine.file_manager.list_directory(".")
        if files.get("success") and files.get("items"):
            for f in files["items"][:5]:
                activities.append({
                    "id": str(uuid.uuid4()),
                    "type": "file",
                    "title": f.get("name", "File"),
                    "description": f"{'Folder' if f.get('type') == 'directory' else 'File'} - {f.get('modified', '')}",
                    "timestamp": f.get("modified", datetime.now(timezone.utc).isoformat()),
                })
    except Exception:
        pass

    # Plugin activity
    plugins = engine.plugin_manager.list_plugins()
    for p in plugins:
        if p.get("loaded_at"):
            activities.append({
                "id": str(uuid.uuid4()),
                "type": "plugin",
                "title": f"Plugin: {p.get('name', 'Unknown')}",
                "description": f"Status: {p.get('status', 'unknown')}",
                "timestamp": p.get("loaded_at", datetime.now(timezone.utc).isoformat()),
            })

    # Memory updates
    try:
        async with engine.db_manager.get_async_session() as db:
            memories = await engine.memory_engine.recall(
                query="recent", memory_type=None, limit=5, db_session=db,
            )
            for m in memories:
                activities.append({
                    "id": str(uuid.uuid4()),
                    "type": "memory",
                    "title": "Memory stored",
                    "description": (m.get("summary", "") or m.get("content", "")[:100]),
                    "timestamp": m.get("created_at", datetime.now(timezone.utc).isoformat()),
                })
    except Exception:
        pass

    # Sort by timestamp descending
    activities.sort(key=lambda a: a.get("timestamp", ""), reverse=True)
    return {"activities": activities[:limit]}
