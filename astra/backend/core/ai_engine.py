"""
Astra AI - Core AI Engine
Central orchestration engine coordinating all sub-engines, managers, and systems.
"""

from typing import List, Dict, Any, Optional, AsyncGenerator
import uuid
import time
import json
from datetime import datetime, timezone
from loguru import logger

from ..config import settings
from ..database.models import MessageRole, MemoryType
from ..database.database import DatabaseManager
from ..database.vector_store import VectorStore
from ..core.memory_engine import MemoryEngine
from ..core.conversation_engine import ConversationEngine
from ..core.reasoning_engine import ReasoningEngine
from ..core.planning_engine import PlanningEngine
from ..managers.model_manager import ModelManager
from ..managers.tool_manager import ToolManager
from ..managers.security_manager import SecurityManager
from ..managers.settings_manager import SettingsManager
from ..managers.plugin_manager import PluginManager
from ..managers.update_manager import UpdateManager
from ..systems.vision_system import VisionSystem
from ..systems.voice_system import VoiceSystem
from ..systems.automation_system import AutomationSystem
from ..systems.file_manager import FileManager


class AIEngine:
    """
    Central AI engine orchestrating conversation, memory, reasoning,
    planning, tool execution, model interaction, vision, voice, automation, and files.
    """

    def __init__(
        self,
        db_manager: DatabaseManager,
        vector_store: VectorStore,
        model_manager: Optional[ModelManager] = None,
    ):
        self.db_manager = db_manager
        self.vector_store = vector_store
        self.model_manager = model_manager or ModelManager()
        self.tool_manager = ToolManager()
        self.security_manager = SecurityManager()
        self.settings_manager = SettingsManager()
        self.plugin_manager = PluginManager()
        self.update_manager = UpdateManager()

        # Sub-systems
        self.memory_engine = MemoryEngine(vector_store)
        self.conversation_engine = ConversationEngine(self.memory_engine)
        self.reasoning_engine = ReasoningEngine()
        self.planning_engine = PlanningEngine()
        self.vision_system = VisionSystem()
        self.voice_system = VoiceSystem()
        self.automation_system = AutomationSystem()
        self.file_manager = FileManager()

        self.active_tasks: Dict[str, Dict[str, Any]] = {}

    async def initialize(self):
        """Initialize all components."""
        logger.info("Initializing AI Engine...")
        await self.model_manager.initialize()
        await self.tool_manager.load_builtin_tools()
        await self.plugin_manager.discover_plugins()
        await self.vision_system.initialize()
        await self.voice_system.initialize()
        await self.automation_system.initialize()
        await self.file_manager.initialize()
        logger.info("AI Engine initialized successfully")

    async def process_message(
        self,
        conversation_id: str,
        message: str,
        user_id: Optional[str] = None,
        stream: bool = True,
        tools_enabled: bool = True,
        personality: Optional[str] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        task_id = str(uuid.uuid4())
        start_time = time.time()

        try:
            async with self.db_manager.get_async_session() as db_session:
                conversation = await self.conversation_engine.get_conversation(
                    conversation_id, db_session
                )
                if not conversation:
                    conversation = await self.conversation_engine.create_conversation(
                        title=message[:100],
                        personality=personality or settings.DEFAULT_PERSONALITY,
                        db_session=db_session,
                    )
                    conversation_id = conversation["id"]

                user_msg = await self.conversation_engine.add_message(
                    conversation_id=conversation_id,
                    role=MessageRole.USER,
                    content=message,
                    token_count=len(message.split()),
                    db_session=db_session,
                )
                yield {"type": "message_stored", "message": user_msg}

                context = await self.conversation_engine.build_context(
                    conversation_id=conversation_id,
                    db_session=db_session,
                )
                yield {"type": "context_built", "context_length": len(context)}

                intent = await self._analyze_intent(message, context)

                reasoning_result = None
                if intent.get("requires_reasoning"):
                    reasoning_result = await self.reasoning_engine.reason(
                        query=message, context=context,
                    )
                    yield {"type": "reasoning", "result": reasoning_result}

                plan = None
                if intent.get("requires_planning"):
                    plan = await self.planning_engine.create_plan(
                        goal=message,
                        context=context,
                        available_tools=self.tool_manager.list_tools() if tools_enabled else [],
                    )
                    yield {"type": "plan", "plan": plan}

                tool_results = []
                if tools_enabled and intent.get("requires_tools"):
                    extracted = self._extract_tool_calls(message, reasoning_result)
                    for tc in extracted:
                        result = await self.tool_manager.execute_tool(
                            tool_name=tc["name"], arguments=tc["arguments"],
                        )
                        tool_results.append(result)
                        yield {"type": "tool_result", "result": result}

                response_content = ""
                async for chunk in self._generate_response(
                    context=context, message=message,
                    reasoning=reasoning_result, plan=plan,
                    tool_results=tool_results, stream=stream,
                ):
                    response_content += chunk
                    yield {"type": "chunk", "content": chunk}

                assistant_msg = await self.conversation_engine.add_message(
                    conversation_id=conversation_id,
                    role=MessageRole.ASSISTANT,
                    content=response_content,
                    token_count=len(response_content.split()),
                    db_session=db_session,
                )
                yield {"type": "complete", "message": assistant_msg}

                importance = self._calculate_importance(message, response_content)
                if importance > 0.5:
                    await self.memory_engine.store(
                        memory_type=MemoryType.LONG_TERM,
                        key=f"insight_{uuid.uuid4().hex[:8]}",
                        content=f"User: {message}\nAssistant: {response_content[:500]}",
                        summary=response_content[:200],
                        importance=importance,
                        category="conversation",
                        db_session=db_session,
                    )
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            yield {"type": "error", "error": str(e)}
        finally:
            elapsed = time.time() - start_time
            logger.debug(f"Message processed in {elapsed:.2f}s")

    async def _analyze_intent(self, message: str, context: List[Dict[str, str]]) -> Dict[str, Any]:
        intent = {"requires_reasoning": False, "requires_planning": False, "requires_tools": False,
                  "requires_vision": False, "requires_code": False, "type": "conversation"}
        ml = message.lower()
        if any(p in ml for p in ["why","how","explain","reason","think","analyze","compare"]):
            intent["requires_reasoning"] = True; intent["type"] = "reasoning"
        if any(p in ml for p in ["plan","steps","strategy","roadmap","schedule"]):
            intent["requires_planning"] = True; intent["type"] = "planning"
        if any(p in ml for p in ["search","find","look up","browse","open","read file","run","execute"]):
            intent["requires_tools"] = True
        if any(p in ml for p in ["write code","program","debug","refactor","test"]):
            intent["requires_code"] = True; intent["type"] = "code"
        if any(p in ml for p in ["image","picture","photo","screenshot","diagram"]):
            intent["requires_vision"] = True; intent["type"] = "vision"
        return intent

    def _extract_tool_calls(self, message: str, reasoning: Optional[Dict] = None) -> List[Dict]:
        return (reasoning or {}).get("tool_calls", [])

    async def _generate_response(self, context, message, reasoning=None, plan=None, tool_results=None, stream=True):
        if stream:
            async for chunk in self.model_manager.stream_complete(
                messages=context, system_prompt=context[0]["content"] if context else None,
            ):
                yield chunk
        else:
            yield await self.model_manager.complete(
                messages=context, system_prompt=context[0]["content"] if context else None,
            )

    def _calculate_importance(self, message: str, response: str) -> float:
        patterns = ["remember","important","note","my name","my favorite","prefer","project"]
        score = 0.3
        ml = message.lower()
        for p in patterns:
            if p in ml or p in response.lower():
                score += 0.1
        if len(message) > 200: score += 0.1
        if len(response) > 500: score += 0.1
        if "remember this" in ml or "save this" in ml: score = 1.0
        return min(score, 1.0)

    def get_status(self) -> Dict[str, Any]:
        return {
            "active_tasks": len(self.active_tasks),
            "active_conversations": len(self.conversation_engine.active_conversations),
            "vector_store_size": self.vector_store.count(),
            "available_tools": len(self.tool_manager.tools),
            "available_models": list(self.model_manager.models.keys()) if self.model_manager.models else ["ollama"],
        }
