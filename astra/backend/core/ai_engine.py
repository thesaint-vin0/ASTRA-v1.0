"""
Astra AI - Core AI Engine
Central AI orchestration engine that coordinates all sub-engines and systems.
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
from ..systems.vision_system import VisionSystem
from ..systems.voice_system import VoiceSystem
from ..systems.automation_system import AutomationSystem
from ..systems.file_manager import FileManager
from ..managers.plugin_manager import PluginManager
from ..managers.security_manager import SecurityManager
from ..managers.settings_manager import SettingsManager
from ..managers.update_manager import UpdateManager


class AIEngine:
    """
    Central AI engine that orchestrates conversation, memory, reasoning,
    planning, tool execution, and model interactions.
    """

    def __init__(
        self,
        db_manager: DatabaseManager,
        vector_store: VectorStore,
        model_manager: Optional[ModelManager] = None,
        vision_system: Optional[VisionSystem] = None,
        voice_system: Optional[VoiceSystem] = None,
        automation_system: Optional[AutomationSystem] = None,
        file_manager: Optional[FileManager] = None,
        plugin_manager: Optional[PluginManager] = None,
        security_manager: Optional[SecurityManager] = None,
        settings_manager: Optional[SettingsManager] = None,
        update_manager: Optional[UpdateManager] = None,
    ):
        self.db_manager = db_manager
        self.vector_store = vector_store
        self.model_manager = model_manager or ModelManager()
        self.tool_manager = ToolManager()
        self.vision_system = vision_system or VisionSystem()
        self.voice_system = voice_system or VoiceSystem()
        self.automation_system = automation_system or AutomationSystem()
        self.file_manager = file_manager or FileManager()
        self.plugin_manager = plugin_manager or PluginManager()
        self.security_manager = security_manager or SecurityManager()
        self.settings_manager = settings_manager or SettingsManager()
        self.update_manager = update_manager or UpdateManager()

        # Initialize sub-engines
        self.memory_engine = MemoryEngine(vector_store)
        self.conversation_engine = ConversationEngine(self.memory_engine)
        self.reasoning_engine = ReasoningEngine()
        self.planning_engine = PlanningEngine()

        # Active processing state
        self.active_tasks: Dict[str, Dict[str, Any]] = {}

    async def initialize(self):
        """Initialize all components."""
        logger.info("Initializing AI Engine...")

        # Initialize model manager
        await self.model_manager.initialize()

        # Initialize tools
        await self.tool_manager.load_builtin_tools()

        # Initialize systems
        await self.vision_system.initialize()
        await self.voice_system.initialize()
        await self.automation_system.initialize()
        await self.file_manager.initialize()

        # Discover plugins
        await self.plugin_manager.discover_plugins()

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
        """
        Process a user message through the full AI pipeline.
        Yields events for streaming responses.
        """
        task_id = str(uuid.uuid4())
        start_time = time.time()

        try:
            async with self.db_manager.get_async_session() as db_session:
                # Get or create conversation
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

                # Store user message
                user_msg = await self.conversation_engine.add_message(
                    conversation_id=conversation_id,
                    role=MessageRole.USER,
                    content=message,
                    db_session=db_session,
                )
                yield {"type": "message_stored", "message": user_msg}

                # Build context with memories
                context = await self.conversation_engine.build_context(
                    conversation_id=conversation_id, db_session=db_session,
                )
                yield {"type": "context_built", "context_length": len(context)}

                # Analyze intent
                intent = await self._analyze_intent(message, context)

                # Execute reasoning if needed
                reasoning_result = None
                if intent.get("requires_reasoning"):
                    reasoning_result = await self.reasoning_engine.reason(
                        query=message, context=context,
                    )
                    yield {"type": "reasoning", "result": reasoning_result}

                # Create plan if needed
                plan = None
                if intent.get("requires_planning"):
                    plan = await self.planning_engine.create_plan(
                        goal=message, context=context,
                        available_tools=self.tool_manager.list_tools() if tools_enabled else [],
                    )
                    yield {"type": "plan", "plan": plan}

                # Execute tools if needed
                tool_results = []
                if tools_enabled and intent.get("requires_tools"):
                    extracted_tools = self._extract_tool_calls(message, reasoning_result)
                    for tool_call in extracted_tools:
                        result = await self.tool_manager.execute_tool(
                            tool_name=tool_call["name"],
                            arguments=tool_call["arguments"],
                        )
                        tool_results.append(result)
                        yield {"type": "tool_result", "result": result}

                # Generate response
                response_content = ""
                async for chunk in self._generate_response(
                    context=context, message=message,
                    reasoning=reasoning_result, plan=plan,
                    tool_results=tool_results, stream=stream,
                ):
                    response_content += chunk
                    yield {"type": "chunk", "content": chunk}

                # Store assistant response
                assistant_msg = await self.conversation_engine.add_message(
                    conversation_id=conversation_id,
                    role=MessageRole.ASSISTANT,
                    content=response_content,
                    db_session=db_session,
                )
                yield {"type": "complete", "message": assistant_msg}

                # Store important info to long-term memory
                importance = self._calculate_importance(message, response_content)
                if importance > 0.5:
                    await self.memory_engine.store(
                        memory_type=MemoryType.LONG_TERM,
                        key=f"insight_{uuid.uuid4().hex[:8]}",
                        content=f"User: {message}\nAssistant: {response_content[:500]}",
                        summary=response_content[:200],
                        importance=importance, category="conversation",
                        db_session=db_session,
                    )

        except Exception as e:
            logger.error(f"Error processing message: {e}")
            yield {"type": "error", "error": str(e)}
        finally:
            elapsed = time.time() - start_time
            logger.debug(f"Message processing completed in {elapsed:.2f}s")

    async def _analyze_intent(self, message: str, context: List[Dict[str, str]]) -> Dict[str, Any]:
        """Analyze user message to determine intent and required capabilities."""
        intent = {
            "requires_reasoning": False,
            "requires_planning": False,
            "requires_tools": False,
            "requires_vision": False,
            "requires_code": False,
            "type": "conversation",
        }
        ml = message.lower()

        if any(p in ml for p in ["why", "how", "explain", "reason", "think", "analyze", "compare"]):
            intent["requires_reasoning"] = True
            intent["type"] = "reasoning"
        if any(p in ml for p in ["plan", "steps", "strategy", "roadmap", "schedule", "organize"]):
            intent["requires_planning"] = True
            intent["type"] = "planning"
        if any(p in ml for p in ["search", "find", "look up", "browse", "open", "read file", "run", "execute"]):
            intent["requires_tools"] = True
        if any(p in ml for p in ["write code", "program", "debug", "refactor", "create project"]):
            intent["requires_code"] = True
            intent["type"] = "code"
        if any(p in ml for p in ["image", "picture", "photo", "screenshot", "diagram", "chart", "graph"]):
            intent["requires_vision"] = True
            intent["type"] = "vision"

        return intent

    def _extract_tool_calls(self, message: str, reasoning: Optional[Dict] = None) -> List[Dict[str, Any]]:
        """Extract tool calls from message or reasoning result."""
        tool_calls = []
        if reasoning and "tool_calls" in reasoning:
            tool_calls.extend(reasoning["tool_calls"])
        return tool_calls

    async def _generate_response(
        self,
        context: List[Dict[str, str]],
        message: str,
        reasoning: Optional[Dict] = None,
        plan: Optional[Dict] = None,
        tool_results: Optional[List[Dict]] = None,
        stream: bool = True,
    ) -> AsyncGenerator[str, None]:
        """Generate a response using the model manager."""
        if stream:
            async for chunk in self.model_manager.stream_complete(
                messages=context,
                system_prompt=context[0]["content"] if context else None,
            ):
                yield chunk
        else:
            response = await self.model_manager.complete(
                messages=context,
                system_prompt=context[0]["content"] if context else None,
            )
            yield response

    def _calculate_importance(self, message: str, response: str) -> float:
        """Calculate importance score for memory storage."""
        score = 0.3
        important_patterns = ["remember", "important", "note", "my name", "my favorite",
                              "prefer", "project", "deadline", "birthday", "address"]
        ml, rl = message.lower(), response.lower()
        for p in important_patterns:
            if p in ml or p in rl:
                score += 0.1
        if len(message) > 200:
            score += 0.1
        if len(response) > 500:
            score += 0.1
        if "remember this" in ml or "save this" in ml:
            score = 1.0
        return min(score, 1.0)

    async def process_voice_input(
        self, audio_data: bytes, conversation_id: Optional[str] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Process voice input through STT then the normal pipeline."""
        yield {"type": "voice_processing", "status": "transcribing"}
        transcription = await self.voice_system.transcribe_bytes(audio_data)
        if transcription.get("success"):
            yield {"type": "voice_transcribed", "text": transcription["text"]}
            async for event in self.process_message(
                conversation_id=conversation_id or "new",
                message=transcription["text"],
                stream=True,
            ):
                yield event
        else:
            yield {"type": "voice_error", "error": transcription.get("error", "Transcription failed")}

    async def process_image(
        self, image_data: bytes, message: str, conversation_id: Optional[str] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Process an image through the vision system."""
        yield {"type": "vision_processing", "status": "analyzing"}

        import tempfile, os
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
            f.write(image_data)
            temp_path = f.name

        try:
            analysis = await self.vision_system.analyze_image(temp_path)
            if analysis.get("success"):
                yield {"type": "vision_result", "analysis": analysis}
                async for event in self.process_message(
                    conversation_id=conversation_id or "new",
                    message=f"{message}\n\n[Image Analysis]: {analysis.get('description', '')}",
                    stream=True,
                ):
                    yield event
            else:
                yield {"type": "vision_error", "error": analysis.get("error", "Analysis failed")}
        finally:
            try:
                os.unlink(temp_path)
            except PermissionError:
                pass

    def get_status(self) -> Dict[str, Any]:
        """Get the current status of the AI engine."""
        return {
            "active_tasks": len(self.active_tasks),
            "active_conversations": len(self.conversation_engine.active_conversations),
            "short_term_memories": sum(len(v) for v in self.memory_engine.short_term_cache.values()),
            "vector_store_size": self.vector_store.count(),
            "available_tools": len(self.tool_manager.tools),
            "available_models": list(self.model_manager.models.keys()) if self.model_manager.models else ["ollama"],
            "plugins_loaded": len(self.plugin_manager.plugins),
            "systems_initialized": True,
        }
