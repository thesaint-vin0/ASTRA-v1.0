"""
Astra AI - Conversation Engine
Manages conversation flow, context, and message handling.
"""

from typing import List, Dict, Any, Optional, AsyncGenerator, Callable
from datetime import datetime, timezone
import uuid
from loguru import logger

from sqlalchemy import select, desc, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..database.models import Conversation, Message, MessageRole, MemoryType
from ..core.memory_engine import MemoryEngine
from ..config import settings


class ConversationEngine:
    """
    Manages conversation threads, message history, and context window.
    Supports streaming responses, tool calls, and context management.
    """

    def __init__(self, memory_engine: MemoryEngine):
        self.memory_engine = memory_engine
        self.active_conversations: Dict[str, Dict[str, Any]] = {}
        self.max_context_messages = 50
        self.max_context_tokens = 8192

    async def create_conversation(
        self,
        title: str = "New Conversation",
        personality: str = "professional",
        model: Optional[str] = None,
        system_prompt: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        db_session: Optional[AsyncSession] = None,
    ) -> Dict[str, Any]:
        """Create a new conversation thread."""
        personality_config = settings.PERSONALITIES.get(personality, settings.PERSONALITIES["professional"])
        final_system_prompt = system_prompt or personality_config.get("system_prompt", "")

        conversation = Conversation(
            title=title[:255],
            personality=personality,
            model=model or settings.DEFAULT_LOCAL_MODEL,
            system_prompt=final_system_prompt,
            extra_data=metadata or {},
        )

        if db_session:
            db_session.add(conversation)
            await db_session.flush()
            await db_session.refresh(conversation)

        conv_dict = self._conversation_to_dict(conversation)
        self.active_conversations[conv_dict["id"]] = conv_dict
        logger.info(f"Created conversation: {conv_dict['id']} - {title[:50]}")
        return conv_dict

    async def add_message(
        self,
        conversation_id: str,
        role: MessageRole,
        content: str,
        content_type: str = "text",
        token_count: int = 0,
        tool_calls: Optional[Dict[str, Any]] = None,
        tool_results: Optional[Dict[str, Any]] = None,
        extra_data: Optional[Dict[str, Any]] = None,
        db_session: Optional[AsyncSession] = None,
    ) -> Dict[str, Any]:
        """Add a message to a conversation."""
        message = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            content_type=content_type,
            token_count=token_count or len(content.split()),
            tool_calls=tool_calls,
            tool_results=tool_results,
            extra_data=extra_data or {},
        )

        if db_session:
            db_session.add(message)
            # Update conversation token count and timestamp
            stmt = (
                update(Conversation)
                .where(Conversation.id == conversation_id)
                .values(
                    token_count=Conversation.token_count + (token_count or len(content.split())),
                    updated_at=datetime.now(timezone.utc),
                )
            )
            await db_session.execute(stmt)
            await db_session.flush()
            await db_session.refresh(message)

        msg_dict = self._message_to_dict(message)

        # Update active conversation cache
        if conversation_id in self.active_conversations:
            conv = self.active_conversations[conversation_id]
            if "messages" not in conv:
                conv["messages"] = []
            conv["messages"].append(msg_dict)
            if len(conv["messages"]) > self.max_context_messages:
                conv["messages"] = conv["messages"][-self.max_context_messages:]

        logger.debug(f"Added {role.value} message to conversation {conversation_id}")
        return msg_dict

    async def get_conversation(
        self,
        conversation_id: str,
        db_session: Optional[AsyncSession] = None,
    ) -> Optional[Dict[str, Any]]:
        """Get a conversation by ID with its messages."""
        # Check cache first
        if conversation_id in self.active_conversations:
            return self.active_conversations[conversation_id]

        if not db_session:
            return None

        stmt = select(Conversation).where(Conversation.id == conversation_id)
        result = await db_session.execute(stmt)
        conversation = result.scalar_one_or_none()

        if not conversation:
            return None

        conv_dict = self._conversation_to_dict(conversation)

        # Load messages
        msg_stmt = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at)
            .limit(self.max_context_messages)
        )
        msg_result = await db_session.execute(msg_stmt)
        conv_dict["messages"] = [self._message_to_dict(m) for m in msg_result.scalars().all()]

        self.active_conversations[conversation_id] = conv_dict
        return conv_dict

    async def get_messages(
        self,
        conversation_id: str,
        limit: int = 50,
        offset: int = 0,
        db_session: Optional[AsyncSession] = None,
    ) -> List[Dict[str, Any]]:
        """Get messages for a conversation."""
        if not db_session:
            return []

        stmt = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await db_session.execute(stmt)
        messages = result.scalars().all()
        return [self._message_to_dict(m) for m in reversed(messages)]

    async def list_conversations(
        self,
        limit: int = 50,
        offset: int = 0,
        include_archived: bool = False,
        db_session: Optional[AsyncSession] = None,
    ) -> List[Dict[str, Any]]:
        """List conversations with pagination."""
        if not db_session:
            return list(self.active_conversations.values())[offset:offset + limit]

        stmt = select(Conversation)
        if not include_archived:
            stmt = stmt.where(Conversation.is_archived == False)
        stmt = stmt.order_by(Conversation.updated_at.desc()).offset(offset).limit(limit)

        result = await db_session.execute(stmt)
        conversations = result.scalars().all()
        return [self._conversation_to_dict(c) for c in conversations]

    async def update_conversation(
        self,
        conversation_id: str,
        title: Optional[str] = None,
        personality: Optional[str] = None,
        system_prompt: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        db_session: Optional[AsyncSession] = None,
    ):
        """Update conversation metadata."""
        if db_session:
            stmt = select(Conversation).where(Conversation.id == conversation_id)
            result = await db_session.execute(stmt)
            conversation = result.scalar_one_or_none()
            if conversation:
                if title:
                    conversation.title = title[:255]
                if personality:
                    conversation.personality = personality
                if system_prompt:
                    conversation.system_prompt = system_prompt
                if metadata:
                    existing = conversation.extra_data or {}
                    existing.update(metadata)
                    conversation.extra_data = existing
                conversation.updated_at = datetime.now(timezone.utc)
                await db_session.flush()

        # Update cache
        if conversation_id in self.active_conversations:
            conv = self.active_conversations[conversation_id]
            if title:
                conv["title"] = title
            if personality:
                conv["personality"] = personality
            if system_prompt:
                conv["system_prompt"] = system_prompt
            if metadata:
                conv.setdefault("metadata", {}).update(metadata)

    async def delete_conversation(
        self,
        conversation_id: str,
        db_session: Optional[AsyncSession] = None,
    ):
        """Delete a conversation and all its messages."""
        self.active_conversations.pop(conversation_id, None)

        if db_session:
            stmt = select(Conversation).where(Conversation.id == conversation_id)
            result = await db_session.execute(stmt)
            conversation = result.scalar_one_or_none()
            if conversation:
                await db_session.delete(conversation)
                await db_session.flush()
                logger.info(f"Deleted conversation: {conversation_id}")

    async def search_conversations(
        self,
        query: str,
        limit: int = 20,
        db_session: Optional[AsyncSession] = None,
    ) -> List[Dict[str, Any]]:
        """Search conversations by title or content."""
        if not db_session:
            return []

        # Search by title
        title_stmt = (
            select(Conversation)
            .where(Conversation.title.ilike(f"%{query}%"))
            .where(Conversation.is_archived == False)
            .order_by(Conversation.updated_at.desc())
            .limit(limit)
        )
        result = await db_session.execute(title_stmt)
        convs = list(result.scalars().all())

        # Search by message content if fewer results
        if len(convs) < limit:
            msg_stmt = (
                select(Message.conversation_id)
                .where(Message.content.ilike(f"%{query}%"))
                .distinct()
                .limit(limit - len(convs))
            )
            msg_result = await db_session.execute(msg_stmt)
            conv_ids = [row[0] for row in msg_result.all()]

            for cid in conv_ids:
                c_stmt = select(Conversation).where(Conversation.id == cid)
                c_result = await db_session.execute(c_stmt)
                c = c_result.scalar_one_or_none()
                if c and c not in convs:
                    convs.append(c)

        return [self._conversation_to_dict(c) for c in convs]

    async def build_context(
        self,
        conversation_id: str,
        max_tokens: Optional[int] = None,
        db_session: Optional[AsyncSession] = None,
    ) -> List[Dict[str, str]]:
        """Build context for the AI model from conversation history and memories."""
        conversation = await self.get_conversation(conversation_id, db_session)
        if not conversation:
            # Return default system context
            return [{"role": "system", "content": settings.PERSONALITIES["professional"]["system_prompt"]}]

        max_tokens = max_tokens or self.max_context_tokens
        context: List[Dict[str, str]] = []

        # Add system prompt
        personality = conversation.get("personality", "professional")
        personality_config = settings.PERSONALITIES.get(personality, settings.PERSONALITIES["professional"])
        system_content = conversation.get("system_prompt") or personality_config.get("system_prompt", "")

        # Add relevant memories as additional context
        if conversation.get("messages"):
            last_user_msg = ""
            for msg in reversed(conversation["messages"]):
                if msg.get("role") == MessageRole.USER.value:
                    last_user_msg = msg.get("content", "")
                    break

            if last_user_msg:
                memory_context = await self.memory_engine.get_relevant_context(
                    query=last_user_msg,
                    limit=10,
                    db_session=db_session,
                )
                if memory_context:
                    system_content += f"\n\nRelevant memories:\n{memory_context}"

        context.append({"role": "system", "content": system_content})

        # Add messages within token limit
        token_count = len(system_content.split())
        messages = conversation.get("messages", [])

        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            msg_tokens = len(content.split())

            if token_count + msg_tokens > max_tokens:
                break

            context.append({"role": role, "content": content})
            token_count += msg_tokens

        return context

    async def edit_message(
        self,
        message_id: str,
        new_content: str,
        db_session: Optional[AsyncSession] = None,
    ) -> Optional[Dict[str, Any]]:
        """Edit a message's content."""
        if not db_session:
            return None

        stmt = select(Message).where(Message.id == message_id)
        result = await db_session.execute(stmt)
        message = result.scalar_one_or_none()

        if not message:
            return None

        old_content = message.content
        message.content = new_content
        message.token_count = len(new_content.split())
        message.extra_data = message.extra_data or {}
        message.extra_data["edited_at"] = datetime.now(timezone.utc).isoformat()
        message.extra_data["previous_content"] = old_content[:500]
        await db_session.flush()

        # Update cache
        conv_id = message.conversation_id
        if conv_id in self.active_conversations:
            conv = self.active_conversations[conv_id]
            if "messages" in conv:
                for m in conv["messages"]:
                    if m["id"] == message_id:
                        m["content"] = new_content
                        break

        logger.info(f"Edited message {message_id}")
        return self._message_to_dict(message)

    async def delete_message(
        self,
        message_id: str,
        db_session: Optional[AsyncSession] = None,
    ):
        """Delete a message."""
        if not db_session:
            return

        stmt = select(Message).where(Message.id == message_id)
        result = await db_session.execute(stmt)
        message = result.scalar_one_or_none()

        if message:
            conv_id = message.conversation_id
            await db_session.delete(message)
            await db_session.flush()

            # Update cache
            if conv_id in self.active_conversations:
                conv = self.active_conversations[conv_id]
                if "messages" in conv:
                    conv["messages"] = [m for m in conv["messages"] if m["id"] != message_id]

            logger.debug(f"Deleted message {message_id}")

    async def summarize_conversation(
        self,
        conversation_id: str,
        max_summary_length: int = 500,
        db_session: Optional[AsyncSession] = None,
    ) -> Optional[str]:
        """Generate a summary of the conversation."""
        messages = await self.get_messages(conversation_id, limit=100, db_session=db_session)
        if not messages:
            return None

        # Extract key information
        user_messages = [m for m in messages if m.get("role") == MessageRole.USER.value]
        assistant_messages = [m for m in messages if m.get("role") == MessageRole.ASSISTANT.value]

        summary_parts = [
            f"Conversation has {len(messages)} messages",
            f"User messages: {len(user_messages)}",
            f"Assistant messages: {len(assistant_messages)}",
        ]

        if user_messages:
            first_user = user_messages[0].get("content", "")[:100]
            last_user = user_messages[-1].get("content", "")[:100]
            summary_parts.append(f"Started with: {first_user}")
            if len(user_messages) > 1:
                summary_parts.append(f"Latest query: {last_user}")

        return "\n".join(summary_parts)[:max_summary_length]

    async def archive_conversation(
        self,
        conversation_id: str,
        db_session: Optional[AsyncSession] = None,
    ):
        """Archive a conversation."""
        if db_session:
            stmt = (
                update(Conversation)
                .where(Conversation.id == conversation_id)
                .values(is_archived=True, updated_at=datetime.now(timezone.utc))
            )
            await db_session.execute(stmt)
            await db_session.flush()

        if conversation_id in self.active_conversations:
            self.active_conversations[conversation_id]["is_archived"] = True
        logger.info(f"Archived conversation: {conversation_id}")

    def get_active_conversation_count(self) -> int:
        """Get the number of active conversations in cache."""
        return len(self.active_conversations)

    def clear_cache(self):
        """Clear the conversation cache."""
        self.active_conversations.clear()
        logger.debug("Conversation cache cleared")

    def _conversation_to_dict(self, conversation: Conversation) -> Dict[str, Any]:
        """Convert a Conversation ORM object to a dictionary."""
        return {
            "id": conversation.id,
            "title": conversation.title,
            "personality": conversation.personality,
            "model": conversation.model,
            "system_prompt": conversation.system_prompt,
            "metadata": conversation.extra_data or {},
            "is_archived": conversation.is_archived,
            "token_count": conversation.token_count,
            "created_at": conversation.created_at.isoformat() if conversation.created_at else None,
            "updated_at": conversation.updated_at.isoformat() if conversation.updated_at else None,
        }

    def _message_to_dict(self, message: Message) -> Dict[str, Any]:
        """Convert a Message ORM object to a dictionary."""
        return {
            "id": message.id,
            "conversation_id": message.conversation_id,
            "role": message.role.value if hasattr(message.role, 'value') else str(message.role),
            "content": message.content,
            "content_type": message.content_type,
            "tool_calls": message.tool_calls,
            "tool_results": message.tool_results,
            "extra_data": message.extra_data or {},
            "token_count": message.token_count,
            "created_at": message.created_at.isoformat() if message.created_at else None,
        }
