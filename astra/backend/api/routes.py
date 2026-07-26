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
